# 🛡️ Sentinela

Monitor de equipamentos de rede local — câmeras, gravadores, access points Wi‑Fi, controles de acesso faciais, switches e o que mais estiver na rede — exibidos numa **teia 3D** por classe, com o servidor no centro e o estado online/offline de cada equipamento ao vivo.

**Sem broadcast. Sem lentidão. Sem nuvem.**

> Status: **Fases 1, 2 e 3 concluídas** (núcleo de monitoramento, lista ao vivo, Docker, Teia 3D,
> Organograma e descoberta automática com classificador). Os alertas vêm na próxima fase. Veja
> [`docs/arquitetura/ARQUITETURA.md`](docs/arquitetura/ARQUITETURA.md).

## Como funciona

- **Descobre perguntando a quem já sabe:** lê as tabelas ARP, DHCP e Wi‑Fi do roteador (MikroTik ou SNMP), a tabela de MAC dos switches e a lista de câmeras dos gravadores. Nenhum broadcast, nenhum multicast.
- **Classifica sozinho:** fabricante pelo MAC, nome DHCP, dados SNMP/LLDP e do gravador; portas conhecidas e página web só quando você autoriza. Você aprova e corrige.
- **Monitora com educação:** checagens unicast com teto global de pacotes por segundo; câmeras e controles de acesso checados com mais frequência.
- **Mostra bonito e leve:** Teia 3D, Organograma por classe, lista, modo telão para TV, alertas por Telegram.

## Instalação

Requisitos: **Docker Engine 25 ou mais novo** e **Docker Compose 2.24.4 ou mais novo**
(o instalador confere e recusa versões antigas), `openssl` e `bash`.

```bash
./install.sh          # instalação real
./install.sh --demo   # demonstração com 300 equipamentos simulados (volume próprio)
```

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
  qualquer jeito). Fora desses casos, nenhum ARP é provocado.
- Um aparelho fora das sub-redes declaradas aparece com o selo "fora das sub-redes
  monitoradas" e o botão para declarar o /24; aprovar fica bloqueado até lá.

A garantia é testada: no CI, o job `captura` sobe o núcleo e simuladores de MikroTik, switch
SNMP e gravador numa rede isolada, grava todo quadro com `tcpdump`, faz coleta, aprovação,
sondagem e uma varredura, e reprova qualquer broadcast ou multicast do Sentinela além do ARP
desses casos (detalhes em [`testes-rede/README.md`](testes-rede/README.md)).

A demonstração (`./install.sh --demo`) traz um MikroTik, um switch SNMP e um gravador de 16
canais **simulados**, com cerca de 40 descobertas pendentes; nada sai para a rede.

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

## Documentação

- [Projeto arquitetônico](docs/arquitetura/ARQUITETURA.md)
- [Requisitos e decisões de produto](docs/superpowers/specs/2026-11-16-sentinela-design.md)

## Licença

[GNU AGPL‑3.0](LICENSE). Uso livre; quem modificar e oferecer o Sentinela a terceiros deve publicar as modificações.
