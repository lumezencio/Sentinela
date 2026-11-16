#!/usr/bin/env bash
# Instalador do Sentinela.
#
#   ./install.sh          instalação real (banco no volume sentinela_dados)
#   ./install.sh --demo   demonstração com 300 equipamentos simulados (volume próprio)
#
# Gera .env (só se não existir; nunca sobrescreve), uma CA local e o certificado do
# host em certs/, sobe o compose e imprime a URL e o caminho da CA para instalar nos
# dispositivos. Variáveis opcionais: SENTINELA_PORTA_HTTPS, SENTINELA_PORTA_HTTP (gravadas
# no .env na criação) e SENTINELA_IPS (IPs extras para o certificado, separados por espaço).
set -euo pipefail

# Git Bash no Windows: não converter "/CN=..." do openssl em caminho
export MSYS_NO_PATHCONV=1

RAIZ="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$RAIZ"

DEMO=0
for arg in "$@"; do
  case "$arg" in
    --demo) DEMO=1 ;;
    -h | --help)
      sed -n '2,11p' "$0" | sed 's/^# \{0,1\}//'
      exit 0
      ;;
    *)
      echo "opção desconhecida: $arg (use --demo ou --help)" >&2
      exit 2
      ;;
  esac
done

COMPOSE=(docker compose -f docker-compose.yml)
if [[ $DEMO -eq 1 ]]; then
  COMPOSE+=(-f docker-compose.demo.yml)
fi

falhar() {
  echo "erro: $*" >&2
  exit 1
}

for cmd in docker openssl; do
  command -v "$cmd" >/dev/null 2>&1 || falhar "'$cmd' não encontrado no PATH"
done
docker compose version >/dev/null 2>&1 || falhar "plugin 'docker compose' não encontrado"
docker info >/dev/null 2>&1 || falhar "o Docker não está rodando"

# versão_ok ATUAL MINIMA: compara "X.Y.Z" numericamente (sem sort -V, que falta no macOS)
versao_ok() {
  local atual="${1#v}" minima="$2" i a m
  atual="${atual%%[-+]*}"
  IFS=. read -r -a A <<<"$atual"
  IFS=. read -r -a M <<<"$minima"
  for i in 0 1 2; do
    a="${A[i]:-0}"
    m="${M[i]:-0}"
    [[ "$a" =~ ^[0-9]+$ ]] || return 1
    ((10#$a > 10#$m)) && return 0
    ((10#$a < 10#$m)) && return 1
  done
  return 0
}
# Engine 25+: healthcheck start_interval; Compose 2.24.4+: tag !override e env_file com required
MIN_ENGINE="25.0.0"
MIN_COMPOSE="2.24.4"
V_ENGINE="$(docker version --format '{{.Server.Version}}' 2>/dev/null || true)"
V_COMPOSE="$(docker compose version --short 2>/dev/null || true)"
versao_ok "$V_ENGINE" "$MIN_ENGINE" ||
  falhar "Docker Engine ${V_ENGINE:-desconhecido} é antigo demais; o Sentinela exige $MIN_ENGINE ou mais novo"
versao_ok "$V_COMPOSE" "$MIN_COMPOSE" ||
  falhar "Docker Compose ${V_COMPOSE:-desconhecido} é antigo demais; o Sentinela exige $MIN_COMPOSE ou mais novo"

# ---------------------------------------------------------------- .env
criar_env() {
  [[ -f .env.example ]] || falhar ".env.example não encontrado"
  local chave tmp
  chave="$(openssl rand -hex 32)"
  tmp="$(mktemp .env.XXXXXX)"
  # se algo falhar no meio, não sobra um .env.XXXXXX com a chave
  trap 'rm -f "$tmp"' EXIT
  chmod 600 "$tmp"
  while IFS= read -r linha || [[ -n "$linha" ]]; do
    case "$linha" in
      SENTINELA_CHAVE_SESSAO=*) linha="SENTINELA_CHAVE_SESSAO=$chave" ;;
      SENTINELA_PORTA_HTTPS=*) linha="SENTINELA_PORTA_HTTPS=${SENTINELA_PORTA_HTTPS:-443}" ;;
      SENTINELA_PORTA_HTTP=*) linha="SENTINELA_PORTA_HTTP=${SENTINELA_PORTA_HTTP:-80}" ;;
    esac
    printf '%s\n' "$linha"
  done <.env.example >"$tmp"
  mv "$tmp" .env
  trap - EXIT
  echo "[ok] .env criado com uma chave de sessão nova"
}

if [[ -f .env ]]; then
  echo "[=] .env já existe: mantido como está"
else
  criar_env
fi
chmod 600 .env

# valor efetivo de uma variável: ambiente do shell > .env > padrão
valor_env() {
  local nome="$1" padrao="$2" v
  if [[ -n "${!nome:-}" ]]; then
    printf '%s' "${!nome}"
    return
  fi
  v="$(grep -E "^${nome}=" .env | tail -n 1 | cut -d= -f2- || true)"
  printf '%s' "${v:-$padrao}"
}
PORTA_HTTPS="$(valor_env SENTINELA_PORTA_HTTPS 443)"
grep -qE '^SENTINELA_CHAVE_SESSAO=.+' .env || falhar "SENTINELA_CHAVE_SESSAO vazia no .env"

# ---------------------------------------------------------------- certificados
ip_valido() {
  [[ "$1" =~ ^([0-9]{1,3})\.([0-9]{1,3})\.([0-9]{1,3})\.([0-9]{1,3})$ ]] || return 1
  local o
  for o in "${BASH_REMATCH[@]:1}"; do ((10#$o <= 255)) || return 1; done
}

# IPv4 do host na LAN, melhor esforço (Linux, macOS, Windows/Git Bash)
detectar_ips() {
  {
    case "$(uname -s)" in
      Linux)
        if command -v ip >/dev/null 2>&1; then
          ip -4 -o addr show scope global 2>/dev/null | awk '{split($4, a, "/"); print a[1]}'
        else
          hostname -I 2>/dev/null | tr ' ' '\n'
        fi
        ;;
      Darwin)
        ifconfig 2>/dev/null | awk '/inet / {print $2}'
        ;;
      MINGW* | MSYS* | CYGWIN*)
        # saída em código de página do Windows: LC_ALL=C para grep/sed não tropeçarem em acentos
        ipconfig 2>/dev/null | LC_ALL=C tr -d '\r' | LC_ALL=C grep -aiE 'IPv4' |
          LC_ALL=C sed -E 's/.*: *([0-9.]+).*/\1/'
        ;;
    esac
  } | while read -r ip; do
    # só endereços privados (RFC 1918), fora as redes do Docker usadas aqui;
    # loopback já entra fixo no certificado
    case "$ip" in
      172.17.* | 172.31.250.*) continue ;;
      10.* | 192.168.* | 172.1[6-9].* | 172.2[0-9].* | 172.3[01].*) ;;
      *) continue ;;
    esac
    if ip_valido "$ip"; then echo "$ip"; fi
  done | sort -u || true
  # extras pedidos explicitamente (ex.: IP público de uma VPN), sem filtro de faixa
  for extra in ${SENTINELA_IPS:-}; do
    if ip_valido "$extra"; then echo "$extra"; fi
  done
}

# lê a saída de detectar_ips num array (sem mapfile: bash 3.2 do macOS)
ler_ips() {
  IPS=()
  local ip
  while read -r ip; do
    [[ -n "$ip" ]] && IPS+=("$ip")
  done < <(detectar_ips)
}

# caminhos relativos a $RAIZ: com MSYS_NO_PATHCONV o openssl nativo do Git Bash não
# entenderia "/c/..." absoluto
CERTS="certs"
CA_DIR="$CERTS/ca"
WEB_DIR="$CERTS/web"
CA_CRT="$CA_DIR/sentinela-ca.crt"
CA_KEY="$CA_DIR/sentinela-ca.key"
SRV_CRT="$WEB_DIR/servidor.crt"
SRV_KEY="$WEB_DIR/servidor.key"

mkdir -p "$CA_DIR" "$WEB_DIR"
chmod 755 "$CERTS" "$WEB_DIR" # o nginx (uid 101) atravessa certs/web montado no container
chmod 700 "$CA_DIR"           # a chave da CA nunca sai do host nem entra em container

if [[ -f "$CA_CRT" && -f "$CA_KEY" ]]; then
  echo "[=] CA local já existe: mantida"
else
  (
    umask 077
    openssl req -x509 -new -newkey ec -pkeyopt ec_paramgen_curve:prime256v1 -nodes \
      -keyout "$CA_KEY" -out "$CA_CRT" -days 3650 -sha256 \
      -subj "/O=Sentinela/CN=Sentinela CA local" \
      -addext "basicConstraints=critical,CA:TRUE,pathlen:0" \
      -addext "keyUsage=critical,keyCertSign,cRLSign" \
      -addext "subjectKeyIdentifier=hash" 2>/dev/null
  )
  chmod 644 "$CA_CRT"
  echo "[ok] CA local criada (validade 10 anos)"
fi

CERT_NOVO=0
if [[ -f "$SRV_CRT" && -f "$SRV_KEY" ]]; then
  echo "[=] certificado do host já existe: mantido (apague certs/web/ para gerar outro)"
else
  ler_ips
  SAN="DNS:localhost,IP:127.0.0.1"
  for ip in ${IPS[@]+"${IPS[@]}"}; do SAN+=",IP:$ip"; done
  EXT="$(mktemp "$WEB_DIR/.ext.XXXXXX")"
  CSR="$(mktemp "$WEB_DIR/.csr.XXXXXX")"
  trap 'rm -f "$EXT" "$CSR"' EXIT
  cat >"$EXT" <<EOF
basicConstraints=critical,CA:FALSE
keyUsage=critical,digitalSignature
extendedKeyUsage=serverAuth
subjectAltName=$SAN
authorityKeyIdentifier=keyid
subjectKeyIdentifier=hash
EOF
  (
    umask 077
    openssl req -new -newkey ec -pkeyopt ec_paramgen_curve:prime256v1 -nodes \
      -keyout "$SRV_KEY" -out "$CSR" -subj "/O=Sentinela/CN=sentinela" 2>/dev/null
  )
  openssl x509 -req -in "$CSR" -CA "$CA_CRT" -CAkey "$CA_KEY" \
    -set_serial "0x$(openssl rand -hex 16)" -days 825 -sha256 \
    -extfile "$EXT" -out "$SRV_CRT" 2>/dev/null
  chmod 644 "$SRV_CRT"
  # o nginx do container roda como uid 101: em Linux ele precisa ler a chave
  if [[ "$(id -u)" -eq 0 ]]; then
    chown 101:101 "$SRV_KEY"
    chmod 600 "$SRV_KEY"
  elif command -v setfacl >/dev/null 2>&1 && chmod 600 "$SRV_KEY" &&
    setfacl -m u:101:r "$SRV_KEY" 2>/dev/null; then
    : # 600 + ACL de leitura só para o uid 101 (o chmod vem antes: ele mexeria na máscara)
  else
    case "$(uname -s)" in
      Linux)
        # sem root nem ACL, só daria para deixar a chave legível por todos: não
        rm -f "$SRV_KEY" "$SRV_CRT"
        sugestao="sudo ./install.sh"
        if [[ $DEMO -eq 1 ]]; then sugestao+=" --demo"; fi
        falhar "não consegui restringir certs/web/servidor.key ao uid 101 do nginx (sem root e sem setfacl); rode de novo com: $sugestao"
        ;;
      *)
        # Docker Desktop (Windows/macOS): a montagem não usa as permissões Unix do host
        chmod 600 "$SRV_KEY"
        ;;
    esac
  fi
  CERT_NOVO=1
  echo "[ok] certificado do host criado (825 dias), SAN: $SAN"
fi

# ---------------------------------------------------------------- subir
echo "[..] construindo e subindo os containers (pode levar alguns minutos)"
WEB_EXISTIA="$("${COMPOSE[@]}" ps -q web 2>/dev/null || true)"
"${COMPOSE[@]}" up -d --build --wait --wait-timeout 300
if [[ $CERT_NOVO -eq 1 && -n "$WEB_EXISTIA" ]]; then
  # o nginx só lê o certificado ao iniciar
  "${COMPOSE[@]}" restart web
  "${COMPOSE[@]}" up -d --wait --wait-timeout 120
fi

# ---------------------------------------------------------------- admin da demonstração
SENHA_DEMO=""
if [[ $DEMO -eq 1 ]]; then
  SENHA_DEMO="$(openssl rand -base64 48 | tr -dc 'A-Za-z0-9' | head -c 20)"
  [[ ${#SENHA_DEMO} -eq 20 ]] || falhar "não consegui gerar a senha da demonstração"
  set +e
  # a senha vai pelo ambiente (-e NOME sem valor), não pela linha de comando do host
  saida="$(SENTINELA_ADMIN_SENHA="$SENHA_DEMO" "${COMPOSE[@]}" run --rm --no-deps -T \
    -e SENTINELA_AMBIENTE=desenvolvimento -e SENTINELA_ADMIN_SENHA \
    core python -m sentinela.cli criar-admin --login admin 2>&1)"
  codigo=$?
  set -e
  if [[ $codigo -eq 0 ]]; then
    echo "[ok] administrador 'admin' da demonstração criado"
  elif [[ $codigo -eq 1 ]] && grep -q "já existe" <<<"$saida"; then
    echo "[=] administrador 'admin' da demonstração já existe: senha mantida"
    SENHA_DEMO=""
  else
    echo "$saida" >&2
    falhar "não consegui criar o administrador da demonstração"
  fi
fi

# ---------------------------------------------------------------- resumo
ler_ips
sufixo=""
[[ "$PORTA_HTTPS" == "443" ]] || sufixo=":$PORTA_HTTPS"
echo
echo "Sentinela no ar."
echo "  URL:  https://localhost$sufixo/"
for ip in ${IPS[@]+"${IPS[@]}"}; do echo "        https://$ip$sufixo/"; done
echo "  CA para instalar nos dispositivos (confiança no certificado): $RAIZ/$CA_CRT"
if [[ $DEMO -eq 1 ]]; then
  echo "  Modo demonstração: checagens simuladas, volume sentinela_demo_dados."
  if [[ -n "$SENHA_DEMO" ]]; then
    echo "  Login: admin   Senha: $SENHA_DEMO   (mostrada só agora; guarde-a)"
  fi
else
  echo "  Crie o primeiro administrador:"
  echo "    docker compose run --rm core python -m sentinela.cli criar-admin --login <seu-login>"
fi
