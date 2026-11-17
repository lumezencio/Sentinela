# 🛡️ Sentinela

Monitor de equipamentos de rede local — câmeras, gravadores, access points Wi‑Fi, controles de acesso faciais, switches e o que mais estiver na rede — exibidos numa **teia 3D** por classe, com o servidor no centro e o estado online/offline de cada equipamento ao vivo.

**Sem broadcast. Sem lentidão. Sem nuvem.**

> Status: **Fase 1 concluída; Fase 2 concluída com pendência** (núcleo de monitoramento, lista ao
> vivo, Docker, Teia 3D e Organograma). Pendência: no Lighthouse, "boas práticas" fica em 81 por um
> aviso de depreciação vindo do Alpine CSP de terceiros (desempenho, acessibilidade e SEO em 100).
> A descoberta automática e os alertas vêm nas próximas fases. Veja
> [`docs/arquitetura/ARQUITETURA.md`](docs/arquitetura/ARQUITETURA.md) (§18).

## Como funciona

- **Descobre perguntando a quem já sabe:** lê as tabelas ARP, DHCP e Wi‑Fi do roteador (MikroTik ou SNMP), a tabela de MAC dos switches e a lista de câmeras dos gravadores. Nenhum broadcast, nenhum multicast.
- **Classifica sozinho:** fabricante pelo MAC, portas conhecidas, SNMP, página web e ONVIF do aparelho. Você aprova e corrige.
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
