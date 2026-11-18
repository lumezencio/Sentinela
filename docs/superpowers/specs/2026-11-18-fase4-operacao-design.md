# Fase 4: Operação. Projeto

Data: 2026-11-18. Base: `main` em 33b107f (Fases 1 a 3 integradas). Branch: `fase4-operacao`.
Fonte de escopo: `docs/arquitetura/ARQUITETURA.md` §9.4, §12, §13, §14.3 e §18 (linha da Fase 4).

## 1. Intenção

Até a Fase 3, o Sentinela mostra o estado da rede para quem está olhando a tela. A Fase 4 o torna um
produto que dá para deixar instalado num cliente e esquecer:

- **avisa sozinho** quando algo cai, sem encher o celular de mensagens repetidas;
- **fica na parede** da portaria ou da sala de TI, numa TV, sem login de pessoa;
- **resiste a senha vazada** (segundo fator no login);
- **instala, atualiza, faz backup e volta atrás** com um comando, inclusive num Raspberry Pi.

Critério de pronto da arquitetura: instalação limpa num Raspberry Pi em menos de 10 minutos e pipeline de
segurança verde.

## 2. Objetivos, não objetivos, antiobjetivos

**Objetivos**

1. Correlação de quedas: filho de um pai que caiu vira "inalcançável (causa: pai)", não offline próprio.
2. Alertas agrupados, com linha do tempo, reconhecimento, silêncios e janelas de manutenção (aba Alertas).
3. Envio ao Telegram, opcional, com fila, nova tentativa e limite de taxa.
4. Telão `/parede` com emparelhamento pela própria TV, acesso só leitura e revogável.
5. TOTP (segundo fator) com códigos de recuperação.
6. Backup diário automático com 7 cópias, `restore.sh`, `update.sh` com volta automática se falhar.
7. Imagens publicadas para `amd64` e `arm64`, assinadas, com SBOM; instalação por imagem pronta.

**Não objetivos (ficam fora desta fase)**

- WhatsApp, e-mail, SMS ou webhook genérico. O Telegram cobre o caso sem depender de nenhum sistema da
  VPS (em especial do botwhatsapp, que é produção de outro sistema).
- Backup remoto automático (nuvem, pasta de rede). Fica documentado como copiar a pasta de backups.
- Imagem `arm/v7` (Raspberry Pi OS de 32 bits). Só 64 bits.
- Múltiplos clientes num servidor só (decisão já tomada: sem multi-tenant).

**Antiobjetivos (seria um fracasso mesmo funcionando)**

- Uma queda de switch gerar 15 mensagens no Telegram.
- Pisca-pisca de alerta: o estado "suspeito" continua sem gerar alerta.
- Qualquer saída para a internet além do Telegram, e só quando configurado.
- Atualização que deixa o cliente sem sistema e sem caminho de volta.
- O telão mostrar IP, MAC ou credencial numa tela que qualquer visitante vê.
- Qualquer broadcast ou multicast novo (a prova de captura continua valendo e passa a cobrir o Telegram).

## 3. Restrições

- Tudo da Fase 1 a 3 continua valendo: Guarda de rede como único ponto de saída, limitador global, repo
  público só com dados fictícios (`10.99.x`, MACs `02:00:00`), segredos só no `.env` e no cofre Fernet.
- Diretriz §5 do dono (2026-11-18): toda tela nova (Alertas, Telão, TOTP, seções novas de Configurações)
  passa por capturas em 360, 390, 768, 1024, 1280, 1366, 1440 e 1920 px de largura, altura ~900 px,
  olhadas uma a uma; texto nunca truncado no meio; espaçamentos em múltiplos de 4 px.
- Lighthouse 100 nas quatro categorias nas telas novas, como nas fases anteriores; primeira tela ≤ 150 KB
  gzip.
- Migrações Alembic reversíveis (`downgrade` testado).
- Erro genérico ao cliente; auditoria de toda ação de admin nova.

## 4. Abordagens consideradas

**Ordem e corte.** A fase tem duas metades com pouca dependência entre si:

- **4A Alertas e telão:** correlação, alertas, silêncios, aba Alertas, Telegram, `/parede`.
- **4B Operação:** TOTP, backup/restore/update, imagens multi-arquitetura, pipeline de segurança.

| Abordagem | Troca |
|---|---|
| **Um projeto, dois planos em sequência na mesma branch (escolhida)** | um documento só para aprovar; cada plano tem revisão final própria; 4A entrega valor visível primeiro |
| Um plano único com ~18 tarefas | revisão final enorme e tardia; um problema em 4B segura 4A |
| Duas fases separadas (4 e 5) | renumera o roteiro da arquitetura sem ganho |

**Emparelhamento do telão.**

| Abordagem | Troca |
|---|---|
| **Código mostrado na TV, aprovado pelo admin no celular/PC (escolhida)** | ninguém digita nada no controle remoto; é o fluxo das TVs de streaming; a TV só fica esperando |
| Admin gera código e digita na TV | digitar com controle remoto é ruim; o código circula fora da tela |
| Link com token na URL | o token fica no histórico do navegador da TV e em prints |

**Distribuição das imagens.**

| Abordagem | Troca |
|---|---|
| **Imagens prontas no GHCR, construídas no CI para amd64 e arm64 (escolhida)** | instalação no Pi em minutos; assinatura verificável; exige tag de versão |
| Construir na máquina do cliente (`--build`, como hoje) | no Pi leva muito mais de 10 minutos; continua disponível como opção |

O dono delegou o "como" ("a maneira mais profissional que você achar necessário"); as escolhas acima são
minhas.

## 5. 4A: Alertas e telão

### 5.1 Correlação de quedas (§9.4 da arquitetura)

- Novo estado `inalcancavel` na máquina de estados. Um equipamento com `pai_id` que iria para `offline`
  vai para `inalcancavel` se o pai estiver `offline`/`inalcancavel`, ou se o pai cair até 60 s depois
  (reclassificação retroativa do evento). `causa` do evento: `"pai:<id do pai>"`.
- **Câmeras de gravador:** quando o gravador para de responder, as câmeras filhas passam a
  `inalcancavel` (causa `pai:<gravador>`) em vez do `desconhecido` "gravador sem resposta" da Fase 3.
  Os testes da Fase 3 que fixam o comportamento antigo são atualizados. *(Chamada minha: deixa o
  comportamento igual para todo filho.)*
- Quando o pai volta, os filhos inalcançáveis passam a `desconhecido` e são checados na hora (prioridade
  normal do limitador), sem gerar alerta de "voltou" individual.
- Cadeia: pai de pai vale (switch → AP → câmera); profundidade máxima 8, ciclo é recusado na API ao
  definir `pai_id`.
- Visual: cor do "pausado" (`#7A8194`) com ícone de elo partido, em todas as visões (Teia, Organograma,
  Lista) e na legenda. Status nunca só por cor (regra da arquitetura).
- `pai_id` já existe (câmeras de gravador). Esta fase permite defini-lo para qualquer equipamento no
  formulário de edição (campo "Depende de"), com busca por nome. Para câmeras de gravador o campo
  aparece só para leitura, porque a descoberta reescreve esse vínculo.

### 5.2 Alertas

Tabela `alerta`:

| Campo | Uso |
|---|---|
| `id`, `tipo` | `queda`, `volta`, `instavel`, `fonte_falhou` |
| `equipamento_id` | o equipamento principal (o pai, numa queda correlacionada) |
| `afetados` | JSON com ids dos equipamentos incluídos (filhos inalcançáveis ou quedas agrupadas) |
| `aberto_em`, `fechado_em` | `fechado_em` preenchido quando todos voltam |
| `reconhecido_por`, `reconhecido_em` | usuário que reconheceu |
| `silenciado` | se caiu dentro de silêncio ou manutenção (registrado, não enviado) |
| `envio` | `nao_aplica`, `pendente`, `enviado`, `falhou` |

Regras do agrupador:

- **Janela de confirmação de 60 s:** alerta de queda aparece no painel na hora, mas só segue para o
  Telegram depois de 60 s, para a correlação poder anexar os filhos ao alerta do pai (os filhos costumam
  cair antes, porque são checados mais vezes). Se um filho for reclassificado como `inalcancavel`, o
  estado corrigido é republicado no WebSocket. *(Chamada minha: troco 60 s de atraso no celular por uma
  mensagem só por queda de switch.)*
- Gera alerta só em transições para `offline`, `inalcancavel` (anexado ao alerta do pai), `instavel`
  (só se a classe for crítica e durar ≥ 5 min) e de volta a `online` de algo que tinha alerta aberto.
- Quedas sem pai em comum dentro de uma janela de 30 s viram um alerta só: "5 equipamentos caíram".
- Um equipamento que cai e volta em menos de 2 min gera um alerta de queda já fechado e uma única
  mensagem "caiu e voltou (1 min 40 s)", não duas.
- Falha de fonte de descoberta por 3 coletas seguidas gera `fonte_falhou`.
- Retenção: 90 dias, na rotina de limpeza que já existe.

### 5.3 Silêncios e manutenção

Tabela `silencio`: alvo (equipamento ou classe), início, fim, motivo, criado por.

- **Silêncio:** monitora e registra normalmente; só não envia ao Telegram.
- **Manutenção:** usa o `pausado` que já existe, com fim agendado. A manutenção guarda a lista de
  equipamentos que ela mesma pausou; ao terminar, retoma só esses (pausa manual e pausa por estar fora
  das sub-redes continuam como estavam).
- Atalhos na interface: 1 h, 4 h, até amanhã 08:00, personalizado. Fim obrigatório (máximo 30 dias),
  para não haver silêncio esquecido para sempre.

### 5.4 Aba Alertas

```
┌ Alertas ─────────────────────────────────────────── [Abertos ▾] [Classe ▾] ┐
│ ● 14:32  Switch Bloco B caiu · 14 afetados            [Reconhecer] [Silenciar]│
│ ◐ 14:05  Câmera Portaria instável há 6 min                                    │
│ ✓ 13:50  NVR Garagem caiu e voltou (1 min 40 s)              Telegram enviado │
│                                                                               │
│ Silêncios ativos: Classe Câmeras até 18:00 (manutenção do NVR) [Encerrar]     │
└───────────────────────────────────────────────────────────────────────────────┘
```

- Linha do tempo com filtros (abertos, reconhecidos, todos; classe; período). Clicar abre os afetados.
- Contador de abertos no menu. Atualização ao vivo pelo WebSocket (mensagens `alerta`).
- Visualizador vê; só admin reconhece, silencia e cria manutenção.

### 5.5 Telegram

- Configuração em Configurações → Telegram: token do bot (cifrado no cofre, mascarado como as senhas das
  fontes), lista de chats (até 10), botão "Enviar teste", chave "incluir IP nas mensagens" (desligada por
  padrão: minimização de dados).
- Saída: a Guarda ganha **uma** exceção de escopo nomeada, `DestinoExterno("telegram")`, que só aceita
  `api.telegram.org:443` por HTTPS com verificação normal de certificado (CA pública). Nenhum outro host
  externo é aceito. Sem Telegram configurado, nenhum pacote sai para a internet.
- Fila persistente (o próprio `alerta.envio`), uma mensagem por alerta, nova tentativa com espera
  exponencial (30 s até 30 min), desiste após 24 h com `falhou`. Limite: 20 mensagens/min por chat; se a
  fila acumular, junta em "e mais 12 alertas, veja no painel".
- Texto curto em português, sem dado além de nome, classe, horário e duração:
  `🔴 Switch Bloco B caiu às 14:32 — 14 equipamentos afetados`.
- A URL `https://api.telegram.org` é fixa no código. Para a prova de captura o `core` roda em
  `SENTINELA_AMBIENTE=producao`, como hoje: o nome `api.telegram.org` é apontado para o Telegram falso
  com `extra_hosts` do compose de teste, e o certificado dele é aceito por `SENTINELA_CA_ADICIONAL`
  (caminho de um arquivo PEM somado às CAs públicas; vazio por padrão). Quem consegue mudar essa variável
  já controla o `.env` do servidor, então ela não abre porta nova.
- A Guarda aceita para `DestinoExterno("telegram")` o IP que o nome resolver, desde que não seja
  broadcast, multicast, loopback, link-local nem `0.0.0.0/8`.

### 5.6 Telão `/parede`

**Emparelhamento:**

1. Na TV, abrir `https://<servidor>/parede`. Sem token, a página mostra um código de 8 caracteres (sem
   letras ambíguas: `K7MQ-2XDP`) e a instrução "Aprove em Configurações → Telões".
2. O admin digita o código em Configurações → Telões, dá um nome ("TV Portaria") e aprova.
3. A TV, que consulta a cada 5 s só o próprio pedido, recebe um token longo em cookie `HttpOnly`,
   `Secure`, `SameSite=Strict`, escopo `parede`. Tabela `parede` guarda só o hash do token, nome, criado
   em, último acesso e IP do último acesso.
4. Código vale 10 min, uso único, no máximo 20 pedidos pendentes e 10 por IP por hora.
5. Revogar em Configurações → Telões derruba a conexão WebSocket da TV na hora.

**Escopo do token `parede`:** só o snapshot e o WebSocket em modo leitura, com campos reduzidos: nome,
classe, estado, pai. Sem IP, MAC, fabricante, latência por equipamento ou qualquer rota de escrita.

**Tela:**

```
┌──────────────────────────────────────────────────────────────────────────┐
│ 🛡 Sentinela · Condomínio            ● 287 online  ◐ 3  ✕ 6  ⛓ 4   14:32 │
│                                                                          │
│                     (Teia 3D em rotação lenta, tela cheia)               │
│                                                                          │
│ ⚠ Switch Bloco B caiu às 14:32 · 14 afetados   ⚠ Câmera Portaria instável│
└──────────────────────────────────────────────────────────────────────────┘
```

- Teia em modo reduzido desde o início (sem partículas). Se o FPS medido ficar < 30 por 10 s, troca para
  o Organograma em modo telão (letras grandes, rolagem automática lenta).
- Faixa de alertas abertos embaixo, contadores em cima, relógio; nada clicável; cursor escondido.
- Reconexão automática do WebSocket; se perder o servidor por mais de 60 s, mostra "sem conexão com o
  servidor" bem visível (o telão nunca pode mostrar tudo verde por estar congelado).
- **HTTP opcional:** algumas TVs recusam certificado autoassinado. Uma chave em Configurações → Telões
  ("permitir telão sem HTTPS", desligada por padrão) libera o telão na porta 80. Como funciona:
  - o nginx da porta 80 encaminha sempre só `/parede`, `/api/v1/parede/*` e `/ws/parede`, com
    `X-Forwarded-Proto: http` real (hoje é fixo em `https`), CSP própria com `ws:` e **sem HSTS**; o
    resto continua redirecionando para HTTPS. Quem liga e desliga é o `core` (com a chave desligada,
    essas rotas respondem 404 por HTTP);
  - endpoint de WebSocket próprio do telão (`/ws/parede`), que aceita origem `http://` só com a chave
    ligada e só token `parede`;
  - cookie sem `Secure` (o navegador não guardaria), `HttpOnly`, `SameSite=Strict`, `Path=/`, com
    token separado do modo HTTPS e amarrado ao IP da TV. Se o IP mudar (DHCP), a TV pede novo
    emparelhamento; o README recomenda reservar o IP da TV no roteador;
  - a página avisa, discretamente, que a conexão não é cifrada.
  Uma TV que já abriu o site por HTTPS fica presa ao HTTPS pelo HSTS; o README explica.
- Compatibilidade: a página do telão é gerada com alvo de navegador mais antigo (ES2017) para TVs. Alvo
  de teste real: a TV Samsung do dono (Tizen 5.0).

## 6. 4B: Operação

### 6.1 TOTP

- RFC 6238, SHA-1, 6 dígitos, 30 s, tolerância de ±1 janela. Biblioteca `pyotp`; QR gerado no servidor
  em SVG com `segno` (Python puro). Segredo cifrado no cofre (`usuario.totp_cifrado`).
- Ativação: "Proteger minha conta" → QR + chave em texto → confirmar com um código → mostrar **10
  códigos de recuperação** uma única vez (guardados com argon2id; cada um vale uma vez).
- Login: senha certa → segunda tela pede o código; a sessão só nasce depois dele. O token intermediário
  vale 5 min e só serve para essa etapa.
- Com "exigir segundo fator" ligado, admin sem TOTP entra numa sessão restrita que só permite a tela de
  ativação; nada mais funciona até ativar.
- O contador de falhas do bloqueio só é zerado depois do código TOTP aceito (hoje zera ao acertar a
  senha, em `api/auth.py`), para quem tem a senha não poder tentar códigos sem limite.
- Proteções: código já usado na mesma janela é recusado (anti-repetição: guarda o último contador);
  erros de TOTP contam no bloqueio progressivo que já existe; mensagens genéricas.
- Política: opcional para todos; Configurações tem "exigir segundo fator para administradores"
  (desligado por padrão). Admin pode zerar o TOTP de outro usuário (auditado). Se o único admin perder
  o celular e os códigos: `docker compose exec core python -m sentinela.cli totp-zerar <login>` no servidor.

### 6.2 Backup e restauração

- Fuso: variável `SENTINELA_FUSO` no `.env`, padrão `America/Sao_Paulo`, mostrada (só leitura) em
  Configurações; pacote `tzdata` na imagem. O banco continua em UTC; o fuso só vale para horários
  agendados e textos (Telegram, telão, atalhos de silêncio).
- Backup diário dentro do próprio `core`, às 03:00 no fuso configurado, com a API de backup do SQLite
  (cópia consistente com o sistema rodando), compactado, em `/dados/backups/`, permissão 600.
  7 diários + 4 semanais (a arquitetura §14.3 é atualizada; o objetivo 6 conta só os diários). Também roda antes de toda atualização e por botão em Configurações
  (só admin, auditado). Configurações mostra o último backup e o tamanho.
- Cada backup tem um manifesto (versão do esquema Alembic, versão do Sentinela, data, sha256).
- O backup **não** inclui o `.env`. Sem `SENTINELA_CHAVE_CREDENCIAIS`, as senhas das fontes e o token
  do Telegram não abrem. O README e a tela de backup dizem isso e indicam guardar o `.env` em local
  seguro, separado.
- `./restore.sh <arquivo>`: confere sha256 e `PRAGMA integrity_check`, faz backup do banco atual,
  para só o `core`, troca o banco, sobe e espera a saúde. Recusa backup de esquema mais novo que o
  código instalado.
- Copiar backup para fora da máquina: `./backup.sh --exportar <pasta>` (não objetivo automatizar).

### 6.3 Atualização com volta automática

`./update.sh [versão]`:

1. Checa espaço em disco, Docker e saúde atual.
2. Backup (6.2) e marca as imagens atuais com `pre_<timestamp>`.
3. `git fetch` e checkout da tag pedida (padrão: a última `v*`). Confere a assinatura das imagens novas
   com `cosign verify` quando o `cosign` estiver instalado; sem ele, avisa e confere o digest publicado.
4. `docker compose pull` da versão; troca `core` primeiro (migrações rodam no início, como hoje), espera
   saúde por até 120 s, depois `web`.
5. Falhou em qualquer passo depois do 2: volta as imagens `pre_<ts>`, restaura o backup do passo 2 (o
   esquema pode ter mudado) e o checkout anterior, sobe e confere a saúde. Mostra o que falhou.
6. Guarda as 3 marcações `pre_*` mais recentes; apaga só as suas, nunca outras imagens.

**Instalações antigas e modo local:** o `.env` ganha `IMAGENS=publicadas|locais`. Instalações das
Fases 1 a 3 (construídas com `--build`, sem `VERSAO`) são tratadas como `locais`: o `update.sh` faz
checkout da tag e reconstrói na máquina, com o mesmo backup e a mesma volta automática, e oferece
`--imagens-publicadas` para migrar. Instalações novas nascem `publicadas`.

Nunca usa `docker compose down -v`, `prune` nem mexe em outro projeto compose.

### 6.4 Imagens multi-arquitetura e pipeline

- Workflow `release.yml` em tag `v*`: `buildx` para `linux/amd64` e `linux/arm64`, push no GHCR
  (`ghcr.io/lumezencio/sentinela-core` e `-web`), SBOM (formato SPDX) anexado, assinatura `cosign`
  sem chave (OIDC do GitHub), `trivy` bloqueando HIGH/CRITICAL com correção disponível.
- Teste da imagem `arm64` no CI sob emulação: sobe o compose da versão e confere `/api/v1/saude` e o
  login (não mede desempenho).
- `install.sh` passa a usar as imagens publicadas da versão fixada no `.env` (`VERSAO=`); `--build`
  mantém a construção local. Detecta a arquitetura e recusa `armv7` com mensagem clara.
- Pipeline de segurança (CI em todo push): o que já existe (testes, `pip-audit`, gitleaks, trivy,
  captura) + `npm audit --omit=dev`, CodeQL (Python e JavaScript) e Dependabot para pip, npm,
  Actions e Docker.
- Versão: começa em `v0.4.0` ao fim desta fase (Fases 1 a 3 = 0.1 a 0.3, sem tags retroativas).

### 6.5 Raspberry Pi

- Requisitos documentados: Pi 4 ou 5, 2 GB+, Raspberry Pi OS 64 bits, Docker instalado pelo script
  oficial da Docker (o README mostra o comando; o `install.sh` não instala Docker sozinho).
- Meta de < 10 min contados a partir de "Docker instalado" até "tela de login aberta".
- Sem Pi real disponível ao construtor: a meta é verificada no CI sob emulação só quanto a funcionar;
  o tempo real fica como item de aceite para o dono medir no hardware dele.

## 7. Prova de zero broadcast

A cena de captura (`testes-rede/`) ganha um Telegram falso na rede de teste. Com Telegram configurado,
a prova continua exigindo zero broadcast/multicast e passa a aceitar tráfego unicast só para o Telegram
falso e para os destinos já autorizados. A emissão de um alerta e do telão não pode criar destino novo.

## 8. Dados (migração 0004)

Novas tabelas `alerta`, `silencio`, `parede`, `parede_pedido`, `codigo_recuperacao`; colunas
`usuario.totp_cifrado`, `usuario.totp_ultimo_contador`; novo valor de estado `inalcancavel`.
`downgrade` remove tudo e converte `inalcancavel` em `offline`.

## 9. Testes e aceite

- Núcleo: correlação (cadeia, janela de 60 s, retroativo, ciclo recusado), agrupador (janela de 30 s,
  caiu-e-voltou, silêncio), fila do Telegram (nova tentativa, limite, desistência, sem saída sem
  configuração, Guarda recusando host externo diferente), emparelhamento (expiração, uso único, limites,
  revogação derrubando o WS, escopo sem IP/MAC), TOTP (janela, repetição, recuperação, bloqueio),
  backup/restore (integridade, esquema mais novo recusado), migração ida e volta.
- Front: testes de unidade das telas novas; smoke Playwright da aba Alertas, do fluxo de
  emparelhamento e do login com TOTP.
- Scripts: `update.sh` testado no CI com uma versão que falha a saúde de propósito, provando a volta
  automática (banco e imagem); `restore.sh` com arquivo corrompido recusado.
- Capturas nas 8 larguras (diretriz §5) das telas novas, Lighthouse 100, prova de captura verde.
- Demo: alertas simulados (uma queda correlacionada de switch, um caiu-e-voltou) e um telão já emparelhado.

## 10. Riscos

| Risco | Mitigação |
|---|---|
| Navegador da TV não roda a Teia | queda automática para o Organograma; alvo ES2017; teste na TV do dono |
| Telegram bloqueado na rede do cliente | alerta continua no painel e no telão; Configurações mostra o último erro de envio |
| Atualização com migração que não volta | backup antes e restauração no rollback, não `downgrade` |
| Emulação arm64 lenta no CI | job separado, só em tag e manual |
| `.env` perdido junto com a máquina | aviso explícito na tela de backup e no README |

## 11. Deixado ao construtor

Nomes internos de módulos e funções, formato exato das mensagens WS novas (seguindo o padrão
`tipo` + dados), layout fino das telas dentro da linguagem visual existente, estrutura dos jobs de CI.
