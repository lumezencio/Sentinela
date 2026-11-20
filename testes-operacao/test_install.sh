#!/usr/bin/env bash
# Testes de install.sh com docker/uname/curl/cosign falsos e openssl real (nenhum contêiner real é tocado).
#   bash testes-operacao/test_install.sh
set -uo pipefail

# shellcheck source=testes-operacao/lib.sh
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/lib.sh"

# ambiente [novo]: diretório temporário com install.sh, .env.example e core/pyproject.toml.
# Com "novo" não há .env (instalação do zero); sem argumento o .env é o das Fases 1-3 (sem IMAGENS).
ambiente() {
  rodar_em_diretorio_temporario
  cp "$REPO_DIR/.env.example" "$TMP_OP/.env.example"
  : >"$TMP_OP/docker-compose.demo.yml"
  mkdir -p "$TMP_OP/core"
  printf '[project]\nname = "sentinela"\nversion = "0.4.0"\n' >"$TMP_OP/core/pyproject.toml"
  if [[ "${1:-}" == novo ]]; then rm -f "$TMP_OP/.env"; fi
  return 0
}

com_cosign() {
  PATH="$LIB_DIR/shims-cosign:$PATH"
  export PATH
}

digests_ok() {
  SHIM_DIGESTS_TXT="core sha256:$(printf 'a%.0s' {1..64})
web sha256:$(printf 'b%.0s' {1..64})"
  export SHIM_DIGESTS_TXT
}

instalar() {
  bash install.sh "$@" >"$TMP_OP/saida-install" 2>&1
}

hash_env() {
  sha256sum "$TMP_OP/.env" | cut -d' ' -f1
}

nada_criado() {
  [[ ! -e "$TMP_OP/certs" ]] || _falhou "certs/ não deveria existir"
  [[ ! -e "$TMP_OP/.env" ]] || _falhou ".env não deveria existir"
  afirmar_log_nao_contem " up "
  afirmar_log_nao_contem " pull"
}

test_armv7_recusado_com_mensagem_clara_e_nada_criado() {
  ambiente novo
  export SHIM_ARCH=arm
  export SHIM_UNAME_M=armv7l
  if instalar; then _falhou "deveria recusar"; fi
  grep -qF "Raspberry Pi OS de 32 bits (armv7) não é suportado: instale o Raspberry Pi OS de 64 bits." "$TMP_OP/saida-install" ||
    _falhou "mensagem: $(cat "$TMP_OP/saida-install")"
  nada_criado
}

test_armv7_recusado_mesmo_com_build_e_so_pelo_uname() {
  ambiente novo
  export SHIM_ARCH=""
  export SHIM_UNAME_M=armv6l
  if instalar --build; then _falhou "deveria recusar"; fi
  grep -qF "64 bits" "$TMP_OP/saida-install" || _falhou "faltou a sugestão de 64 bits"
  nada_criado
}

# publicadas_na_arquitetura ARQ UNAME_M: instalação nova nessa arquitetura baixa, verifica e sobe sem build
publicadas_na_arquitetura() {
  ambiente novo
  com_cosign
  export SHIM_ARCH="$1" SHIM_UNAME_M="$2"
  instalar || _falhou "$1: $(cat "$TMP_OP/saida-install")"
  afirmar_log_contem "compose pull core web"
  afirmar_log_contem "compose up -d --no-build --pull never --wait --wait-timeout 300"
  afirmar_log_nao_contem "--build --wait"
  afirmar_ordem "compose pull core web" "cosign verify" "compose up -d --no-build"
  grep -qx 'IMAGENS=publicadas' "$TMP_OP/.env" || _falhou "IMAGENS"
  grep -qx 'VERSAO=0.4.0' "$TMP_OP/.env" || _falhou "VERSAO"
}

test_amd64_usa_pull_e_no_build() {
  publicadas_na_arquitetura amd64 x86_64
}

test_arm64_usa_pull_e_no_build() {
  publicadas_na_arquitetura arm64 aarch64
}

test_arquitetura_desconhecida_exige_build() {
  ambiente novo
  com_cosign
  export SHIM_ARCH=riscv64 SHIM_UNAME_M=riscv64
  if instalar; then _falhou "deveria exigir --build"; fi
  grep -qF "use ./install.sh --build" "$TMP_OP/saida-install" || _falhou "faltou a sugestão"
  nada_criado
  instalar --build || _falhou "com --build deveria seguir: $(cat "$TMP_OP/saida-install")"
  afirmar_log_contem "compose up -d --build --wait --wait-timeout 300"
}

test_build_forca_locais_e_usa_up_build() {
  ambiente novo
  instalar --build || _falhou "$(cat "$TMP_OP/saida-install")"
  afirmar_log_contem "compose up -d --build --wait --wait-timeout 300"
  afirmar_log_nao_contem "compose pull"
  afirmar_log_nao_contem "cosign"
  afirmar_log_nao_contem "curl"
  grep -qx 'IMAGENS=locais' "$TMP_OP/.env" || _falhou "IMAGENS deveria ser locais"
  grep -qx 'VERSAO=' "$TMP_OP/.env" || _falhou "VERSAO deveria ficar vazia"
}

test_env_antigo_vira_locais_sem_alterar_as_chaves() {
  ambiente
  printf 'SENTINELA_PORTA_HTTPS=8443\nSENTINELA_FUSO=America/Sao_Paulo' >>"$TMP_OP/.env" # sem \n final
  local antes
  antes="$(cat "$TMP_OP/.env")"
  instalar || _falhou "$(cat "$TMP_OP/saida-install")"
  grep -qF "instalação anterior: continua construindo aqui; use ./update.sh --imagens-publicadas para migrar" "$TMP_OP/saida-install" ||
    _falhou "faltou o aviso"
  # as linhas originais seguem idênticas; só IMAGENS=locais foi acrescentada
  afirmar_igual "$(grep -vx 'IMAGENS=locais' "$TMP_OP/.env")" "$antes"
  afirmar_igual "$(grep -c '^IMAGENS=locais$' "$TMP_OP/.env")" "1"
  if grep -q '^VERSAO=' "$TMP_OP/.env"; then _falhou "VERSAO não deve ser criada em modo locais"; fi
  afirmar_log_contem "compose up -d --build --wait"
  afirmar_log_nao_contem "compose pull"
}

test_env_novo_grava_a_rede_sugerida_do_instalar_sh() {
  ambiente novo
  com_cosign
  SENTINELA_REDE_SUGERIDA=192.168.15.0/24 SENTINELA_GATEWAY_SUGERIDO=192.168.15.1 instalar --build ||
    _falhou "$(cat "$TMP_OP/saida-install")"
  grep -qx 'SENTINELA_REDE_SUGERIDA=192.168.15.0/24' "$TMP_OP/.env" || _falhou "rede sugerida não gravada"
  grep -qx 'SENTINELA_GATEWAY_SUGERIDO=192.168.15.1' "$TMP_OP/.env" || _falhou "gateway sugerido não gravado"
  # valor estranho (quebra de linha, texto) vira vazio: nada de injeção no .env
  rm -f "$TMP_OP/.env"
  SENTINELA_REDE_SUGERIDA=$'10.0.0.0/24
X=1' SENTINELA_GATEWAY_SUGERIDO="abc" instalar --build ||
    _falhou "$(cat "$TMP_OP/saida-install")"
  grep -qx 'SENTINELA_REDE_SUGERIDA=' "$TMP_OP/.env" || _falhou "valor inválido deveria ficar vazio"
  grep -qx 'SENTINELA_GATEWAY_SUGERIDO=' "$TMP_OP/.env" || _falhou "gateway inválido deveria ficar vazio"
  if grep -q '^X=1' "$TMP_OP/.env"; then _falhou "injeção no .env"; fi
}

test_versao_vem_do_pyproject() {
  ambiente novo
  com_cosign
  printf '[project]\nname = "sentinela"\nversion = "1.2.3"\n' >"$TMP_OP/core/pyproject.toml"
  instalar || _falhou "$(cat "$TMP_OP/saida-install")"
  grep -qx 'VERSAO=1.2.3' "$TMP_OP/.env" || _falhou "VERSAO deveria ser 1.2.3"
  afirmar_log_contem "cosign verify --certificate-identity https://github.com/lumezencio/Sentinela/.github/workflows/release.yml@refs/tags/v1.2.3 "
}

test_pull_falho_sugere_build_e_nao_sobe_nada() {
  ambiente novo
  com_cosign
  export SHIM_FALHAR="*compose pull*"
  if instalar; then _falhou "deveria falhar"; fi
  grep -qF "imagem ghcr.io/lumezencio/sentinela-core:0.4.0 (ou -web) não encontrada no GHCR; use ./install.sh --build" "$TMP_OP/saida-install" ||
    _falhou "mensagem: $(cat "$TMP_OP/saida-install")"
  afirmar_log_nao_contem " up "
}

test_env_existente_nunca_e_sobrescrito() {
  ambiente
  printf 'IMAGENS=publicadas\nVERSAO=0.3.9\nSENTINELA_FUSO=UTC\n' >>"$TMP_OP/.env"
  com_cosign
  local h
  h="$(hash_env)"
  instalar || _falhou "$(cat "$TMP_OP/saida-install")"
  afirmar_igual "$(hash_env)" "$h"
  # a VERSAO já fixada no .env vale (não é trocada pela do pyproject)
  afirmar_log_contem "cosign verify --certificate-identity https://github.com/lumezencio/Sentinela/.github/workflows/release.yml@refs/tags/v0.3.9 "
}

test_env_publicadas_sem_versao_recebe_versao_do_pyproject() {
  ambiente
  printf 'IMAGENS=publicadas\n' >>"$TMP_OP/.env"
  com_cosign
  instalar || _falhou "$(cat "$TMP_OP/saida-install")"
  grep -qx 'VERSAO=0.4.0' "$TMP_OP/.env" || _falhou "VERSAO deveria ser preenchida"
  grep -qx 'SENTINELA_CHAVE_SESSAO=falsa' "$TMP_OP/.env" || _falhou "chaves devem ficar intactas"
}

test_sem_cosign_e_sem_digests_aborta_sem_criar_nada() {
  ambiente novo
  if instalar; then _falhou "deveria abortar (fecha por padrão)"; fi
  nada_criado
}

test_sem_cosign_confere_digests_do_release() {
  ambiente novo
  digests_ok
  instalar || _falhou "$(cat "$TMP_OP/saida-install")"
  afirmar_log_contem "curl -fsSL --proto =https --max-time 30 https://github.com/lumezencio/Sentinela/releases/download/v0.4.0/digests.txt"
}

test_digest_diferente_nao_sobe_nada() {
  ambiente novo
  digests_ok
  SHIM_DIGEST_WEB="sha256:$(printf 'c%.0s' {1..64})"
  export SHIM_DIGEST_WEB
  if instalar; then _falhou "deveria recusar a imagem"; fi
  afirmar_log_nao_contem " up "
}

test_help_lista_build() {
  ambiente novo
  instalar --help || _falhou "help"
  grep -qF -- "--build" "$TMP_OP/saida-install" || _falhou "o --help deveria listar --build"
  grep -qF -- "--demo" "$TMP_OP/saida-install" || _falhou "o --help deveria listar --demo"
  afirmar_igual "$(wc -c <"$SHIM_LOG" | tr -d ' ')" "0"
}

test_help_nao_imprime_codigo_do_script() {
  ambiente novo
  instalar --help || _falhou "help"
  if grep -qF "set -euo pipefail" "$TMP_OP/saida-install"; then _falhou "o --help vazou código do script"; fi
  grep -qF "./install.sh --build" "$TMP_OP/saida-install" || _falhou "o --help perdeu o conteúdo"
}

test_build_sobre_env_publicadas_grava_locais() {
  ambiente
  printf 'IMAGENS=publicadas
VERSAO=0.3.9
' >>"$TMP_OP/.env"
  instalar --build || _falhou "$(cat "$TMP_OP/saida-install")"
  grep -qx 'IMAGENS=locais' "$TMP_OP/.env" || _falhou "IMAGENS deveria virar locais"
  afirmar_igual "$(grep -c '^IMAGENS=' "$TMP_OP/.env")" "1"
  grep -qx 'VERSAO=0.3.9' "$TMP_OP/.env" || _falhou "VERSAO deve ficar como estava"
  afirmar_log_contem "compose up -d --build --wait"
}

test_verificacao_falha_descarta_so_as_tags_baixadas_agora() {
  ambiente novo
  com_cosign
  export SHIM_SEM_IMAGEM=1 SHIM_FALHAR_COSIGN="verify *"
  if instalar; then _falhou "deveria recusar"; fi
  afirmar_log_contem "docker rmi ghcr.io/lumezencio/sentinela-core:0.4.0"
  afirmar_log_contem "docker rmi ghcr.io/lumezencio/sentinela-web:0.4.0"
  afirmar_log_nao_contem "rmi -f"
  afirmar_log_nao_contem " up "
}

test_verificacao_falha_nao_remove_tag_que_ja_existia() {
  ambiente novo
  com_cosign
  export SHIM_FALHAR_COSIGN="verify *"
  if instalar; then _falhou "deveria recusar"; fi
  afirmar_log_nao_contem "rmi"
  afirmar_log_nao_contem " up "
}

test_cosign_antigo_orienta_a_atualizar() {
  ambiente novo
  com_cosign
  export SHIM_FALHAR_COSIGN="verify *" SHIM_COSIGN_VERSAO=v2.4.1
  if instalar; then _falhou "deveria recusar"; fi
  grep -qF "atualize o cosign (3.x ou mais novo)" "$TMP_OP/saida-install" || _falhou "mensagem: $(cat "$TMP_OP/saida-install")"
  if grep -qF "não confere com o workflow" "$TMP_OP/saida-install"; then _falhou "mensagem enganosa de adulteração"; fi
}

test_cosign_novo_que_falha_diz_que_nao_confere() {
  ambiente novo
  com_cosign
  export SHIM_FALHAR_COSIGN="verify *"
  if instalar; then _falhou "deveria recusar"; fi
  grep -qF "não confere com o workflow de release de v0.4.0" "$TMP_OP/saida-install" || _falhou "mensagem: $(cat "$TMP_OP/saida-install")"
}

CAND_CORE="sha256:$(printf 'a%.0s' {1..64})"
CAND_WEB="sha256:$(printf 'b%.0s' {1..64})"

test_candidata_por_digest_sobe_sem_cosign_nem_digests_txt() {
  ambiente novo
  export SENTINELA_CANDIDATA_CORE="$CAND_CORE" SENTINELA_CANDIDATA_WEB="$CAND_WEB"
  instalar || _falhou "$(cat "$TMP_OP/saida-install")"
  afirmar_log_contem "docker pull ghcr.io/lumezencio/sentinela-core@$CAND_CORE"
  afirmar_log_contem "docker pull ghcr.io/lumezencio/sentinela-web@$CAND_WEB"
  afirmar_log_contem "docker tag ghcr.io/lumezencio/sentinela-core@$CAND_CORE ghcr.io/lumezencio/sentinela-core:0.4.0"
  afirmar_log_nao_contem "compose pull"
  afirmar_log_nao_contem "curl"
  afirmar_ordem "docker pull ghcr.io/lumezencio/sentinela-core@" "docker tag" "compose up -d --no-build --pull never"
}

test_candidata_com_digest_diferente_nao_sobe_e_descarta() {
  ambiente novo
  export SENTINELA_CANDIDATA_CORE="$CAND_CORE" SENTINELA_CANDIDATA_WEB="$CAND_WEB"
  SHIM_DIGEST_WEB="sha256:$(printf 'c%.0s' {1..64})"
  export SHIM_DIGEST_WEB SHIM_SEM_IMAGEM=1
  if instalar; then _falhou "deveria recusar"; fi
  grep -qF "difere do digest aprovado" "$TMP_OP/saida-install" || _falhou "mensagem: $(cat "$TMP_OP/saida-install")"
  afirmar_log_contem "docker rmi ghcr.io/lumezencio/sentinela-web:0.4.0"
  afirmar_log_nao_contem " up "
}

test_candidata_exige_os_dois_digests_validos() {
  ambiente novo
  export SENTINELA_CANDIDATA_CORE="$CAND_CORE"
  if instalar; then _falhou "deveria recusar (falta o digest do web)"; fi
  export SENTINELA_CANDIDATA_WEB="latest"
  if instalar; then _falhou "deveria recusar (digest inválido)"; fi
  nada_criado
}

test_demo_continua_funcionando_em_modo_locais() {
  ambiente
  instalar --demo || _falhou "$(cat "$TMP_OP/saida-install")"
  afirmar_log_contem "compose -f docker-compose.demo.yml up -d --build --wait --wait-timeout 300"
  afirmar_log_contem "criar-admin --login admin"
  grep -qF "Modo demonstração" "$TMP_OP/saida-install" || _falhou "faltou o resumo da demonstração"
}

test_nunca_derruba_nem_apaga() {
  ambiente novo
  com_cosign
  instalar || _falhou "$(cat "$TMP_OP/saida-install")"
  afirmar_log_nao_contem " down"
  afirmar_log_nao_contem "prune"
  afirmar_log_nao_contem "rmi"
  afirmar_log_nao_contem " -v"
}

executar_testes
