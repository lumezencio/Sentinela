#!/usr/bin/env bash
# Regenera web/src/vendor/teia-3d.bundle.js (+ .sha256 e LICENSES-teia.txt) e os bundles do
# telão em web/src/parede/ (parede.bundle.js e teia-parede.bundle.js, + .sha256 e
# LICENSES-teia-parede.txt). Rodar a partir de web/: bash build/construir-teia.sh
# O CI roda este script e falha se src/vendor/ ou src/parede/ diferir do commitado.
set -euo pipefail
cd "$(dirname "$0")/.."

npm ci --no-fund --no-audit
node build/empacotar-teia.mjs

# --legal-comments=external grava as licenças ao lado do bundle
mv src/vendor/teia-3d.bundle.js.LEGAL.txt src/vendor/LICENSES-teia.txt
# formato fixo "<hash>  <arquivo>" (o sha256sum do Git Bash marca "*" no modo binário)
hash="$(sha256sum src/vendor/teia-3d.bundle.js | cut -c1-64)"
printf '%s  %s\n' "$hash" teia-3d.bundle.js > src/vendor/teia-3d.bundle.js.sha256

# telão: ES2017 para TVs (Tizen 5.0)
node build/empacotar-parede.mjs
mv src/parede/teia-parede.bundle.js.LEGAL.txt src/parede/LICENSES-teia-parede.txt
for arq in parede.bundle.js teia-parede.bundle.js; do
  hash="$(sha256sum "src/parede/$arq" | cut -c1-64)"
  printf '%s  %s\n' "$hash" "$arq" > "src/parede/$arq.sha256"
done

if find src/vendor src/parede -name '*.map' | grep -q .; then
  echo "sourcemap encontrado em src/vendor ou src/parede" >&2
  exit 1
fi
echo "ok: $(cat src/vendor/teia-3d.bundle.js.sha256 src/parede/*.sha256)"
