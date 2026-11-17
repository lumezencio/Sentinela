#!/usr/bin/env bash
# Regenera web/src/vendor/teia-3d.bundle.js (+ .sha256 e LICENSES-teia.txt).
# Rodar a partir de web/: bash build/construir-teia.sh
# O CI roda este script e falha se src/vendor/ diferir do commitado (bundle velho).
set -euo pipefail
cd "$(dirname "$0")/.."

npm ci --no-fund --no-audit
node build/empacotar-teia.mjs

# --legal-comments=external grava as licenças ao lado do bundle
mv src/vendor/teia-3d.bundle.js.LEGAL.txt src/vendor/LICENSES-teia.txt
# formato fixo "<hash>  <arquivo>" (o sha256sum do Git Bash marca "*" no modo binário)
hash="$(sha256sum src/vendor/teia-3d.bundle.js | cut -c1-64)"
printf '%s  %s
' "$hash" teia-3d.bundle.js > src/vendor/teia-3d.bundle.js.sha256

if find src/vendor -name '*.map' | grep -q .; then
  echo "sourcemap encontrado em src/vendor" >&2
  exit 1
fi
echo "ok: $(cat src/vendor/teia-3d.bundle.js.sha256)"
