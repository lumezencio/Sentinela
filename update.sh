#!/usr/bin/env bash
# Atualiza o Sentinela para uma versão publicada (tag vX.Y.Z), com volta automática.
#
#   ./update.sh [VERSÃO] [--imagens-publicadas] [--permitir-voltar-versao]
#
# VERSÃO é uma tag "vX.Y.Z" (padrão: a mais recente). Sem opção de imagem, respeita o .env:
# IMAGENS=publicadas baixa as imagens assinadas do ghcr.io; sem IMAGENS (instalação das Fases
# 1-3) ou IMAGENS=locais reconstrói as imagens a partir do código da tag. --imagens-publicadas
# migra uma instalação local para as imagens publicadas (grava IMAGENS e VERSAO no .env).
# Versão menor que a instalada é recusada, a menos que se passe --permitir-voltar-versao.
#
# Ordem (cada passo que falha antes do 4 não troca nenhum contêiner):
#   1. verificações sem mudar nada: trava, árvore git limpa, Docker, 2 GiB livres, arquivos
#      compose do core em execução (instalações --demo), saúde, tag alvo, digests.txt.
#   2. proteção: marcação pre_<data> das imagens em uso (e seus IDs), cópia do .env
#      (.env.pre_<data>, 0600).
#   3. preparo: checkout da tag, imagens novas (pull + verificação, ou build) e, se o resultado
#      for idêntico ao que já roda, "já está na versão" (nada a trocar).
#   4. backup do banco (tipo "atualizacao") imediatamente antes da troca; se o core em execução é
#      de uma versão sem backup-criar (Fases 1-3), usa a CLI da imagem nova num contêiner avulso
#      sobre o mesmo volume (o backup do SQLite é online).
#   5. troca: core (saúde por até 120 s) e depois web, sem build nem pull.
#   6. limpeza: só as marcações pre_ do manifesto .sentinela-pre-tags (as 3 mais recentes ficam).
#
# Imagens publicadas: o digest baixado é conferido com "cosign verify" (identidade exata do
# workflow release.yml na tag alvo e emissor do GitHub) ou, sem cosign, com o digests.txt do
# release. CONTRATO com o release.yml: digests.txt tem uma linha por imagem, "core sha256:<64 hex>"
# e "web sha256:<64 hex>", com o digest do ÍNDICE multi-arquitetura (o que o cosign assina).
#
# VOLTA AUTOMÁTICA (só para FALHAS): depois do backup, se algum contêiner foi trocado, para o
# core, RESTAURA O BACKUP (restore.sh --do-volume --sem-subir, com a CLI da imagem nova, que
# sempre a tem), devolve checkout, .env e marcações pre_, sobe core e web com as imagens
# anteriores e confere saúde e IDs das imagens. Dados gravados depois do backup são descartados.
# NUNCA faz "alembic downgrade": uma migração pode ter mudado o esquema, e o downgrade da 0002
# recria "equipamento" com chaves estrangeiras ligadas; o caminho seguro é sempre o banco do backup.
#
# INTERRUPÇÃO (Ctrl+C, TERM, HUP): antes de qualquer contêiner ser trocado, só desfaz os arquivos.
# Depois da primeira troca NÃO age (a volta automática é para falhas, não para interrupções, para
# nunca competir com um comando em andamento): relata os fatos (fase, estado real dos contêineres,
# o backup, as marcações pre_) e os comandos exatos da volta manual. Se a troca já tinha terminado,
# só avisa e sai com 0.
#
# Nunca usa "compose down", "prune", "rmi -f" nem "git reset --hard"; só mexe neste projeto
# compose (ou no de SENTINELA_PROJETO), com os mesmos arquivos -f do core em execução.
# shellcheck disable=SC2317,SC2329  # funções chamadas só pelos traps e pela volta
set -euo pipefail

export MSYS_NO_PATHCONV=1

RAIZ="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$RAIZ"
# shellcheck source=scripts/operacao-comum.sh
source "$RAIZ/scripts/operacao-comum.sh"

ESPACO_MIN_KB=$((2 * 1024 * 1024))

# Estado da execução: uma só variável de fase, mais os fatos que a volta e o relatório usam
FASE="verificando"
PROTEGIDO=0 # 1 quando as marcações pre_ e a cópia do .env existem (checkout/.env/tags revertíveis)
TOCOU=0     # 1 a partir do primeiro comando que troca um contêiner (o backup já existe)
INTERROMPIDO=0
CONCLUIDO=0 # 1 quando a troca terminou bem (só a limpeza resta)
ALVO_VERIFICADO=0
BACKUP=""
TS_PRE=""
ENV_PRE=""
RAMO_ANTERIOR=""
SHA_ANTERIOR=""
VERSAO_ANTERIOR=""
IMAGENS_ANTERIOR=""
TAG_COMPOSE_ANTERIOR="latest"
ID_CORE_ANTES=""
ID_WEB_ANTES=""
VOLUME_DADOS=""
ARQUIVOS_REVERTIDOS=0
PRIV=""          # pasta privada (0700) com a cópia do restore.sh e do log das restaurações
CLI_ANTIGA_TEM=""  # 1/0: a imagem anterior tem "restaurar" (só depois de uma restauração que falhou)
TAG_ALVO=""
VERSAO_ALVO=""
MODO="locais"
TAGS_ALVO_BAIXADAS=0
ID_ALVO_CORE_ANTES=""
ID_ALVO_WEB_ANTES=""

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

# comandos_de_volta: a volta manual a partir do ESTADO REAL (o que já foi feito não é repetido).
# Com "preso", o restore é preso a uma imagem específica (a candidata, por ID) e ao volume real.
comandos_de_volta() {
  local p="docker compose" f
  [[ -z "${SENTINELA_PROJETO:-}" ]] || p="$p -p $SENTINELA_PROJETO"
  for f in ${SENTINELA_COMPOSE_ARQUIVOS:-}; do p="$p -f $f"; done
  echo "Volta manual (execute na pasta do projeto, nesta ordem; os contêineres continuam parados):"
  echo "  $p stop core"
  if [[ "${1:-}" == preso ]]; then
    # a restauração automática já falhou: preso a uma imagem e ao volume real. A candidata já
    # falhou; usa a anterior (se tem "restaurar") ou uma imagem publicada conhecida como boa.
    local img
    if [[ "$CLI_ANTIGA_TEM" == 1 && -n "$ID_CORE_ANTES" ]]; then
      img="$ID_CORE_ANTES"
    else
      img="$IMG_REPO_CORE:${VERSAO_ANTERIOR:-<tag publicada conhecida>}"
    fi
    echo "  docker run --rm --env-file .env -v ${VOLUME_DADOS:-<volume de dados>}:/dados $img python -m sentinela.cli restaurar /dados/backups/$BACKUP"
  else
    echo "  $(prefixo_projeto)./restore.sh --do-volume $BACKUP --sim --sem-subir"
  fi
  if [[ $ARQUIVOS_REVERTIDOS -eq 0 ]]; then
    if [[ -n "$RAMO_ANTERIOR" ]]; then
      echo "  git checkout $RAMO_ANTERIOR"
    else
      echo "  git checkout --detach $SHA_ANTERIOR"
    fi
    echo "  cp $ENV_PRE .env && chmod 600 .env"
    echo "  docker tag $IMG_REPO_CORE:$TS_PRE $IMG_REPO_CORE:$TAG_COMPOSE_ANTERIOR"
    echo "  docker tag $IMG_REPO_WEB:$TS_PRE $IMG_REPO_WEB:$TAG_COMPOSE_ANTERIOR"
  fi
  echo "  $p up -d --no-deps --no-build --pull never --wait core web"
}

# reverter_arquivos: checkout e .env anteriores, marcações das imagens e a marcação da versão
# alvo que não chegou a ser verificada (sem tocar em contêiner; rmi nunca com -f)
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
  [[ "$ok" -ne 0 ]] || ARQUIVOS_REVERTIDOS=1
  # Tag da versão alvo que não chegou a ser verificada: sai se foi criada pelo pull; se já existia,
  # volta para a imagem que apontava antes. Se a versão alvo é a que já rodava (VERSAO_ANTERIOR), a
  # tag acabou de ser restaurada acima pelo pre_: não se mexe nela.
  if [[ $TAGS_ALVO_BAIXADAS -eq 1 && $ALVO_VERIFICADO -eq 0 && "$VERSAO_ALVO" != "$TAG_COMPOSE_ANTERIOR" ]]; then
    local repo antes
    for repo in core web; do
      if [[ $repo == core ]]; then
        repo="$IMG_REPO_CORE"
        antes="$ID_ALVO_CORE_ANTES"
      else
        repo="$IMG_REPO_WEB"
        antes="$ID_ALVO_WEB_ANTES"
      fi
      if [[ -z "$antes" ]]; then
        docker rmi "$repo:$VERSAO_ALVO" >/dev/null 2>&1 || true
      else
        docker tag "$antes" "$repo:$VERSAO_ALVO" >/dev/null 2>&1 || true
      fi
    done
  fi
  return "$ok"
}

# id_em_execucao SERVICO: ID da imagem do contêiner do serviço agora (vazio se não achar)
id_em_execucao() {
  local cid
  cid="$(compose ps -q "$1" 2>/dev/null | head -n 1 | tr -d '\r')"
  [[ -n "$cid" ]] || return 0
  docker inspect --format '{{.Image}}' "$cid" 2>/dev/null | tr -d '\r' || true
}

# cli_tem_restaurar: 0 se a imagem que o compose usa agora tem o comando "restaurar"
cli_tem_restaurar() {
  local ajuda
  ajuda="$(compose run --rm --no-deps -T core python -m sentinela.cli --help 2>&1 || true)"
  [[ "$ajuda" == *restaurar* ]]
}

# restaurar_backup: restore.sh só restaura (core fica parado); usa a imagem que o compose usa agora.
# Roda a CÓPIA tirada no início (o restore.sh do checkout pode ser o da versão candidata, quebrado,
# ou o de um checkout antigo, sem --sem-subir); a saída também vai para o log, usado no relatório.
restaurar_backup() {
  local rc
  # sem pipe: o PPID do restore.sh tem de ser este processo (a trava herdada confere o PID)
  SENTINELA_RAIZ="$RAIZ" SENTINELA_TRAVA_PAI="$$" bash "$PRIV/restore.sh" --do-volume "$BACKUP" --sim --sem-subir >"$PRIV/restore.log" 2>&1
  rc=$?
  cat "$PRIV/restore.log" >&2
  return "$rc"
}

# explicar_restore_sem_saida: as duas restaurações falharam; fatos e o que fazer
explicar_restore_sem_saida() {
  echo "A restauração falhou com a imagem nova e com a anterior (ou a anterior não tem o comando)." >&2
  echo "Últimas linhas do erro da última tentativa:" >&2
  tail -n 5 "$PRIV/restore.log" 2>/dev/null | recuar >&2
  if [[ "$CLI_ANTIGA_TEM" == 1 ]]; then
    echo "A imagem anterior (ID ${ID_CORE_ANTES:-desconhecido}) tem o comando 'restaurar' e também falhou: a causa pode estar no backup ou no volume." >&2
  else
    echo "Só a imagem nova tinha o comando 'restaurar' e a CLI dela já falhou (acima). A causa pode estar no backup ou no volume, não só na imagem." >&2
    echo "Uma imagem publicada e conhecida como boa serve para restaurar: ${IMG_REPO_CORE}:<tag publicada>." >&2
  fi
}

# voltar: falha depois da proteção. Cada passo é relatado pelo que foi de fato conferido.
# Com contêiner trocado: para o core, restaura o backup com a CLI da imagem candidata (a antiga pode
# nem ter "restaurar"); se ela falhar, devolve os arquivos e tenta UMA vez com a imagem antiga, se
# ela tiver o comando. Sem banco restaurado, os contêineres ficam parados.
voltar() {
  set +e
  trap '' INT TERM HUP
  local restaurou=1 arquivos=1
  {
    echo
    echo "FALHA na fase: $FASE. Voltando ao estado anterior. NÃO INTERROMPA: voltando."
  } >&2
  if [[ $TOCOU -eq 1 ]]; then
    echo "Restaurando o backup $BACKUP (dados gravados depois dele serão descartados)..." >&2
    compose stop core >&2 && restaurar_backup
    restaurou=$?
    if [[ $restaurou -ne 0 ]]; then
      echo "A restauração com a imagem nova falhou; devolvendo os arquivos e tentando com a imagem anterior..." >&2
      reverter_arquivos
      arquivos=$?
      if cli_tem_restaurar; then
        CLI_ANTIGA_TEM=1
        restaurar_backup
        restaurou=$?
      else
        CLI_ANTIGA_TEM=0
        echo "A imagem anterior não tem o comando 'restaurar'; não há como tentar de novo automaticamente." >&2
      fi
    fi
  fi
  if [[ $ARQUIVOS_REVERTIDOS -eq 0 ]]; then
    reverter_arquivos
    arquivos=$?
  else
    arquivos=0
  fi
  if [[ $arquivos -eq 0 ]]; then
    echo "Checkout anterior, .env e marcações das imagens restaurados." >&2
  else
    echo "ERRO: não consegui restaurar tudo (checkout, .env ou marcações)." >&2
  fi
  if [[ $TOCOU -eq 1 ]]; then
    if [[ $restaurou -eq 0 && $arquivos -eq 0 ]]; then
      if compose up -d --no-deps --no-build --pull never --wait core web >&2 && saude_ok &&
        [[ -z "$ID_CORE_ANTES" || "$(id_em_execucao core)" == "$ID_CORE_ANTES" ]] &&
        [[ -z "$ID_WEB_ANTES" || "$(id_em_execucao web)" == "$ID_WEB_ANTES" ]]; then
        echo "Volta concluída: banco do backup restaurado, imagens anteriores de volta (IDs conferidos) e core saudável." >&2
      else
        echo "A volta subiu os contêineres, mas NÃO consegui confirmar a saúde do core e os IDs das imagens anteriores." >&2
      fi
    else
      echo "ERRO: a volta automática não terminou; os contêineres foram deixados parados." >&2
      if [[ $restaurou -ne 0 ]]; then explicar_restore_sem_saida; fi
      comandos_de_volta preso >&2
    fi
  else
    echo "Nenhum contêiner tinha sido trocado; o banco não foi mexido." >&2
    if saude_ok; then echo "O core responde saudável." >&2; else echo "O core NÃO respondeu saudável agora." >&2; fi
  fi
  {
    echo "Estado atual:"
    estado_servicos
    echo "Últimas linhas do log do core:"
  } >&2
  compose logs --tail 30 core >&2 || true
  return 1
}

interrompido() {
  trap - INT TERM HUP
  INTERROMPIDO=1
  if [[ $CONCLUIDO -eq 1 ]]; then
    echo "aviso: a atualização já tinha terminado; só a limpeza das marcações antigas foi interrompida (sem prejuízo)." >&2
    exit 0
  fi
  {
    echo
    echo "Interrompido durante: $FASE."
  } >&2
  if [[ $PROTEGIDO -eq 1 && $TOCOU -eq 0 ]]; then
    if reverter_arquivos; then
      echo "Nenhum contêiner tinha sido trocado: desfiz o checkout, o .env e as marcações." >&2
    else
      echo "Nenhum contêiner tinha sido trocado, mas não consegui desfazer tudo." >&2
    fi
  elif [[ $TOCOU -eq 1 ]]; then
    echo "Nada mais foi feito depois da interrupção; os contêineres ficaram como estão." >&2
  else
    echo "Nenhum contêiner tinha sido trocado e nada foi alterado em arquivos." >&2
  fi
  {
    echo "Estado atual:"
    estado_servicos
    [[ -z "$BACKUP" ]] || echo "Backup desta atualização (em /dados/backups): $BACKUP"
    [[ $PROTEGIDO -eq 0 ]] || echo "Marcações das imagens anteriores: $IMG_REPO_CORE:$TS_PRE e $IMG_REPO_WEB:$TS_PRE"
    if [[ $TOCOU -eq 1 ]]; then comandos_de_volta; fi
    echo "Verifique a saúde antes de usar ($(dc_dica) ps; $(dc_dica) logs core)."
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
  if [[ -n "$PRIV" && -d "$PRIV" ]]; then rm -rf -- "$PRIV"; fi
  exit "$rc"
}

# espaco_livre_kb: KiB livres na pasta do projeto
espaco_livre_kb() {
  df -Pk . | awk 'NR == 2 { print $4 }'
}

# versao_menor A B: 0 se A < B (X.Y.Z numérico; sem sort -V, que falta no macOS)
versao_menor() {
  local a b i x y
  local -a A B
  a="${1%%-*}"
  b="${2%%-*}"
  IFS=. read -r -a A <<<"$a"
  IFS=. read -r -a B <<<"$b"
  for i in 0 1 2; do
    x="${A[i]:-0}"
    y="${B[i]:-0}"
    [[ "$x" =~ ^[0-9]+$ && "$y" =~ ^[0-9]+$ ]] || return 1
    if ((x < y)); then return 0; fi
    if ((x > y)); then return 1; fi
  done
  return 1
}

# caminho_unix CAMINHO: caminho do rótulo do compose no formato do shell (Windows: C:\\x vira /c/x)
caminho_unix() {
  local c="$1"
  if command -v cygpath >/dev/null 2>&1 && [[ "$c" == *\\* || "$c" =~ ^[A-Za-z]:/ ]]; then
    cygpath -u "$c" 2>/dev/null && return 0
  fi
  c="${c//\\//}"
  if [[ "$c" =~ ^([A-Za-z]):/(.*)$ ]]; then
    local d rest="${BASH_REMATCH[2]}"
    d="$(printf '%s' "${BASH_REMATCH[1]}" | tr '[:upper:]' '[:lower:]')"
    c="/$d/$rest"
  fi
  printf '%s\n' "$c"
}

# detectar_arquivos_compose: os arquivos -f do core em execução (label do compose), sempre
# repassados (inclusive ao restore.sh); recusa se não der para saber
detectar_arquivos_compose() {
  local cid rotulo f dir nomes=""
  # nada herdado do ambiente: só o que for detectado aqui vale
  SENTINELA_COMPOSE_ARQUIVOS=""
  export SENTINELA_COMPOSE_ARQUIVOS
  cid="$(compose ps -q core 2>/dev/null | head -n 1 | tr -d '\r')"
  [[ -n "$cid" ]] || falhar "não encontrei o contêiner do core em execução; suba o Sentinela antes de atualizar (nada foi alterado)"
  VOLUME_DADOS="$(docker inspect --format '{{range .Mounts}}{{if eq .Destination "/dados"}}{{.Name}}{{end}}{{end}}' "$cid" 2>/dev/null | tr -d '\r' || true)"
  rotulo="$(docker inspect --format '{{index .Config.Labels "com.docker.compose.project.config_files"}}' "$cid" 2>/dev/null | tr -d '\r' || true)"
  [[ -n "$rotulo" ]] ||
    falhar "não consegui descobrir com quais arquivos compose o core foi criado (instalação --demo ou personalizada?); atualize manualmente ou recrie o core com docker compose up. Nada foi alterado"
  local IFS=,
  for f in $rotulo; do
    f="$(caminho_unix "$f")"
    dir="$(cd "$(dirname "$f")" 2>/dev/null && pwd)" || dir=""
    f="$(basename "$f")"
    [[ "$dir" == "$RAIZ" && "$f" =~ ^docker-compose[A-Za-z0-9._-]*\.ya?ml$ && -f "$RAIZ/$f" ]] ||
      falhar "o core em execução foi criado com um arquivo compose que não está nesta pasta ou tem nome inesperado ($f). No Windows, rode o update.sh pelo Git Bash ou WSL, dentro da pasta do projeto; senão atualize manualmente. Nada foi alterado"
    nomes="$nomes $f"
  done
  SENTINELA_COMPOSE_ARQUIVOS="${nomes# }"
  export SENTINELA_COMPOSE_ARQUIVOS
}

# versao_em_execucao: a versão que RODA (VERSAO do .env nas imagens publicadas; senão a do pacote
# no core em execução). Vazia se não der para saber (a checagem de downgrade então não vale).
versao_em_execucao() {
  if [[ "$IMAGENS_ANTERIOR" == publicadas && -n "$VERSAO_ANTERIOR" ]]; then
    printf '%s\n' "$VERSAO_ANTERIOR"
    return 0
  fi
  compose exec -T core python -c "import sentinela; print(sentinela.__version__)" 2>/dev/null | tr -d '\r' | tail -n 1 || true
}

# versao_do_alvo: versão do alvo (publicadas: a da tag; locais: version do core/pyproject.toml na tag,
# ou o número da tag se o arquivo não existir lá)
versao_do_alvo() {
  local v=""
  if [[ "$MODO" != publicadas ]]; then
    v="$(git show "refs/tags/$TAG_ALVO:core/pyproject.toml" 2>/dev/null | grep -m 1 -E '^version *= *"' | cut -d'"' -f2 || true)"
  fi
  printf '%s\n' "${v:-$VERSAO_ALVO}"
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

# marcar_imagem SERVICO REPO: marca a imagem do contêiner em uso como REPO:pre_<ts> (e guarda o ID)
marcar_imagem() {
  local servico="$1" repo="$2" id
  id="$(id_em_execucao "$servico")"
  [[ -n "$id" ]] || falhar "não consegui descobrir a imagem em uso de '$servico'; nenhum contêiner foi trocado"
  docker tag "$id" "$repo:$TS_PRE" ||
    falhar "não consegui marcar a imagem de '$servico' como $TS_PRE; nenhum contêiner foi trocado (pode ter ficado a marcação do outro serviço)"
  registrar_pre "$repo:$TS_PRE" || true
  if [[ "$servico" == core ]]; then ID_CORE_ANTES="$id"; else ID_WEB_ANTES="$id"; fi
}

# id_da_tag REF: ID local da imagem REF (vazio se não existir)
id_da_tag() {
  docker image inspect --format '{{.Id}}' "$1" 2>/dev/null | tr -d '\r' || true
}

# fazer_backup: backup do banco (tipo atualizacao) e BACKUP = nome do arquivo
fazer_backup() {
  local ajuda saida
  ajuda="$(compose exec -T core python -m sentinela.cli --help 2>&1 || true)"
  if [[ "$ajuda" == *backup-criar* ]]; then
    saida="$(compose exec -T core python -m sentinela.cli backup-criar --origem atualizacao)" || saida=""
  else
    echo "O core em execução é de uma versão sem backup-criar (Fases 1-3): usando a CLI da imagem nova num contêiner avulso sobre o mesmo volume (backup online do SQLite)."
    saida="$(compose run --rm --no-deps -T core python -m sentinela.cli backup-criar --origem atualizacao)" || saida=""
  fi
  BACKUP="$(printf '%s\n' "$saida" | tail -n 1 | tr -d '\r')"
  nome_backup_valido "$BACKUP" || {
    BACKUP=""
    falhar "não foi possível fazer o backup; nenhum contêiner foi trocado. Caminho manual: pare o core (docker compose stop core), copie o volume de dados do core para um arquivo seguro (por exemplo com um contêiner avulso que monte o volume e o compacte), religue (docker compose start core) e só então rode ./update.sh de novo"
  }
}

# descartar_protecao: o preparo mostrou que nada muda; apaga as marcações e a cópia desta execução
descartar_protecao() {
  docker rmi "$IMG_REPO_CORE:$TS_PRE" "$IMG_REPO_WEB:$TS_PRE" >/dev/null 2>&1 || true
  rm -f -- "$ENV_PRE"
  PROTEGIDO=0
}

# limpar: marcações pre_ do manifesto além das 3 mais recentes e cópias antigas do .env
limpar() {
  local f
  limpar_pre "$TS_PRE"
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
  local versao_arg="" flag_publicadas=0 permitir_voltar=0 arg espaco rodando alvo_pkg
  for arg in "$@"; do
    case "$arg" in
      --imagens-publicadas) flag_publicadas=1 ;;
      --permitir-voltar-versao) permitir_voltar=1 ;;
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
  # cópia privada do restore.sh (e da lib), antes de qualquer checkout: a volta usa SEMPRE esta
  PRIV="$(mktemp -d "${TMPDIR:-/tmp}/sentinela-update.XXXXXX")" || falhar "não consegui criar a pasta temporária"
  chmod 700 "$PRIV"
  mkdir "$PRIV/scripts"
  cp "$RAIZ/restore.sh" "$PRIV/restore.sh"
  cp "$RAIZ/scripts/operacao-comum.sh" "$PRIV/scripts/operacao-comum.sh"
  trap interrompido INT TERM HUP
  [[ -d .git ]] || falhar "esta pasta não é um clone git; update.sh só atualiza instalações feitas por git clone"
  [[ -z "$(git status --porcelain --untracked-files=no)" ]] ||
    falhar "há alterações locais não commitadas no código; guarde-as (git stash) ou commite antes de atualizar. Nada foi alterado"
  MODO="$(imagens_do_env)" || exit 1
  [[ $flag_publicadas -eq 0 ]] || MODO="publicadas"
  espaco="$(espaco_livre_kb)"
  [[ "$espaco" =~ ^[0-9]+$ && "$espaco" -ge "$ESPACO_MIN_KB" ]] ||
    falhar "menos de 2 GiB livres nesta pasta; libere espaço antes de atualizar (nada foi alterado)"
  detectar_arquivos_compose
  saude_ok || falhar "o core não está saudável agora; corrija antes de atualizar (nada foi alterado)"

  git fetch --tags --quiet || falhar "não consegui buscar as tags do repositório (nada foi alterado)"
  resolver_alvo "$versao_arg"
  SHA_ANTERIOR="$(git rev-parse HEAD)"
  VERSAO_ANTERIOR="$(valor_env VERSAO "")"
  IMAGENS_ANTERIOR="$(valor_env IMAGENS "")"
  rodando="$(versao_em_execucao)"
  alvo_pkg="$(versao_do_alvo)"
  if [[ -n "$rodando" && -n "$alvo_pkg" && $permitir_voltar -eq 0 ]] && versao_menor "$alvo_pkg" "$rodando"; then
    falhar "$TAG_ALVO (versão $alvo_pkg) é anterior à que está rodando ($rodando); voltar de versão pode falhar com o banco atual. Para forçar: ./update.sh $TAG_ALVO --permitir-voltar-versao (nada foi alterado)"
  fi
  if [[ "$MODO" == publicadas ]]; then
    # já está na versão? (a versão que RODA, não o checkout: VERSAO e IDs das imagens em execução)
    if [[ "$IMAGENS_ANTERIOR" == publicadas && "$VERSAO_ANTERIOR" == "$VERSAO_ALVO" ]]; then
      local rc rw
      rc="$(id_em_execucao core)"
      rw="$(id_em_execucao web)"
      if [[ -n "$rc" && "$rc" == "$(id_da_tag "$IMG_REPO_CORE:$VERSAO_ALVO")" &&
        -n "$rw" && "$rw" == "$(id_da_tag "$IMG_REPO_WEB:$VERSAO_ALVO")" ]]; then
        echo "já está na versão $TAG_ALVO (os contêineres em execução usam as imagens dela); nada a fazer."
        return 0
      fi
    fi
    obter_digests_sem_cosign
  fi

  # --- 2. proteção: marcações pre_ e cópia do .env (ainda sem backup e sem trocar nada) ---
  FASE="marcando as imagens em uso"
  RAMO_ANTERIOR="$(git symbolic-ref -q --short HEAD || true)"
  TAG_COMPOSE_ANTERIOR="${VERSAO_ANTERIOR:-latest}"
  TS_PRE="$(tag_pre)"
  ENV_PRE=".env.$TS_PRE"
  marcar_imagem core "$IMG_REPO_CORE"
  marcar_imagem web "$IMG_REPO_WEB"
  { (umask 077 && cp .env "$ENV_PRE") && chmod 600 "$ENV_PRE"; } ||
    falhar "não consegui guardar a cópia do .env; nenhum contêiner foi trocado (as marcações pre_ ficaram)"
  PROTEGIDO=1

  # --- 3. preparo: checkout e imagens novas (a partir daqui, falha ou erro = volta) ---
  if [[ "$(git rev-parse "refs/tags/$TAG_ALVO^{commit}")" != "$SHA_ANTERIOR" ]]; then
    FASE="checkout de $TAG_ALVO"
    echo "Indo para $TAG_ALVO..."
    git checkout -q --detach "refs/tags/$TAG_ALVO"
  fi
  if [[ "$MODO" == publicadas ]]; then
    FASE="baixando e verificando as imagens publicadas"
    definir_env IMAGENS publicadas
    definir_env VERSAO "$VERSAO_ALVO"
    # o que as tags da versão alvo eram antes do pull: a volta só remove o que não existia
    ID_ALVO_CORE_ANTES="$(id_da_tag "$IMG_REPO_CORE:$VERSAO_ALVO")"
    ID_ALVO_WEB_ANTES="$(id_da_tag "$IMG_REPO_WEB:$VERSAO_ALVO")"
    TAGS_ALVO_BAIXADAS=1
    compose pull core web ||
      falhar "não consegui baixar as imagens da versão $VERSAO_ALVO (rede, ghcr.io ou versão não publicada); nenhum contêiner foi trocado"
    verificar_imagem core "$IMG_REPO_CORE"
    verificar_imagem web "$IMG_REPO_WEB"
    ALVO_VERIFICADO=1
  else
    FASE="construindo as imagens locais"
    compose build core web
    # imagens idênticas às que rodam: nada a trocar (a versão que RODA, não o checkout)
    if [[ -n "$ID_CORE_ANTES" && "$(id_da_tag "$IMG_REPO_CORE:$TAG_COMPOSE_ANTERIOR")" == "$ID_CORE_ANTES" &&
      "$(id_da_tag "$IMG_REPO_WEB:$TAG_COMPOSE_ANTERIOR")" == "$ID_WEB_ANTES" ]]; then
      descartar_protecao
      echo "já está na versão $TAG_ALVO (as imagens construídas são idênticas às em execução); nada a trocar."
      return 0
    fi
  fi

  # --- 4. backup, imediatamente antes da troca ---
  FASE="backup do banco"
  echo "Fazendo o backup do banco..."
  fazer_backup

  # --- 5. troca ---
  FASE="trocando o core"
  TOCOU=1
  compose up -d --no-deps --no-build --pull never --wait --wait-timeout 120 core
  saude_ok
  FASE="trocando o web"
  compose up -d --no-deps --no-build --pull never --wait --wait-timeout 120 web
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
