#!/usr/bin/env bash
# Testes do instalar.sh com docker/git(real)/curl/uname/ip/systemctl/sudo falsos (nenhum contêiner,
# serviço ou rede real é tocado; o "repositório publicado" é um repositório git local).
#   bash testes-operacao/test_instalar.sh
set -uo pipefail

# shellcheck source=testes-operacao/lib.sh
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/lib.sh"

CODIGO_FALSO="K7MQ-2XDP"

# publicar_origem: repositório com v0.4.1, v0.5.0 e um commit depois, só na main
publicar_origem() {
  local origem="$SHIM_DIR/origem.git" trab="$SHIM_DIR/trabalho"
  git_real init -q --bare "$origem"
  git_real init -q "$trab"
  mkdir -p "$trab/core" "$trab/scripts"
  printf '[project]\nname = "sentinela"\nversion = "0.4.1"\n' >"$trab/core/pyproject.toml"
  : >"$trab/docker-compose.yml"
  cp "$REPO_DIR/update.sh" "$trab/update.sh"
  cp -r "$REPO_DIR/scripts/." "$trab/scripts/"
  # install.sh de mentira: registra e cria o .env como o verdadeiro (só a sugestão de rede importa aqui)
  cat >"$trab/install.sh" <<'FIM'
#!/usr/bin/env bash
printf 'install.sh %s nomes=%s via=%s\n' "$*" "${SENTINELA_NOMES:-}" "${SENTINELA_VIA_INSTALADOR:-}" >>"${SHIM_LOG:?}"
if [[ ! -f .env ]]; then
  printf 'SENTINELA_PORTA_HTTPS=%s\nSENTINELA_REDE_SUGERIDA=%s\nSENTINELA_GATEWAY_SUGERIDO=%s\n' \
    "${SENTINELA_PORTA_HTTPS:-443}" "${SENTINELA_REDE_SUGERIDA:-}" "${SENTINELA_GATEWAY_SUGERIDO:-}" >.env
  chmod 600 .env
fi
FIM
  chmod +x "$trab/install.sh"
  git_real -C "$trab" add -A
  git_real -C "$trab" commit -q -m "v0.4.1"
  git_real -C "$trab" tag v0.4.1
  echo "# 0.5.0" >>"$trab/docker-compose.yml"
  git_real -C "$trab" commit -q -am "v0.5.0"
  git_real -C "$trab" tag v0.5.0
  echo "so na main" >"$trab/so-na-main.txt"
  git_real -C "$trab" add -A
  git_real -C "$trab" commit -q -m "depois da v0.5.0"
  git_real -C "$trab" remote add origin "$origem"
  git_real -C "$trab" push -q origin main v0.4.1 v0.5.0
}

# sem_docker_no_path: PATH sem nenhum diretório com docker (o do Docker Desktop, se houver, e o shim);
# os outros shims são copiados para uma pasta própria, onde o script oficial "instala" o docker falso
sem_docker_no_path() {
  local bin="$SHIM_DIR/bin-sem-docker" f d novo="" n=0 espelho
  mkdir -p "$bin"
  for f in "$LIB_DIR"/shims/*; do
    [[ "$(basename "$f")" == docker ]] || cp "$f" "$bin/"
  done
  # hermético: todo diretório do PATH que tenha um docker (o real, no CI e no Docker Desktop) é
  # trocado por um espelho de links para tudo o que há nele, menos o docker
  local IFS=:
  for d in $PATH; do
    [[ "$d" == "$LIB_DIR/shims" ]] && continue
    if [[ -x "$d/docker" || -x "$d/docker.exe" ]]; then
      n=$((n + 1))
      espelho="$SHIM_DIR/espelho-$n"
      mkdir -p "$espelho"
      for f in "$d"/*; do
        case "$(basename "$f")" in docker | docker.exe | docker-*) continue ;; esac
        ln -s "$f" "$espelho/$(basename "$f")" 2>/dev/null || true
      done
      d="$espelho"
    fi
    novo+="${novo:+:}$d"
  done
  PATH="$bin:$novo"
  export PATH
  if command -v docker >/dev/null 2>&1; then _falhou "o PATH hermético ainda acha um docker: $(command -v docker)"; fi
}

ambiente() {
  rodar_em_diretorio_temporario
  publicar_origem
  DESTINO="$TMP_OP/opt/sentinela"
  export SENTINELA_DESTINO="$DESTINO"
  export SENTINELA_REPO="$SHIM_DIR/origem.git"
  mkdir -p "$TMP_OP/systemd" "$TMP_OP/run-systemd"
  export SENTINELA_SYSTEMD_DIR="$TMP_OP/systemd"
  export SENTINELA_SYSTEMD_RUN="$TMP_OP/run-systemd"
  export SHIM_UNAME_S=Linux
  export SHIM_CODIGO="$CODIGO_FALSO"
  export SHIM_IP_ROUTE="default via 192.168.15.1 dev eth0 proto dhcp src 192.168.15.23 metric 100"
  export SHIM_IP_ADDR="2: eth0    inet 192.168.15.23/24 brd 192.168.15.255 scope global dynamic noprefixroute eth0\       valid_lft 86000sec preferred_lft 86000sec"
  return 0
}

# rodar_instalar: stdin não é terminal (como no curl | bash)
rodar_instalar() {
  bash "$TMP_OP/instalar.sh" >"$TMP_OP/saida-instalar" 2>&1 </dev/null
}

valor_do_env() {
  sed -n "s/^$1=//p" "$DESTINO/.env" | tail -n 1
}

test_recusa_armv7_e_nao_linux_sem_criar_nada() {
  ambiente
  SHIM_UNAME_M=armv7l rodar_instalar && _falhou "armv7 deveria ser recusado"
  grep -qF "Raspberry Pi OS de 32 bits (armv7) não é suportado: instale o Raspberry Pi OS de 64 bits." "$TMP_OP/saida-instalar" ||
    _falhou "mensagem de 32 bits: $(cat "$TMP_OP/saida-instalar")"
  [[ ! -e "$DESTINO" ]] || _falhou "não deveria criar o destino"
  SHIM_UNAME_S=Darwin rodar_instalar && _falhou "só Linux"
  grep -qF "instalar.sh é só para Linux; no Windows use o caminho técnico do README" "$TMP_OP/saida-instalar" ||
    _falhou "mensagem de não Linux: $(cat "$TMP_OP/saida-instalar")"
  SHIM_UNAME_M=riscv64 rodar_instalar && _falhou "arquitetura desconhecida"
  [[ ! -e "$DESTINO" ]] || _falhou "não deveria criar o destino"
  grep -qE '^(git|docker|curl|sudo) ' "$SHIM_LOG" && _falhou "nada deveria rodar antes de conferir o sistema"
  return 0
}

test_clona_a_ultima_tag_e_nao_a_main() {
  ambiente
  rodar_instalar || _falhou "deveria instalar: $(cat "$TMP_OP/saida-instalar")"
  afirmar_igual "$(git_real -C "$DESTINO" describe --tags --exact-match HEAD)" "v0.5.0"
  [[ ! -e "$DESTINO/so-na-main.txt" ]] || _falhou "clonou a main em vez da tag"
  grep -qF "install.sh" "$SHIM_LOG" || _falhou "deveria rodar o install.sh"
}

test_docker_ausente_usa_o_script_oficial() {
  ambiente
  sem_docker_no_path
  export SHIM_GET_DOCKER="cp '$LIB_DIR/shims/docker' '$SHIM_DIR/bin-sem-docker/docker'; echo oficial >>'$SHIM_DIR/oficial.rodou'"
  rodar_instalar || _falhou "deveria instalar: $(cat "$TMP_OP/saida-instalar")"
  afirmar_log_contem "curl -fsSL https://get.docker.com -o "
  [[ -e "$SHIM_DIR/oficial.rodou" ]] || _falhou "o script oficial deveria ter rodado"
  afirmar_log_contem "compose version"
  afirmar_ordem "curl -fsSL https://get.docker.com" "git clone"
}

test_docker_ausente_e_sem_script_falha_com_mensagem() {
  ambiente
  sem_docker_no_path
  rodar_instalar && _falhou "sem docker e sem o script, deveria falhar"
  grep -qF "não consegui instalar o Docker" "$TMP_OP/saida-instalar" || _falhou "mensagem: $(cat "$TMP_OP/saida-instalar")"
  [[ ! -e "$DESTINO" ]] || _falhou "não deveria clonar sem docker"
}

test_usuario_vai_para_o_grupo_docker() {
  ambiente
  rodar_instalar || _falhou "deveria instalar"
  grep -qE "^sudo usermod -aG docker $(id -un)\$" "$SHIM_LOG" || _falhou "deveria pôr o usuário no grupo docker: $(cat "$SHIM_LOG")"
  grep -qF "saia e entre de novo" "$TMP_OP/saida-instalar" || _falhou "deveria avisar da nova sessão"
}

test_rede_detectada_vai_para_o_env() {
  ambiente
  rodar_instalar || _falhou "deveria instalar"
  afirmar_igual "$(valor_do_env SENTINELA_REDE_SUGERIDA)" "192.168.15.0/24"
  afirmar_igual "$(valor_do_env SENTINELA_GATEWAY_SUGERIDO)" "192.168.15.1"
  grep -qE '^ip (-4 )?(route show default|-4 -o addr show dev eth0)' "$SHIM_LOG" || _falhou "deveria consultar o ip"
  grep -E '^ip ' "$SHIM_LOG" | grep -qvE 'show' && _falhou "o ip só pode ser lido"
  return 0
}

test_rede_publica_ou_sem_rota_nao_grava() {
  ambiente
  export SHIM_IP_ADDR="2: eth0    inet 203.0.113.5/24 brd 203.0.113.255 scope global eth0"
  export SHIM_IP_ROUTE="default via 203.0.113.1 dev eth0"
  rodar_instalar || _falhou "deveria instalar"
  afirmar_igual "$(valor_do_env SENTINELA_REDE_SUGERIDA)" ""
  afirmar_igual "$(valor_do_env SENTINELA_GATEWAY_SUGERIDO)" ""
  # host privado, mas gateway público: também nada
  export SHIM_IP_ROUTE="default via 203.0.113.1 dev eth0"
  export SHIM_IP_ADDR="2: eth0    inet 192.168.15.23/24 brd 192.168.15.255 scope global eth0"
  rodar_instalar || _falhou "deveria rodar de novo"
  afirmar_igual "$(valor_do_env SENTINELA_REDE_SUGERIDA)" ""
  # sem rota nenhuma
  export SHIM_IP_ROUTE=""
  rodar_instalar || _falhou "deveria rodar de novo"
  afirmar_igual "$(valor_do_env SENTINELA_REDE_SUGERIDA)" ""
  # /31 é pequeno demais
  export SHIM_IP_ROUTE="default via 192.168.15.1 dev eth0"
  export SHIM_IP_ADDR="2: eth0    inet 192.168.15.2/31 scope global eth0"
  rodar_instalar || _falhou "deveria rodar de novo"
  afirmar_igual "$(valor_do_env SENTINELA_REDE_SUGERIDA)" ""
}

test_rede_em_env_existente_so_preenche_o_que_falta() {
  ambiente
  export SHIM_IP_ROUTE=""
  rodar_instalar || _falhou "deveria instalar"
  afirmar_igual "$(valor_do_env SENTINELA_REDE_SUGERIDA)" ""
  export SHIM_IP_ROUTE="default via 192.168.15.1 dev eth0"
  export SHIM_IP_ADDR="2: eth0    inet 192.168.15.23/24 brd 192.168.15.255 scope global eth0"
  rodar_instalar || _falhou "deveria rodar de novo"
  afirmar_igual "$(valor_do_env SENTINELA_REDE_SUGERIDA)" "192.168.15.0/24"
  afirmar_igual "$(valor_do_env SENTINELA_GATEWAY_SUGERIDO)" "192.168.15.1"
  afirmar_igual "$(valor_do_env SENTINELA_PORTA_HTTPS)" "443"
  # uma sugestão já gravada (talvez editada pelo dono) não é trocada
  export SHIM_IP_ADDR="2: eth0    inet 192.168.20.5/24 scope global eth0"
  rodar_instalar || _falhou "deveria rodar de novo"
  afirmar_igual "$(valor_do_env SENTINELA_REDE_SUGERIDA)" "192.168.15.0/24"
}

test_barra_8_sugere_o_24_do_host() {
  ambiente
  export SHIM_IP_ROUTE="default via 10.1.2.1 dev eth0"
  export SHIM_IP_ADDR="2: eth0    inet 10.1.2.3/8 brd 10.255.255.255 scope global eth0"
  rodar_instalar || _falhou "deveria instalar"
  afirmar_igual "$(valor_do_env SENTINELA_REDE_SUGERIDA)" "10.1.2.0/24"
  afirmar_igual "$(valor_do_env SENTINELA_GATEWAY_SUGERIDO)" "10.1.2.1"
}

test_gateway_fora_da_rede_sugerida_nao_e_gravado() {
  ambiente
  export SHIM_IP_ROUTE="default via 10.0.0.1 dev eth0"
  export SHIM_IP_ADDR="2: eth0    inet 10.1.2.3/8 brd 10.255.255.255 scope global eth0"
  rodar_instalar || _falhou "deveria instalar"
  afirmar_igual "$(valor_do_env SENTINELA_REDE_SUGERIDA)" "10.1.2.0/24"
  afirmar_igual "$(valor_do_env SENTINELA_GATEWAY_SUGERIDO)" ""
}

test_nomes_do_certificado_so_na_criacao() {
  ambiente
  local h
  h="$(hostname | cut -d. -f1)"
  rodar_instalar || _falhou "deveria instalar"
  grep -qF "nomes=$h.local " "$SHIM_LOG" || _falhou "o primeiro install.sh deveria receber SENTINELA_NOMES=$h.local: $(grep '^install.sh' "$SHIM_LOG")"
  grep -qF "via=1" "$SHIM_LOG" || _falhou "deveria avisar o install.sh que veio do instalador"
  grep -qF "Ou pelo nome: https://$h.local/" "$TMP_OP/saida-instalar" || _falhou "o nome .local vem depois do IP"
  # com certificado já emitido, não repassa (nada é regenerado)
  : >"$SHIM_LOG"
  mkdir -p "$DESTINO/certs/web"
  : >"$DESTINO/certs/web/servidor.crt"
  rodar_instalar || _falhou "deveria rodar de novo"
  grep -qF "nomes= " "$SHIM_LOG" || _falhou "não deveria passar o nome com certificado existente: $(grep '^install.sh' "$SHIM_LOG")"
  # sem avahi: nada de nome
  rm -rf "$DESTINO"
  SHIM_AVAHI_INATIVO=1 rodar_instalar || _falhou "deveria instalar sem avahi"
  grep -qF ".local" "$TMP_OP/saida-instalar" && _falhou "sem avahi não mostra nome .local"
  return 0
}

test_env_continua_do_dono_com_600_depois_da_rodada() {
  ambiente
  export SHIM_IP_ROUTE=""
  rodar_instalar || _falhou "deveria instalar"
  export SHIM_IP_ROUTE="default via 192.168.15.1 dev eth0"
  : >"$SHIM_LOG"
  rodar_instalar || _falhou "deveria rodar de novo"
  grep -qE "^sudo chown $(id -un):[^ ]+ $DESTINO/.env\$" "$SHIM_LOG" || _falhou "deveria devolver o .env ao dono: $(grep '^sudo' "$SHIM_LOG")"
  if fs_suporta_modo; then afirmar_igual "$(stat -c %a "$DESTINO/.env")" "600"; fi
}

test_ordem_de_versoes_ignora_prelancamento() {
  ambiente
  git_real -C "$SHIM_DIR/trabalho" tag v0.10.0
  git_real -C "$SHIM_DIR/trabalho" tag v0.11.0-rc1
  git_real -C "$SHIM_DIR/trabalho" tag v0.9.0
  git_real -C "$SHIM_DIR/trabalho" push -q origin v0.10.0 v0.11.0-rc1 v0.9.0
  rodar_instalar || _falhou "deveria instalar"
  afirmar_igual "$(git_real -C "$DESTINO" describe --tags --exact-match HEAD)" "v0.10.0"
}

test_barra_16_e_barra_22_ficam_como_estao() {
  ambiente
  export SHIM_IP_ROUTE="default via 172.16.0.1 dev eth0"
  export SHIM_IP_ADDR="2: eth0    inet 172.16.5.9/16 scope global eth0"
  rodar_instalar || _falhou "deveria instalar"
  afirmar_igual "$(valor_do_env SENTINELA_REDE_SUGERIDA)" "172.16.0.0/16"
  rm -rf "$DESTINO"
  export SHIM_IP_ROUTE="default via 192.168.7.1 dev eth0"
  export SHIM_IP_ADDR="2: eth0    inet 192.168.7.130/22 scope global eth0"
  rodar_instalar || _falhou "deveria instalar de novo"
  afirmar_igual "$(valor_do_env SENTINELA_REDE_SUGERIDA)" "192.168.4.0/22"
}

test_codigo_aparece_so_no_terminal() {
  ambiente
  rodar_instalar || _falhou "deveria instalar"
  afirmar_igual "$(grep -cF "$CODIGO_FALSO" "$TMP_OP/saida-instalar")" "1"
  grep -qF "vale 24 h e só até o primeiro administrador" "$TMP_OP/saida-instalar" ||
    grep -qF "Vale 24 h e só até o primeiro administrador" "$TMP_OP/saida-instalar" ||
    _falhou "deveria explicar a validade"
  # em nenhum arquivo (destino, .env, unidades, log do shim, temporários do teste), fora a saída do terminal
  if grep -rlF "$CODIGO_FALSO" "$TMP_OP" "${TMPDIR:-/tmp}" 2>/dev/null | grep -vF "$TMP_OP/saida-instalar" | grep -q .; then
    _falhou "o código apareceu em arquivo: $(grep -rlF "$CODIGO_FALSO" "$TMP_OP" | grep -vF "$TMP_OP/saida-instalar")"
  fi
  afirmar_log_nao_contem "$CODIGO_FALSO"
  grep -qE '^[[:space:]]*(set -[a-z]*x|exec [0-9]*>)|xtrace' "$TMP_OP/instalar.sh" && _falhou "nada de set -x"
  return 0
}

test_timer_com_destino_e_automatico() {
  ambiente
  rodar_instalar || _falhou "deveria instalar"
  local svc="$TMP_OP/systemd/sentinela-atualizacao.service" tmr="$TMP_OP/systemd/sentinela-atualizacao.timer"
  [[ -f "$svc" && -f "$tmr" ]] || _falhou "unidades não instaladas"
  grep -qxF "ExecStart=$DESTINO/update.sh --automatico" "$svc" || _falhou "ExecStart: $(cat "$svc")"
  grep -qxF "WorkingDirectory=$DESTINO" "$svc" || _falhou "WorkingDirectory"
  grep -qxF "User=$(id -un)" "$svc" || _falhou "User deveria ser o dono da árvore, não root"
  grep -qxF "Environment=LC_ALL=C" "$svc" || _falhou "o serviço deveria fixar LC_ALL=C"
  grep -qxF "OnCalendar=*-*-* 03:00:00" "$tmr" || _falhou "OnCalendar"
  grep -q '@' "$svc" "$tmr" && _falhou "sobrou marcador @...@"
  afirmar_log_contem "systemctl daemon-reload"
  afirmar_log_contem "systemctl enable --now sentinela-atualizacao.timer"
  afirmar_log_contem "atualizacao-registrar --agendado"
  afirmar_ordem "systemctl daemon-reload" "systemctl enable --now sentinela-atualizacao.timer" "atualizacao-registrar --agendado"
}

test_unidade_do_repositorio_fixa_lc_all_c() {
  grep -qxF "Environment=LC_ALL=C" "$REPO_DIR/scripts/systemd/sentinela-atualizacao.service" ||
    _falhou "a unidade do repositório deveria ter Environment=LC_ALL=C"
}

test_sem_systemd_avisa_e_segue() {
  ambiente
  export SENTINELA_SYSTEMD_RUN="$TMP_OP/nao-existe"
  rodar_instalar || _falhou "deveria instalar mesmo sem systemd: $(cat "$TMP_OP/saida-instalar")"
  grep -qF "./update.sh" "$TMP_OP/saida-instalar" || _falhou "deveria sugerir o ./update.sh"
  afirmar_log_nao_contem "systemctl enable"
  [[ -z "$(ls -A "$TMP_OP/systemd")" ]] || _falhou "não deveria instalar unidades"
  grep -qF "$CODIGO_FALSO" "$TMP_OP/saida-instalar" || _falhou "o código deveria aparecer mesmo assim"
}

test_rodar_de_novo_nao_apaga_nem_muda_a_versao() {
  ambiente
  rodar_instalar || _falhou "deveria instalar"
  echo "dado do dono" >"$DESTINO/dado.txt"
  mkdir -p "$DESTINO/certs/ca"
  echo "ca" >"$DESTINO/certs/ca/sentinela-ca.crt"
  local cabeca env
  cabeca="$(git_real -C "$DESTINO" rev-parse HEAD)"
  env="$(sha256sum "$DESTINO/.env" | cut -d' ' -f1)"
  # sai um v0.6.0 no remoto: o rerun não atualiza (quem atualiza é o update.sh)
  git_real -C "$SHIM_DIR/trabalho" tag v0.6.0
  git_real -C "$SHIM_DIR/trabalho" push -q origin v0.6.0
  SHIM_TEM_ADMIN=1 rodar_instalar || _falhou "deveria rodar de novo: $(cat "$TMP_OP/saida-instalar")"
  afirmar_igual "$(git_real -C "$DESTINO" rev-parse HEAD)" "$cabeca"
  afirmar_igual "$(sha256sum "$DESTINO/.env" | cut -d' ' -f1)" "$env"
  [[ -f "$DESTINO/dado.txt" && -f "$DESTINO/certs/ca/sentinela-ca.crt" ]] || _falhou "apagou dados"
  grep -qF "$CODIGO_FALSO" "$TMP_OP/saida-instalar" && _falhou "com administrador não mostra código"
  grep -qF "Já existe administrador" "$TMP_OP/saida-instalar" || _falhou "deveria dizer que já existe administrador"
  # sem administrador, o rerun gera um código novo
  rodar_instalar || _falhou "deveria rodar de novo"
  grep -qF "$CODIGO_FALSO" "$TMP_OP/saida-instalar" || _falhou "deveria mostrar um código"
  afirmar_igual "$(git_real -C "$DESTINO" rev-parse HEAD)" "$cabeca"
}

test_destino_ocupado_recusa() {
  ambiente
  mkdir -p "$DESTINO"
  echo "outra coisa" >"$DESTINO/arquivo-do-dono.txt"
  rodar_instalar && _falhou "deveria recusar um destino que não é do Sentinela"
  grep -qF "não é uma instalação do Sentinela" "$TMP_OP/saida-instalar" || _falhou "mensagem: $(cat "$TMP_OP/saida-instalar")"
  afirmar_igual "$(ls -A "$DESTINO")" "arquivo-do-dono.txt"
  grep -qE '^git clone' "$SHIM_LOG" && _falhou "não deveria clonar"
  # um clone de outro projeto também é recusado, sem tocar
  rm -rf "$DESTINO"
  mkdir -p "$DESTINO"
  git_real init -q "$DESTINO"
  echo x >"$DESTINO/x.txt"
  rodar_instalar && _falhou "outro repositório não é o Sentinela"
  [[ -f "$DESTINO/x.txt" ]] || _falhou "tocou no destino"
  return 0
}

test_sem_nenhuma_tag_falha() {
  ambiente
  git_real -C "$SHIM_DIR/trabalho" push -q origin :refs/tags/v0.4.1 :refs/tags/v0.5.0
  rodar_instalar && _falhou "sem tag publicada deveria falhar"
  grep -qF "nenhuma versão publicada" "$TMP_OP/saida-instalar" || _falhou "mensagem: $(cat "$TMP_OP/saida-instalar")"
  [[ ! -e "$DESTINO" ]] || _falhou "não deveria criar o destino"
}

test_ultima_linha_e_main() {
  local ultima
  ultima="$(grep -v '^[[:space:]]*$' "$REPO_DIR/instalar.sh" | tail -n 1)"
  afirmar_igual "$ultima" 'main "$@"'
  # um download truncado (cortado antes do main) não executa nada
  ambiente
  head -n -2 "$REPO_DIR/instalar.sh" | head -n 60 >"$TMP_OP/truncado.sh"
  bash "$TMP_OP/truncado.sh" </dev/null >/dev/null 2>&1 || true
  [[ ! -e "$DESTINO" ]] || _falhou "o script truncado não deveria instalar nada"
  grep -qE '^set -euo pipefail$' "$REPO_DIR/instalar.sh" || _falhou "faltou set -euo pipefail"
}

test_nunca_usa_down_prune_volume_nem_rmi_forcado() {
  ambiente
  rodar_instalar || _falhou "deveria instalar"
  local padrao
  for padrao in 'down' 'prune' 'volume' 'rmi -f' 'rm -rf' 'rm -fr'; do
    grep -qE -- "$padrao" "$REPO_DIR/instalar.sh" && _falhou "instalar.sh não deveria conter '$padrao'"
  done
  for padrao in " down" "prune" "volume" "rmi"; do
    afirmar_log_nao_contem "$padrao"
  done
  return 0
}

test_resumo_mostra_https_ip_e_porta() {
  ambiente
  rodar_instalar || _falhou "deveria instalar"
  grep -qF "https://192.168.15.23/" "$TMP_OP/saida-instalar" || _falhou "deveria mostrar https://IP: $(cat "$TMP_OP/saida-instalar")"
  grep -qF "https://192.168.15.23:" "$TMP_OP/saida-instalar" && _falhou "na 443 não mostra porta"
  rm -rf "$DESTINO"
  SENTINELA_PORTA_HTTPS=9443 rodar_instalar || _falhou "deveria instalar na 9443"
  grep -qF "https://192.168.15.23:9443/" "$TMP_OP/saida-instalar" || _falhou "deveria mostrar a porta: $(cat "$TMP_OP/saida-instalar")"
  afirmar_igual "$(valor_do_env SENTINELA_PORTA_HTTPS)" "9443"
}

test_nada_le_a_entrada_padrao_do_script() {
  # curl | bash: o stdin é o próprio script; um filho que o lesse comeria o resto do download
  ambiente
  export SHIM_VIGIAR_STDIN=1
  printf 'linha que o script não pode consumir\n' | bash "$TMP_OP/instalar.sh" >"$TMP_OP/saida-instalar" 2>&1 ||
    _falhou "deveria instalar: $(cat "$TMP_OP/saida-instalar")"
  [[ ! -e "$SHIM_DIR/stdin.lido" ]] || _falhou "algum comando leu a entrada padrão"
}

executar_testes
