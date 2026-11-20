# 🛡️ Sentinela

Monitor de equipamentos de rede local — câmeras, gravadores, access points Wi‑Fi, controles de acesso faciais, switches e o que mais estiver na rede — exibidos numa **teia 3D** por classe, com o servidor no centro e o estado online/offline de cada equipamento ao vivo.

**Sem broadcast. Sem lentidão. Sem nuvem.**

> Status: **Fases 1, 2, 3, 4A e 4B concluídas, versão 0.4.1** (núcleo de monitoramento, lista ao
> vivo, Docker, Teia 3D, Organograma, descoberta automática com classificador, alertas por Telegram,
> telão para TV, segundo fator TOTP, backup e restauração, atualização com volta automática e
> imagens multi-arquitetura assinadas). Veja
> [`docs/arquitetura/ARQUITETURA.md`](docs/arquitetura/ARQUITETURA.md).

## Como funciona

- **Descobre perguntando a quem já sabe:** lê as tabelas ARP, DHCP e Wi‑Fi do roteador (MikroTik ou SNMP), a tabela de MAC dos switches e a lista de câmeras dos gravadores. Nenhum broadcast, nenhum multicast.
- **Classifica sozinho:** fabricante pelo MAC, nome DHCP, dados SNMP/LLDP e do gravador; portas conhecidas e página web só quando você autoriza. Você aprova e corrige.
- **Monitora com educação:** checagens unicast com teto global de pacotes por segundo; câmeras e controles de acesso checados com mais frequência.
- **Mostra bonito e leve:** Teia 3D, Organograma por classe, lista, modo telão para TV, alertas por Telegram.
- **Um único processo:** o core roda com um só worker do uvicorn (o login em duas etapas e os limites de tentativas ficam em memória); `WEB_CONCURRENCY` maior que 1 faz o core recusar subir.

## Instalação

Requisitos: **Docker Engine 25 ou mais novo** e **Docker Compose 2.24.4 ou mais novo**
(o instalador confere e recusa versões antigas), `openssl` e `bash`.

```bash
./install.sh          # instalação real: baixa as imagens publicadas e verificadas
./install.sh --build  # constrói as imagens neste computador a partir do código
./install.sh --demo   # demonstração com 300 equipamentos simulados (volume próprio)
```

Por padrão o instalador usa as **imagens publicadas** (`ghcr.io/lumezencio/sentinela-core` e
`sentinela-web`, `linux/amd64` e `linux/arm64`) na versão de `core/pyproject.toml`, conferidas com
`cosign` ou com o `digests.txt` do release (veja [Imagens e verificação](#imagens-e-verificação)).
Com `--build`, as imagens são construídas aqui. O `.env` guarda a escolha em `IMAGENS=publicadas|locais`
e a versão em `VERSAO=X.Y.Z`; um `.env` das Fases 1 a 3 (sem `IMAGENS`) vale como `locais`.
Raspberry Pi OS de **32 bits (armv7) não é suportado**: o instalador recusa com mensagem clara
(veja [Raspberry Pi](#raspberry-pi)). `WEB_CONCURRENCY` tem de ficar em 1: o core recusa subir com mais.

O instalador gera o `.env` (só se não existir), uma CA local e o certificado do host em
`certs/`, sobe os containers e mostra a URL e o caminho da CA para instalar nos dispositivos.
Em Linux sem root e sem `setfacl`, ele para e pede `sudo ./install.sh`, para não deixar a
chave TLS legível por todos.

O certificado já cobre `localhost`, `127.0.0.1` e os IPs privados do host. Para acessar
também por nome, passe os nomes DNS em `SENTINELA_NOMES` (separados por vírgula) e, para IPs
extras, `SENTINELA_IPS` (separados por espaço):

```bash
SENTINELA_NOMES="sentinela.local,monitor.empresa.lan" ./install.sh
```

O certificado só é gerado na primeira vez; para incluir nomes depois, apague `certs/web/` e
rode o instalador de novo.

### Primeiros passos (instalação real)

1. Crie o administrador:

   ```bash
   docker compose run --rm core python -m sentinela.cli criar-admin --login <seu-login>
   ```

2. Declare as sub-redes privadas que o Sentinela pode checar. Sem nenhuma, nada é
   monitorado e todo cadastro é recusado (a Guarda só deixa sair pacote para dentro delas).
   - **Pela tela** (recomendado com o Sentinela no ar): entre como administrador e use o botão
     **Sub-redes** na lista. Vale na hora.
   - **Pela CLI** (instalação, ou sem acesso à tela):

     ```bash
     docker compose run --rm core python -m sentinela.cli sub-rede adicionar 10.99.0.0/24
     docker compose run --rm core python -m sentinela.cli sub-rede listar
     docker compose run --rm core python -m sentinela.cli sub-rede remover 10.99.0.0/24
     docker compose restart core   # com o Sentinela no ar, aplica a mudança da CLI
     ```

   As regras são as mesmas nos dois caminhos: só redes privadas (RFC 1918), de /16 a /30,
   e a mudança fica na auditoria. Ao remover uma sub-rede, os equipamentos dela ficam pausados;
   ao adicioná-la de volta, eles voltam sozinhos (os pausados à mão continuam pausados).

3. Cadastre os equipamentos pela tela (**Novo equipamento** ou **Importar CSV**).

> **Docker Desktop (Windows/macOS):** o encaminhamento de portas do Docker Desktop faz
> todos os clientes chegarem ao nginx com o mesmo IP (o gateway da rede interna). Com isso,
> o limite de tentativas e o bloqueio por IP do login valem para todos juntos. O bloqueio
> por login continua individual. Em Linux o IP real do cliente é preservado.

## Segundo fator (TOTP)

O segundo fator é opcional e **por usuário** (RFC 6238: SHA-1, 6 dígitos, passo de 30 s, tolerância de
uma janela para cada lado), compatível com qualquer aplicativo autenticador. Um código já usado é
recusado, e os erros contam no mesmo bloqueio progressivo do login (a contagem só zera depois do
código aceito).

- **Ativar:** entre, abra a página **Segurança** (`seguranca.html`), peça a ativação, leia o QR (ou
  digite a chave de 32 caracteres) e confirme com o primeiro código. O segredo fica cifrado no banco.
- **Códigos de recuperação:** a ativação mostra **10 códigos, uma única vez**. Guarde-os fora do
  computador; cada um vale uma vez e só existe o hash no banco.
- **Exigir para administradores:** em **Configurações → Segurança**, a chave "Exigir segundo fator
  para administradores" fica **desligada por padrão**. Ligada, o administrador que ainda não ativou o
  TOTP entra numa sessão **restrita**: só consegue ativar o segundo fator, e todo o resto (inclusive
  o tempo real) recusa até lá.
- **Perdeu o aparelho e os códigos?** Outro administrador usa **Zerar segundo fator** na lista de
  usuários em **Configurações → Segurança** (auditado; as sessões do usuário caem). Sem outro
  administrador, use a CLI no servidor:

  ```bash
  docker compose exec core python -m sentinela.cli totp-zerar <login>
  ```

## Backup e restauração

O core faz sozinho um backup do banco **todo dia às 03:00** (fuso de `SENTINELA_FUSO`), pela API de
backup do SQLite (com o Sentinela no ar), compactado, em `/dados/backups/` dentro do volume (diretório
`0700`, arquivos `0600`), com manifesto (esquema, versão, data e sha256). Ficam **7 diários e 4
semanais**; os backups `manual`, `atualizacao` e `pre-restore` são rotacionados por tipo. O cartão
**Backup** em Configurações lista e cria backups.

> **ATENÇÃO: o backup NÃO inclui o `.env`.** Sem a `SENTINELA_CHAVE_CREDENCIAIS` original, as senhas das
> fontes de descoberta e o token do Telegram **não abrem** (aparecem como "credencial ilegível,
> informe de novo"). **Guarde uma cópia do `.env` fora do computador**, junto com os backups.

```bash
./backup.sh                    # backup manual no volume; imprime o nome do arquivo
./backup.sh --exportar PASTA   # cria o backup e copia todos para PASTA (0700/0600): leve para fora da máquina
./restore.sh ARQUIVO.tar.gz    # restaura um arquivo do host (pede confirmação; --sim pula)
./restore.sh --do-volume NOME  # restaura um arquivo que já está em /dados/backups
```

O `restore.sh` confere o arquivo (sha256, integridade e esquema; backup de esquema mais novo que o
código instalado é recusado), para **só** o `core`, guarda o banco atual como `pre-restore`, restaura,
sobe o core e espera a saúde; se a saúde falhar, devolve o banco anterior.

## Atualização

```bash
./update.sh                          # para a versão publicada mais recente
./update.sh v0.4.0                   # para uma versão específica
./update.sh --imagens-publicadas     # migra uma instalação local (Fases 1 a 3) para as imagens publicadas
```

O `update.sh` confere tudo antes de mexer (árvore git limpa, Docker, espaço, saúde, tag e digests),
marca as imagens em uso como `pre_<data>`, faz um backup do tipo `atualizacao`, troca o `core` (espera a
saúde por até 120 s) e depois o `web`. **Se qualquer passo depois do backup falhar, volta sozinho:**
restaura o backup, o checkout anterior e as imagens `pre_<data>` e confere a saúde (os dados gravados
depois do backup são descartados). Nunca faz `alembic downgrade`. Interrompido com Ctrl+C depois da
primeira troca, ele só relata o estado e imprime o comando exato da volta manual.

- Instalações das Fases 1 a 3 (`.env` sem `IMAGENS`) valem como `locais`: o `update.sh` reconstrói as
  imagens a partir do código da tag. `--imagens-publicadas` migra para as publicadas (grava `IMAGENS` e
  `VERSAO` no `.env`).
- Versão menor que a instalada é recusada, a menos que se passe `--permitir-voltar-versao`.
- Guarda as 3 marcações `pre_*` mais recentes e apaga **somente** as que ele mesmo criou.
- **Nunca use `docker compose down -v`**: o `-v` apaga o volume com o banco e os backups. Para parar
  sem perder dados, use `docker compose stop` ou `docker compose down` (sem `-v`).

## Imagens e verificação

Cada versão publica duas imagens multi-arquitetura (`linux/amd64` e `linux/arm64`) no GHCR, com as tags
`X.Y.Z` (sem o `v`) e `latest`. Antes de ganhar essas tags, a imagem candidata (`rc-<run>`) passa
pelo `trivy` (HIGH e CRITICAL corrigíveis reprovam) nas duas arquiteturas e por um teste de subida em
arm64 (emulado) com o `install.sh` real, pelo digest aprovado. **Só se os dois passarem** nasce a tag
`X.Y.Z`, com o SBOM (SPDX) e a assinatura **sem chave** do `cosign` (identidade OIDC do GitHub); o
`latest` anda por último. Se o `trivy` ou o teste arm64 falharem, não existe `X.Y.Z` nem assinatura:
sobra só a candidata `rc-<run>` no GHCR (a limpeza dela é manual).

```bash
cosign verify ghcr.io/lumezencio/sentinela-core:0.4.0 \
  --certificate-identity-regexp '^https://github.com/lumezencio/Sentinela/\.github/workflows/release\.yml@refs/tags/v[0-9]+\.[0-9]+\.[0-9]+$' \
  --certificate-oidc-issuer https://token.actions.githubusercontent.com
```

O mesmo vale para `sentinela-web` (`cosign` 3.x ou mais novo). O `install.sh` e o `update.sh` fazem essa
conferência sozinhos; **sem `cosign` instalado**, usam o `digests.txt` anexado ao release (um digest
por imagem, o do índice multi-arquitetura). O SBOM e os digests ficam anexados ao release.

**Publicar uma versão (dono do repositório):** a partir da `main` com tudo integrado,
`git tag v0.4.0 && git push origin v0.4.0`. O `release.yml` confere a tag contra o `version` de
`core/pyproject.toml`, exige que a tag esteja na `main`, constrói, varre, assina e promove. **Os
pacotes do GHCR nascem privados:** depois da primeira publicação, torne `sentinela-core` e
`sentinela-web` públicos (GitHub → Packages → Package settings), senão ninguém baixa sem login.

## Raspberry Pi

Funciona em **Raspberry Pi 4 ou 5 com 2 GB ou mais**, com **Raspberry Pi OS de 64 bits** (as imagens
são `arm64`; 32 bits/armv7 não é suportado e o instalador recusa). Instale o Docker pelo script
oficial e rode o instalador:

```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker "$USER"   # saia e entre de novo
git clone https://github.com/lumezencio/Sentinela.git && cd Sentinela
./install.sh
```

A meta é menos de **10 minutos** entre "Docker instalado" e a "tela de login" (a maior parte é o
download das imagens). Esse tempo **ainda não foi medido num Raspberry Pi real**; o CI só confirma que
a imagem `arm64` (emulada) sobe e fica saudável.

## Rodar a demonstração

A demonstração sobe o Sentinela com 300 equipamentos simulados (10.99.0.0/16), com estados
ao vivo na lista. Nenhum pacote sai para a sua rede.

Pré-requisitos: os mesmos da [Instalação](#instalação) (Docker Engine 25+, Compose 2.24.4+,
`openssl` e `bash`; no Windows, o Git Bash).

```bash
./install.sh --demo
```

1. Ao final, o instalador mostra a URL: **https://localhost** (ou a porta configurada em
   `SENTINELA_PORTA_HTTPS` no `.env`; por exemplo, https://localhost:8443).
2. A senha do administrador é **impressa uma única vez**, na primeira subida. Anote-a, pois ela não
   será mostrada de novo.
3. O navegador avisa que o certificado não é confiável até que a CA local seja instalada.
   Importe `certs/ca/sentinela-ca.crt` nas autoridades raiz confiáveis do sistema ou do
   navegador para remover o aviso.

Para parar a demonstração **sem apagar os dados** (não use `-v`):

```bash
docker compose -f docker-compose.yml -f docker-compose.demo.yml down
```

## Descoberta automática

O Sentinela descobre os equipamentos **perguntando a quem já sabe**, sem broadcast nem
multicast: ele lê as tabelas do roteador, dos switches e dos gravadores e põe cada aparelho
novo na aba **Novos**, com uma classe sugerida e o **porquê** (por exemplo, "Fabricante
Hikvision +30 câmera"). Nada é monitorado antes de você aprovar.

### Fontes suportadas

Cadastre em **Configurações → Fontes** (só administrador). A senha vai cifrada no banco (chave
`SENTINELA_CHAVE_CREDENCIAIS` do `.env`, gerada pelo instalador) e nunca volta para a tela.

| Fonte | Conexão | O que lê |
|---|---|---|
| **MikroTik** (RouterOS v6 e v7) | API por TLS, porta 8729 (`api-ssl`) | ARP, leases DHCP, vizinhos (`/ip/neighbor`), clientes Wi‑Fi |
| **SNMP** (roteador ou switch de qualquer marca) | v2c ou v3 (authPriv), porta 161 | tabela ARP, tabela de MAC (FDB), LLDP, nome e descrição |
| **Gravador Hikvision** | ISAPI por HTTP/HTTPS, Digest | dados do gravador e câmeras de cada canal, com o estado |
| **Gravador Dahua/Intelbras** | CGI por HTTP/HTTPS, Digest | idem |

Cada fonte tem **Testar** (conecta e mostra identidade, versão e avisos), **Coletar agora**
(no máximo uma vez a cada 30 s) e coleta automática a cada 10 minutos (5 a 60). A falha de uma
fonte não afeta as outras. Câmeras atrás de um gravador aparecem como **filhas** dele, com o
estado lido do próprio gravador: o Sentinela nunca fala direto com elas.

**MikroTik: use um usuário somente leitura.** Crie um grupo só com as políticas `read` e `api`
(sem `write`, `policy` nem `full`) e um usuário nesse grupo:

```
/user group add name=sentinela policy=read,api
/user add name=sentinela group=sentinela password=<senha-forte>
```

O teste avisa se o usuário puder escrever. Para gravadores, use também um usuário só de
visualização.

**MikroTik: certificado da `api-ssl`.** O Sentinela fala com o RouterOS só por TLS (8729) e
recusa a `api-ssl` sem certificado. Se o roteador ainda não tiver um, crie e associe:

```
/certificate add name=sentinela common-name=sentinela days-valid=3650
/certificate sign sentinela
/ip service set api-ssl certificate=sentinela disabled=no
```

No primeiro **Testar**, a tela mostra a impressão SHA-256 do certificado; confira-a no
roteador (`/certificate print detail`, campo `fingerprint`) e clique **Confiar neste
certificado**. Se o certificado mudar depois, a coleta para com "certificado do aparelho
mudou" até você confirmar a nova impressão. Gravadores por HTTPS seguem o mesmo fluxo. A API
sem TLS (8728) existe só para RouterOS antigo e mostra um aviso: usuário e senha trafegam em
texto claro.

### Aprovação, sondagem e o aviso de ARP

- **Aprovar** (um a um ou em lote) cria o equipamento com a classe e o nome escolhidos; ele
  aparece na Lista, na Teia e no Organograma na hora. **Ignorar** tira da fila (dá para
  reabrir). Aprovar uma câmera de gravador aprova o gravador junto.
- **Aprovação automática** (Configurações) fica **desligada por padrão**. Ligada, aprova
  sozinha as descobertas com confiança a partir do limiar escolhido (padrão 80%); tudo fica na
  auditoria.
- A classificação dos pendentes é **passiva**: usa só o que as fontes contaram (fabricante pelo
  MAC, nome DHCP, identidade do vizinho, dados SNMP/LLDP, dados do gravador). Nenhum pacote vai
  ao aparelho descoberto.
- **Aviso de ARP.** Falar pela primeira vez com um IP da mesma sub-rede faz o sistema
  operacional enviar um **pedido ARP**, que é um broadcast visível em toda a sub-rede. Por isso
  a sondagem de portas (lista fixa de 12 portas, uma conexão por vez) e o título da página web
  só acontecem: na **varredura lenta** de uma sub-rede em que você ligou a chave "permite
  varredura" (2 IPs por segundo, cancelável, desligada por padrão); quando você clica
  **Sondar** numa descoberta; ou depois da aprovação (o monitoramento falaria com o IP de
  qualquer jeito). Além deles, só os **hosts das fontes** que você cadastrou (roteador, switch,
  gravador) recebem contato e, portanto, um ARP no primeiro pacote. Fora desses casos, nenhum
  ARP é provocado. Desligar "permite varredura" (ou remover a sub-rede) cancela na hora a
  varredura em curso nela.
- Um aparelho fora das sub-redes declaradas aparece com o selo "fora das sub-redes
  monitoradas" e o botão para declarar o /24; aprovar fica bloqueado até lá.

A garantia é testada: no CI, o job `captura` sobe o núcleo e simuladores de MikroTik, switch
SNMP e gravador numa rede isolada, grava todo quadro com `tcpdump`, faz coleta, aprovação,
sondagem e uma varredura, e reprova qualquer broadcast ou multicast do Sentinela além do ARP
desses casos (detalhes em [`testes-rede/README.md`](testes-rede/README.md)).

A demonstração (`./install.sh --demo`) traz um MikroTik, um switch SNMP e um gravador de 16
canais **simulados**, com cerca de 40 descobertas pendentes; nada sai para a rede.

**Alertas e telão na demonstração.** A demo semeia um switch pai com 14 equipamentos filhos, dois
alertas no histórico (uma queda correlacionada de 14 afetados, fechada há 1 h 40 min, e uma câmera
que caiu e voltou) e o telão `TV Portaria (demo)`. Além disso, **a cada 10 minutos, começando 90 s
depois de subir**, o switch e os 14 filhos "caem" por 3 minutos: os filhos aparecem como
inalcançáveis na Lista, na Teia e no Organograma e abrem os cartões de alerta ao vivo. Nada é
enviado ao Telegram (**Enviar teste** responde 409 e o despachante não roda); os dados do `/parede` por
HTTP respondem 404 até a chave "sem HTTPS" ser ligada.

## Teia 3D e Organograma

Além da **Lista**, a tela principal tem duas abas visuais, que usam os mesmos dados ao vivo. Só o
**Organograma** compartilha os filtros da Lista (classe, estado e busca): o que for escolhido numa
aba vale na outra, e as contagens por estado de cada cartão refletem os filtros ativos. A **Teia**
não usa os filtros: mostra sempre todos os equipamentos.

**Teia 3D.** O servidor Sentinela fica no centro e cada classe de equipamento ocupa uma vaga fixa
ao redor, com as cores definidas no cadastro de classes. Cada equipamento é uma esfera cujo
estado aparece também pela forma, não só pela cor: online é cheio, instável tem um anel, offline
mostra "×" e pulsa, pausado fica cinza e translúcido, suspeito treme de leve. Clique numa esfera
(ou num item do painel de classes) para ver o histórico das últimas quedas; quem é administrador
pode pausar e retomar a checagem por ali. A cena 3D só é baixada quando você abre a aba, então a
primeira tela continua leve. São cinco estilos, escolhidos na barra superior e lembrados no
navegador: **Constelação** (padrão), **Órbitas**, **Galáxia**, **Átomo** e **Árvore 3D**.

**Organograma.** Alternativa 2D em HTML puro: um cartão por classe, com a contagem por estado e a
grade dos equipamentos, os piores estados primeiro (50 por cartão, com paginação). Dá para
recolher cada cartão, ou todos, e clicar num equipamento para abrir a ficha. Funciona bem no
celular e em máquinas sem aceleração gráfica.

**Teclado.** Na Teia, o painel de classes é navegável por Tab; **Enter** num botão de classe foca a
classe na cena e **Esc** fecha o painel do equipamento e, com ele fechado, volta à vista completa.
No Organograma, Enter abre o equipamento e **Esc** fecha a ficha devolvendo o foco ao item.

**Desempenho e degradação automática.** Até 1.000 equipamentos a cena é completa; de 1.000 a
3.000 some a partícula de fluxo, a resolução cai e o brilho (bloom) é desligado; acima de 3.000, ou
se o FPS ficar abaixo de 24 por 5 segundos, a Teia agrupa cada classe em um super-nó (no máximo
uma entrada em modo agrupado por minuto; "Ver tudo", trocar de estilo ou voltar à aba liberam o
modo completo de novo). O brilho só
liga se o FPS medido nos primeiros 3 segundos for 50 ou mais. Com a aba oculta, o desenho pausa.
Com `prefers-reduced-motion`, não há partículas, pulso nem rotação automática. Para medir o FPS
da Teia em cada estilo na sua máquina, rode `web/tests/medir_fps.py` (de `core/`: `uv run --with
playwright --with cryptography python ../web/tests/medir_fps.py --equipamentos 1000 --modo gpu`;
usa um banco temporário e não entra no CI).

**Sem WebGL.** Se o navegador não oferecer WebGL, a aba Teia mostra um aviso e leva ao Organograma.

## Alertas e Telegram

O Sentinela avisa quando um equipamento cai, volta ou fica instável, e quando uma fonte de
descoberta falha. Os alertas aparecem na aba **Alertas** (linha do tempo, reconhecer, silêncios) e,
se você quiser, no Telegram.

**Como a queda vira alerta.** Quem cai junto com o equipamento-pai (switch, AP, gravador) nos 60 s
seguintes vira **inalcançável** (elo partido, mesma cor do pausado) e entra no mesmo alerta, com uma
mensagem só: "Switch Bloco B caiu às 14:32, 14 equipamentos afetados". Quedas sem pai comum no
mesmo instante (30 s) também saem agrupadas. Quem cai e volta em menos de 2 minutos gera um alerta
"caiu e voltou" (a mensagem já enviada é editada, não vem uma segunda). "Instável" só alerta classe
crítica depois de 5 minutos; a fonte que falha 3 coletas seguidas gera um alerta de fonte. Os
alertas são guardados por 90 dias.

**Criar o bot do Telegram.**

1. No Telegram, fale com `@BotFather`, envie `/newbot`, escolha nome e usuário e copie o **token**.
2. Coloque o bot no grupo (ou abra uma conversa com ele e mande qualquer mensagem) e descubra o
   **chat id**: abra `https://api.telegram.org/bot<TOKEN>/getUpdates` num navegador e procure
   `"chat":{"id":...}` (grupos têm id negativo). Esse endereço é só para você, na sua máquina.
3. Em **Configurações → Telegram**, cole o token e os chats (até 10) e clique **Salvar**; depois
   **Enviar teste**. O token é cifrado no banco e nunca volta para a tela, para o log ou para a
   auditoria.

**Minimização de dados.** A mensagem leva só nome, classe, horário e duração. O **IP** só vai se
você ligar "Incluir IP" (desligado por padrão). Nada de MAC, fabricante ou credencial.

**Retentativas e limites.** Se o envio falhar, o Sentinela tenta de novo em 30 s e dobra o espaço
até 30 min, desistindo em 24 h (o alerta fica `falhou`; o painel continua mostrando). Há teto de 20
mensagens por minuto por chat; o excesso vira "e mais N alertas, veja no painel".

**Sem Telegram, sem internet.** O Sentinela só fala com `api.telegram.org:443` (HTTPS com
verificação normal de certificado) se houver token configurado; sem ele, nenhum pacote sai para a
internet, nem consulta de nome. Esse é o único destino externo e passa pela mesma Guarda de rede.
A prova de captura do CI cobre o Telegram e o telão.

**Silêncio × manutenção.** Os dois exigem **fim** (no máximo 30 dias) e valem por equipamento ou
por classe, com atalhos de 1 h, 4 h e "até amanhã 08:00" (no seu fuso), ou período personalizado.
**Silêncio** só deixa de avisar: o alerta continua no painel, marcado como silenciado. **Manutenção**
também **pausa a checagem** e cobre os filhos do equipamento; ao fim, retoma só o que ela mesma
pausou (o que você pausou à mão continua pausado).

**Só para testes e reversão.** `SENTINELA_CA_ADICIONAL` (caminho de um PEM dentro do contêiner; exige montar o arquivo) existe só para testes: em produção fica vazia. Desfazer a migração 0004 (downgrade) apaga alertas, silêncios e telões; as manutenções em andamento ficam pausadas (retome à mão) e o "Depende de" dos equipamentos permanece.

**Fuso.** O banco guarda UTC; os textos (Telegram, telão, painel) e o atalho "até amanhã 08:00"
usam `SENTINELA_FUSO` (padrão `America/Sao_Paulo`).

## Telão (TV)

A rota `/parede` mostra a Teia em tela cheia (com contadores e faixa de alertas) numa TV, sem
login. A TV **só lê** nome, classe, estado e pai de cada equipamento: **nunca IP, MAC, fabricante
ou latência**, e não tem nenhuma rota de escrita. O cartão de alerta na TV também sai sem IP; no
painel, o cartão traz todos os dados.

**Emparelhar.** Abra `/parede` na TV: ela mostra um código de 8 caracteres (por exemplo
`K7MQ-2XDP`), válido por 10 minutos e de uso único. No painel, em **Configurações → Telões**,
digite o código e dê um nome. A TV consulta a cada 5 s e entra sozinha; o token fica num cookie
`HttpOnly`/`SameSite=Strict` (e `Secure` em HTTPS) e, no banco, só existe o hash.

**Revogar.** Em **Telões**, **Revogar** derruba a TV na hora (a conexão em curso fecha). Para
voltar, é preciso emparelhar de novo.

**Modo HTTP (desligado por padrão).** TVs antigas muitas vezes recusam o certificado da CA local.
Ligando "Permitir telão sem HTTPS" em **Configurações**, a porta HTTP responde só ao `/parede` (as
demais telas continuam só em HTTPS), o cookie fica amarrado ao IP da TV e o canal não tem criptografia:
use só em rede confiável. Com a chave desligada, a página carrega, mas as chamadas de dados do `/parede` por HTTP respondem 404.

**HSTS prende a TV ao HTTPS.** Se a TV abrir o painel principal por HTTPS uma vez, ela guarda o
HSTS e passa a recusar o HTTP daquele nome. Por isso a porta HTTP do `/parede` não envia HSTS; mas
não abra o painel principal nessa TV. **Reserve o IP da TV no roteador** (DHCP fixo): no modo HTTP o
vínculo é por IP.

**Limites e avisos.**

- Cada IP pode pedir até 10 códigos por hora e há no máximo 20 pedidos pendentes. Como a TV de cada
  sala é um IP, cerca de 12 IPs da LAN pedindo código ao mesmo tempo podem segurar os 20
  pendentes e **bloquear novos emparelhamentos** por alguns minutos (os códigos vencem em 10 min).
- A Teia do telão roda no Chromium 63 do Tizen 5 com compatibilidade reduzida. Se o FPS ficar
  abaixo de 30 por 10 s, a tela cai para o **Organograma**; sem conexão por 60 s, mostra "sem
  conexão" e tenta de novo.
- Uma TV em **standby** que não dispara `visibilitychange` fica no Organograma até a página ser
  recarregada.
- Aceite no hardware (não roda no CI): abrir `/parede` na Samsung UN65RU7100 (Tizen 5.0),
  emparelhar e conferir se roda a Teia ou cai para o Organograma.

**IP nas bolinhas e cartão de alerta.** No painel, cada bolinha da Teia e do Organograma mostra o IP
do equipamento; o telão não. Quando um equipamento cai, o painel abre um cartão de alerta na
tela com todos os dados; o telão abre um cartão reduzido, sem IP. O som vem desligado.

## Versão em execução

O número da versão aparece ao lado do nome Sentinela no topo do painel, na tela de login e no
rodapé do telão. Vem do servidor (`GET /api/v1/saude` devolve `{"status": "ok", "versao": "X.Y.Z"}`;
o telão recebe no snapshot já autenticado), então mostra o que está de fato rodando.

### Notas da versão

**0.4.1** (correções de interface): classe sem nenhum equipamento deixa de aparecer na Teia 3D
(nós e painel "Classes") e no Organograma, e volta quando chega o primeiro; na Teia, os grupos
se redistribuem por igual entre as classes presentes, a vista geral cabe inteira na área livre
(sem painéis por cima, em qualquer giro da rotação) e os rótulos das classes não se sobrepõem; o
cartão de alerta ao vivo passa a respeitar 16 px de cada lado da janela, mesmo com barra de
rolagem clássica; versão visível no painel, no login e no telão.

## Documentação

- [Projeto arquitetônico](docs/arquitetura/ARQUITETURA.md)
- [Requisitos e decisões de produto](docs/superpowers/specs/2026-11-16-sentinela-design.md)

## Licença

[GNU AGPL‑3.0](LICENSE). Uso livre; quem modificar e oferecer o Sentinela a terceiros deve publicar as modificações.
