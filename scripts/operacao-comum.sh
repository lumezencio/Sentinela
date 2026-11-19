#!/usr/bin/env bash
# Funções comuns dos scripts de operação do Sentinela (backup.sh, restore.sh, update.sh).
# Não é executado direto: é lido com "source" depois de entrar na pasta do projeto.
# Nada aqui derruba, apaga ou remove volumes; tudo age só no projeto compose desta pasta.

# Git Bash no Windows: não converter caminhos como "/entrada/backup.tar.gz"
export MSYS_NO_PATHCONV=1

export AVISO_ENV="o backup NÃO inclui o .env: sem a SENTINELA_CHAVE_CREDENCIAIS original, as senhas das fontes e o token do Telegram não abrem. Guarde o .env em lugar seguro, separado do backup."

# compose ARGS...: docker compose no projeto desta pasta (ou em SENTINELA_PROJETO)
compose() {
  if [[ -n "${SENTINELA_PROJETO:-}" ]]; then
    docker compose -p "$SENTINELA_PROJETO" "$@"
  else
    docker compose "$@"
  fi
}

falhar() {
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

# Trava entre execuções (mkdir é atômico; flock falta no macOS).
# update.sh chama restore.sh já com a trava: ele exporta SENTINELA_TRAVA_PAI=<seu PID> e o filho,
# cujo PPID é esse PID, reaproveita a trava sem adquiri-la nem soltá-la.
TRAVA_DIR=".operacao.lock"
TRAVA_MINHA=0
trava_adquirir() {
  if [[ "${SENTINELA_TRAVA_PAI:-}" == "$PPID" && -d "$TRAVA_DIR" ]]; then
    return 0
  fi
  if ! mkdir "$TRAVA_DIR" 2>/dev/null; then
    falhar "outra operação (backup, restauração ou atualização) está em curso; se não houver, apague a pasta $TRAVA_DIR"
  fi
  TRAVA_MINHA=1
}
trava_liberar() {
  if [[ "$TRAVA_MINHA" -eq 1 ]]; then
    rmdir "$TRAVA_DIR" 2>/dev/null || true
    TRAVA_MINHA=0
  fi
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

# limpar_pre: apaga só as marcações pre_* do Sentinela além das 3 mais recentes de cada imagem.
# Nunca -f (imagem em uso ou com outra marcação fica), nunca outra imagem.
limpar_pre() {
  local lista ref repo
  lista="$(docker image ls --format '{{.Repository}}:{{.Tag}}' 2>/dev/null)" || return 0
  for repo in "$IMG_REPO_CORE" "$IMG_REPO_WEB"; do
    while IFS= read -r ref; do
      [[ -n "$ref" ]] || continue
      docker rmi "$ref" >/dev/null 2>&1 || echo "aviso: não consegui remover a marcação $ref" >&2
    done < <(
      printf '%s\n' "$lista" | tr -d '\r' |
        grep -E "^${repo//./\.}:pre_[0-9]{8}T[0-9]{6}Z$" | sort -r | tail -n +4
    )
  done
}
