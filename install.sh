#!/usr/bin/env bash
# Instalador do Sentinela.
#
#   ./install.sh          instalação real (banco no volume sentinela_dados)
#   ./install.sh --demo   demonstração com 300 equipamentos simulados (volume próprio)
#   ./install.sh --build  constrói as imagens neste computador em vez de baixar as publicadas
#                         (grava IMAGENS=locais no .env)
#
# Por padrão baixa e verifica (cosign, ou digests.txt do release) as imagens publicadas no ghcr.io
# (amd64 e arm64). Raspberry Pi OS de 32 bits (armv7) não é suportado. Gera .env (só se não existir; nunca sobrescreve), uma CA local e o certificado do
# host em certs/, sobe o compose e imprime a URL e o caminho da CA para instalar nos
# dispositivos. Variáveis opcionais: SENTINELA_PORTA_HTTPS, SENTINELA_PORTA_HTTP (gravadas
# no .env na criação), SENTINELA_IPS (IPs extras para o certificado, separados por espaço)
# e SENTINELA_NOMES (nomes DNS extras para o certificado, separados por vírgula).
set -euo pipefail

# Git Bash no Windows: não converter "/CN=..." do openssl em caminho
export MSYS_NO_PATHCONV=1

RAIZ="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$RAIZ"

DEMO=0
BUILD=0
for arg in "$@"; do
  case "$arg" in
    --demo) DEMO=1 ;;
    --build) BUILD=1 ;;
    -h | --help)
      awk 'NR > 1 && /^#/ { sub(/^# ?/, ""); print; next } NR > 1 { exit }' "$0"
      exit 0
      ;;
    *)
      echo "opção desconhecida: $arg (use --demo, --build ou --help)" >&2
      exit 2
      ;;
  esac
done

# shellcheck source=scripts/operacao-comum.sh
source "$RAIZ/scripts/operacao-comum.sh"

COMPOSE=(docker compose -f docker-compose.yml)
if [[ $DEMO -eq 1 ]]; then
  COMPOSE+=(-f docker-compose.demo.yml)
fi

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

# ---------------------------------------------------------------- arquitetura e imagens
# detectar_arquitetura: amd64 | arm64 | outra (exige --build). 32 bits (armv6/armv7) é recusado.
detectar_arquitetura() {
  local srv maq a
  srv="$(docker version --format '{{.Server.Arch}}' 2>/dev/null | tr -d '\r' || true)"
  maq="$(uname -m 2>/dev/null || true)"
  for a in "$srv" "$maq"; do
    case "$a" in
      arm | armv6l | armv7l | armhf)
        falhar "Raspberry Pi OS de 32 bits (armv7) não é suportado: instale o Raspberry Pi OS de 64 bits."
        ;;
    esac
  done
  for a in "$srv" "$maq"; do
    case "$a" in
      amd64 | x86_64) ARQUITETURA=amd64; return 0 ;;
      arm64 | aarch64) ARQUITETURA=arm64; return 0 ;;
    esac
  done
  ARQUITETURA="${srv:-${maq:-desconhecida}}"
}

# versao_pretendida: "version" do core/pyproject.toml (a versão que este código instala)
versao_pretendida() {
  local v
  v="$(sed -n 's/^version[[:space:]]*=[[:space:]]*"\([^"]*\)".*/\1/p' core/pyproject.toml 2>/dev/null | head -n 1 | tr -d '\r' || true)"
  [[ "$v" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]] || falhar "não consegui ler a versão (X.Y.Z) de core/pyproject.toml"
  printf '%s\n' "$v"
}

ARQUITETURA=""
detectar_arquitetura
if [[ "$ARQUITETURA" != amd64 && "$ARQUITETURA" != arm64 && $BUILD -eq 0 ]]; then
  falhar "arquitetura '$ARQUITETURA' sem imagem publicada (só amd64 e arm64); use ./install.sh --build"
fi

# modo: --build força locais; .env existente decide (sem IMAGENS = instalação das Fases 1-3 = locais);
# instalação nova usa as publicadas. Nada é criado antes de a arquitetura e a verificação passarem.
ENV_ANTIGO_SEM_IMAGENS=0
if [[ $BUILD -eq 1 ]]; then
  MODO=locais
elif [[ -f .env ]]; then
  MODO="$(valor_env IMAGENS "")"
  case "$MODO" in
    publicadas | locais) ;;
    "")
      MODO=locais
      ENV_ANTIGO_SEM_IMAGENS=1
      ;;
    *) falhar "IMAGENS no .env deve ser 'publicadas' ou 'locais' (achei '$MODO')" ;;
  esac
else
  MODO=publicadas
fi

VERSAO_ALVO=""
if [[ "$MODO" == publicadas ]]; then
  VERSAO_ALVO="$(valor_env VERSAO "")"
  [[ -n "$VERSAO_ALVO" ]] || VERSAO_ALVO="$(versao_pretendida)"
  [[ "$VERSAO_ALVO" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]] || falhar "VERSAO no .env deve ser X.Y.Z (achei '$VERSAO_ALVO')"
  TAG_ALVO="v$VERSAO_ALVO"
  # Uso interno do release.yml: SENTINELA_CANDIDATA_CORE/WEB = digest (sha256:...) de uma candidata ainda
  # sem assinatura; a imagem é baixada por esse digest exato e conferida por ele (sem cosign).
  CANDIDATA=0
  if [[ -n "${SENTINELA_CANDIDATA_CORE:-}${SENTINELA_CANDIDATA_WEB:-}" ]]; then
    [[ "${SENTINELA_CANDIDATA_CORE:-}" =~ ^sha256:[0-9a-f]{64}$ && "${SENTINELA_CANDIDATA_WEB:-}" =~ ^sha256:[0-9a-f]{64}$ ]] ||
      falhar "SENTINELA_CANDIDATA_CORE e SENTINELA_CANDIDATA_WEB devem ser digests sha256:<64 hex>"
    CANDIDATA=1
  else
    obter_digests_sem_cosign
  fi
fi

# ---------------------------------------------------------------- .env
criar_env() {
  [[ -f .env.example ]] || falhar ".env.example não encontrado"
  local chave chave_cred tmp
  chave="$(openssl rand -hex 32)"
  chave_cred="$(openssl rand -hex 32)"
  tmp="$(mktemp .env.XXXXXX)"
  # se algo falhar no meio, não sobra um .env.XXXXXX com a chave
  trap 'rm -f "$tmp"' EXIT
  chmod 600 "$tmp"
  while IFS= read -r linha || [[ -n "$linha" ]]; do
    case "$linha" in
      SENTINELA_CHAVE_SESSAO=*) linha="SENTINELA_CHAVE_SESSAO=$chave" ;;
      SENTINELA_CHAVE_CREDENCIAIS=*) linha="SENTINELA_CHAVE_CREDENCIAIS=$chave_cred" ;;
      SENTINELA_PORTA_HTTPS=*) linha="SENTINELA_PORTA_HTTPS=${SENTINELA_PORTA_HTTPS:-443}" ;;
      SENTINELA_PORTA_HTTP=*) linha="SENTINELA_PORTA_HTTP=${SENTINELA_PORTA_HTTP:-80}" ;;
      IMAGENS=*) linha="IMAGENS=$MODO" ;;
      VERSAO=*) linha="VERSAO=$VERSAO_ALVO" ;;
    esac
    printf '%s\n' "$linha"
  done <.env.example >"$tmp"
  mv "$tmp" .env
  trap - EXIT
  echo "[ok] .env criado com uma chave de sessão e uma de credenciais novas"
}

# Garante SENTINELA_CHAVE_CREDENCIAIS num .env já existente (instalações anteriores à
# descoberta automática): só gera se ausente ou vazia; nunca troca uma chave existente
# (trocá-la tornaria ilegíveis as credenciais já cifradas).
garantir_chave_credenciais() {
  grep -qE '^SENTINELA_CHAVE_CREDENCIAIS=.+' .env && return 0
  local chave tmp
  chave="$(openssl rand -hex 32)"
  tmp="$(mktemp .env.XXXXXX)"
  trap 'rm -f "$tmp"' EXIT
  chmod 600 "$tmp"
  {
    grep -vE '^SENTINELA_CHAVE_CREDENCIAIS=' .env || true
    printf 'SENTINELA_CHAVE_CREDENCIAIS=%s\n' "$chave"
  } >"$tmp"
  mv "$tmp" .env
  trap - EXIT
  echo "[ok] SENTINELA_CHAVE_CREDENCIAIS gerada no .env (cifra as credenciais das fontes)"
}

if [[ -f .env ]]; then
  echo "[=] .env já existe: mantido como está"
else
  criar_env
fi
chmod 600 .env
garantir_chave_credenciais

# Instalação anterior (sem IMAGENS): só acrescenta a chave; as demais linhas ficam como estão.
if [[ $ENV_ANTIGO_SEM_IMAGENS -eq 1 ]]; then
  [[ -z "$(tail -c1 .env)" ]] || printf '\n' >>.env
  printf 'IMAGENS=locais\n' >>.env
  echo "[!] instalação anterior: continua construindo aqui; use ./update.sh --imagens-publicadas para migrar"
elif [[ "$MODO" == publicadas && -z "$(valor_env VERSAO "")" ]]; then
  definir_env VERSAO "$VERSAO_ALVO"
fi
if [[ $BUILD -eq 1 && "$(valor_env IMAGENS "")" == publicadas ]]; then
  definir_env IMAGENS locais
  echo "[!] --build: o .env passou de IMAGENS=publicadas para IMAGENS=locais; o ./update.sh seguirá construindo aqui (use ./update.sh --imagens-publicadas para voltar às publicadas)"
fi

# valor efetivo de uma variável: ambiente do shell > .env > padrão
valor_efetivo() {
  local nome="$1" padrao="$2" v
  if [[ -n "${!nome:-}" ]]; then
    printf '%s' "${!nome}"
    return
  fi
  v="$(grep -E "^${nome}=" .env | tail -n 1 | cut -d= -f2- || true)"
  printf '%s' "${v:-$padrao}"
}
PORTA_HTTPS="$(valor_efetivo SENTINELA_PORTA_HTTPS 443)"
grep -qE '^SENTINELA_CHAVE_SESSAO=.+' .env || falhar "SENTINELA_CHAVE_SESSAO vazia no .env"
grep -qE '^SENTINELA_CHAVE_CREDENCIAIS=.+' .env || falhar "SENTINELA_CHAVE_CREDENCIAIS vazia no .env"

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

# nome DNS aceitável no SAN: rótulos de letras, dígitos e hífen (sem curinga, sem espaço)
nome_valido() {
  local rotulo='[A-Za-z0-9]([A-Za-z0-9-]{0,61}[A-Za-z0-9])?'
  [[ ${#1} -le 253 && "$1" =~ ^$rotulo(\.$rotulo)*$ ]]
}

# SENTINELA_NOMES="sentinela.local,monitor.empresa.lan" -> ",DNS:sentinela.local,DNS:..."
nomes_extras() {
  local nomes nome saida=""
  IFS=, read -r -a nomes <<<"${SENTINELA_NOMES:-}"
  for nome in ${nomes[@]+"${nomes[@]}"}; do
    nome="${nome// /}"
    [[ -z "$nome" || "$nome" == "localhost" ]] && continue
    if nome_valido "$nome"; then
      saida+=",DNS:$nome"
    else
      echo "[!] SENTINELA_NOMES: '$nome' não é um nome DNS válido; ignorado" >&2
    fi
  done
  printf '%s' "$saida"
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
  SAN="DNS:localhost$(nomes_extras),IP:127.0.0.1"
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
WEB_EXISTIA="$("${COMPOSE[@]}" ps -q web 2>/dev/null || true)"
if [[ "$MODO" == publicadas ]]; then
  # só descarta o que esta execução baixou (sem -f): uma tag que já existia fica como está
  BAIXADAS=()
  for repo in "$IMG_REPO_CORE" "$IMG_REPO_WEB"; do
    docker image inspect "$repo:$VERSAO_ALVO" >/dev/null 2>&1 || BAIXADAS+=("$repo:$VERSAO_ALVO")
  done
  descartar_baixadas() {
    local ref
    for ref in ${BAIXADAS[@]+"${BAIXADAS[@]}"}; do docker rmi "$ref" >/dev/null 2>&1 || true; done
  }
  if [[ $CANDIDATA -eq 1 ]]; then
    echo "[..] baixando a candidata por digest (versão $VERSAO_ALVO, $ARQUITETURA)"
    { docker pull "$IMG_REPO_CORE@$SENTINELA_CANDIDATA_CORE" && docker pull "$IMG_REPO_WEB@$SENTINELA_CANDIDATA_WEB"; } ||
      falhar "não consegui baixar a candidata pelo digest"
    docker tag "$IMG_REPO_CORE@$SENTINELA_CANDIDATA_CORE" "$IMG_REPO_CORE:$VERSAO_ALVO"
    docker tag "$IMG_REPO_WEB@$SENTINELA_CANDIDATA_WEB" "$IMG_REPO_WEB:$VERSAO_ALVO"
    if ! (
      verificar_imagem_por_digest core "$IMG_REPO_CORE" "$SENTINELA_CANDIDATA_CORE" &&
        verificar_imagem_por_digest web "$IMG_REPO_WEB" "$SENTINELA_CANDIDATA_WEB"
    ); then
      descartar_baixadas
      exit 1
    fi
  else
    echo "[..] baixando as imagens publicadas (versão $VERSAO_ALVO, $ARQUITETURA)"
    "${COMPOSE[@]}" pull core web || {
      descartar_baixadas
      falhar "imagem ghcr.io/lumezencio/sentinela-core:$VERSAO_ALVO (ou -web) não encontrada no GHCR; use ./install.sh --build"
    }
    if ! (
      verificar_imagem core "$IMG_REPO_CORE" &&
        verificar_imagem web "$IMG_REPO_WEB"
    ); then
      descartar_baixadas
      exit 1
    fi
  fi
  echo "[ok] imagens verificadas"
  echo "[..] subindo os containers"
  "${COMPOSE[@]}" up -d --no-build --pull never --wait --wait-timeout 300
else
  echo "[..] construindo e subindo os containers (pode levar alguns minutos)"
  "${COMPOSE[@]}" up -d --build --wait --wait-timeout 300
fi
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
  echo "  1) Crie o primeiro administrador:"
  echo "    docker compose run --rm core python -m sentinela.cli criar-admin --login <seu-login>"
  echo "  2) Declare as sub-redes privadas a monitorar (sem elas nada é checado):"
  echo "    na tela, botão \"Sub-redes\" (administrador), que aplica na hora; ou pela CLI:"
  echo "    docker compose run --rm core python -m sentinela.cli sub-rede adicionar 10.99.0.0/24"
  echo "    (pela CLI com o Sentinela no ar, aplique com: docker compose restart core)"
fi
