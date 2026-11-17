# Prova de zero broadcast

Teste de sistema da Fase 3 (spec `docs/superpowers/specs/2026-11-17-fase3-descoberta-design.md`,
§6 e §9.1): o Sentinela, fazendo descoberta de verdade, não emite nenhum broadcast nem multicast
além do pedido ARP que o sistema operacional manda ao falar pela primeira vez com um IP que o
administrador autorizou.

```bash
testes-rede/rodar.sh        # Linux com Docker, ou Docker Desktop (Git Bash no Windows)
```

Roda no CI no job `captura` (ubuntu). Só mexe no projeto Compose `sentinela-captura`; a
instalação real (projeto `sentinela`, volumes `sentinela_*`) não é tocada.

## O que sobe

Rede bridge **isolada** (`internal: true`, sem saída) `10.99.250.0/24`:

| IP | Serviço | Papel |
|---|---|---|
| .5 | `cena` | dirige o núcleo só pela API, como o admin faria (`simuladores/cena.py`) |
| .10 | `captura` | `tcpdump -i eth0`; é o dono do namespace de rede em que o `core` roda |
| .10 | `core` | o núcleo do Sentinela em modo normal (não demonstração), mesma imagem da produção |
| .11 | `sim-routeros` | API RouterOS por TLS (8729), certificado gerado na hora |
| .12 | `sim-snmp` | agente SNMP v2c do próprio pysnmp (161/udp) |
| .35 | `sim-gravador` | gravador Hikvision (ISAPI com Digest, 80/tcp), dentro do /28 varrido |

Os simuladores são os mesmos dos testes do núcleo (`core/tests/descoberta`), copiados para a
imagem `simuladores` (que parte da imagem do núcleo); `simuladores/rodar.py` só escolhe as
tabelas desta rede e o endereço. Câmeras internas do gravador: `192.168.254.x` (rede interna
sintética do NVR, nunca recebem socket).

Por que o `tcpdump` é o dono do namespace (e o núcleo usa `network_mode: service:captura`): a
captura começa **antes** de o núcleo subir e vê todo quadro dele, inclusive os do arranque.
`-i eth0` em vez de `-i any`: o enlace Ethernet traz o MAC de destino, que o analisador confere.

Dois ajustes de ambiente, ambos sobre quadros que **não** são do Sentinela:

- `com.docker.network.advertise_addr_nmsgs: "0"` na rede: o Docker 28+ anuncia o IP de cada
  container com ARP gratuito quando o conecta (é o daemon que manda, com o MAC do container);
- IPv6 desligado no namespace (`disable_ipv6`): a rede é só IPv4, e o kernel mandaria
  solicitação de roteador e MLD (`33:33:*`) ao subir a interface.

## A cena

1. login do admin (senha aleatória desta execução, nunca impressa);
2. declara `10.99.250.0/27` (fontes, sem varredura) e `10.99.250.32/28` (varredura ligada);
3. cria as fontes MikroTik (api-ssl), SNMP v2c e Hikvision; **testa** as três e **confia** na
   impressão TLS do MikroTik; **coleta** as três;
4. espera as descobertas (ARP, DHCP, vizinho, SNMP, gravador e seus canais);
5. **aprova** 2: `10.99.250.20` (computador) e a câmera do canal 1 (o gravador vai junto);
6. **sonda** `10.99.250.21`;
7. **varre** `10.99.250.32/28` e espera o fim;
8. deixa o monitoramento dos aprovados rodar 40 s;
9. grava `saida/arp_permitido.txt` e `saida/cena.json`.

## O analisador

```bash
python analisar_captura.py saida/captura.pcap \
  --origem 10.99.250.10 --origem 02:00:00:fa:00:10 \
  --arp-permitido "$(cat saida/arp_permitido.txt)" --rede 10.99.250.0/24 \
  --exigir-contato "$(cat saida/contato_exigido.txt)"
```

Só biblioteca padrão (lê o pcap com `struct`). Reprova todo quadro do Sentinela (IP ou MAC de
origem) com destino `ff:ff:ff:ff:ff:ff`, `01:00:5e:*`, `33:33:*` ou outro MAC de grupo, IPv4
multicast, `255.255.255.255`, o broadcast dirigido da rede ou IPv6 multicast. A única exceção é
o **ARP request** para um IP da lista permitida, que a cena monta a partir do que de fato fez:

- hosts das fontes cadastradas pelo admin (`.11`, `.12`, `.35`);
- IPs aprovados com checagem própria (`.20` e o gravador `.35`; a câmera atrás do gravador não
  entra, porque nunca recebe socket);
- o IP sondado (`.21`);
- a faixa varrida (`10.99.250.32/28`).

ARP gratuito (anúncio do próprio IP) também reprova.

Ausência de broadcast só prova algo se a captura viu o trabalho real. Por isso a prova é
**inválida** (código 2) quando o pcap não tem quadros, não tem nenhum quadro do Sentinela
(interface ou MAC errados, tcpdump que perdeu o buffer) ou não mostra unicast do Sentinela
para algum host de `--exigir-contato` (os hosts das três fontes, gravados pela cena em
`saida/contato_exigido.txt`). Código 1 = quadro proibido; 0 = aprovado.

O teste negativo do analisador (`core/tests/rede/test_analisar_captura.py`, roda com a suíte
do núcleo) usa pcaps sintéticos: um quadro mDNS reprova; ARP para IP permitido passa e é
contado; pcap só com cabeçalho, pcap só com quadros de outros hosts e fonte exigida sem
unicast dão prova inválida.

## Resultado de referência

Docker Desktop 29.6.2 (Windows 11), 2026-11-17:

```
quadros na captura: 568
quadros emitidos pelo Sentinela: 359
broadcast/multicast emitidos pelo Sentinela: 132
ARP request permitidos: 132 para 18 IP(s)
  fontes: .11 2, .12 2, .35 2 | aprovado .20: 30 | sondado .21: 18 | varredura .33-.46: 6 cada
APROVADO: nenhum broadcast/multicast além do ARP permitido
```

O ARP do `.20` se repete porque o IP aprovado não existe na rede de teste (o monitoramento o
procura a cada ciclo e o vê offline); num aparelho real, depois da primeira resposta, o kernel
renova a entrada por unicast.
