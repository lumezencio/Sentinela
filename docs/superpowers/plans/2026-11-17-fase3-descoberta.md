# Fase 3 — Descoberta automática e classificador: plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** o Sentinela descobre equipamentos lendo MikroTik, SNMP e gravadores, classifica com sinais legíveis e o admin aprova o que entra no monitoramento, sem nenhum broadcast fora dos casos autorizados.

**Architecture:** novo pacote `core/sentinela/descoberta/` (fontes → orquestrador → classificador → repositório/barramento), todo socket via `DestinoAutorizado` do guarda e fichas do limitador global (nova prioridade baixa). Câmeras de gravador são equipamentos filhos com checagem passiva `gravador`, alimentada por uma leitura de canais por gravador. Front ganha abas Novos e Configurações no mesmo app Alpine CSP.

**Tech Stack:** Python 3.12, FastAPI, SQLAlchemy 2 async/aiosqlite, Alembic, httpx (Digest), pysnmp 7 (asyncio), cryptography (Fernet), defusedxml, tomllib; front Alpine CSP 3.15.12 + JS sem framework; testes pytest, node --test, Playwright.

**Spec:** `docs/superpowers/specs/2026-11-17-fase3-descoberta-design.md` (§9 Esclarecimentos prevalece sobre o texto anterior). Arquitetura: `docs/arquitetura/ARQUITETURA.md` §6–§8, §10, §11, §13.

## Global Constraints

- Branch `fase3-descoberta`; nunca commitar em `main`; nunca push. Commits terminam com `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Todo socket novo recebe `DestinoAutorizado` (tipado; mypy estrito). Bibliotecas que abrem socket (pysnmp, httpx para gravador) só são importadas pelo seu módulo adaptador; teste estático garante isso.
- Zero `SO_BROADCAST`; nenhuma biblioteca de descoberta multicast (lista de bloqueio existente continua passando).
- Classificação de descoberta pendente é **passiva** (sem pacote ao equipamento). Sondagem de portas/título só em: sub-rede com `permite_varredura`; clique "Sondar" do admin; depois da aprovação (spec §9.1).
- Lista fixa de portas da sondagem: 22, 23, 80, 443, 554, 4370, 8000, 8080, 8291, 9100, 37777, 3389. TCP connect, 1 conexão por vez por IP, timeout 1 s, custo 1 ficha, prioridade baixa. Título HTTP: só se 80/443/8080 abertos, `GET /`, timeout 2 s, ≤ 16 KB lidos, sem redirecionamento para outro host, título ≤ 120 caracteres sem caracteres de controle.
- Classificador: vencedora precisa de ≥ 50 pontos absolutos, senão `desconhecido`; confiança = pontos da vencedora ÷ soma dos pontos positivos.
- Fonte: intervalo padrão 600 s (300–3600); coletar agora no máximo 1 vez a cada 30 s por fonte. Leitura de canais do gravador no intervalo da classe `camera` (mínimo 15 s), prioridade **normal**, custo 1 por gravador.
- Varredura: padrão 2 IPs/s (`intervalo_varredura_ips_s` = 0,5), prioridade baixa, uma por vez, cancelável, só sub-redes com `permite_varredura`.
- Aprovação automática desligada por padrão; limiar padrão 0,80.
- Credenciais: Fernet com `SENTINELA_CHAVE_CREDENCIAIS`; nunca devolvidas pela API (`credencial_definida: bool`), nunca em log/auditoria/erro.
- Texto vindo da rede: truncado, sem caracteres de controle, renderizado só por `textContent`/`x-text`.
- Repositório público: só 10.99.x, MACs `02:00:00:…`, respostas de gravador sintetizadas.
- Migração Alembic reversível, `downgrade` testado.
- API: admin + CSRF em toda escrita; auditoria de toda ação administrativa; erro genérico ao cliente; listas paginadas ≤ 100; lote ≤ 200.
- Front: CSP inalterada (`script-src 'self'`, `style-src 'self'`), primeira tela ≤ 150 KB gzip, Lighthouse ≥ 90 nas abas novas; modo demonstração não emite nenhum pacote para a rede.
- Demo em execução (compose "sentinela", https://localhost:8443): nunca `down -v`, nunca prune, não tocar em outros projetos. Senha do admin nunca impressa.
- Suítes que devem ficar verdes ao fim de cada tarefa: `cd core && uv run pytest -q -W error`, `uv run ruff check . && uv run ruff format --check . && uv run mypy sentinela`; tarefas de front também `cd web && npm test` e o smoke (`cd core && uv run --with pytest-playwright --with cryptography pytest ../web/tests -q`).

## Review Focus

1. Gravador com 0 canais, canal sem IP ou com nome vazio/hostil (`<script>`, 5 KB, `\x00`) → descoberta válida com nome truncado e saneado; nada quebra. (Task 5)
2. Fonte com senha errada, host desligado, TLS inválido ou certificado trocado → `ultimo_erro` genérico, coleta das outras fontes continua, nenhum segredo no erro. (Tasks 3, 5, 7)
3. Mesmo MAC visto por MikroTik e SNMP com IPs diferentes na mesma coleta → uma descoberta só, IP da fonte mais recente, origens acumuladas. (Task 7)
4. Lote de aprovação com ids inexistentes, já aprovados ou fora das sub-redes → aprova os válidos, devolve a lista dos recusados com motivo, transação única. (Task 8)
5. Aba Novos com 2.000 pendentes → paginação, sem travar a página, contador correto. (Task 9)

---

### Task 1: Dados, cifra de credenciais e instalação

**Files:**
- Create: `core/alembic/versions/0002_descoberta.py`, `core/sentinela/seguranca/cofre.py`, `core/tests/db/test_migracao_0002.py`, `core/tests/seguranca/test_cofre.py`
- Modify: `core/sentinela/db/modelos.py`, `core/sentinela/config.py`, `core/pyproject.toml` + `uv.lock` (`cryptography`), `install.sh`, `.env.example`, `core/tests/conftest.py` (chave de teste)

**Interfaces:**
- Produces: modelos `Fonte`, `Descoberta`, `Config`; `Equipamento.pai_id: str|None`, `Equipamento.canal: int|None`, `checagem` aceita `'gravador'`; `SubRede.permite_varredura: bool`; `Settings.chave_credenciais: SecretStr`; `Cofre(chave: SecretStr)` com `cifrar(dados: dict[str, str]) -> bytes`, `decifrar(blob: bytes) -> dict[str, str]`, `mascarar(texto: str, segredos: Iterable[str]) -> str`; `ErroCofre` (mensagem genérica).

- [ ] **Step 1: testes que falham**
  - `test_upgrade_cria_tabelas_e_colunas`: após `upgrade head`, existem `fonte`, `descoberta`, `config`; `equipamento.pai_id`, `equipamento.canal`; `sub_rede.permite_varredura` com padrão falso.
  - `test_ip_repetido_permitido_so_para_gravador`: dois equipamentos `checagem='gravador'` com IP `10.99.200.2` gravam; dois `icmp` com o mesmo IP → `IntegrityError`.
  - `test_descoberta_chave_unica`; `test_fonte_tipo_restrito` (CHECK `tipo IN ('mikrotik','snmp','hikvision','dahua','simulada')`); `test_descoberta_status_restrito` (`pendente|aprovada|ignorada`).
  - `test_downgrade_volta_ao_0001_sem_perder_equipamentos`: com 3 equipamentos `icmp`, `downgrade 0001` mantém os 3 e remove as tabelas novas.
  - `test_cofre_ida_e_volta`, `test_cofre_chave_errada_levanta_erro_generico` (mensagem não contém o blob nem a chave), `test_mascarar_remove_segredos`.
- [ ] **Step 2:** rodar; falham.
- [ ] **Step 3:** implementar modelos e migração conforme spec §5.1 (`fonte`: id, tipo, nome ≤ 64, host, porta, tls, credencial_cifrada, impressao_tls ≤ 64 hex, ativa, intervalo_s CHECK 300–3600, ultima_coleta, ultimo_erro ≤ 200, equipamento_id FK SET NULL; `descoberta`: campos da spec + `fora_das_subredes: bool`, `conflito_com: str|None` (id de equipamento), `sondada_em: datetime|None`; `config`: chave PK, valor JSON). Índice único de `equipamento.ip` vira parcial `WHERE checagem <> 'gravador'`. `Cofre` usa `cryptography.fernet.Fernet`; a chave do `.env` é 32 bytes hex → derivada para base64 urlsafe.
- [ ] **Step 4:** `install.sh` gera `SENTINELA_CHAVE_CREDENCIAIS` (32 bytes hex via `openssl rand -hex 32`) só se ausente/vazia; segunda execução não muda o hash do `.env`. Verificar rodando `bash install.sh --verificar-env` se existir; senão teste manual com `.env` temporário no scratchpad e registrar no relatório.
- [ ] **Step 5:** suítes verdes; commit `feat(dados): fontes, descobertas e cofre de credenciais`.

### Task 2: Guarda, limitador e agendador para a descoberta

**Files:**
- Modify: `core/sentinela/rede/guarda.py` (protocolos `udp`, `https`), `core/sentinela/monitor/limitador.py`, `core/sentinela/monitor/estados.py`, `core/sentinela/monitor/agendador.py`, `core/sentinela/monitor/checagens/__init__.py`, `core/sentinela/monitor/montagem.py`
- Create: `core/tests/rede/test_importacoes_restritas.py`
- Test: testes existentes de guarda/limitador/estados/agendador ganham casos

**Interfaces:**
- Produces:
  - `Protocolo = Literal["icmp", "tcp", "http", "https", "udp"]` (udp e https exigem porta).
  - `Limitador.adquirir(custo: int = 1, prioridade: Literal["alta","normal","baixa"] = "normal")`; o parâmetro antigo `prioritario: bool` continua aceito (True → "alta") para não quebrar chamadores. Baixa só é servida quando nenhuma alta/normal espera.
  - `MaquinaEstados.forcar_desconhecido(causa: str) -> Transicao | None`.
  - Agendador: alvo com `checagem == "gravador"` é registrado mas **nunca agendado**; `Agendador.aplicar_externo(id: str, r: ResultadoChecagem) -> None` (mesma histerese, amostra e transição que uma checagem própria) e `Agendador.forcar_desconhecido(ids: Iterable[str], causa: str) -> None`.
  - `checagem_para("gravador")` levanta `ValueError` (não há checagem ativa).

- [ ] **Step 1: testes que falham**
  - guarda: `udp` e `https` com porta passam; sem porta → `DestinoProibido`; broadcast/multicast continuam recusados em udp.
  - limitador: `test_baixa_espera_normal_e_alta` (com fila normal pendente, baixa só é servida depois); `test_baixa_nao_passa_do_teto` (taxa total ≤ teto em 10 s simulados); `test_prioritario_true_continua_alta`.
  - estados: `test_forcar_desconhecido_de_online_gera_transicao_com_causa`; de `desconhecido` → `None`; depois uma amostra ok leva a online pela histerese normal.
  - agendador: `test_alvo_gravador_nao_e_agendado` (nenhuma checagem executada em 60 s simulados); `test_aplicar_externo_tres_falhas_vai_offline`; `test_forcar_desconhecido_publica_estado_com_causa` (mensagem no barramento com `causa="gravador sem resposta"`).
  - `test_importacoes_restritas`: varre `sentinela/**/*.py`; `pysnmp` só em `descoberta/fontes/snmp.py`; `httpx` só em `monitor/checagens/http.py`, `descoberta/fontes/gravador_http.py` e `descoberta/classificador/sondagem.py`; `socket`/`asyncio.open_connection` só nos módulos de checagem, `descoberta/fontes/mikrotik_api.py` e `descoberta/classificador/sondagem.py`.
- [ ] **Step 2:** rodar; falham.
- [ ] **Step 3:** implementar. `forcar_desconhecido` zera os contadores da histerese.
- [ ] **Step 4:** suítes verdes (os 391 anteriores intactos); commit `feat(monitor): prioridade baixa, alvos passivos e udp/https no guarda`.

### Task 3: Fonte MikroTik

**Files:**
- Create: `core/sentinela/descoberta/__init__.py`, `core/sentinela/descoberta/fontes/__init__.py`, `core/sentinela/descoberta/fontes/base.py`, `core/sentinela/descoberta/fontes/mikrotik_api.py` (protocolo), `core/sentinela/descoberta/fontes/mikrotik.py` (fonte), `core/sentinela/descoberta/texto.py`, `core/tests/descoberta/simulador_routeros.py`, `core/tests/descoberta/test_mikrotik_api.py`, `core/tests/descoberta/test_fonte_mikrotik.py`, `core/tests/descoberta/test_texto.py`

**Interfaces:**
- Consumes: `DestinoAutorizado` (protocolo `tcp`), `Limitador.adquirir(prioridade="baixa")`, `Cofre`.
- Produces:
  - `texto.limpar(valor: object, limite: int = 120) -> str | None` (remove controles, colapsa espaços, trunca; vazio → None).
  - `@dataclass(frozen=True) Achado(ip: str | None, mac: str | None, origem: str, fonte_id: int, nome: str | None = None, fabricante: str | None = None, pai_fonte_id: int | None = None, canal: int | None = None, sinais: dict[str, str] = {})`; `origem` ∈ `arp|dhcp|vizinho|wifi|snmp_arp|snmp_fdb|lldp|gravador_canal|gravador|varredura|simulada`.
  - `@dataclass ResultadoTeste(ok: bool, identidade: str | None, versao: str | None, avisos: list[str], impressao_tls: str | None, erro: str | None)`.
  - `class Fonte(Protocol)`: `async coletar() -> list[Achado]`; `async testar() -> ResultadoTeste`.
  - `ClienteRouterOS(destino: DestinoAutorizado, usar_tls: bool, impressao_confiada: str | None, timeout_s: float = 5)`: `async conectar()`, `async login(usuario, senha)`, `async comando(palavras: list[str]) -> list[dict[str,str]]`, `async fechar()`; erros `ErroRouterOS(mensagem genérica)`, `CertificadoMudou`, `CertificadoNaoConfiado(impressao: str)`.
  - `FonteMikrotik(fonte: Fonte(modelo), cofre, guarda, limitador)` implementa `Fonte`.

- [ ] **Step 1: testes que falham**
  - protocolo: `test_codifica_tamanhos` (comprimentos 0x7F, 0x80, 0x3FFF, 0x4000, 0x1FFFFF, 0x200000 ida e volta); `test_le_resposta_com_re_e_done`; `test_trap_vira_erro_generico`; `test_fatal_fecha_conexao`; `test_resposta_gigante_e_recusada` (> 1 MB por sentença → erro).
  - simulador (servidor asyncio do protocolo, TLS com certificado de teste gerado em fixture, usuários e tabelas configuráveis, só 10.99.x/MAC 02:00:00): `test_coleta_v7_le_arp_dhcp_vizinhos_wifi` (achados com origens corretas; MAC normalizado `AA:BB:..` maiúsculo); `test_coleta_v6_usa_wireless_registration_table`; `test_testar_avisa_grupo_com_write` (avisos contém "permissão de escrita"); `test_testar_usuario_read_sem_aviso`; `test_certificado_nao_confiado_devolve_impressao`; `test_certificado_mudou_bloqueia`; `test_senha_errada_erro_generico_sem_senha` (texto do erro não contém a senha); `test_cada_comando_custa_ficha_baixa` (limitador espião).
  - `test_limpar_remove_controles_e_trunca`.
- [ ] **Step 2:** rodar; falham.
- [ ] **Step 3:** implementar. Login: `/login =name= =password=` (≥ 6.43); resposta com `=ret=` (login antigo) → erro "RouterOS anterior a 6.43 não suportado". Comandos: `/system/identity/print`, `/system/resource/print`, `/ip/arp/print`, `/ip/dhcp-server/lease/print`, `/ip/neighbor/print`, wireless conforme versão (§5.2), cada um com `.proplist` mínimo. Permissões: `/user/print ?name=<usuario>` → grupo → `/user/group/print ?name=<grupo>` → `policy` contém `write`, `policy` ou `full` sem `!` → aviso. Impressão = SHA-256 hex do certificado DER.
- [ ] **Step 4:** suítes verdes; commit `feat(descoberta): fonte MikroTik com cliente da API RouterOS`.

### Task 4: Fonte SNMP

**Files:**
- Create: `core/sentinela/descoberta/fontes/snmp.py`, `core/tests/descoberta/test_fonte_snmp.py`, `core/tests/descoberta/agente_snmp.py`
- Modify: `core/pyproject.toml` + `uv.lock` (`pysnmp` 7.x, versão exata com ≥ 2 semanas de lançamento)

**Interfaces:**
- Consumes: `Achado`, `ResultadoTeste`, `Fonte` (Task 3); guarda `udp`; limitador baixa.
- Produces: `FonteSnmp(fonte, cofre, guarda, limitador)`; credencial JSON `{"versao":"2c","comunidade":…}` ou `{"versao":"3","usuario":…,"auth":"SHA|SHA256","senha_auth":…,"priv":"AES|AES256","senha_priv":…}`.

- [ ] **Step 1: testes que falham** (agente de teste do próprio pysnmp em 127.0.0.1 com `Guarda(permitir_loopback=True)`):
  - `test_v2c_le_ip_net_to_physical` → achados `snmp_arp` com IP e MAC; `test_queda_para_ip_net_to_media` quando a tabela nova está vazia; `test_fdb_vira_achado_sem_ip_com_porta_nos_sinais`; `test_lldp_vira_sinal_nome_e_plataforma`; `test_v3_auth_priv`; `test_comunidade_errada_timeout_erro_generico` (sem a comunidade no texto); `test_testar_mostra_sysname_e_sysdescr_limpos`; `test_getbulk_custa_ficha_baixa_por_pedido`.
- [ ] **Step 2:** rodar; falham.
- [ ] **Step 3:** implementar com OIDs numéricos (sem compilar MIB); timeout 2 s, 1 nova tentativa, max-repetitions 25, no máximo 5.000 linhas por tabela.
- [ ] **Step 4:** suítes verdes, `pip-audit` limpo; commit `feat(descoberta): fonte SNMP v2c/v3`.

### Task 5: Fontes de gravador e leitura de canais

**Files:**
- Create: `core/sentinela/descoberta/fontes/gravador_http.py` (cliente httpx Digest com TLS por impressão), `core/sentinela/descoberta/fontes/hikvision.py`, `core/sentinela/descoberta/fontes/dahua.py`, `core/sentinela/descoberta/canais.py`, `core/tests/fixtures/gravadores/` (respostas sintetizadas), `core/tests/descoberta/simulador_gravador.py`, `core/tests/descoberta/test_hikvision.py`, `core/tests/descoberta/test_dahua.py`, `core/tests/descoberta/test_canais.py`
- Modify: `core/pyproject.toml` + `uv.lock` (`defusedxml`)

**Interfaces:**
- Consumes: Task 2 (`Agendador.aplicar_externo`, `forcar_desconhecido`), Task 3 (`Achado`, `Fonte`, `ResultadoTeste`, `texto.limpar`).
- Produces:
  - `FonteHikvision`/`FonteDahua(fonte, cofre, guarda, limitador)` implementando `Fonte` e `async status_canais() -> dict[int, bool]` (canal → online).
  - Achados: o próprio gravador (`origem="gravador"`, ip do host) e um por canal (`origem="gravador_canal"`, `pai_fonte_id`, `canal`, nome do canal, IP interno, modelo/fabricante nos sinais).
  - `LeitorCanais(sessoes, agendador, fontes_por_id, limitador, relogio)`: `async executar()` — para cada fonte de gravador ativa com ≥ 1 equipamento filho aprovado, a cada `intervalo_s` da classe `camera` (mín. 15 s) chama `status_canais()` com ficha **normal** e aplica `aplicar_externo` em cada filho (`ok=True/False`); exceção/timeout → `forcar_desconhecido(filhos, "gravador sem resposta")`.

- [ ] **Step 1: testes que falham**
  - parsers por fixture: Hikvision `deviceInfo`, `InputProxy/channels` (2 variações de firmware), `channels/status`; Dahua `getSystemInfo`, `RemoteDevice` (2 variações) e estado de canal; `test_xml_com_entidade_externa_e_recusado` (defusedxml); `test_nome_de_canal_hostil_e_saneado` (Review Focus 1); `test_gravador_sem_canais_devolve_so_o_gravador`; `test_canal_sem_ip`.
  - simulador HTTP Digest (servidor de teste): `test_digest_senha_errada_erro_generico`; `test_https_impressao_nao_confiada`.
  - `test_leitor_tres_falhas_de_canal_offline`; `test_leitor_gravador_mudo_leva_filhos_a_desconhecido`; `test_leitor_nao_roda_sem_filhos_aprovados`; `test_leitor_usa_ficha_normal`.
- [ ] **Step 2:** rodar; falham.
- [ ] **Step 3:** implementar. Respostas limitadas a 2 MB; sem seguir redirecionamento; timeout 5 s.
- [ ] **Step 4:** suítes verdes; commit `feat(descoberta): gravadores Hikvision e Dahua com estado das câmeras`.

### Task 6: Classificador

**Files:**
- Create: `core/sentinela/descoberta/classificador/__init__.py`, `regras.toml`, `regras.py`, `oui.py`, `oui.tsv.gz`, `sondagem.py`; `core/scripts/gerar_oui.py`; `core/tests/descoberta/test_classificador.py`, `test_oui.py`, `test_sondagem.py`
- Modify: `core/sentinela/cli.py` (`oui-atualizar <arquivo>`), `core/pyproject.toml` (incluir `regras.toml` e `oui.tsv.gz` no pacote), Dockerfile do core se precisar copiar dados

**Interfaces:**
- Consumes: `Achado` (Task 3), guarda `tcp`/`http`/`https`, limitador baixa.
- Produces:
  - `Sinal(regra: str, descricao: str, pontos: dict[str, int])`; `Classificacao(classe: str, confianca: float, sinais: list[Sinal])`.
  - `classificar(fatos: Fatos) -> Classificacao` (pura). `Fatos(fabricante: str|None, origens: set[str], portas_abertas: set[int], titulo_http: str|None, nome: str|None, sinais_fonte: dict[str,str])`.
  - `carregar_regras(caminho: Path | None = None) -> list[Regra]` (TOML; condições: `fabricante_contem`, `porta_aberta`, `http_titulo_regex`, `origem`, `nome_regex`, `sinal_contem` {chave, valores}).
  - `BaseOui.carregar() -> BaseOui`; `fabricante(mac: str) -> str | None` (prefixos 36 > 28 > 24 bits; MAC localmente administrado → None).
  - `async sondar(ip: str, guarda, limitador) -> tuple[set[int], str | None]` (portas abertas, título).
- [ ] **Step 1: testes que falham**
  - `test_tabela_de_casos` (parametrizado, ≥ 15 casos): Hikvision + 554 → `camera`; Hikvision + `gravador_canal` → `camera`; Dahua + 37777 sem 554 → `gravador`; título "iDFace" → `controle_acesso`; 4370 → `controle_acesso`; 9100 → `impressora`; 8291/vizinho MikroTik → `roteador`; LLDP plataforma "switch" → `switch`; `wifi` sozinho → `desconhecido` (só 15 pts); nada → `desconhecido` confiança 0.
  - `test_confianca_e_razao_dos_pontos`; `test_limiar_50_absoluto`; `test_sinais_tem_descricao_em_portugues_simples`.
  - `test_regras_toml_invalido_falha_no_carregamento` (mensagem diz a regra); `test_regex_e_compilado_com_limite` (padrão > 200 caracteres recusado).
  - OUI: `test_prefixo_36_vence_24`; `test_mac_local_sem_fabricante`; `test_cli_oui_atualizar_le_arquivo_local` (CSV IEEE pequeno de fixture → novo gz; sem acesso à rede).
  - sondagem (servidor TCP/HTTP local em loopback): `test_so_portas_da_lista`; `test_uma_conexao_por_vez`; `test_titulo_truncado_e_sem_controles`; `test_redirecionamento_para_outro_host_nao_seguido`; `test_le_no_maximo_16kb`; `test_cada_porta_custa_ficha_baixa`.
- [ ] **Step 2:** rodar; falham.
- [ ] **Step 3:** implementar. `regras.toml` com as regras da arquitetura §8 mais: Control iD, ZKTeco, Intelbras (controle de acesso e câmeras), MikroTik, Ubiquiti, TP-Link, HP/Epson/Brother (impressoras). `gerar_oui.py` baixa os registros IEEE MA-L/MA-M/MA-S **só quando rodado à mão** pelo mantenedor e gera `oui.tsv.gz` (prefixo, fabricante); o arquivo gerado é commitado.
- [ ] **Step 4:** suítes verdes; commit `feat(descoberta): classificador por pontos com OUI e sondagem`.

### Task 7: Orquestrador e varredura

**Files:**
- Create: `core/sentinela/descoberta/orquestrador.py`, `core/sentinela/descoberta/mescla.py`, `core/sentinela/descoberta/varredura.py`, `core/sentinela/descoberta/fontes/simulada.py`, `core/tests/descoberta/test_mescla.py`, `test_orquestrador.py`, `test_varredura.py`
- Modify: `core/sentinela/main.py` (sobe orquestrador e `LeitorCanais` junto do monitor; em modo demo só fontes simuladas), `core/sentinela/demo/simulador.py` (semeia 3 fontes simuladas)

**Interfaces:**
- Consumes: Tasks 1–6.
- Produces:
  - `chave_de(a: Achado) -> str`: `nvr:<pai_fonte_id>:<canal>` para canal; MAC normalizado; senão `ip:<ip>`.
  - `async mesclar(db, achados: list[Achado], guarda, agora) -> ResultadoMescla(novas: list[int], atualizadas: list[int], equipamentos_atualizados: list[str], conflitos: list[int])` — regras da spec §5.2 + §9.2/§9.3/§9.5.
  - `Orquestrador(sessoes, guarda, limitador, barramento, agendador, cofre, relogio, fabrica_fontes)`: `async executar()`; `async coletar_agora(fonte_id: int) -> None` (levanta `ColetaRecente` se < 30 s); `async aprovar(db, descoberta_id, classe_slug: str|None, nome: str|None, usuario) -> Equipamento`; `async sondar_descoberta(descoberta_id)`.
  - `Varredura(sessoes, guarda, limitador, barramento, relogio)`: `async iniciar(sub_rede_id)`, `cancelar()`, `progresso() -> dict | None` (`{"cidr","feitos","total","achados"}`); levanta `VarreduraEmAndamento`, `VarreduraNaoPermitida`.
  - Mensagens no barramento: `{"tipo":"descoberta","acao":"nova|atualizada|removida","id":…,"classe_sugerida":…,"confianca":…}`, `{"tipo":"varredura",…progresso}`, `{"tipo":"pendentes","total":N}`.
- [ ] **Step 1: testes que falham**
  - mescla: `test_mesmo_mac_duas_fontes_uma_descoberta` (Review Focus 3); `test_mac_conhecido_muda_ip_atualiza_equipamento_e_audita`; `test_ip_novo_ocupado_gera_conflito_sem_alterar` (§9.5); `test_equipamento_so_ip_ganha_mac`; `test_ignorada_continua_ignorada`; `test_canal_nao_mescla_por_ip` (dois gravadores com canal de IP 192.168.254.2 → duas descobertas); `test_fora_das_subredes_marcado` (§9.2); `test_pendente_classificada_sem_sondar` (sondagem espiã não chamada fora de sub-rede com varredura); `test_sub_rede_com_varredura_sonda_uma_vez_por_24h`.
  - orquestrador: `test_falha_de_uma_fonte_nao_para_as_outras` + `ultimo_erro` genérico (Review Focus 2); `test_aprovacao_automatica_acima_do_limiar`; `test_aprovar_canal_aprova_gravador_junto`; `test_aprovar_cria_equipamento_agendado_sem_reiniciar` (alvo aparece no agendador); `test_aprovar_fora_das_subredes_recusa`; `test_checagem_sugerida` (canal→gravador; porta 554 aberta e sem ICMP→tcp 554; nada→icmp); `test_coletar_agora_limite_30s`; `test_publica_mensagens_no_barramento`; `test_teste_ok_de_gravador_liga_equipamento_pelo_ip_ou_cria_descoberta_do_gravador` (§9.3; exposto como `Orquestrador.apos_teste(fonte_id, resultado)` e chamado pela rota de teste da Task 8).
  - varredura: `test_so_sub_rede_permitida`; `test_ritmo_2_ips_por_segundo` (relógio falso); `test_pula_rede_e_broadcast`; `test_cancelar`; `test_uma_por_vez`; `test_ficha_baixa`.
  - demo: `test_demo_semeia_cerca_de_40_pendentes_sem_rede` (nenhum socket aberto: monkeypatch de `socket.socket` levanta).
- [ ] **Step 2:** rodar; falham.
- [ ] **Step 3:** implementar.
- [ ] **Step 4:** suítes verdes; commit `feat(descoberta): orquestrador, mescla, varredura e fontes simuladas`.

### Task 8: API de fontes, descobertas, varredura e configuração

**Files:**
- Create: `core/sentinela/api/fontes.py`, `core/sentinela/api/descobertas.py`, `core/sentinela/api/varredura.py`, `core/sentinela/api/config_descoberta.py`, `core/sentinela/api/esquemas_descoberta.py`, `core/tests/api/test_fontes.py`, `test_descobertas.py`, `test_varredura_api.py`, `test_config_descoberta.py`, `test_segredos_nao_vazam.py`
- Modify: `core/sentinela/main.py` (routers), `core/sentinela/api/ws.py` (snapshot inclui `pendentes`), `core/sentinela/api/subredes.py` (`permite_varredura` no PATCH)

**Interfaces:**
- Consumes: Task 7 (`Orquestrador`, `Varredura`), Task 1 (`Cofre`).
- Produces: rotas da spec §5.3 + `POST /fontes/{id}/confiar {impressao}`, `POST /descobertas/{id}/sondar`, `POST /descobertas/{id}/declarar-subrede` (declara o /24 do IP; usa o mesmo caminho de `subredes` com `sincronizar`), `POST /descobertas/{id}/reabrir`. Respostas: `FonteSaida` sem credencial (`credencial_definida`), `DescobertaSaida` (id, ip, mac, fabricante, nome_sugerido, classe_sugerida, confianca, sinais[{descricao, pontos}], origens, status, fora_das_subredes, conflito_com_nome, pai_equipamento_id, canal, primeira_vez, ultima_vez), `LoteSaida(aprovadas: list[int], recusadas: list[{id, motivo}])`.
- [ ] **Step 1: testes que falham**
  - papel: toda rota de escrita → 403 para visualizador, 403 sem CSRF; `GET /descobertas` permitido ao visualizador.
  - fontes: `test_criar_host_fora_das_subredes_422`; `test_credencial_nunca_sai` (GET/POST/PATCH/testar); `test_patch_sem_credencial_mantem_a_antiga`; `test_confiar_impressao_diferente_da_mostrada_409`; `test_coletar_agora_429_dentro_de_30s`; `test_auditoria_sem_segredo`.
  - descobertas: paginação ≤ 100 e filtro `status`; `test_aprovar_com_troca_de_classe_marca_manual`; `test_lote_parcial` (Review Focus 4); `test_lote_mais_de_200_422`; `test_declarar_subrede_libera_aprovacao`; `test_sondar_audita`.
  - varredura: iniciar/cancelar/progresso; sub-rede sem permissão → 409.
  - `test_segredos_nao_vazam`: cria fontes com senha/comunidade marcadoras, exercita todas as rotas e erros, e procura as marcadoras em respostas, logs capturados (`caplog`) e tabela `auditoria` → 0 ocorrências.
  - WS: snapshot traz `pendentes`; mensagem `descoberta` chega ao cliente.
- [ ] **Step 2:** rodar; falham.
- [ ] **Step 3:** implementar com limite de taxa (mesmo mecanismo do login) em testar/coletar/sondar/varredura: 10 por minuto por usuário.
- [ ] **Step 4:** suítes verdes; commit `feat(api): fontes, descobertas, varredura e configuração da descoberta`.

### Task 9: Interface — Novos, Configurações e filhos do gravador

**Files:**
- Create: `web/src/js/novos.js`, `web/src/js/configuracoes.js`, `web/src/css/novos.css` (ou seção em CSS existente), `web/tests/js/novos.test.mjs`, `web/tests/js/configuracoes.test.mjs`
- Modify: `web/src/index.html` (abas Novos e Configurações como `section role="tabpanel"` dentro do `main` existente; faixa de varredura), `web/src/js/app.js`, `web/src/js/api.js`, `web/src/js/ws.js`, `web/src/js/organograma.js` (filhos sob o gravador), `web/src/js/teia-pagina.js` (painel: "atrás do gravador X, canal N"), `web/src/js/tema.js` (deep link `#novos`/`#configuracoes`), `web/tests/test_smoke.py`, `web/tests/conftest.py` (fixture com fontes simuladas)

**Interfaces:**
- Consumes: Task 8 rotas e mensagens WS.
- Produces: funções puras testáveis em Node: `sinaisLegiveis(sinais) -> [{texto, pontos}]`, `agruparPorGravador(descobertas) -> [{gravador, canais[]}]`, `formularioFonte(tipo) -> campos[]`, `validarFonte(tipo, valores) -> erros{}`.
- [ ] **Step 1: testes que falham**
  - Node: os 4 utilitários acima (inclui texto hostil passando como texto, agrupamento com canal órfão, formulário SNMP v3 exige senhas).
  - Smoke: `test_novos_mostra_pendentes_com_contador`; `test_novos_aprovar_vai_para_lista_ao_vivo`; `test_novos_ignorar_e_reabrir`; `test_novos_lote`; `test_novos_visualizador_so_leitura`; `test_novos_fora_das_subredes_desabilita_aprovar`; `test_configuracoes_cria_fonte_testa_e_coleta` (fonte simulada); `test_senha_nao_volta_no_formulario`; `test_faixa_de_varredura_e_cancelar`; `test_organograma_camera_sob_gravador`; `test_novos_2000_pendentes_pagina` (Review Focus 5: fixture semeia 2.000, a página carrega ≤ 100 e o contador mostra 2000); zero erro de console em todos; deep link `#novos` sem piscar a Lista.
- [ ] **Step 2:** rodar; falham.
- [ ] **Step 3:** implementar no design system existente (vidro, cores suaves); textos de sinais por `x-text`; barra de confiança com texto ("86%"), não só cor; aviso do botão Sondar: "gera um pedido ARP na rede"; aviso da varredura conforme spec §5.4.
- [ ] **Step 4:** `npm test`, smoke ×3 verdes; primeira tela ≤ 150 KB gzip; Lighthouse 13.6.0 desktop em `#novos` e `#configuracoes` ≥ 90 nas quatro notas (registrar números); commit `feat(web): abas Novos e Configurações`.

### Task 10: Prova de zero broadcast, documentação e demo

**Files:**
- Create: `testes-rede/compose.captura.yml`, `testes-rede/simuladores/` (Dockerfile pequeno que roda os simuladores de RouterOS, SNMP e gravador das Tasks 3–5 com IPs fixos 10.99.250.x), `testes-rede/analisar_captura.py`, `testes-rede/README.md`
- Modify: `.github/workflows/ci.yml` (job `captura`, ubuntu), `README.md` (seção "Descoberta automática"), `docs/arquitetura/ARQUITETURA.md` (§7.1/§8 ajustes, ADR 010 TOML, §18 Fase 3 concluída com números), `.env.example`

**Interfaces:**
- Consumes: tudo.
- [ ] **Step 1:** compose numa rede bridge isolada `10.99.250.0/24` (`internal: true`): núcleo (modo normal, sub-rede declarada, sub-rede com varredura ligada), 3 simuladores, sidecar `tcpdump -i any -w` compartilhando a rede do núcleo. Script de cena: cria fontes por API, testa, confia na impressão, coleta, aprova 2 descobertas, sonda 1, roda varredura de um /28.
- [ ] **Step 2:** `analisar_captura.py <pcap> --origem <ip/mac do núcleo> --arp-permitido <lista>` (dpkt ou leitura pcap manual, sem dependência nova no núcleo): reprova quadro do núcleo com destino `ff:ff:ff:ff:ff:ff`, `01:00:5e:*`, `33:33:*`, IP broadcast/multicast, exceto ARP request para IPs da lista (sondados/aprovados/varridos); imprime contagem.
- [ ] **Step 3:** teste negativo do analisador: pcap sintético com 1 quadro mDNS → reprova; com ARP para IP permitido → passa.
- [ ] **Step 4:** job de CI `captura` roda a cena e o analisador; deve passar.
- [ ] **Step 5:** docs: README (fontes suportadas, usuário `read` no MikroTik, aviso de ARP, aprovação automática), ARQUITETURA §17 ADR 010 (TOML em vez de YAML) e ADR 011 (classificação passiva; sondagem só com autorização), §18 "Fase 3 concluída em <data>" com números.
- [ ] **Step 6:** reconstruir a demo no lugar: marcar imagens atuais `pre_<ts>`, `SENTINELA_PORTA_HTTPS=8443 SENTINELA_PORTA_HTTP=8080 ./install.sh --demo` (mesmo volume e admin; nunca imprimir a senha); verificar containers healthy, Novos com ~40 pendentes, aprovar uma câmera do gravador simulado e vê-la na Teia.
- [ ] **Step 7:** verificação completa (suítes, smoke ×3, compose smoke, trivy 0 HIGH/CRITICAL corrigíveis, pip-audit, primeira tela, Lighthouse); commit `test(rede): prova de zero broadcast e docs da Fase 3`.
