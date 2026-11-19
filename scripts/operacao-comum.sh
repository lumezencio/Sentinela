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

# valor_env NOME PADRAO: lê NOME de .env; imprime PADRAO se ausente ou vazio
valor_env() {
  local nome="$1" padrao="${2:-}" linha valor=""
  if [[ -f .env ]]; then
    linha="$(grep -E "^${nome}=" .env | tail -n 1 || true)"
    valor="${linha#*=}"
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

# Trava entre execuções (mkdir é atômico; flock falta no macOS)
TRAVA_DIR=".operacao.lock"
trava_adquirir() {
  if ! mkdir "$TRAVA_DIR" 2>/dev/null; then
    falhar "outra operação (backup, restauração ou atualização) está em curso; se não houver, apague a pasta $TRAVA_DIR"
  fi
}
trava_liberar() {
  rmdir "$TRAVA_DIR" 2>/dev/null || true
}
