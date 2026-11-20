#!/usr/bin/env bash
# Funções comuns dos scripts de operação do Sentinela (backup.sh, restore.sh, update.sh).
# Não é executado direto: é lido com "source" depois de entrar na pasta do projeto.
# Nada aqui derruba, apaga ou remove volumes; tudo age só no projeto compose desta pasta.

# Git Bash no Windows: não converter caminhos como "/entrada/backup.tar.gz"
export MSYS_NO_PATHCONV=1

export AVISO_ENV="o backup NÃO inclui o .env: sem a SENTINELA_CHAVE_CREDENCIAIS original, as senhas das fontes e o token do Telegram não abrem. Guarde o .env em lugar seguro, separado do backup."

# compose ARGS...: docker compose no projeto desta pasta (ou em SENTINELA_PROJETO), com os mesmos
# arquivos -f do core em execução quando o update.sh os detectou (SENTINELA_COMPOSE_ARQUIVOS,
# nomes separados por espaço: instalações --demo usam docker-compose.demo.yml junto).
compose() {
  local -a args=()
  local f
  [[ -z "${SENTINELA_PROJETO:-}" ]] || args+=(-p "$SENTINELA_PROJETO")
  for f in ${SENTINELA_COMPOSE_ARQUIVOS:-}; do args+=(-f "$f"); done
  docker compose ${args[@]+"${args[@]}"} "$@"
}

# dc_dica: "docker compose" (com -p PROJETO se SENTINELA_PROJETO) para os comandos que os scripts sugerem
dc_dica() {
  local p="docker compose"
  [[ -z "${SENTINELA_PROJETO:-}" ]] || p="$p -p $SENTINELA_PROJETO"
  printf '%s' "$p"
}

# prefixo_projeto: "SENTINELA_PROJETO=X " antes de um script sugerido (vazio sem a variável)
prefixo_projeto() {
  [[ -z "${SENTINELA_PROJETO:-}" ]] || printf 'SENTINELA_PROJETO=%s ' "$SENTINELA_PROJETO"
}

# ULTIMO_ERRO: o texto do último "falhar" (mensagem fixa dos scripts; o update.sh o registra)
ULTIMO_ERRO=""
# OFFLINE=1: a falha foi falta de rede/GitHub/GHCR (nada foi tentado de fato); o update.sh
# --automatico trata isso como "sem conexão" (sai 0) e o manual continua sendo erro
OFFLINE=0

# texto_de_rede TEXTO: 0 só se TEXTO (stderr de git/docker) mostra erro INEQUÍVOCO de rede (DNS,
# conexão recusada/sem rota, tempo esgotado). Qualquer sinal de autenticação, permissão,
# certificado/TLS ou de "não existe" (401/403/404, manifest unknown) NÃO é rede: segue como falha.
texto_de_rede() {
  local t
  t="$(printf '%s' "$1" | tr '[:upper:]' '[:lower:]')"
  if grep -qE 'unauthorized|denied|forbidden|certificate|x509|tls|ssl|manifest unknown|not found|requested access|authentication|401|403|404' <<<"$t"; then
    return 1
  fi
  grep -qE 'could not resolve host|failed to connect|connection timed out|network is unreachable|temporary failure in name resolution|no such host|dial tcp.*(i/o timeout|network is unreachable)' <<<"$t"
}
falhar_sem_conexao() {
  # shellcheck disable=SC2034  # lido pelo update.sh (finalizar)
  OFFLINE=1
  falhar "$*"
}
falhar() {
  # shellcheck disable=SC2034  # lido pelo update.sh (registrar_resultado)
  ULTIMO_ERRO="$*"
  echo "erro: $*" >&2
  exit 1
}

# nome_backup_valido NOME: só nomes de backup gerados pelo core (nada de '/', '..' ou ponto inicial)
nome_backup_valido() {
  [[ "$1" =~ ^sentinela-[0-9]{8}T[0-9]{6}Z-(diario|semanal|manual|atualizacao|pre-restore)\.tar\.gz$ ]]
}

# valor_env NOME PADRAO: lê NOME de .env; imprime PADRAO se ausente ou vazio
valor_env() {
  local nome="$1" padrao="${2:-}" linha valor=""
  if [[ -f .env ]]; then
    linha="$(grep -E "^${nome}=" .env | tail -n 1 || true)"
    valor="${linha#*=}"
    valor="${valor%$'\r'}"
    valor="${valor%\"}"
    valor="${valor#\"}"
  fi
  printf '%s\n' "${valor:-$padrao}"
}

# definir_env NOME VALOR: troca (ou acrescenta) a linha NOME=VALOR no .env sem tocar nas outras
definir_env() {
  local nome="$1" valor="$2" tmp
  tmp="$(mktemp "${PWD}/.env.XXXXXX")"
  chmod 600 "$tmp"
  if [[ -f .env ]]; then
    grep -v -E "^${nome}=" .env >"$tmp" || true
  fi
  printf '%s=%s\n' "$nome" "$valor" >>"$tmp"
  mv "$tmp" .env
  chmod 600 .env
}

# saude_ok: 0 se o core responde /api/v1/saude com 200
saude_ok() {
  compose exec -T core python -c \
    "import urllib.request,sys;sys.exit(0 if urllib.request.urlopen('http://127.0.0.1:8000/api/v1/saude',timeout=3).status==200 else 1)" \
    >/dev/null 2>&1
}

# esperar_saude SEGUNDOS: 0 assim que o core fica saudável; 1 se estourar o prazo
esperar_saude() {
  local limite="${1:-120}" t=0
  while ((t < limite)); do
    if saude_ok; then
      return 0
    fi
    sleep 2
    t=$((t + 2))
  done
  return 1
}

# Trava entre execuções (mkdir é atômico; flock falta no macOS). O PID do dono fica em
# .operacao.lock/pid. update.sh chama restore.sh já com a trava: exporta SENTINELA_TRAVA_PAI=<seu
# PID> e o filho só a reaproveita se esse valor for o seu PPID E o PID gravado na trava (nem
# adquire nem solta).
TRAVA_DIR=".operacao.lock"
TRAVA_MINHA=0
trava_adquirir() {
  local dono=""
  if [[ -n "${SENTINELA_TRAVA_PAI:-}" && "${SENTINELA_TRAVA_PAI}" == "$PPID" && -f "$TRAVA_DIR/pid" ]]; then
    dono="$(cat "$TRAVA_DIR/pid" 2>/dev/null || true)"
    if [[ "$dono" == "$PPID" ]]; then
      return 0
    fi
  fi
  if ! mkdir "$TRAVA_DIR" 2>/dev/null; then
    # atualização automática (timer): operação em curso não é erro, só não há nada a fazer agora
    if [[ "${AUTOMATICO:-0}" == 1 ]]; then
      echo "outra operação em curso (backup, restauração ou atualização); a atualização automática não faz nada agora"
      exit 0
    fi
    falhar "outra operação (backup, restauração ou atualização) está em curso; se não houver, apague a pasta $TRAVA_DIR"
  fi
  TRAVA_MINHA=1
  printf '%s\n' "$$" >"$TRAVA_DIR/pid" 2>/dev/null || true
}
trava_liberar() {
  if [[ "$TRAVA_MINHA" -eq 1 ]]; then
    rm -- "$TRAVA_DIR/pid" 2>/dev/null || true
    rmdir "$TRAVA_DIR" 2>/dev/null || true
    TRAVA_MINHA=0
  fi
}

# registrar_atualizacao RESULTADO DE PARA MENSAGEM: guarda o resultado em /dados/atualizacao.json
# pela CLI do core em execução (melhor esforço: falhar só avisa em stderr e nunca muda o código de
# saída de quem chamou). Os valores vão como itens do argv (sem eval, sem shell); DE e PARA só
# seguem se forem X.Y.Z; vazio = omitido. A mensagem usa --mensagem=TEXTO (pode começar com "-").
registrar_atualizacao() {
  local resultado="$1" de="${2:-}" para="${3:-}" mensagem="${4:-}"
  local -a args=(atualizacao-registrar --resultado "$resultado")
  [[ "$de" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]] && args+=(--de "$de")
  [[ "$para" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]] && args+=(--para "$para")
  [[ -z "$mensagem" ]] || args+=("--mensagem=$mensagem")
  # só a saída padrão é descartada: o stderr da CLI (avisos) vai para o do script (journal)
  compose exec -T core python -m sentinela.cli "${args[@]}" </dev/null >/dev/null ||
    echo "aviso: não consegui registrar o resultado da atualização (o resultado acima continua valendo)" >&2
  return 0
}

# --- Imagens (usadas por update.sh) -------------------------------------------------------
IMG_REPO_CORE="ghcr.io/lumezencio/sentinela-core"
IMG_REPO_WEB="ghcr.io/lumezencio/sentinela-web"

# imagens_do_env: publicadas|locais. Sem IMAGENS ou sem VERSAO no .env (Fases 1-3) = locais.
# Valor inválido de IMAGENS: recusa (chame com "|| exit 1" fora de if, pois falhar sai só do subshell).
imagens_do_env() {
  local imagens versao
  imagens="$(valor_env IMAGENS "")"
  versao="$(valor_env VERSAO "")"
  case "$imagens" in
    "" | locais | publicadas) ;;
    *) falhar "IMAGENS no .env deve ser 'publicadas' ou 'locais' (achei '$imagens')" ;;
  esac
  if [[ -z "$imagens" || -z "$versao" ]]; then
    echo locais
  else
    echo "$imagens"
  fi
}

# tag_pre: marcação das imagens de antes da atualização (UTC, ordenável como texto)
tag_pre() {
  date -u +pre_%Y%m%dT%H%M%SZ
}

# Manifesto das marcações pre_ criadas por update.sh (uma por linha, REPO:pre_<ts>). A limpeza só
# mexe no que está aqui: marcações pre_ feitas à mão ou por outro processo nunca são tocadas.
MANIFESTO_PRE=".sentinela-pre-tags"

# registrar_pre REF: acrescenta uma marcação ao manifesto (só o formato exato)
registrar_pre() {
  [[ "$1" =~ ^ghcr\.io/lumezencio/sentinela-(core|web):pre_[0-9]{8}T[0-9]{6}Z$ ]] || return 1
  (umask 077 && printf '%s\n' "$1" >>"$MANIFESTO_PRE")
}

# limpar_pre [TS_ATUAL]: das marcações do manifesto que ainda existem, mantém as 3 mais recentes
# de cada imagem e a TS_ATUAL; remove as demais (sem -f: imagem em uso fica) e regrava o manifesto
limpar_pre() {
  local atual="${1:-}" lista ref repo i tmp
  local -a mantem=()
  [[ -f "$MANIFESTO_PRE" ]] || return 0
  lista="$(docker image ls --format '{{.Repository}}:{{.Tag}}' 2>/dev/null | tr -d '\r')" || return 0
  for repo in "$IMG_REPO_CORE" "$IMG_REPO_WEB"; do
    i=0
    while IFS= read -r ref; do
      [[ -n "$ref" ]] || continue
      grep -qxF -- "$ref" <<<"$lista" || continue # já não existe: sai do manifesto
      i=$((i + 1))
      if ((i > 3)) && [[ -z "$atual" || "$ref" != *":$atual" ]]; then
        if docker rmi "$ref" >/dev/null 2>&1; then
          continue
        fi
        echo "aviso: não consegui remover a marcação $ref" >&2
      fi
      mantem+=("$ref")
    done < <(tr -d '\r' <"$MANIFESTO_PRE" | grep -E "^${repo//./\.}:pre_[0-9]{8}T[0-9]{6}Z$" | sort -ru)
  done
  tmp="$(mktemp "${PWD}/.pre-tags.XXXXXX")"
  chmod 600 "$tmp"
  if ((${#mantem[@]} > 0)); then printf '%s\n' "${mantem[@]}" >"$tmp"; fi
  mv "$tmp" "$MANIFESTO_PRE"
}


# --- Verificação das imagens publicadas (update.sh e install.sh) ----------------------------
# Contrato: o chamador define TAG_ALVO (vX.Y.Z) e VERSAO_ALVO (X.Y.Z). Fecha por padrão: sem
# cosign e sem digests.txt do release, não há como verificar e a operação aborta.
EMISSOR_COSIGN='https://token.actions.githubusercontent.com'
URL_RELEASE="https://github.com/lumezencio/Sentinela/releases/download"
DIGESTS_TXT=""

# obter_digests_sem_cosign: sem cosign instalado, baixa o digests.txt do release (HTTPS) para DIGESTS_TXT
obter_digests_sem_cosign() {
  command -v cosign >/dev/null 2>&1 && return 0
  echo "aviso: 'cosign' não encontrado; vou conferir o digest das imagens com o digests.txt do release (instale o cosign para verificar a assinatura)." >&2
  local rc=0
  DIGESTS_TXT="$(curl -fsSL --proto '=https' --max-time 30 "$URL_RELEASE/$TAG_ALVO/digests.txt")" || rc=$?
  if [[ $rc -ne 0 ]]; then
    # sem rede só com resolução (6), conexão (7) ou tempo (28); HTTP 4xx/5xx (22) e TLS (35, 51, 58, 60) são falha
    # shellcheck disable=SC2034  # lido pelo update.sh (finalizar)
    case "$rc" in 6 | 7 | 28) OFFLINE=1 ;; esac
    falhar "sem 'cosign' e sem o digests.txt do release $TAG_ALVO não dá para verificar as imagens; instale o cosign. Nada foi alterado"
  fi
}

# cosign_antigo: 0 se o cosign instalado é de versão principal menor que 3
cosign_antigo() {
  local maior
  maior="$(cosign version 2>/dev/null | tr -d '\r' | sed -n 's/^GitVersion:[[:space:]]*v\{0,1\}\([0-9][0-9]*\)\..*/\1/p' | head -n 1)"
  [[ "$maior" =~ ^[0-9]+$ ]] && ((maior < 3))
}

# verificar_imagem_por_digest SERVICO REPO DIGEST: a imagem baixada tem de ter exatamente esse digest
# (uso do smoke do release.yml sobre a candidata, que ainda não tem assinatura)
verificar_imagem_por_digest() {
  local servico="$1" repo="$2" esperado="$3" ref d
  ref="$(docker image inspect --format '{{range .RepoDigests}}{{println .}}{{end}}' "$repo:$VERSAO_ALVO" | tr -d '\r' | grep -F "$repo@" | head -n 1)" ||
    ref=""
  d="${ref#*@}"
  [[ "$d" == "$esperado" ]] ||
    falhar "o digest baixado de '$servico' difere do digest aprovado da candidata; imagem recusada, nenhum contêiner foi trocado"
}

# verificar_imagem SERVICO REPO: assinatura (cosign) ou digest do release; fecha por padrão
verificar_imagem() {
  local servico="$1" repo="$2" ref d esperado
  ref="$(docker image inspect --format '{{range .RepoDigests}}{{println .}}{{end}}' "$repo:$VERSAO_ALVO" | tr -d '\r' | grep -F "$repo@" | head -n 1)" ||
    ref=""
  d="${ref#*@}"
  [[ "$d" =~ ^sha256:[0-9a-f]{64}$ ]] || falhar "não consegui ler o digest da imagem baixada de '$servico'; nenhum contêiner foi trocado"
  if command -v cosign >/dev/null 2>&1; then
    cosign verify \
      --certificate-identity "https://github.com/lumezencio/Sentinela/.github/workflows/release.yml@refs/tags/$TAG_ALVO" \
      --certificate-oidc-issuer "$EMISSOR_COSIGN" "$repo@$d" >/dev/null || {
      cosign_antigo && falhar "o cosign instalado é anterior à 3.x e pode não ler o formato novo de assinatura; atualize o cosign (3.x ou mais novo) e tente de novo. Nenhum contêiner foi trocado"
      falhar "a assinatura da imagem de '$servico' não confere com o workflow de release de $TAG_ALVO; nenhum contêiner foi trocado"
    }
  else
    esperado="$(awk -v s="$servico" '$1 == s { print $2 }' <<<"$DIGESTS_TXT" | head -n 1)"
    [[ -n "$esperado" && "$esperado" == "$d" ]] ||
      falhar "o digest baixado de '$servico' difere do digests.txt do release; imagem recusada, nenhum contêiner foi trocado"
  fi
}
