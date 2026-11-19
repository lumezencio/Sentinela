#!/usr/bin/env bash
# Testes de update.sh com docker/git/cosign/curl falsos (nenhum contêiner real é tocado).
#   bash testes-operacao/test_update.sh
set -uo pipefail

# shellcheck source=testes-operacao/lib.sh
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/lib.sh"

COMPOSE_CORE_UP="compose up -d --no-deps --no-build --pull never --wait --wait-timeout 120 core"
COMPOSE_WEB_UP="compose up -d --no-deps --no-build --pull never --wait --wait-timeout 120 web"
SAUDE="compose exec -T core python -c"
VOLTA_UP="compose up -d --no-deps --no-build --pull never --wait core web"

# ambiente: diretório temporário, repositório git (v0.4.0 atual, v0.5.0 no remoto) e .env
ambiente() {
  rodar_em_diretorio_temporario
  preparar_repositorio_git
}

# modo_publicadas: o .env passa a declarar IMAGENS=publicadas e VERSAO=0.4.0
modo_publicadas() {
  printf 'IMAGENS=publicadas\nVERSAO=0.4.0\n' >>"$TMP_OP/.env"
}

com_cosign() {
  PATH="$LIB_DIR/shims-cosign:$PATH"
  export PATH
}

atualizar() {
  bash update.sh "$@" >"$TMP_OP/saida-update" 2>&1
}

digests_ok() {
  SHIM_DIGESTS_TXT="core sha256:$(printf 'a%.0s' {1..64})
web sha256:$(printf 'b%.0s' {1..64})"
  export SHIM_DIGESTS_TXT
}

versao_atual() {
  git_real describe --tags --exact-match HEAD
}

linhas_de() {
  grep -c -- "$1" "$SHIM_LOG" || true
}

test_atualizacao_ok_na_ordem() {
  ambiente
  atualizar v0.5.0 || _falhou "deveria atualizar: $(cat "$TMP_OP/saida-update")"
  # backup só depois do preparo (build) e imediatamente antes da troca
  afirmar_ordem "$SAUDE" "git fetch --tags" "docker tag sha256:rodando-core ghcr.io/lumezencio/sentinela-core:pre_"     "git checkout -q --detach refs/tags/v0.5.0" "compose build core web" "backup-criar --origem atualizacao"     "$COMPOSE_CORE_UP" "$COMPOSE_WEB_UP"
  afirmar_log_contem "docker tag sha256:rodando-web ghcr.io/lumezencio/sentinela-web:pre_"
  afirmar_igual "$(versao_atual)" "v0.5.0"
  # a saúde é conferida depois de cada troca
  [[ "$(linhas_de "$SAUDE")" -ge 3 ]] || _falhou "esperava a saúde antes, depois do core e depois do web"
  [[ -f "$TMP_OP/.sentinela-pre-tags" ]] || _falhou "o manifesto deveria existir"
  [[ ! -e "$TMP_OP/.operacao.lock" ]] || _falhou "a trava deveria ser liberada"
  local copia
  copia="$(find "$TMP_OP" -maxdepth 1 -name ".env.pre_*" | head -n 1)"
  [[ -f "$copia" ]] || _falhou "faltou a cópia do .env"
  if fs_suporta_modo; then
    [[ "$(stat -c %a "$copia")" == "600" ]] || _falhou "a cópia do .env deveria ser 0600"
  fi
  grep -qF "Atualização concluída" "$TMP_OP/saida-update" || _falhou "faltou a mensagem final"
}

test_instalacao_antiga_sem_imagens_e_local_e_reconstroi() {
  ambiente
  atualizar v0.5.0 || _falhou "deveria atualizar"
  afirmar_log_contem "compose build core web"
  afirmar_log_nao_contem "compose pull"
  afirmar_log_nao_contem "cosign"
  grep -qE '^(IMAGENS|VERSAO)=' "$TMP_OP/.env" && _falhou "o modo local não grava IMAGENS/VERSAO"
  return 0
}

test_imagens_publicadas_migra_o_env_e_faz_pull() {
  ambiente
  com_cosign
  atualizar v0.5.0 --imagens-publicadas || _falhou "deveria atualizar: $(cat "$TMP_OP/saida-update")"
  afirmar_log_contem "compose pull core web"
  afirmar_log_nao_contem "compose build"
  afirmar_igual "$(grep -c '^IMAGENS=publicadas$' "$TMP_OP/.env")" "1"
  afirmar_igual "$(grep -c '^VERSAO=0.5.0$' "$TMP_OP/.env")" "1"
}

test_com_cosign_verifica_com_identidade_e_emissor_do_workflow_release() {
  ambiente
  modo_publicadas
  com_cosign
  atualizar v0.5.0 || _falhou "deveria atualizar"
  afirmar_log_contem 'cosign verify --certificate-identity https://github.com/lumezencio/sentinela/.github/workflows/release.yml@refs/tags/v0.5.0 --certificate-oidc-issuer https://token.actions.githubusercontent.com ghcr.io/lumezencio/sentinela-core@sha256:'
  afirmar_log_contem "ghcr.io/lumezencio/sentinela-web@sha256:"
  afirmar_log_nao_contem "curl"
  afirmar_ordem "compose pull core web" "cosign verify" "$COMPOSE_CORE_UP"
}

test_assinatura_invalida_aborta_antes_de_trocar_e_volta_arquivos() {
  ambiente
  modo_publicadas
  com_cosign
  export SHIM_FALHAR_COSIGN="*sentinela-web@*"
  if atualizar v0.5.0; then _falhou "deveria falhar"; fi
  afirmar_log_nao_contem "$COMPOSE_CORE_UP"
  afirmar_log_nao_contem " stop core"
  afirmar_igual "$(versao_atual)" "v0.4.0"
  grep -qx 'VERSAO=0.4.0' "$TMP_OP/.env" || _falhou "o .env deveria voltar"
}

test_sem_cosign_confere_digest_publicado() {
  ambiente
  modo_publicadas
  digests_ok
  atualizar v0.5.0 || _falhou "deveria atualizar: $(cat "$TMP_OP/saida-update")"
  afirmar_log_contem "curl -fsSL --proto =https --max-time 30 https://github.com/lumezencio/sentinela/releases/download/v0.5.0/digests.txt"
  afirmar_log_nao_contem "cosign"
  grep -qF "digests.txt do release" "$TMP_OP/saida-update" || _falhou "deveria avisar do cosign ausente"
}

test_digest_diferente_aborta_antes_de_trocar_qualquer_coisa() {
  ambiente
  modo_publicadas
  digests_ok
  SHIM_DIGEST_WEB="sha256:$(printf 'c%.0s' {1..64})"
  export SHIM_DIGEST_WEB
  if atualizar v0.5.0; then _falhou "deveria abortar"; fi
  afirmar_log_nao_contem "$COMPOSE_CORE_UP"
  afirmar_log_nao_contem " stop core"
  afirmar_log_nao_contem "sentinela.cli restaurar"
  afirmar_igual "$(versao_atual)" "v0.4.0"
  grep -qF "digest" "$TMP_OP/saida-update" || _falhou "deveria explicar o motivo"
}

test_sem_cosign_e_sem_digests_aborta() {
  ambiente
  modo_publicadas
  if atualizar v0.5.0; then _falhou "deveria abortar (fecha por padrão)"; fi
  afirmar_log_nao_contem "backup-criar"
  afirmar_log_nao_contem "compose pull"
  afirmar_igual "$(versao_atual)" "v0.4.0"
}

test_versao_igual_a_atual_nao_faz_nada() {
  ambiente
  # as imagens construídas são idênticas às que rodam: nada a trocar
  export SHIM_IGUAL=1
  atualizar v0.4.0 || _falhou "deveria sair com 0"
  grep -qF "já está na versão v0.4.0" "$TMP_OP/saida-update" || _falhou "faltou a mensagem"
  afirmar_log_contem "compose build core web"
  afirmar_log_nao_contem "backup-criar"
  afirmar_log_nao_contem "compose up"
  afirmar_log_nao_contem " stop core"
  afirmar_log_nao_contem "git checkout"
  [[ ! -e "$TMP_OP/.operacao.lock" ]] || _falhou "a trava deveria ser liberada"
  [[ -z "$(find "$TMP_OP" -maxdepth 1 -name ".env.pre_*")" ]] || _falhou "a cópia do .env desta execução deveria ser descartada"
}

test_checkout_igual_a_tag_mas_conteineres_antigos_atualiza() {
  ambiente
  # HEAD já está em v0.4.0, mas as imagens construídas diferem das que rodam: não é "já está na versão"
  atualizar v0.4.0 || _falhou "deveria atualizar: $(cat "$TMP_OP/saida-update")"
  afirmar_log_contem "backup-criar --origem atualizacao"
  afirmar_log_contem "$COMPOSE_CORE_UP"
  afirmar_log_contem "$COMPOSE_WEB_UP"
  afirmar_log_nao_contem "git checkout"
}

test_publicadas_versao_diferente_do_alvo_atualiza_mesmo_com_checkout_igual() {
  ambiente
  com_cosign
  printf 'IMAGENS=publicadas\nVERSAO=0.3.0\n' >>"$TMP_OP/.env"
  export SHIM_IGUAL=1
  # HEAD == v0.4.0, mas a versão que RODA (VERSAO=0.3.0) não é a do alvo
  atualizar v0.4.0 || _falhou "deveria atualizar: $(cat "$TMP_OP/saida-update")"
  afirmar_log_contem "compose pull core web"
  afirmar_log_contem "$COMPOSE_CORE_UP"
  grep -qx 'VERSAO=0.4.0' "$TMP_OP/.env" || _falhou "VERSAO deveria virar 0.4.0"
}

test_publicadas_ja_na_versao_so_com_ids_iguais() {
  ambiente
  com_cosign
  printf 'IMAGENS=publicadas\nVERSAO=0.5.0\n' >>"$TMP_OP/.env"
  # VERSAO == alvo, mas as imagens em execução não são as da tag local: atualiza
  atualizar v0.5.0 || _falhou "deveria atualizar"
  afirmar_log_contem "$COMPOSE_CORE_UP"
  : >"$SHIM_LOG"
  # agora as imagens em execução são as da tag: nada a fazer
  export SHIM_IGUAL=1
  atualizar v0.5.0 || _falhou "deveria sair com 0"
  grep -qF "já está na versão v0.5.0" "$TMP_OP/saida-update" || _falhou "faltou a mensagem: $(cat "$TMP_OP/saida-update")"
  afirmar_log_nao_contem "backup-criar"
  afirmar_log_nao_contem "compose pull"
  afirmar_log_nao_contem "compose up"
}

test_core_antigo_sem_backup_criar_usa_a_cli_da_imagem_nova() {
  ambiente
  export SHIM_SEM_BACKUP_CLI=1
  atualizar v0.5.0 || _falhou "deveria atualizar: $(cat "$TMP_OP/saida-update")"
  afirmar_log_nao_contem "compose exec -T core python -m sentinela.cli backup-criar"
  # contêiner avulso da imagem nova, depois do build e antes de qualquer troca
  afirmar_ordem "compose build core web" "compose run --rm --no-deps -T core python -m sentinela.cli backup-criar --origem atualizacao" "$COMPOSE_CORE_UP"
}

test_core_antigo_sem_backup_criar_e_backup_impossivel_para_antes_da_troca() {
  ambiente
  export SHIM_SEM_BACKUP_CLI=1
  export SHIM_FALHAR="*compose run --rm --no-deps -T core python -m sentinela.cli backup-criar*"
  if atualizar v0.5.0; then _falhou "deveria falhar"; fi
  afirmar_log_nao_contem "$COMPOSE_CORE_UP"
  afirmar_log_nao_contem " stop core"
  grep -qF "Caminho manual" "$TMP_OP/saida-update" || _falhou "deveria indicar o caminho manual"
  afirmar_igual "$(versao_atual)" "v0.4.0"
}

test_demo_usa_os_mesmos_arquivos_em_todas_as_chamadas() {
  ambiente
  : >"$TMP_OP/docker-compose.demo.yml"
  export SHIM_CONFIG_FILES="$TMP_OP/docker-compose.yml,$TMP_OP/docker-compose.demo.yml"
  export SHIM_FALHAR="*--wait-timeout 120 web"
  if atualizar v0.5.0; then _falhou "deveria falhar"; fi
  # inclui as chamadas do restore.sh feito pela volta
  afirmar_log_contem "sentinela.cli restaurar"
  local l
  while IFS= read -r l; do
    case "$l" in
      "docker compose version"*) ;;
      "docker compose "*)
        [[ "$l" == "docker compose -f docker-compose.yml -f docker-compose.demo.yml "* ||
          "$l" == "docker compose ps -q core" ]] || _falhou "compose sem os arquivos do core: $l"
        ;;
    esac
  done <"$SHIM_LOG"
}

test_sem_rotulo_dos_arquivos_compose_recusa_sem_alterar() {
  ambiente
  export SHIM_CONFIG_FILES="NENHUM"
  if atualizar v0.5.0; then _falhou "deveria recusar"; fi
  grep -qF "arquivos compose" "$TMP_OP/saida-update" || _falhou "deveria explicar"
  afirmar_log_nao_contem "backup-criar"
  afirmar_log_nao_contem "docker tag"
  afirmar_log_nao_contem "git checkout"
}

test_versao_anterior_a_instalada_e_recusada_sem_a_opcao() {
  ambiente
  git_real fetch -q --tags origin
  git_real checkout -q --detach v0.5.0
  if atualizar v0.4.0; then _falhou "deveria recusar o downgrade"; fi
  grep -qF "permitir-voltar-versao" "$TMP_OP/saida-update" || _falhou "deveria citar a opção"
  afirmar_log_nao_contem "backup-criar"
  afirmar_log_nao_contem "docker tag"
  atualizar v0.4.0 --permitir-voltar-versao || _falhou "deveria aceitar com a opção: $(cat "$TMP_OP/saida-update")"
  afirmar_log_contem "$COMPOSE_CORE_UP"
}

test_padrao_e_a_ultima_tag_de_versao() {
  ambiente
  git_real -C "$SHIM_DIR/outro" tag v0.5.1-rc1 && git_real -C "$SHIM_DIR/outro" push -q origin v0.5.1-rc1
  atualizar || _falhou "deveria atualizar"
  afirmar_igual "$(versao_atual)" "v0.5.0"
}

# volta completa: checkout anterior, tag, parar o core, restaurar o backup, subir sem build/pull
afirmar_volta_completa() {
  # o banco do backup volta ANTES de devolver checkout e imagens; a subida só depois de tudo
  afirmar_ordem "$COMPOSE_CORE_UP" "compose stop core" "sentinela.cli restaurar /dados/backups/sentinela-20261118T030000Z-atualizacao.tar.gz" "git checkout -q main" "docker tag ghcr.io/lumezencio/sentinela-core:pre_" "$VOLTA_UP"
  afirmar_igual "$(versao_atual)" "v0.4.0"
  [[ -f "$TMP_OP/.env" ]] || _falhou "faltou o .env"
  [[ ! -e "$TMP_OP/.operacao.lock" ]] || _falhou "a trava deveria ser liberada"
  grep -qF "Volta concluída" "$TMP_OP/saida-update" || _falhou "deveria confirmar a volta (conferida pela saúde e pelos IDs)"
  grep -qF "NÃO INTERROMPA" "$TMP_OP/saida-update" || _falhou "deveria pedir para não interromper"
  grep -qF "descartados" "$TMP_OP/saida-update" || _falhou "deveria avisar dos dados gravados depois do backup"
}

test_falha_de_saude_do_core_volta_imagem_banco_e_checkout() {
  ambiente
  modo_publicadas
  com_cosign
  # chamadas de saúde: 1 antes, 2 depois do core (falha), 3 depois da volta
  export SHIM_FALHAR="2-2:*$SAUDE*"
  if atualizar v0.5.0; then _falhou "deveria falhar"; fi
  afirmar_volta_completa
  afirmar_log_nao_contem "$COMPOSE_WEB_UP"
  afirmar_log_contem "compose logs --tail 30 core"
  grep -qx 'VERSAO=0.4.0' "$TMP_OP/.env" || _falhou "o .env deveria voltar"
  # a volta não usa alembic nem down
  afirmar_log_nao_contem "alembic"
}

test_falha_ao_subir_o_core_volta_tudo() {
  ambiente
  # só a primeira subida do core falha (o restore.sh também sobe o core na volta)
  export SHIM_FALHAR="1x:*--wait-timeout 120 core"
  if atualizar v0.5.0; then _falhou "deveria falhar"; fi
  afirmar_volta_completa
}

test_falha_de_saude_do_web_tambem_volta() {
  ambiente
  export SHIM_FALHAR="*--wait-timeout 120 web"
  if atualizar v0.5.0; then _falhou "deveria falhar"; fi
  afirmar_ordem "$COMPOSE_CORE_UP" "$COMPOSE_WEB_UP"
  afirmar_volta_completa
  # a volta sobe core e web
  afirmar_log_contem "$VOLTA_UP"
}

test_falha_no_pull_volta_sem_parar_o_core() {
  ambiente
  modo_publicadas
  com_cosign
  export SHIM_FALHAR="compose pull*"
  if atualizar v0.5.0; then _falhou "deveria falhar"; fi
  afirmar_log_nao_contem "$COMPOSE_CORE_UP"
  afirmar_log_nao_contem " stop core"
  afirmar_log_nao_contem "sentinela.cli restaurar"
  afirmar_igual "$(versao_atual)" "v0.4.0"
  grep -qx 'VERSAO=0.4.0' "$TMP_OP/.env" || _falhou "o .env deveria voltar"
  grep -qF "Nenhum contêiner tinha sido trocado" "$TMP_OP/saida-update" || _falhou "deveria dizer que nada foi trocado"
  [[ ! -e "$TMP_OP/.operacao.lock" ]] || _falhou "a trava deveria ser liberada"
}

test_falha_do_backup_volta_so_os_arquivos_e_nao_troca_nada() {
  ambiente
  export SHIM_FALHAR="*backup-criar*"
  if atualizar v0.5.0; then _falhou "deveria falhar"; fi
  afirmar_log_nao_contem "$COMPOSE_CORE_UP"
  afirmar_log_nao_contem " stop core"
  afirmar_log_nao_contem "sentinela.cli restaurar"
  afirmar_igual "$(versao_atual)" "v0.4.0"
  grep -qF "Nenhum contêiner tinha sido trocado" "$TMP_OP/saida-update" || _falhou "deveria dizer que nada foi trocado"
  [[ ! -e "$TMP_OP/.operacao.lock" ]] || _falhou "a trava deveria ser liberada"
}

test_volta_sem_confirmar_os_ids_das_imagens_nao_afirma_sucesso() {
  ambiente
  export SHIM_FALHAR="*--wait-timeout 120 web"
  export SHIM_ID_CORE_POS="sha256:outra-imagem"
  if atualizar v0.5.0; then _falhou "deveria falhar"; fi
  if grep -qF "Volta concluída" "$TMP_OP/saida-update"; then _falhou "não pode afirmar a volta sem conferir os IDs"; fi
  grep -qF "NÃO consegui confirmar" "$TMP_OP/saida-update" || _falhou "deveria dizer que não confirmou"
}

test_falha_ao_reverter_arquivos_ainda_mostra_estado_e_log() {
  ambiente
  export SHIM_FALHAR="*--wait-timeout 120 core|tag ghcr.io*"
  if atualizar v0.5.0; then _falhou "deveria falhar"; fi
  grep -qF "ERRO: não consegui restaurar tudo" "$TMP_OP/saida-update" || _falhou "deveria avisar"
  grep -qF "Estado atual:" "$TMP_OP/saida-update" || _falhou "deveria mostrar o estado"
  afirmar_log_contem "compose logs --tail 30 core"
  grep -qF "Volta manual" "$TMP_OP/saida-update" || _falhou "deveria listar a volta manual"
}

test_assinatura_ou_digest_ruim_remove_a_marcacao_da_versao_alvo() {
  ambiente
  modo_publicadas
  digests_ok
  SHIM_DIGEST_WEB="sha256:$(printf 'c%.0s' {1..64})"
  export SHIM_DIGEST_WEB
  if atualizar v0.5.0; then _falhou "deveria abortar"; fi
  afirmar_log_contem "docker rmi ghcr.io/lumezencio/sentinela-core:0.5.0 ghcr.io/lumezencio/sentinela-web:0.5.0"
  afirmar_log_nao_contem "rmi -f"
}

test_falha_ao_baixar_da_mensagem_clara() {
  ambiente
  modo_publicadas
  com_cosign
  export SHIM_FALHAR="compose pull*"
  if atualizar v0.5.0; then _falhou "deveria falhar"; fi
  grep -qF "não consegui baixar as imagens da versão 0.5.0" "$TMP_OP/saida-update" || _falhou "faltou a mensagem clara"
}

test_cosign_e_digest_usam_a_entrada_do_proprio_repositorio() {
  ambiente
  modo_publicadas
  com_cosign
  atualizar v0.5.0 || _falhou "deveria atualizar"
  # o shim lista antes uma entrada de outro registro: o cosign só pode receber a do repo
  afirmar_log_nao_contem "outro.example"
}

test_interrupcao_depois_de_concluir_sai_com_zero_e_avisa() {
  ambiente
  sinal_durante "image ls*" TERM "image ls"
  afirmar_igual "$RC_SINAL" "0"
  grep -qF "já tinha terminado" "$TMP_OP/saida-update" || _falhou "deveria avisar"
  [[ ! -e "$TMP_OP/.operacao.lock" ]] || _falhou "a trava deveria ser liberada"
}

test_trava_grava_o_pid_e_filho_so_herda_se_o_pid_confere() {
  ambiente
  bash -c 'source scripts/operacao-comum.sh; trava_adquirir; cat .operacao.lock/pid; echo $$' >"$TMP_OP/saida-trava"
  afirmar_igual "$(sed -n 1p "$TMP_OP/saida-trava")" "$(sed -n 2p "$TMP_OP/saida-trava")"
  # trava de outro dono: SENTINELA_TRAVA_PAI que não bate com o PID gravado é recusado
  mkdir "$TMP_OP/.operacao.lock"
  echo 999999 >"$TMP_OP/.operacao.lock/pid"
  printf 'x' >"$TMP_OP/backup.tar.gz"
  if SENTINELA_TRAVA_PAI=$$ bash restore.sh backup.tar.gz --sim >/dev/null 2>&1; then _falhou "herdou uma trava que não é do pai"; fi
  if SENTINELA_TRAVA_PAI=999999 bash restore.sh backup.tar.gz --sim >/dev/null 2>&1; then _falhou "herdou sem ser o PPID"; fi
  afirmar_log_nao_contem "compose stop"
}

# sinal_durante PADRAO_DORMIR SINAL TEXTO: roda update.sh v0.5.0 e manda o sinal quando TEXTO
# aparece no log; deixa a saída em saida-update e o código em RC_SINAL
sinal_durante() {
  export SHIM_DORMIR="$1"
  # set -m: com controle de jobs o processo em segundo plano nasce com SIGINT tratável
  # (sem ele o shell não interativo o deixa ignorado e o trap de INT nunca dispararia)
  set -m
  bash update.sh v0.5.0 >"$TMP_OP/saida-update" 2>&1 &
  local pid=$! i
  set +m
  for ((i = 0; i < 150; i++)); do
    grep -qF -- "$3" "$SHIM_LOG" && break
    sleep 0.1
  done
  grep -qF -- "$3" "$SHIM_LOG" || _falhou "a chamada '$3' não começou"
  kill -"$2" "$pid"
  RC_SINAL=0
  wait "$pid" || RC_SINAL=$?
}

# log_depois_de TEXTO: linhas do log depois da última que casa com TEXTO
log_depois_de() {
  awk -v t="$1" '{ l[NR] = $0 } index($0, t) { n = NR } END { for (i = n + 1; i <= NR; i++) print l[i] }' "$SHIM_LOG"
}

test_sigint_no_meio_so_relata_fatos_sem_agir() {
  ambiente
  sinal_durante "*--wait-timeout 120 core" INT "$COMPOSE_CORE_UP"
  local s="$TMP_OP/saida-update"
  afirmar_igual "$RC_SINAL" "130"
  grep -qF "Interrompido durante: trocando o core." "$s" || _falhou "deveria nomear a fase"
  grep -qF "core: Up" "$s" || _falhou "deveria mostrar o estado real (compose ps)"
  grep -qF "sentinela-20261118T030000Z-atualizacao.tar.gz" "$s" || _falhou "deveria citar o backup"
  grep -qE "sentinela-core:pre_[0-9]{8}T[0-9]{6}Z" "$s" || _falhou "deveria citar a marcação pre_"
  grep -qF "./restore.sh --do-volume sentinela-20261118T030000Z-atualizacao.tar.gz --sim" "$s" || _falhou "faltou o comando de volta"
  grep -qF "up -d --no-deps --no-build --pull never --wait core web" "$s" || _falhou "faltou o comando de subida"
  # nenhuma ação depois da interrupção
  local depois
  depois="$(log_depois_de "$COMPOSE_CORE_UP")"
  if grep -qE 'stop|restaurar|compose up|docker tag|git checkout' <<<"$depois"; then
    _falhou "agiu depois do sinal: $depois"
  fi
  [[ ! -e "$TMP_OP/.operacao.lock" ]] || _falhou "a trava deveria ser liberada"
  if grep -qiE "volta concluída|restaurado com sucesso" "$s"; then _falhou "não pode afirmar o que não conferiu"; fi
}

test_sigterm_antes_de_trocar_contêiner_desfaz_so_os_arquivos() {
  ambiente
  modo_publicadas
  com_cosign
  sinal_durante "compose pull*" TERM "compose pull core web"
  afirmar_igual "$RC_SINAL" "130"
  afirmar_igual "$(versao_atual)" "v0.4.0"
  grep -qx 'VERSAO=0.4.0' "$TMP_OP/.env" || _falhou "o .env deveria voltar"
  grep -qF "Nenhum contêiner tinha sido trocado" "$TMP_OP/saida-update" || _falhou "deveria relatar"
  afirmar_log_nao_contem " stop core"
  afirmar_log_nao_contem "sentinela.cli restaurar"
  [[ ! -e "$TMP_OP/.operacao.lock" ]] || _falhou "a trava deveria ser liberada"
}

test_sighup_tambem_relata() {
  ambiente
  sinal_durante "*--wait-timeout 120 core" HUP "$COMPOSE_CORE_UP"
  afirmar_igual "$RC_SINAL" "130"
  grep -qF "Interrompido durante" "$TMP_OP/saida-update" || _falhou "faltou o relatório"
}

test_arvore_suja_recusa_sem_tocar_em_nada() {
  ambiente
  echo "# alteração local" >>"$TMP_OP/docker-compose.yml"
  if atualizar v0.5.0; then _falhou "deveria recusar"; fi
  afirmar_log_nao_contem "backup-criar"
  afirmar_log_nao_contem "docker tag"
  afirmar_log_nao_contem "git checkout"
  afirmar_log_nao_contem "compose up"
  grep -qF "alterações locais" "$TMP_OP/saida-update" || _falhou "deveria explicar"
  grep -qF "# alteração local" "$TMP_OP/docker-compose.yml" || _falhou "a alteração do usuário foi perdida"
  [[ ! -e "$TMP_OP/.operacao.lock" ]] || _falhou "a trava deveria ser liberada"
}

test_segunda_instancia_recusada_pela_trava() {
  ambiente
  mkdir "$TMP_OP/.operacao.lock"
  if atualizar v0.5.0; then _falhou "deveria recusar"; fi
  grep -qF "outra operação" "$TMP_OP/saida-update" || _falhou "deveria citar a outra operação"
  afirmar_log_nao_contem "backup-criar"
  afirmar_log_nao_contem "docker tag"
  [[ -d "$TMP_OP/.operacao.lock" ]] || _falhou "não pode apagar a trava de outra operação"
}

test_limpar_pre_guarda_3_e_so_as_do_manifesto() {
  ambiente
  local m r="ghcr.io/lumezencio/sentinela-core"
  # manifesto com 5 marcações próprias; mais uma pre_ feita à mão (fora do manifesto), outra imagem e latest
  printf '%s\n' "$r:pre_20260101T000000Z" "$r:pre_20260102T000000Z" "$r:pre_20260103T000000Z" "$r:pre_20260104T000000Z" "$r:pre_20260105T000000Z" >"$TMP_OP/.sentinela-pre-tags"
  SHIM_IMAGENS="$r:pre_20260101T000000Z $r:pre_20260102T000000Z $r:pre_20260103T000000Z $r:pre_20260104T000000Z $r:pre_20260105T000000Z $r:pre_20250101T000000Z outro/app:pre_20250101T000000Z $r:latest ghcr.io/lumezencio/sentinela-web:pre_x"
  export SHIM_IMAGENS
  atualizar v0.5.0 || _falhou "deveria atualizar"
  afirmar_igual "$(linhas_de 'docker rmi')" "2"
  afirmar_log_contem "docker rmi $r:pre_20260101T000000Z"
  afirmar_log_contem "docker rmi $r:pre_20260102T000000Z"
  # a marcação feita à mão (e as demais) sobrevivem
  afirmar_log_nao_contem "docker rmi $r:pre_20250101T000000Z"
  afirmar_log_nao_contem "outro/app"
  afirmar_log_nao_contem "rmi -f"
  afirmar_log_nao_contem "rmi --force"
  m="$(cat "$TMP_OP/.sentinela-pre-tags")"
  [[ "$m" == *pre_20260103T000000Z* && "$m" != *pre_20260101T000000Z* ]] || _falhou "o manifesto deveria guardar só as 3 mais recentes"
}

test_env_com_imagens_invalida_recusa() {
  ambiente
  printf 'IMAGENS=qualquer\nVERSAO=0.4.0\n' >>"$TMP_OP/.env"
  if atualizar v0.5.0; then _falhou "deveria recusar"; fi
  grep -qF "IMAGENS" "$TMP_OP/saida-update" || _falhou "deveria citar IMAGENS"
  afirmar_log_nao_contem "backup-criar"
  afirmar_log_nao_contem "docker tag"
}

test_versao_invalida_ou_inexistente_recusa() {
  ambiente
  if atualizar "main"; then _falhou "aceitou ramo"; fi
  if atualizar "v9.9.9"; then _falhou "aceitou tag inexistente"; fi
  if atualizar "--origem"; then _falhou "aceitou opção estranha"; fi
  afirmar_log_nao_contem "backup-criar"
}

test_nunca_usa_down_prune_volume_nem_outro_projeto() {
  ambiente
  export SENTINELA_PROJETO="teste-op"
  # falha do web: cobre também os comandos da volta
  export SHIM_FALHAR="*--wait-timeout 120 web"
  if atualizar v0.5.0; then _falhou "deveria falhar"; fi
  afirmar_log_contem "sentinela.cli restaurar"
  afirmar_log_nao_contem " down"
  afirmar_log_nao_contem "prune"
  afirmar_log_nao_contem "volume"
  afirmar_log_nao_contem " -v"
  afirmar_log_nao_contem "reset --hard"
  afirmar_log_nao_contem "rmi -f"
  local l
  while IFS= read -r l; do
    case "$l" in
      "docker compose "*) [[ "$l" == "docker compose -p teste-op "* || "$l" == "docker compose version"* ]] || _falhou "compose sem -p: $l" ;;
    esac
  done <"$SHIM_LOG"
  # os scripts não têm esses comandos nem no texto
  if grep -vE '^[[:space:]]*#' "$REPO_DIR/update.sh" "$REPO_DIR/scripts/operacao-comum.sh" |
    grep -E 'compose (-p [^ ]+ )?down|prune|rmi -f|--force|reset --hard|down -v'; then
    _falhou "comando proibido no texto"
  fi
}

test_restore_herda_a_trava_do_update() {
  # a volta chama restore.sh com a trava do update: ele não pode recusá-la
  ambiente
  export SHIM_FALHAR="1x:*--wait-timeout 120 core"
  if atualizar v0.5.0; then _falhou "deveria falhar"; fi
  afirmar_log_contem "sentinela.cli restaurar /dados/backups/sentinela-20261118T030000Z-atualizacao.tar.gz"
  grep -qF "outra operação" "$TMP_OP/saida-update" && _falhou "o restore recusou a trava do pai"
  return 0
}

executar_testes
