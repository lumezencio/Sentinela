#!/usr/bin/env bash
# Instalador de uma linha do Sentinela (Raspberry Pi 4/5 de 64 bits ou Linux amd64/arm64):
#
#   curl -fsSL https://raw.githubusercontent.com/lumezencio/Sentinela/main/instalar.sh | bash
#
# O que faz, nesta ordem: instala o Docker (script oficial) e o git se faltarem; baixa a última
# versão PUBLICADA (a tag vX.Y.Z mais alta, nunca a main) em /opt/sentinela; lê do próprio
# computador a rede e o gateway (só sugestão para o primeiro acesso: nenhum pacote sai); roda o
# ./install.sh com as imagens publicadas e verificadas; gera o código de instalação (aparece só
# neste terminal, 24 h); instala o timer do systemd da atualização automática (03:00) e mostra
# o endereço https://IP. Pode rodar de novo: não apaga dados, .env nem certificados.
#
# Rode como usuário comum (o sudo pede a senha quando precisar). Variáveis (uso avançado/testes):
#   SENTINELA_DESTINO     pasta da instalação (padrão /opt/sentinela)
#   SENTINELA_REPO        repositório git (padrão https://github.com/lumezencio/Sentinela.git)
#   SENTINELA_SYSTEMD_DIR onde ficam as unidades (padrão /etc/systemd/system)
#   SENTINELA_SYSTEMD_RUN pasta que existe só com systemd rodando (padrão /run/systemd/system)
#   SENTINELA_PORTA_HTTPS, SENTINELA_PORTA_HTTP, SENTINELA_IPS, SENTINELA_NOMES: repassadas ao install.sh
#
# Todo o corpo está em funções e a última linha chama main: um download truncado (curl | bash
# interrompido) não executa nada pela metade.
set -euo pipefail

DESTINO=""
REPO=""
USUARIO=""
SUDO=()
DOCKER_DIRETO=0
GRUPO_NOVO=0
CODIGO=""
JA_HA_ADMIN=0
TIMER_OK=0
REDE_DETECTADA=""

falhar() {
  echo "erro: $*" >&2
  exit 1
}

# ---------------------------------------------------------------- sistema e privilégio
conferir_sistema() {
  local so maq
  so="$(uname -s 2>/dev/null || true)"
  [[ "$so" == Linux ]] || falhar "instalar.sh é só para Linux; no Windows use o caminho técnico do README"
  maq="$(uname -m 2>/dev/null || true)"
  case "$maq" in
    x86_64 | aarch64 | arm64) ;;
    arm | armv6l | armv7l | armhf)
      falhar "Raspberry Pi OS de 32 bits (armv7) não é suportado: instale o Raspberry Pi OS de 64 bits."
      ;;
    *) falhar "arquitetura '$maq' sem imagem publicada (só amd64 e arm64)" ;;
  esac
}

# privilegio: define SUDO (vazio para root) e USUARIO (o dono da árvore: nunca root)
privilegio() {
  SUDO=()
  if [[ $EUID -eq 0 ]]; then
    USUARIO="${SUDO_USER:-}"
    [[ -n "$USUARIO" && "$USUARIO" != root ]] ||
      falhar "rode como usuário comum com sudo (não direto como root): a instalação fica com dono não-root"
    command -v runuser >/dev/null 2>&1 || falhar "'runuser' não encontrado"
  else
    command -v sudo >/dev/null 2>&1 || falhar "'sudo' não encontrado: instale o sudo e adicione seu usuário a ele (ou rode com um usuário que o tenha)"
    SUDO=(sudo)
    USUARIO="$(id -un)"
  fi
  [[ "$USUARIO" =~ ^[A-Za-z_][A-Za-z0-9_.-]*$ ]] || falhar "nome de usuário fora do comum: '$USUARIO'"
}

# como_dono CMD...: roda como o dono da árvore (root vira o usuário; usuário comum roda direto)
como_dono() {
  if [[ $EUID -eq 0 ]]; then
    runuser -u "$USUARIO" -- "$@"
  else
    "$@"
  fi
}

# como_dono_docker CMD...: igual, mas com o grupo docker já valendo (o usuário recém-adicionado
# ao grupo só o recebe em sessão nova: sudo -u/runuser recarregam os grupos)
como_dono_docker() {
  if [[ $EUID -eq 0 ]]; then
    runuser -u "$USUARIO" -- "$@"
  elif [[ $DOCKER_DIRETO -eq 1 ]]; then
    "$@"
  else
    sudo -u "$USUARIO" "$@"
  fi
}

validar_destino() {
  [[ "$DESTINO" =~ ^/[A-Za-z0-9._/-]+$ && "$DESTINO" != *..* ]] ||
    falhar "SENTINELA_DESTINO inválido (use um caminho absoluto simples, sem espaços): '$DESTINO'"
}

# ---------------------------------------------------------------- dependências
garantir_git() {
  command -v git >/dev/null 2>&1 && return 0
  command -v apt-get >/dev/null 2>&1 || falhar "git não encontrado e não há apt-get: instale o git e rode de novo"
  echo "[..] instalando o git"
  "${SUDO[@]+"${SUDO[@]}"}" env DEBIAN_FRONTEND=noninteractive apt-get install -y git </dev/null
  command -v git >/dev/null 2>&1 || falhar "não consegui instalar o git"
}

garantir_docker() {
  if ! command -v docker >/dev/null 2>&1; then
    command -v curl >/dev/null 2>&1 || falhar "curl não encontrado"
    echo "[..] instalando o Docker (script oficial de get.docker.com)"
    local tmp
    tmp="$(mktemp)"
    chmod 0700 "$tmp"
    if ! { curl -fsSL https://get.docker.com -o "$tmp" </dev/null &&
      "${SUDO[@]+"${SUDO[@]}"}" sh "$tmp" </dev/null; }; then
      rm -f "$tmp"
      falhar "não consegui instalar o Docker; instale-o (https://docs.docker.com/engine/install/) e rode de novo"
    fi
    rm -f "$tmp"
  fi
  command -v docker >/dev/null 2>&1 || falhar "o Docker não ficou disponível no PATH"
  docker compose version >/dev/null 2>&1 </dev/null ||
    falhar "plugin 'docker compose' não encontrado: instale o docker-compose-plugin e rode de novo"
  # o script oficial não põe o usuário no grupo docker
  if ! id -nG "$USUARIO" 2>/dev/null | tr ' ' '\n' | grep -qx docker; then
    "${SUDO[@]+"${SUDO[@]}"}" usermod -aG docker "$USUARIO" || falhar "não consegui pôr '$USUARIO' no grupo docker"
    GRUPO_NOVO=1
    echo "[ok] '$USUARIO' adicionado ao grupo docker"
  fi
  DOCKER_DIRETO=0
  if docker info >/dev/null 2>&1 </dev/null; then DOCKER_DIRETO=1; fi
}

# o install.sh roda sem root e precisa do setfacl para a chave do nginx (uid 101)
garantir_acl() {
  command -v setfacl >/dev/null 2>&1 && return 0
  if command -v apt-get >/dev/null 2>&1; then
    echo "[..] instalando o pacote acl"
    "${SUDO[@]+"${SUDO[@]}"}" env DEBIAN_FRONTEND=noninteractive apt-get install -y acl </dev/null ||
      echo "[!] não consegui instalar o acl; se o install.sh reclamar da chave do nginx, instale-o"
  else
    echo "[!] setfacl não encontrado; se o install.sh reclamar da chave do nginx, instale o pacote acl"
  fi
}

# ---------------------------------------------------------------- versão e clone
ultima_versao() {
  local saida tag
  saida="$(git ls-remote --tags --refs "$REPO" 'v*' </dev/null 2>/dev/null)" ||
    falhar "não consegui consultar as versões publicadas em $REPO (sem internet?)"
  tag="$(printf '%s\n' "$saida" | sed -n 's|.*refs/tags/\(v[0-9][0-9]*\.[0-9][0-9]*\.[0-9][0-9]*\)$|\1|p' | sort -V | tail -n 1)"
  [[ -n "$tag" ]] || falhar "nenhuma versão publicada (tag vX.Y.Z) em $REPO"
  printf '%s\n' "$tag"
}

# eh_instalacao DIR: 0 se DIR é um clone do Sentinela
eh_instalacao() {
  [[ -d "$1/.git" && -f "$1/install.sh" && -f "$1/update.sh" && -f "$1/core/pyproject.toml" ]] &&
    grep -qE '^name[[:space:]]*=[[:space:]]*"sentinela"' "$1/core/pyproject.toml"
}

# conferir_destino: falha cedo, sem tocar, se o destino é outra coisa
conferir_destino() {
  [[ -e "$DESTINO" ]] || return 0
  if eh_instalacao "$DESTINO"; then return 0; fi
  [[ -d "$DESTINO" && -z "$(ls -A "$DESTINO" 2>/dev/null)" ]] ||
    falhar "$DESTINO já existe e não é uma instalação do Sentinela; escolha outra pasta com SENTINELA_DESTINO (nada foi alterado)"
}

clonar() {
  local tag="$1"
  if eh_instalacao "$DESTINO"; then
    echo "[=] $DESTINO já é uma instalação do Sentinela: o checkout fica como está (atualize com ./update.sh)"
    return 0
  fi
  if [[ ! -d "$DESTINO" ]]; then
    if ! mkdir -p "$DESTINO" 2>/dev/null; then
      "${SUDO[@]+"${SUDO[@]}"}" mkdir -p "$DESTINO" || falhar "não consegui criar $DESTINO"
    fi
  fi
  if [[ ! -w "$DESTINO" || $EUID -eq 0 ]]; then
    "${SUDO[@]+"${SUDO[@]}"}" chown "$USUARIO:$(id -gn "$USUARIO")" "$DESTINO" ||
      falhar "não consegui dar $DESTINO ao usuário $USUARIO"
  fi
  echo "[..] baixando o Sentinela $tag em $DESTINO"
  como_dono git clone --quiet --branch "$tag" "$REPO" "$DESTINO" </dev/null ||
    falhar "não consegui clonar $tag de $REPO"
}

# ---------------------------------------------------------------- rede (só leitura do próprio host)
# ip_privado A B: 0 se A.B.x.x é RFC 1918
ip_privado() {
  local a="$1" b="$2"
  ((a == 10)) && return 0
  ((a == 172 && b >= 16 && b <= 31)) && return 0
  ((a == 192 && b == 168)) && return 0
  return 1
}

# detectar_rede: imprime "<cidr> <gateway> <ip>" ou nada. Só lê (ip route/addr); nenhum pacote.
detectar_rede() {
  command -v ip >/dev/null 2>&1 || return 0
  local rota gw ifc linha cidr o1 o2 o3 o4 pref ipn mask net g1 g2 g3 g4 gwn
  rota="$(ip -4 route show default 2>/dev/null | head -n 1 || true)"
  [[ -n "$rota" ]] || return 0
  gw="$(awk '{for (i = 1; i < NF; i++) if ($i == "via") { print $(i + 1); exit }}' <<<"$rota")"
  ifc="$(awk '{for (i = 1; i < NF; i++) if ($i == "dev") { print $(i + 1); exit }}' <<<"$rota")"
  [[ -n "$gw" && "$ifc" =~ ^[A-Za-z0-9_.:@-]+$ ]] || return 0
  [[ "$gw" =~ ^([0-9]{1,3})\.([0-9]{1,3})\.([0-9]{1,3})\.([0-9]{1,3})$ ]] || return 0
  g1=$((10#${BASH_REMATCH[1]}))
  g2=$((10#${BASH_REMATCH[2]}))
  g3=$((10#${BASH_REMATCH[3]}))
  g4=$((10#${BASH_REMATCH[4]}))
  ((g1 <= 255 && g2 <= 255 && g3 <= 255 && g4 <= 255)) || return 0
  ip_privado "$g1" "$g2" || return 0
  linha="$(ip -4 -o addr show dev "$ifc" 2>/dev/null | head -n 1 || true)"
  cidr="$(awk '{for (i = 1; i < NF; i++) if ($i == "inet") { print $(i + 1); exit }}' <<<"$linha")"
  [[ "$cidr" =~ ^([0-9]{1,3})\.([0-9]{1,3})\.([0-9]{1,3})\.([0-9]{1,3})/([0-9]{1,2})$ ]] || return 0
  o1=$((10#${BASH_REMATCH[1]}))
  o2=$((10#${BASH_REMATCH[2]}))
  o3=$((10#${BASH_REMATCH[3]}))
  o4=$((10#${BASH_REMATCH[4]}))
  pref=$((10#${BASH_REMATCH[5]}))
  ((o1 <= 255 && o2 <= 255 && o3 <= 255 && o4 <= 255)) || return 0
  ip_privado "$o1" "$o2" || return 0
  ((pref <= 30)) || return 0
  ((pref >= 16)) || pref=24 # rede larga demais para varrer: oferece só o /24 do host
  ipn=$(((o1 << 24) | (o2 << 16) | (o3 << 8) | o4))
  mask=$(((0xFFFFFFFF << (32 - pref)) & 0xFFFFFFFF))
  net=$((ipn & mask))
  # gateway fora da rede sugerida (ex.: /8 reduzida a /24): sem gateway ("-"), o core o ignoraria
  gwn=$(((g1 << 24) | (g2 << 16) | (g3 << 8) | g4))
  (((gwn & mask) == net)) || gw="-"
  printf '%d.%d.%d.%d/%d %s %d.%d.%d.%d\n' \
    $((net >> 24 & 255)) $((net >> 16 & 255)) $((net >> 8 & 255)) $((net & 255)) "$pref" \
    "$gw" "$o1" "$o2" "$o3" "$o4"
}

# gravar_sugestao "<cidr> <gw> <ip>": com .env, grava só as chaves ainda vazias; sem .env, exporta
# para o install.sh gravar ao criar. Valor já pedido pelo ambiente tem prioridade.
gravar_sugestao() {
  local rede gw
  [[ -n "$1" ]] || return 0
  read -r rede gw _ <<<"$1"
  if [[ -f .env ]]; then
    [[ -n "$(valor_env SENTINELA_REDE_SUGERIDA "")" ]] || definir_env SENTINELA_REDE_SUGERIDA "${SENTINELA_REDE_SUGERIDA:-$rede}"
    if [[ "$gw" != "-" ]]; then
      [[ -n "$(valor_env SENTINELA_GATEWAY_SUGERIDO "")" ]] || definir_env SENTINELA_GATEWAY_SUGERIDO "${SENTINELA_GATEWAY_SUGERIDO:-$gw}"
    fi
    devolver_env_ao_dono
  else
    export SENTINELA_REDE_SUGERIDA="${SENTINELA_REDE_SUGERIDA:-$rede}"
    [[ "$gw" == "-" ]] || export SENTINELA_GATEWAY_SUGERIDO="${SENTINELA_GATEWAY_SUGERIDO:-$gw}"
  fi
}

# devolver_env_ao_dono: o .env é do dono da árvore (0600), mesmo numa nova rodada como root
# (o definir_env cria um arquivo novo com o usuário que roda)
devolver_env_ao_dono() {
  [[ -f "$DESTINO/.env" ]] || return 0
  "${SUDO[@]+"${SUDO[@]}"}" chown "$USUARIO:$(id -gn "$USUARIO")" "$DESTINO/.env" 2>/dev/null || true
  chmod 600 "$DESTINO/.env" 2>/dev/null || "${SUDO[@]+"${SUDO[@]}"}" chmod 600 "$DESTINO/.env" || true
}

# ---------------------------------------------------------------- install.sh, código, timer
avahi_ativo() {
  command -v systemctl >/dev/null 2>&1 && systemctl is-active --quiet avahi-daemon 2>/dev/null
}

# nome_mdns: "<hostname>.local" (o que o avahi anuncia), vazio se não há avahi ou o nome é estranho
nome_mdns() {
  local h
  avahi_ativo || return 0
  h="$(hostname 2>/dev/null | cut -d. -f1 || true)"
  [[ "$h" =~ ^[A-Za-z0-9]([A-Za-z0-9-]{0,61}[A-Za-z0-9])?$ ]] || return 0
  printf '%s.local\n' "$h"
}

# nomes_do_certificado: só na criação do certificado (certs/web ainda não existe) o nome .local
# entra no SAN; com certificado já emitido nada é regenerado
nomes_do_certificado() {
  local n
  [[ ! -f certs/web/servidor.crt ]] || return 0
  n="$(nome_mdns)"
  [[ -z "$n" ]] || export SENTINELA_NOMES="${SENTINELA_NOMES:+$SENTINELA_NOMES,}$n"
}

rodar_install() {
  local -a vars=()
  local v
  for v in SENTINELA_REDE_SUGERIDA SENTINELA_GATEWAY_SUGERIDO SENTINELA_PORTA_HTTPS SENTINELA_PORTA_HTTP SENTINELA_IPS SENTINELA_NOMES; do
    [[ -z "${!v:-}" ]] || vars+=("$v=${!v}")
  done
  vars+=("SENTINELA_VIA_INSTALADOR=1")
  echo "[..] rodando o install.sh (baixa e verifica as imagens publicadas)"
  como_dono_docker env ${vars[@]+"${vars[@]}"} ./install.sh </dev/null
}

# codigo_instalacao: a saída da CLI fica só numa variável (nunca em arquivo, nunca com set -x)
codigo_instalacao() {
  local saida rc=0
  CODIGO=""
  JA_HA_ADMIN=0
  saida="$(como_dono_docker docker compose exec -T core python -m sentinela.cli codigo-instalacao 2>/dev/null </dev/null)" || rc=$?
  if [[ $rc -eq 3 ]]; then
    JA_HA_ADMIN=1
    return 0
  fi
  [[ $rc -eq 0 && "$saida" =~ ^[A-Za-z0-9-]{8,16}$ ]] ||
    falhar "não consegui gerar o código de instalação; gere depois com: cd $DESTINO && docker compose exec -T core python -m sentinela.cli codigo-instalacao"
  CODIGO="$saida"
}

instalar_timer() {
  local dir run unidade tmp
  dir="${SENTINELA_SYSTEMD_DIR:-/etc/systemd/system}"
  run="${SENTINELA_SYSTEMD_RUN:-/run/systemd/system}"
  TIMER_OK=0
  if [[ ! -d "$run" ]] || ! command -v systemctl >/dev/null 2>&1; then
    echo "[!] systemd não encontrado: sem atualização automática. Atualize à mão com: cd $DESTINO && ./update.sh"
    return 0
  fi
  for unidade in sentinela-atualizacao.service sentinela-atualizacao.timer; do
    [[ -f "scripts/systemd/$unidade" ]] || falhar "scripts/systemd/$unidade não encontrado nesta versão"
    tmp="$(mktemp)"
    sed -e "s|@DESTINO@|$DESTINO|g" -e "s|@USUARIO@|$USUARIO|g" "scripts/systemd/$unidade" >"$tmp"
    "${SUDO[@]+"${SUDO[@]}"}" install -m 0644 "$tmp" "$dir/$unidade" || {
      rm -f "$tmp"
      falhar "não consegui instalar $dir/$unidade"
    }
    rm -f "$tmp"
  done
  if ! { "${SUDO[@]+"${SUDO[@]}"}" systemctl daemon-reload &&
    "${SUDO[@]+"${SUDO[@]}"}" systemctl enable --now sentinela-atualizacao.timer; }; then
    echo "[!] não consegui ativar o timer; ative depois com: sudo systemctl enable --now sentinela-atualizacao.timer"
    return 0
  fi
  como_dono_docker docker compose exec -T core python -m sentinela.cli atualizacao-registrar --agendado >/dev/null 2>&1 </dev/null ||
    echo "[!] não consegui registrar o timer no painel (a atualização às 03:00 funciona assim mesmo)"
  TIMER_OK=1
  echo "[ok] atualização automática às 03:00 instalada (desligue em Configurações → Atualizações)"
}

# ---------------------------------------------------------------- resumo
resumo() {
  local ip porta sufixo nome=""
  ip=""
  [[ -z "$REDE_DETECTADA" ]] || ip="${REDE_DETECTADA##* }"
  if [[ -z "$ip" ]]; then
    ip="$(hostname -I 2>/dev/null | tr ' ' '\n' | grep -E '^(10\.|192\.168\.|172\.(1[6-9]|2[0-9]|3[01])\.)[0-9.]+$' | head -n 1 || true)"
  fi
  [[ -n "$ip" ]] || ip=localhost
  porta="${SENTINELA_PORTA_HTTPS:-$(valor_env SENTINELA_PORTA_HTTPS 443)}"
  sufixo=""
  [[ "$porta" == 443 ]] || sufixo=":$porta"
  nome="$(nome_mdns)"
  echo
  echo "Sentinela instalado."
  echo "  Abra no navegador: https://$ip$sufixo/"
  [[ -z "$nome" ]] || echo "  Ou pelo nome: https://$nome$sufixo/ (o navegador pode avisar do certificado)"
  echo "  (o navegador avisa do certificado até você instalar a CA: $DESTINO/certs/ca/sentinela-ca.crt)"
  if [[ $JA_HA_ADMIN -eq 1 ]]; then
    echo "  Já existe administrador: entre pelo login."
  else
    echo "  Código de instalação: $CODIGO"
    echo "  Vale 24 h e só até o primeiro administrador ser criado; digite-o na tela de primeiro acesso."
    echo "  Ele aparece só aqui: anote agora (se perder, rode o instalar.sh de novo para gerar outro)."
  fi
  if [[ $TIMER_OK -eq 0 ]]; then
    echo "  Sem atualização automática: atualize com: cd $DESTINO && ./update.sh"
  fi
  if [[ $GRUPO_NOVO -eq 1 ]]; then
    echo "  Para usar o docker com este usuário sem sudo, saia e entre de novo na sessão (só se for rodar comandos à mão)."
  fi
}

main() {
  DESTINO="${SENTINELA_DESTINO:-/opt/sentinela}"
  REPO="${SENTINELA_REPO:-https://github.com/lumezencio/Sentinela.git}"
  local tag
  conferir_sistema
  privilegio
  validar_destino
  conferir_destino
  garantir_git
  garantir_docker
  garantir_acl
  tag="$(ultima_versao)"
  clonar "$tag"
  cd "$DESTINO"
  # shellcheck source=scripts/operacao-comum.sh
  source "$DESTINO/scripts/operacao-comum.sh"
  REDE_DETECTADA="$(detectar_rede)"
  gravar_sugestao "$REDE_DETECTADA"
  nomes_do_certificado
  rodar_install
  codigo_instalacao
  instalar_timer
  resumo
}

main "$@"
