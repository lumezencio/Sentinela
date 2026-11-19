#!/usr/bin/env bash
# Testes de backup.sh e restore.sh com o docker falso (nenhum contêiner real é tocado).
#   bash testes-operacao/test_restore_backup.sh
set -uo pipefail

# shellcheck source=testes-operacao/lib.sh
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/lib.sh"

fixture_backup() {
  printf 'conteudo-ficticio-do-backup' >"$TMP_OP/backup.tar.gz"
}

# texto dos scripts sem linhas de comentário
texto_dos_scripts() {
  grep -vE '^[[:space:]]*#' "$REPO_DIR/backup.sh" "$REPO_DIR/restore.sh" "$REPO_DIR/scripts/operacao-comum.sh"
}

test_restore_recusa_arquivo_inexistente_ou_diretorio() {
  rodar_em_diretorio_temporario
  mkdir "$TMP_OP/uma-pasta"
  if bash restore.sh nao-existe.tar.gz --sim >/dev/null 2>&1; then _falhou "aceitou inexistente"; fi
  if bash restore.sh uma-pasta --sim >/dev/null 2>&1; then _falhou "aceitou diretório"; fi
  afirmar_log_nao_contem "compose"
}

test_restore_recusa_caminho_com_dois_pontos() {
  rodar_em_diretorio_temporario
  mkdir "$TMP_OP/a:b"
  : >"$TMP_OP/a:b/x.tar.gz"
  if bash restore.sh "a:b/x.tar.gz" --sim >/dev/null 2>&1; then _falhou "aceitou ':'"; fi
  afirmar_log_nao_contem "compose"
}

test_restore_arquivo_comecando_com_hifen_vira_caminho_relativo() {
  rodar_em_diretorio_temporario
  printf 'x' >"$TMP_OP/-estranho.tar.gz"
  bash restore.sh --sim -- -estranho.tar.gz >/dev/null 2>&1 || _falhou "deveria aceitar após --"
  afirmar_log_contem "compose stop core"
}

test_restore_arquivo_corrompido_nao_para_o_core() {
  rodar_em_diretorio_temporario
  fixture_backup
  export SHIM_FALHAR="*backup-verificar*"
  if bash restore.sh backup.tar.gz --sim >/dev/null 2>&1; then _falhou "deveria falhar"; fi
  afirmar_log_contem "backup-verificar"
  afirmar_log_nao_contem " stop"
  afirmar_log_nao_contem "sentinela.cli restaurar"
  afirmar_log_contem "rm -f /dados/backups/.entrada-"
}

test_restore_ordem_verificar_parar_trocar_subir() {
  rodar_em_diretorio_temporario
  fixture_backup
  bash restore.sh backup.tar.gz --sim >/dev/null 2>&1 || _falhou "restore deveria funcionar"
  afirmar_ordem "cat >" "backup-verificar" "compose stop core" "sentinela.cli restaurar" \
    "compose up -d --no-deps --wait --wait-timeout 120 core" "rm -f /dados/backups/.entrada-"
}

test_restore_envia_o_arquivo_por_stdin_sem_bind_mount() {
  rodar_em_diretorio_temporario
  fixture_backup
  bash restore.sh backup.tar.gz --sim >/dev/null 2>&1 || _falhou "restore deveria funcionar"
  afirmar_log_nao_contem " -v "
  afirmar_log_nao_contem "--volume"
  afirmar_log_nao_contem "/entrada"
  afirmar_log_contem "umask 077; cat >"
  afirmar_igual "$(cat "$SHIM_DIR/stdin.recebido")" "conteudo-ficticio-do-backup"
  # a verificação e a restauração usam o caminho dentro do volume
  afirmar_log_contem "backup-verificar /dados/backups/.entrada-"
  afirmar_log_contem "sentinela.cli restaurar /dados/backups/.entrada-"
}

test_restore_usa_run_avulso_e_nunca_exec() {
  rodar_em_diretorio_temporario
  fixture_backup
  bash restore.sh backup.tar.gz --sim >/dev/null 2>&1 || _falhou "restore deveria funcionar"
  local l
  while IFS= read -r l; do
    [[ "$l" == "docker compose run --rm --no-deps -T "* ]] || _falhou "chamada sem run --rm --no-deps: $l"
  done < <(grep -E 'sentinela.cli (restaurar|backup-verificar)|cat >|rm -f' "$SHIM_LOG")
  afirmar_log_nao_contem " exec "
}

test_restore_falha_de_saude_restaura_o_pre_restore() {
  rodar_em_diretorio_temporario
  fixture_backup
  export SHIM_FALHAR="1x:compose up*"
  if bash restore.sh backup.tar.gz --sim >/dev/null 2>&1; then _falhou "deveria sair com erro"; fi
  [[ "$(grep -c 'sentinela.cli restaurar' "$SHIM_LOG")" -eq 2 ]] || _falhou "esperava 2 restaurações"
  afirmar_log_contem "restaurar /dados/backups/pre-restore-20261118T030100Z.tar.gz"
  [[ "$(grep -c 'compose up' "$SHIM_LOG")" -eq 2 ]] || _falhou "esperava 2 subidas do core"
}

test_restore_falha_de_saude_sem_volta_sai_com_erro() {
  rodar_em_diretorio_temporario
  fixture_backup
  export SHIM_FALHAR="compose up*"
  local saida
  saida="$(bash restore.sh backup.tar.gz --sim 2>&1)" && _falhou "deveria sair com erro"
  grep -q "pre-restore-20261118T030100Z" <<<"$saida" || _falhou "a mensagem deveria citar o pre-restore"
}

test_restore_falha_da_restauracao_depois_do_stop_sobe_o_core() {
  rodar_em_diretorio_temporario
  fixture_backup
  export SHIM_FALHAR="*sentinela.cli restaurar*"
  if bash restore.sh backup.tar.gz --sim >/dev/null 2>&1; then _falhou "deveria sair com erro"; fi
  afirmar_ordem "compose stop core" "sentinela.cli restaurar" "compose up -d --no-deps --wait"
  afirmar_log_contem "rm -f /dados/backups/.entrada-"
  [[ "$(grep -c 'sentinela.cli restaurar' "$SHIM_LOG")" -eq 1 ]] || _falhou "não deveria tentar a volta do pre-restore"
}

test_restore_sinal_entre_stop_e_up_sobe_o_core() {
  rodar_em_diretorio_temporario
  fixture_backup
  export SHIM_DORMIR="*sentinela.cli restaurar*"
  bash restore.sh backup.tar.gz --sim >/dev/null 2>&1 &
  local pid=$! i
  for ((i = 0; i < 100; i++)); do
    grep -q 'sentinela.cli restaurar' "$SHIM_LOG" && break
    sleep 0.1
  done
  kill -TERM "$pid"
  if wait "$pid"; then _falhou "deveria sair com erro após o sinal"; fi
  afirmar_ordem "compose stop core" "sentinela.cli restaurar" "compose up -d --no-deps core" "rm -f /dados/backups/.entrada-"
}

test_restore_para_so_o_core() {
  rodar_em_diretorio_temporario
  fixture_backup
  bash restore.sh backup.tar.gz --sim >/dev/null 2>&1 || _falhou "restore deveria funcionar"
  afirmar_log_contem "compose stop core"
  if grep -E 'compose.* (stop|kill|restart)( |$)' "$SHIM_LOG" | grep -vE ' stop core$'; then
    _falhou "mexeu em serviço além do core"
  fi
  if grep -E 'compose.* up ' "$SHIM_LOG" | grep -v -- '--no-deps'; then
    _falhou "subiu serviço sem --no-deps"
  fi
  afirmar_log_nao_contem " web"
}

test_restore_sem_sim_exige_confirmacao() {
  rodar_em_diretorio_temporario
  fixture_backup
  if echo "nao" | bash restore.sh backup.tar.gz >/dev/null 2>&1; then _falhou "deveria cancelar"; fi
  afirmar_log_nao_contem " stop"
  echo "sim" | bash restore.sh backup.tar.gz >/dev/null 2>&1 || _falhou "com 'sim' deveria restaurar"
  afirmar_log_contem "compose stop core"
}

test_restore_recusa_com_trava_de_outra_operacao() {
  rodar_em_diretorio_temporario
  fixture_backup
  mkdir "$TMP_OP/.operacao.lock"
  if bash restore.sh backup.tar.gz --sim >/dev/null 2>&1; then _falhou "deveria recusar com a trava"; fi
  afirmar_log_nao_contem " stop"
  afirmar_log_nao_contem "cat >"
  [[ -d "$TMP_OP/.operacao.lock" ]] || _falhou "não pode apagar a trava de outra operação"
  rmdir "$TMP_OP/.operacao.lock"
  bash restore.sh backup.tar.gz --sim >/dev/null 2>&1 || _falhou "sem trava deveria restaurar"
  [[ ! -e "$TMP_OP/.operacao.lock" ]] || _falhou "a trava deveria ser liberada ao fim"
}

test_backup_exportar_copia_e_avisa_do_env() {
  rodar_em_diretorio_temporario
  local saida aviso
  saida="$(bash backup.sh --exportar "$TMP_OP/saida" 2>&1)" || _falhou "backup --exportar falhou"
  [[ -f "$TMP_OP/saida/manual-20261118T030000Z.tar.gz" ]] || _falhou "arquivo não foi copiado"
  if fs_suporta_modo; then
    afirmar_igual "$(stat -c %a "$TMP_OP/saida/manual-20261118T030000Z.tar.gz")" "600"
    afirmar_igual "$(stat -c %a "$TMP_OP/saida")" "700"
  else
    echo "    (modos de arquivo não verificáveis neste sistema de arquivos; o CI Linux confere)"
  fi
  aviso="$(bash -c 'source scripts/operacao-comum.sh; printf %s "$AVISO_ENV"')"
  grep -qF -- "$aviso" <<<"$saida" || _falhou "faltou o aviso do .env"
  afirmar_log_contem "cp core:/dados/backups/."
}

test_backup_exportar_em_pasta_existente_nao_muda_o_modo() {
  rodar_em_diretorio_temporario
  mkdir "$TMP_OP/ja-existe"
  printf 'meu' >"$TMP_OP/ja-existe/arquivo-do-dono.txt"
  if fs_suporta_modo; then chmod 755 "$TMP_OP/ja-existe"; fi
  bash backup.sh --exportar "$TMP_OP/ja-existe" >/dev/null 2>&1 || _falhou "falhou"
  [[ -f "$TMP_OP/ja-existe/arquivo-do-dono.txt" ]] || _falhou "mexeu no que já existia"
  if fs_suporta_modo; then afirmar_igual "$(stat -c %a "$TMP_OP/ja-existe")" "755"; fi
  afirmar_log_contem "cp core:/dados/backups/."
}

test_backup_exportar_erros_de_argumento() {
  rodar_em_diretorio_temporario
  local rc
  bash backup.sh --exportar >/dev/null 2>&1 && _falhou "faltou a pasta e aceitou"
  bash backup.sh --exportar "" >/dev/null 2>&1 && _falhou "pasta vazia aceita"
  bash backup.sh --exportar "a:b" >/dev/null 2>&1 && _falhou "':' aceito"
  bash backup.sh --coisa >/dev/null 2>&1 && _falhou "opção desconhecida aceita"
  : >"$TMP_OP/arquivo-comum"
  bash backup.sh --exportar "$TMP_OP/arquivo-comum" >/dev/null 2>&1 && _falhou "arquivo como destino aceito"
  bash backup.sh --exportar >/dev/null 2>&1
  rc=$?
  afirmar_igual "$rc" "2"
  afirmar_log_nao_contem " cp "
}

test_backup_exportar_pasta_com_hifen_vira_relativa() {
  rodar_em_diretorio_temporario
  bash backup.sh --exportar "-pasta" >/dev/null 2>&1 || _falhou "falhou"
  [[ -d "$TMP_OP/-pasta" ]] || _falhou "pasta não criada"
  afirmar_log_contem "cp core:/dados/backups/. ./-pasta"
}

test_backup_sem_argumento_chama_backup_criar_manual() {
  rodar_em_diretorio_temporario
  local saida
  saida="$(bash backup.sh 2>&1)" || _falhou "backup.sh falhou"
  afirmar_log_contem "compose exec -T core python -m sentinela.cli backup-criar --origem manual"
  afirmar_log_nao_contem " cp "
  grep -q "manual-20261118T030000Z.tar.gz" <<<"$saida" || _falhou "deveria imprimir o nome"
  grep -q "SENTINELA_CHAVE_CREDENCIAIS" <<<"$saida" || _falhou "deveria avisar do .env"
}

test_projeto_compose_respeita_sentinela_projeto() {
  rodar_em_diretorio_temporario
  SENTINELA_PROJETO="teste-descartavel" bash backup.sh >/dev/null 2>&1 || _falhou "falhou"
  afirmar_log_contem "compose -p teste-descartavel exec"
}

test_valor_env_tira_o_cr_do_fim_da_linha() {
  rodar_em_diretorio_temporario
  printf 'IMAGENS=locais\r\nVERSAO="0.4.0"\r\n' >.env
  afirmar_igual "$(bash -c 'source scripts/operacao-comum.sh; valor_env IMAGENS x')" "locais"
  afirmar_igual "$(bash -c 'source scripts/operacao-comum.sh; valor_env VERSAO x')" "0.4.0"
  afirmar_igual "$(bash -c 'source scripts/operacao-comum.sh; valor_env AUSENTE padrao')" "padrao"
}

test_nenhum_script_usa_down_prune_volume_nem_rmi_forcado() {
  rodar_em_diretorio_temporario
  fixture_backup
  bash backup.sh --exportar "$TMP_OP/saida" >/dev/null 2>&1 || true
  bash restore.sh backup.tar.gz --sim >/dev/null 2>&1 || true
  SHIM_FALHAR="1x:compose up*" bash restore.sh backup.tar.gz --sim >/dev/null 2>&1 || true
  local proibido
  for proibido in " down" "prune" "volume rm" "rmi -f" "docker rm" " rm -f" " --rmi" "-v sentinela"; do
    # "rm -f" só é aceito dentro do contêiner avulso, na cópia temporária de entrada
    [[ "$proibido" == " rm -f" ]] && continue
    afirmar_log_nao_contem "$proibido"
  done
  if texto_dos_scripts | grep -E '(^|[^[:alnum:]_-])(down|prune)([^[:alnum:]_-]|$)|volume rm|rmi -f|docker rm|system prune|[[:space:]]-v[[:space:]]+["$./~][^[:space:]]*:'; then
    _falhou "texto dos scripts usa comando proibido (down, prune, volume rm, rmi -f, -v)"
  fi
}

executar_testes
