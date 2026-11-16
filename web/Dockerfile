# syntax=docker/dockerfile:1
# Front estático do Sentinela atrás do nginx sem privilégios (uid 101), TLS e cabeçalhos do §13.

FROM node:22.23.5-alpine3.24 AS minificar
RUN npm install --global --no-fund --no-audit esbuild@0.28.2
WORKDIR /w
COPY src/ ./src/
# JS e CSS minificados arquivo a arquivo, SEM sourcemap; HTML, SVG e vendor/ copiados como estão
# (o vendor/alpine-csp.min.js fica byte a byte igual ao conferido em vendor/ORIGEM.txt)
RUN cp -r src dist \
    && find dist -name '.*' -type f -delete \
    && esbuild src/js/*.js --minify --outdir=dist/js --log-level=warning \
    && esbuild src/css/*.css --minify --outdir=dist/css --log-level=warning \
    && if find dist -name '*.map' | grep -q .; then echo "sourcemap encontrado" >&2; exit 1; fi \
    && cmp src/vendor/alpine-csp.min.js dist/vendor/alpine-csp.min.js

FROM nginxinc/nginx-unprivileged:1.30.6-alpine3.24
USER root
# correções de segurança do Alpine publicadas depois da imagem base (trivy no CI barra HIGH/CRITICAL);
# sem o default.conf da imagem: a configuração inteira é a nossa
RUN apk upgrade --no-cache \
    && rm -f /etc/nginx/conf.d/default.conf /usr/share/nginx/html/*
COPY nginx/nginx.conf nginx/proxy-core.conf /etc/nginx/
COPY nginx/redirecionar.conf.template /etc/nginx/templates/redirecionar.conf.template
COPY --from=minificar /w/dist/ /usr/share/nginx/html/
RUN find /usr/share/nginx/html -type d -exec chmod 755 {} + \
    && find /usr/share/nginx/html /etc/nginx/nginx.conf /etc/nginx/proxy-core.conf \
            /etc/nginx/templates -type f -exec chmod 644 {} +
USER 101
# o entrypoint gera /tmp/redirecionar.conf (porta HTTPS pública) a partir do template
ENV NGINX_ENVSUBST_OUTPUT_DIR=/tmp \
    SENTINELA_PORTA_HTTPS=443
EXPOSE 8080 8443
