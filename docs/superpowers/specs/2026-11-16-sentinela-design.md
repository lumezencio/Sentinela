# Sentinela — documento de projeto

Data: 2026-11-16 · Repositório: https://github.com/lumezencio/Sentinela (público) · Pasta local: `C:\Projetos\sentinela`

## 1. Intenção

O dono quer um sistema próprio, bonito e leve, que mostre de relance **tudo o que está ligado a uma rede local** — câmeras, gravadores, access points Wi‑Fi, controles de acesso faciais, switches, roteadores, impressoras e o resto — separado por classe, com o estado online/offline de cada equipamento.

A imagem central é uma **teia 3D**: o servidor Sentinela no centro, um nó-mãe por classe ligado a ele, e os equipamentos daquela classe orbitando o nó-mãe como esferas. Verde = online; vermelho pulsando = caiu. Palavras do dono: "lindo, quântico, 3D, de causar inveja, sem causar lentidão na rede e sem broadcast".

Não é produto comercial: o dono não quer vender. O código é público.

## 2. Objetivos, não-objetivos e anti-objetivos

**Objetivos (v1)**
- Instalar dentro da rede local, num único host (mini PC, VM ou Raspberry Pi 4/5).
- Descobrir equipamentos automaticamente **sem gerar broadcast nem multicast**.
- Classificar cada equipamento numa classe, com confiança, e permitir correção manual.
- Monitorar continuamente e mostrar online / instável / offline ao vivo.
- Duas visões: **Teia 3D** e **Organograma** (2D, uma árvore por classe), mais lista/tabela.
- Histórico de quedas por equipamento e alertas por Telegram.
- Modo painel de parede (TV/telão): tela cheia, rotação automática lenta, sem interação.

**Não-objetivos (v1)**
- Ver vídeo de câmeras (não é NVR).
- Configurar equipamentos (só leitura).
- Vários locais num painel único, acesso pela nuvem, multi-tenant, licença comercial.
- Alerta por WhatsApp (pode vir depois).

**Anti-objetivos (falhou mesmo que "funcione")**
- Gerar broadcast/multicast ou tráfego perceptível na rede do cliente.
- Interface que engasga em notebook modesto ou em TV.
- Qualquer dado real de cliente (IP, MAC, nome, print) chegar ao repositório público.
- Exigir abrir porta no roteador ou expor o Sentinela à internet.

## 3. Restrições

- Repositório **público**, licença **AGPL‑3.0**. Nada de segredo, `.env`, dump, captura de rede ou dado de cliente no git; `gitleaks` em pre-commit e no CI.
- Roda só na LAN; não depende da VPS compartilhada e não toca nenhum sistema em produção.
- Stack do padrão do escritório: Python 3.12+, FastAPI, Pydantic v2, Docker Compose, pytest/ruff/bandit/pip-audit.
- Orçamento de interface do padrão: primeira tela ≤ 150 KB gzip, só `transform`/`opacity` animados, contraste AA, `prefers-reduced-motion`.

## 4. Abordagens consideradas

| | Abordagem | Troca | Decisão |
|---|---|---|---|
| A | Agente em cada rede + painel central na VPS | Visão de vários clientes; duas peças; dependência da VPS | Descartada — dono escolheu instalação local e não vai vender |
| **B** | **Tudo instalado na rede do cliente** | Simples, funciona sem internet; cada instalação é isolada | **Escolhida pelo dono** |
| C | VPS entrando em cada rede por VPN | Um servidor só; túnel da VPS compartilhada para dentro do cliente | Descartada — risco de segurança e conflito com as regras da VPS |

Também descartado: adaptar Zabbix/LibreNMS/Uptime Kuma. Nenhum entrega a teia por classe nem a descoberta sem broadcast; adaptar custaria mais que construir.

## 5. Decisões do dono

- Sistema próprio, backend Python + front com 3d-force-graph, WebSocket ao vivo, alertas e histórico.
- Instalado na rede local; descobre e classifica sozinho; servidor no centro da teia.
- Nome **Sentinela**; pasta `C:\Projetos\sentinela`; repositório público `lumezencio/Sentinela`.
- Não será vendido.

## 6. Arquitetura

Um único `docker compose` com dois serviços:

```
┌──────────────── host na LAN ────────────────┐
│  sentinela-web (nginx, HTTPS)  :443 → LAN    │
│        │ estático + proxy /api /ws           │
│  sentinela-core (FastAPI + asyncio)          │
│     ├─ API REST + WebSocket                  │
│     ├─ Descoberta (fontes passivas)          │
│     ├─ Classificador                         │
│     ├─ Agendador de checagens (limitado)     │
│     ├─ Alertas (Telegram, saída HTTPS)       │
│     └─ SQLite (WAL) em volume próprio        │
└──────────────────────────────────────────────┘
```

- **Banco: SQLite em modo WAL**, não PostgreSQL. Justificativa: instalação de um só local, centenas a poucos milhares de equipamentos, um único processo escritor; elimina um container, ~200 MB de RAM e manutenção. A camada de acesso é SQLAlchemy 2.0 + Alembic, então migrar para PostgreSQL depois não reescreve o código.
- **Rede do container:** bridge comum (o host faz NAT para a LAN). Sem `network_mode: host`. ICMP por socket não privilegiado (`icmplib`, `privileged=False`, com `net.ipv4.ping_group_range` no container); se o host não permitir, `cap_add: [NET_RAW]` apenas no `core`.
- Hardening do padrão: usuário não-root, `read_only`, `cap_drop: ALL`, `no-new-privileges`, limites de memória/CPU, rotação de log, healthcheck.
- Imagens multi-arquitetura (amd64 e arm64).

## 7. Descoberta sem broadcast

Princípio: **perguntar a quem já sabe**, em vez de gritar na rede. Toda fonte é unicast para um endereço conhecido.

1. **MikroTik RouterOS (fonte principal)** — API (porta 8728/8729, preferir TLS) com usuário somente-leitura criado pelo técnico. Lê `/ip/arp`, `/ip/dhcp-server/lease`, `/ip/neighbor` (LLDP/MNDP que o próprio roteador já coletou) e a tabela de registro Wi‑Fi (`/interface/wireless/registration-table` ou `/interface/wifi/registration-table`, conforme versão do RouterOS).
2. **Qualquer roteador/switch gerenciável via SNMP v2c/v3** — lê a tabela ARP padrão (`IP-MIB::ipNetToPhysicalTable`, com fallback `ipNetToMediaTable`) e, em switches, a tabela de MAC (`BRIDGE-MIB`/`Q-BRIDGE-MIB`) e LLDP (`LLDP-MIB`) quando houver.
3. **Importação manual** — cadastro na tela e importação de CSV.
4. **Varredura lenta (opcional, desligada por padrão)** — percorre uma sub-rede declarada, um IP por vez, ritmo padrão 2 IPs/s, só ICMP e TCP connect. Aviso explícito na tela: cada IP inédito provoca um pedido ARP do próprio host (é como o IPv4 funciona). Nunca usa endereço de rede, de broadcast nem multicast.

**Proibido no código** (com teste automatizado): enviar para `255.255.255.255`, para o broadcast da sub-rede, para `224.0.0.0/4`, WS-Discovery/ONVIF multicast, mDNS, SSDP, NetBIOS, ARP scan ativo. Toda sub-rede alvo tem de ser privada (RFC 1918) e declarada pelo administrador.

Descobertas são **sugestões**: entram em "Novos equipamentos" e só passam a ser monitoradas quando o administrador aprova (individualmente ou "aprovar todos").

## 8. Classificação

Classes padrão (editáveis, com ícone e cor):
Servidor Sentinela (centro) · Roteadores/Firewall · Switches · Wi‑Fi (APs) · Câmeras · Gravadores (NVR/DVR) · Controle de acesso/Faciais · Servidores · Computadores · Impressoras · IoT/Automação · Desconhecidos.

Sinais, cada um somando pontos de confiança:
- **Fabricante pelo MAC** (base OUI da IEEE embutida, offline): Hikvision, Dahua, Intelbras, Control iD, ZKTeco, Ubiquiti, MikroTik, TP-Link etc.
- **Origem**: cliente Wi‑Fi visto na tabela de registro → Computador/IoT; vizinho LLDP com capacidade "bridge" → Switch.
- **Portas abertas** (checagem TCP só nas portas da lista, no IP já conhecido): 554 (RTSP) → câmera/gravador; 8000, 37777 → Hikvision/Dahua; 4370 → ZKTeco; 9100/631 → impressora.
- **SNMP** `sysObjectID`/`sysDescr`, quando houver comunidade configurada.
- **HTTP** título e cabeçalho `Server` da página do aparelho.
- **ONVIF unicast** `GetDeviceInformation` no IP conhecido (nunca WS-Discovery).

Regras ficam num arquivo de dados versionado (`rules/*.yaml`, carregado com `safe_load`). Classe escolhida = maior pontuação; abaixo do limiar vai para "Desconhecidos". Correção manual sempre vence e é preservada nas redescobertas.

## 9. Monitoramento

- Por equipamento, uma checagem principal (padrão: ICMP; alternativa: TCP numa porta, HTTP status, SNMP `sysUpTime`).
- Intervalo padrão 30 s com variação aleatória de ±20% para não sincronizar rajadas.
- **Teto global de pacotes por segundo** (padrão 20/s), aplicado por um limitador único; o agendador nunca o ultrapassa, mesmo com milhares de equipamentos — ele alonga os intervalos.
- Estados: **online**; **instável** (latência acima do limite ou perda parcial); **offline** só depois de 3 falhas seguidas (sem pisca-pisca); **pausado** (manutenção).
- Mudança de estado gera evento (histórico) e notificação ao vivo por WebSocket.
- Amostras de latência: brutas por 48 h, médias de 5 min por 30 dias, depois descartadas.
- Topologia (quem está ligado em qual switch/porta) vem do LLDP/tabela MAC quando disponível; senão o equipamento liga direto ao nó da classe.

## 10. Interface

Front estático servido pelo nginx; JS sem framework pesado (HTML + Alpine.js/HTMX para telas comuns). Tema escuro "quântico" como padrão, tema claro disponível, cores do padrão do escritório.

**Teia 3D** (aba principal ao abrir; código carregado sob demanda, fora do orçamento da primeira tela)
- `3d-force-graph` (Three.js). Servidor = esfera central com brilho; nós-mãe por classe em anel ao redor; equipamentos orbitam o nó-mãe da classe.
- Esfera verde suave = online; âmbar = instável; vermelha pulsando (escala/opacidade) = offline; cinza = pausado.
- Partículas correndo nos fios em direção ao servidor indicam checagem viva.
- Girar, zoom, clicar em classe isola a teia daquela classe; clicar em equipamento abre painel lateral de vidro com IP, MAC, fabricante, classe, tempo no ar, latência e histórico.
- Desempenho: até ~1.000 nós a 60 fps em notebook comum; acima disso agrupa por classe e só expande ao clicar; renderização pausa com aba oculta; sem WebGL → cai automaticamente no Organograma.

**Organograma 2D** — uma árvore por classe (Classe → Switch/AP de origem quando conhecido → Equipamento), com pontos de status; leve, funciona em celular.

**Lista** — tabela filtrável/ordenável; vira cartões no celular.

**Painel de parede** — `/parede`: Teia em tela cheia, rotação lenta, contadores por classe e faixa de alertas; sem login após emparelhar a TV com código de uso único (somente leitura).

**Outras telas** — Novos equipamentos (aprovar/corrigir classe), Fontes de descoberta (MikroTik/SNMP), Alertas, Usuários, Configurações (ritmo, limites).

## 11. Alertas

- Telegram (bot do próprio dono; saída HTTPS única para `api.telegram.org`). Mensagem: classe, nome, IP, horário, duração da queda quando volta.
- Agrupamento: várias quedas em 60 s viram uma mensagem ("12 câmeras caíram — provável switch X").
- Silêncio por equipamento/classe e janela de manutenção.

## 12. Segurança

- Login local com senha **argon2id**; papéis **admin** e **visualizador**; TOTP opcional para admin; bloqueio progressivo por usuário e IP.
- HTTPS por padrão com certificado autoassinado gerado na instalação (ou certificado do cliente).
- Credenciais de MikroTik/SNMP/Telegram cifradas no banco (Fernet, chave em variável de ambiente fora do volume do banco). Nunca aparecem em log nem na API (sempre mascaradas).
- Cabeçalhos do padrão (CSP, HSTS, nosniff, frame-ancestors none), docs OpenAPI desligados em produção.
- Nenhuma telemetria. Única saída para a internet: Telegram, se configurado.
- Repositório público: `.gitignore` rigoroso, `gitleaks` no pre-commit e CI, dados de exemplo sempre sintéticos (`10.99.x.x`, MACs fictícios).

## 13. Testes

- Unitários: classificador (tabela de casos), limitador de taxa, máquina de estados online/instável/offline, filtro anti-broadcast.
- Teste que falha se qualquer módulo tentar enviar para broadcast/multicast.
- Simuladores: RouterOS API e SNMP falsos para descoberta; **modo demonstração** com rede sintética de ~300 equipamentos (serve também para prints do README).
- Front: verificação nos tamanhos 360/768/1280/1920, teclado, movimento reduzido, Lighthouse ≥ 90 nas telas 2D.

## 14. Instalação

`git clone` → `cp .env.example .env` → `./install.sh` (gera chaves e certificado) → `docker compose up -d` → abrir `https://<ip-do-host>` → assistente inicial (criar admin, cadastrar MikroTik/SNMP, declarar sub-redes).

## 15. Chamadas minhas (o dono pode corrigir)

- SQLite em vez de PostgreSQL (justificativa no §6).
- Suportar MikroTik **e** SNMP genérico; varredura lenta só opcional.
- AGPL‑3.0.
- Telegram como único canal de alerta na v1.
- Descobertas precisam de aprovação antes de serem monitoradas.
- Teto padrão de 20 pacotes/s e intervalo de 30 s.
- Tema escuro como padrão.
- **Prioridade por classe**: Câmeras, Gravadores, Controle de acesso, Roteadores e Switches checados a cada 15 s; demais a cada 60 s. O agendador mostra na tela o "tempo máximo de detecção" calculado; se passar de 2 min, sugere subir o teto de pacotes/s (ajustável até 100/s).
- **Telegram**: um bot/token por instalação, nunca o mesmo token em vários locais; rotação pela tela de configurações.
- **Atualização**: `git pull` + `docker compose up -d --build`, com script `update.sh` que faz backup do SQLite antes.
- **Redes-alvo desconhecidas**: suportar MikroTik (RouterOS v6 e v7), SNMP genérico e, quando nenhuma fonte passiva estiver configurada, o assistente inicial oferece a varredura lenta como caminho principal.
- **Câmeras atrás de NVR/DVR**: entram na v1 por uma fonte "Gravador" que consulta o próprio NVR (Hikvision ISAPI; Dahua/Intelbras CGI) com credencial do gravador, gerando a topologia câmera → gravador.
- **Painel de parede em TV**: TVs com navegador limitado (ex.: Samsung Tizen 5.0, WebGL fraco). `/parede` usa uma Teia 3D reduzida (sem partículas, menos nós) e cai sozinha no Organograma se o FPS medido ficar abaixo de 30. Para o certificado, o instalador gera uma **CA local** que pode ser instalada nos dispositivos; e `/parede` também pode ser servida por HTTP só na LAN, em modo somente leitura com código de emparelhamento, para TVs que não aceitam CA.
- **Ordem de entrega**: Fase 1 núcleo (cadastro manual/CSV, monitoramento, lista, WebSocket) + modo demonstração; Fase 2 Teia 3D e Organograma; Fase 3 descoberta MikroTik/SNMP e classificador; Fase 4 alertas, painel de parede, endurecimento e instalador. Cada fase termina utilizável.

## 16. Deixado para quem construir

Estrutura interna de pastas e módulos, esquema exato das tabelas, formato das regras YAML, bibliotecas específicas de SNMP (`pysnmp`) e RouterOS (`librouteros`) — escolher versões mantidas e conferir na documentação —, detalhes visuais finos dentro do padrão de cores e do orçamento de desempenho.
