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

test_restore_aceita_caminho_com_dois_pontos_pois_nao_chega_ao_compose() {
  rodar_em_diretorio_temporario
  mkdir "$TMP_OP/a:b"
  printf 'x' >"$TMP_OP/a:b/x.tar.gz"
  bash restore.sh "a:b/x.tar.gz" --sim >/dev/null 2>&1 || _falhou "o ':' não deveria importar aqui"
  afirmar_igual "$(cat "$SHIM_DIR/stdin.recebido")" "x"
  afirmar_log_nao_contem "a:b"
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
    "compose up -d --no-deps --wait --wait-timeout 120 core" "core rm -f /dados/backups/.entrada-2"
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
  [[ "$(grep -cE 'sentinela.cli (restaurar|backup-verificar)|cat >|rm -f' "$SHIM_LOG")" -ge 5 ]] ||
    _falhou "o grep não achou as chamadas esperadas (teste vazio)"
  afirmar_log_nao_contem " exec "
}

test_restore_falha_de_saude_restaura_o_pre_restore() {
  rodar_em_diretorio_temporario
  fixture_backup
  export SHIM_FALHAR="1x:compose up*"
  if bash restore.sh backup.tar.gz --sim >/dev/null 2>&1; then _falhou "deveria sair com erro"; fi
  [[ "$(grep -c 'sentinela.cli restaurar' "$SHIM_LOG")" -eq 2 ]] || _falhou "esperava 2 restaurações"
  afirmar_log_contem "restaurar /dados/backups/sentinela-20261118T030100Z-pre-restore.tar.gz"
  [[ "$(grep -c 'compose up' "$SHIM_LOG")" -eq 2 ]] || _falhou "esperava 2 subidas do core"
}

test_restore_falha_de_saude_sem_volta_sai_com_erro() {
  rodar_em_diretorio_temporario
  fixture_backup
  export SHIM_FALHAR="compose up*"
  local saida
  saida="$(bash restore.sh backup.tar.gz --sim 2>&1)" && _falhou "deveria sair com erro"
  grep -q "sentinela-20261118T030100Z-pre-restore" <<<"$saida" || _falhou "a mensagem deveria citar o pre-restore"
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

# sinal_durante PADRAO_DORMIR SINAL: roda o restore.sh e manda o sinal quando a chamada que
# casa com PADRAO_DORMIR começar; deixa a saída em $TMP_OP/saida-restore e o código em RC_SINAL
sinal_durante() {
  export SHIM_DORMIR="$1"
  bash restore.sh backup.tar.gz --sim >"$TMP_OP/saida-restore" 2>&1 &
  local pid=$! i
  for ((i = 0; i < 100; i++)); do
    grep -qF -- "${3:-$1}" "$SHIM_LOG" && break
    sleep 0.1
  done
  kill -"$2" "$pid"
  RC_SINAL=0
  wait "$pid" || RC_SINAL=$?
}

test_restore_sinal_entre_stop_e_up_sobe_o_core() {
  rodar_em_diretorio_temporario
  fixture_backup
  local sinal
  for sinal in TERM HUP; do
    : >"$SHIM_LOG"
    sinal_durante "*sentinela.cli restaurar*" "$sinal" "sentinela.cli restaurar"
    [[ "$RC_SINAL" -ne 0 ]] || _falhou "deveria sair com erro após $sinal"
    afirmar_ordem "compose stop core" "sentinela.cli restaurar" "compose up -d --no-deps core" "core rm -f /dados/backups/.entrada-2"
    [[ ! -e "$TMP_OP/.operacao.lock" ]] || _falhou "a trava deveria ser liberada após $sinal"
  done
}

test_restore_sinal_depois_de_restaurar_informa_o_pre_restore() {
  rodar_em_diretorio_temporario
  fixture_backup
  sinal_durante "*compose up -d --no-deps --wait*" TERM "compose up -d --no-deps --wait"
  [[ "$RC_SINAL" -ne 0 ]] || _falhou "deveria sair com erro (saúde não confirmada)"
  grep -q "espera pela saúde do core foi interrompida.*sentinela-20261118T030100Z-pre-restore" "$TMP_OP/saida-restore" ||
    _falhou "mensagem própria da espera de saúde com o pre-restore"
  afirmar_log_contem "rm -f /dados/backups/.entrada-"
}

test_restore_sinal_durante_o_restaurar_informa_o_pre_restore_novo() {
  rodar_em_diretorio_temporario
  fixture_backup
  local sinal
  for sinal in TERM HUP; do
    rm -f "$SHIM_DIR/.restaurou"
    : >"$SHIM_LOG"
    sinal_durante "*sentinela.cli restaurar*" "$sinal" "sentinela.cli restaurar"
    [[ "$RC_SINAL" -ne 0 ]] || _falhou "deveria sair com erro após $sinal"
    grep -q "pode já ter sido trocado.*sentinela-20261118T030100Z-pre-restore.tar.gz.*restaure esse arquivo" "$TMP_OP/saida-restore" ||
      _falhou "deveria informar o pre-restore novo (e não o antigo)"
    if grep -q "sentinela-20260101T000000Z-pre-restore" "$TMP_OP/saida-restore"; then _falhou "citou um pre-restore antigo"; fi
    afirmar_ordem "ls -1 -- sentinela-*-pre-restore.tar.gz" "sentinela.cli restaurar" "compose up -d --no-deps core"
    [[ "$(grep -c 'ls -1 -- sentinela-\*-pre-restore' "$SHIM_LOG")" -eq 2 ]] || _falhou "esperava listar antes e depois"
  done
}

test_restore_sinal_durante_a_volta_cita_so_o_pre_restore_original() {
  rodar_em_diretorio_temporario
  fixture_backup
  # saúde falha na 1ª subida; o 2º restaurar (a volta) dorme e recebe o sinal
  export SHIM_FALHAR="1x:compose up*"
  export SHIM_DORMIR="*sentinela.cli restaurar /dados/backups/sentinela-20261118T030100Z-pre-restore.tar.gz*"
  bash restore.sh backup.tar.gz --sim >"$TMP_OP/saida-restore" 2>&1 &
  local pid=$! i
  for ((i = 0; i < 100; i++)); do
    grep -q "restaurar /dados/backups/sentinela-20261118T030100Z" "$SHIM_LOG" && break
    sleep 0.1
  done
  kill -TERM "$pid"
  RC_SINAL=0
  wait "$pid" || RC_SINAL=$?
  [[ "$RC_SINAL" -ne 0 ]] || _falhou "deveria sair com erro"
  grep -q "durante a devolução.*original continua guardado em sentinela-20261118T030100Z-pre-restore.tar.gz.*restaure esse arquivo" "$TMP_OP/saida-restore" ||
    _falhou "deveria citar o pre-restore original"
  if grep -q "030200Z" "$TMP_OP/saida-restore"; then _falhou "citou o pre-restore criado pela volta"; fi
}

test_restore_falha_no_stop_tenta_subir_o_core() {
  rodar_em_diretorio_temporario
  fixture_backup
  export SHIM_FALHAR="*compose stop*"
  if bash restore.sh backup.tar.gz --sim >/dev/null 2>&1; then _falhou "deveria sair com erro"; fi
  afirmar_ordem "compose stop core" "compose up -d --no-deps core"
  afirmar_log_nao_contem "sentinela.cli restaurar"
}

test_restore_varre_orfaos_depois_da_trava_e_antes_de_gravar() {
  rodar_em_diretorio_temporario
  fixture_backup
  bash restore.sh backup.tar.gz --sim >/dev/null 2>&1 || _falhou "restore deveria funcionar"
  afirmar_ordem "sh -c rm -f /dados/backups/.entrada-*" "cat >" "backup-verificar"
  # a trava recusa antes da varredura
  rmdir "$TMP_OP/.operacao.lock" 2>/dev/null || true
  : >"$SHIM_LOG"
  mkdir "$TMP_OP/.operacao.lock"
  if bash restore.sh backup.tar.gz --sim >/dev/null 2>&1; then _falhou "deveria recusar"; fi
  afirmar_log_nao_contem ".entrada-"
}

test_restore_falha_na_varredura_nao_grava_nada() {
  rodar_em_diretorio_temporario
  fixture_backup
  export SHIM_FALHAR="*rm -f /dados/backups/.entrada-\**"
  if bash restore.sh backup.tar.gz --sim >/dev/null 2>&1; then _falhou "deveria sair com erro"; fi
  afirmar_log_nao_contem "cat >"
  afirmar_log_nao_contem " stop"
}

test_restore_para_so_o_core() {
  rodar_em_diretorio_temporario
  fixture_backup
  bash restore.sh backup.tar.gz --sim >/dev/null 2>&1 || _falhou "restore deveria funcionar"
  afirmar_log_contem "compose stop core"
  [[ "$(grep -cE 'compose.* stop core$' "$SHIM_LOG")" -ge 1 ]] || _falhou "não parou o core"
  if grep -E 'compose.* (stop|kill|restart|rm)( |$)' "$SHIM_LOG" |
    grep -vE ' stop core$| core (sh -c )?rm -f /dados/backups/\.entrada-'; then
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
  # cancelou antes de qualquer escrita: nem trava, nem varredura, nem cópia
  afirmar_log_nao_contem " stop"
  afirmar_log_nao_contem "cat >"
  afirmar_log_nao_contem "rm -f"
  [[ ! -e "$TMP_OP/.operacao.lock" ]] || _falhou "não deveria deixar trava"
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
  afirmar_log_nao_contem "rm -f"
  [[ -d "$TMP_OP/.operacao.lock" ]] || _falhou "não pode apagar a trava de outra operação"
  rmdir "$TMP_OP/.operacao.lock"
  bash restore.sh backup.tar.gz --sim >/dev/null 2>&1 || _falhou "sem trava deveria restaurar"
  [[ ! -e "$TMP_OP/.operacao.lock" ]] || _falhou "a trava deveria ser liberada ao fim"
}

test_backup_exportar_copia_e_avisa_do_env() {
  rodar_em_diretorio_temporario
  local saida aviso
  saida="$(bash backup.sh --exportar "$TMP_OP/saida" 2>&1)" || _falhou "backup --exportar falhou"
  [[ -f "$TMP_OP/saida/sentinela-20261118T030000Z-manual.tar.gz" ]] || _falhou "arquivo não foi copiado"
  if fs_suporta_modo; then
    afirmar_igual "$(stat -c %a "$TMP_OP/saida/sentinela-20261118T030000Z-manual.tar.gz")" "600"
    afirmar_igual "$(stat -c %a "$TMP_OP/saida")" "700"
  else
    echo "    (modos de arquivo não verificáveis neste sistema de arquivos; o CI Linux confere)"
  fi
  aviso="$(bash -c 'source scripts/operacao-comum.sh; printf %s "$AVISO_ENV"')"
  grep -qF -- "$aviso" <<<"$saida" || _falhou "faltou o aviso do .env"
  afirmar_log_contem "cp core:/dados/backups/sentinela-20261118T030000Z-manual.tar.gz"
  afirmar_log_contem "cp core:/dados/backups/sentinela-20261117T030000Z-diario.tar.gz"
  # toda origem de cp é um backup de nome estrito; nunca a pasta inteira
  local origem
  while IFS= read -r origem; do
    [[ "$origem" =~ ^core:/dados/backups/sentinela-[0-9]{8}T[0-9]{6}Z-[a-z-]+\.tar\.gz$ ]] || _falhou "origem de cp fora do padrão: $origem"
  done < <(grep ' cp ' "$SHIM_LOG" | awk '{print $(NF-1)}')
  [[ "$(grep -c ' cp ' "$SHIM_LOG")" -eq 2 ]] || _falhou "esperava 2 cópias, uma por backup"
  # arquivo de trabalho (nome com ponto) nunca sai do volume; nenhuma pasta de trabalho sobra
  [[ ! -e "$TMP_OP/saida/.entrada-1-2.tar.gz" ]] || _falhou "exportou um .entrada-*"
  [[ -z "$(find "$TMP_OP/saida" -name '.exportando.*')" ]] || _falhou "sobrou pasta de trabalho"
  [[ -z "$(find "$TMP_OP/saida" -name '.entrada-*')" ]] || _falhou "sobrou .entrada-*"
}

test_backup_exportar_em_pasta_existente_nao_muda_o_modo() {
  rodar_em_diretorio_temporario
  mkdir "$TMP_OP/ja-existe"
  printf 'meu' >"$TMP_OP/ja-existe/arquivo-do-dono.txt"
  if fs_suporta_modo; then chmod 755 "$TMP_OP/ja-existe"; fi
  bash backup.sh --exportar "$TMP_OP/ja-existe" >/dev/null 2>&1 || _falhou "falhou"
  [[ -f "$TMP_OP/ja-existe/arquivo-do-dono.txt" ]] || _falhou "mexeu no que já existia"
  if fs_suporta_modo; then afirmar_igual "$(stat -c %a "$TMP_OP/ja-existe")" "755"; fi
  afirmar_log_contem "cp core:/dados/backups/sentinela-"
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
  afirmar_log_contem "cp core:/dados/backups/sentinela-20261118T030000Z-manual.tar.gz ./-pasta/.exportando."
}

test_backup_exportar_interrompido_remove_a_pasta_de_trabalho() {
  rodar_em_diretorio_temporario
  local sinal pid i rc
  for sinal in TERM HUP; do
    rm -rf "$TMP_OP/saida-int"
    : >"$SHIM_LOG"
    SHIM_DORMIR="*compose cp*" bash backup.sh --exportar "$TMP_OP/saida-int" >/dev/null 2>&1 &
    pid=$!
    for ((i = 0; i < 100; i++)); do
      grep -q ' cp ' "$SHIM_LOG" && break
      sleep 0.1
    done
    [[ -n "$(find "$TMP_OP/saida-int" -name '.exportando.*' 2>/dev/null)" ]] || _falhou "a pasta de trabalho deveria existir durante a cópia"
    kill -"$sinal" "$pid"
    rc=0
    wait "$pid" || rc=$?
    [[ "$rc" -ne 0 ]] || _falhou "deveria sair com erro após $sinal"
    [[ -z "$(find "$TMP_OP/saida-int" -name '.exportando.*')" ]] || _falhou "sobrou a pasta de trabalho após $sinal"
  done
}

test_backup_exportar_falha_no_cp_limpa_a_pasta_de_trabalho() {
  rodar_em_diretorio_temporario
  export SHIM_FALHAR="*compose cp*"
  if bash backup.sh --exportar "$TMP_OP/saida" >/dev/null 2>&1; then _falhou "deveria sair com erro"; fi
  [[ -z "$(find "$TMP_OP/saida" -name '.exportando.*')" ]] || _falhou "sobrou a pasta de trabalho"
}

test_backup_exportar_ignora_nome_inesperado_do_volume() {
  rodar_em_diretorio_temporario
  export SHIM_LISTA=$'sentinela-20261118T030000Z-manual.tar.gz\n../../etc/passwd\n.entrada-1.tar.gz\nsentinela-x-manual.tar.gz'
  bash backup.sh --exportar "$TMP_OP/saida" >/dev/null 2>&1 || _falhou "falhou"
  [[ "$(grep -c ' cp ' "$SHIM_LOG")" -eq 1 ]] || _falhou "só o nome válido deveria ser copiado"
  afirmar_log_nao_contem "passwd"
}

test_backup_sem_argumento_chama_backup_criar_manual() {
  rodar_em_diretorio_temporario
  local saida
  saida="$(bash backup.sh 2>&1)" || _falhou "backup.sh falhou"
  afirmar_log_contem "compose exec -T core python -m sentinela.cli backup-criar --origem manual"
  afirmar_log_nao_contem " cp "
  grep -q "sentinela-20261118T030000Z-manual.tar.gz" <<<"$saida" || _falhou "deveria imprimir o nome"
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
  for proibido in " down" "prune" "volume rm" "rmi -f" "docker rm" " --rmi" "-v sentinela"; do
    afirmar_log_nao_contem "$proibido"
  done
  # "rm -f" só existe nas duas limpezas exatas de /dados/backups/.entrada-*, no contêiner avulso
  if grep -F " rm -f" "$SHIM_LOG" |
    grep -vE '^docker compose run --rm --no-deps -T core (sh -c rm -f /dados/backups/\.entrada-\*|rm -f /dados/backups/\.entrada-[0-9]{8}T[0-9]{6}-[0-9]+\.tar\.gz)$'; then
    _falhou "rm -f fora das limpezas exatas"
  fi
  # shellcheck disable=SC2016  # o $ENTRADA é texto a procurar, não expansão
  if texto_dos_scripts | grep -F "rm -f" |
    grep -vE ':[[:space:]]*(cli_avulsa core sh -c .rm -f /dados/backups/\.entrada-\*. \|\||cli_avulsa core rm -f "\$ENTRADA" >/dev/null 2>&1 \|\|)$'; then
    _falhou "rm -f no texto dos scripts fora das limpezas exatas"
  fi
}

executar_testes
