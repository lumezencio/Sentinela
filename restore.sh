#!/usr/bin/env bash
# Restaura um backup do Sentinela.
#
#   ./restore.sh ARQUIVO.tar.gz [--sim]          arquivo do host
#   ./restore.sh --do-volume NOME [--sim]        arquivo que já está em /dados/backups
#   --sem-subir                                  só restaura: o core fica parado (uso do update.sh)
#
# Verifica o arquivo (sha256, integridade, esquema), pede confirmação (--sim pula), para
# SÓ o serviço core, restaura num contêiner avulso sobre o mesmo volume (o banco atual é
# guardado antes como "pre-restore"), sobe o core e espera a saúde. Se a saúde falhar,
# devolve o pre-restore e avisa. Sai com 0 somente se o core terminar saudável.
# Interrompido (Ctrl+C), só relata os fatos: a fase, o estado do core e os pre-restore criados.
# O backup não contém o .env: sem a chave original, as fontes pedem as senhas de novo.
# Variável opcional: SENTINELA_PROJETO (nome do projeto compose; padrão: o desta pasta).
set -euo pipefail

# Git Bash no Windows: não converter caminhos
export MSYS_NO_PATHCONV=1

RAIZ="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$RAIZ"
# shellcheck source=scripts/operacao-comum.sh
source "$RAIZ/scripts/operacao-comum.sh"

USO="uso: ./restore.sh ARQUIVO.tar.gz [--sim]  |  ./restore.sh --do-volume NOME [--sim]"
erro_de_uso() {
  echo "$1" >&2
  exit 2
}

ARQUIVO=""
NOME_VOLUME=""
DO_VOLUME=0
SIM=0
SEM_SUBIR=0
FIM_OPCOES=0
while [[ $# -gt 0 ]]; do
  arg="$1"
  shift
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
      --sem-subir)
        SEM_SUBIR=1
        continue
        ;;
      --do-volume)
        [[ $# -gt 0 ]] || erro_de_uso "--do-volume exige o NOME de um backup em /dados/backups"
        [[ $DO_VOLUME -eq 0 ]] || erro_de_uso "informe um único arquivo"
        DO_VOLUME=1
        NOME_VOLUME="$1"
        shift
        continue
        ;;
      -h | --help)
        awk 'NR > 1 && /^#/ { sub(/^# ?/, ""); print; next } NR > 1 { exit }' "$0"
        exit 0
        ;;
      -*)
        erro_de_uso "opção desconhecida: $arg (use --sim, --do-volume ou --help; para arquivo que começa com '-', use ./ ou --)"
        ;;
    esac
  fi
  [[ -z "$ARQUIVO" ]] || erro_de_uso "informe um único arquivo"
  ARQUIVO="$arg"
done

if [[ $DO_VOLUME -eq 1 ]]; then
  [[ -z "$ARQUIVO" ]] || erro_de_uso "use um arquivo do host OU --do-volume, não os dois"
  # só o nome, no padrão estrito dos backups do core: nada de pasta, '..' ou ponto inicial
  nome_backup_valido "$NOME_VOLUME" ||
    erro_de_uso "nome inválido para --do-volume: informe só o nome de um backup de /dados/backups (ex.: sentinela-20261118T030000Z-pre-restore.tar.gz), sem pasta"
  ALVO="/dados/backups/$NOME_VOLUME"
else
  [[ -n "$ARQUIVO" ]] || erro_de_uso "$USO"
  [[ "$ARQUIVO" != -* ]] || ARQUIVO="./$ARQUIVO"
  [[ -f "$ARQUIVO" ]] || falhar "'$ARQUIVO' não é um arquivo existente (nada foi alterado)"
  [[ -r "$ARQUIVO" ]] || falhar "'$ARQUIVO' não pode ser lido por este usuário (nada foi alterado)"
  ALVO=""
fi
command -v docker >/dev/null 2>&1 || falhar "'docker' não encontrado no PATH"

# cli_avulsa ARGS...: contêiner avulso do core, sem dependências (não sobe o web)
cli_avulsa() {
  compose run --rm --no-deps -T "$@"
}

# Fases (a interrupção relata a fase; só as duas primeiras são anteriores a qualquer escrita
# no banco e só nelas o sinal sobe o core de volta)
FASE_VERIFICANDO="verificando o backup"
FASE_PARANDO="parando o core"
FASE=""
ENTRADA=""
PRE_ORIGINAL=""
ANTES=""

# lista_pre_restore: nomes de pre-restore no volume (padrão fixo, sem entrada do usuário)
lista_pre_restore() {
  cli_avulsa core sh -c 'cd /dados/backups && ls -1 -- sentinela-*-pre-restore.tar.gz 2>/dev/null; true'
}

# pre_restore_novos: os pre-restore que não existiam no início (um por linha); 1 se não listou
pre_restore_novos() {
  local agora nome
  agora="$(lista_pre_restore 2>/dev/null)" || return 1
  while IFS= read -r nome; do
    nome="${nome%$'\r'}"
    nome_backup_valido "$nome" || continue
    grep -qxF -- "$nome" <<<"$ANTES" || printf '%s\n' "$nome"
  done <<<"$agora"
}

# relatar_pre_restore: fatos sobre os pre-restore desta execução (na saída de erro)
relatar_pre_restore() {
  local novos
  if ! novos="$(pre_restore_novos)"; then
    echo "Não foi possível listar /dados/backups para conferir os pre-restore desta execução." >&2
    return 0
  fi
  if [[ -z "$novos" ]]; then
    echo "Nenhum pre-restore foi criado nesta execução." >&2
    return 0
  fi
  echo "Pre-restore criados nesta execução (em /dados/backups):" >&2
  recuar <<<"$novos" >&2
}

# recuar: copia a entrada com dois espaços no início de cada linha
recuar() {
  local l
  while IFS= read -r l; do printf '  %s\n' "$l"; done
}

# estado_core: o estado real do contêiner do core, consultado agora
# shellcheck disable=SC2329  # chamada pelo trap de interrupção
estado_core() {
  local estado
  if ! estado="$(compose ps -a --format '{{.Service}}: {{.Status}}' core 2>/dev/null)"; then
    # compose antigo sem --format de modelo
    estado="$(compose ps -a core 2>/dev/null)" || estado="(não foi possível consultar; use: docker compose ps core)"
  fi
  [[ -n "$estado" ]] || estado="core: sem contêiner"
  recuar <<<"$estado"
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
  {
    echo
    echo "Interrompido durante: $FASE."
    case "$FASE" in
      "$FASE_VERIFICANDO")
        echo "Este script ainda não tinha parado o core nem escrito no banco."
        ;;
      "$FASE_PARANDO")
        echo "Este script ainda não tinha escrito no banco. Subindo o core de novo..."
        compose up -d --no-deps core >/dev/null 2>&1 ||
          echo "erro: não foi possível subir o core; suba com: docker compose up -d --no-deps core"
        ;;
      *)
        echo "Os contêineres foram deixados como estão: nada foi subido nem parado depois da interrupção."
        ;;
    esac
    echo "Estado atual do core:"
    estado_core
  } >&2
  relatar_pre_restore
  {
    if [[ -n "$PRE_ORIGINAL" ]]; then
      echo "O banco original está em /dados/backups/$PRE_ORIGINAL. Para voltar a ele: ./restore.sh --do-volume $PRE_ORIGINAL --sim"
    fi
    echo "Verifique a saúde antes de usar (docker compose ps core; docker compose logs core)."
  } >&2
  exit 130
}

if [[ $SIM -ne 1 ]]; then
  echo "Isto substitui o banco atual pelo do backup (o atual fica guardado como pre-restore)."
  echo "O arquivo será verificado antes de qualquer mudança."
  read -r -p "Digite 'sim' para continuar: " resp || resp=""
  [[ "$resp" == "sim" ]] || falhar "cancelado; nada foi alterado"
fi

# A trava vem antes de qualquer escrita (inclusive a cópia de trabalho no volume)
FASE="$FASE_VERIFICANDO"
trava_adquirir
trap finalizar EXIT
trap interrompido INT TERM HUP

# Os pre-restore que já existem: o relatório só cita os criados por esta execução
ANTES="$(lista_pre_restore)" ||
  falhar "não foi possível listar /dados/backups (nada foi alterado)"

# Cópias de trabalho de execuções que morreram (SIGKILL, queda de energia) guardam um banco
# de cliente: varre com padrão fixo, sem nenhuma entrada do usuário.
cli_avulsa core sh -c 'rm -f /dados/backups/.entrada-*' ||
  falhar "não foi possível varrer cópias temporárias antigas do volume (nada foi alterado)"

if [[ -z "$ALVO" ]]; then
  # O volume pertence a outro usuário (10001): um arquivo 0600 do host não seria legível por
  # bind mount. Por isso ele entra no volume pela entrada padrão de um contêiner avulso.
  ENTRADA="/dados/backups/.entrada-$(date +%Y%m%dT%H%M%S)-$$.tar.gz"
  echo "Enviando o backup ao volume..."
  # shellcheck disable=SC2016  # o $1 é expandido pelo sh do contêiner, de propósito
  cli_avulsa core sh -c 'umask 077; cat > "$1"' sh "$ENTRADA" <"$ARQUIVO" ||
    falhar "não foi possível copiar o backup para o volume (nada foi alterado)"
  ALVO="$ENTRADA"
fi

echo "Verificando o backup..."
cli_avulsa core python -m sentinela.cli backup-verificar "$ALVO" ||
  falhar "backup inválido, ausente ou de versão mais nova; o core não foi parado e nada foi alterado"

FASE="$FASE_PARANDO"
echo "Parando só o serviço core..."
if ! compose stop core; then
  echo "erro: não foi possível parar o core; tentando subi-lo de novo..." >&2
  compose up -d --no-deps core >/dev/null 2>&1 || true
  falhar "não foi possível parar o core (nada foi alterado)"
fi

FASE="restaurando o backup"
echo "Restaurando..."
if ! PRE="$(cli_avulsa core python -m sentinela.cli restaurar "$ALVO")"; then
  echo "erro: a restauração falhou (veja a mensagem acima)." >&2
  relatar_pre_restore
  [[ $SEM_SUBIR -eq 0 ]] || falhar "a restauração não foi concluída; o core foi deixado parado (--sem-subir)"
  FASE="subindo o core após a falha da restauração"
  echo "Subindo o core de novo e esperando a saúde..." >&2
  if compose up -d --no-deps --wait --wait-timeout 120 core; then
    falhar "a restauração não foi concluída; o core subiu e respondeu saudável. Confira os dados antes de usar."
  fi
  falhar "a restauração não foi concluída e o core não ficou saudável; veja 'docker compose logs core'"
fi
PRE="$(printf '%s\n' "$PRE" | head -n 1)"
PRE="${PRE%$'\r'}"
# só um backup de nome estrito em /dados/backups pode ser devolvido (e citado como original)
if nome_backup_valido "$PRE"; then
  PRE_ORIGINAL="$PRE"
fi

if [[ $SEM_SUBIR -eq 1 ]]; then
  echo "Banco restaurado; o core foi deixado parado (--sem-subir): quem chamou sobe o serviço."
  [[ -z "$PRE" ]] || echo "O banco anterior ficou guardado como: $PRE (em /dados/backups)"
  exit 0
fi

FASE="subindo o core com o banco restaurado"
echo "Subindo o core e esperando a saúde..."
if compose up -d --no-deps --wait --wait-timeout 120 core; then
  echo "Restauração concluída; o core está saudável."
  [[ -z "$PRE" ]] || echo "O banco anterior ficou guardado como: $PRE (em /dados/backups)"
  echo "aviso: $AVISO_ENV"
  exit 0
fi

echo "erro: o core não ficou saudável com o banco restaurado." >&2
if [[ -z "$PRE_ORIGINAL" ]]; then
  [[ -n "$PRE" ]] ||
    falhar "não havia banco anterior para devolver; verifique 'docker compose logs core'"
  falhar "o banco anterior não virou um backup em /dados/backups (o core o guardou como '$PRE'); não há volta automática. Verifique 'docker compose logs core'"
fi
FASE="devolvendo o banco original"
echo "Devolvendo o banco original ($PRE_ORIGINAL)..." >&2
if compose stop core &&
  cli_avulsa core python -m sentinela.cli restaurar "/dados/backups/$PRE_ORIGINAL" >/dev/null; then
  FASE="subindo o core com o banco original devolvido"
  if compose up -d --no-deps --wait --wait-timeout 120 core; then
    falhar "a restauração foi desfeita: o banco original está de volta e o core saudável"
  fi
  falhar "o banco original foi devolvido, mas o core não ficou saudável; veja 'docker compose logs core'. O original continua em /dados/backups/$PRE_ORIGINAL"
fi
falhar "não foi possível devolver o banco original automaticamente; ele está em /dados/backups/$PRE_ORIGINAL. Para tentar de novo: ./restore.sh --do-volume $PRE_ORIGINAL --sim"
