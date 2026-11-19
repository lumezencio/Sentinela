#!/usr/bin/env bash
# Utilitários dos testes dos scripts de operação (lidos com "source").
# Cada teste roda em um diretório temporário com cópias dos scripts e o docker falso
# (testes-operacao/shims/docker) na frente do PATH; nenhum contêiner real é tocado.

LIB_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_DIR="$(cd "$LIB_DIR/.." && pwd)"
FALHAS=0
TESTES=0

# rodar_em_diretorio_temporario: cria o ambiente isolado e entra nele.
# Define TMP_OP e SHIM_LOG; copie os scripts necessários já copiados aqui.
rodar_em_diretorio_temporario() {
  TMP_OP="$(mktemp -d)"
  mkdir -p "$TMP_OP/scripts" "$TMP_OP/shim-estado"
  cp "$REPO_DIR"/backup.sh "$REPO_DIR"/restore.sh "$TMP_OP/"
  for extra in update.sh install.sh; do
    [[ -f "$REPO_DIR/$extra" ]] && cp "$REPO_DIR/$extra" "$TMP_OP/"
  done
  cp "$REPO_DIR"/scripts/*.sh "$TMP_OP/scripts/"
  : >"$TMP_OP/docker-compose.yml"
  printf 'SENTINELA_CHAVE_SESSAO=falsa\nSENTINELA_CHAVE_CREDENCIAIS=falsa\n' >"$TMP_OP/.env"
  chmod 600 "$TMP_OP/.env"
  export SHIM_LOG="$TMP_OP/shim-estado/docker.log"
  export SHIM_DIR="$TMP_OP/shim-estado"
  : >"$SHIM_LOG"
  unset SHIM_FALHAR SHIM_IMAGENS SENTINELA_PROJETO
  PATH="$LIB_DIR/shims:$PATH"
  export PATH
  cd "$TMP_OP" || return 1
}

limpar_temporario() {
  cd / || true
  [[ -n "${TMP_OP:-}" && -d "$TMP_OP" ]] && rm -rf "$TMP_OP"
}

_falhou() {
  echo "    FALHA: $*" >&2
  # cada teste roda em subshell dentro de "if": o set -e fica desligado ali, então a
  # asserção encerra o subshell explicitamente
  exit 1
}

afirmar_log_contem() {
  grep -qF -- "$1" "$SHIM_LOG" || _falhou "o log do docker deveria conter: $1"
}

afirmar_log_nao_contem() {
  if grep -qF -- "$1" "$SHIM_LOG"; then
    _falhou "o log do docker NÃO deveria conter: $1"
  fi
}

# afirmar_ordem PADRAO1 PADRAO2 ...: a 1ª ocorrência de cada um vem em ordem crescente de linha
afirmar_ordem() {
  local anterior=0 atual padrao
  for padrao in "$@"; do
    atual="$(grep -nF -- "$padrao" "$SHIM_LOG" | head -n 1 | cut -d: -f1)"
    [[ -n "$atual" ]] || _falhou "não achei no log: $padrao"
    if ((atual <= anterior)); then
      _falhou "ordem errada: '$padrao' (linha $atual) deveria vir depois da linha $anterior"
    fi
    anterior="$atual"
  done
}

# fs_suporta_modo: 0 se o sistema de arquivos guarda permissões (falso no NTFS do Git Bash)
fs_suporta_modo() {
  local f
  f="$(mktemp)"
  chmod 600 "$f"
  [[ "$(stat -c %a "$f")" == "600" ]]
  local r=$?
  rm -f "$f"
  return $r
}

afirmar_igual() {
  [[ "$1" == "$2" ]] || _falhou "esperado '$2', obtido '$1'"
}

# executar_testes: roda toda função test_* do arquivo chamador, cada uma em subshell isolado
executar_testes() {
  local t
  for t in $(declare -F | awk '{print $3}' | grep '^test_'); do
    TESTES=$((TESTES + 1))
    if (
      set -e
      "$t"
    ) >"${TMPDIR:-/tmp}/saida-teste.$$" 2>&1; then
      echo "ok    $t"
    else
      echo "FALHA $t"
      sed 's/^/      /' "${TMPDIR:-/tmp}/saida-teste.$$"
      FALHAS=$((FALHAS + 1))
    fi
  done
  rm -f "${TMPDIR:-/tmp}/saida-teste.$$"
  echo "$((TESTES - FALHAS))/$TESTES testes passaram"
  [[ $FALHAS -eq 0 ]]
}
