#!/usr/bin/env bash
# Atualiza o Sentinela para uma versão publicada (tag vX.Y.Z), com volta automática.
#
#   ./update.sh [VERSÃO] [--imagens-publicadas]
#
# VERSÃO é uma tag "vX.Y.Z" (padrão: a mais recente). Sem opção de imagem, respeita o
# .env: IMAGENS=publicadas baixa as imagens assinadas do ghcr.io; sem IMAGENS (instalação
# das Fases 1-3) ou IMAGENS=locais reconstrói as imagens a partir do código da tag.
# --imagens-publicadas migra uma instalação local para as imagens publicadas (grava
# IMAGENS=publicadas e VERSAO no .env).
#
# Antes de mudar qualquer coisa: trava, árvore git limpa, Docker, 2 GiB livres, core saudável,
# tag alvo resolvida e (imagens publicadas, sem cosign) digests.txt do release baixado.
# Depois: backup do banco (tipo "atualizacao"), marcação pre_<data> das imagens em uso, cópia
# do .env (.env.pre_<data>, 0600), checkout da tag, imagens novas, e troca do core (saúde por
# até 120 s) e depois do web.
#
# VOLTA AUTOMÁTICA: qualquer falha depois do backup devolve o checkout anterior e o .env e
# remarca as imagens pre_<data>; se algum contêiner já tinha sido trocado, para o core,
# RESTAURA O BACKUP feito antes (restore.sh --do-volume), sobe core e web com as imagens
# antigas e confere a saúde. A volta NUNCA faz "alembic downgrade": uma migração pode ter
# mudado o esquema, e o downgrade da 0002 recria "equipamento" com chaves estrangeiras
# ligadas; o caminho seguro é sempre o banco do backup.
#
# INTERRUPÇÃO (Ctrl+C, TERM, HUP): antes de qualquer contêiner ser trocado, só desfaz os
# arquivos (checkout, .env, marcações). Depois disso NÃO age mais: relata os fatos (fase, estado
# real dos contêineres, o backup e as marcações pre_) e os comandos exatos da volta manual.
#
# Guarda só as 3 marcações pre_ mais recentes e apaga apenas as próprias. Nunca usa
# "compose down", "prune", "rmi -f" nem "git reset --hard"; só mexe neste projeto compose
# (ou no de SENTINELA_PROJETO).
# shellcheck disable=SC2317,SC2329  # funções chamadas só pelos traps e pela volta
set -euo pipefail

export MSYS_NO_PATHCONV=1

RAIZ="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$RAIZ"
# shellcheck source=scripts/operacao-comum.sh
source "$RAIZ/scripts/operacao-comum.sh"

IDENTIDADE_COSIGN='^https://github\.com/lumezencio/sentinela/\.github/workflows/release\.yml@refs/tags/v[0-9]+\.[0-9]+\.[0-9]+$'
EMISSOR_COSIGN='https://token.actions.githubusercontent.com'
URL_RELEASE="https://github.com/lumezencio/sentinela/releases/download"
ESPACO_MIN_KB=$((2 * 1024 * 1024))

# Estado da execução: uma só variável de fase, mais os fatos que a volta e o relatório usam
FASE="verificando"
PROTEGIDO=0 # 1 quando backup, marcações pre_ e cópia do .env existem
TOCOU=0     # 1 a partir do primeiro comando que troca um contêiner
INTERROMPIDO=0
CONCLUIDO=0 # 1 quando a troca terminou bem (só a limpeza resta)
BACKUP=""
TS_PRE=""
ENV_PRE=""
RAMO_ANTERIOR=""
SHA_ANTERIOR=""
VERSAO_ANTERIOR=""
IMAGENS_ANTERIOR=""
TAG_COMPOSE_ANTERIOR="latest"
TAG_ALVO=""
VERSAO_ALVO=""
MODO="locais"
DIGESTS_TXT=""

recuar() {
  local l
  while IFS= read -r l; do printf '  %s\n' "$l"; done
}

# estado_servicos: estado real de core e web agora
estado_servicos() {
  local s
  if ! s="$(compose ps -a --format '{{.Service}}: {{.Status}}' core web 2>/dev/null)"; then
    s="$(compose ps -a core web 2>/dev/null)" || s="(não foi possível consultar; use: docker compose ps)"
  fi
  [[ -n "$s" ]] || s="(nenhum contêiner listado)"
  recuar <<<"$s"
}

# comandos_de_volta: a volta manual, exata, com os nomes desta execução
comandos_de_volta() {
  local p="docker compose"
  [[ -z "${SENTINELA_PROJETO:-}" ]] || p="docker compose -p $SENTINELA_PROJETO"
  echo "Volta manual (execute na pasta do projeto, nesta ordem):"
  if [[ -n "$RAMO_ANTERIOR" ]]; then
    echo "  git checkout $RAMO_ANTERIOR"
  else
    echo "  git checkout --detach $SHA_ANTERIOR"
  fi
  echo "  cp $ENV_PRE .env && chmod 600 .env"
  echo "  docker tag $IMG_REPO_CORE:$TS_PRE $IMG_REPO_CORE:$TAG_COMPOSE_ANTERIOR"
  echo "  docker tag $IMG_REPO_WEB:$TS_PRE $IMG_REPO_WEB:$TAG_COMPOSE_ANTERIOR"
  echo "  $p stop core"
  echo "  ./restore.sh --do-volume $BACKUP --sim"
  echo "  $p up -d --no-deps --no-build --pull never --wait core web"
}

# reverter_arquivos: checkout e .env anteriores e marcações das imagens (sem tocar em contêiner)
reverter_arquivos() {
  local ok=0
  if [[ -n "$RAMO_ANTERIOR" ]]; then
    git checkout -q "$RAMO_ANTERIOR" || ok=1
  else
    git checkout -q --detach "$SHA_ANTERIOR" || ok=1
  fi
  if [[ -f "$ENV_PRE" ]]; then
    { (umask 077 && cp "$ENV_PRE" .env) && chmod 600 .env; } || ok=1
  else
    ok=1
  fi
  docker tag "$IMG_REPO_CORE:$TS_PRE" "$IMG_REPO_CORE:$TAG_COMPOSE_ANTERIOR" || ok=1
  docker tag "$IMG_REPO_WEB:$TS_PRE" "$IMG_REPO_WEB:$TAG_COMPOSE_ANTERIOR" || ok=1
  if [[ "$(git rev-parse HEAD 2>/dev/null)" != "$SHA_ANTERIOR" ]]; then ok=1; fi
  return "$ok"
}

# voltar: falha depois do backup. Cada passo é relatado pelo que foi de fato conferido.
voltar() {
  set +e
  trap '' INT TERM HUP
  {
    echo
    echo "FALHA na fase: $FASE. Voltando ao estado anterior..."
  } >&2
  if reverter_arquivos; then
    echo "Checkout anterior, .env e marcações das imagens restaurados." >&2
  else
    echo "ERRO: não consegui restaurar tudo (checkout, .env ou marcações)." >&2
    comandos_de_volta >&2
    return 1
  fi
  if [[ $TOCOU -eq 1 ]]; then
    echo "Restaurando o backup $BACKUP..." >&2
    if compose stop core >&2 &&
      SENTINELA_TRAVA_PAI="$$" bash "$RAIZ/restore.sh" --do-volume "$BACKUP" --sim >&2 &&
      compose up -d --no-deps --no-build --pull never --wait core web >&2; then
      if saude_ok; then
        echo "Volta concluída: imagens e banco anteriores de volta, core saudável." >&2
      else
        echo "A volta subiu os contêineres, mas o core NÃO respondeu saudável." >&2
      fi
    else
      echo "ERRO: a volta automática não terminou." >&2
      comandos_de_volta >&2
    fi
  else
    echo "Nenhum contêiner tinha sido trocado; o banco não foi mexido." >&2
    if saude_ok; then echo "O core responde saudável." >&2; else echo "O core NÃO respondeu saudável agora." >&2; fi
  fi
  echo "Estado atual:" >&2
  estado_servicos >&2
  echo "Últimas linhas do log do core:" >&2
  compose logs --tail 30 core >&2 || true
  return 1
}

interrompido() {
  trap - INT TERM HUP
  INTERROMPIDO=1
  {
    echo
    echo "Interrompido durante: $FASE."
  } >&2
  if [[ $CONCLUIDO -eq 1 ]]; then
    echo "A atualização já tinha terminado; só a limpeza das marcações antigas foi interrompida." >&2
  elif [[ $PROTEGIDO -eq 1 && $TOCOU -eq 0 ]]; then
    if reverter_arquivos; then
      echo "Nenhum contêiner tinha sido trocado: desfiz o checkout, o .env e as marcações." >&2
    else
      echo "Nenhum contêiner tinha sido trocado, mas não consegui desfazer tudo." >&2
    fi
  elif [[ $PROTEGIDO -eq 1 ]]; then
    echo "Nada mais foi feito depois da interrupção; os contêineres ficaram como estão." >&2
  else
    echo "O backup e as marcações ainda não estavam concluídos; nenhum contêiner tinha sido trocado." >&2
  fi
  {
    echo "Estado atual:"
    estado_servicos
    [[ -z "$BACKUP" ]] || echo "Backup desta atualização (em /dados/backups): $BACKUP"
    [[ $PROTEGIDO -eq 0 ]] || echo "Marcações das imagens anteriores: $IMG_REPO_CORE:$TS_PRE e $IMG_REPO_WEB:$TS_PRE"
    if [[ $PROTEGIDO -eq 1 && $CONCLUIDO -eq 0 ]]; then comandos_de_volta; fi
    echo "Verifique a saúde antes de usar (docker compose ps; docker compose logs core)."
  } >&2
  exit 130
}

finalizar() {
  local rc=$?
  trap - EXIT
  if [[ $rc -ne 0 && $INTERROMPIDO -eq 0 && $PROTEGIDO -eq 1 && $CONCLUIDO -eq 0 ]]; then
    voltar || true
    rc=1
  fi
  trava_liberar
  exit "$rc"
}

# espaco_livre_kb: KiB livres na pasta do projeto
espaco_livre_kb() {
  df -Pk . | awk 'NR == 2 { print $4 }'
}

# resolver_alvo ARG: define TAG_ALVO (tag de lançamento existente no repositório)
resolver_alvo() {
  local arg="$1"
  if [[ -z "$arg" ]]; then
    arg="$(git tag --list 'v[0-9]*' --sort=-v:refname | grep -E '^v[0-9]+\.[0-9]+\.[0-9]+$' | head -n 1 || true)"
    [[ -n "$arg" ]] || falhar "não há nenhuma tag de versão (vX.Y.Z) neste repositório"
  fi
  [[ "$arg" =~ ^v[0-9]+\.[0-9]+\.[0-9]+(-[0-9A-Za-z.]+)?$ ]] ||
    falhar "versão inválida '$arg': use uma tag no formato vX.Y.Z"
  git rev-parse -q --verify "refs/tags/$arg^{commit}" >/dev/null ||
    falhar "a tag '$arg' não existe (nada foi alterado)"
  TAG_ALVO="$arg"
  VERSAO_ALVO="${arg#v}"
}

# marcar_imagem SERVICO REPO: marca a imagem do contêiner em uso como REPO:pre_<ts>
marcar_imagem() {
  local servico="$1" repo="$2" cid id
  cid="$(compose ps -q "$servico" 2>/dev/null | head -n 1 | tr -d '\r')"
  [[ -n "$cid" ]] || falhar "não encontrei o contêiner de '$servico' em execução (nada foi alterado)"
  id="$(docker inspect --format '{{.Image}}' "$cid" | tr -d '\r')"
  [[ -n "$id" ]] || falhar "não consegui descobrir a imagem em uso de '$servico' (nada foi alterado)"
  docker tag "$id" "$repo:$TS_PRE" ||
    falhar "não consegui marcar a imagem de '$servico' como $TS_PRE (nada foi alterado)"
}

# verificar_imagem SERVICO REPO: assinatura (cosign) ou digest do release; fecha por padrão
verificar_imagem() {
  local servico="$1" repo="$2" ref d esperado
  ref="$(docker image inspect --format '{{index .RepoDigests 0}}' "$repo:$VERSAO_ALVO" | tr -d '\r')" ||
    falhar "não consegui ler o digest da imagem baixada de '$servico'"
  d="${ref#*@}"
  [[ "$d" =~ ^sha256:[0-9a-f]{64}$ ]] || falhar "digest inesperado para a imagem de '$servico'"
  if command -v cosign >/dev/null 2>&1; then
    cosign verify --certificate-identity-regexp "$IDENTIDADE_COSIGN" \
      --certificate-oidc-issuer "$EMISSOR_COSIGN" "$repo@$d" >/dev/null ||
      falhar "a assinatura da imagem de '$servico' não confere com o workflow de release"
  else
    esperado="$(awk -v s="$servico" '$1 == s { print $2 }' <<<"$DIGESTS_TXT" | head -n 1)"
    [[ -n "$esperado" && "$esperado" == "$d" ]] ||
      falhar "o digest baixado de '$servico' difere do digests.txt do release; imagem recusada"
  fi
}

# limpar: marcações pre_ além das 3 mais recentes e cópias antigas do .env
limpar() {
  local f
  limpar_pre
  # os nomes têm data UTC: ordem do glob = ordem cronológica; ficam as 3 últimas
  local -a copias=()
  for f in .env.pre_*; do
    [[ "$f" =~ ^\.env\.pre_[0-9]{8}T[0-9]{6}Z$ && -f "$f" ]] && copias+=("$f")
  done
  while ((${#copias[@]} > 3)); do
    rm -f -- "${copias[0]}"
    copias=("${copias[@]:1}")
  done
}

main() {
  local versao_arg="" flag_publicadas=0 arg espaco
  for arg in "$@"; do
    case "$arg" in
      --imagens-publicadas) flag_publicadas=1 ;;
      -h | --help)
        awk 'NR > 1 && /^#/ { sub(/^# ?/, ""); print; next } NR > 1 { exit }' "$RAIZ/update.sh"
        return 0
        ;;
      -*)
        echo "opção desconhecida: $arg" >&2
        return 2
        ;;
      *)
        if [[ -n "$versao_arg" ]]; then
          echo "informe uma única versão" >&2
          return 2
        fi
        versao_arg="$arg"
        ;;
    esac
  done

  # --- 1. verificações (nada é alterado) ---
  command -v docker >/dev/null 2>&1 || falhar "'docker' não encontrado no PATH"
  command -v git >/dev/null 2>&1 || falhar "'git' não encontrado no PATH"
  docker compose version >/dev/null 2>&1 || falhar "'docker compose' indisponível"
  trava_adquirir
  trap finalizar EXIT
  trap interrompido INT TERM HUP
  [[ -d .git ]] || falhar "esta pasta não é um clone git; update.sh só atualiza instalações feitas por git clone"
  [[ -z "$(git status --porcelain --untracked-files=no)" ]] ||
    falhar "há alterações locais não commitadas no código; guarde-as (git stash) ou commite antes de atualizar. Nada foi alterado"
  MODO="$(imagens_do_env)" || exit 1
  [[ $flag_publicadas -eq 0 ]] || MODO="publicadas"
  espaco="$(espaco_livre_kb)"
  [[ "$espaco" =~ ^[0-9]+$ && "$espaco" -ge "$ESPACO_MIN_KB" ]] ||
    falhar "menos de 2 GiB livres nesta pasta; libere espaço antes de atualizar (nada foi alterado)"
  saude_ok || falhar "o core não está saudável agora; corrija antes de atualizar (nada foi alterado)"

  git fetch --tags --quiet || falhar "não consegui buscar as tags do repositório (nada foi alterado)"
  resolver_alvo "$versao_arg"
  SHA_ANTERIOR="$(git rev-parse HEAD)"
  VERSAO_ANTERIOR="$(valor_env VERSAO "")"
  IMAGENS_ANTERIOR="$(valor_env IMAGENS "")"
  if [[ "$(git rev-parse "refs/tags/$TAG_ALVO^{commit}")" == "$SHA_ANTERIOR" ]] &&
    { [[ $flag_publicadas -eq 0 ]] || [[ "$IMAGENS_ANTERIOR" == publicadas && "$VERSAO_ANTERIOR" == "$VERSAO_ALVO" ]]; }; then
    echo "já está na versão $TAG_ALVO; nada a fazer."
    return 0
  fi
  if [[ "$MODO" == publicadas ]] && ! command -v cosign >/dev/null 2>&1; then
    echo "aviso: 'cosign' não encontrado; vou conferir o digest das imagens com o digests.txt do release (instale o cosign para verificar a assinatura)." >&2
    DIGESTS_TXT="$(curl -fsSL --proto '=https' --max-time 30 "$URL_RELEASE/$TAG_ALVO/digests.txt")" ||
      falhar "sem 'cosign' e sem o digests.txt do release $TAG_ALVO não dá para verificar as imagens; instale o cosign. Nada foi alterado"
  fi

  # --- 2. proteção: backup, marcações pre_ e cópia do .env ---
  FASE="backup do banco"
  RAMO_ANTERIOR="$(git symbolic-ref -q --short HEAD || true)"
  TAG_COMPOSE_ANTERIOR="${VERSAO_ANTERIOR:-latest}"
  TS_PRE="$(tag_pre)"
  ENV_PRE=".env.$TS_PRE"
  echo "Fazendo o backup do banco..."
  BACKUP="$(compose exec -T core python -m sentinela.cli backup-criar --origem atualizacao | tail -n 1 | tr -d '\r')" ||
    falhar "o backup falhou; nada foi alterado"
  nome_backup_valido "$BACKUP" || falhar "o backup não devolveu um nome válido; nada foi alterado"
  FASE="marcando as imagens em uso"
  marcar_imagem core "$IMG_REPO_CORE"
  marcar_imagem web "$IMG_REPO_WEB"
  { (umask 077 && cp .env "$ENV_PRE") && chmod 600 "$ENV_PRE"; } ||
    falhar "não consegui guardar a cópia do .env (nada foi trocado)"
  PROTEGIDO=1

  # --- 3 e 4. troca (a partir daqui, falha ou erro = volta automática) ---
  FASE="checkout de $TAG_ALVO"
  echo "Indo para $TAG_ALVO..."
  git checkout -q --detach "refs/tags/$TAG_ALVO"
  if [[ "$MODO" == publicadas ]]; then
    FASE="baixando e verificando as imagens publicadas"
    definir_env IMAGENS publicadas
    definir_env VERSAO "$VERSAO_ALVO"
    compose pull core web
    verificar_imagem core "$IMG_REPO_CORE"
    verificar_imagem web "$IMG_REPO_WEB"
  else
    FASE="construindo as imagens locais"
    compose build core web
  fi
  FASE="trocando o core"
  TOCOU=1
  compose up -d --no-deps --wait --wait-timeout 120 core
  saude_ok
  FASE="trocando o web"
  compose up -d --no-deps --wait --wait-timeout 120 web
  saude_ok

  # --- 6. limpeza: um erro aqui não desfaz uma atualização que já deu certo ---
  FASE="limpando marcações antigas"
  CONCLUIDO=1
  limpar || echo "aviso: a limpeza das marcações antigas não terminou" >&2
  FASE="concluído"
  echo "Atualização concluída: $TAG_ALVO. Core e web saudáveis."
  echo "As imagens anteriores ficaram marcadas como $TS_PRE e o backup é $BACKUP (em /dados/backups)."
  echo "aviso: $AVISO_ENV"
}

# numa linha só: o bash já leu o "exit" antes de o checkout trocar este arquivo
main "$@"; exit $?
