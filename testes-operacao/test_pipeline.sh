#!/usr/bin/env bash
# Asserções textuais sobre o pipeline de segurança: ci.yml, codeql.yml e dependabot.yml.
#   bash testes-operacao/test_pipeline.sh
set -uo pipefail

# shellcheck source=testes-operacao/lib.sh
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/lib.sh"

CI="$REPO_DIR/.github/workflows/ci.yml"
CQ="$REPO_DIR/.github/workflows/codeql.yml"
DB="$REPO_DIR/.github/dependabot.yml"

# trecho_job ARQUIVO JOB: do "  JOB:" até o próximo job ou o fim
trecho_job() {
  awk -v j="  $2:" '
    $0 == j { dentro = 1; print; next }
    dentro && /^  [a-z0-9_-]+:[[:space:]]*$/ { exit }
    dentro { print }' "$1"
}

test_ci_tem_npm_audit_omit_dev() {
  trecho_job "$CI" web | grep -qF 'npm audit --omit=dev --audit-level=high' || _falhou "npm audit ausente no job web"
}

test_ci_roda_os_testes_de_operacao() {
  local o
  o="$(trecho_job "$CI" operacao)"
  [[ -n "$o" ]] || _falhou "job operacao ausente"
  grep -qF 'timeout-minutes: 30' <<<"$o" || _falhou "operacao sem timeout-minutes: 30"
  grep -qF 'shellcheck' <<<"$o" || _falhou "operacao sem shellcheck"
  grep -qE 'bash testes-operacao/test_\*\.sh|for .* testes-operacao/test_\*\.sh' <<<"$o" || _falhou "operacao não roda test_*.sh"
  grep -qF 'bash testes-operacao/rodar.sh' <<<"$o" || _falhou "operacao sem rodar.sh"
  grep -qF 'CI: "true"' <<<"$o" || _falhou "rodar.sh sem CI=true explícito"
  grep -qF 'workflow_call:' "$CI" || _falhou "ci.yml perdeu o workflow_call"
}

test_ci_tem_job_actionlint_e_schema() {
  local a
  a="$(trecho_job "$CI" actionlint)"
  [[ -n "$a" ]] || _falhou "job actionlint ausente"
  grep -qF 'actionlint' <<<"$a" || _falhou "actionlint não é executado"
  grep -qF 'vendor.github-workflows' <<<"$a" || _falhou "schema de workflows não validado"
  grep -qF 'vendor.dependabot' <<<"$a" || _falhou "schema do dependabot não validado"
  grep -qE 'pip install [^|]*==[0-9]' <<<"$a" || _falhou "ferramentas sem versão exata"
}

test_codeql_cobre_python_e_javascript() {
  [[ -f "$CQ" ]] || _falhou "codeql.yml não existe"
  grep -qE '^  push:' "$CQ" || _falhou "push ausente"
  grep -qE 'branches: \[main\]' "$CQ" || _falhou "push em main ausente"
  grep -qE '^  pull_request:' "$CQ" || _falhou "pull_request ausente"
  grep -qE '^    - cron:' "$CQ" || _falhou "cron semanal ausente"
  grep -qF 'python' "$CQ" || _falhou "python fora da matriz"
  grep -qF 'javascript-typescript' "$CQ" || _falhou "javascript-typescript fora da matriz"
  grep -qF 'security-events: write' "$CQ" || _falhou "security-events: write ausente"
  grep -qF 'contents: read' "$CQ" || _falhou "contents: read ausente"
  [[ "$(grep -c 'security-events: write' "$CQ")" -eq 1 ]] || _falhou "security-events: write só no job (uma vez)"
  grep -qE '^permissions:' "$CQ" || _falhou "permissões mínimas no topo ausentes"
  if grep -qE 'run:.*\$\{\{' "$CQ"; then _falhou "\${{ }} dentro de run:"; fi
}

test_todas_as_actions_fixadas_por_sha() {
  local f linha n=0
  for f in "$CI" "$CQ" "$REPO_DIR/.github/workflows/release.yml"; do
    while IFS= read -r linha; do
      n=$((n + 1))
      [[ "$linha" =~ uses:\ [A-Za-z0-9._/-]+@[0-9a-f]{40}\ \#\ v[0-9] ]] || _falhou "$(basename "$f"): action sem SHA de 40 hex e tag em comentário: $linha"
    done < <(grep -E '^\s+(- )?uses: ' "$f" | grep -vF "uses: ./")
  done
  ((n >= 20)) || _falhou "poucas actions encontradas ($n)"
  grep -qE 'uses: github/codeql-action/init@[0-9a-f]{40}' "$CQ" || _falhou "codeql init sem SHA"
  grep -qE 'uses: github/codeql-action/analyze@[0-9a-f]{40}' "$CQ" || _falhou "codeql analyze sem SHA"
}

test_dependabot_cobre_os_quatro_ecossistemas() {
  [[ -f "$DB" ]] || _falhou "dependabot.yml não existe"
  grep -qE '^version: 2' "$DB" || _falhou "version: 2 ausente"
  local par
  for par in 'uv:/core' 'npm:/web' 'github-actions:/' 'docker:/core' 'docker:/web'; do
    awk -v e="${par%%:*}" -v d="${par#*:}" '
      /package-ecosystem:/ { eco = $NF; gsub(/"/, "", eco) }
      /directory:/ { dir = $NF; gsub(/"/, "", dir); if (eco == e && dir == d) achou = 1 }
      END { exit !achou }' "$DB" || _falhou "ecossistema $par ausente"
  done
  if grep -qE 'package-ecosystem: "?pip"?' "$DB"; then _falhou "core usa uv, não pip"; fi
  [[ "$(grep -c 'interval: weekly' "$DB")" -eq 5 ]] || _falhou "todos devem ser semanais"
  [[ "$(grep -c 'open-pull-requests-limit: 5' "$DB")" -eq 5 ]] || _falhou "limite 5 em todos"
  grep -qF 'minor' "$DB" || _falhou "agrupamento minor ausente"
  grep -qF 'patch' "$DB" || _falhou "agrupamento patch ausente"
}

test_workflows_validam_no_schema() {
  local cj=()
  if command -v check-jsonschema >/dev/null 2>&1; then cj=(check-jsonschema)
  elif command -v uvx >/dev/null 2>&1; then cj=(uvx check-jsonschema)
  else echo "check-jsonschema indisponível; validação de schema feita no job actionlint do CI"; return 0; fi
  "${cj[@]}" --builtin-schema vendor.github-workflows "$CI" "$CQ" "$REPO_DIR/.github/workflows/release.yml" || _falhou "workflow fora do schema"
  "${cj[@]}" --builtin-schema vendor.dependabot "$DB" || _falhou "dependabot fora do schema"
}

executar_testes
