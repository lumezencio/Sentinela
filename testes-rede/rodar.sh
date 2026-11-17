#!/usr/bin/env bash
# Prova de zero broadcast: sobe a rede de captura, roda a cena, para tudo e analisa o pcap.
# Uso: testes-rede/rodar.sh   (Linux ou Docker Desktop; precisa de docker compose e openssl)
# Só mexe no projeto "sentinela-captura"; a instalação real (projeto "sentinela") fica intocada.
set -euo pipefail

cd "$(dirname "$0")"
P=(docker compose -p sentinela-captura -f compose.captura.yml)
PY="${PYTHON:-}"
if [[ -z "$PY" ]]; then
  for candidato in python3 python; do # no Windows, "python3" pode ser só o atalho da loja
    if "$candidato" -c "import sys" >/dev/null 2>&1; then PY="$candidato" && break; fi
  done
fi
[[ -n "$PY" ]] || { echo "[x] Python 3 não encontrado (defina PYTHON)" >&2; exit 2; }

limpar() { "${P[@]}" --profile cena down --remove-orphans >/dev/null 2>&1 || true; }
trap limpar EXIT

rm -rf saida
mkdir saida
chmod 777 saida # tcpdump (root) e a cena (uid 10001) escrevem aqui

# segredos descartáveis desta execução: só no ambiente, nunca impressos nem gravados
SENTINELA_CHAVE_SESSAO="$(openssl rand -hex 32)"
SENTINELA_CHAVE_CREDENCIAIS="$(openssl rand -hex 32)"
SENTINELA_CENA_SENHA="$(openssl rand -base64 48 | tr -dc 'A-Za-z0-9' | head -c 24)"
SENTINELA_ADMIN_SENHA="$SENTINELA_CENA_SENHA"
export SENTINELA_CHAVE_SESSAO SENTINELA_CHAVE_CREDENCIAIS SENTINELA_CENA_SENHA SENTINELA_ADMIN_SENHA

echo "[..] construindo e subindo captura, núcleo e simuladores"
"${P[@]}" up -d --build --wait --wait-timeout 300 captura core sim-routeros sim-snmp sim-gravador

echo "[..] criando o admin da cena"
"${P[@]}" exec -T -e SENTINELA_AMBIENTE=desenvolvimento -e SENTINELA_ADMIN_SENHA \
  core python -m sentinela.cli criar-admin --login admin

echo "[..] cena"
codigo_cena=0
"${P[@]}" run --rm -T cena || codigo_cena=$?

echo "[..] parando (o tcpdump fecha o pcap por último)"
"${P[@]}" stop core sim-routeros sim-snmp sim-gravador
"${P[@]}" stop captura
"${P[@]}" logs --no-color core >saida/core.log 2>&1 || true

if [[ $codigo_cena -ne 0 ]]; then
  echo "[x] a cena falhou (código $codigo_cena); log do núcleo em testes-rede/saida/core.log" >&2
  exit "$codigo_cena"
fi

echo "[..] analisando a captura"
"$PY" analisar_captura.py saida/captura.pcap \
  --origem 10.99.250.10 --origem 02:00:00:fa:00:10 \
  --arp-permitido "$(cat saida/arp_permitido.txt)" \
  --rede 10.99.250.0/24 \
  --exigir-contato "$(cat saida/contato_exigido.txt)"
