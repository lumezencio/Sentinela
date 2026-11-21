# Fase 5 — Produto instalável e vigilância contínua: plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** qualquer pessoa instala o Sentinela num Raspberry Pi 4/5 ou num Linux com uma linha, cria o administrador e confirma a rede pela tela (protegida por um código de instalação), recebe aviso de cada aparelho novo, tem atualização automática de madrugada com volta e lê em português por que a rede "cai e volta", terminando em `0.5.0`.

**Architecture:** o core ganha quatro peças: (1) `descoberta/varredura_continua.py`, um laço que chama a `Varredura` lenta existente a cada N minutos por sub-rede, guardando `ultima_varredura_em` e a **linha de base** (`linha_base_em`) em `sub_rede`; (2) o tipo de alerta `aparelho_novo`, que o orquestrador anuncia no barramento e o `Agrupador` da Fase 4A abre, fecha e entrega ao `Despachante`; (3) `seguranca/instalacao.py` + `api/primeiro_acesso.py` (código de 8 caracteres gerado pela CLI dentro do core, guardado só como argon2id em `/dados/instalacao.json`; as rotas respondem 404 quando existe qualquer usuário); (4) `diagnostico/`, que calcula incidentes na leitura a partir da tabela `evento` e de `leitura_uptime` (sysUpTime/MikroTik). O host ganha `instalar.sh` (Docker oficial, clone da última tag, rede sugerida no `.env`, `install.sh`, código, timer systemd) e `update.sh --automatico`, que registra o resultado em `/dados/atualizacao.json` pela CLI do core; o core só lê esse arquivo e nunca ganha acesso ao Docker.

**Tech Stack:** Python 3.12, FastAPI, SQLAlchemy 2 async/aiosqlite, Alembic, argon2-cffi (já usado), pysnmp e cliente RouterOS próprios (já existentes); front HTML/JS sem framework (assistente em JS puro, painel em Alpine CSP 3.15.12), esbuild 0.28.2; bash (`set -euo pipefail`), systemd timer, Docker Compose 2.24.4+; testes pytest, `node --test`, Playwright e `testes-operacao/` com shims.

**Spec:** `docs/superpowers/specs/2026-11-20-fase5-produto-design.md` (aprovada em 2026-11-20; vale inteira). Fase anterior: `docs/superpowers/plans/2026-11-18-fase4b-operacao.md` (concluída; a última migração é a `0005`, esta é a `0006`). Arquitetura: `docs/arquitetura/ARQUITETURA.md`.

## Global Constraints

- Branch `fase5-produto`; nunca commitar em `main`; nunca push; **não criar a tag `v0.5.0`** (o dono cria em `main` depois do merge; o push da tag dispara `release.yml`). Commits terminam com `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- **Ambiente (Windows 11):** shell dos scripts = Git Bash (`MSYS_NO_PATHCONV=1` já nos scripts). Processos em segundo plano travam: rode as suítes longas **em primeiro plano**, com a saída redirecionada para um arquivo na pasta de rascunho e lida depois (ex.: `uv run pytest -q -W error > "$RASCUNHO/pytest.txt" 2>&1; tail -n 20 "$RASCUNHO/pytest.txt"`), com `timeout` de até 600 s.
- **Instalação real do dono:** projeto compose `sentinela`, rodando de `C:\Projetos\sentinela-real` nas portas 9443/9080. **Nunca** parar, reconstruir, reiniciar nem fazer `compose up/down` nele; **nunca** rodar `install.sh`, `instalar.sh`, `update.sh` nem `docker compose up` em `C:\Projetos\sentinela`. `testes-operacao/rodar.sh` recusa rodar com contêineres do projeto `sentinela` (fica para o CI). `testes-rede/rodar.sh` só mexe no projeto `sentinela-captura`: confira `name:` do `testes-rede/compose.captura.yml` antes de rodar; na dúvida, deixe para o CI.
- Rede: zero broadcast e multicast próprios. O único ARP é o da varredura lenta (2 IPs/s, `intervalo_varredura_ips_s` existente), só em sub-rede com `permite_varredura`. A varredura agendada usa exatamente a mesma `Varredura`; a prova de captura passa a cobri-la. O Sentinela não instala nem anuncia mDNS.
- Valores fixos da spec: varredura contínua a cada **30 min** (ajustável **15–240 min**); atualização às **03:00** hora local, **ligada por padrão**; código de instalação de **8 caracteres** do alfabeto do telão (`23456789ABCDEFGHJKMNPQRSTUVWXYZ`), válido até existir o primeiro usuário e por no máximo **24 h**; incidentes = quedas que **começam até 30 s** depois do início do incidente; "roteador reiniciou" = gateway e os de trás caem juntos e voltam juntos depois de **30 a 180 s**; "instabilidade" = mesmo aparelho cai **mais de 3 vezes em 1 h**; resumo de **24 h, 7 dias e 30 dias**; aviso de atualização no painel por **24 h**; rede do assistente só RFC 1918, de **/16 a /30**; versão de saída **0.5.0**.
- Textos fixos da spec: `"novo aparelho conectou na rede"`, botão `"Ver em Novos"`, chave `"Achar os aparelhos sozinho (varredura)"`, aba `"Diagnóstico"`, cartão `"Configurações → Atualizações"`, avisos `"Atualizado para 0.5.0"` e `"A atualização para X falhou; o Sentinela voltou para Y"`. Laudo diz "provável" sempre que não houver `sysUpTime` que confirme, e mostra o porquê.
- Código de instalação: só no terminal de quem instalou. Nunca em log, `.env`, arquivo legível (o arquivo guarda só o argon2id), auditoria, resposta da API nem log do shim de teste. Comparação pelo verificador do argon2 (tempo constante); limite por IP **e** bloqueio progressivo global.
- Atualização automática só por `update.sh` (mesma verificação cosign/`digests.txt`, mesmo backup e mesma volta da Fase 4B). O core **não** recebe `/var/run/docker.sock`, `privileged` nem `subprocess`. Em Windows/Docker Desktop não há timer, e a tela diz isso com o comando manual.
- API: toda rota nova com autenticação e papel (as três do primeiro acesso são sem sessão, isentas de CSRF, exigem `application/json` e respondem 404 depois do primeiro usuário), CSRF em escrita, validação de entrada, limite de taxa onde sensível, erro genérico, auditoria de ação de admin; listas com teto.
- Repositório público: só dados fictícios (`10.99.x.x`, exemplos privados `192.168.x.x`, MACs `02:00:00:…`, códigos/logins fictícios). Migração `0006` reversível com `downgrade` testado.
- Interface (diretriz §5 do dono, vale para `primeiro-acesso.html`, os cartões de alerta, Configurações → Sub-redes/Atualizações, o aviso de 24 h e a aba Diagnóstico): capturas em **360, 390, 768, 1024, 1280, 1366, 1440 e 1920 px**, altura ~900 px, claro e escuro, **abertas uma a uma**; texto nunca truncado (cresce ou "ver completo"); espaçamentos em múltiplos de 4 px; dados reais de teste (login de 64 caracteres, fabricante de 120, 12 portas, mensagem de 200, 500 incidentes, nomes de 300 caracteres); Lighthouse 100 nas quatro categorias em `primeiro-acesso.html`, `#diagnostico` e `#configuracoes`; primeira tela ≤ 150 KB gzip; CSP inalterada; texto do servidor só por `textContent`/`x-text`.
- Modo demonstração: sem varredura contínua, sem Despachante, primeiro acesso 404 (a demo já tem admin), nenhum pacote na rede.
- Suítes verdes ao fim de cada tarefa: `cd core && uv run pytest -q -W error`, `uv run ruff check . && uv run ruff format --check . && uv run mypy sentinela`; tarefas de front também `cd web && npm test` e o smoke (`cd core && uv run --with pytest-playwright --with cryptography pytest ../web/tests -q`); tarefas de script também `bash testes-operacao/test_<nome>.sh` e `shellcheck -x` dos scripts tocados.

## Review Focus

1. Primeira varredura de uma rede com dezenas de aparelhos (pelo assistente, ou a primeira agendada depois de atualizar da 0.4.x) e primeira coleta de uma fonte recém-cadastrada → **nenhum** aviso `aparelho_novo` (tudo só entra em Novos); dali em diante, um aviso por aparelho inédito. (Task 3)
2. Contador `sysUpTime` (TimeTicks de 32 bits) que dá a volta aos ~497 dias, leitura que falha ou some durante o incidente → nunca vira "confirmado" nem quebra a coleta da fonte. (Tasks 4 e 5)
3. Nome de equipamento hostil no laudo CSV (`=HYPERLINK(...)`, `+`, `-`, `@`, `;`, aspas, quebra de linha, 300 caracteres) → célula neutralizada com `'` e entre aspas, texto inteiro, nada interpretado como fórmula. (Task 5)
4. Dois "Concluir" simultâneos com o código certo, código reaproveitado depois da conclusão, código com 24 h e 1 s → um só administrador; os demais recebem 404/401 genéricos e nada mais é criado. (Task 6)
5. Timer das 03:00 disparando com outra operação em curso (`update.sh`/`restore.sh` manual), árvore git suja ou core fora do ar → nada muda, sai 0 ou registra `falhou` com texto fixo; a gravação do resultado falhar nunca muda o código de saída nem desfaz a atualização. (Task 7)

---

### Task 1: Dados (migração 0006), configuração e ajustes

**Files:**
- Create: `core/alembic/versions/0006_produto.py`, `core/tests/db/test_migracao_0006.py`
- Modify: `core/sentinela/db/modelos.py` (`Alerta`, `SubRede`, `LeituraUptime`), `core/sentinela/config.py`, `core/sentinela/descoberta/ajustes.py`, `core/sentinela/monitor/limpeza.py`, `.env.example`, `core/tests/test_config.py`, `core/tests/monitor/test_limpeza.py`

**Interfaces:**
- Produces:
  - `Alerta`: CHECK `tipo IN ('queda','volta','instavel','fonte_falhou','aparelho_novo')`; `descoberta_id: Mapped[str | None]` (`String(36)`, FK `descoberta.id` `ondelete="SET NULL"`, índice).
  - `SubRede`: `gateway_ip: Mapped[str | None]` (`String(45)`); `ultima_varredura_em: Mapped[datetime | None]`; `linha_base_em: Mapped[datetime | None]` (`UTCDateTime`, nulos).
  - `LeituraUptime` (`leitura_uptime`): `id` int PK; `fonte_id` FK `fonte` CASCADE; `equipamento_id` FK `equipamento` CASCADE; `lido_em` `UTCDateTime`; `uptime_s` `Float`; `Index("ix_leitura_uptime_equipamento_lido", "equipamento_id", "lido_em")`.
  - `Settings.rede_sugerida: str = ""`, `Settings.gateway_sugerido: str = ""` (valor inválido **não** impede a subida: o validador devolve `""`; rede só RFC 1918 /16–/30 via `Guarda.validar_sub_rede`; gateway só IPv4 dentro de `rede_sugerida`, nem rede nem broadcast). `config.pasta_dados(settings: Settings) -> Path` (pasta do arquivo SQLite de `banco_url`; `/dados` em produção; banco em memória → `ValueError`).
  - `ajustes.VARREDURA_CONTINUA = "varredura_continua_min"`, `VARREDURA_CONTINUA_PADRAO = 30`, `VARREDURA_CONTINUA_MIN = 15`, `VARREDURA_CONTINUA_MAX = 240`; `AjustesDescoberta.varredura_continua_min: int = 30` (linha fora da faixa ou de tipo errado → limitado à faixa / padrão, como os outros).
  - `limpeza.RETER_UPTIME = timedelta(days=35)`; `ResultadoLimpeza.leituras_uptime: int`.

- [ ] **Step 1: testes que falham**
  - Migração: `test_upgrade_de_0005_aceita_aparelho_novo_e_colunas_nulas` (sub-redes e alertas existentes intactos, colunas novas nulas); `test_descoberta_apagada_anula_descoberta_id_do_alerta`; `test_leitura_uptime_some_com_a_fonte_ou_o_equipamento`; `test_downgrade_apaga_aparelho_novo_colunas_tabela_e_ajuste` (alertas de outros tipos e sub-redes intactos; linha `varredura_continua_min` de `config` removida).
  - Config: `test_rede_sugerida_valida` (`"192.168.15.0/24"`, gateway `"192.168.15.1"`); `test_rede_sugerida_invalida_vira_vazia_sem_impedir_a_subida` (`"8.8.8.0/24"`, `"10.0.0.0/8"`, `"lixo"` → `""`; gateway `"192.168.16.1"` fora da rede → `""`); `test_pasta_dados_e_a_do_banco`.
  - Ajustes: `test_varredura_continua_padrao_30_e_limitada_de_15_a_240`. Limpeza: `test_limpeza_apaga_leituras_de_uptime_com_mais_de_35_dias`.
- [ ] **Step 2:** rodar; falham.
- [ ] **Step 3:** implementar. Migração com `op.batch_alter_table("alerta", recreate="always")` para trocar o CHECK (SQLite); `downgrade` apaga `alerta` com `tipo='aparelho_novo'` antes de recriar o CHECK antigo. `.env.example`: `SENTINELA_REDE_SUGERIDA=` e `SENTINELA_GATEWAY_SUGERIDO=` com comentário ("preenchidas pelo instalar.sh; só sugestão do primeiro acesso; nada vai para a rede").
- [ ] **Step 4:** suítes verdes; commit `feat(dados): aparelho_novo, gateway e linha de base das sub-redes, leituras de uptime (migração 0006)`.

### Task 2: Varredura agendada e prova de captura

**Files:**
- Create: `core/sentinela/descoberta/varredura_continua.py`, `core/tests/descoberta/test_varredura_continua.py`
- Modify: `core/sentinela/descoberta/varredura.py`, `core/sentinela/api/varredura.py`, `core/sentinela/api/subredes.py`, `core/sentinela/api/esquemas_descoberta.py`, `core/sentinela/api/config_descoberta.py`, `core/sentinela/main.py` (laço `sentinela-varredura-continua`, fora da demonstração), `testes-rede/simuladores/cena.py`, `testes-rede/README.md`, `core/tests/descoberta/test_varredura.py`, `core/tests/api/test_varredura_api.py`, `core/tests/api/test_config_descoberta.py`

**Interfaces:**
- Consumes: Task 1 (`SubRede.*`, `AjustesDescoberta.varredura_continua_min`).
- Produces:
  - `varredura.OrigemVarredura = Literal["manual", "agendada", "primeiro_acesso"]`; `Varredura.iniciar(sub_rede_id: int, origem: OrigemVarredura = "manual") -> dict[str, Any]` (progresso e mensagens `varredura` ganham `"origem"` e `"sub_rede_id"`); `AoTerminar = Callable[[int, str], Awaitable[None]]`, novo parâmetro nomeado `Varredura(..., ao_terminar: AoTerminar)` chamado **uma vez** no fim com (`sub_rede_id`, `"concluida"|"cancelada"|"falhou"`); exceção dele só vai ao log.
  - `varredura_continua`: `TICK_S = 60.0`; `ATRASO_INICIAL_S = 60.0`; `async registrar_fim(sessoes, sub_rede_id: int, estado: str, agora: datetime) -> None` (qualquer estado final grava `ultima_varredura_em = agora`; só `concluida` com `linha_base_em` nula grava `linha_base_em = agora`); `async proxima_devida(db: AsyncSession, agora: datetime, intervalo: timedelta) -> int | None` (sub-rede com `permite_varredura` e `ultima_varredura_em` nula ou `≤ agora − intervalo`; nula primeiro, depois a mais antiga, empate pelo `id`); `class VarreduraContinua(sessoes, varredura: Varredura, relogio: Relogio, agora_parede: Callable[[], datetime])` com `async ciclo() -> int | None` (id iniciado com `origem="agendada"`; `VarreduraEmAndamento`/`VarreduraNaoPermitida` → `None` sem erro) e `async executar() -> None` (espera `ATRASO_INICIAL_S`, depois `ciclo` a cada `TICK_S`). `main.py` passa à `Varredura` um `ao_terminar` que chama `registrar_fim(sessoes, sub_rede_id, estado, agora_utc())`.
  - `api.subredes.aplicar_guarda(request: Request, db: AsyncSession) -> None` (o `_aplicar` atual, renomeado e público, comportamento igual: sincroniza, **um** commit, troca a Guarda, registra no agendador).
  - `SubRedeSaida` += `gateway_ip`, `ultima_varredura_em`, `linha_base_em`. `SubRedeEdicao`: `permite_varredura: bool | None = None`, `gateway_ip: str | None` (só os campos enviados; nenhum → 422; gateway fora da sub-rede, endereço de rede ou broadcast → 422 `"O gateway precisa estar dentro da sub-rede."`; `null` apaga); auditoria `subrede.editar` com antes/depois.
  - `AjustesSaida.varredura_continua_min: int`; `PATCH /api/v1/config/descoberta` aceita `varredura_continua_min` 15–240 (fora → 422), auditado.

- [ ] **Step 1: testes que falham**
  - Varredura: `test_progresso_tem_origem_e_sub_rede`; `test_ao_terminar_uma_vez_com_o_estado` (concluída, cancelada por `revogar`, falhou); `test_ao_terminar_com_erro_nao_quebra_a_varredura`.
  - Contínua (relógio falso): `test_sub_rede_nunca_varrida_e_devida_no_primeiro_tick`; `test_respeita_30_min` (29 min não, 30 min sim); `test_intervalo_ajustado_15_e_240`; `test_sem_permite_varredura_nunca`; `test_manual_em_curso_adia_sem_erro` (tenta de novo no tick seguinte); `test_cancelada_ou_falhou_so_volta_depois_do_intervalo`; `test_uma_por_vez_nunca_varrida_primeiro`; `test_linha_base_so_na_primeira_concluida`; `test_atraso_inicial_de_60s`; `test_demo_nao_inicia_o_laco` (`main` em demonstração: nenhuma tarefa `sentinela-varredura-continua`).
  - API: `test_get_varredura_mostra_origem_agendada`; `test_patch_gateway_dentro_da_rede` (fora, rede e broadcast → 422; `null` apaga; visualizador 403; auditoria); `test_patch_so_permite_varredura_continua_igual` (legado); `test_config_varredura_continua_limites` (14 e 241 → 422).
- [ ] **Step 2:** rodar; falham.
- [ ] **Step 3:** implementar. Cena da captura: depois do passo 2, novo passo "espera a varredura **agendada** de `10.99.250.32/28`" (sem `POST /varredura`; `GET /subredes` até `ultima_varredura_em` preenchida, teto 300 s; grava `"varredura_agendada"` em `cena.json`); o passo 7 (manual) continua. A lista `arp_permitido.txt` não muda (mesma faixa). README: passo novo e o porquê.
- [ ] **Step 4:** suítes verdes. Captura: `bash testes-rede/rodar.sh` (só projeto `sentinela-captura`, ver Global Constraints) ou registrar que fica para o job `captura` do CI. Commit `feat(descoberta): varredura agendada a cada 30 min e captura cobrindo a agendada`.

### Task 3: Alerta `aparelho_novo` (núcleo)

**Files:**
- Modify: `core/sentinela/descoberta/orquestrador.py` (`processar_achados`), `core/sentinela/descoberta/mescla.py`, `core/sentinela/alertas/agrupador.py`, `core/sentinela/alertas/textos.py`, `core/sentinela/alertas/despachante.py`, `core/sentinela/api/alertas.py`, `core/sentinela/api/esquemas_alertas.py`, `core/sentinela/api/parede.py`, `core/sentinela/api/ws_parede.py`, `core/sentinela/demo/simulador.py` (`semear_alertas_demo` ganha um `aparelho_novo` fictício que aponta para uma descoberta pendente semeada por ela mesma, IP `10.99.x`)
- Test: `core/tests/descoberta/test_orquestrador.py`, `core/tests/alertas/test_agrupador.py`, `core/tests/alertas/test_textos.py`, `core/tests/alertas/test_despachante.py`, `core/tests/api/test_alertas_api.py`, `core/tests/api/test_parede_api.py`, `core/tests/api/test_ws_parede.py`

**Interfaces:**
- Consumes: Task 1 (`Alerta.descoberta_id`, `SubRede.linha_base_em`), Task 2 (`linha_base_em` gravada).
- Produces:
  - Barramento: `Mensagem("aparelho_novo", {"descoberta_id": str})`, publicada pelo orquestrador **depois do commit**, uma por descoberta de `r.novas` que (a) não é canal de gravador (`chave` sem `nvr:`) e (b) veio da varredura com o IP numa sub-rede com `linha_base_em`, **ou** veio de uma fonte cuja `ultima_coleta` já existia antes desta coleta. `mescla.async sub_rede_com_linha_base(db: AsyncSession, ip: str) -> bool`.
  - `agrupador.TIPO_APARELHO_NOVO = "aparelho_novo"`. `Agrupador.processar` trata `aparelho_novo` (abre um alerta por `descoberta_id`, `equipamento_id` nulo; mensagem repetida com alerta aberto é ignorada; silenciado quando a `Cobertura` cobre a classe cujo `slug` é a `classe_sugerida`; demonstração → `nao_aplica`) e `descoberta` com `acao="removida"` (aprovada ou ignorada: fecha o `aparelho_novo` aberto daquela descoberta por `_gravar`; se ainda `pendente`, vira `nao_aplica`).
  - `DadosAlerta` += `fabricante: str | None = None`, `portas: tuple[int, ...] = ()` (para `aparelho_novo`: `ip` = IP da descoberta, `portas` de `sinais["portas"]`; `nome_sugerido` nunca entra). Textos exatos: painel `f"Novo aparelho conectou na rede: {ip}"` + `f" ({fabricante})"` se houver; Telegram `f"🆕 Novo aparelho conectou na rede às {hora}"` + `f" — {ip}"` só com `incluir_ip` + `f" · {fabricante}"` + `f" · portas {', '.join(...)}"` se houver.
  - `despachante.CONFIRMAR_NOVO_S = 60` (o `aparelho_novo` espera 60 s, tempo da sondagem trazer as portas).
  - `AlertaSaida` += `descoberta_id: str | None`, `ip: str | None`, `fabricante: str | None`, `portas: list[int]` (preenchidos só em `aparelho_novo`). Telão (`parede.item_alerta`, snapshot e `ws_parede`) ignora `aparelho_novo` (o telão nunca mostra IP).

- [ ] **Step 1: testes que falham**
  - Orquestrador: `test_nova_da_varredura_com_linha_base_publica_aparelho_novo`; **Review Focus 1:** `test_primeira_varredura_da_sub_rede_nao_avisa` (40 achados → 0 mensagens; depois da `linha_base_em`, 1 IP inédito → 1 mensagem) e `test_primeira_coleta_da_fonte_nao_avisa_e_a_segunda_avisa`; `test_reaparecer_nao_e_novo` (descoberta existente, ignorada, ou aprovada com equipamento → nada); `test_canal_de_gravador_nao_avisa`; `test_mac_novo_num_ip_de_equipamento_avisa` (caso conflito).
  - Agrupador: `test_aparelho_novo_abre_um_alerta_pendente_com_descoberta`; `test_mensagem_repetida_nao_duplica`; `test_ignorar_fecha_e_nao_envia`; `test_aprovar_fecha`; `test_silencio_da_classe_sugerida_silencia`; `test_demo_nasce_nao_aplica`.
  - Textos/despachante: `test_texto_painel_aparelho_novo`; `test_texto_telegram_aparelho_novo_sem_ip_por_padrao_e_com_ip_ligado`; `test_nome_sugerido_hostil_nunca_entra`; `test_aparelho_novo_espera_60s_e_sai_com_as_portas`.
  - API: `test_alerta_aparelho_novo_traz_ip_fabricante_portas_e_descoberta`; `test_filtro_de_classe_exclui_aparelho_novo`; `test_telao_nao_recebe_aparelho_novo` (snapshot e `/ws/parede`: nenhum IP).
- [ ] **Step 2:** rodar; falham.
- [ ] **Step 3:** implementar. Em `processar_achados`, ler `fonte.ultima_coleta is None` **antes** de sobrescrevê-la, decidir os ids dentro da mesma transação e publicar só depois do `commit` (junto com `_publicar_resultado`).
- [ ] **Step 4:** suítes verdes; commit `feat(alertas): aviso de aparelho novo na tela e no Telegram, com linha de base`.

### Task 4: Tempo ligado das fontes (sysUpTime e MikroTik) e reinícios

**Files:**
- Create: `core/sentinela/descoberta/uptime.py`, `core/tests/descoberta/test_uptime.py`
- Modify: `core/sentinela/descoberta/fontes/base.py`, `core/sentinela/descoberta/fontes/snmp.py`, `core/sentinela/descoberta/fontes/mikrotik.py`, `core/sentinela/descoberta/orquestrador.py` (`_coletar_fonte`), `core/tests/descoberta/agente_snmp.py`, `core/tests/descoberta/simulador_routeros.py`, `core/tests/descoberta/test_fonte_snmp.py`, `core/tests/descoberta/test_fonte_mikrotik.py`, `core/tests/descoberta/test_orquestrador.py`

**Interfaces:**
- Consumes: Task 1 (`LeituraUptime`), `mescla.equipamento_por_ip`.
- Produces:
  - `base.ComUptime` (`Protocol` `runtime_checkable`): `ultimo_uptime_s: float | None`.
  - `snmp.OID_SYSUPTIME: Oid = (1, 3, 6, 1, 2, 1, 1, 3, 0)`; `ColetorSnmp.ultimo_uptime_s` (TimeTicks/100), lido **na mesma sessão** das tabelas; falha ou ausência → `None` sem afetar a coleta.
  - `mikrotik.CMD_UPTIME = ["/system/resource/print", "=.proplist=uptime"]`; `ColetorMikrotik.ultimo_uptime_s`.
  - `uptime`: `TETO_TIMETICKS_S = 2**32 / 100`; `TOLERANCIA_S = 120.0`; `@dataclass(frozen=True) Leitura(lido_em: datetime, uptime_s: float)`; `ler_uptime_mikrotik(texto: str) -> float | None`; `reinicios(leituras: list[Leitura]) -> list[datetime]` (boot estimado `lido_em − uptime_s`; boot que avança mais de `TOLERANCIA_S` em relação ao anterior = reinício nesse boot; a volta do contador — anterior + tempo decorrido ≥ `TETO_TIMETICKS_S − TOLERANCIA_S` e a leitura nova ≈ esse total − `TETO_TIMETICKS_S` — **não** é reinício); `async registrar_leitura(db, fonte_id: str, equipamento_id: str, uptime_s: float, lido_em: datetime) -> None` (sem commit; negativo ou > 10 anos é ignorado).
  - Orquestrador: depois de uma coleta **bem-sucedida** de um `ComUptime` com `ultimo_uptime_s`, grava a leitura para `fonte.equipamento_id` ou, sem ele, para o equipamento cujo IP é o `host` da fonte (nenhum → não grava). Erro aqui só vai ao log; nunca vira `ultimo_erro` da fonte.

- [ ] **Step 1: testes que falham**
  - `test_snmp_le_sysuptime_na_mesma_sessao` (agente responde 123456 ticks → 1234,56 s); `test_snmp_sem_sysuptime_coleta_igual`; `test_mikrotik_le_uptime`; `test_ler_uptime_mikrotik` (`"1w2d3h4m5s"` → 788645, `"45s"` → 45, `""` e `"abc"` → `None`).
  - `test_reinicio_detectado_quando_o_boot_avanca`; `test_leituras_continuas_sem_reinicio`; **Review Focus 2:** `test_volta_do_timeticks_nao_e_reinicio` e `test_falha_da_leitura_nao_marca_erro_na_fonte`.
  - `test_orquestrador_grava_leitura_da_fonte_ligada_ou_pelo_host`; `test_fonte_sem_equipamento_nao_grava`.
- [ ] **Step 2:** rodar; falham.
- [ ] **Step 3:** implementar (um `GET` SNMP a mais e um comando RouterOS a mais por coleta, ambos unicast pelo mesmo `DestinoAutorizado`).
- [ ] **Step 4:** suítes verdes; commit `feat(descoberta): tempo ligado das fontes SNMP e MikroTik para detectar reinícios`.

### Task 5: Diagnóstico de quedas (núcleo, API e CSV)

**Files:**
- Create: `core/sentinela/diagnostico/__init__.py`, `core/sentinela/diagnostico/incidentes.py`, `core/sentinela/diagnostico/classificacao.py`, `core/sentinela/diagnostico/textos.py`, `core/sentinela/diagnostico/relatorio.py`, `core/sentinela/api/diagnostico.py`, `core/tests/diagnostico/__init__.py`, `core/tests/diagnostico/test_incidentes.py`, `core/tests/diagnostico/test_classificacao.py`, `core/tests/diagnostico/test_relatorio.py`, `core/tests/api/test_diagnostico_api.py`
- Modify: `core/sentinela/main.py` (router; `semear_diagnostico_demo` chamada em `_montar_monitor` junto de `semear_alertas_demo`), `core/sentinela/demo/simulador.py` (`semear_diagnostico_demo(sessoes, agora) -> bool`: 30 dias fictícios com reinícios do gateway `10.99.0.1` concentrados às 19 h, quedas isoladas e uma instabilidade)

**Interfaces:**
- Consumes: `Evento`, `Equipamento`, `Classe`, `SubRede.gateway_ip` (Task 2), `uptime.reinicios`/`Leitura` (Task 4), `horario.zona`, `horario.formatar_duracao`.
- Produces:
  - `incidentes`: `JANELA_S = 30`; `ESTADOS_QUEDA = frozenset({"offline", "inalcancavel"})`; `@dataclass(frozen=True) Queda(equipamento_id: str, inicio: datetime, fim: datetime | None, causa: str | None)`; `quedas_de(eventos: Iterable[tuple[str, str, str, datetime, str | None]]) -> list[Queda]` (tuplas `(equipamento_id, de, para, em, causa)` em ordem de `em`; começa ao entrar em `ESTADOS_QUEDA` vindo de fora deles; termina na primeira transição para fora deles); `@dataclass(frozen=True) Incidente(inicio: datetime, fim: datetime | None, quedas: tuple[Queda, ...])` com `duracao_s(agora: datetime) -> float`; `agrupar(quedas: list[Queda]) -> list[Incidente]` (queda entra no incidente se começou até `JANELA_S` depois do **início do incidente**).
  - `classificacao`: `Tipo = Literal["roteador_reiniciou", "gateway_sem_reinicio", "pai_derrubou_filhos", "queda_isolada", "instabilidade", "quedas_simultaneas"]`; `Certeza = Literal["provavel", "confirmado"]`; `REINICIO_MIN_S = 30`, `REINICIO_MAX_S = 180`, `FRACAO_JUNTOS = 0.8`, `VOLTA_JUNTOS_S = 120`, `INSTAVEL_QUEDAS = 4`, `INSTAVEL_JANELA = timedelta(hours=1)`; `@dataclass(frozen=True) Contexto(gateways: dict[str, frozenset[str]], reinicios: dict[str, list[datetime]], leituras: dict[str, list[datetime]], inicios: dict[str, list[datetime]], nomes: dict[str, str])` (`gateways`: id do gateway → monitorados não pausados da sub-rede dele, sem ele; `leituras`: instantes de leitura de uptime por gateway; `inicios`: inícios de queda por equipamento); `@dataclass(frozen=True) Classificacao(tipo: Tipo, certeza: Certeza, porque: tuple[str, ...])` (`porque` nunca vazio); `classificar(inc: Incidente, ctx: Contexto) -> Classificacao`, nesta ordem:
    1. gateway `G` no incidente: reinício de `G` em `[inicio − 120 s, fim + 120 s]` → `roteador_reiniciou`/`confirmado`; leitura de `G` antes do início e depois do fim sem reinício → `gateway_sem_reinicio`/`confirmado`; sem leitura, duração de `G` em 30–180 s **e** ≥ 80 % de `gateways[G]` no incidente **e** ≥ 80 % deles de volta até 120 s depois de `G` → `roteador_reiniciou`/`provavel`; senão `gateway_sem_reinicio`/`provavel`;
    2. alguma queda com `causa == f"pai:{P}"` e `P` no incidente → `pai_derrubou_filhos`;
    3. um aparelho só: ≥ 4 inícios em `[inicio − 1 h, inicio]` → `instabilidade`, senão `queda_isolada`;
    4. senão `quedas_simultaneas`.
  - `textos`: `ROTULOS: dict[Tipo, str]` (`"Roteador reiniciou"`, `"Queda do gateway sem reinício"`, `"Equipamento pai derrubou os filhos"`, `"Queda isolada"`, `"Instabilidade"`, `"Quedas simultâneas"`); `rotulo(c: Classificacao) -> str` (acrescenta `" (provável)"` ou `" (confirmado)"`); `SUGESTOES: dict[Tipo, tuple[str, ...]]` (para `roteador_reiniciou`, exatamente: `"Trocar a fonte do roteador."`, `"Ligar o roteador num nobreak."`, `"Atualizar o firmware."`, `"Tirar o roteador do calor."`; os demais tipos com 2 a 4 itens no mesmo tom: cabo e porta do switch, fonte e alimentação do aparelho ou do pai, firmware, cadastrar "Depende de" em `quedas_simultaneas`); `AVISO_ENERGIA` (texto fixo: cruzar os horários com um nobreak que registra eventos ou uma tomada que mede energia); `SEM_GATEWAY` (pede o gateway em Configurações → Sub-redes).
  - `relatorio`: `Periodo = Literal["24h", "7d", "30d"]`; `MAX_EVENTOS = 100_000`; `MAX_INCIDENTES = 500`; `@dataclass(frozen=True) Relatorio(periodo, de, ate, incidentes: list[tuple[Incidente, Classificacao]], por_tipo: dict[Tipo, int], fora_s: float, horas: list[int], gateway_configurado: bool, truncado: bool, nomes: dict[str, str])`; `async montar(db: AsyncSession, agora: datetime, periodo: Periodo, fuso: ZoneInfo) -> Relatorio` (eventos de `de − 1 h` a `agora`, incidentes só os iniciados em `[de, agora]`; `fora_s` = união dos intervalos, sem contar duas vezes; `horas[h]` = incidentes que começaram na hora local `h`); `csv_do(r: Relatorio, fuso: ZoneInfo) -> str` (BOM UTF-8, separador `;`, colunas `inicio;fim;duracao;classificacao;equipamentos;porque;sugestoes`; toda célula entre aspas, aspas dobradas, e a que começa com `=`, `+`, `-`, `@`, tab ou CR ganha `'` na frente; nomes inteiros; sem IP nem MAC).
  - API (qualquer usuário com sessão): `GET /api/v1/diagnostico?periodo=24h|7d|30d` → `{"periodo", "de", "ate", "resumo": {"incidentes", "por_tipo", "fora_s"}, "horas": [24], "incidentes": [{"inicio", "fim", "duracao_s", "tipo", "certeza", "rotulo", "porque", "sugestoes", "equipamentos": [{"id", "nome", "classe"}]}], "gateway_configurado", "truncado", "aviso_energia"}` (mais recentes primeiro, ≤ 500); `GET /api/v1/diagnostico/laudo.csv?periodo=` → `text/csv; charset=utf-8`, `Content-Disposition: attachment; filename="sentinela-diagnostico-<AAAAMMDD>-<periodo>.csv"`, `Cache-Control: no-store`, `limitar_taxa`.

- [ ] **Step 1: testes que falham**
  - Incidentes: `test_queda_ate_30s_do_inicio_e_o_mesmo_incidente_e_31s_e_outro`; `test_queda_aberta_tem_fim_nulo`; `test_inalcancavel_conta_como_queda`; `test_pausa_encerra_a_queda`.
  - Classificação: `test_gateway_e_80_por_cento_voltam_em_90s_roteador_reiniciou_provavel`; `test_mesmo_padrao_com_reinicio_no_uptime_vira_confirmado`; `test_gateway_com_leituras_sem_reinicio_queda_sem_reinicio`; `test_gateway_fora_de_30_180s_sem_leitura_nao_e_reinicio`; `test_filhos_inalcancaveis_pai_derrubou`; `test_quatro_quedas_em_1h_instabilidade_e_tres_isolada`; `test_porque_nunca_vazio_e_provavel_sem_uptime`; **Review Focus 2:** `test_leitura_ausente_durante_o_incidente_nao_confirma`.
  - Relatório: `test_resumo_por_tipo_e_fora_sem_dupla_contagem`; `test_horas_no_fuso` (UTC 05:30 → hora 2 em `America/Sao_Paulo`); `test_periodos_24h_7d_30d`; `test_acima_do_teto_marca_truncado`; `test_sem_gateway_configurado`; `test_sugestoes_do_roteador_sao_as_quatro_da_spec`; **Review Focus 3:** `test_csv_neutraliza_formula_e_mantem_texto_inteiro`.
  - API: `test_diagnostico_exige_sessao`; `test_visualizador_le`; `test_periodo_invalido_422`; `test_csv_bom_cabecalho_e_nome_do_arquivo`; `test_demo_tem_incidentes_de_exemplo`.
- [ ] **Step 2:** rodar; falham.
- [ ] **Step 3:** implementar. `montar` lê com consultas por índice (`ix_evento_equipamento_em`, `ix_leitura_uptime_equipamento_lido`); classificação e agrupamento são funções puras (sem banco).
- [ ] **Step 4:** suítes verdes; commit `feat(diagnostico): incidentes, classificação provável, padrão de horário e laudo CSV`.

### Task 6: Primeiro acesso (código de instalação, CLI e API)

**Files:**
- Create: `core/sentinela/seguranca/instalacao.py`, `core/sentinela/api/primeiro_acesso.py`, `core/tests/seguranca/test_instalacao.py`, `core/tests/api/test_primeiro_acesso_api.py`, `core/tests/seguranca/test_cli_instalacao.py`
- Modify: `core/sentinela/cli.py`, `core/sentinela/main.py` (router; `app.state.falhas_codigo`, `app.state.bloqueio_codigo`), `core/tests/api/test_segredos_nao_vazam.py`

**Interfaces:**
- Consumes: Task 1 (`pasta_dados`, `Settings.rede_sugerida/gateway_sugerido`, `SubRede.gateway_ip`), Task 2 (`aplicar_guarda`, `Varredura.iniciar(..., origem="primeiro_acesso")`), `senhas.gerar_hash_segredo_async`/`verificar_async`/`verificar_ficticio_async`/`validar_senha`/`gerar_hash_async`, `auth.abrir_sessao`, `auth.exigir_json`, `LimitadorIP`, `BloqueioFantasma`, `subredes.normalizar_cidr`, `comum.auditar`.
- Produces:
  - `instalacao`: `ARQUIVO = "instalacao.json"`; `TAMANHO = 8`; `ALFABETO` (o de `parede.emparelhamento`); `VALIDADE = timedelta(hours=24)`; `Estado = Literal["ativo", "expirado", "ausente"]`; `gerar_codigo() -> str` (`secrets.choice`, exibido `"XXXX-XXXX"`); `normalizar(texto: str) -> str | None` (maiúsculas, sem hífen nem espaço, 8 do alfabeto); `async gravar(pasta: Path, codigo: str, agora: datetime) -> None` (`{"hash": <argon2id>, "criado_em": ISO}`, `0600`, temporário + `os.replace`; o código nunca vai ao arquivo); `estado(pasta: Path, agora: datetime) -> Estado`; `async conferir(pasta: Path, texto: str, agora: datetime) -> bool` (ausente, expirado, ilegível ou fora do formato → `verificar_ficticio_async` e `False`; senão `verificar_async(hash, normalizado)`); `invalidar(pasta: Path) -> None` (idempotente).
  - CLI `python -m sentinela.cli codigo-instalacao`: existe usuário → stderr `"já existe um administrador; o primeiro acesso está encerrado"` e código 3; senão gera, grava (substitui o anterior) e imprime **só** o código no stdout, código 0.
  - Rotas `/api/v1/primeiro-acesso` (sem sessão, `@isento_de_csrf`; POST com `exigir_json`; **toda** rota responde o 404 genérico de `nao_encontrado()` quando existe qualquer usuário):
    - `GET ""` → `{"codigo": Estado}`.
    - `POST "/conferir"` `{"codigo": str ≤ 16}` → 200 `{"rede": {"cidr": str | None, "gateway": str | None}}` | 401 `"Código inválido."` | 429 com `Retry-After`.
    - `POST "/concluir"` `{"codigo", "login" (1–64), "senha", "cidr", "gateway": str | None, "varredura": bool}` → 204 com cookies de sessão e CSRF (`abrir_sessao`) | 401 | 422 (mensagem de `validar_senha`, de `normalizar_cidr`, ou `"O gateway precisa estar dentro da sub-rede."`) | 429 | 404. Numa transação: `INSERT` do admin guardado por `WHERE NOT EXISTS (SELECT 1 FROM usuario)` (rowcount ≠ 1 → 404); `SubRede(cidr, permite_varredura=varredura, gateway_ip=gateway)`; com gateway, `Equipamento(nome="Roteador", ip=gateway, classe "roteador", checagem "icmp")`; auditorias `primeiro_acesso.concluir`, `subrede.criar`, `equipamento.criar` com o novo admin; `aplicar_guarda` (o único commit). Depois: `instalacao.invalidar`; com varredura, `iniciar(sub.id, origem="primeiro_acesso")` (falha não desfaz nada); sessão aberta.
    - Limites (reserva **antes** de verificar, devolução no acerto, como o login): `app.state.falhas_codigo = LimitadorIP(relogio)` (20 falhas por IP em 10 min) e `app.state.bloqueio_codigo = BloqueioFantasma(relogio)` com a chave fixa `"instalacao"` (5 falhas → 1 min, dobrando até 30 min, para todos os IPs).

- [ ] **Step 1: testes que falham**
  - Núcleo: `test_codigo_tem_8_do_alfabeto_sem_ambiguos`; `test_normalizar_aceita_minusculas_hifen_e_espaco`; `test_arquivo_guarda_so_argon2id_e_0600` (o código, com e sem hífen, não aparece nos bytes do arquivo); `test_expira_em_24h` (23 h 59 min ativo, 24 h e 1 s expirado); `test_conferir_errado_ausente_ou_expirado_e_falso`; `test_conferir_usa_o_verificador_do_argon2_e_o_ficticio_sem_arquivo`; `test_invalidar_idempotente`.
  - API: `test_rotas_dao_404_com_qualquer_usuario` (inclusive só visualizador; demo); `test_get_sem_usuario_mostra_estado`; `test_conferir_certo_devolve_rede_sugerida`; `test_conferir_errado_401_generico`; `test_limite_de_20_por_ip_em_10_min`; `test_bloqueio_global_5_falhas_1_min` (relógio falso; outro IP também espera); `test_concluir_cria_admin_subrede_roteador_varre_e_entra` (`GET /auth/eu` admin; `permite_varredura`; equipamento classe `roteador`; varredura com `origem="primeiro_acesso"`; auditorias); `test_concluir_sem_varredura_nao_varre`; `test_codigo_invalidado_depois_de_concluir`; `test_senha_curta_422_sem_criar_nada`; `test_cidr_publico_ou_barra_8_422`; `test_gateway_fora_da_rede_422`; `test_sem_json_415`; **Review Focus 4:** `test_dois_concluir_simultaneos_um_so_admin` (`asyncio.gather`: um 204, outro 404; uma linha em `usuario`) e `test_codigo_com_24h_e_1s_401_mesmo_certo`.
  - Segredos: `test_codigo_de_instalacao_nunca_aparece` (respostas de todas as rotas, `caplog`, `auditoria`, `instalacao.json`).
  - CLI: `test_cli_imprime_so_o_codigo_e_grava_o_hash`; `test_cli_com_usuario_sai_3_sem_arquivo`; `test_cli_de_novo_troca_o_anterior` (o código velho deixa de servir).
- [ ] **Step 2:** rodar; falham.
- [ ] **Step 3:** implementar. A CLI `criar-admin` continua igual (técnicos).
- [ ] **Step 4:** suítes verdes; commit `feat(seguranca): primeiro acesso pela tela com código de instalação`.

### Task 7: Atualização automática (`update.sh --automatico`, `atualizacao.json` e API)

**Files:**
- Create: `core/sentinela/atualizacao.py`, `core/sentinela/api/atualizacao.py`, `core/tests/test_atualizacao.py`, `core/tests/api/test_atualizacao_api.py`, `core/tests/seguranca/test_cli_atualizacao.py`, `scripts/systemd/sentinela-atualizacao.service`, `scripts/systemd/sentinela-atualizacao.timer`
- Modify: `update.sh`, `scripts/operacao-comum.sh`, `core/sentinela/cli.py`, `core/sentinela/main.py` (router), `core/tests/rede/test_importacoes_restritas.py`, `testes-operacao/shims/docker` (`SHIM_ATUALIZACAO_ATIVA=0|3`), `testes-operacao/test_update.sh`

**Interfaces:**
- Consumes: Task 1 (`pasta_dados`), `__version__`, `update.sh`/`operacao-comum.sh` da Fase 4B (`trava_adquirir`, `finalizar`, `voltar`, `resolver_alvo`, `verificar_imagem`).
- Produces:
  - `atualizacao`: `ARQUIVO = "atualizacao.json"`; `Resultado = Literal["atualizado", "sem_novidade", "voltou", "falhou"]`; `AVISO_HORAS = 24`; `MAX_MENSAGEM = 200`; `@dataclass(frozen=True) EstadoAtualizacao(ativo: bool = True, agendado: bool = False, ultima_verificacao: datetime | None = None, resultado: Resultado | None = None, de: str | None = None, para: str | None = None, mensagem: str | None = None)`; `ler(pasta: Path) -> EstadoAtualizacao` (ausente, ilegível ou campo de tipo errado → padrão campo a campo; versões só `^\d+\.\d+\.\d+$`; mensagem sem caracteres de controle, ≤ 200); `gravar(pasta: Path, e: EstadoAtualizacao) -> None` (temporário + `os.replace`, `0600`); `registrar(pasta, resultado: Resultado, de: str | None, para: str | None, mensagem: str | None, agora: datetime) -> EstadoAtualizacao` (preserva `ativo`/`agendado`); `definir_ativo(pasta, ativo: bool) -> EstadoAtualizacao`; `marcar_agendado(pasta) -> EstadoAtualizacao`; `aviso(e: EstadoAtualizacao, agora: datetime) -> str | None` (`atualizado` há ≤ 24 h → `f"Atualizado para {para}"`; `voltou` há ≤ 24 h → `f"A atualização para {para} falhou; o Sentinela voltou para {de}"`; resto → `None`).
  - CLI: `atualizacao-registrar --resultado R [--de X.Y.Z] [--para X.Y.Z] [--mensagem TEXTO]`; `atualizacao-registrar --agendado`; `atualizacao-ativa` (código 0 = ligada, 3 = desligada).
  - API: `GET /api/v1/atualizacao` (qualquer usuário) → `{"versao", "ativo", "agendado", "ultima_verificacao", "resultado", "de", "para", "mensagem", "aviso", "comando_manual": "./update.sh"}`; `PATCH /api/v1/atualizacao` (admin, CSRF, `limitar_taxa`) `{"ativo": bool}` → o mesmo corpo; auditoria `atualizacao.ativo`.
  - `update.sh --automatico`: nenhuma pergunta (stdin `/dev/null`); com VERSÃO, `--imagens-publicadas` ou `--permitir-voltar-versao` → sai 2; antes da trava, `compose exec -T core python -m sentinela.cli atualizacao-ativa` = 3 → "atualização automática desligada", sai 0 sem tocar em nada; trava ocupada → "outra operação em curso", sai 0 sem registrar; o resto é o caminho da Fase 4B **sem desvio** (alvo = última tag publicada).
  - `operacao-comum.sh`: `registrar_atualizacao RESULTADO DE PARA MENSAGEM` (melhor esforço por `compose exec -T core python -m sentinela.cli atualizacao-registrar …`, argumentos como itens do argv, nunca `eval`; falhou → só aviso em stderr). `finalizar` de `update.sh` registra em **todos** os modos: sucesso → `atualizado`; "já está na versão" → `sem_novidade`; volta concluída → `voltou`; `falhar` antes da troca → `falhou` com a mensagem fixa do `falhar`. O código de saída não depende do registro.
  - Unidades (`@DESTINO@` trocado pelo `instalar.sh`): serviço `Type=oneshot`, `WorkingDirectory=@DESTINO@`, `ExecStart=@DESTINO@/update.sh --automatico`, `TimeoutStartSec=45min`, `Nice=10`; timer `OnCalendar=*-*-* 03:00:00`, `RandomizedDelaySec=15min`, `Persistent=false`, `WantedBy=timers.target`.

- [ ] **Step 1: testes que falham**
  - Núcleo: `test_ler_ausente_e_ligado_sem_agendamento`; `test_campos_hostis_viram_padrao` (versão `"1.2"`, `ativo: "sim"`, mensagem de 500 caracteres com `\x1b`); `test_registrar_preserva_ativo_e_agendado`; `test_aviso_24h_atualizado_e_voltou` (23 h sim, 25 h não; `falhou`/`sem_novidade` nunca); `test_gravar_atomico_0600`.
  - API/CLI: `test_get_qualquer_usuario_ve_versao_e_aviso`; `test_patch_so_admin_csrf_audita`; `test_patch_corpo_invalido_422`; `test_sem_arquivo_sem_agendamento`; `test_cli_registrar_e_ativa_0_e_3`.
  - Sem Docker no core: `test_core_nao_importa_subprocess_nem_docker` (em `test_importacoes_restritas.py`, proibidos em todo `sentinela/`); `test_compose_nao_monta_socket_docker_nem_privileged` (`docker-compose.yml` e `docker-compose.demo.yml`).
  - Shell (`test_update.sh`): `test_automatico_desligado_nao_faz_nada` (log sem `fetch`, `tag`, `pull`, `backup-criar`); `test_automatico_com_operacao_em_curso_sai_0_sem_tocar`; `test_automatico_ok_registra_atualizado_de_para` (`atualizacao-registrar --resultado atualizado --de 0.4.0 --para 0.5.0`); `test_automatico_ja_na_versao_registra_sem_novidade`; `test_automatico_falha_de_saude_volta_e_registra_voltou`; `test_automatico_digest_diferente_registra_falhou_sem_trocar` (mesma verificação do manual); `test_automatico_recusa_versao_e_opcoes`; `test_automatico_nao_le_stdin`; `test_manual_tambem_registra`; **Review Focus 5:** `test_registro_falho_nao_muda_o_codigo_de_saida`, `test_automatico_arvore_suja_registra_falhou_sem_tocar` e `test_automatico_core_fora_do_ar_nao_troca_nada`.
- [ ] **Step 2:** rodar; falham.
- [ ] **Step 3:** implementar.
- [ ] **Step 4:** suítes verdes, `bash testes-operacao/test_update.sh` e `shellcheck -x update.sh scripts/operacao-comum.sh testes-operacao/shims/docker`; commit `feat(operacao): atualização automática com registro do resultado e chave de liga/desliga`.

### Task 8: `instalar.sh` (uma linha)

**Files:**
- Create: `instalar.sh`, `testes-operacao/test_instalar.sh`, `testes-operacao/shims/ip`, `testes-operacao/shims/systemctl`, `testes-operacao/shims/sudo`
- Modify: `install.sh` (`criar_env` grava `SENTINELA_REDE_SUGERIDA`/`SENTINELA_GATEWAY_SUGERIDO` vindas do ambiente; nada mais muda), `testes-operacao/lib.sh` (copia `instalar.sh` e `scripts/systemd/`), `testes-operacao/shims/curl` (`get.docker.com` responde `$SHIM_GET_DOCKER`), `testes-operacao/shims/docker` (`codigo-instalacao` imprime `$SHIM_CODIGO`, ou sai 3 com `SHIM_TEM_ADMIN=1`), `.github/workflows/ci.yml` (`instalar.sh` e os shims novos na lista do `shellcheck`)

**Interfaces:**
- Consumes: Task 6 (CLI `codigo-instalacao`), Task 7 (unidades systemd, `atualizacao-registrar --agendado`, `update.sh --automatico`), `install.sh`, `definir_env`/`valor_env`/`compose`/`falhar`.
- Produces: `instalar.sh` (todo o corpo em funções; última linha não vazia `main "$@"`, contra download truncado no `curl | bash`). Variáveis só para teste: `SENTINELA_DESTINO` (padrão `/opt/sentinela`), `SENTINELA_REPO` (padrão `https://github.com/lumezencio/Sentinela.git`), `SENTINELA_SYSTEMD_DIR` (padrão `/etc/systemd/system`). Funções, na ordem da spec:
  - `conferir_sistema()` (`uname -s` ≠ Linux → falha "instalar.sh é só para Linux; no Windows use o caminho técnico do README"; `uname -m` `x86_64`/`aarch64`/`arm64` seguem; `armv6l`/`armv7l`/`arm` → a mesma mensagem de 32 bits do `install.sh`; outra → falha); `privilegio()` (`EUID` 0 → nada; senão `sudo`; sem `sudo` → falha).
  - `garantir_docker()` (sem `docker`: baixa `https://get.docker.com` para arquivo temporário `0700` e roda com `sh`; depois exige `docker compose version`); `garantir_git()` (sem `git` e com `apt-get` → `apt-get install -y git`; senão falha).
  - `ultima_versao()` (`git ls-remote --tags --refs "$REPO" 'v*'` → maior `vX.Y.Z` por `sort -V`; nenhuma → falha); `clonar()` (destino ausente → `git clone --branch <tag>`; destino que já é clone do Sentinela → mantém o checkout; qualquer outra coisa → falha sem tocar).
  - `detectar_rede()` → `"<cidr> <gateway> <ip>"` (`ip -4 route show default` → gateway e interface; `ip -4 -o addr show dev <if>` → IP/prefixo; só RFC 1918; prefixo < 16 → o /24 do host; > 30, rede pública ou sem rota → vazio; só lê o host). `gravar_sugestao()` (com `.env`: `definir_env` só das chaves ausentes; sem `.env`: exporta para o `install.sh` gravar na criação).
  - Roda `./install.sh` (imagens publicadas e verificadas). `codigo_instalacao()` (saída da CLI numa variável local, nunca em arquivo nem com `set -x`; código 3 → "já existe administrador; entre pelo login").
  - `instalar_timer()` (com `/run/systemd/system` e `systemctl`: copia as unidades trocando `@DESTINO@`, `systemctl daemon-reload`, `systemctl enable --now sentinela-atualizacao.timer`, `atualizacao-registrar --agendado`; sem systemd → aviso com `./update.sh`).
  - Resumo: `https://<ip>` (com `:<porta>` se `SENTINELA_PORTA_HTTPS` ≠ 443), o nome `sentinela.local` quando houver `avahi-daemon` ativo, e o código com "vale 24 h e só até o primeiro administrador".

- [ ] **Step 1: testes que falham** (`bash testes-operacao/test_instalar.sh`; origem = repositório git local com `v0.4.1`, `v0.5.0` e um commit depois na `main`; shims `docker`, `git` (real), `curl`, `uname`, `ip`, `systemctl`, `sudo`)
  - `test_recusa_armv7_e_nao_linux_sem_criar_nada`; `test_clona_a_ultima_tag_e_nao_a_main`; `test_docker_ausente_usa_o_script_oficial`; `test_rede_detectada_vai_para_o_env` (`192.168.15.0/24`, gateway `192.168.15.1`); `test_rede_publica_ou_sem_rota_nao_grava`; `test_barra_8_sugere_o_24_do_host`; `test_codigo_aparece_so_no_terminal` (o código falso `K7MQ-2XDP` aparece uma vez na saída e em nenhum arquivo do destino, do `.env`, das unidades nem do log do shim); `test_timer_com_destino_e_automatico` (`ExecStart=<destino>/update.sh --automatico`, `OnCalendar=*-*-* 03:00:00`, `enable --now`, `--agendado` no log); `test_sem_systemd_avisa_e_segue`; `test_rodar_de_novo_nao_apaga_nem_muda_a_versao` (mesmo checkout, `.env` byte a byte; com `SHIM_TEM_ADMIN=1` não mostra código); `test_destino_ocupado_recusa`; `test_ultima_linha_e_main`; `test_nunca_usa_down_prune_volume_nem_rmi_forcado`; `test_resumo_mostra_https_ip_e_porta`.
- [ ] **Step 2:** rodar; falham.
- [ ] **Step 3:** implementar (`#!/usr/bin/env bash`, `set -euo pipefail`, mensagens em português como o `install.sh`).
- [ ] **Step 4:** `test_instalar.sh`, `test_install.sh` e `shellcheck -x instalar.sh install.sh testes-operacao/shims/*` verdes; commit `feat(operacao): instalar.sh de uma linha com rede sugerida, código e timer de atualização`.

### Task 9: Front: assistente de primeiro acesso

**Files:**
- Create: `web/src/primeiro-acesso.html`, `web/src/js/primeiro-acesso.js`, `web/tests/js/primeiro-acesso.test.mjs`, `web/tests/capturas_produto.py`
- Modify: `web/src/js/login.js` (sem usuário → `primeiro-acesso.html`), `web/src/js/api.js`, `web/src/css/seguranca.css` (passos reaproveitados; regra nova só se faltar), `web/nginx/nginx.conf` (`location /api/v1/primeiro-acesso/` com `limit_req zone=login burst=10 nodelay`), `web/tests/conftest.py` (alvo sem usuário, sem demonstração, com `instalacao.gravar` de um código fictício), `web/tests/test_smoke.py`

**Interfaces:**
- Consumes: rotas da Task 6; `AVISO_ARP` de `web/src/js/novos.js` (importado, não copiado).
- Produces: `api.js` ganha `estadoPrimeiroAcesso()`, `conferirCodigo(codigo)`, `concluirPrimeiroAcesso({codigo, login, senha, cidr, gateway, varredura})`. `primeiro-acesso.js`: `PASSOS = ["codigo", "administrador", "rede", "concluir"]`; `validarCodigoInstalacao(texto: string) -> {ok, codigo, erro}`; `validarRede(cidr: string, gateway: string) -> {ok, erro}` (RFC 1918, /16–/30, gateway dentro; mensagens iguais às do servidor); `COMANDO_NOVO_CODIGO = "docker compose exec core python -m sentinela.cli codigo-instalacao"`.

- [ ] **Step 1: testes que falham**
  - Node: `test_codigo_aceita_minusculas_hifen_e_espaco`; `test_codigo_recusa_ambiguos_e_tamanho_errado`; `test_rede_publica_barra_8_e_gateway_fora_recusados`; `test_codigo_nunca_vai_a_console_nem_storage` (varre o módulo).
  - Smoke: `test_sem_usuario_login_leva_ao_primeiro_acesso`; `test_codigo_errado_mostra_erro_generico_e_fica_no_passo`; `test_codigo_expirado_mostra_o_comando_para_gerar_outro`; `test_assistente_completo_entra_no_painel_com_roteador_e_varredura` (Lista mostra "Roteador"; faixa da varredura aparece); `test_com_usuario_primeiro_acesso_html_volta_ao_login`.
- [ ] **Step 2:** rodar; falham.
- [ ] **Step 3:** implementar. Passos: (1) código (`autocomplete="off"`, `maxlength="9"`, onde achar o código e, se expirado, `COMANDO_NOVO_CODIGO`); (2) login, senha e confirmação (regra de 12 caracteres visível); (3) sub-rede e gateway pré-preenchidos e editáveis, chave **"Achar os aparelhos sozinho (varredura)"** ligada, com `AVISO_ARP`; (4) resumo e **Concluir** → `/`. Código só numa variável do módulo; erros com `role="alert"`; contagem do 429 como no login.
- [ ] **Step 4:** `npm test` e smoke verdes. **Capturas:** `capturas_produto.py` (reaproveita `LARGURAS`, `ALTURA`, `TEMAS` de `capturar_telas.py`) gera os 4 passos e o erro nas 8 larguras × claro/escuro, com login de 64 caracteres e mensagem de erro longa; abrir uma a uma e corrigir até alinhar. Lighthouse 100 em `primeiro-acesso.html`.
- [ ] **Step 5:** commit `feat(web): assistente de primeiro acesso`.

### Task 10: Front: aviso de aparelho novo, sub-redes e Atualizações

**Files:**
- Create: `web/src/js/config-atualizacoes.js`, `web/tests/js/config-atualizacoes.test.mjs`
- Modify: `web/src/js/alertas.js`, `web/src/js/cartoes-painel.js`, `web/src/js/novos.js`, `web/src/js/configuracoes.js`, `web/src/js/app.js` (faixa "Varredura automática"; aviso de 24 h), `web/src/js/api.js`, `web/src/index.html` (cartão **Atualizações**, aviso, gateway e intervalo em **Sub-redes e varredura lenta**), `web/src/css/alertas.css`, `web/src/css/componentes.css`, `web/tests/js/alertas.test.mjs`, `web/tests/js/cartoes-painel.test.mjs`, `web/tests/js/novos.test.mjs`, `web/tests/js/configuracoes.test.mjs`, `web/tests/test_smoke.py`, `web/tests/capturas_produto.py`

**Interfaces:**
- Consumes: Task 2 (`SubRedeSaida`/`SubRedeEdicao`, `varredura_continua_min`, `origem`), Task 3 (`AlertaSaida` novo), Task 7 (`GET/PATCH /atualizacao`).
- Produces: `api.js`: `verAtualizacao()`, `definirAtualizacao(ativo)`, `editarSubrede(id, campos)`. `alertas.linhaDoAlerta` para `aparelho_novo` → `{…, detalhe: "192.168.15.23 · <fabricante> · portas 80, 443", verEmNovos: descoberta_id}`. `novos.focarDescoberta(id: string) -> boolean` (rola até o cartão e o destaca; ausente → falso, sem erro). `config-atualizacoes.js`: `textoDoResultado(e, fuso) -> string`; `textoDoAgendamento(e) -> string` (sem agendamento: "Este computador não tem atualização agendada (Windows, Docker Desktop ou instalação manual). Para atualizar, rode ./update.sh na pasta do Sentinela."); `avisoDoPainel(e) -> {texto, tipo: "ok" | "atencao"} | null` (texto = `e.aviso` do servidor; `voltou` = atenção); `chaveDoAviso(e) -> string` (dispensa por pessoa em `localStorage`, sempre em `try/catch`).

- [ ] **Step 1: testes que falham**
  - Node: `test_linha_aparelho_novo_tem_ip_fabricante_portas_e_ver_em_novos`; `test_cartao_ao_vivo_de_aparelho_novo`; `test_focar_descoberta_ausente_e_falso`; `test_texto_do_resultado_nos_quatro_resultados_e_sem_verificacao`; `test_sem_agendamento_mostra_o_comando`; `test_aviso_voltou_e_atencao_e_some_dispensado`; `test_subrede_gateway_invalido_bloqueia_envio`; `test_intervalo_fora_de_15_240_bloqueia`.
  - Smoke: `test_aviso_de_aparelho_novo_e_ver_em_novos_foca_o_cartao` (demo); `test_ignorar_em_novos_fecha_o_aviso`; `test_cartao_atualizacoes_mostra_versao_e_chave` (admin liga/desliga → PATCH; visualizador não vê o cartão, mas vê o aviso); `test_aviso_de_24h_aparece_e_dispensa` (resposta de `GET /atualizacao` interceptada); `test_subrede_salva_gateway_e_intervalo`.
- [ ] **Step 2:** rodar; falham.
- [ ] **Step 3:** implementar. O aviso de 24 h fica abaixo do cabeçalho, discreto, com "Dispensar"; nunca cobre conteúdo.
- [ ] **Step 4:** `npm test` e smoke verdes. **Capturas** nas 8 larguras × claro/escuro: cartão de aparelho novo (fabricante de 120 caracteres, 12 portas), Configurações → Sub-redes com gateway, cartão Atualizações em `atualizado`, `voltou`, `falhou` (mensagem de 200) e sem agendamento, e o aviso; abrir uma a uma. Lighthouse 100 em `#configuracoes`.
- [ ] **Step 5:** commit `feat(web): aviso de aparelho novo, gateway e intervalo da varredura, cartão Atualizações`.

### Task 11: Front: aba Diagnóstico e laudo para imprimir

**Files:**
- Create: `web/src/js/diagnostico.js`, `web/src/css/diagnostico.css`, `web/tests/js/diagnostico.test.mjs`
- Modify: `web/src/js/visoes.js` (`ABAS` ganha `"diagnostico"` depois de `"alertas"`), `web/src/index.html` (aba e painel `#conteudo-diagnostico`), `web/src/js/app.js`, `web/src/js/api.js` (`verDiagnostico(periodo)`), `web/tests/js/visoes.test.mjs`, `web/tests/test_smoke.py`, `web/tests/capturas_produto.py`

**Interfaces:**
- Consumes: `GET /api/v1/diagnostico` e `laudo.csv` (Task 5); `semear_diagnostico_demo` para o smoke e as capturas.
- Produces: `diagnostico.js`: `PERIODOS = ["24h", "7d", "30d"]`; `linhaDoIncidente(inc, fuso) -> {quando, duracao, rotulo, porque: string[], equipamentos: string[], sugestoes: string[], classe}`; `barrasPorHora(horas: number[]) -> {hora, total, altura, rotulo}[]` (24 barras, maior = 100, `rotulo` `"19 h: 6 incidentes"`); `resumoDoPeriodo(resumo) -> {itens: {rotulo, total}[], fora: string}`; `urlDoCsv(periodo: string) -> string`.

- [ ] **Step 1: testes que falham**
  - Node: `test_barras_24_proporcionais_e_zeros`; `test_linha_do_incidente_no_fuso_com_porque_e_sugestoes`; `test_resumo_com_tempo_fora_formatado`; `test_url_do_csv_so_periodos_validos`; `test_abas_incluem_diagnostico`.
  - Smoke: `test_aba_diagnostico_mostra_resumo_barras_e_incidentes` (demo); `test_trocar_periodo_recarrega`; `test_baixar_csv` (evento de download, cabeçalho certo); `test_impressao_esconde_navegacao` (`emulate_media(media="print")`: abas e cartões ocultos, lista e cabeçalho do laudo visíveis); `test_sem_gateway_mostra_a_dica`; `test_visualizador_ve_diagnostico`.
- [ ] **Step 2:** rodar; falham.
- [ ] **Step 3:** implementar. Seletor de período (3 botões), resumo, barras por hora em HTML/CSS (com tabela só para leitor de tela), lista de incidentes (rótulo com "provável"/"confirmado", porquê, equipamentos com nome inteiro, sugestões), o texto de energia, "Baixar CSV" (link com `download`) e "Imprimir laudo" (`window.print()`; `@media print` em `diagnostico.css` mostra período e hora de geração).
- [ ] **Step 4:** `npm test` e smoke verdes. **Capturas** nas 8 larguras × claro/escuro com 30 dias da demo (500 incidentes, nomes de 300 caracteres) e uma da impressão em 1280; abrir uma a uma. Lighthouse 100 em `#diagnostico`; primeira tela ≤ 150 KB gzip (o módulo da aba carrega só ao abrir).
- [ ] **Step 5:** commit `feat(web): aba Diagnóstico com padrão de horário, sugestões, CSV e impressão`.

### Task 12: Documentação, versão 0.5.0 e verificação final

**Files:**
- Modify: `README.md` (reler antes), `docs/arquitetura/ARQUITETURA.md` (§7, §10, §11, §12.2, §13, §14, §17, §18), `core/pyproject.toml` (`version = "0.5.0"`), `core/uv.lock`, `core/tests/test_versao.py`, `web/tests/js/versao.test.mjs` (se fixar a versão), `testes-operacao/README.md`, `.env.example`

**Interfaces:** consome tudo; produz a documentação e a versão. `test_versao_do_pacote_e_0_5_0` (`sentinela.__version__ == "0.5.0"` e igual ao `pyproject.toml`).

- [ ] **Step 1: teste que falha:** `test_versao_do_pacote_e_0_5_0`.
- [ ] **Step 2:** rodar; falha (0.4.1).
- [ ] **Step 3: documentar.** README: **Instalar em uma linha** (o comando da spec, Pi 4/5 64 bits ou Linux, o que o script faz, idempotência, `sentinela.local` só com avahi), **Primeiro acesso** (código de 24 h, `codigo-instalacao` para gerar outro, `criar-admin` continua), **Aparelho novo** (varredura a cada 30 min, linha de base, "Ver em Novos", aprovação automática desligada), **Atualização automática** (03:00 + até 15 min, chave em Configurações → Atualizações, aviso de 24 h, Windows sem timer e o comando manual), **Diagnóstico de quedas** (classificações, "provável" × "confirmado" pelo sysUpTime, como cruzar com nobreak/tomada medidora). ARQUITETURA: `0006` no §10; rotas novas no §11; aba e assistente no §12.2; código de instalação no §13; `instalar.sh` e o timer no §14; ADRs: código de instalação gerado pela CLI dentro do core e guardado só como argon2id em `/dados`; assistente fechado por "existe usuário" (404), sem flag; linha de base por sub-rede e por fonte para `aparelho_novo`; atualização pelo timer do host chamando `update.sh` (core sem socket Docker, resultado por arquivo); diagnóstico calculado na leitura a partir de `evento` e `leitura_uptime`; "confirmado" só com `sysUpTime`. §18 Fase 5 só com números **observados** (o tempo no Pi real fica "a medir pelo dono").
- [ ] **Step 4: bumpar** (`uv lock` sem mudar outras versões); teste verde.
- [ ] **Step 5: verificação final** (em primeiro plano, saída em arquivo; colar a saída real no relatório): `cd core && uv run pytest -q -W error`; `ruff check`, `ruff format --check`, `mypy sentinela`, `bandit -r sentinela -ll`, `pip-audit`; `cd web && npm test && npm audit --omit=dev --audit-level=high`; smoke Playwright 3×; `bash web/build/construir-teia.sh && git diff --exit-code web/src/vendor web/src/parede`; `for t in testes-operacao/test_*.sh; do bash "$t"; done`; `shellcheck -x` da lista do CI; `actionlint`; prova de captura (`testes-rede/rodar.sh` ou job `captura`). **Capturas** de todas as telas novas pelas 8 larguras × claro/escuro, abertas **uma a uma**, com o que falhou corrigido; Lighthouse 100 em `primeiro-acesso.html`, `#diagnostico` e `#configuracoes`. **Conferência de demo e de produção:** (a) `git diff main...HEAD` sem IP fora de `10.99.`, `192.168.`, `127.0.0.1` e `172.31.250.`, sem MAC fora de `02:00:00:` e `gitleaks detect` limpo; (b) modo demonstração sem tarefa `sentinela-varredura-continua`, sem Despachante e com primeiro acesso 404 (testes das Tasks 2 e 6); (c) `docker ps --filter label=com.docker.compose.project=sentinela --format '{{.ID}} {{.Status}}'` antes e depois de toda a verificação: mesmos IDs e nenhum reinício da instalação real.
- [ ] **Step 6:** commit `docs: produto instalável, aviso de aparelho novo, atualização automática, diagnóstico e versão 0.5.0`. Relatório final lista o que fica para o dono: criar a tag `v0.5.0` em `main` e acompanhar o `release.yml`; instalar com a linha única num Raspberry Pi real e medir o tempo; deixar alguns dias na rede do Tenda e ler o Diagnóstico; conectar um celular novo e ver o aviso chegar.
