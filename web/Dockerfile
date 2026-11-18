# Front estático do Sentinela atrás do nginx sem privilégios (uid 101), TLS e cabeçalhos do §13.

FROM node:22.23.5-alpine3.24 AS minificar
RUN npm install --global --no-fund --no-audit esbuild@0.28.2
WORKDIR /w
COPY src/ ./src/
# JS e CSS minificados arquivo a arquivo, SEM sourcemap; HTML, SVG e vendor/ copiados como estão
# (o vendor/alpine-csp.min.js fica byte a byte igual ao conferido em vendor/ORIGEM.txt; o
# vendor/teia-3d.bundle.js, gerado por build/construir-teia.sh, tem de bater com o .sha256
# commitado e não é minificado de novo: o esbuild abaixo só pega src/js/*.js do 1º nível;
# os fontes de src/js/teia/ já estão dentro do bundle e não vão para a imagem).
# Telão: src/parede/parede.bundle.js e teia-parede.bundle.js (ES2017, gerados pelo mesmo
# script) também conferem com os .sha256 e não são re-minificados; os fontes de
# src/js/parede/ já estão dentro do bundle e não vão para a imagem.
RUN (cd src/vendor && sha256sum -c teia-3d.bundle.js.sha256) \
    && (cd src/parede && sha256sum -c parede.bundle.js.sha256 teia-parede.bundle.js.sha256) \
    && cp -r src dist \
    && find dist -name '.*' -type f -delete \
    && rm -rf dist/js/teia dist/js/parede dist/parede/*.sha256 \
    && esbuild src/js/*.js --minify --outdir=dist/js --log-level=warning \
    && esbuild src/css/*.css --minify --outdir=dist/css --log-level=warning \
    && esbuild src/parede/parede.css --minify --target=chrome63 --outfile=dist/parede/parede.css --log-level=warning \
    && if find dist -name '*.map' | grep -q .; then echo "sourcemap encontrado" >&2; exit 1; fi \
    && cmp src/vendor/alpine-csp.min.js dist/vendor/alpine-csp.min.js \
    && cmp src/vendor/teia-3d.bundle.js dist/vendor/teia-3d.bundle.js \
    && cmp src/parede/parede.bundle.js dist/parede/parede.bundle.js \
    && cmp src/parede/teia-parede.bundle.js dist/parede/teia-parede.bundle.js

FROM nginxinc/nginx-unprivileged:1.30.6-alpine3.24
USER root
# correções de segurança do Alpine publicadas depois da imagem base (trivy no CI barra HIGH/CRITICAL);
# sem o default.conf da imagem: a configuração inteira é a nossa
RUN apk upgrade --no-cache \
    && rm -f /etc/nginx/conf.d/default.conf /usr/share/nginx/html/*
COPY nginx/nginx.conf nginx/proxy-core.conf nginx/proxy-core-http.conf /etc/nginx/
COPY nginx/redirecionar.conf.template /etc/nginx/templates/redirecionar.conf.template
COPY --from=minificar /w/dist/ /usr/share/nginx/html/
RUN find /usr/share/nginx/html -type d -exec chmod 755 {} + \
    && find /usr/share/nginx/html /etc/nginx/nginx.conf /etc/nginx/proxy-core.conf \
            /etc/nginx/proxy-core-http.conf /etc/nginx/templates -type f -exec chmod 644 {} +
USER 101
# o entrypoint gera /tmp/redirecionar.conf (porta HTTPS pública) a partir do template
ENV NGINX_ENVSUBST_OUTPUT_DIR=/tmp \
    SENTINELA_PORTA_HTTPS=443
EXPOSE 8080 8443
