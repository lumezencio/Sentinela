# Fase 5: produto instalável e vigilância contínua

Aprovado pelo dono em: 2026-11-20

## Por quê

O dono quer **distribuir o Sentinela para outras pessoas e empresas**. Hoje a instalação é
coisa de técnico: Docker, terminal, criar administrador pela linha de comando e digitar a
sub-rede. Depois de instalado, o sistema também não se mantém sozinho:

- não se atualiza;
- não mostra um aparelho que se conecte depois da primeira varredura;
- não ajuda a explicar por que a rede "cai e volta".

O caso real que motivou a fase é a rede do dono. Um roteador Tenda Wi‑Fi 6, sem SNMP, parece
reiniciar sozinho. Um DVR Intelbras e as câmeras caem junto.

## Objetivos

1. **Instalar com uma linha** num Raspberry Pi 4/5 (64 bits) ou num Linux: a pessoa cola um
   comando, espera e abre o endereço mostrado no fim.
2. **Primeiro acesso pela tela.** Sem terminal, a pessoa:
   - cria o administrador;
   - confirma a rede detectada;
   - liga a varredura com a explicação do ARP.

   O roteador detectado já entra cadastrado.
3. **Aparelho novo aparece sozinho.** A varredura se repete e cada aparelho novo gera um aviso
   "novo aparelho conectou na rede", na tela e no Telegram, além de entrar em **Novos**.
4. **Atualização automática de madrugada**, com backup e volta automática (o `update.sh`
   existente). O resultado aparece na tela e há uma chave para desligar.
5. **Diagnóstico de quedas.** Uma tela que agrupa as quedas em **incidentes** e diz em
   português o que provavelmente aconteceu, com o padrão de horário.

## Não objetivos (desta fase)

- Imagem pronta para gravar no cartão do Raspberry Pi (fica para a Fase 6, depois de o
  instalador de uma linha ser provado num Pi real).
- Instalador `.exe` para Windows: o Windows continua possível pelo caminho técnico atual.
- Medir tensão ou temperatura de roteadores domésticos, que não expõem esses dados.
- Ler o painel web de roteadores de marcas específicas (Tenda, TP‑Link etc.): é frágil e muda
  a cada firmware.

## Anti-objetivos (seria fracasso mesmo funcionando)

- Quebrar a regra de rede: o Sentinela continua sem broadcast nem multicast próprios. O único
  ARP é o da varredura, que o administrador liga sabendo o que é, e ela continua lenta
  (2 IPs/s).
- Deixar uma janela em que qualquer um na rede crie o administrador antes do dono.
- Atualizar sozinho para uma imagem não verificada, ou atualizar sem conseguir voltar.
- Laudo de queda que afirma certeza onde só há indício: o texto diz "provável" e mostra o
  porquê.

## Abordagens consideradas

| Abordagem | Prós | Contras | Escolha |
|---|---|---|---|
| **Instalador de uma linha + assistente na tela** | rápido de fazer; serve Pi e Linux; reaproveita `install.sh`/`update.sh` | ainda exige colar um comando | **escolhida** (o dono aceitou em 2026-11-20) |
| Imagem de cartão SD para Raspberry Pi | experiência de "liga e usa" | build de imagem, assinatura e testes em hardware real; demora mais | Fase 6 |
| Instalador `.exe` para Windows | familiar | Docker Desktop pesado; o Windows esconde o IP real e o MAC dos vizinhos; PC desliga | descartada |

## Decisões

**Decididas pelo dono**

- O instalador é geral: serve qualquer roteador, e o MikroTik enriquece quando houver.
- A entrega é uma caixinha (Raspberry Pi) ou um Linux, com instalação de uma linha.

**Decisões minhas (o dono pode mudar)**

- **Aprovação.** Um aparelho novo cai em **Novos** e gera aviso, mas só passa a ser vigiado
  depois de aprovado. A aprovação automática existente continua disponível e desligada por
  padrão.
- **Varredura contínua.** A cada **30 minutos** nas sub-redes com "permite varredura". O
  intervalo é ajustável de 15 a 240 minutos.
- **Atualização automática.** Às **03:00** (hora local), ligada por padrão, com chave em
  Configurações → Atualizações.
- **Código de instalação.** O assistente de primeiro acesso exige um **código de 8
  caracteres** que o instalador mostra no terminal. O código vale até o primeiro administrador
  existir e por no máximo 24 h. Sem código, ninguém na rede cria o administrador antes do dono.

## Como funciona

### 1. `instalar.sh` (uma linha)

```bash
curl -fsSL https://raw.githubusercontent.com/lumezencio/Sentinela/main/instalar.sh | bash
```

Passos do script:

1. Confere o sistema (Linux 64 bits; recusa armv7 como o `install.sh`).
2. Instala o Docker pelo script oficial, se faltar.
3. Clona a **última versão publicada** em `/opt/sentinela` (tag `vX.Y.Z`, não a `main`).
4. Detecta a rede local da interface da rota padrão (CIDR e gateway) e grava em `.env` como
   sugestão. Isso só lê o host; nada vai para a rede.
5. Roda `install.sh` com imagens publicadas e verificadas.
6. Gera o código de instalação e o grava, só com o hash, em `/dados`.
7. Instala o agendamento da atualização automática: um timer systemd às 03:00 que chama
   `update.sh --automatico`.
8. Mostra o endereço `https://IP` e o código.

O script é idempotente: rodar de novo não apaga nada e só completa o que falta. O nome
`sentinela.local` funciona sozinho quando o sistema já tem avahi (Raspberry Pi OS tem). O
Sentinela não instala nem anuncia mDNS.

### 2. Primeiro acesso

Enquanto não existir nenhum usuário, `login.html` leva a `primeiro-acesso.html`:

1. **Código de instalação** (8 caracteres, comparado por hash em tempo constante; limite de
   tentativas como no login).
2. **Administrador.** Login e senha, com as mesmas regras de senha do Sentinela.
3. **Rede.** Mostra a sub-rede e o gateway detectados (editáveis, só RFC 1918, de /16 a /30) e
   a chave **"Achar os aparelhos sozinho (varredura)"**, ligada, com o texto do aviso de ARP.
4. **Concluir.** Faz tudo numa transação:
   - cria o administrador;
   - cria a sub-rede com `permite_varredura`;
   - cadastra o gateway como equipamento da classe Roteadores;
   - invalida o código;
   - inicia a primeira varredura;
   - entra logado.

Depois do primeiro usuário, a rota do assistente responde 404 e o código não serve mais. A CLI
`criar-admin` continua existindo para técnicos.

### 3. Descoberta contínua e aviso de aparelho novo

- Um agendador no core dispara a varredura lenta de cada sub-rede com `permite_varredura` a
  cada N minutos (padrão 30). Ele respeita a varredura manual em curso e o cancelamento.
- Uma descoberta **inédita** (IP ou MAC nunca visto e não ignorado) abre um alerta do tipo
  **`aparelho_novo`**:
  - aparece na tela e no Telegram, pelo agregador e despachante da Fase 4A, com os silêncios
    respeitados;
  - mostra o IP, o fabricante quando houver e as portas;
  - tem o botão **"Ver em Novos"**.
- Reaparecer depois de sumir não é "novo". Ignorar em Novos encerra o alerta.

### 4. Atualização automática

- `update.sh --automatico`:
  - não pergunta nada;
  - registra o resultado em `/dados/atualizacao.json` (data, de/para, ok, voltou ou falhou, e
    a mensagem curta);
  - sai sem fazer nada se `/dados/atualizacao.json` disser `ativo: false`;
  - não roda se já houver uma operação em curso (a trava existente).
- O core lê esse arquivo:
  - **Configurações → Atualizações** mostra a versão atual, a última verificação, o resultado
    e a chave liga/desliga;
  - o painel mostra um aviso discreto por 24 h depois de uma atualização ("Atualizado para
    0.5.0") ou de uma volta ("A atualização para X falhou; o Sentinela voltou para Y").
- O core **não** ganha acesso ao Docker: quem atualiza é o timer do host.

### 5. Diagnóstico de quedas

Uma aba nova, **Diagnóstico**. Os eventos de estado já gravados viram **incidentes**: quedas que
começam com até 30 s de diferença são o mesmo incidente.

Cada incidente recebe uma classificação provável, sempre com o porquê:

| Classificação | Indício |
|---|---|
| **Roteador reiniciou (provável)** | o gateway e todos os equipamentos atrás dele caem juntos e voltam juntos depois de 30 a 180 s. Se houver fonte SNMP ou MikroTik do roteador, o `sysUpTime` zerado **confirma** e o texto troca "provável" por "confirmado". |
| **Queda do gateway sem reinício** | o gateway some, mas o `sysUpTime` não zerou (quando há leitura). |
| **Equipamento pai derrubou os filhos** | um switch ou o DVR cai e os dependentes ficam inalcançáveis (correlação da Fase 4A). |
| **Queda isolada** | um aparelho só. |
| **Instabilidade** | o mesmo aparelho cai mais de 3 vezes em 1 h. |

Além dos incidentes, a aba mostra:

- **Resumo do período**: 24 h, 7 dias ou 30 dias, com quantos incidentes de cada tipo e o tempo
  total fora do ar.
- **Padrão de horário**: um gráfico de barras por hora do dia. Uma concentração em certos
  horários sugere energia, por exemplo um equipamento grande que liga.
- **Sugestões em português** para cada tipo. Por exemplo, para "Roteador reiniciou":
  1. trocar a fonte;
  2. ligar num nobreak;
  3. atualizar o firmware;
  4. tirar do calor.
- **Exportar o laudo** em CSV e como página para imprimir, para entregar ao técnico ou à
  operadora.

Para fechar a hipótese de energia, a aba explica que o cruzamento é com um nobreak que registra
eventos ou com uma tomada que mede energia: o Sentinela mostra os horários e a pessoa compara.

## Restrições

- Tudo o que valia nas Fases 1–4 continua valendo:
  - zero broadcast e multicast próprios (o teste `captura` do CI cobre a varredura agendada);
  - segredos nunca impressos;
  - repositório público só com dados fictícios;
  - interface profissional, sem corte nem truncamento, conferida nas 8 larguras.
- O código de instalação aparece **só** no terminal de quem instalou. Nunca vai para log,
  arquivo legível ou resposta da API.
- `instalar.sh` passa no shellcheck e tem testes com o docker falso de `testes-operacao/`.
- O timer de atualização é do host (systemd). Em Windows ou Docker Desktop não há timer, e a
  tela diz isso com o comando manual.
- Versão de saída: **0.5.0**.

## O que fica com quem constrói

- O layout da aba Diagnóstico e do assistente, seguindo o design system atual.
- Os nomes internos, as tabelas e as migrações (com downgrade, como as anteriores).
- Como o core lê o `atualizacao.json` (volume `/dados` já compartilhado).

## Aceite pelo dono (depois da fase)

1. Instalar com a linha única num Raspberry Pi real e medir o tempo.
2. Deixar o Sentinela alguns dias na rede do Tenda e ler o Diagnóstico.
3. Conectar um celular novo na rede e ver o aviso chegar.
