# 🛡️ Sentinela

Monitor de equipamentos de rede local — câmeras, gravadores, access points Wi‑Fi, controles de acesso faciais, switches e o que mais estiver na rede — exibidos numa **teia 3D** por classe, com o servidor no centro e o estado online/offline de cada equipamento ao vivo.

**Sem broadcast. Sem lentidão. Sem nuvem.**

> Status: **projeto arquitetônico** — ainda sem código. Veja [`docs/arquitetura/ARQUITETURA.md`](docs/arquitetura/ARQUITETURA.md).

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

## Documentação

- [Projeto arquitetônico](docs/arquitetura/ARQUITETURA.md)
- [Requisitos e decisões de produto](docs/superpowers/specs/2026-11-16-sentinela-design.md)

## Licença

[GNU AGPL‑3.0](LICENSE). Uso livre; quem modificar e oferecer o Sentinela a terceiros deve publicar as modificações.
