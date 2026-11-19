#!/usr/bin/env bash
# Restaura um backup do Sentinela.
#
#   ./restore.sh ARQUIVO.tar.gz [--sim]
#
# Verifica o arquivo (sha256, integridade, esquema), pede confirmação (--sim pula), para
# SÓ o serviço core, restaura num contêiner avulso sobre o mesmo volume (o banco atual é
# guardado antes como "pre-restore"), sobe o core e espera a saúde. Se a saúde falhar,
# devolve o pre-restore e avisa. Sai com 0 somente se o core terminar saudável.
# O backup não contém o .env: sem a chave original, as fontes pedem as senhas de novo.
# Variável opcional: SENTINELA_PROJETO (nome do projeto compose; padrão: o desta pasta).
set -euo pipefail

# Git Bash no Windows: não converter caminhos
export MSYS_NO_PATHCONV=1

RAIZ="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$RAIZ"
# shellcheck source=scripts/operacao-comum.sh
source "$RAIZ/scripts/operacao-comum.sh"

ARQUIVO=""
SIM=0
FIM_OPCOES=0
for arg in "$@"; do
  if [[ $FIM_OPCOES -eq 0 ]]; then
    case "$arg" in
      --)
        FIM_OPCOES=1
        continue
        ;;
      --sim)
        SIM=1
        continue
        ;;
      -h | --help)
        sed -n '2,11p' "$0" | sed 's/^# \{0,1\}//'
        exit 0
        ;;
      -*)
        echo "opção desconhecida: $arg (use --sim ou --help; para arquivo que começa com '-', use ./ ou --)" >&2
        exit 2
        ;;
    esac
  fi
  [[ -z "$ARQUIVO" ]] || {
    echo "informe um único arquivo" >&2
    exit 2
  }
  ARQUIVO="$arg"
done
[[ -n "$ARQUIVO" ]] || {
  echo "uso: ./restore.sh ARQUIVO.tar.gz [--sim]" >&2
  exit 2
}
[[ "$ARQUIVO" != -* ]] || ARQUIVO="./$ARQUIVO"

[[ -f "$ARQUIVO" ]] || falhar "'$ARQUIVO' não é um arquivo existente (nada foi alterado)"
[[ -r "$ARQUIVO" ]] || falhar "'$ARQUIVO' não pode ser lido por este usuário (nada foi alterado)"
command -v docker >/dev/null 2>&1 || falhar "'docker' não encontrado no PATH"

# cli_avulsa ARGS...: contêiner avulso do core, sem dependências (não sobe o web)
cli_avulsa() {
  compose run --rm --no-deps -T "$@"
}

CORE_PARADO=0
RESTAURADO=0
ENTRADA=""
PRE=""
INICIOU=0
ANTES=""

# lista_pre_restore: nomes de pre-restore no volume (padrão fixo, sem entrada do usuário)
lista_pre_restore() {
  cli_avulsa core sh -c 'cd /dados/backups && ls -1 -- sentinela-*-pre-restore.tar.gz 2>/dev/null; true'
}

# pre_restore_novo: o pre-restore mais novo criado depois de ANTES (vazio se não houver)
pre_restore_novo() {
  local agora nome novo=""
  agora="$(lista_pre_restore 2>/dev/null)" || return 0
  while IFS= read -r nome; do
    nome="${nome%$'\r'}"
    nome_backup_valido "$nome" || continue
    grep -qxF -- "$nome" <<<"$ANTES" || novo="$nome"
  done <<<"$agora"
  printf '%s\n' "$novo"
}

# shellcheck disable=SC2329  # chamada pelos traps abaixo
finalizar() {
  # o arquivo enviado ao volume é só uma cópia de trabalho: some ao fim, com ou sem erro
  if [[ -n "$ENTRADA" ]]; then
    cli_avulsa core rm -f "$ENTRADA" >/dev/null 2>&1 ||
      echo "aviso: não foi possível apagar a cópia temporária $ENTRADA do volume (a próxima execução a varre)" >&2
  fi
  trava_liberar
}
# shellcheck disable=SC2329  # chamada pelos traps abaixo
interrompido() {
  trap - INT TERM HUP
  echo "interrompido." >&2
  if [[ $CORE_PARADO -eq 1 ]]; then
    echo "Subindo o core de novo..." >&2
    compose up -d --no-deps core >/dev/null 2>&1 || echo "erro: suba o core com: docker compose up -d core" >&2
  fi
  if [[ $RESTAURADO -eq 1 ]]; then
    echo "A restauração já tinha sido concluída antes da interrupção; o banco anterior ficou guardado como: ${PRE:-(não havia)}. Confira a saúde do core." >&2
  elif [[ $INICIOU -eq 1 ]]; then
    # o sinal pegou a própria chamada de restauração: o banco pode já ter sido trocado
    PRE="$(pre_restore_novo || true)"
    if [[ -n "$PRE" ]]; then
      echo "A interrupção ocorreu durante a restauração: o banco pode já ter sido trocado. O banco anterior ficou guardado como: $PRE. Verifique a saúde do core e, se precisar, restaure esse arquivo." >&2
    else
      echo "A interrupção ocorreu durante a restauração e não achei um pre-restore novo no volume. Verifique a saúde do core e o conteúdo de /dados/backups." >&2
    fi
  fi
  exit 130
}

if [[ $SIM -ne 1 ]]; then
  echo "Isto substitui o banco atual pelo do backup (o atual fica guardado como pre-restore)."
  echo "O arquivo será verificado antes de qualquer mudança."
  read -r -p "Digite 'sim' para continuar: " resp || resp=""
  [[ "$resp" == "sim" ]] || falhar "cancelado; nada foi alterado"
fi

# A trava vem antes de qualquer escrita (inclusive a cópia de trabalho no volume)
trava_adquirir
trap finalizar EXIT
trap interrompido INT TERM HUP

# Cópias de trabalho de execuções que morreram (SIGKILL, queda de energia) guardam um banco
# de cliente: varre com padrão fixo, sem nenhuma entrada do usuário.
cli_avulsa core sh -c 'rm -f /dados/backups/.entrada-*' ||
  falhar "não foi possível varrer cópias temporárias antigas do volume (nada foi alterado)"

# O volume pertence a outro usuário (10001): um arquivo 0600 do host não seria legível por
# bind mount. Por isso ele entra no volume pela entrada padrão de um contêiner avulso.
ENTRADA="/dados/backups/.entrada-$(date +%Y%m%dT%H%M%S)-$$.tar.gz"
echo "Enviando o backup ao volume..."
# shellcheck disable=SC2016  # o $1 é expandido pelo sh do contêiner, de propósito
cli_avulsa core sh -c 'umask 077; cat > "$1"' sh "$ENTRADA" <"$ARQUIVO" ||
  falhar "não foi possível copiar o backup para o volume (nada foi alterado)"

echo "Verificando o backup..."
cli_avulsa core python -m sentinela.cli backup-verificar "$ENTRADA" ||
  falhar "backup inválido ou de versão mais nova; o core não foi parado e nada foi alterado"

echo "Parando só o serviço core..."
CORE_PARADO=1
if ! compose stop core; then
  echo "erro: não foi possível parar o core; tentando subi-lo de novo..." >&2
  compose up -d --no-deps core >/dev/null 2>&1 || true
  falhar "não foi possível parar o core (nada foi alterado)"
fi

echo "Restaurando..."
ANTES="$(lista_pre_restore 2>/dev/null || true)"
INICIOU=1
if ! PRE="$(cli_avulsa core python -m sentinela.cli restaurar "$ENTRADA")"; then
  echo "erro: a restauração falhou; o banco anterior foi mantido. Subindo o core de novo..." >&2
  PRE="$(pre_restore_novo || true)"
  [[ -z "$PRE" ]] || echo "aviso: foi criado o pre-restore $PRE (em /dados/backups)" >&2
  compose up -d --no-deps --wait --wait-timeout 120 core || true
  CORE_PARADO=0
  exit 1
fi
PRE="$(printf '%s\n' "$PRE" | head -n 1)"
RESTAURADO=1

echo "Subindo o core e esperando a saúde..."
if compose up -d --no-deps --wait --wait-timeout 120 core; then
  CORE_PARADO=0
  echo "Restauração concluída; o core está saudável."
  [[ -z "$PRE" ]] || echo "O banco anterior ficou guardado como: $PRE (em /dados/backups)"
  echo "aviso: $AVISO_ENV"
  exit 0
fi

echo "erro: o core não ficou saudável com o banco restaurado." >&2
if [[ -z "$PRE" ]]; then
  falhar "não havia banco anterior para devolver; verifique 'docker compose logs core'"
fi
RESTAURADO=0
echo "Devolvendo o banco anterior ($PRE)..." >&2
compose stop core || true
if cli_avulsa core python -m sentinela.cli restaurar "/dados/backups/$PRE" >/dev/null &&
  compose up -d --no-deps --wait --wait-timeout 120 core; then
  CORE_PARADO=0
  falhar "a restauração foi desfeita: o banco anterior está de volta e o core saudável"
fi
falhar "não foi possível devolver o banco anterior automaticamente; ele está em /dados/backups/$PRE (use ./backup.sh --exportar PASTA para copiá-lo)"
