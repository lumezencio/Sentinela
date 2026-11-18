# Fase 4A — Alertas e telão: plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** o Sentinela correlaciona quedas (filho de pai caído vira `inalcancavel`), agrupa alertas com silêncios e manutenção, avisa pelo Telegram (única saída para a internet, só quando configurado) e fica na parede numa TV emparelhada pela própria tela, sem login de pessoa.

**Architecture:** a correlação vive no `Agendador` (conhece `pai_id` de cada alvo e reclassifica na hora ou retroativamente em 60 s). Um novo pacote `core/sentinela/alertas/` assina o barramento: `Agrupador` (regras da spec §5.2, persiste em `alerta`), `Silencios` (silêncio/manutenção com fim agendado), `Despachante` (fila persistente em `alerta.envio` → `ClienteTelegram`, que só sai por `DestinoExterno("telegram")` emitido pela Guarda). O telão é um pacote `core/sentinela/parede/` (pedido com código na TV, aprovação do admin, token só-leitura em cookie) com WebSocket próprio `/ws/parede` de campos reduzidos; o front ganha a aba Alertas, seções Telegram/Telões em Configurações e a página `/parede` empacotada em ES2017.

**Tech Stack:** Python 3.12, FastAPI, SQLAlchemy 2 async/aiosqlite, Alembic, httpx/httpcore (TLS com `sni_hostname`), `zoneinfo` + `tzdata`; front Alpine CSP 3.15.12 + JS sem framework, esbuild 0.28.2; testes pytest, node --test, Playwright.

**Spec:** `docs/superpowers/specs/2026-11-18-fase4-operacao-design.md` — este plano cobre §3, §5 inteiro, §6.2 (só o primeiro item: `SENTINELA_FUSO`), §7, §8 (só a parte 4A) e §9 no que toca 4A. Arquitetura: `docs/arquitetura/ARQUITETURA.md` §6, §9, §10–§13.

## Global Constraints

- Branch `fase4-operacao`; nunca commitar em `main`; nunca push. Commits terminam com `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Fora de escopo (Fase 4B): TOTP, `usuario.totp_*`, `codigo_recuperacao`, backup/restore/update, imagens multi-arquitetura, a mudança de quando o login zera `falhas` (`api/auth.py` fica como está).
- Guarda de rede continua o único ponto de saída. Exceção nomeada única: `DestinoExterno("telegram")` = `api.telegram.org:443`, HTTPS com verificação normal de certificado (CA pública + `SENTINELA_CA_ADICIONAL` se definido). IP resolvido aceito se não for broadcast, multicast, loopback, link-local nem `0.0.0.0/8`. Sem Telegram configurado, nenhum pacote para a internet (nem resolução de nome). URL `https://api.telegram.org` fixa no código.
- Zero broadcast/multicast novo; a prova de captura passa a cobrir Telegram e telão.
- Configuração: `Settings` (`env_prefix="SENTINELA_"`, `extra="forbid"`) ganha `fuso` (padrão `America/Sao_Paulo`) e `ca_adicional` (vazio por padrão). O banco continua em UTC; o fuso só vale para textos (Telegram, telão, painel) e atalhos de silêncio. Pacote `tzdata` (versão exata com ≥ 2 semanas de lançamento).
- Valores fixos da spec: correlação 60 s retroativa, profundidade de pai ≤ 8, ciclo recusado; agrupamento de quedas sem pai comum em 30 s; caiu-e-voltou < 2 min; `instavel` só para classe crítica e ≥ 5 min; `fonte_falhou` após 3 coletas seguidas; retenção de alertas 90 dias; silêncio/manutenção com fim obrigatório ≤ 30 dias, atalhos 1 h, 4 h, até amanhã 08:00 (no fuso), personalizado; Telegram: ≤ 10 chats, retentativa 30 s → 30 min exponencial, desiste em 24 h (`falhou`), 20 mensagens/min por chat, resumo "e mais N alertas, veja no painel", `incluir IP` desligado por padrão; telão: código de 8 caracteres sem ambíguos (`K7MQ-2XDP`), validade 10 min, uso único, ≤ 20 pendentes, ≤ 10 pedidos por IP por hora, consulta a cada 5 s, cookie `HttpOnly`/`SameSite=Strict` (+`Secure` em HTTPS), FPS < 30 por 10 s → Organograma, "sem conexão" após 60 s.
- Mensagens do Telegram: só nome, classe, horário e duração (IP só com a chave ligada). Formato base: `🔴 Switch Bloco B caiu às 14:32 — 14 equipamentos afetados`.
- Telão: só nome, classe, estado e pai (e `id` opaco); nunca IP, MAC, fabricante, latência por equipamento, nem rota de escrita.
- Estado `inalcancavel`: cor do pausado `#7A8194` + ícone de elo partido em Teia, Organograma, Lista e legenda; status nunca só por cor.
- Repositório público: só 10.99.x, MACs `02:00:00:…`, tokens/chats fictícios.
- Migração Alembic reversível, `downgrade` testado (converte `inalcancavel` em `offline`).
- API: admin + CSRF em toda escrita (exceto as rotas do telão sem sessão, isentas e limitadas por IP); auditoria de toda ação de admin nova; erro genérico ao cliente; listas paginadas ≤ 100; segredos (token do bot) nunca em resposta, log, auditoria ou erro.
- Front: CSP inalterada no HTTPS (`script-src 'self'`, `style-src 'self'`); primeira tela ≤ 150 KB gzip; Lighthouse **100** nas quatro categorias em `#alertas`, `#configuracoes` e `/parede`; diretriz §5 do dono: capturas em 360, 390, 768, 1024, 1280, 1366, 1440 e 1920 px de largura, altura 900 px, olhadas uma a uma; texto nunca truncado no meio (cresce ou tem "ver completo"); espaçamentos múltiplos de 4 px; texto vindo do banco/rede só por `textContent`/`x-text`.
- Modo demonstração: nenhum pacote para a rede; o `Despachante` não roda; "Enviar teste" responde 409.
- Demo em execução (compose "sentinela", https://localhost:8443): nunca `down -v`, nunca prune, não tocar em outros projetos; antes de reconstruir, marcar imagens `pre_<ts>`. Senha do admin nunca impressa.
- Suítes verdes ao fim de cada tarefa: `cd core && uv run pytest -q -W error`, `uv run ruff check . && uv run ruff format --check . && uv run mypy sentinela`; tarefas de front também `cd web && npm test` e o smoke (`cd core && uv run --with pytest-playwright --with cryptography pytest ../web/tests -q`).

## Review Focus

1. Pai em manutenção (pausado) com os filhos caindo de verdade → os alertas dos filhos são registrados com `silenciado=true` (nada no Telegram); manutenção cobre a cadeia de descendentes. (Task 4)
2. Exceção do httpx/Telegram com a URL `…/bot<token>/sendMessage` no texto → o token nunca aparece em log, `telegram_status.ultimo_erro`, auditoria ou resposta da API. (Tasks 6 e 7)
3. Duas manutenções sobrepostas no mesmo equipamento → o fim da primeira não o retoma enquanto a segunda estiver ativa; pausa manual feita durante a manutenção também não é desfeita. (Task 3)
4. Gravador que responde a ping mas cuja leitura de canais falha → câmeras `inalcancavel (pai:<gravador>)` num único alerta cujo principal é o gravador, uma mensagem só. (Tasks 2 e 4)
5. Pai removido, `pai_id` apagado ou pai pausado enquanto filhos estão `inalcancavel` (e core reiniciado com `inalcancavel` no banco) → filhos voltam a `desconhecido` e são checados; nunca ficam presos. (Task 2)

---

### Task 1: Dados (migração 0004), fuso e retenção

**Files:**
- Create: `core/alembic/versions/0004_alertas_telao.py`, `core/sentinela/horario.py`, `core/tests/db/test_migracao_0004.py`, `core/tests/test_horario.py`
- Modify: `core/sentinela/db/modelos.py`, `core/sentinela/config.py`, `core/sentinela/monitor/limpeza.py`, `core/pyproject.toml` + `uv.lock` (`tzdata`), `.env.example`, `core/tests/test_config.py`, `core/tests/monitor/test_limpeza.py`

**Interfaces:**
- Produces:
  - `Alerta`: `id` int PK; `tipo` CHECK `IN ('queda','volta','instavel','fonte_falhou')`; `equipamento_id` FK SET NULL (nulo); `fonte_id` FK `fonte` SET NULL (nulo); `quedas: list[str]` JSON (ids que caíram por conta própria, principal primeiro); `afetados: list[str]` JSON (todos os incluídos menos o principal: quedas agrupadas + filhos inalcançáveis); `voltaram: list[str]` JSON; `aberto_em` (índice), `fechado_em` (nulo, índice); `breve: bool` (caiu e voltou < 2 min antes do envio); `alerta_origem_id` FK `alerta` SET NULL (o `volta` aponta a queda); `reconhecido_por` FK `usuario` SET NULL, `reconhecido_em`; `silenciado: bool`; `envio` CHECK `IN ('nao_aplica','pendente','enviado','falhou')` padrão `pendente` (índice); `envio_tentativas: int = 0`; `envio_proxima` (nulo); `enviado_para: list[str]` JSON. `telegram_msgs: dict[str,int]` JSON (chat_id → message_id devolvido pelo `sendMessage`, para a edição do caiu-e-voltou).
  - `Silencio`: `id` int; `tipo` CHECK `IN ('silencio','manutencao')`; `alvo_tipo` CHECK `IN ('equipamento','classe')`; `equipamento_id` FK CASCADE (nulo) / `classe_id` FK CASCADE (nulo) com CHECK "exatamente o do `alvo_tipo`"; `inicio`, `fim` (CHECK `fim > inicio`); `motivo` String(200) nulo; `criado_por` FK `usuario` SET NULL; `encerrado_em` nulo; `pausados: list[str]` JSON (ids que a manutenção pausou).
  - `Parede`: `id` int; `nome` String(64); `token_hash` String(64) único e nulo (preenchido na entrega do token); `modo` CHECK `IN ('https','http')`; `ip_vinculado` String(45) nulo (só `http`); `criado_em`, `ultimo_acesso`, `ultimo_ip`, `revogada_em` (nulos).
  - `ParedePedido`: `id` String(36) uuid; `codigo_hash` String(64) único; `segredo_hash` String(64) único; `ip` String(45); `modo`; `criado_em`, `expira_em`; `aprovado_em`, `consumido_em` nulos; `parede_id` FK `parede` SET NULL.
  - `Settings.fuso: str = "America/Sao_Paulo"` (validador: `ZoneInfo(fuso)` ou erro "Fuso inválido"); `Settings.ca_adicional: str = ""` (se não vazio, precisa ser arquivo legível).
  - `horario.zona(settings: Settings) -> ZoneInfo`; `horario.hora_local(dt: datetime, fuso: ZoneInfo) -> str` (`"14:32"`); `horario.formatar_duracao(segundos: float) -> str`; `horario.amanha_8h(agora: datetime, fuso: ZoneInfo) -> datetime` (UTC).
  - `limpeza.RETER_ALERTAS = timedelta(days=90)`; `ResultadoLimpeza.alertas: int`, `ResultadoLimpeza.silencios: int`.

- [ ] **Step 1: testes que falham**
  - `test_upgrade_cria_tabelas` (`alerta`, `silencio`, `parede`, `parede_pedido`; CHECKs de `tipo`, `envio`, `modo`, `alvo_tipo`); `test_silencio_alvo_exige_coluna_certa` (classe com `equipamento_id` → `IntegrityError`); `test_parede_token_hash_nulo_repetido_permitido`.
  - `test_downgrade_converte_inalcancavel_em_offline`: equipamento com `estado='inalcancavel'` e evento `para='inalcancavel'` → após `downgrade 0003` ambos `offline`, tabelas novas removidas, chaves `config` `telegram`, `telegram_status`, `paredes_http` apagadas, equipamentos intactos.
  - `test_fuso_padrao_sao_paulo`, `test_fuso_invalido_recusado`, `test_ca_adicional_inexistente_recusado`.
  - `test_formatar_duracao`: `40 → "40 s"`, `100 → "1 min 40 s"`, `1080 → "18 min"`, `7500 → "2 h 5 min"`, `7200 → "2 h"`.
  - `test_hora_local` (UTC 17:32 → `"14:32"` em São Paulo); `test_amanha_8h_em_nova_york_no_horario_de_verao` (`America/New_York`, 2026-11-01 01:30 local → 2026-11-02 13:00 UTC).
  - `test_limpeza_apaga_alertas_fechados_ha_mais_de_90_dias` (aberto nunca é apagado) e silêncios encerrados/vencidos há mais de 90 dias.
- [ ] **Step 2:** rodar; falham.
- [ ] **Step 3:** implementar modelos, migração (o `estado` não tem CHECK hoje: o upgrade não mexe nele; o downgrade faz os `UPDATE` antes de remover tabelas), `Settings`, `horario.py`, retenção. `.env.example`: `SENTINELA_FUSO=America/Sao_Paulo` e `SENTINELA_CA_ADICIONAL=` com comentário ("só para testes; quem muda já controla o `.env`").
- [ ] **Step 4:** suítes verdes; commit `feat(dados): alertas, silêncios, telões e fuso (migração 0004)`.

### Task 2: Estado `inalcancavel`, correlação e "Depende de" na API

**Files:**
- Modify: `core/sentinela/monitor/estados.py`, `core/sentinela/monitor/agendador.py`, `core/sentinela/monitor/montagem.py`, `core/sentinela/descoberta/canais.py`, `core/sentinela/api/comum.py`, `core/sentinela/api/equipamentos.py`, `core/sentinela/api/esquemas_equipamentos.py`, `core/sentinela/api/ws.py` (docstring)
- Test: `core/tests/monitor/test_estados.py`, `core/tests/monitor/test_agendador.py`, `core/tests/descoberta/test_canais.py` (atualizar os que fixam "gravador sem resposta"), `core/tests/api/test_equipamentos.py`

**Interfaces:**
- Consumes: modelos da Task 1.
- Produces:
  - `Estado.INALCANCAVEL = "inalcancavel"`; `CAUSA_PAI = "pai:"`; `causa_pai(pai_id: str) -> str`.
  - `MaquinaEstados.marcar_inalcancavel(causa: str) -> Transicao | None` (de qualquer estado menos `pausado`/`inalcancavel`; zera contadores); `MaquinaEstados.liberar_inalcancavel() -> Transicao | None` (`inalcancavel` → `desconhecido`). Em `inalcancavel`, `aplicar` trata ok como em `offline` (2 oks → online/instável) e falha não transita.
  - `Alvo.pai_id: str | None = None` (último campo); `JANELA_CORRELACAO_S = 60.0`; `PROFUNDIDADE_MAX_PAI = 8`.
  - `Agendador.pai_caido(id: str) -> str | None` (id do pai direto se ele está `offline`/`inalcancavel`); `Agendador.forcar_inalcancavel(ids: Iterable[str], pai_id: str) -> None`; `Agendador.liberar_inalcancavel(ids: Iterable[str]) -> None`.
  - `montagem.alvo_de` passa `pai_id`; `estado_inicial` mapeia `inalcancavel` → `desconhecido`.
  - API: `EquipamentoEntrada.pai_id: str | None = None`, `EquipamentoEdicao.pai_id: str | None` (null explícito apaga), `EquipamentoSaida.pai_id`; `comum.validar_pai(db: AsyncSession, eq_id: str | None, pai_id: str) -> None` (422 com: "Equipamento de referência inexistente.", "Um equipamento não pode depender de si mesmo.", "Dependência circular.", "Cadeia de dependência acima de 8 níveis."); câmera de gravador → 422 "Vínculo definido pelo gravador."; `retrato()` inclui `pai_id`.

- [ ] **Step 1: testes que falham**
  - estados: `test_marcar_inalcancavel_de_offline_com_causa`; `test_inalcancavel_falha_nao_transita`; `test_inalcancavel_dois_oks_vai_online`; `test_liberar_inalcancavel_vai_desconhecido`; pausado ignora ambos.
  - agendador (relógio falso):
    - `test_filho_cai_com_pai_offline_vira_inalcancavel` (barramento recebe só `inalcancavel` com `causa="pai:<P>"`, nunca `offline` para o filho).
    - `test_cadeia_switch_ap_camera` (switch offline → AP e câmera inalcançáveis, causa = pai direto de cada um).
    - `test_pai_cai_ate_60s_depois_reclassifica_filho` (filho offline em t=0, pai offline em t=50 → filho republicado `inalcancavel`, depois da mensagem do pai); `test_pai_cai_61s_depois_filho_fica_offline`.
    - `test_pai_volta_filhos_desconhecido_e_checados_em_5s` (sem mensagem `online` individual antes da checagem; checagem lançada ≤ 5 s).
    - Review Focus 5: `test_remover_pai_libera_filhos`, `test_trocar_pai_id_libera_filho`, `test_pausar_pai_libera_filhos`.
    - `test_estado_inicial_inalcancavel_vira_desconhecido` (montagem).
  - canais: `test_gravador_sem_resposta_cameras_inalcancaveis_com_causa_pai` (substitui o teste de `CAUSA_GRAVADOR_MUDO`; causa `pai:<equipamento do gravador>`); `test_leitura_volta_libera_e_aplica` (inalcançáveis → desconhecido → online na mesma leitura ok). Casos de certificado e "sem leitura do gravador" continuam `desconhecido`.
  - API: `test_definir_pai_e_ler` (GET devolve `pai_id`; auditoria com antes/depois); `test_pai_ciclo_422` (A→B, B→A); `test_pai_proprio_422`; `test_pai_profundidade_9_422`; `test_pai_inexistente_422`; `test_pai_de_camera_de_gravador_422`; `test_pai_null_apaga`; visualizador → 403.
- [ ] **Step 2:** rodar; falham.
- [ ] **Step 3:** implementar. No agendador: índice reverso `pai → filhos` mantido em `adicionar_lote`/`atualizar_lote`/`remover`; `_offline_em: dict[str, float]` (monotônico). Em `_registrar`, transição para `offline` com `pai_caido(id)` vira `Transicao(t.de, INALCANCAVEL, causa_pai(pai))` (uma só publicação). Em `_transicao`, quando o alvo entra em `offline`/`inalcancavel`, reclassifica filhos `offline` com `_offline_em ≥ agora − 60 s` (recursivo, profundidade ≤ 8); quando sai desse conjunto (inclui ir a `pausado` e ser removido), chama `liberar_inalcancavel` nos filhos e `_agendar_inicial(reg, rapido=True)` nos checados. `canais.py`: `_recarregar` também lê `Fonte.equipamento_id` (`self._gravador_de: dict[fonte_id, equipamento_id]`); falha de leitura → `forcar_inalcancavel(filhos, gravador_id)`; leitura ok → `liberar_inalcancavel(filhos)` antes de `aplicar_externo`. Remover `CAUSA_GRAVADOR_MUDO`. `validar_pai`: sobe a cadeia do pai (≤ 8 saltos; reencontrar `eq_id` = ciclo) e soma a profundidade máxima dos descendentes de `eq_id`.
- [ ] **Step 4:** suítes verdes; commit `feat(monitor): estado inalcançável e correlação de quedas pelo pai`.

### Task 3: Silêncios e manutenção

**Files:**
- Create: `core/sentinela/alertas/__init__.py`, `core/sentinela/alertas/silencios.py`, `core/sentinela/api/silencios.py`, `core/sentinela/api/esquemas_alertas.py`, `core/tests/alertas/__init__.py`, `core/tests/alertas/test_silencios.py`, `core/tests/api/test_silencios_api.py`
- Modify: `core/sentinela/main.py` (estado e laço `sentinela-silencios`), `core/sentinela/api/ws.py` (`TIPOS_REPASSADOS` + `"silencio"`)

**Interfaces:**
- Consumes: `Silencio` (Task 1), `horario.amanha_8h`, `comum.marcar_pausa/marcar_retomada/ultima_causa_de_pausa/validar_destino`, `Agendador.pausar_lote/retomar`, `auditar_sistema` (de `descoberta/mescla.py`).
- Produces:
  - `CAUSA_MANUTENCAO = "manutencao"`; `FIM_MAXIMO = timedelta(days=30)`; `Atalho = Literal["1h", "4h", "amanha_8h"]`; `fim_do_atalho(atalho: Atalho, agora: datetime, fuso: ZoneInfo) -> datetime`.
  - `@dataclass(frozen=True) PedidoSilencio(tipo: Literal["silencio","manutencao"], alvo_tipo: Literal["equipamento","classe"], alvo: str, fim: datetime, motivo: str | None)`; `ErroSilencio(motivo: str)`.
  - `class Silencios(sessoes, agendador: Agendador, barramento: Barramento, relogio: Relogio, agora_parede: Callable[[], datetime])`: `async criar(db, pedido, usuario: Usuario, agora) -> Silencio`, `async encerrar(id: int, usuario: Usuario | None, agora) -> Silencio | None`, `async encerrar_vencidos(agora) -> int`, `async executar() -> None` (a cada 15 s), `async cobertura(db, agora) -> Cobertura`.
  - `@dataclass(frozen=True) Cobertura(equipamentos: frozenset[str], classes: frozenset[int])` com `cobre(equipamento_id: str, classe_id: int, ancestrais: Iterable[str]) -> bool` (silêncio **ou** manutenção ativos no próprio, na classe ou em qualquer ancestral).
  - Rotas: `GET /api/v1/silencios` (ativos; qualquer usuário), `POST /api/v1/silencios` (admin; corpo `{tipo, alvo_tipo, alvo, atalho? | fim?, motivo?}`, exatamente um de `atalho`/`fim`), `POST /api/v1/silencios/{id}/encerrar` (admin). `SilencioSaida(id, tipo, alvo_tipo, alvo, alvo_nome, inicio, fim, motivo, criado_por, pausados: int)`.
  - Barramento: `Mensagem("silencio", {"acao": "criado"|"encerrado", "id": int})`.

- [ ] **Step 1: testes que falham**
  - `test_fim_obrigatorio_e_ate_30_dias` (fim no passado, = agora, 30 d + 1 s → `ErroSilencio`); `test_atalho_amanha_8h_usa_fuso`.
  - `test_silencio_nao_pausa`; `test_manutencao_pausa_e_guarda_lista` (equipamento já pausado manualmente fica fora da lista; causa do evento `manutencao`); `test_manutencao_de_classe_pausa_todos_da_classe`.
  - `test_fim_da_manutencao_retoma_so_os_seus` (pausa manual anterior e pausa `fora_das_subredes` continuam).
  - Review Focus 3: `test_manutencoes_sobrepostas_nao_retomam_cedo` (o id passa para a lista da manutenção ainda ativa); `test_pausa_manual_durante_manutencao_nao_e_desfeita` (última causa `manual` → não retoma).
  - `test_encerrar_vencidos_audita_como_sistema`; `test_cobertura_inclui_ancestrais`.
  - API: visualizador lista mas recebe 403 em criar/encerrar; sem CSRF 403; alvo inexistente 422; `test_criar_audita` (`silencio.criar`, `silencio.encerrar`); mensagem `silencio` chega ao WS.
- [ ] **Step 2:** rodar; falham.
- [ ] **Step 3:** implementar seguindo o padrão de `api/equipamentos.py` (transação, `commit`, depois `agendador.pausar_lote(ids, causa=CAUSA_MANUTENCAO)` / `agendador.retomar(id, causa=CAUSA_MANUTENCAO)`; retomada revalida o destino e, se recusado, deixa pausado com `fora_das_subredes`).
- [ ] **Step 4:** suítes verdes; commit `feat(alertas): silêncios e janelas de manutenção`.

### Task 4: Agrupador de alertas

**Files:**
- Create: `core/sentinela/alertas/agrupador.py`, `core/tests/alertas/test_agrupador.py`
- Modify: `core/sentinela/barramento.py` (`assinar(tamanho: int | None = None)`), `core/sentinela/main.py` (laço `sentinela-alertas`, criado **antes** do agendador), `core/tests/test_barramento.py`

**Interfaces:**
- Consumes: mensagens `estado` (`id`, `estado`, `desde`, `causa?`) e `fonte` (`id`, `ok`) do barramento; `Silencios.cobertura`; modelos `Alerta`, `Equipamento`, `Classe`, `Fonte`.
- Produces:
  - Constantes: `JANELA_AGRUPAR_S = 30`, `BREVE_S = 120`, `INSTAVEL_MIN_S = 300`, `FALHAS_FONTE = 3`, `TICK_S = 5`.
  - `class Agrupador(sessoes, barramento: Barramento, silencios: Silencios, relogio: Relogio, agora_parede: Callable[[], datetime])`: `async executar()` (assina com `tamanho=10_000` **antes** de carregar os alertas abertos do banco, como o WS), `async processar(msg: Mensagem) -> None`, `async tick() -> None`.
  - Publica `Mensagem("alerta", {"acao": "aberto"|"atualizado"|"fechado"|"removido", "id": int, "abertos": int})`.

- [ ] **Step 1: testes que falham** (chamam `processar`/`tick` direto, banco de teste, relógio falso)
  - `test_queda_abre_alerta_na_hora` (`envio='pendente'`, `quedas=[X]`, mensagem `alerta aberto`).
  - `test_quedas_sem_pai_em_30s_viram_um_alerta` (5 quedas em 20 s → 1 alerta, `quedas` com 5 ids, `afetados` com 4); `test_queda_31s_depois_abre_outro`.
  - `test_inalcancavel_anexa_ao_alerta_do_pai` (switch + 14 filhos → 1 alerta, principal o switch, `afetados` 14).
  - `test_filho_offline_antes_do_pai_e_absorvido` (alerta próprio do filho, ainda não enviado, é removido com `acao="removido"`; se ele era principal de um grupo, o próximo de `quedas` vira principal).
  - Review Focus 4: `test_inalcancavel_sem_alerta_do_pai_abre_com_pai_como_principal`.
  - `test_caiu_e_voltou_antes_do_envio_fecha_breve` (volta em 100 s, envio pendente → `breve=true`, `fechado_em`, nenhum alerta `volta`).
  - `test_volta_depois_de_enviado_cria_alerta_volta` (`tipo='volta'`, `alerta_origem_id`, já fechado, `envio='pendente'`).
  - `test_grupo_fecha_quando_todos_voltam` (`voltaram` cresce; fecha só com todos de `quedas`); filhos inalcançáveis não seguram o fechamento.
  - `test_instavel_so_classe_critica_e_5_min` (não crítica nunca; crítica com 299 s não; 300 s abre); `test_instavel_fecha_nao_enviado_vira_nao_aplica`.
  - `test_fonte_falhou_na_terceira_coleta` e fecha quando `ok`.
  - `test_silencio_ativo_registra_sem_enviar` (`silenciado=true`, `envio='nao_aplica'`); Review Focus 1: `test_filho_de_pai_em_manutencao_silenciado`; `test_nao_agrupa_silenciado_com_nao_silenciado`.
  - `test_suspeito_e_pausado_nao_geram_alerta`; `test_reinicio_recarrega_abertos` (volta depois de reiniciar fecha o alerta antigo).
  - barramento: `test_assinar_com_tamanho_proprio`.
- [ ] **Step 2:** rodar; falham.
- [ ] **Step 3:** implementar. Ordem de decisão por mensagem `estado`: (1) `inalcancavel` com causa `pai:P` → retira X de qualquer alerta aberto não enviado e anexa em `afetados` do alerta aberto que contém P (principal, `quedas` ou `afetados`), senão abre um com principal P; (2) `offline` → anexa ao alerta `queda` aberto mais recente com `aberto_em ≥ agora − 30 s`, `envio='pendente'` e mesmo `silenciado`, senão abre; (3) `online` → marca `voltaram`; fecha quando todos de `quedas` voltaram: se `envio='pendente'` e duração < 120 s → `breve=true`; se `envio='enviado'` e duração < 120 s → `breve=true` e marca o alerta para **edição** da mensagem já enviada (sem criar `volta`); se `envio='enviado'` e duração ≥ 120 s → cria `volta`; (4) `instavel` só registra o início em memória; `tick` abre após 300 s. Ancestrais para a cobertura: sobe `pai_id` (≤ 8) no banco.
- [ ] **Step 4:** suítes verdes; commit `feat(alertas): agrupador com correlação, janela de 30 s e caiu-e-voltou`.

### Task 5: API de alertas e WebSocket

**Files:**
- Create: `core/sentinela/api/alertas.py`, `core/sentinela/alertas/textos.py`, `core/tests/api/test_alertas_api.py`, `core/tests/alertas/test_textos.py`
- Modify: `core/sentinela/api/esquemas_alertas.py`, `core/sentinela/api/ws.py`, `core/sentinela/main.py` (router), `core/tests/api/test_ws.py`

**Interfaces:**
- Consumes: `Alerta`, mensagens `alerta` (Task 4).
- Produces:
  - `@dataclass(frozen=True) DadosAlerta(tipo: str, nome: str, ip: str | None, classe: str | None, quedas: int, afetados: int, aberto_em: datetime, fechado_em: datetime | None, breve: bool, fonte: str | None)`; `async dados_do_alerta(db, alerta: Alerta) -> DadosAlerta`; `texto_painel(d: DadosAlerta) -> str` (`"Switch Bloco B caiu · 14 afetados"`, `"5 equipamentos caíram"`, `"NVR Garagem caiu e voltou (1 min 40 s)"`, `"Câmera Portaria instável"`, `"Switch Bloco B voltou (fora por 18 min)"`, `"Fonte MikroTik sem coleta"`).
  - `GET /api/v1/alertas?filtro=abertos|reconhecidos|todos&classe=<slug>&desde=&ate=&pagina=&por_pagina=` (≤ 100; padrão `abertos`) → `Pagina[AlertaSaida]`; `GET /api/v1/alertas/{id}` → `AlertaDetalhe` (+ `afetados: [{id, nome, classe, estado}]`, no máximo 500); `POST /api/v1/alertas/{id}/reconhecer` (admin, auditado `alerta.reconhecer`, idempotente).
  - `AlertaSaida(id, tipo, texto, equipamento_id, equipamento_nome, classe, afetados_total, aberto_em, fechado_em, breve, reconhecido_por: str | None, reconhecido_em, silenciado, envio)`.
  - WS: `snapshot.alertas_abertos: int`; `{"tipo": "alerta", "acao", "alerta": AlertaSaida | null, "abertos": int}` (`removido` → `alerta: null`, `id`); `{"tipo": "silencio", "acao", "id"}` repassado.

- [ ] **Step 1: testes que falham**
  - textos: cada forma acima, com nome hostil (`<b>`, 300 caracteres) devolvido como texto (sem HTML, sem truncar — o front decide a quebra).
  - API: filtros (abertos/reconhecidos/todos; classe; período), paginação ≤ 100 (`por_pagina=101` → 422), ordenação `aberto_em` desc; visualizador lê e recebe 403 ao reconhecer; reconhecer sem CSRF 403; id desconhecido 404; `test_reconhecer_audita_e_publica`.
  - WS: `test_snapshot_traz_alertas_abertos`; `test_mensagem_alerta_chega_enriquecida`; `test_alerta_removido_chega_sem_linha`.
- [ ] **Step 2:** rodar; falham.
- [ ] **Step 3:** implementar; no `_Conexao.repassar`, `alerta` é enriquecido como `equipamento` (lê a linha no banco).
- [ ] **Step 4:** suítes verdes; commit `feat(api): alertas, reconhecimento e mensagens ao vivo`.

### Task 6: Guarda `DestinoExterno`, cliente Telegram e fila de envio

**Files:**
- Create: `core/sentinela/alertas/telegram.py`, `core/sentinela/alertas/despachante.py`, `core/sentinela/alertas/ajustes.py`, `core/tests/alertas/test_telegram.py`, `core/tests/alertas/test_despachante.py`, `core/tests/alertas/servidor_telegram.py` (servidor TLS de teste com certificado de `api.telegram.org` assinado por CA de teste gerada em fixture)
- Modify: `core/sentinela/rede/guarda.py`, `core/sentinela/alertas/textos.py`, `core/sentinela/seguranca/cofre.py` (`CHAVES_SECRETAS` + `"token"`), `core/sentinela/main.py` (laço `sentinela-telegram`, nunca no demo), `core/tests/rede/test_guarda.py`, `core/tests/rede/test_importacoes_restritas.py`

**Interfaces:**
- Consumes: `Alerta.envio*`, `DadosAlerta`, `Cofre`, `Settings.ca_adicional`, `horario`.
- Produces:
  - `guarda.NomeExterno = Literal["telegram"]`; `@dataclass(frozen=True) DestinoExterno(nome: NomeExterno, host: str, porta: int, ip: IPv4Address, _token: InitVar)` (mesma trava de `DestinoAutorizado`); `Guarda.validar_externo(nome: str, ip: str) -> DestinoExterno` (só `"telegram"` → `("api.telegram.org", 443)`; recusa IPv6, `255.255.255.255`, multicast, loopback (salvo `permitir_loopback` e `127.0.0.1`, como hoje), link-local, `0.0.0.0/8`; IP privado é aceito).
  - `URL_TELEGRAM = "https://api.telegram.org"`; `Resolver = Callable[[str], Awaitable[list[str]]]`; `ErroTelegram(mensagem: str, temporario: bool, espera_s: float | None)`; `class ClienteTelegram(guarda: Guarda, ca_adicional: str = "", resolver: Resolver | None = None, transporte: httpx.AsyncBaseTransport | None = None, timeout_s: float = 10.0)` com `async enviar(token: str, chat: str, texto: str) -> None`.
  - `ajustes.AjustesTelegram(token_cifrado: str | None, chats: list[str], incluir_ip: bool)`; `async ler_telegram(db) -> AjustesTelegram`; `async gravar_telegram(db, a: AjustesTelegram) -> None`; `async registrar_status(db, ok: bool, erro: str | None, agora: datetime) -> None`; `async ler_status(db) -> dict[str, Any]` (chaves `config` `telegram` e `telegram_status`).
  - `textos.texto_telegram(d: DadosAlerta, fuso: ZoneInfo, incluir_ip: bool) -> str`; `textos.texto_resumo(n: int) -> str` (`"… e mais 12 alertas, veja no painel"`); `textos.TEXTO_TESTE = "✅ Teste do Sentinela: as mensagens estão chegando."`.
  - `class Despachante(sessoes, cliente: ClienteTelegram, cofre: Cofre, relogio: Relogio, agora_parede: Callable[[], datetime], fuso: ZoneInfo)`: `async executar()` (ciclo a cada 5 s), `async ciclo() -> None`. Constantes `CONFIRMAR_QUEDA_S = 60`, `ESPERA_INICIAL_S = 30`, `ESPERA_MAX_S = 1800`, `DESISTIR = timedelta(hours=24)`, `POR_CHAT_MIN = 20`.

- [ ] **Step 1: testes que falham**
  - guarda: `test_externo_telegram_ip_publico_aceito`; `test_externo_ip_privado_aceito`; `test_externo_nome_desconhecido_recusado` ("Destino externo não permitido."); recusas de broadcast, multicast, loopback, link-local, `0.0.0.5`, IPv6; `DestinoExterno(...)` fora da Guarda → `TypeError`.
  - cliente (servidor TLS de teste em `127.0.0.1` com `Guarda(permitir_loopback=True)`, resolver falso → `127.0.0.1`): `test_envia_com_sni_e_host_api_telegram` (servidor vê SNI e `Host: api.telegram.org`, caminho `/bot<token>/sendMessage`, JSON `chat_id`/`text`); `test_certificado_de_outra_ca_recusado` sem `ca_adicional`; `test_ca_adicional_aceita`; `test_resolver_so_com_ip_proibido_nao_conecta` ("Endereço do Telegram recusado."); `test_429_temporario_com_retry_after`; `test_401_definitivo`; `test_sem_redirecionamento`; Review Focus 2: `test_erro_nunca_contem_token` (exceção do transporte com a URL completa → `str(erro)` e `caplog` sem o token).
  - despachante (cliente falso): `test_sem_configuracao_nada_sai` (resolver/cliente nunca chamados); `test_queda_espera_60s`; `test_volta_e_fonte_saem_sem_espera`; `test_silenciado_nunca_sai`; `test_varios_chats_reenvia_so_os_que_faltam` (`enviado_para`); `test_retentativa_30s_dobra_ate_30min`; `test_respeita_retry_after_maior`; `test_desiste_em_24h_falhou`; `test_limite_20_por_minuto_por_chat`; `test_fila_acumulada_vira_resumo` (25 pendentes → 19 individuais + 1 resumo; os 6 restantes `enviado`); `test_registra_status_generico`. Ruling do controlador (caiu-e-voltou com uma mensagem só): `test_breve_depois_do_envio_edita_mensagem` (queda enviada aos 60 s, volta aos 100 s → `editMessageText` em cada chat de `telegram_msgs` com o texto `🟡 … caiu e voltou (1 min 40 s)`, nenhum `sendMessage` novo); `test_edicao_falhou_nao_reenvia` (erro na edição → registra status genérico, não manda mensagem nova).
  - textos: `test_texto_queda_correlacionada` == `"🔴 Switch Bloco B caiu às 14:32 — 14 equipamentos afetados"`; caiu-e-voltou `"🟡 NVR Garagem caiu e voltou (1 min 40 s)"`; volta `"🟢 Switch Bloco B voltou às 14:50 (fora por 18 min)"`; grupo `"🔴 5 equipamentos caíram às 14:32"`; instável `"🟠 Câmera Portaria instável desde 14:05"`; fonte `"⚠️ Fonte MikroTik sem coleta desde 14:00"`; `incluir_ip=True` acrescenta ` (10.99.40.10)` após o nome; sem IP por padrão.
  - `test_importacoes_restritas`: `httpx`, `socket` e `ssl` permitidos também em `alertas/telegram.py`.
  - `test_demo_nao_inicia_despachante` (app com `demo=True` não tem a tarefa `sentinela-telegram`).
- [ ] **Step 2:** rodar; falham.
- [ ] **Step 3:** implementar. Resolução padrão: `loop.getaddrinfo(host, 443, family=AF_INET, type=SOCK_STREAM)`, primeiro IP aceito por `validar_externo`. Pedido: `POST https://{ip}/bot{token}/sendMessage` (ou `/editMessageText` com `chat_id`, `message_id`, `text` para o caiu-e-voltou; o `message_id` da resposta do `sendMessage` vai para `alerta.telegram_msgs`), cabeçalho `Host: api.telegram.org`, `extensions={"sni_hostname": "api.telegram.org"}`, `follow_redirects=False`, `verify=ssl.create_default_context(cafile=certifi.where())` + `load_verify_locations(ca_adicional)`. Erros só com textos fixos; log só com código HTTP. Espera: `min(30·2^(n−1), 1800)` ou `retry_after` se maior. Resumo quando os pendentes do ciclo passam do orçamento restante do chat mais apertado.
- [ ] **Step 4:** suítes verdes; commit `feat(alertas): envio ao Telegram por destino externo nomeado da Guarda`.

### Task 7: Configuração do Telegram e fuso na API

**Files:**
- Create: `core/sentinela/api/config_telegram.py`, `core/sentinela/api/config_geral.py`, `core/tests/api/test_config_telegram.py`
- Modify: `core/sentinela/api/esquemas_alertas.py`, `core/sentinela/main.py` (routers; `app.state.cliente_telegram`), `core/tests/api/test_segredos_nao_vazam.py`

**Interfaces:**
- Consumes: `ajustes` e `ClienteTelegram` (Task 6), `Cofre`, `comum.limitar_taxa`.
- Produces:
  - `GET /api/v1/config/telegram` (admin) → `TelegramSaida(token_definido: bool, chats: list[str], incluir_ip: bool, ultimo_envio: datetime | None, ultimo_erro: str | None)`.
  - `PATCH /api/v1/config/telegram` (admin, CSRF) com `TelegramEdicao(token: str | None, chats: list[str] | None, incluir_ip: bool | None)`; `token=""` apaga; token `^\d{5,12}:[A-Za-z0-9_-]{30,50}$`; chat `^-?\d{1,20}$` ou `^@[A-Za-z0-9_]{5,32}$`; ≤ 10 chats, sem repetidos. Auditoria `config.telegram` com `{"token_alterado": bool, "chats": n, "incluir_ip": bool}`.
  - `POST /api/v1/config/telegram/teste` (admin, `limitar_taxa`) → `{ok: bool, erro: str | None}`; demo → 409 "Indisponível no modo demonstração."; sem token/chat → 409 "Configure o token e ao menos um chat.".
  - `GET /api/v1/config/geral` (qualquer usuário) → `{fuso: str}`.

- [ ] **Step 1: testes que falham**
  - `test_token_nunca_sai` (GET/PATCH/teste); `test_patch_sem_token_mantem_o_antigo`; `test_token_vazio_apaga`; `test_onze_chats_422`; `test_chat_invalido_422`; `test_token_invalido_422`; visualizador 403; sem CSRF 403; `test_teste_envia_texto_fixo` (cliente falso); `test_teste_429_na_11a_vez`; `test_teste_demo_409`; `test_config_geral_mostra_fuso`.
  - `test_segredos_nao_vazam`: token marcador; erro do cliente com a URL completa no texto da exceção; procura o marcador em respostas, `caplog`, `auditoria` e `config.telegram_status` → 0 ocorrências.
- [ ] **Step 2:** rodar; falham.
- [ ] **Step 3:** implementar (token cifrado como `cofre.cifrar({"token": t})` em base64 dentro de `config.telegram.token_cifrado`).
- [ ] **Step 4:** suítes verdes; commit `feat(api): configuração do Telegram e fuso`.

### Task 8: Telão — emparelhamento, escopo `parede` e `/ws/parede`

**Files:**
- Create: `core/sentinela/parede/__init__.py`, `core/sentinela/parede/emparelhamento.py`, `core/sentinela/api/parede.py` (rotas da TV), `core/sentinela/api/paredes.py` (rotas do admin), `core/sentinela/api/ws_parede.py`, `core/tests/parede/__init__.py`, `core/tests/parede/test_emparelhamento.py`, `core/tests/api/test_parede_api.py`, `core/tests/api/test_ws_parede.py`
- Modify: `core/sentinela/api/ws.py` (`_Conexao` recebe `transformar: Callable[[Mensagem], Awaitable[dict[str, Any] | None]]`; o `/ws` atual vira uma instância disso sem mudar comportamento), `core/sentinela/main.py` (routers; `app.state.pedidos_ip = LimitadorIP(relogio, max_falhas=10, janela_s=3600)`)

**Interfaces:**
- Consumes: `Parede`, `ParedePedido`, `Config` (Task 1); `texto_painel` (Task 5); `hash_token` de `seguranca/sessoes.py`.
- Produces:
  - `ALFABETO = "23456789ABCDEFGHJKMNPQRSTUVWXYZ"`; `gerar_codigo() -> str` (`"XXXX-XXXX"`, `secrets`); `normalizar_codigo(texto: str) -> str | None`; `VALIDADE_PEDIDO = timedelta(minutes=10)`; `MAX_PENDENTES = 20`; `COOKIE_PEDIDO = "sentinela_parede_pedido"`; `COOKIE_PAREDE = "sentinela_parede"` (HTTPS); `COOKIE_PAREDE_HTTP = "sentinela_parede_http"`; `PAREDES_HTTP = "paredes_http"` (chave `config`, bool).
  - `async criar_pedido(db, ip: str, modo: Literal["https","http"], agora) -> tuple[ParedePedido, str, str]` (pedido, código, segredo; `LimitePedidos` se ≥ 20 pendentes); `async aprovar(db, codigo: str, nome: str, agora) -> Parede` (`CodigoInvalido` para desconhecido/expirado/usado); `async consultar(db, segredo: str, agora) -> Literal["pendente","expirado"] | tuple[Parede, str]` (gera o token na entrega, grava só o hash, marca `consumido_em`); `async parede_do_token(db, token: str, modo, ip: str, agora) -> Parede | None` (revogada → None; `http` exige `ip == ip_vinculado`; atualiza `ultimo_acesso`/`ultimo_ip` no máximo 1×/min); `async revogar(db, id: int, agora) -> bool`.
  - Rotas da TV (sem sessão; `isento_de_csrf`; dependência `exigir_canal(request)`: esquema `http` com `paredes_http` desligado → 404): `POST /api/v1/parede/pedido` → 201 `{codigo, expira_em, consulta_s: 5}` + cookie do pedido (`Path=/api/v1/parede`; 429 por IP > 10/h ou pendentes ≥ 20); `GET /api/v1/parede/pedido` → 202 `{estado:"pendente"}` | 200 `{estado:"aprovado", nome}` + cookie do token (1 ano; `Secure` só em HTTPS) | 410 `{estado:"expirado"}`; `GET /api/v1/parede/snapshot` → `{nome, fuso, classes:[{slug,nome,cor,icone,ordem}], equipamentos:[{id,nome,classe,estado,pai_id}], alertas:[{id,tipo,texto,aberto_em}]}` (≤ 20 abertos) ou 401.
  - Rotas do admin (admin, CSRF, auditadas): `GET /api/v1/paredes` → `[ParedeSaida(id, nome, modo, criado_em, ultimo_acesso, ultimo_ip, ativa)]`; `POST /api/v1/paredes/aprovar {codigo, nome}` (`parede.aprovar`; erro único 404 "Código inválido ou expirado."); `DELETE /api/v1/paredes/{id}` (`parede.revogar`; publica `Mensagem("parede_revogada", {"id"})`); `GET`/`PATCH /api/v1/config/paredes {permitir_http: bool}` (`config.paredes`).
  - `/ws/parede`: Origin `https://{Host}`; `http://{Host}` só com `paredes_http` ligado e cookie `COOKIE_PAREDE_HTTP`; fecha 4401 sem token válido; envia o snapshot reduzido e repassa `estado` (`id`, `estado`, `desde`, `causa`), `equipamento` reduzido e `alerta` reduzido (`{id, tipo, texto, aberto_em}` / fechado / removido); `parede_revogada` com o próprio id → 4401 na hora; revalida a cada 60 s; ping 25 s.

- [ ] **Step 1: testes que falham**
  - emparelhamento: `test_codigo_formato_e_alfabeto` (1.000 códigos, regex `^[2-9A-HJKMNP-Z]{4}-[2-9A-HJKMNP-Z]{4}$`); `test_normalizar_codigo` (`"k7mq2xdp"` → `"K7MQ-2XDP"`; `"K7MQ-2XD0"` → None); `test_pedido_expira_em_10_min`; `test_codigo_uso_unico` (segunda aprovação → `CodigoInvalido`; segunda consulta após entrega → `expirado`); `test_maximo_20_pendentes`; `test_banco_guarda_so_hashes` (nem código, nem segredo, nem token em claro em nenhuma coluna).
  - API da TV: `test_11o_pedido_do_mesmo_ip_na_hora_429`; `test_fluxo_completo_https` (pedido → aprovar → consulta 200 com cookie `HttpOnly; Secure; SameSite=Strict`); `test_snapshot_sem_ip_mac_fabricante_latencia` (serializa a resposta e procura `10.99.`, `02:00:00`, `latencia`, `fabricante` → ausentes); `test_token_parede_nao_abre_api_nem_ws_do_painel` (`/api/v1/equipamentos` 401, `/ws` 4401); `test_http_desligado_404` (base `http://`); `test_http_ligado_cookie_sem_secure_e_ip_amarrado` (outro IP → 401); `test_token_https_recusado_por_http_e_vice_versa`.
  - admin: visualizador 403; sem CSRF 403; `test_aprovar_e_revogar_auditados`; `test_codigo_errado_404_generico`.
  - WS: `test_ws_parede_snapshot_reduzido`; `test_latencias_nao_repassadas`; `test_revogar_derruba_ws_na_hora` (fecha 4401 sem esperar a revalidação); `test_origem_http_so_com_chave`; o `test_ws.py` existente continua verde sem mudança.
- [ ] **Step 2:** rodar; falham.
- [ ] **Step 3:** implementar. Código e segredo guardados como SHA-256; token de 32 bytes (`secrets.token_urlsafe`). O esquema vem de `request.url.scheme` (o uvicorn já roda com `--proxy-headers`; o nginx da porta 80 passará `X-Forwarded-Proto: http` na Task 11).
- [ ] **Step 4:** suítes verdes; commit `feat(parede): emparelhamento pela TV, token só leitura e WebSocket reduzido`.

### Task 9: Front — inalcançável em todas as visões e "Depende de"

**Files:**
- Modify: `web/src/js/lista.js`, `web/src/js/organograma.js`, `web/src/js/teia/aparencia.js`, `web/src/js/teia/objetos.js` (forma `elo`), `web/src/js/visoes.js` (`fichaDoEquipamento`), `web/src/js/teia-pagina.js`, `web/src/js/app.js`, `web/src/index.html` (símbolo SVG `i-inalcancavel`, legenda, filtro de estado, campo "Depende de" na ficha), `web/src/css/componentes.css`, `web/src/vendor/teia-3d.bundle.js` + `.sha256` + `LICENSES-teia.txt` (regenerados por `bash build/construir-teia.sh`)
- Create: `web/src/js/dependencia.js`, `web/tests/js/dependencia.test.mjs`
- Test: `web/tests/js/lista.test.mjs`, `organograma.test.mjs`, `aparencia.test.mjs`, `objetos.test.mjs`, `web/tests/test_smoke.py`

**Interfaces:**
- Consumes: `estado` com `causa`, `EquipamentoSaida.pai_id`, `PATCH /equipamentos/{id} {pai_id}` (Task 2).
- Produces:
  - `ESTADOS.inalcancavel = { rotulo: "Inalcançável", icone: "i-inalcancavel", peso: 1 }`; `grupoDe("inalcancavel") === "inalcancavel"`; `contar()` ganha `inalcancavel`; `aplicarEstado` guarda `causa`.
  - `GRAVIDADE = { offline: 0, inalcancavel: 1, instavel: 2, suspeito: 3, desconhecido: 4, pausado: 5, online: 6 }`.
  - Teia: `VISUAL.inalcancavel = { cor: "#7A8194", forma: "elo", pulsa: false, treme: false, opacidade: 0.7 }` (toro aberto: forma diferente de `translucida` e `anel`).
  - `dependencia.js`: `descendentes(store, id) -> Set<string>`; `candidatosPai(store, id, busca, max = 50) -> [{id, nome, classe}]` (sem o próprio nem descendentes; busca sem acento/maiúscula); `motivoInalcancavel(item, store) -> string` (`"Depende de Switch Bloco B (inalcançável)"`).

- [ ] **Step 1: testes que falham**
  - Node: rótulos/contagem/filtro de `inalcancavel`; `grupoDe` e ordenação por gravidade; `aparenciaDe("inalcancavel").forma === "elo"` e diferente de `pausado`; `candidatosPai` exclui ciclo e o próprio; nome hostil vira texto.
  - Smoke: `test_depende_de_define_e_mostra_na_ficha` (admin escolhe o pai pela busca, salva, a ficha mostra "Depende de …"); `test_depende_de_ciclo_mostra_erro_da_api`; `test_camera_de_gravador_depende_de_so_leitura`; `test_visualizador_nao_edita_depende_de`; `test_legenda_tem_inalcancavel_com_icone`; zero erro de console.
- [ ] **Step 2:** rodar; falham.
- [ ] **Step 3:** implementar; regenerar o bundle da Teia (`cd web && bash build/construir-teia.sh`) e commitar `src/vendor/` (o CI compara).
- [ ] **Step 4:** `npm test`, smoke verdes; capturas da ficha com "Depende de" nas 8 larguras (script da Task 10 ou Playwright direto), olhadas uma a uma; commit `feat(web): estado inalcançável nas visões e campo Depende de`.

### Task 10: Front — aba Alertas e Configurações → Telegram

**Files:**
- Create: `web/src/js/alertas.js`, `web/src/js/config-telegram.js`, `web/src/css/alertas.css`, `web/tests/js/alertas.test.mjs`, `web/tests/js/config-telegram.test.mjs`, `web/tests/capturar_telas.py` (Playwright: URL, lista de destinos, pasta de saída; larguras fixas 360, 390, 768, 1024, 1280, 1366, 1440, 1920; altura 900; tema claro e escuro)
- Modify: `web/src/index.html` (aba "Alertas" com contador, `section#conteudo-alertas`, diálogo de silêncio/manutenção, cartões Telegram e Fuso em Configurações), `web/src/js/app.js`, `web/src/js/visoes.js` (`ABAS` + `"alertas"`), `web/src/js/tema.js` (deep link `#alertas`), `web/src/js/api.js` se precisar, `web/tests/test_smoke.py`, `web/tests/conftest.py`

**Interfaces:**
- Consumes: Tasks 3, 5 e 7 (rotas e mensagens `alerta`/`silencio`).
- Produces:
  - `alertas.js`: `linhaDoAlerta(a, agora) -> {id, marca: "aberto"|"instavel"|"fechado", icone, hora, texto, rotuloEnvio, afetados}`; `rotuloEnvio(envio, silenciado) -> "Telegram enviado"|"Telegram pendente"|"Telegram falhou"|"Silenciado"|""`; `aplicarMensagemAlerta(lista, msg) -> lista`; `ATALHOS = [{valor:"1h",rotulo:"1 hora"},{valor:"4h",rotulo:"4 horas"},{valor:"amanha_8h",rotulo:"Até amanhã 08:00"},{valor:"personalizado",rotulo:"Personalizado"}]`; `validarSilencio(form, agora) -> erros` (fim futuro, ≤ 30 dias, alvo obrigatório); `alertasDoPainel(store)` (mixin do componente `painel`).
  - `config-telegram.js`: `validarTelegram(valores) -> erros`; `montarTelegram(valores) -> corpo do PATCH` (sem `token` quando o campo ficou vazio).

- [ ] **Step 1: testes que falham**
  - Node: cada forma de linha; texto de 300 caracteres continua inteiro (sem `…`); mensagens `aberto/atualizado/fechado/removido` aplicadas em ordem; contador de abertos; validação do silêncio; validação/montagem do Telegram (11 chats, token malformado, campo vazio não apaga).
  - Smoke: `test_aba_alertas_lista_abertos_e_contador_no_menu` (demo semeia; fixture insere alertas se preciso); `test_alertas_filtros_e_abrir_afetados`; `test_reconhecer_atualiza_ao_vivo`; `test_silenciar_1h_aparece_e_encerrar`; `test_criar_manutencao_pausa_e_mostra`; `test_visualizador_ve_alertas_sem_botoes`; `test_deep_link_alertas_sem_piscar_lista`; `test_telegram_token_nunca_volta_ao_formulario`; `test_configuracoes_mostra_fuso`; zero erro de console.
- [ ] **Step 2:** rodar; falham.
- [ ] **Step 3:** implementar na linguagem visual existente (vidro, cores suaves, espaçamentos de 4 px); ícone + texto no estado de cada linha (não só cor); título longo quebra linha, nunca reticências; botões só para admin.
- [ ] **Step 4:** `npm test`, smoke ×3 verdes; `uv run --with pytest-playwright python ../web/tests/capturar_telas.py` em `#alertas` (com e sem silêncio ativo, diálogo aberto) e `#configuracoes` → olhar as 16 capturas (8 larguras × 2 temas) uma a uma; Lighthouse 13.6.0 desktop (sessão de admin, como na Fase 3) em `#alertas` e `#configuracoes` = 100 nas quatro notas (registrar números); primeira tela ≤ 150 KB gzip; commit `feat(web): aba Alertas e configuração do Telegram`.

### Task 11: Página `/parede`, Configurações → Telões e nginx

**Files:**
- Create: `web/src/parede/index.html`, `web/src/parede/parede.css`, `web/src/js/parede/principal.js`, `web/src/js/parede/estado.js`, `web/src/js/parede/fps.js`, `web/src/js/parede/emparelhar.js`, `web/src/js/config-paredes.js`, `web/build/parede-entrada.js`, `web/build/teia-parede-entrada.js`, `web/build/empacotar-parede.mjs`, `web/nginx/proxy-core-http.conf`, `web/tests/js/parede.test.mjs`, `web/tests/js/config-paredes.test.mjs`
- Modify: `web/build/construir-teia.sh` (também gera os bundles do telão e seus `.sha256` em `src/parede/`), `web/Dockerfile` (confere `src/parede/*.sha256`; bundles do telão não são re-minificados), `web/nginx/nginx.conf`, `web/src/js/ws.js` (`criarConexao(ganchos, caminho = "/ws")`), `web/src/index.html` (cartão Telões), `web/src/js/app.js`, `web/tests/test_smoke.py`

**Interfaces:**
- Consumes: Task 8 (rotas e `/ws/parede`), Task 9 (`aparenciaDe`, organograma), `ws.js`.
- Produces:
  - Bundles: `src/parede/parede.bundle.js` (IIFE, `target: "es2017"`, sem sourcemap: página, emparelhamento, WS, contadores, faixa, relógio e Organograma em modo telão) e `src/parede/teia-parede.bundle.js` (ESM `target: "es2017"`, Teia em modo reduzido, sem partículas), carregado por `<script type="module">` injetado; erro de carga/sintaxe ou falta de WebGL → Organograma. Se o esbuild recusar baixar algo do three para ES2017, esse **segundo** bundle sobe para o menor alvo aceito e o fato fica registrado no README (a queda para o Organograma cobre a TV).
  - `fps.js`: `criarMedidorFps({limite = 30, janelaMs = 10000})` com `quadro(ts)` e `deveTrocar() -> boolean`.
  - `estado.js`: `contadoresDaParede(itens) -> {online, instavel, offline, inalcancavel}`; `faixaDeAlertas(alertas, max = 6) -> {visiveis, restantes}`; `estadoDaConexao(ultimoContatoMs, agoraMs) -> "ok"|"sem_conexao"` (> 60 000 ms); `horaNoFuso(data, fuso) -> "14:32"` (`Intl.DateTimeFormat`).
  - `emparelhar.js`: `proximoPasso(status) -> "esperar"|"entrar"|"novo_codigo"` (202/200/410 e 401 → novo código).
  - `config-paredes.js`: `normalizarCodigo(texto) -> string | null` (mesma regra do servidor); `linhaDoTelao(p, agora)`.
  - nginx: HTTPS ganha `location = /parede { try_files /parede/index.html =404; }` e `location = /ws/parede` (upgrade). Porta 8080 ganha `location = /parede`, `location /parede/`, `location = /favicon.svg` (estáticos, CSP própria `default-src 'self'; connect-src 'self' ws:; img-src 'self' data:; style-src 'self'; script-src 'self'; frame-ancestors 'none'`, demais cabeçalhos do §13, **sem HSTS**), `location /api/v1/parede/` e `location = /ws/parede` com `include proxy-core-http.conf` (igual ao `proxy-core.conf`, mas `X-Forwarded-Proto http`); o resto continua no redirecionamento. Quem libera é o core (404 com a chave desligada).

- [ ] **Step 1: testes que falham**
  - Node: medidor troca só após 10 s abaixo de 30 FPS (9,9 s não; oscilação acima zera); contadores com `inalcancavel`; faixa com 9 alertas → 6 + "e mais 3"; sem conexão aos 60 001 ms; `proximoPasso`; `normalizarCodigo`; o `parede.bundle.js` gerado não contém `?.`, `??`, `class X { campo =` nem `#privado` (sintaxe pós-ES2017) — teste lê o arquivo.
  - Smoke: `test_parede_mostra_codigo_e_instrucao`; `test_parede_emparelha_e_mostra_contadores_e_relogio` (admin aprova pela tela Telões noutro contexto; a TV entra sozinha em ≤ 10 s); `test_parede_nunca_mostra_ip_nem_mac` (texto e DOM sem `10.99.`/`02:00:00`); `test_parede_revogar_volta_ao_codigo`; `test_parede_sem_conexao_aviso_apos_60s` (`page.clock` + core derrubado ou rota do WS bloqueada); `test_parede_sem_webgl_usa_organograma`; `test_parede_cursor_escondido_e_nada_clicavel`; `test_teloes_codigo_errado_mostra_erro_generico`; `test_permitir_http_mostra_aviso_hsts`; zero erro de console.
  - nginx: `docker build -t sentinela-web:teste web && docker run --rm sentinela-web:teste nginx -t` passa; com o compose de demo, `curl -si http://localhost:8080/parede` → 200 sem `Strict-Transport-Security`; `curl -si http://localhost:8080/api/v1/parede/snapshot` → 404 com a chave desligada; `curl -si http://localhost:8080/` → 301 para HTTPS.
- [ ] **Step 2:** rodar; falham.
- [ ] **Step 3:** implementar. Página sem Alpine (o telão roda JS puro); `cursor: none`; nada focável; aviso discreto "Conexão sem cifra (HTTP)" quando `location.protocol === "http:"`; reconexão do WS com o recuo de `ws.js`; código renovado automaticamente ao expirar.
- [ ] **Step 4:** `npm test`, smoke ×3 verdes; capturas nas 8 larguras (altura 900) de `/parede` (tela do código, telão com Teia, telão em Organograma, faixa com 9 alertas, aviso "sem conexão") e de `#configuracoes` com Telões, olhadas uma a uma; Lighthouse 100 nas quatro notas em `/parede` e `#configuracoes`; commit `feat(web): telão /parede, aprovação em Configurações e rotas HTTP opcionais`.

### Task 12: Prova de zero broadcast com Telegram falso

**Files:**
- Create: `testes-rede/simuladores/telegram_falso.py` (servidor HTTPS em 443 com certificado de `api.telegram.org` assinado pela CA descartável; aceita `POST /bot<token>/sendMessage` e `/editMessageText`; `GET /_recebidas` para a cena)
- Modify: `testes-rede/compose.captura.yml` (serviço `sim-telegram` em `10.99.250.60`, MAC `02:00:00:fa:00:60`; `extra_hosts: ["api.telegram.org:10.99.250.60"]` no serviço `captura`, dono do namespace e do `/etc/hosts` que o core usa; core com `SENTINELA_CA_ADICIONAL=/certs-teste/ca.pem` e volume só leitura), `testes-rede/rodar.sh` (gera CA e certificado com `openssl` em `saida/certs-teste/`; passa `--unicast-permitido`), `testes-rede/simuladores/rodar.py` (`telegram`), `testes-rede/simuladores/cena.py`, `testes-rede/analisar_captura.py` (`--unicast-permitido`), `core/tests/rede/test_analisar_captura.py`, `testes-rede/README.md`

**Interfaces:**
- Consumes: Tasks 6–8 pela API.
- Produces: `analisar_captura.py --unicast-permitido <IPs/CIDRs>`: todo unicast IPv4 do Sentinela para destino fora da lista reprova ("unicast para destino não autorizado <ip>"); sem a opção, comportamento atual.

- [ ] **Step 1: testes que falham** (`core/tests/rede/test_analisar_captura.py`, pcaps sintéticos): `test_unicast_fora_da_lista_reprova`; `test_unicast_para_telegram_falso_passa`; `test_sem_opcao_comportamento_antigo`.
- [ ] **Step 2:** rodar; falham.
- [ ] **Step 3:** implementar o analisador e a cena: depois do que já faz, configura o Telegram (token fictício `123456:` + 35 caracteres, chat `-1001`), cadastra `10.99.250.50` (ICMP, ninguém responde) para cair, espera a mensagem `🔴 … caiu` chegar ao falso (≤ 150 s), emparelha um telão (pedido, aprovar, consulta, abre `/ws/parede` e lê o snapshot) e grava `unicast_permitido.txt` (cena, simuladores, `.50`, `.60`, faixa varrida) e acrescenta `.50` e `.60` ao `arp_permitido.txt`; `.60` entra em `--exigir-contato`.
- [ ] **Step 4:** `bash testes-rede/rodar.sh` → `APROVADO`; `docker compose -p sentinela-captura -f testes-rede/compose.captura.yml exec core getent hosts api.telegram.org` mostra `10.99.250.60` durante a rodada (se o Docker recusar `extra_hosts` com `network_mode`, montar um `hosts` próprio no `captura` e registrar no README); job `captura` do CI verde; commit `test(rede): prova de captura cobre Telegram e telão`.

### Task 13: Demonstração, documentação e verificação final

**Files:**
- Modify: `core/sentinela/demo/simulador.py`, `core/sentinela/main.py`, `core/tests/demo/test_simulador.py`, `README.md`, `docs/arquitetura/ARQUITETURA.md`, `.env.example`

**Interfaces:**
- Consumes: tudo.
- Produces: `semear_alertas_demo(sessoes, agora: datetime) -> bool` (idempotente); `ChecagemSimulada(..., queda_correlacionada: tuple[str, list[str]] | None = None)` (IP do pai e IPs dos filhos: a cada 600 s, começando 90 s após subir, todos falham por 180 s).

- [ ] **Step 1: testes que falham**
  - `test_demo_semeia_pai_e_14_filhos` (primeiro switch por nome é o pai de 14 equipamentos não-gravador, determinístico pela seed); `test_demo_semeia_alertas` (uma queda correlacionada fechada há 1 h 40 min com 14 afetados e uma câmera caiu-e-voltou `breve=true`, todos `envio='nao_aplica'`); `test_demo_semeia_telao_emparelhado` (`TV Portaria (demo)`, sem token utilizável); `test_queda_correlacionada_programada` (relógio falso: aos 90 s pai e filhos falham, aos 270 s voltam); idempotência (segunda chamada → False).
- [ ] **Step 2:** rodar; falham.
- [ ] **Step 3:** implementar e chamar no `_montar_monitor` do demo depois de `semear_fontes_demo`.
- [ ] **Step 4:** docs: README ("Alertas e Telegram": criar o bot, chats, minimização de dados, silêncio × manutenção, retentativas; "Telão": emparelhar, revogar, modo HTTP, HSTS prende a TV ao HTTPS, reservar o IP da TV no roteador; fuso; demo); `.env.example` revisado; ARQUITETURA §9.2 (estado `inalcancavel`), §9.4 (regras reais), §10 (tabelas novas), §11 (rotas e mensagens WS novas), §12.2 (aba Alertas, telão), §13 (exceção `DestinoExterno` e escopo `parede`), §17 ADR 012 (Telegram por destino externo nomeado) e ADR 013 (código mostrado na TV), §18 "Fase 4A concluída em <data>" com números.
- [ ] **Step 5:** verificação completa: suítes do core e do web, smoke ×3, captura `APROVADO`, `pip-audit`, `trivy` 0 HIGH/CRITICAL corrigíveis, primeira tela ≤ 150 KB gzip, Lighthouse 100 ×4 em `#alertas`, `#configuracoes` e `/parede`; capturas nas 8 larguras × 2 temas de todas as telas novas com a demo rodando (inclui um inalcançável ao vivo na Lista, Teia e Organograma durante a queda programada), olhadas uma a uma e registradas no relatório. Item de aceite para o dono (sem TV no CI): abrir `/parede` na Samsung UN65RU7100 (Tizen 5.0), emparelhar e conferir se roda a Teia ou cai para o Organograma.
- [ ] **Step 6:** reconstruir a demo no lugar: marcar imagens atuais `pre_<ts>`, `SENTINELA_PORTA_HTTPS=8443 SENTINELA_PORTA_HTTP=8080 ./install.sh --demo` (mesmo volume e admin; nunca imprimir a senha); containers healthy; aba Alertas com os 2 semeados; Telões com a TV demo; abrir `http://localhost:8080/parede` → 404 nos dados com a chave desligada.
- [ ] **Step 7:** commit `docs: Fase 4A (alertas e telão) e demonstração com alertas simulados`.
