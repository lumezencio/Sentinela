#!/usr/bin/env bash
# Teste REAL (docker de verdade) da volta automática do update.sh. Só roda no CI (CI=true) ou com
# SENTINELA_OP_TESTE=1 numa máquina sem o Sentinela instalado.
#
#   SENTINELA_OP_TESTE=1 bash testes-operacao/rodar.sh
#
# Cena: clona este repositório num diretório temporário, instala v0.0.1-op (imagens locais),
# cadastra uma sub-rede, e tenta atualizar para v0.0.2-op, cuja migração 0098 apaga as
# sub-redes (e confirma) e cuja migração 0099 quebra: o core nunca fica saudável. O update.sh
# tem de falhar e voltar: core saudável, a sub-rede de volta (banco do backup), a MESMA imagem
# do core de antes, o checkout em v0.0.1-op. Depois, um restore.sh com .tar.gz truncado tem de
# ser recusado sem parar o core.
#
# Recusa rodar se existir qualquer contêiner, volume ou imagem do Sentinela (projeto "sentinela"):
# o teste usa esses nomes e a limpeza final remove o que existe sob eles.
set -euo pipefail
export MSYS_NO_PATHCONV=1

AQUI="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO="$(cd "$AQUI/.." && pwd)"

if [[ "${CI:-}" != "true" && "${SENTINELA_OP_TESTE:-}" != "1" ]]; then
  echo "recusado: este teste usa docker de verdade. Rode no CI ou com SENTINELA_OP_TESTE=1 numa máquina sem o Sentinela." >&2
  exit 2
fi
if [[ -n "$(docker ps -a -q --filter label=com.docker.compose.project=sentinela)" ]]; then
  echo "recusado: já existe contêiner do projeto compose 'sentinela' nesta máquina." >&2
  exit 2
fi
if docker volume ls -q | grep -qE '^sentinela_(dados|demo_dados)$'; then
  echo "recusado: já existe volume de dados do Sentinela nesta máquina." >&2
  exit 2
fi
if docker image ls --format '{{.Repository}}' | grep -qE '^ghcr\.io/lumezencio/sentinela-(core|web)$'; then
  echo "recusado: já existem imagens ghcr.io/lumezencio/sentinela-* nesta máquina (o teste as marca e apaga)." >&2
  exit 2
fi

TMP="$(mktemp -d)"
CLONE="$TMP/sentinela"
export SENTINELA_PORTA_HTTPS="${SENTINELA_PORTA_HTTPS:-18443}"
export SENTINELA_PORTA_HTTP="${SENTINELA_PORTA_HTTP:-18080}"

limpar() {
  local rc=$?
  trap - EXIT
  if [[ -d "$CLONE" ]]; then
    # o projeto 'sentinela' desta cena é só nosso (conferido acima); limpeza só aqui, nunca no update.sh
    (cd "$CLONE" && docker compose down -v --remove-orphans >/dev/null 2>&1) || true
  fi
  docker image ls --format '{{.Repository}}:{{.Tag}}' |
    grep -E '^ghcr\.io/lumezencio/sentinela-(core|web):(latest|pre_[0-9]{8}T[0-9]{6}Z)$' |
    while IFS= read -r ref; do docker rmi "$ref" >/dev/null 2>&1 || true; done
  rm -rf "$TMP"
  exit "$rc"
}
trap limpar EXIT

falha() {
  echo "FALHA: $*" >&2
  exit 1
}
passo() { echo "== $*"; }

dc() { (cd "$CLONE" && docker compose "$@"); }

passo "clonando e criando as tags de teste"
git clone -q "$REPO" "$CLONE"
cd "$CLONE"
git config user.name teste
git config user.email teste@exemplo.invalid
git checkout -q -b teste-op
git tag v0.0.1-op
cp "$REPO/testes-operacao/falha/0098_apaga_subredes.py" "$REPO/testes-operacao/falha/0099_quebra.py" core/alembic/versions/
git add core/alembic/versions
git commit -q -m "candidata que quebra"
git tag v0.0.2-op
git checkout -q -B teste-op v0.0.1-op # o ramo volta à instalação anterior; a candidata fica só na tag

passo "instalando v0.0.1-op (imagens locais)"
bash install.sh >/dev/null
dc exec -T core python -m sentinela.cli sub-rede adicionar 10.99.0.0/24 >/dev/null
[[ "$(dc exec -T core python -m sentinela.cli sub-rede listar | tr -d '\r')" == "10.99.0.0/24" ]] ||
  falha "a sub-rede de teste não foi cadastrada"
ID_ANTES="$(docker image inspect --format '{{.Id}}' ghcr.io/lumezencio/sentinela-core:latest)"
INICIO_CORE_ANTES="$(docker inspect --format '{{.State.StartedAt}}' "$(dc ps -q core)")"

passo "update.sh v0.0.2-op (tem de falhar e voltar)"
if bash update.sh v0.0.2-op >"$TMP/update.log" 2>&1; then
  cat "$TMP/update.log"
  falha "update.sh deveria sair com código diferente de 0"
fi
tail -n 40 "$TMP/update.log"
grep -q "Volta concluída" "$TMP/update.log" || falha "o update.sh não confirmou a volta"

passo "conferindo o estado depois da volta"
dc exec -T core python -c "import urllib.request,sys;sys.exit(0 if urllib.request.urlopen('http://127.0.0.1:8000/api/v1/saude',timeout=3).status==200 else 1)" ||
  falha "o core não está saudável depois da volta"
[[ "$(dc exec -T core python -m sentinela.cli sub-rede listar | tr -d '\r')" == "10.99.0.0/24" ]] ||
  falha "a sub-rede não voltou: o banco não foi restaurado"
ID_DEPOIS="$(docker image inspect --format '{{.Id}}' ghcr.io/lumezencio/sentinela-core:latest)"
[[ "$ID_DEPOIS" == "$ID_ANTES" ]] || falha "a imagem do core não é a mesma de antes"
[[ "$(docker inspect --format '{{.Image}}' "$(dc ps -q core)")" == "$ID_ANTES" ]] ||
  falha "o contêiner do core não roda a imagem anterior"
[[ "$(git describe --tags --exact-match)" == "v0.0.1-op" ]] || falha "o checkout não voltou para v0.0.1-op"
[[ -z "$(git status --porcelain --untracked-files=no)" ]] || falha "a árvore git não está limpa"
# a migração 0098 de fato rodou e confirmou (senão a volta do banco não provaria nada):
# o pre-restore guarda o banco quebrado, sem sub-redes
PRE="$(dc exec -T core sh -c 'ls -1 /dados/backups | grep pre-restore | sort | tail -n 1' | tr -d '\r')"
[[ -n "$PRE" ]] || falha "não achei o pre-restore (o banco quebrado) em /dados/backups"
dc exec -T core python -c "
import sqlite3, sys, tarfile, tempfile
with tarfile.open('/dados/backups/$PRE') as t, tempfile.TemporaryDirectory() as d:
    m = [x for x in t.getmembers() if x.name.endswith('.db')][0]
    t.extract(m, d)
    c = sqlite3.connect(d + '/' + m.name)
    n = c.execute('select count(*) from sub_rede').fetchone()[0]
    sys.exit(0 if n == 0 else 1)
" || falha "o banco quebrado deveria ter 0 sub-redes (a 0098 não rodou?)"

passo "restore.sh com backup truncado (tem de ser recusado sem parar o core)"
NOME="$(dc exec -T core python -m sentinela.cli backup-criar | tail -n 1 | tr -d '\r')"
dc exec -T core cat "/dados/backups/$NOME" >"$TMP/inteiro.tar.gz"
TAM="$(wc -c <"$TMP/inteiro.tar.gz")"
head -c $((TAM / 2)) "$TMP/inteiro.tar.gz" >"$TMP/truncado.tar.gz"
INICIO_ANTES_RESTORE="$(docker inspect --format '{{.State.StartedAt}}' "$(dc ps -q core)")"
if bash restore.sh "$TMP/truncado.tar.gz" --sim >"$TMP/restore.log" 2>&1; then
  falha "restore.sh aceitou um backup truncado"
fi
[[ "$(docker inspect --format '{{.State.StartedAt}}' "$(dc ps -q core)")" == "$INICIO_ANTES_RESTORE" ]] ||
  falha "o core foi reiniciado pelo restore.sh recusado"
[[ "$(docker inspect --format '{{.State.Running}}' "$(dc ps -q core)")" == "true" ]] || falha "o core parou"
[[ "$(dc exec -T core python -m sentinela.cli sub-rede listar | tr -d '\r')" == "10.99.0.0/24" ]] ||
  falha "o banco mudou depois do restore recusado"

: "$INICIO_CORE_ANTES"
echo "OK: volta automática provada com docker de verdade (imagem, banco e checkout)."
