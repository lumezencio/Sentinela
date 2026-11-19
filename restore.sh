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

# Git Bash no Windows: não converter caminhos como "/entrada/backup.tar.gz"
export MSYS_NO_PATHCONV=1

RAIZ="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$RAIZ"
# shellcheck source=scripts/operacao-comum.sh
source "$RAIZ/scripts/operacao-comum.sh"

ARQUIVO=""
SIM=0
for arg in "$@"; do
  case "$arg" in
    --sim) SIM=1 ;;
    -h | --help)
      sed -n '2,11p' "$0" | sed 's/^# \{0,1\}//'
      exit 0
      ;;
    -*)
      echo "opção desconhecida: $arg (use --sim ou --help)" >&2
      exit 2
      ;;
    *)
      [[ -z "$ARQUIVO" ]] || {
        echo "informe um único arquivo" >&2
        exit 2
      }
      ARQUIVO="$arg"
      ;;
  esac
done
[[ -n "$ARQUIVO" ]] || {
  echo "uso: ./restore.sh ARQUIVO.tar.gz [--sim]" >&2
  exit 2
}

[[ -f "$ARQUIVO" ]] || falhar "'$ARQUIVO' não é um arquivo existente (nada foi alterado)"
ABS="$(cd "$(dirname "$ARQUIVO")" && pwd)/$(basename "$ARQUIVO")"
command -v docker >/dev/null 2>&1 || falhar "'docker' não encontrado no PATH"

# cli_avulsa ARGS...: contêiner avulso do core, sem dependências (não sobe o web)
cli_avulsa() {
  compose run --rm --no-deps -T "$@"
}

echo "Verificando o backup..."
cli_avulsa -v "$ABS:/entrada/backup.tar.gz:ro" core \
  python -m sentinela.cli backup-verificar /entrada/backup.tar.gz ||
  falhar "backup inválido ou de versão mais nova; o core não foi parado e nada foi alterado"

if [[ $SIM -ne 1 ]]; then
  echo "Isto substitui o banco atual pelo do backup (o atual fica guardado como pre-restore)."
  read -r -p "Digite 'sim' para continuar: " resp || resp=""
  [[ "$resp" == "sim" ]] || falhar "cancelado; nada foi alterado"
fi

trava_adquirir
trap trava_liberar EXIT

echo "Parando só o serviço core..."
compose stop core || falhar "não foi possível parar o core"

echo "Restaurando..."
if ! PRE="$(cli_avulsa -v "$ABS:/entrada/backup.tar.gz:ro" core \
  python -m sentinela.cli restaurar /entrada/backup.tar.gz)"; then
  echo "erro: a restauração falhou; o banco anterior foi mantido. Subindo o core de novo..." >&2
  compose up -d --no-deps --wait --wait-timeout 120 core || true
  exit 1
fi
PRE="$(printf '%s\n' "$PRE" | head -n 1)"

echo "Subindo o core e esperando a saúde..."
if compose up -d --no-deps --wait --wait-timeout 120 core; then
  echo "Restauração concluída; o core está saudável."
  [[ -z "$PRE" ]] || echo "O banco anterior ficou guardado como: $PRE (em /dados/backups)"
  echo "aviso: $AVISO_ENV"
  exit 0
fi

echo "erro: o core não ficou saudável com o banco restaurado." >&2
if [[ -z "$PRE" ]]; then
  falhar "não havia banco anterior para devolver; verifique 'docker compose logs core'"
fi
echo "Devolvendo o banco anterior ($PRE)..." >&2
compose stop core || true
if cli_avulsa core python -m sentinela.cli restaurar "/dados/backups/$PRE" >/dev/null &&
  compose up -d --no-deps --wait --wait-timeout 120 core; then
  falhar "a restauração foi desfeita: o banco anterior está de volta e o core saudável"
fi
falhar "não foi possível devolver o banco anterior automaticamente; ele está em /dados/backups/$PRE (use ./backup.sh --exportar PASTA para copiá-lo)"
