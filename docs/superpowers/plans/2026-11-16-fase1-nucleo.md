# Sentinela — Fase 1 (Núcleo) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Entregar o núcleo do Sentinela rodando em Docker: guarda de rede anti-broadcast, cadastro manual/CSV, monitoramento ICMP/TCP/HTTP com teto de tráfego e histerese, login, lista ao vivo por WebSocket e modo demonstração com 300 equipamentos sintéticos.

**Architecture:** Um processo Python asyncio (FastAPI) com SQLite WAL, atrás de um nginx sem privilégios que serve o front estático e faz proxy de `/api` e `/ws`. Todo envio de pacote passa por `Guarda.validar()`, que devolve um `DestinoAutorizado` exigido pelo tipo de todas as checagens. Agendador por heap + limitador token bucket global; mudanças de estado vão a um barramento em memória que alimenta o WebSocket.

**Tech Stack:** Python 3.12 · uv · FastAPI · Pydantic v2 / pydantic-settings · SQLAlchemy 2 (async) + aiosqlite · Alembic · icmplib · httpx · argon2-cffi · pytest + pytest-asyncio · ruff · mypy (strict) · bandit · pip-audit · Docker Compose · nginx-unprivileged · Alpine.js · Playwright (smoke).

**Spec:** `docs/arquitetura/ARQUITETURA.md` (principal) e `docs/superpowers/specs/2026-11-16-sentinela-design.md`.

## Global Constraints

- Python ≥ 3.12; dependências via `uv add` na última versão estável e travadas em `core/uv.lock`.
- Repositório **público**: nenhum IP/MAC/nome real; exemplos e fixtures só em `10.99.0.0/16` e MACs com prefixo `02:00:00` (localmente administrados).
- Nenhum envio de pacote sem `DestinoAutorizado`; nenhum `SO_BROADCAST`; nenhuma lib de mDNS/SSDP/WS-Discovery.
- Teto global padrão **20 tokens/s** (ajustável 1–100); custos: ICMP 1, TCP 1, HTTP 3.
- Intervalo: classes críticas **15 s**, demais **60 s**, jitter **±20%**; re-checagem após falha em **5 s**; **3** falhas seguidas → offline; **2** sucessos → volta a online; latência acima de **200 ms** (padrão) ou perda parcial → instável; **3** sucessos normais saem de instável.
- Classes críticas: `camera`, `gravador`, `controle_acesso`, `roteador`, `switch`.
- Amostras gravadas em lote a cada **60 s**; eventos de estado na hora; latências no WS em lote a cada **5 s**.
- Senhas argon2id; cookie de sessão `HttpOnly`, `Secure`, `SameSite=Strict`; CSRF em toda escrita; paginação `limit ≤ 100`.
- Containers: usuário não-root, `read_only`, `cap_drop: ALL`, `no-new-privileges`, limites (core 512m/1 CPU; web 64m), log 10m×3.
- Logs JSON sem senha, token ou credencial. OpenAPI desligado quando `SENTINELA_AMBIENTE=producao`.
- Commits terminam com `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. **IP fora das sub-redes declaradas, público, broadcast ou multicast no cadastro/CSV** → recusado com mensagem clara em português, nunca monitorado. (teste na Task 9)
2. **CSV exportado do Excel brasileiro** (separador `;`, codificação Windows‑1252, BOM, linhas duplicadas ou inválidas) → importa as válidas e devolve erro por número de linha. (teste na Task 9)
3. **Salto no relógio do host** (NTP corrige 1 h) → agendador não dispara rajada nem para; usa relógio monotônico. (teste na Task 7)
4. **Core reinicia com o navegador aberto** → front reconecta sozinho e recebe `snapshot` novo. (teste na Task 10 + smoke na Task 12)
5. **Equipamento que bloqueia ICMP** → aparece "offline" falso; cadastro permite escolher TCP/HTTP e a porta, e a lista mostra o tipo de checagem. (teste na Task 9)

---

## Estrutura de arquivos

```
core/
  pyproject.toml, uv.lock, Dockerfile, alembic.ini
  alembic/env.py, alembic/versions/0001_inicial.py
  sentinela/
    __init__.py
    main.py                 # criar_app(), lifespan inicia agendador
    config.py               # Settings
    cli.py                  # `python -m sentinela.cli criar-admin`
    relogio.py              # Relogio (monotônico) + RelogioFalso p/ testes
    barramento.py           # Barramento pub/sub
    rede/guarda.py
    db/base.py, db/modelos.py, db/sessao.py, db/sementes.py
    seguranca/senhas.py, seguranca/sessoes.py, seguranca/csrf.py, seguranca/bloqueio.py
    monitor/limitador.py, monitor/estados.py, monitor/agendador.py
    monitor/checagens/base.py, icmp.py, tcp.py, http.py
    api/deps.py, api/auth.py, api/equipamentos.py, api/classes.py,
    api/subredes.py, api/importacao.py, api/ws.py, api/saude.py
    demo/simulador.py
  tests/  (espelha o pacote)
web/
  Dockerfile, nginx.conf
  src/index.html, login.html, css/tokens.css, css/base.css,
  src/js/app.js, js/api.js, js/ws.js, js/lista.js
  tests/test_smoke.py       # Playwright
docker-compose.yml, docker-compose.demo.yml, .env.example, install.sh
.pre-commit-config.yaml, .gitleaks.toml, .github/workflows/ci.yml
```

---

### Task 1: Esqueleto do core, qualidade e CI

**Files:**
- Create: `core/pyproject.toml`, `core/sentinela/__init__.py`, `core/sentinela/config.py`, `core/sentinela/main.py`, `core/sentinela/api/saude.py`, `core/tests/conftest.py`, `core/tests/api/test_saude.py`, `.pre-commit-config.yaml`, `.gitleaks.toml`, `.github/workflows/ci.yml`

**Interfaces:**
- Produces: `Settings` (pydantic-settings, prefixo `SENTINELA_`, `extra="forbid"`) com `ambiente: Literal["desenvolvimento","producao","teste"]`, `banco_url: str = "sqlite+aiosqlite:////dados/sentinela.db"`, `chave_sessao: SecretStr`, `demo: bool = False`, `teto_pps: int = 20` (1–100), `latencia_instavel_ms: float = 200.0`; `obter_settings() -> Settings` (cacheado); `criar_app(settings: Settings | None = None) -> FastAPI`; fixture pytest `app`/`cliente` (httpx `AsyncClient` com `ASGITransport`) usando `ambiente="teste"` e banco em arquivo temporário.

- [ ] **Step 1:** `cd core && uv init --package --name sentinela --python 3.12` e `uv add fastapi uvicorn[standard] pydantic-settings sqlalchemy[asyncio] aiosqlite alembic icmplib httpx argon2-cffi python-multipart` ; `uv add --dev pytest pytest-asyncio ruff mypy bandit pip-audit`. Configurar no `pyproject.toml`: ruff (`select = ["E","F","I","B","S","UP","ASYNC"]`, line-length 100), mypy `strict = true`, pytest `asyncio_mode = "auto"`.
- [ ] **Step 2: Teste que falha** — `tests/api/test_saude.py::test_saude_responde_ok`: `GET /api/v1/saude` → 200 e `{"status": "ok"}`; `test_docs_fechados_em_producao`: app com `ambiente="producao"` → `GET /docs` = 404.
- [ ] **Step 3:** `uv run pytest -q` → FAIL (módulo inexistente).
- [ ] **Step 4:** Implementar `config.py`, `api/saude.py` e `criar_app` (`docs_url=None, redoc_url=None, openapi_url=None` em produção).
- [ ] **Step 5:** `uv run pytest -q && uv run ruff check . && uv run mypy sentinela` → tudo verde.
- [ ] **Step 6:** `.pre-commit-config.yaml` com gitleaks + ruff; `.gitleaks.toml` com regra extra para `SENTINELA_CHAVE_SESSAO=` não vazio. `ci.yml` (ubuntu-latest): `uv sync --frozen`, ruff, mypy, `bandit -r sentinela -ll`, `pip-audit`, pytest, gitleaks-action.
- [ ] **Step 7: Commit** `chore(core): esqueleto FastAPI, qualidade e CI`

### Task 2: Guarda de rede

**Files:**
- Create: `core/sentinela/rede/__init__.py`, `core/sentinela/rede/guarda.py`, `core/tests/rede/test_guarda.py`

**Interfaces:**
- Produces:
  - `Protocolo = Literal["icmp", "tcp", "http"]`
  - `@dataclass(frozen=True) DestinoAutorizado: ip: IPv4Address; porta: int | None; protocolo: Protocolo` — construtor privado: só `Guarda` cria (usar sentinela de módulo `_TOKEN` exigido em `__post_init__`).
  - `class DestinoProibido(ValueError)` com `motivo: str` (mensagem em português).
  - `class Guarda: __init__(self, sub_redes: Iterable[IPv4Network], permitir_loopback: bool = False)`; `validar(self, ip: str | IPv4Address, porta: int | None, protocolo: Protocolo) -> DestinoAutorizado`; `validar_sub_rede(cidr: str) -> IPv4Network` (staticmethod; exige RFC 1918, prefixo entre /16 e /30).

- [ ] **Step 1: Testes que falham** (parametrizados), com `Guarda([IPv4Network("10.99.0.0/24")])`:
  - aceita `10.99.0.10` icmp; aceita `10.99.0.10:554` tcp.
  - recusa `255.255.255.255`, `10.99.0.255` (broadcast da sub-rede), `10.99.0.0` (rede), `224.0.0.251`, `239.255.255.250`, `0.0.0.0`, `127.0.0.1`, `169.254.1.1`, `10.99.1.5` (fora), `8.8.8.8`, `"abc"`, `"10.99.0.10/24"`, IPv6 `"ff02::1"` — cada um com `DestinoProibido` e `motivo` não vazio.
  - porta fora de 1–65535 → `DestinoProibido`; `protocolo="tcp"` sem porta → `DestinoProibido`.
  - `permitir_loopback=True` aceita `127.0.0.1` (usado só em testes de checagem).
  - `validar_sub_rede("8.8.8.0/24")` e `("10.0.0.0/8")` recusam; `("10.99.1.0/24")` aceita.
  - `DestinoAutorizado(IPv4Address("10.99.0.1"), None, "icmp")` criado fora da Guarda → `TypeError`.
  - teste estático `test_nenhum_so_broadcast_no_codigo`: varre `sentinela/**/*.py` e falha se encontrar `SO_BROADCAST`, `zeroconf`, `ssdp`, `wsdiscovery`.
- [ ] **Step 2:** `uv run pytest tests/rede -q` → FAIL.
- [ ] **Step 3:** Implementar com `ipaddress`; broadcast/rede calculados de cada sub-rede declarada.
- [ ] **Step 4:** `uv run pytest tests/rede -q` → PASS; mypy limpo.
- [ ] **Step 5: Commit** `feat(rede): guarda único de destinos sem broadcast/multicast`

### Task 3: Banco, modelos, migração e sementes

**Files:**
- Create: `core/sentinela/db/{base,modelos,sessao,sementes}.py`, `core/alembic.ini`, `core/alembic/env.py`, `core/alembic/versions/0001_inicial.py`, `core/tests/db/test_modelos.py`

**Interfaces:**
- Produces:
  - Modelos SQLAlchemy 2 (`Mapped[...]`) conforme §10 da arquitetura, nesta fase: `Classe(id, slug, nome, cor, icone, intervalo_s, critica, ordem)`, `Equipamento(id: str uuid4, nome, ip, mac | None, fabricante | None, classe_id, classe_origem: "manual"|"auto", checagem: "icmp"|"tcp"|"http", porta | None, estado: str = "desconhecido", estado_desde, latencia_ms | None, pausado: bool, criado_em, visto_em)` com `UNIQUE(ip)` e `UNIQUE(mac)` parcial (mac não nulo); `Evento(id, equipamento_id, de, para, em, duracao_s | None, causa | None)`; `Amostra(equipamento_id, ts, latencia_ms | None, ok)`; `SubRede(id, cidr UNIQUE)`; `Usuario(id, login UNIQUE, hash_senha, papel: "admin"|"visualizador", falhas, bloqueado_ate)`; `Sessao(jti PK, usuario_id, expira_em, revogada)`; `Auditoria(id, usuario_id, acao, alvo, antes JSON, depois JSON, ip, em)`.
  - `criar_motor(url: str) -> AsyncEngine` (aplica `PRAGMA journal_mode=WAL`, `foreign_keys=ON`, `busy_timeout=5000` em cada conexão); `fabrica_sessao(motor) -> async_sessionmaker[AsyncSession]`.
  - `CLASSES_PADRAO: list[dict]` e `async semear_classes(sessao) -> None` idempotente — 12 classes: `sentinela, roteador, switch, wifi, camera, gravador, controle_acesso, servidor, computador, impressora, iot, desconhecido`; críticas conforme Global Constraints; intervalos 15/60.
- [ ] **Step 1: Testes que falham:** `test_wal_ativo` (PRAGMA journal_mode = "wal"); `test_semear_classes_idempotente` (rodar 2× → 12 linhas, 5 críticas); `test_ip_unico` (2º equipamento com mesmo IP → `IntegrityError`); `test_mac_nulo_repetido_permitido`; `test_migracao_igual_aos_modelos` (`alembic upgrade head` num arquivo temporário + `compare_metadata` sem diferenças).
- [ ] **Step 2:** rodar → FAIL.
- [ ] **Step 3:** Implementar; gerar `0001_inicial.py` com `alembic revision --autogenerate` e revisar à mão.
- [ ] **Step 4:** `uv run pytest tests/db -q` → PASS.
- [ ] **Step 5: Commit** `feat(db): modelos, migração inicial e classes padrão`

### Task 4: Relógio, limitador e barramento

**Files:**
- Create: `core/sentinela/relogio.py`, `core/sentinela/monitor/limitador.py`, `core/sentinela/barramento.py`, `core/tests/monitor/test_limitador.py`, `core/tests/test_barramento.py`

**Interfaces:**
- Produces:
  - `class Relogio(Protocol): def agora(self) -> float` (monotônico, segundos); `async def dormir(self, s: float) -> None`. `RelogioReal` usa `time.monotonic`/`asyncio.sleep`. `RelogioFalso` com `avancar(s)` que libera quem dorme (para testes).
  - `class Limitador: __init__(self, taxa: float, relogio: Relogio, capacidade: int | None = None)` (capacidade padrão = taxa); `async adquirir(self, custo: int = 1, prioritario: bool = False) -> None` (prioritários passam à frente da fila de espera); `definir_taxa(self, taxa: float) -> None`.
  - `@dataclass Mensagem: tipo: str; dados: dict[str, Any]`; `class Barramento: publicar(msg: Mensagem) -> None` (não bloqueia; fila por assinante com `maxsize=1000`, descarta a mais antiga se cheia); `assinar() -> AsyncIterator[Mensagem]` (context manager async que remove o assinante ao sair).
- [ ] **Step 1: Testes que falham:** `test_respeita_taxa` (taxa 20, 200 aquisições de custo 1 no `RelogioFalso` → tempo simulado ≥ 9,0 s); `test_custo_http_3`; `test_prioritario_fura_fila`; `test_definir_taxa_em_execucao`; `test_barramento_entrega_a_todos`; `test_assinante_lento_nao_trava_publicador` (fila cheia descarta a mais antiga).
- [ ] **Step 2:** rodar → FAIL. **Step 3:** implementar (token bucket com `relogio.agora()`). **Step 4:** PASS.
- [ ] **Step 5: Commit** `feat(monitor): limitador token bucket, relógio e barramento`

### Task 5: Máquina de estados

**Files:**
- Create: `core/sentinela/monitor/estados.py`, `core/tests/monitor/test_estados.py`

**Interfaces:**
- Produces:
  - `class Estado(StrEnum): DESCONHECIDO, ONLINE, INSTAVEL, SUSPEITO, OFFLINE, PAUSADO` (valores minúsculos sem acento: `"desconhecido"`, `"online"`, `"instavel"`, `"suspeito"`, `"offline"`, `"pausado"`).
  - `@dataclass(frozen=True) ResultadoChecagem: ok: bool; latencia_ms: float | None; erro: str | None = None`.
  - `@dataclass(frozen=True) Transicao: de: Estado; para: Estado`.
  - `class MaquinaEstados: __init__(self, estado: Estado = Estado.DESCONHECIDO, latencia_instavel_ms: float = 200.0)`; `aplicar(self, r: ResultadoChecagem) -> Transicao | None`; `pausar() -> Transicao | None`; `retomar() -> Transicao | None`; propriedade `estado`; propriedade `precisa_confirmar: bool` (True em SUSPEITO → agendador re-checa em 5 s).
- [ ] **Step 1: Testes que falham** — um teste por aresta do diagrama §9.2, incluindo: `desconhecido + ok → online`; `online + falha → suspeito` (sem alerta); `suspeito + ok → online`; `3 falhas seguidas → offline` (contando a que levou a suspeito); `offline + 1 ok → continua offline`, `+2º ok → online`; `online + latência 250 → instavel`; `instavel + 3 ok normais → online`; `pausar` de qualquer estado → `pausado` e `aplicar` ignorado enquanto pausado; `retomar → desconhecido`.
- [ ] **Step 2:** FAIL. **Step 3:** implementar. **Step 4:** PASS.
- [ ] **Step 5: Commit** `feat(monitor): máquina de estados com histerese`

### Task 6: Checagens ICMP, TCP e HTTP

**Files:**
- Create: `core/sentinela/monitor/checagens/{__init__,base,icmp,tcp,http}.py`, `core/tests/monitor/test_checagens.py`

**Interfaces:**
- Consumes: `DestinoAutorizado` (Task 2), `ResultadoChecagem` (Task 5).
- Produces: `class Checagem(Protocol): custo: int; async def executar(self, destino: DestinoAutorizado, timeout: float = 2.0) -> ResultadoChecagem`. Implementações `ChecagemIcmp` (icmplib `async_ping`, `count=1`, `privileged=False`; custo 1), `ChecagemTcp` (`asyncio.open_connection` + fechar; custo 1), `ChecagemHttp` (httpx `HEAD` com fallback `GET`, `follow_redirects=False`, `verify=False` só para IP de equipamento, sucesso = status < 500; custo 3). `checagem_para(tipo: str) -> Checagem`.
- [ ] **Step 1: Testes que falham** (Guarda com `permitir_loopback=True`): `test_tcp_ok` contra servidor `asyncio.start_server` em `127.0.0.1`; `test_tcp_porta_fechada_falha` (erro preenchido, `ok=False`); `test_tcp_timeout`; `test_http_200_ok` e `test_http_500_falha` com servidor local; `test_http_nao_segue_redirect` (301 conta como ok, nenhuma 2ª requisição); `test_icmp_usa_privileged_false` (monkeypatch em `icmplib.async_ping` capturando kwargs); `test_executar_exige_destino_autorizado` (passar tupla → `TypeError`).
- [ ] **Step 2:** FAIL. **Step 3:** implementar; latência medida com `time.perf_counter`. Nota: ICMP real só roda no container Linux; no Windows os testes de ICMP usam o monkeypatch.
- [ ] **Step 4:** PASS. **Step 5: Commit** `feat(monitor): checagens ICMP, TCP e HTTP`

### Task 7: Agendador

**Files:**
- Create: `core/sentinela/monitor/agendador.py`, `core/tests/monitor/test_agendador.py`

**Interfaces:**
- Consumes: `Limitador`, `Relogio`, `Barramento`, `Mensagem`, `MaquinaEstados`, `Checagem`, `Guarda`.
- Produces:
  - `@dataclass Alvo: id: str; ip: str; porta: int | None; checagem: str; intervalo_s: float; critico: bool; estado: Estado`.
  - `class Agendador: __init__(self, *, guarda: Guarda, limitador: Limitador, relogio: Relogio, barramento: Barramento, gravador: GravadorAmostras, checagens: Callable[[str], Checagem] = checagem_para, rng: random.Random | None = None)`; `adicionar(alvo: Alvo)`; `remover(id)`; `atualizar(alvo)`; `pausar(id)`; `retomar(id)`; `async executar() -> None` (laço até cancelado); `tempo_max_deteccao_s() -> float`.
  - `class GravadorAmostras(Protocol): async def registrar_transicao(self, id: str, t: Transicao, em: datetime) -> None; def acumular_amostra(self, id: str, r: ResultadoChecagem, em: datetime) -> None; async def descarregar(self) -> None`. Implementação `GravadorSql` em `agendador.py` usando a fábrica de sessão (eventos na hora; amostras em lote, `descarregar` chamado a cada 60 s).
  - Mensagens publicadas: `Mensagem("estado", {"id", "estado", "desde"})` em toda transição; `Mensagem("latencias", {"lote": [[id, ms|None], ...]})` a cada 5 s.
- Algoritmo: heap `(proxima_execucao, seq, id)`; próxima = agora + intervalo × uniform(0,8, 1,2); se `precisa_confirmar`, próxima = agora + 5 s com `prioritario=True`. **Esticamento:** se Σ(custo/intervalo) > teto, multiplicar intervalos não críticos pelo fator necessário; se ainda exceder, também os críticos. Tempo usa só `relogio.agora()` (monotônico); horários de parede (`datetime.now(UTC)`) só para gravar.
- [ ] **Step 1: Testes que falham** (RelogioFalso, checagem falsa programável): `test_critico_checado_a_cada_15s_com_jitter` (em 600 s simulados: 33–50 execuções); `test_falha_dispara_reconfirmacao_em_5s`; `test_tres_falhas_publica_offline_uma_vez`; `test_teto_respeitado_com_2000_alvos` (taxa medida ≤ 20/s em 300 s; `tempo_max_deteccao_s()` > 15); `test_estica_nao_criticos_primeiro`; `test_salto_de_relogio_de_parede_nao_afeta` (monkeypatch `datetime.now` +1 h no meio → contagem de execuções inalterada) — **Review Focus 3**; `test_pausado_nao_e_checado`; `test_lote_latencias_a_cada_5s`; `test_guarda_recusa_alvo_e_nao_agenda` (alvo com IP fora → evento de erro, não executa).
- [ ] **Step 2:** FAIL. **Step 3:** implementar. **Step 4:** PASS.
- [ ] **Step 5: Commit** `feat(monitor): agendador com prioridade, jitter e esticamento`

### Task 8: Autenticação e sessão

**Files:**
- Create: `core/sentinela/seguranca/{senhas,sessoes,csrf,bloqueio}.py`, `core/sentinela/api/{deps,auth}.py`, `core/sentinela/cli.py`, `core/tests/seguranca/test_auth.py`

**Interfaces:**
- Produces:
  - `gerar_hash(senha: str) -> str`, `verificar(hash: str, senha: str) -> bool` (argon2id padrão da lib); senha mínima 12 caracteres.
  - Rotas: `POST /api/v1/auth/login` `{login, senha}` → 204 + cookies `sentinela_sessao` (JWT-free: id opaco = `Sessao.jti`, 12 h) e `sentinela_csrf` (legível por JS); `POST /api/v1/auth/logout` → revoga; `GET /api/v1/auth/eu` → `{login, papel}`.
  - Dependências: `usuario_atual` (401 se ausente/revogada/expirada), `exigir_admin` (403), `verificar_csrf` (header `X-CSRF` == cookie, em POST/PUT/PATCH/DELETE; 403).
  - Bloqueio: após 5 falhas por login → bloqueio 1 min, dobrando até 30 min; por IP 20 falhas/10 min → 429 com `Retry-After`. Mensagem única `"Login ou senha inválidos."` para usuário inexistente e senha errada.
  - CLI: `python -m sentinela.cli criar-admin --login X` (lê senha via `getpass`; ou `SENTINELA_ADMIN_SENHA` em ambiente de teste/demo).
- [ ] **Step 1: Testes que falham:** login ok define cookies com `HttpOnly`/`Secure`/`SameSite=strict`; mensagem idêntica para usuário inexistente e senha errada; 6ª tentativa errada → 429/bloqueado mesmo com senha certa; logout revoga (requisição seguinte 401); escrita sem `X-CSRF` → 403; visualizador em rota admin → 403; hash começa com `$argon2id$`; senha nunca aparece em log (caplog).
- [ ] **Step 2:** FAIL. **Step 3:** implementar. **Step 4:** PASS.
- [ ] **Step 5: Commit** `feat(seguranca): login argon2id, sessão revogável, CSRF e bloqueio`

### Task 9: API de sub-redes, classes, equipamentos e importação CSV

**Files:**
- Create: `core/sentinela/api/{subredes,classes,equipamentos,importacao}.py`, `core/tests/api/test_equipamentos.py`, `core/tests/api/test_importacao.py`, `core/tests/fixtures/excel_br.csv`

**Interfaces:**
- Consumes: `Guarda`, `Agendador.adicionar/atualizar/remover/pausar/retomar`, `usuario_atual`, `exigir_admin`, `verificar_csrf`.
- Produces:
  - `GET/POST/DELETE /api/v1/subredes` (admin; `validar_sub_rede`); ao mudar, a `Guarda` do app é reconstruída e alvos que ficaram fora são pausados com causa `"fora_das_subredes"`.
  - `GET /api/v1/classes` (todos), `PATCH /api/v1/classes/{slug}` (admin: nome, cor `#RRGGBB`, icone, intervalo_s 5–3600).
  - `GET /api/v1/equipamentos?classe=&estado=&q=&limit=50&offset=0` (limit ≤ 100) → `{itens, total}`; `GET /{id}`; `POST` (admin) `{nome 1–80, ip, mac?, classe, checagem, porta?}`; `PATCH /{id}`; `DELETE /{id}`; `POST /{id}/pausar`, `/{id}/retomar`; `GET /{id}/eventos?limit=`. Toda escrita registra `Auditoria`.
  - `POST /api/v1/equipamentos/importar` (admin, multipart, ≤ 1 MB) → `{importados: int, erros: [{linha: int, motivo: str}]}`. Colunas: `nome, ip, mac, classe, checagem, porta` (cabeçalho obrigatório; aceita `,` ou `;` detectado por `csv.Sniffer`; decodifica UTF‑8‑BOM e cai para Windows‑1252).
- [ ] **Step 1: Testes que falham:** CRUD feliz; ID de outro equipamento inexistente → 404; IP `8.8.8.8`, `10.99.0.255`, `224.0.0.1`, IP fora das sub-redes → 422 com motivo em português (**Review Focus 1**); `checagem="tcp"` sem porta → 422; criar equipamento com `checagem="tcp", porta=80` aparece na listagem com `checagem` e `porta` (**Review Focus 5**); `limit=500` → 422; visualizador não cria; importação de `excel_br.csv` (cp1252, `;`, com BOM, 1 linha duplicada, 1 IP inválido, 1 classe inexistente, 5 válidas) → `importados=5` e 3 erros com número de linha correto (**Review Focus 2**); remover sub-rede pausa os equipamentos dela.
- [ ] **Step 2:** FAIL. **Step 3:** implementar. **Step 4:** PASS.
- [ ] **Step 5: Commit** `feat(api): sub-redes, classes, equipamentos e importação CSV`

### Task 10: WebSocket ao vivo

**Files:**
- Create: `core/sentinela/api/ws.py`, `core/tests/api/test_ws.py`
- Modify: `core/sentinela/main.py` (lifespan: cria Guarda, Limitador, Barramento, Agendador, carrega alvos do banco, inicia `executar()` e tarefa de `descarregar` a cada 60 s; cancela no shutdown)

**Interfaces:**
- Consumes: `Barramento.assinar`, sessão por cookie (`usuario_atual` adaptado a WS).
- Produces: `WS /ws` — sem sessão válida fecha com código `4401`; ao conectar envia `{"tipo":"snapshot","classes":[...],"equipamentos":[{id,nome,ip,classe,estado,desde,latencia_ms,checagem,porta}]}`; depois repassa `estado` e `latencias` do barramento; ping de aplicação a cada 25 s; verifica `Origin` igual ao host.
- [ ] **Step 1: Testes que falham:** conexão sem cookie → fechada 4401; com cookie → primeira mensagem `snapshot` com N equipamentos; publicar `Mensagem("estado", ...)` no barramento → cliente recebe; `Origin` estranho → recusado; reconectar após fechar recebe `snapshot` novo (**Review Focus 4**, lado servidor); shutdown do app cancela as tarefas sem warning de task pendente.
- [ ] **Step 2:** FAIL. **Step 3:** implementar. **Step 4:** PASS.
- [ ] **Step 5: Commit** `feat(api): WebSocket com snapshot e diferenças ao vivo`

### Task 11: Modo demonstração

**Files:**
- Create: `core/sentinela/demo/{__init__,simulador}.py`, `core/tests/demo/test_simulador.py`
- Modify: `core/sentinela/main.py` (se `settings.demo`: semeia rede sintética e injeta checagem simulada)

**Interfaces:**
- Produces: `gerar_rede(seed: int = 366, total: int = 300) -> list[EquipamentoDemo]` em `10.99.0.0/16` (sub-redes `10.99.10.0/24` câmeras, `.20` Wi‑Fi, `.30` faciais, `.40` switches, `.50` gravadores, `.60` demais), nomes realistas genéricos ("Câmera Portão 01", "AP Bloco B"), MACs `02:00:00:xx:xx:xx`; distribuição: 120 câmeras, 8 gravadores, 30 Wi‑Fi, 12 faciais, 10 switches, 2 roteadores, resto distribuído. `ChecagemSimulada(seed)` implementa `Checagem`: 97% ok com latência 1–30 ms, quedas que duram 1–5 min, e a cada ~10 min um switch "cai" derrubando 8–15 equipamentos da mesma sub-rede. Nunca envia pacote.
- [ ] **Step 1: Testes que falham:** `gerar_rede()` determinística com a mesma seed; 300 itens; nenhum IP fora de `10.99.0.0/16`; todos os MACs com prefixo `02:00:00`; app com `demo=True` → `/api/v1/equipamentos` total 300; `ChecagemSimulada` não importa `socket`/`icmplib` (teste de import em subprocesso com `socket.socket` bloqueado).
- [ ] **Step 2:** FAIL. **Step 3:** implementar. **Step 4:** PASS.
- [ ] **Step 5: Commit** `feat(demo): rede sintética de 300 equipamentos`

### Task 12: Front Fase 1 (login + lista ao vivo)

**Files:**
- Create: `web/src/index.html`, `web/src/login.html`, `web/src/css/tokens.css`, `web/src/css/base.css`, `web/src/js/{app,api,ws,lista}.js`, `web/tests/test_smoke.py`

**Interfaces:**
- Consumes: rotas `/api/v1/auth/*`, `/api/v1/equipamentos`, `/api/v1/classes`, `WS /ws` (formatos das Tasks 8–10).
- Produces: UI com Alpine.js (arquivo local `web/src/vendor/alpine.min.js`, versão fixada; sem CDN). Telas: login; cabeçalho com contadores (online / instável / offline / pausado) e abas (Teia e Organograma desabilitadas com "em breve"); lista filtrável por classe/estado/texto, ordenável, cartões abaixo de 768 px; estado com **ícone + texto + cor**; formulário "Novo equipamento" e "Importar CSV" (admin). `ws.js`: reconexão com recuo 1 s → 30 s e banner "Reconectando…" (`aria-live="polite"`). Tokens de cor do §12.3, tema escuro padrão + claro por `prefers-color-scheme` e botão. Só `transform`/`opacity` animados; `prefers-reduced-motion` respeitado.
- [ ] **Step 1: Teste smoke que falha** (`uv run --with pytest-playwright pytest web/tests`, contra compose demo em `https://localhost`, ignorando certificado): login com admin demo → lista mostra contador total 300; filtrar classe "Câmeras" → 120 linhas (paginadas: total exibido 120); derrubar o core (`docker compose restart core`) → banner "Reconectando…" aparece e some, lista volta (**Review Focus 4**); viewport 360 px → cartões, sem rolagem horizontal.
- [ ] **Step 2:** rodar → FAIL. **Step 3:** implementar. **Step 4:** PASS; Lighthouse (Chrome DevTools) na lista ≥ 90 em desempenho e acessibilidade; registrar o resultado no commit.
- [ ] **Step 5: Commit** `feat(web): login e lista ao vivo com tema quântico`

### Task 13: Docker, nginx e instalador

**Files:**
- Create: `core/Dockerfile`, `core/.dockerignore`, `web/Dockerfile`, `web/nginx.conf`, `docker-compose.yml`, `docker-compose.demo.yml`, `.env.example`, `install.sh`
- Modify: `.github/workflows/ci.yml` (job `docker`: build das duas imagens + `trivy image --severity HIGH,CRITICAL --exit-code 1`)

**Interfaces:**
- Produces: compose exatamente como §14.2 da arquitetura (core sem portas publicadas; web `443:8443`, `80:8080`). `core/Dockerfile`: multi-stage `python:3.12-slim`, `uv sync --frozen --no-dev`, usuário `10001`, `CMD` roda `alembic upgrade head` e depois `uvicorn sentinela.main:app --host 0.0.0.0 --port 8000 --proxy-headers --forwarded-allow-ips=172.31.250.2` (IP fixo do `web` numa rede interna do compose `172.31.250.0/29`; nunca `*`). `web/Dockerfile`: `nginxinc/nginx-unprivileged` com `src/` minificado por esbuild num estágio Node (sem sourcemap). `nginx.conf`: TLS 1.2+, cabeçalhos do §13 (CSP `default-src 'self'; connect-src 'self' wss:; img-src 'self' data:; style-src 'self'; script-src 'self'; frame-ancestors 'none'`), `client_max_body_size 1m`, `limit_req` 10 r/s em `/api/v1/auth/login`, proxy `/ws` com `Upgrade`. `.env.example` sem valores reais. `install.sh`: gera `SENTINELA_CHAVE_SESSAO` (`openssl rand -hex 32`), CA local + certificado do host em `certs/` (validade CA 10 anos, certificado 825 dias, SAN com IP do host), `chmod 600 .env`, `docker compose up -d`, imprime URL e o caminho da CA para instalar nos dispositivos. `docker-compose.demo.yml` sobrepõe `SENTINELA_DEMO=true` e cria admin demo.
- [ ] **Step 1:** Ligar Docker Desktop; `docker compose -f docker-compose.yml -f docker-compose.demo.yml config --quiet` → sem erro.
- [ ] **Step 2:** `./install.sh --demo` → saída com URL; `docker compose ps` → 2 serviços `healthy`.
- [ ] **Step 3: Verificações** (registrar saídas no commit/PR): `curl -k https://localhost/api/v1/saude` → `{"status":"ok"}`; `curl -kI https://localhost/` mostra CSP, HSTS, `X-Content-Type-Options`; `docker compose exec core whoami` ≠ root; `docker stats --no-stream` dentro dos limites; `curl -k https://localhost/docs` → 404; `git check-ignore -v .env certs/` confirma ignorados.
- [ ] **Step 4:** Rodar o smoke da Task 12 contra esse ambiente → PASS.
- [ ] **Step 5: Commit** `feat(deploy): imagens Docker endurecidas, nginx e instalador`

### Task 14: Verificação final da fase

- [ ] **Step 1:** `cd core && uv run ruff check . && uv run ruff format --check . && uv run mypy sentinela && uv run bandit -r sentinela -ll && uv run pip-audit && uv run pytest -q --cov=sentinela --cov-report=term-missing` → tudo verde; cobertura ≥ 85% em `rede/`, `monitor/`, `seguranca/`.
- [ ] **Step 2:** `gitleaks detect --no-banner` no repositório → 0 achados.
- [ ] **Step 3:** Demo rodando 30 min: CPU média do core < 10%, RAM < 300 MB (`docker stats`), nenhuma exceção no log.
- [ ] **Step 4:** Atualizar `README.md` (seção "Rodar a demonstração" com `./install.sh --demo`) e marcar a Fase 1 como concluída no §18 da arquitetura.
- [ ] **Step 5: Commit + push** `docs: fase 1 concluída` → `git push`.
