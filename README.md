# 🛡️ Sentinela

Monitor de equipamentos de rede local — câmeras, gravadores, access points Wi‑Fi, controles de acesso faciais, switches e o que mais estiver na rede — exibidos numa **teia 3D** por classe, com o servidor no centro e o estado online/offline de cada equipamento ao vivo.

**Sem broadcast. Sem lentidão. Sem nuvem.**

> Status: **projeto arquitetônico** — ainda sem código. Veja [`docs/arquitetura/ARQUITETURA.md`](docs/arquitetura/ARQUITETURA.md).

## Como funciona

- **Descobre perguntando a quem já sabe:** lê as tabelas ARP, DHCP e Wi‑Fi do roteador (MikroTik ou SNMP), a tabela de MAC dos switches e a lista de câmeras dos gravadores. Nenhum broadcast, nenhum multicast.
- **Classifica sozinho:** fabricante pelo MAC, portas conhecidas, SNMP, página web e ONVIF do aparelho. Você aprova e corrige.
- **Monitora com educação:** checagens unicast com teto global de pacotes por segundo; câmeras e controles de acesso checados com mais frequência.
- **Mostra bonito e leve:** Teia 3D, Organograma por classe, lista, modo telão para TV, alertas por Telegram.

## Documentação

- [Projeto arquitetônico](docs/arquitetura/ARQUITETURA.md)
- [Requisitos e decisões de produto](docs/superpowers/specs/2026-11-16-sentinela-design.md)

## Licença

[GNU AGPL‑3.0](LICENSE). Uso livre; quem modificar e oferecer o Sentinela a terceiros deve publicar as modificações.
