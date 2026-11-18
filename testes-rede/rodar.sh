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

# CA descartável e certificado de api.telegram.org para o Telegram falso (só esta execução)
mkdir saida/certs-teste
(
  cd saida/certs-teste
  export MSYS_NO_PATHCONV=1 # Git Bash: não converter "/CN=..." em caminho do Windows
  openssl req -x509 -newkey ec -pkeyopt ec_paramgen_curve:prime256v1 -nodes -days 2 \
    -keyout ca.key -out ca.pem -subj "/CN=CA descartavel da captura" \
    -addext "basicConstraints=critical,CA:TRUE" -addext "keyUsage=critical,keyCertSign,cRLSign" \
    2>/dev/null
  openssl req -newkey ec -pkeyopt ec_paramgen_curve:prime256v1 -nodes \
    -keyout telegram.key -out telegram.csr -subj "/CN=api.telegram.org" 2>/dev/null
  printf '%s\n' "basicConstraints=CA:FALSE" "keyUsage=digitalSignature" \
    "extendedKeyUsage=serverAuth" "subjectAltName=DNS:api.telegram.org" \
    "subjectKeyIdentifier=hash" "authorityKeyIdentifier=keyid" >telegram.ext
  openssl x509 -req -in telegram.csr -CA ca.pem -CAkey ca.key -CAcreateserial -days 2 \
    -extfile telegram.ext -out telegram.pem 2>/dev/null
  rm -f telegram.csr telegram.ext ca.srl ca.key # a chave da CA não sobrevive à assinatura
  chmod 755 . && chmod 644 ca.pem telegram.pem telegram.key
)

# segredos descartáveis desta execução: só no ambiente, nunca impressos nem gravados
SENTINELA_CHAVE_SESSAO="$(openssl rand -hex 32)"
SENTINELA_CHAVE_CREDENCIAIS="$(openssl rand -hex 32)"
SENTINELA_CENA_SENHA="$(openssl rand -base64 48 | tr -dc 'A-Za-z0-9' | head -c 24)"
SENTINELA_ADMIN_SENHA="$SENTINELA_CENA_SENHA"
export SENTINELA_CHAVE_SESSAO SENTINELA_CHAVE_CREDENCIAIS SENTINELA_CENA_SENHA SENTINELA_ADMIN_SENHA

echo "[..] construindo e subindo captura, núcleo e simuladores"
"${P[@]}" up -d --build --wait --wait-timeout 300 captura core sim-routeros sim-snmp sim-gravador sim-telegram

echo "[..] criando o admin da cena"
"${P[@]}" exec -T -e SENTINELA_AMBIENTE=desenvolvimento -e SENTINELA_ADMIN_SENHA \
  core python -m sentinela.cli criar-admin --login admin

echo "[..] cena"
codigo_cena=0
"${P[@]}" run --rm -T cena || codigo_cena=$?

echo "[..] parando (o tcpdump fecha o pcap por último)"
"${P[@]}" stop core sim-routeros sim-snmp sim-gravador sim-telegram
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
  --rede 10.99.250.0/24,10.99.250.0/27,10.99.250.32/28,10.99.250.48/29 \
  --exigir-contato "$(cat saida/contato_exigido.txt)" \
  --unicast-permitido "$(cat saida/unicast_permitido.txt)"
