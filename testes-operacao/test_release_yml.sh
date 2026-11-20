#!/usr/bin/env bash
# Asserções textuais sobre .github/workflows/release.yml (o workflow só roda de verdade numa tag).
#   bash testes-operacao/test_release_yml.sh
# shellcheck disable=SC2016  # as expressões ${{ }} são texto literal do workflow
set -uo pipefail

# shellcheck source=testes-operacao/lib.sh
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/lib.sh"

WF="$REPO_DIR/.github/workflows/release.yml"
CI="$REPO_DIR/.github/workflows/ci.yml"

# trecho_job JOB: do "  JOB:" até o próximo job (2 espaços + nome + ":") ou o fim
trecho_job() {
  awk -v j="  $1:" '
    $0 == j { dentro = 1; print; next }
    dentro && /^  [a-z0-9_-]+:[[:space:]]*$/ { exit }
    dentro { print }' "$WF"
}

test_release_so_em_tag_vX_Y_Z() {
  [[ -f "$WF" ]] || _falhou "release.yml não existe"
  grep -qF "tags: ['v[0-9]+.[0-9]+.[0-9]+']" "$WF" || _falhou "gatilho de tag X.Y.Z ausente"
  grep -qE '^  workflow_dispatch:' "$WF" || _falhou "workflow_dispatch ausente"
  if grep -qE '^  (pull_request|schedule):|branches:' "$WF"; then _falhou "release.yml só pode disparar em tag ou manualmente"; fi
  grep -qF "group: release-\${{ github.ref }}" "$WF" || _falhou "concurrency por ref ausente"
  grep -qF "cancel-in-progress: false" "$WF" || _falhou "o release não pode ser cancelado no meio"
  grep -qF "workflow_call:" "$CI" || _falhou "ci.yml precisa de workflow_call para o release reaproveitar"
  grep -qF "uses: ./.github/workflows/ci.yml" "$WF" || _falhou "job ci reutilizável ausente"
}

test_actions_novas_fixadas_por_sha() {
  local linha n=0
  while IFS= read -r linha; do
    n=$((n + 1))
    [[ "$linha" =~ uses:\ [A-Za-z0-9._/-]+@[0-9a-f]{40}\ \#\ v[0-9] ]] || _falhou "action sem SHA de 40 hex e tag em comentário: $linha"
  done < <(grep -E '^\s+(- )?uses: ' "$WF" | grep -vF "uses: ./")
  ((n >= 8)) || _falhou "poucas actions encontradas ($n)"
  for a in setup-qemu-action setup-buildx-action login-action build-push-action cosign-installer trivy-action; do
    grep -qE "uses: [^ ]*$a@[0-9a-f]{40}" "$WF" || _falhou "$a não está fixada por SHA"
  done
}

test_trivy_antes_da_promocao() {
  local t p
  t="$(grep -n 'trivy-action@' "$WF" | head -n 1 | cut -d: -f1)"
  p="$(grep -n 'imagetools create' "$WF" | head -n 1 | cut -d: -f1)"
  [[ -n "$t" && -n "$p" ]] || _falhou "faltou o trivy ou o imagetools create"
  ((t < p)) || _falhou "o trivy (linha $t) tem de vir antes da promoção (linha $p)"
  trecho_job construir | grep -qF 'exit-code: "1"' || _falhou "trivy sem exit-code 1 no job construir"
  trecho_job construir | grep -qF 'ignore-unfixed: true' || _falhou "trivy sem ignore-unfixed"
  trecho_job construir | grep -qF 'severity: HIGH,CRITICAL' || _falhou "trivy sem HIGH,CRITICAL"
  trecho_job construir | grep -qF 'TRIVY_PLATFORM: linux/amd64' || _falhou "trivy não varre amd64"
  trecho_job construir | grep -qF 'TRIVY_PLATFORM: linux/arm64' || _falhou "trivy não varre arm64"
  if trecho_job construir | grep -qE 'imagetools|cosign'; then _falhou "construir não pode promover nem assinar"; fi
  grep -qE 'needs: \[.*construir.*\]' <(trecho_job promover) || _falhou "promover tem de depender de construir"
}

test_cosign_keyless_sem_chave_no_repo() {
  grep -qF 'cosign sign --yes' "$WF" || _falhou "cosign sign --yes ausente"
  grep -qF 'cosign attest --yes --type spdxjson' "$WF" || _falhou "cosign attest ausente"
  grep -qF 'https://token.actions.githubusercontent.com' "$WF" || _falhou "emissor OIDC do GitHub ausente"
  grep -qF 'format: spdx-json' "$WF" || _falhou "SBOM spdx-json ausente"
  if grep -qiE -- '--key|COSIGN_PRIVATE_KEY|COSIGN_PASSWORD|cosign\.key|BEGIN [A-Z ]*PRIVATE' "$WF"; then _falhou "cosign com chave: o modo é keyless"; fi
  if git -C "$REPO_DIR" ls-files | grep -qE '(^|/)cosign\.(key|pub)$'; then _falhou "chave do cosign no repositório"; fi
  grep -qF 'digests.txt' "$WF" || _falhou "digests.txt ausente"
}

test_plataformas_amd64_e_arm64() {
  trecho_job construir | grep -qF 'platforms: linux/amd64,linux/arm64' || _falhou "build sem as duas plataformas"
  trecho_job construir | grep -qF 'provenance: mode=max' || _falhou "provenance mode=max ausente"
  trecho_job construir | grep -qF 'rc-${{ github.run_id }}' || _falhou "tag candidata rc-<run_id> ausente"
  grep -qF 'ghcr.io/lumezencio/sentinela-${{ matrix.servico }}' "$WF" || _falhou "nome da imagem fora do contrato"
}

test_smoke_arm64_so_em_tag_ou_manual() {
  local s
  s="$(trecho_job smoke-arm64)"
  [[ -n "$s" ]] || _falhou "job smoke-arm64 ausente"
  grep -qF 'timeout-minutes: 30' <<<"$s" || _falhou "smoke sem timeout de 30 min"
  grep -qF 'DOCKER_DEFAULT_PLATFORM=linux/arm64' <<<"$s" || _falhou "smoke sem plataforma arm64"
  # a plataforma arm64 só pode valer depois do setup-qemu (senão o binfmt arm64 não roda no runner x86)
  local q p
  q="$(grep -n 'setup-qemu-action' <<<"$s" | head -n 1 | cut -d: -f1)"
  p="$(grep -n 'DOCKER_DEFAULT_PLATFORM=linux/arm64' <<<"$s" | head -n 1 | cut -d: -f1)"
  (( q < p )) || _falhou "DOCKER_DEFAULT_PLATFORM definida antes do setup-qemu"
  ! grep -qF 'DOCKER_DEFAULT_PLATFORM: linux/arm64' <<<"$s" || _falhou "DOCKER_DEFAULT_PLATFORM no env do job"
  grep -qF 'setup-qemu-action@' <<<"$s" || _falhou "smoke sem QEMU"
  grep -qF 'workflow_dispatch' <<<"$s" || _falhou "smoke precisa aceitar a execução manual"
  grep -qF '/api/v1/saude' <<<"$s" || _falhou "smoke não confere a saúde"
  grep -qF '/login.html' <<<"$s" || _falhou "smoke não confere a página de login"
  grep -qF '204' <<<"$s" || _falhou "smoke não confere o login 204"
}

test_permissoes_minimas_por_job() {
  local j bloco
  grep -qE '^permissions: \{\}' "$WF" || _falhou "permissões globais devem ser vazias"
  for j in ci meta construir promover marcar-latest lancamento smoke-arm64; do
    bloco="$(trecho_job "$j")"
    grep -qF 'permissions:' <<<"$bloco" || _falhou "job $j sem permissions próprio"
  done
  # id-token só na assinatura; packages: write só onde empurra imagem; contents: write só no lançamento
  [[ "$(grep -c 'id-token: write' "$WF")" -eq 1 ]] || _falhou "id-token: write deve aparecer uma única vez"
  grep -qF 'id-token: write' <(trecho_job promover) || _falhou "id-token: write fora do job promover"
  [[ "$(grep -c 'packages: write' "$WF")" -eq 3 ]] || _falhou "packages: write só em construir, promover e marcar-latest"
  grep -qF 'packages: write' <(trecho_job construir) || _falhou "construir sem packages: write"
  grep -qF 'packages: write' <(trecho_job promover) || _falhou "promover sem packages: write"
  [[ "$(grep -c 'contents: write' "$WF")" -eq 1 ]] || _falhou "contents: write só no lançamento"
  grep -qF 'contents: write' <(trecho_job lancamento) || _falhou "lancamento sem contents: write"
}

test_versao_da_tag_confere_com_pyproject() {
  trecho_job meta | grep -qF 'core/pyproject.toml' || _falhou "meta não lê core/pyproject.toml"
}

test_identidade_do_consumidor_igual_a_do_workflow() {
  local comum="$REPO_DIR/scripts/operacao-comum.sh" id_script id_wf
  id_script="$(grep -oE 'https://github\.com/[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+/\.github/workflows/release\.yml@refs/tags/' "$comum" | head -n 1)"
  [[ -n "$id_script" ]] || _falhou "identidade cosign não achada em operacao-comum.sh"
  id_wf="$(grep -oE 'IDENTIDADE: https://github\.com/\$\{\{ github\.repository \}\}/\.github/workflows/release\.yml@' "$WF" | head -n 1)"
  [[ -n "$id_wf" ]] || _falhou "identidade verificada pelo release.yml não achada"
  # o repositório real tem a caixa de github.repository; o consumidor tem de usar exatamente ela
  afirmar_igual "$id_script" "https://github.com/lumezencio/Sentinela/.github/workflows/release.yml@refs/tags/"
  grep -qF 'github.com/lumezencio/Sentinela/releases/download' "$comum" || _falhou "URL_RELEASE com a caixa errada"
  grep -qF 'release.yml@${{ github.ref }}' "$WF" || _falhou "o workflow verifica contra github.ref (refs/tags/vX.Y.Z)"
}

test_so_publica_tag_que_esta_na_main() {
  local m
  m="$(trecho_job meta)"
  grep -qF 'fetch-depth: 0' <<<"$m" || _falhou "meta sem fetch-depth: 0"
  grep -qF 'merge-base --is-ancestor "$GITHUB_SHA" origin/main' <<<"$m" || _falhou "meta não confere se a tag está na main"
}

test_smoke_roda_na_candidata_antes_de_a_versao_existir() {
  local s p
  s="$(trecho_job smoke-arm64)"
  p="$(trecho_job promover)"
  # o smoke depende da construção (candidata aprovada no trivy) e NÃO da promoção
  grep -qE 'needs: \[.*construir.*\]' <<<"$s" || _falhou "smoke tem de depender de construir"
  if grep -qE 'needs: \[.*promover.*\]' <<<"$s"; then _falhou "smoke não pode esperar a promoção: a versão X.Y.Z só existe depois dele"; fi
  # ele instala a candidata pelo digest aprovado, sem criar tag nem assinar
  grep -qF 'candidata-*' <<<"$s" || _falhou "smoke não baixa o digest da candidata"
  grep -qF 'SENTINELA_CANDIDATA_' <<<"$s" || _falhou "smoke não passa o digest da candidata ao install.sh"
  if grep -qE 'imagetools|cosign (sign|attest)' <<<"$s"; then _falhou "o smoke não pode promover nem assinar"; fi
  # a promoção (tag X.Y.Z + assinatura) só depois do smoke
  grep -qE 'needs: \[.*smoke-arm64.*\]' <<<"$p" || _falhou "promover tem de depender do smoke-arm64"
  grep -qE 'needs: \[.*construir.*\]' <<<"$p" || _falhou "promover tem de depender de construir (trivy)"
  grep -qF "github.event_name == 'push'" <<<"$p" || _falhou "promover só em tag"
  # só o job promover cria a tag X.Y.Z e assina
  [[ "$(grep -c 'imagetools create -t "\$IMG:\$VERSAO"' "$WF")" -eq 1 ]] || _falhou "a tag X.Y.Z deve ser criada uma única vez, em promover"
  grep -qF 'imagetools create -t "$IMG:$VERSAO"' <<<"$p" || _falhou "a tag X.Y.Z não é criada em promover"
  grep -qF 'cosign sign --yes' <<<"$p" || _falhou "a assinatura não está em promover"
}

test_install_do_smoke_na_candidata_nao_usa_assinatura() {
  local s passo
  s="$(trecho_job smoke-arm64)"
  # o passo do install.sh sobre a candidata roda só em push; o do cosign/instalação assinada só no manual
  passo="$(grep -n 'install.sh com a candidata' <<<"$s" | head -n 1)"
  [[ -n "$passo" ]] || _falhou "passo do install.sh sobre a candidata ausente"
  grep -A1 'install.sh com a candidata' <<<"$s" | grep -qF "github.event_name == 'push'" || _falhou "passo da candidata sem if de push"
  grep -B2 'cosign-release' <<<"$s" | grep -qF "github.event_name == 'workflow_dispatch'" || _falhou "cosign do smoke só no manual"
}

test_latest_so_depois_de_smoke_e_promocao() {
  local m
  m="$(trecho_job marcar-latest)"
  if grep -qE -- '-t "?\$IMG:latest' "$WF"; then _falhou "promover não pode mover o latest"; fi
  # marcar-latest depende de promover, que depende do smoke: o latest anda por último
  grep -qE 'needs: \[.*promover.*\]' <<<"$m" || _falhou "marcar-latest tem de depender de promover"
  grep -qF '$img:latest' <<<"$m" || _falhou "marcar-latest sem o latest"
  grep -qE 'needs: \[.*marcar-latest.*\]' <(trecho_job lancamento) || _falhou "o release só depois do latest"
}

executar_testes
