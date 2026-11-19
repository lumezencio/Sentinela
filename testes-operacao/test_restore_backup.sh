#!/usr/bin/env bash
# Testes de backup.sh e restore.sh com o docker falso (nenhum contêiner real é tocado).
#   bash testes-operacao/test_restore_backup.sh
set -uo pipefail

# shellcheck source=testes-operacao/lib.sh
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/lib.sh"

fixture_backup() {
  printf 'ficticio' >"$TMP_OP/backup.tar.gz"
}

test_restore_recusa_arquivo_inexistente_ou_diretorio() {
  rodar_em_diretorio_temporario
  mkdir "$TMP_OP/uma-pasta"
  if bash restore.sh nao-existe.tar.gz --sim >/dev/null 2>&1; then _falhou "aceitou inexistente"; fi
  if bash restore.sh uma-pasta --sim >/dev/null 2>&1; then _falhou "aceitou diretório"; fi
  afirmar_log_nao_contem "compose"
  limpar_temporario
}

test_restore_arquivo_corrompido_nao_para_o_core() {
  rodar_em_diretorio_temporario
  fixture_backup
  SHIM_FALHAR="*backup-verificar*"
  export SHIM_FALHAR
  if bash restore.sh backup.tar.gz --sim >/dev/null 2>&1; then _falhou "deveria falhar"; fi
  afirmar_log_contem "backup-verificar"
  afirmar_log_nao_contem " stop"
  afirmar_log_nao_contem "restaurar"
  limpar_temporario
}

test_restore_ordem_verificar_parar_trocar_subir() {
  rodar_em_diretorio_temporario
  fixture_backup
  bash restore.sh backup.tar.gz --sim >/dev/null 2>&1 || _falhou "restore deveria funcionar"
  afirmar_ordem "backup-verificar" "compose stop core" "sentinela.cli restaurar" "compose up -d --no-deps --wait --wait-timeout 120 core"
  limpar_temporario
}

test_restore_falha_de_saude_restaura_o_pre_restore() {
  rodar_em_diretorio_temporario
  fixture_backup
  SHIM_FALHAR="1x:compose up*"
  export SHIM_FALHAR
  if bash restore.sh backup.tar.gz --sim >/dev/null 2>&1; then _falhou "deveria sair com erro"; fi
  [[ "$(grep -c 'sentinela.cli restaurar' "$SHIM_LOG")" -eq 2 ]] || _falhou "esperava 2 restaurações"
  afirmar_log_contem "restaurar /dados/backups/pre-restore-20261118T030100Z.tar.gz"
  [[ "$(grep -c 'compose up' "$SHIM_LOG")" -eq 2 ]] || _falhou "esperava 2 subidas do core"
  limpar_temporario
}

test_restore_falha_de_saude_sem_volta_sai_com_erro() {
  rodar_em_diretorio_temporario
  fixture_backup
  SHIM_FALHAR="compose up*"
  export SHIM_FALHAR
  saida="$(bash restore.sh backup.tar.gz --sim 2>&1)" && _falhou "deveria sair com erro"
  grep -q "pre-restore-20261118T030100Z" <<<"$saida" || _falhou "a mensagem deveria citar o pre-restore"
  limpar_temporario
}

test_restore_para_so_o_core() {
  rodar_em_diretorio_temporario
  fixture_backup
  bash restore.sh backup.tar.gz --sim >/dev/null 2>&1 || _falhou "restore deveria funcionar"
  afirmar_log_contem "compose stop core"
  # nenhum stop/rm/kill que não seja exatamente o core
  if grep -E 'compose.* (stop|rm|kill|restart)( |$)' "$SHIM_LOG" | grep -vE ' stop core$'; then
    _falhou "mexeu em serviço além do core"
  fi
  afirmar_log_nao_contem " web"
  limpar_temporario
}

test_restore_sem_sim_exige_confirmacao() {
  rodar_em_diretorio_temporario
  fixture_backup
  if echo "nao" | bash restore.sh backup.tar.gz >/dev/null 2>&1; then _falhou "deveria cancelar"; fi
  afirmar_log_nao_contem " stop"
  echo "sim" | bash restore.sh backup.tar.gz >/dev/null 2>&1 || _falhou "com 'sim' deveria restaurar"
  afirmar_log_contem "compose stop core"
  limpar_temporario
}

test_backup_exportar_copia_e_avisa_do_env() {
  rodar_em_diretorio_temporario
  saida="$(bash backup.sh --exportar "$TMP_OP/saida" 2>&1)" || _falhou "backup --exportar falhou"
  [[ -f "$TMP_OP/saida/manual-20261118T030000Z.tar.gz" ]] || _falhou "arquivo não foi copiado"
  if fs_suporta_modo; then
    afirmar_igual "$(stat -c %a "$TMP_OP/saida/manual-20261118T030000Z.tar.gz")" "600"
    afirmar_igual "$(stat -c %a "$TMP_OP/saida")" "700"
  else
    echo "    (modos de arquivo não verificáveis neste sistema de arquivos; o CI Linux confere)"
  fi
  # texto fixo do .env vindo de scripts/operacao-comum.sh
  aviso="$(bash -c 'source scripts/operacao-comum.sh; printf %s "$AVISO_ENV"')"
  grep -qF -- "$aviso" <<<"$saida" || _falhou "faltou o aviso do .env"
  afirmar_log_contem "cp core:/dados/backups/."
  limpar_temporario
}

test_backup_sem_argumento_chama_backup_criar_manual() {
  rodar_em_diretorio_temporario
  saida="$(bash backup.sh 2>&1)" || _falhou "backup.sh falhou"
  afirmar_log_contem "compose exec -T core python -m sentinela.cli backup-criar --origem manual"
  afirmar_log_nao_contem " cp "
  grep -q "manual-20261118T030000Z.tar.gz" <<<"$saida" || _falhou "deveria imprimir o nome"
  grep -q "SENTINELA_CHAVE_CREDENCIAIS" <<<"$saida" || _falhou "deveria avisar do .env"
  limpar_temporario
}

test_projeto_compose_respeita_sentinela_projeto() {
  rodar_em_diretorio_temporario
  SENTINELA_PROJETO="teste-descartavel" bash backup.sh >/dev/null 2>&1 || _falhou "falhou"
  afirmar_log_contem "compose -p teste-descartavel exec"
  limpar_temporario
}

test_nenhum_script_usa_down_prune_volume_nem_rmi_forcado() {
  rodar_em_diretorio_temporario
  fixture_backup
  bash backup.sh --exportar "$TMP_OP/saida" >/dev/null 2>&1 || true
  bash restore.sh backup.tar.gz --sim >/dev/null 2>&1 || true
  SHIM_FALHAR="1x:compose up*" bash restore.sh backup.tar.gz --sim >/dev/null 2>&1 || true
  local proibido
  for proibido in " down" "prune" "volume rm" "rmi -f" "docker rm" " rm -f" "-v sentinela"; do
    afirmar_log_nao_contem "$proibido"
    if grep -vE '^[[:space:]]*#' "$REPO_DIR/backup.sh" "$REPO_DIR/restore.sh" "$REPO_DIR/scripts/operacao-comum.sh" |
      grep -F -- "compose${proibido}" >/dev/null; then
      _falhou "texto dos scripts contém: $proibido"
    fi
  done
  if grep -vE '^[[:space:]]*#' "$REPO_DIR/backup.sh" "$REPO_DIR/restore.sh" "$REPO_DIR/scripts/operacao-comum.sh" |
    grep -E 'compose (-p [^ ]+ )?down|system prune|volume rm|rmi -f|docker rm|"\$@" down'; then
    _falhou "texto dos scripts usa comando proibido"
  fi
  limpar_temporario
}

executar_testes
