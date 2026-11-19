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
UNIDADE_WINDOWS='^[A-Za-z]:[/\][^:]*$'
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

if [[ $EXPORTAR -eq 1 ]]; then
  [[ -n "$DESTINO" ]] || falhar "pasta de exportação vazia"
  # ':' faria o "compose cp" tratar parte do caminho como serviço; só a letra de unidade do
  # Windows (C:/pasta ou C:\pasta) é aceita
  if [[ "$DESTINO" == *:* && ! "$DESTINO" =~ $UNIDADE_WINDOWS ]]; then
    falhar "a pasta de exportação não pode conter ':' (use outro caminho)"
  fi
  [[ "$DESTINO" != -* ]] || DESTINO="./$DESTINO"
fi

NOME="$(compose exec -T core python -m sentinela.cli backup-criar --origem manual)" ||
  falhar "não foi possível criar o backup (o core está no ar?)"
echo "backup criado: $NOME"
echo "aviso: $AVISO_ENV"

if [[ $EXPORTAR -eq 1 ]]; then
  CRIADA=0
  if [[ ! -e "$DESTINO" ]]; then
    (umask 077 && mkdir -p "$DESTINO") || falhar "não foi possível criar $DESTINO"
    CRIADA=1
  fi
  [[ -d "$DESTINO" ]] || falhar "$DESTINO existe e não é uma pasta"
  # só uma pasta criada por este script é restringida; uma existente fica como está
  if [[ $CRIADA -eq 1 ]]; then
    chmod 700 "$DESTINO" 2>/dev/null ||
      echo "aviso: não foi possível restringir as permissões de $DESTINO (vfat/exFAT?); proteja a pasta por outros meios" >&2
  fi
  # Copia para uma pasta de trabalho dentro do destino e só move os backups de verdade
  # (sentinela-*.tar.gz): arquivos de trabalho com nome iniciado por '.' nunca saem do volume.
  ETAPA="$(umask 077 && mktemp -d "${DESTINO%/}/.exportando.XXXXXX")" ||
    falhar "não foi possível criar a pasta de trabalho em $DESTINO"
  (umask 077 && compose cp core:/dados/backups/. "$ETAPA") || {
    find "$ETAPA" -mindepth 1 -delete 2>/dev/null
    rmdir "$ETAPA" 2>/dev/null
    falhar "não foi possível copiar os backups do volume"
  }
  for f in "$ETAPA"/sentinela-*.tar.gz; do
    [[ -f "$f" ]] || continue
    chmod 600 "$f" 2>/dev/null ||
      echo "aviso: não foi possível restringir as permissões de $f (vfat/exFAT?)" >&2
    mv -f "$f" "${DESTINO%/}/"
  done
  find "$ETAPA" -mindepth 1 -delete 2>/dev/null
  rmdir "$ETAPA" 2>/dev/null || echo "aviso: sobrou a pasta de trabalho $ETAPA; apague-a" >&2
  echo "backups exportados para: $DESTINO"
fi
