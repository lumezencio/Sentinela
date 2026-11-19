#!/usr/bin/env bash
# Backup do banco do Sentinela (dentro do volume, em /dados/backups).
#
#   ./backup.sh                  cria um backup manual no volume e imprime o nome do arquivo
#   ./backup.sh --exportar PASTA cria o backup e copia todos os backups para PASTA (0700, arquivos 0600)
#
# O backup NÃO inclui o .env: guarde-o à parte (sem a SENTINELA_CHAVE_CREDENCIAIS original,
# as senhas das fontes e o token do Telegram não abrem). Funciona com o core no ar.
# Variável opcional: SENTINELA_PROJETO (nome do projeto compose; padrão: o desta pasta).
set -euo pipefail

# Git Bash no Windows: não converter caminhos
export MSYS_NO_PATHCONV=1

RAIZ="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$RAIZ"
# shellcheck source=scripts/operacao-comum.sh
source "$RAIZ/scripts/operacao-comum.sh"

DESTINO=""
EXPORTAR=0
while [[ $# -gt 0 ]]; do
  case "$1" in
    --exportar)
      [[ $# -ge 2 ]] || {
        echo "faltou a pasta de --exportar" >&2
        exit 2
      }
      EXPORTAR=1
      DESTINO="$2"
      shift 2
      ;;
    -h | --help)
      sed -n '2,8p' "$0" | sed 's/^# \{0,1\}//'
      exit 0
      ;;
    *)
      echo "opção desconhecida: $1 (use --exportar PASTA ou --help)" >&2
      exit 2
      ;;
  esac
done

command -v docker >/dev/null 2>&1 || falhar "'docker' não encontrado no PATH"

NOME="$(compose exec -T core python -m sentinela.cli backup-criar --origem manual)" ||
  falhar "não foi possível criar o backup (o core está no ar?)"
echo "backup criado: $NOME"

if [[ $EXPORTAR -eq 1 ]]; then
  [[ -n "$DESTINO" ]] || falhar "pasta de exportação vazia"
  (umask 077 && mkdir -p "$DESTINO") || falhar "não foi possível criar $DESTINO"
  chmod 700 "$DESTINO"
  compose cp core:/dados/backups/. "$DESTINO" || falhar "não foi possível copiar os backups do volume"
  # o cp pode devolver permissões do contêiner: deixa tudo restrito ao dono
  find "$DESTINO" -type f -exec chmod 600 {} +
  echo "backups exportados para: $DESTINO"
fi

echo "aviso: $AVISO_ENV"
