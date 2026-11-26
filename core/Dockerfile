# Núcleo do Sentinela: FastAPI + monitor. Imagem final sem uv, sem pip, sem testes, usuário 10001.

FROM ghcr.io/astral-sh/uv:0.13.10 AS uv

FROM python:3.15.1-slim-trixie AS construcao
COPY --from=uv /uv /usr/local/bin/uv
ENV UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy \
    UV_PYTHON_DOWNLOADS=never \
    UV_PROJECT_ENVIRONMENT=/app/.venv
WORKDIR /src
# dependências primeiro (camada reaproveitada enquanto o uv.lock não muda)
COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-dev --no-install-project
COPY sentinela ./sentinela
# o projeto entra no venv como pacote (não editável): o código-fonte de /src não vai à imagem final
RUN uv sync --frozen --no-dev --no-editable

FROM python:3.15.1-slim-trixie
# correções de segurança do Debian publicadas depois da imagem base (trivy no CI barra HIGH/CRITICAL);
# pip/setuptools da imagem base não são usados em execução: fora (menos superfície e CVEs)
RUN apt-get update \
    && apt-get upgrade -y --no-install-recommends \
    && rm -rf /var/lib/apt/lists/* \
    && rm -rf /usr/local/lib/python3.12/site-packages/pip* \
           /usr/local/lib/python3.12/site-packages/setuptools* \
           /usr/local/lib/python3.12/site-packages/wheel* \
           /usr/local/bin/pip* \
    && groupadd --gid 10001 sentinela \
    && useradd --uid 10001 --gid 10001 --no-create-home --home-dir /nonexistent \
               --shell /usr/sbin/nologin sentinela \
    && mkdir /dados && chown 10001:10001 /dados && chmod 700 /dados
WORKDIR /app
COPY --from=construcao /app/.venv /app/.venv
COPY alembic.ini ./
COPY alembic ./alembic
# laço do monitor morto: o processo sai com código != 0 e o compose (restart: unless-stopped) reinicia
ENV SENTINELA_SAIR_SE_MONITOR_MORRER=true
ENV PATH=/app/.venv/bin:$PATH \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1
USER 10001:10001
EXPOSE 8000
VOLUME ["/dados"]
# --forwarded-allow-ips: só o IP fixo do container web (rede interna 172.31.250.0/29), nunca "*"
CMD ["sh", "-c", "alembic upgrade head && exec uvicorn --factory sentinela.main:criar_app --host 0.0.0.0 --port 8000 --proxy-headers --forwarded-allow-ips=172.31.250.2 --no-server-header --no-access-log"]
