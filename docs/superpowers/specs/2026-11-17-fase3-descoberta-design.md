# Sentinela — Fase 3: Descoberta automática e classificador

Data: 2026-11-17 · Base: Fase 2 integrada na `main` (978e472) · Arquitetura: `docs/arquitetura/ARQUITETURA.md` §5–§8, §10, §11, §13, §17–§19

## 1. Intenção

O dono pediu desde o início: "se tiver jeito ele mesmo busca na rede o equipamento e já separa por classe", **sem causar lentidão e sem broadcast**. Até agora o cadastro é manual ou por CSV. A Fase 3 faz o Sentinela **perguntar a quem já conhece a rede** (roteador MikroTik, switches/roteadores com SNMP, gravadores de câmeras), **classificar** cada achado com uma explicação legível ("por que acho que é câmera") e deixar o administrador **aprovar** o que entra na teia.

O dono citou o The Dude (MikroTik) como referência; a maior parte das redes dele tem MikroTik, câmeras em gravadores e controles faciais.

## 2. Objetivos, não-objetivos, anti-objetivos

**Objetivos**
- **Fontes** configuráveis pelo administrador: MikroTik (RouterOS v6 e v7), SNMP v2c/v3 (qualquer marca), gravador Hikvision (ISAPI) e Dahua/Intelbras (CGI). Testar conexão, coletar agora, coleta periódica (padrão 10 min).
- **Câmeras atrás do gravador** viram equipamentos **filhos** do gravador, com estado lido do próprio gravador (o Sentinela nunca fala com elas).
- **Classificador** por pontos, auditável: fabricante pelo OUI (base IEEE embutida), portas de uma lista fixa, título HTTP, origem do achado, dados do gravador/SNMP. Mostra os sinais.
- Aba **Novos**: descobertas pendentes com classe sugerida, confiança e sinais; trocar a classe, aprovar, ignorar, aprovar em lote. Contador na aba.
- Aba **Configurações** (admin): fontes, sub-redes com a chave "permitir varredura", aprovação automática acima de um limiar.
- **Varredura lenta opcional**, desligada por padrão, por sub-rede, só admin, auditada, 2 IPs/s, com faixa de aviso na tela enquanto roda.
- **Modo demonstração** ganha fontes simuladas, para a aba Novos aparecer cheia na demo.
- **Prova de zero broadcast**: teste de captura no CI (Linux) com simuladores numa rede Docker isolada.

**Não-objetivos (Fase 4 ou depois)**
- Alertas, Telegram, correlação de quedas para silenciar filhos.
- Desenhar topologia por porta de switch (LLDP/FDB são coletados como sinal e guardados, não desenhados).
- ONVIF, mDNS, SSDP, WS-Discovery (multicast: proibidos pelo ADR 003), NetBIOS.
- Outras marcas de gravador além de Hikvision e Dahua/Intelbras; controladoras UniFi/Omada.
- IPv6.
- Escrever qualquer coisa nos equipamentos.

**Anti-objetivos**
- Qualquer pacote broadcast/multicast originado pelo Sentinela (exceto o ARP do sistema operacional na varredura opcional, contabilizado e avisado).
- Rajada na rede: tudo passa pelo limitador global já existente.
- Poluir a teia com celulares de visitantes: nada entra sem aprovação (ou sem passar do limiar de aprovação automática que o admin ligou).
- Credencial de rede legível: cifrada no banco, nunca devolvida pela API, nunca em log.
- Dado real no repositório público.

## 3. Restrições

- Toda abertura de socket recebe `DestinoAutorizado` do guarda (§6 da arquitetura). Bibliotecas de terceiros só são chamadas a partir de um módulo adaptador que recebe o destino já validado; um teste estático garante que nenhum outro módulo as importa.
- Teste estático existente contra `SO_BROADCAST` e lista de bloqueio de bibliotecas multicast continuam valendo e passam a cobrir os módulos novos.
- Limitador global (20 pps padrão) também para a classificação e a varredura, sempre com prioridade **abaixo** das checagens de monitoramento (descoberta nunca atrasa detecção de queda).
- Poucas dependências, versões fixas no `uv.lock`, `pip-audit` e `trivy` limpos.
- Migração Alembic reversível (`downgrade` testado).
- API: autenticação, CSRF em escrita, papel admin para fontes/aprovação/varredura, erro genérico, auditoria de toda ação administrativa.
- Texto vindo da rede (título HTTP, nome de canal, sysDescr, identidade do roteador) é não confiável: limitado em tamanho, sem controle, renderizado só por `textContent`.
- Repositório público: simuladores e fixtures só com 10.99.x e MACs `02:00:00:…`; respostas de gravador sintetizadas, nunca capturadas de cliente.
- Front: CSP inalterada, primeira tela ≤ 150 KB gzip, Lighthouse ≥ 90 nas abas novas.

## 4. Abordagens consideradas

| Tema | Opções | Escolha (minha, o dono delegou o "como") | Por quê |
|---|---|---|---|
| Cliente MikroTik | `librouteros` (síncrono); API REST do v7; **cliente asyncio próprio do protocolo API** | cliente próprio (~200 linhas) | o protocolo é simples (palavras com prefixo de tamanho); funciona em v6 e v7; recebe `DestinoAutorizado`; sem threads |
| SNMP | **pysnmp 7 (asyncio)**; netsnmp em C; codificar BER à mão | pysnmp, só por adaptador | v3 exige USM com criptografia: não reescrever; OIDs numéricos, sem compilar MIB em tempo de execução |
| Gravadores | **httpx com Digest** (já é dependência); SDK do fabricante | httpx + `defusedxml` para o XML da ISAPI | sem binário fechado; XML de rede tratado como hostil |
| Regras do classificador | YAML (como na arquitetura); **TOML via `tomllib` da biblioteca padrão** | TOML | mesma legibilidade sem nova dependência; desvio registrado como ADR 010 |
| Base OUI | baixar em tempo de execução; **arquivo embutido** | `oui.tsv.gz` no pacote + `sentinela oui-atualizar <arquivo>` lendo arquivo local | arquitetura proíbe download em execução |
| Cifra das credenciais | **Fernet (`cryptography`)** | Fernet com chave própria `SENTINELA_CHAVE_CREDENCIAIS` no `.env` (600), gerada pelo `install.sh`, separada da chave de sessão | prevista na arquitetura (§13) |
| Estado das câmeras atrás do gravador | sondar cada câmera; **ler o status de canais do gravador** | ler do gravador, uma requisição por gravador por ciclo | câmeras ficam numa rede interna do NVR (ADR 009) |

## 5. O que muda

### 5.1 Dados (migração `0002_descoberta`)

- **`fonte`**: id, tipo (`mikrotik`|`snmp`|`hikvision`|`dahua`), nome, host, porta, `tls` (bool), `credencial_cifrada` (blob Fernet com JSON: usuário/senha ou comunidade ou parâmetros v3), `impressao_tls` (SHA-256 do certificado aceito no primeiro teste, para MikroTik/gravador com certificado autoassinado), ativa, intervalo_s (padrão 600, 300–3600), ultima_coleta, ultimo_erro (texto genérico, sem segredo), equipamento_id (o equipamento que representa o aparelho da fonte, quando houver).
- **`descoberta`**: id, chave (MAC normalizado, ou `ip:<ip>` sem MAC), ip, mac, fabricante, nome_sugerido, sinais (JSON), classe_sugerida, confianca, origens (JSON: lista de fonte_id/tipo), status (`pendente`|`aprovada`|`ignorada`), pai_equipamento_id, canal (para câmera de gravador), equipamento_id (quando aprovada), primeira_vez, ultima_vez. Única por `chave`. Ignorada continua ignorada nas coletas seguintes (o admin pode "desfazer ignorar").
- **`equipamento`** ganha `pai_id` (FK equipamento, `ON DELETE SET NULL`), `canal` (int, câmera de gravador) e `checagem` aceita `gravador`. O índice único de `ip` passa a valer só onde `checagem <> 'gravador'` (câmeras de gravadores diferentes podem repetir IP interno).
- **`sub_rede`** ganha `permite_varredura` (padrão falso).
- **`config`** (chave/valor tipado, já prevista na arquitetura): `aprovacao_automatica` (desligada), `limiar_aprovacao` (0,80), `intervalo_varredura_ips_s` (0,5 → 2 IPs/s).

### 5.2 Núcleo: pacote `sentinela/descoberta/`

- `fontes/mikrotik.py`: cliente do protocolo API (8729 TLS padrão; 8728 só se o admin desmarcar TLS, com aviso). Login moderno (`/login` com nome e senha, RouterOS ≥ 6.43); versões mais antigas recebem erro claro. Lê `/ip/arp/print`, `/ip/dhcp-server/lease/print`, `/ip/neighbor/print`, `/interface/wireless/registration-table/print` (v6) ou `/interface/wifi/registration-table/print` (v7, com queda para `/caps-man/registration-table` se existir), `/system/identity/print`, `/system/resource/print`. Ao testar: lê o grupo do próprio usuário e as políticas do grupo; se tiver `write`/`policy`/`full`, mostra aviso forte (não bloqueia).
- `fontes/snmp.py`: adaptador do pysnmp. GETBULK em `ipNetToPhysicalTable` (queda para `ipNetToMediaTable`), `dot1qTpFdbTable`/`dot1dTpFdbTable`, `lldpRemTable`, `sysDescr`/`sysName`/`sysObjectID`. Timeout 2 s, 1 nova tentativa, `max-repetitions` 25.
- `fontes/hikvision.py`: `GET /ISAPI/System/deviceInfo`, `/ISAPI/ContentMgmt/InputProxy/channels` e `/ISAPI/ContentMgmt/InputProxy/channels/status` (Digest). Canal → descoberta filha com nome do canal, IP interno, modelo, fabricante.
- `fontes/dahua.py`: `/cgi-bin/magicBox.cgi?action=getSystemInfo`, `/cgi-bin/configManager.cgi?action=getConfig&name=RemoteDevice`, e estado dos canais (`/cgi-bin/LogicDevice` ou `RemoteDevice` com `Enable`/estado conforme firmware; o construtor escolhe pelo que os simuladores e a documentação pública mostram, com teste por fixture para cada variação suportada).
- `fontes/simulada.py`: só no modo demonstração; produz achados sintéticos 10.99.x estáveis por semente.
- `fontes/base.py`: `Achado(ip, mac, origem, fonte_id, nome?, fabricante?, pai?, canal?, extras)` e protocolo `Fonte.coletar() -> list[Achado]`, `Fonte.testar() -> ResultadoTeste`. Falha de uma fonte grava `ultimo_erro` e não derruba as outras.
- `classificador/`: `regras.toml` (embutido, editável só no código), `oui.py` (busca por prefixo 24/28/36 bits na base embutida), `sondagem.py` (TCP connect na lista fixa: 22, 23, 80, 443, 554, 4370, 8000, 8080, 8291, 9100, 37777, 3389; uma conexão por vez por IP, 1 s de timeout, cada tentativa custa 1 ficha do limitador em prioridade baixa; título HTTP só se 80/443/8080 abertos, `GET /` com 2 s, no máximo 16 KB lidos, sem seguir redirecionamento para outro host, título truncado em 120 caracteres). Pontuação e limiar como na arquitetura §8 (classe vencedora ≥ 50 pontos absolutos senão `desconhecido`; confiança = pontos da vencedora ÷ soma).
- `orquestrador.py`: laço por fonte no seu intervalo; mescla achados pela chave (MAC > IP); para cada chave:
  1. já é equipamento cadastrado (MAC igual, ou IP igual sem MAC): atualiza `visto_em`, preenche `fabricante` vazio; se o IP de um MAC conhecido mudou, atualiza o IP, registra auditoria de sistema e publica no barramento (a checagem passa a mirar o IP novo).
  2. descoberta ignorada: só atualiza `ultima_vez`.
  3. nova ou pendente: classifica (sondagem só uma vez por chave a cada 24 h, para não repetir tráfego), grava/atualiza a descoberta, publica `descoberta` no barramento. Se a aprovação automática estiver ligada e confiança ≥ limiar, aprova.
- `varredura.py`: só sub-redes com `permite_varredura`; ICMP echo unicast em cada IP (nunca rede/broadcast — o guarda já recusa), ritmo `intervalo_varredura_ips_s`, prioridade baixa no limitador; quem responde vira `Achado(origem="varredura")`. Uma varredura por vez; pode ser cancelada.
- **Câmeras atrás do gravador**: a fonte do gravador, além do inventário no intervalo da fonte, roda uma leitura leve do status dos canais no intervalo da classe `camera` (15 s padrão, mínimo 15 s) quando houver pelo menos uma câmera aprovada daquele gravador. Cada canal vira uma amostra ok/falha entregue à **mesma máquina de estados** da Fase 1 (histerese igual). Se o gravador não responder, os filhos vão para `desconhecido` com causa "gravador sem resposta" (não para offline: quem caiu foi o gravador).
- Aprovar uma descoberta cria o `Equipamento` (`classe_origem='auto'` se a classe não foi trocada, `'manual'` se foi), com checagem sugerida: `gravador` para canais; `icmp` se respondeu ICMP; senão `tcp` na primeira porta aberta da lista; senão `icmp`. O monitor existente passa a agendá-lo sem reiniciar (mesmo caminho do cadastro manual).

### 5.3 API (`/api/v1`)

| Rota | Papel | Faz |
|---|---|---|
| `GET /fontes` | admin | lista sem credenciais (`credencial_definida: bool`) |
| `POST /fontes`, `PATCH /fontes/{id}`, `DELETE /fontes/{id}` | admin + CSRF | CRUD; host passa pelo guarda na gravação; credencial só entra, nunca sai |
| `POST /fontes/{id}/testar` | admin + CSRF | conecta, mostra identidade/versão, aviso de permissão excessiva, impressão TLS para aceitar |
| `POST /fontes/{id}/coletar` | admin + CSRF | coleta agora (no máximo 1 por fonte a cada 30 s) |
| `GET /descobertas?status=pendente` | autenticado | lista paginada (≤ 100) com sinais |
| `POST /descobertas/{id}/aprovar` (classe opcional, nome opcional), `/ignorar`, `/reabrir` | admin + CSRF | |
| `POST /descobertas/aprovar-lote` (≤ 200 ids) | admin + CSRF | |
| `POST /varredura` (sub_rede_id), `DELETE /varredura` | admin + CSRF | inicia/cancela; `GET /varredura` mostra progresso |
| `GET/PATCH /config/descoberta` | admin (+ CSRF no PATCH) | aprovação automática e limiar |

Limite de taxa nas rotas de teste/coleta/varredura. WebSocket ganha mensagens `descoberta` (nova/atualizada/removida da fila) e `varredura` (progresso).

### 5.4 Interface

- Aba **Novos** (entre Organograma e as demais), com contador de pendentes. Tabela/cartões: nome sugerido, IP, MAC, fabricante, classe sugerida (seletor), barra de confiança, origens, "por que": lista de sinais em linguagem simples ("fabricante Hikvision +30 câmera", "porta 554 (vídeo) aberta +40 câmera"). Selecionar várias → aprovar/ignorar em lote. Câmeras de gravador aparecem agrupadas sob o gravador.
- Aba **Configurações** (só admin): cartões de fonte com estado da última coleta, botões testar/coletar/editar, formulário por tipo (senha em campo `password`, nunca preenchido de volta); sub-redes com a chave de varredura e aviso explicando o ARP; aprovação automática com limiar.
- Faixa no topo enquanto houver varredura rodando ("Varredura lenta em 10.0.0.0/24: 37%. Cancelar").
- Painel do equipamento (Lista/Organograma/Teia) mostra "atrás do gravador X, canal N" para filhos. O Organograma agrupa filhos sob o gravador dentro da classe Câmeras.
- Mesmo design system das Fases 1–2 (vidro, cores suaves); visualizador vê Novos só leitura.

### 5.5 Instalação e demo

- `install.sh` gera `SENTINELA_CHAVE_CREDENCIAIS` (Fernet) se faltar, sem alterar as chaves existentes; rodar de novo continua idempotente.
- Demo: fontes simuladas (um "MikroTik", um "switch SNMP", um "gravador" com 16 canais) produzindo ~40 descobertas pendentes; nenhum pacote sai para a rede no modo demonstração.

## 6. Testes e pronto quando

- Unidade: codificação/decodificação do protocolo API (inclui palavras longas, `!trap`, `!fatal`, `!done`), parsers ISAPI/Dahua por fixture, classificador (tabela de casos com pontos esperados), mescla por MAC/IP, mudança de IP, ignorada continua ignorada, aprovação automática, cifra/decifra e máscara de credencial, guarda recusando host de fonte fora das sub-redes.
- Integração: simulador de RouterOS (servidor asyncio do protocolo API, com TLS de teste) e simulador de gravador (servidor HTTP com Digest), agente SNMP de teste do próprio pysnmp; `downgrade`/`upgrade` da migração.
- Segurança: credencial nunca aparece em resposta, log ou auditoria (teste procura o segredo em tudo); XSS de título HTTP e nome de canal; IDOR não se aplica (instalação única) mas papel é testado em toda rota.
- Smoke Playwright: Novos aprova/ignora/lote; Configurações cria fonte simulada, testa e coleta; faixa da varredura; zero erro de console; Lighthouse ≥ 90 em Novos e Configurações.
- **Captura sem broadcast (CI, Linux)**: compose de teste numa rede bridge isolada com núcleo + simuladores + `tcpdump` em sidecar; roda uma coleta completa de todas as fontes, classificação e uma varredura curta; falha se houver quadro do IP/MAC do Sentinela com destino broadcast ou multicast, exceto ARP request durante a varredura (contado e relatado).
- Núcleo continua 100% verde (`pytest -W error`), mypy estrito, ruff, bandit, pip-audit, gitleaks, trivy.

**Pronto quando:** a demo mostra ~40 descobertas com sinais, aprovar põe o equipamento na Lista/Teia/Organograma ao vivo, câmeras do gravador simulado aparecem como filhas com estado vindo do gravador; descoberta contra os três simuladores verde; teste de captura verde.

## 7. Deixado ao construtor

- Detalhes de cada parser (nomes de campos variam por firmware): cobrir o que a documentação pública e os simuladores mostram, com fixture por variação.
- Layout fino das abas novas dentro do design system existente.
- Escolha da quebra das tarefas no plano.

## 8. Decisões que tomei (o dono pode corrigir)

1. Regras em TOML em vez de YAML (sem dependência nova).
2. Câmeras de gravador sem resposta do gravador vão para "desconhecido", não "offline".
3. Sondagem de portas de cada achado no máximo uma vez por dia.
4. Índice único de IP deixa de valer para câmeras de gravador.
5. MikroTik por TLS (8729) por padrão, com impressão do certificado aceita no primeiro teste.
6. Visualizador enxerga a aba Novos sem poder aprovar.

## 9. Esclarecimentos (revisão do construtor; valem sobre o texto acima)

1. **Classificação não provoca ARP.** Falar pela primeira vez com um IP do mesmo segmento faz o sistema operacional emitir um ARP (broadcast). Por isso a descoberta pendente é classificada **só com dados passivos**: OUI do MAC, nome DHCP, identidade/plataforma de `/ip/neighbor`, registro Wi‑Fi, dados SNMP/LLDP, dados do gravador. A sondagem de portas e o título HTTP (§5.2) só rodam: (a) em sub-redes com `permite_varredura` ligada; ou (b) quando o admin clica "Sondar" numa descoberta (botão com aviso "gera um pedido ARP"), auditado; ou (c) depois da aprovação, para sugerir a checagem (o monitoramento falaria com o IP de qualquer jeito). O teste de captura aceita ARP request apenas para IPs de (a), (b) ou (c), contados e relatados; qualquer outro broadcast/multicast reprova. "Respondeu ICMP" sem sondagem não existe: a checagem sugerida usa a regra TCP/ICMP depois da aprovação.
2. **Achado fora das sub-redes declaradas** é guardado e aparece em Novos com o selo "fora das sub-redes monitoradas" e o botão "Declarar sub-rede x.x.x.0/24" (admin, auditado). Aprovar fica desabilitado até a sub-rede ser declarada; o guarda continua sendo a única autoridade.
3. **Câmeras de gravador.** Chave da descoberta: `nvr:<fonte_id>:<canal>`; não passam pelos passos 1 e 3 de mescla por MAC/IP. Ao testar uma fonte de gravador com sucesso, o Sentinela liga `fonte.equipamento_id` ao equipamento com o mesmo IP do gravador, se houver; senão, cria a descoberta do próprio gravador (classe `gravador`). Aprovar uma câmera cujo gravador ainda não foi aprovado aprova o gravador junto (na mesma transação, auditado). **Nenhum desvio do guarda:** a checagem `gravador` nunca abre socket para o IP da câmera; o único socket é para o host do gravador, validado pelo guarda como hoje.
4. **Impressão TLS** (MikroTik 8729 e gravador HTTPS): o teste devolve a impressão SHA-256; o admin confirma com "Confiar neste certificado" (`POST /fontes/{id}/confiar` com a impressão mostrada, auditado). Sem impressão confiada, a coleta é recusada quando o certificado não é válido por cadeia. Impressão diferente depois: coleta bloqueada, `ultimo_erro` = "certificado do aparelho mudou", exige nova confirmação.
5. **Conflito de IP.** Se o IP novo de um MAC conhecido já pertence a outro equipamento cadastrado, nada é alterado: a descoberta fica pendente com o selo "conflito de IP com <nome>" para o admin decidir. Equipamento cadastrado só por IP que aparece com MAC numa fonte: o MAC é preenchido automaticamente (auditado), se nenhum outro equipamento tiver esse MAC.
6. **Prioridade no limitador.** Leitura do status de canais = monitoramento (prioridade normal, custo 1 por gravador). Coleta de inventário, sondagem e varredura = nova prioridade **baixa**, servida só quando não há pedido normal ou prioritário esperando.
7. **Quem decide o estado da câmera** é a leitura de canais. Falha dessa leitura → todos os filhos daquele gravador vão para `desconhecido`, causa "gravador sem resposta" (a máquina de estados ganha uma transição forçada para `desconhecido` com causa). A checagem própria do gravador (ICMP/TCP) decide só o estado do gravador.
