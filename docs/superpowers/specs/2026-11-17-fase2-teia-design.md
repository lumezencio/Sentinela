# Sentinela — Fase 2: Teia 3D e Organograma

Data: 2026-11-17 · Base: Fase 1 integrada na `main` (9f9f2b8) · Arquitetura: `docs/arquitetura/ARQUITETURA.md` §12

## 1. Intenção

Dar ao Sentinela a visão que motivou o projeto: a **teia 3D** com o servidor no centro e cada classe de equipamento formando seu próprio conjunto, com o estado de cada equipamento visível como uma esfera viva. Palavras do dono: "lindo, quântico, 3D, de causar inveja", "sem causar lentidão". Depois de ver o protótipo com cinco estilos, o dono disse: "está ficando lindo, só acho que poderia ficar um pouco mais 3D".

Junto vem o **Organograma** (2D), a mesma informação em árvore, leve, para celular e para quem prefere ler a girar.

## 2. Objetivos, não-objetivos, anti-objetivos

**Objetivos**
- Aba **Teia** funcional (hoje desabilitada "em breve") com os **5 estilos** do protótipo: A Constelação, B Órbitas, C Galáxia, D Átomo, E Árvore 3D. Seletor na tela; estilo lembrado por navegador.
- **Mais profundidade 3D** que o protótipo (ver §5.2).
- Estados ao vivo pelo WebSocket já existente: cor por estado, pulso nos offline, tremor leve nos suspeitos, partículas nos fios do servidor às classes.
- Interação: girar, zoom, clicar numa classe isola e foca aquela classe; clicar num equipamento abre painel lateral de vidro com dados e **histórico de quedas**; "Ver tudo" volta.
- Aba **Organograma** funcional: uma árvore por classe (Classe → equipamentos), recolhível, com pontos de status, filtros iguais aos da lista, funcionando a 360 px.
- Quedas, novos equipamentos, pausas e sub-redes refletidos nas três visões sem recarregar.

**Não-objetivos (ficam para fases seguintes)**
- Topologia real (equipamento ligado a qual switch/porta): Fase 3 (descoberta).
- Modo telão `/parede` e emparelhamento de TV: Fase 4.
- Alertas Telegram: Fase 4.
- Editar posição das esferas à mão.

**Anti-objetivos**
- Engasgar em notebook comum ou deixar a primeira tela pesada (a Teia é carregada só quando aberta).
- Quebrar a CSP atual (sem `unsafe-eval`, sem `unsafe-inline`, sem CDN).
- Status só por cor (acessibilidade): forma e texto também mudam.

## 3. Restrições

- CSP de produção inalterada: `script-src 'self'`, `style-src 'self'`. Toda biblioteca servida pelo próprio nginx.
- Orçamento §8.5/§12: primeira tela ≤ 150 KB gzip (a Teia fica fora dela por `import()` dinâmico); 60 fps com até 1.000 nós em notebook comum; animação só de `transform`/`opacity` no DOM; `prefers-reduced-motion` desliga partículas, pulso e rotação.
- Repositório público: nada de dados reais; capturas e testes só com a demonstração.
- Backend da Fase 1 praticamente intocado; a Fase 2 é quase toda front.

## 4. Abordagens consideradas

| | Abordagem | Troca | Decisão |
|---|---|---|---|
| **A** | **3d-force-graph + Three.js empacotados com esbuild num pacote único, versionado em `web/src/vendor/`, carregado por `import()` só ao abrir a Teia** | Mantém CSP e "sem CDN"; um build reproduzível com versões travadas; ~230 KB gzip só para quem abre a Teia | **Escolhida (minha chamada)** |
| B | Three.js puro, sem 3d-force-graph | Controle total e pacote menor, mas reescreve física, câmera, cliques e partículas que a biblioteca já dá prontos | Descartada: muito mais código para o mesmo resultado |
| C | Carregar as bibliotecas por CDN | Zero build | Descartada: viola a CSP e a regra de não depender de terceiros em tempo de execução numa rede local |

O protótipo validou o visual com 3d-force-graph 1.79.1 + three 0.180.0; essas são as versões de partida (travadas em `web/package-lock.json`).

## 5. Projeto

### 5.1 Estrutura no front

- `web/src/js/teia/` — código da Teia (nosso), dividido por responsabilidade: `cena.js` (cria o grafo, luzes, névoa, estrelas, câmera), `estilos.js` (as 5 funções de posição, determinísticas por id), `objetos.js` (esferas, halos, rótulos, pulso), `interacao.js` (clique, foco, isolar classe, painel), `desempenho.js` (medidor de FPS e degradação).
- `web/build/teia-entrada.js` + `web/package.json` (three e 3d-force-graph com versão exata) → esbuild gera `web/src/vendor/teia-3d.bundle.js` (minificado, sem sourcemap, licenças preservadas em `web/src/vendor/LICENSES-teia.txt`). O bundle é commitado, como o Alpine, para que o fixture de teste e o nginx sirvam o mesmo arquivo; o Dockerfile do web confere o hash.
- `app.js` ganha o roteamento simples por aba (`#teia`, `#organograma`, `#lista`); a aba ativa fica no hash da URL.
- O estado vem do mesmo armazenamento em memória que alimenta a lista (snapshot + diferenças do WS); a Teia e o Organograma só observam esse estado. Nenhuma requisição extra por equipamento, exceto o histórico no painel.

### 5.2 "Mais 3D" (resposta ao pedido do dono)

- **Luz de verdade**: esferas com material que reage à luz (brilho próprio + sombreado), uma luz pontual no servidor e luz ambiente fraca — as esferas ganham volume, lado claro e lado escuro.
- **Profundidade**: névoa exponencial suave (o que está longe esmaece), campo de estrelas ao fundo (≈1.500 pontos, paralaxe lenta), e classes distribuídas numa **casca esférica inclinada** em vez de um anel plano (alturas diferentes), nos estilos A, B e D.
- **Bloom** (brilho que vaza das esferas) como pós-processamento **somente quando o dispositivo aguenta**: ligado se o FPS medido nos primeiros 3 s for ≥ 50; senão fica só o halo em sprite atual.
- **Câmera**: aproximação com curva suave ao focar; leve inclinação automática ao girar; zoom limitado para não "atravessar" o servidor.
- Tudo desligável pelo `prefers-reduced-motion` e pela degradação automática.

### 5.3 Estilos

Os 5 do protótipo, com posições **determinísticas** (derivadas do id e da ordem da classe), para a teia não "dançar" a cada abertura e dispensar salvar posições. O A (Constelação) usa física só na abertura e congela (`cooldownTicks`). Estilo padrão: **A**; escolha salva em `localStorage` (com try/catch).

### 5.4 Ao vivo e interação

- `estado` do WS → atualiza cor/forma da esfera e os contadores; offline pulsa (escala/opacidade); suspeito treme levemente; instável âmbar; pausado cinza.
- Equipamento novo/removido (snapshot novo ou resync existente) entra/sai da cena sem recriar tudo.
- Clique em classe: câmera foca, as demais classes esmaecem; Esc ou "Ver tudo" restaura.
- Clique em equipamento: painel de vidro com nome, IP, classe, tipo de checagem, estado e há quanto tempo, latência, e as últimas 10 quedas (`GET /api/v1/equipamentos/{id}/eventos?limit=10`). Admin vê atalhos "pausar/retomar".
- Teclado: Tab percorre classes no painel lateral de lista de classes (alternativa acessível ao clique no 3D); Enter foca.

### 5.5 Organograma 2D

- HTML/CSS (sem SVG pesado): por classe, um cartão com contagem por estado e a grade de equipamentos (ponto + nome), recolhível; ordem por gravidade (offline primeiro).
- Mesmos filtros da lista (classe, estado, busca). 360 px sem rolagem horizontal. Paginação/virtualização igual à lista quando a classe tem muitos itens.

### 5.6 Desempenho e degradação (§12.4)

| Situação | Comportamento |
|---|---|
| ≤ 1.000 nós | completo |
| 1.000–3.000 | sem partículas, esferas de baixa resolução, sem bloom |
| > 3.000 ou FPS < 30 por 3 s | classes viram "super-nós" que expandem ao clicar |
| sem WebGL | abre o Organograma com aviso |
| aba oculta / outra aba do app | renderização pausada |

### 5.7 Testes

- Unitários (JS, rodados com Node sem navegador, via `node --test`): funções de posição dos 5 estilos (determinismo, sem NaN, dentro de limites), mapeamento estado → aparência, degradação por número de nós.
- Smoke Playwright (estende o existente): abrir Teia, trocar os 5 estilos sem erro de console sob a CSP de produção, clicar num equipamento abre painel com histórico, simular queda via demo e ver o contador mudar, fallback sem WebGL abre o Organograma, Organograma a 360 px sem rolagem, primeira tela continua ≤ 150 KB gzip (a Teia não entra nela).
- Medida de FPS com 300 (demo) e 1.000 nós sintéticos registrada no relatório.

## 6. Chamadas minhas (o dono pode corrigir)

- Manter os 5 estilos no produto com seletor; padrão A.
- Abordagem A (bundle esbuild versionado), versões do protótipo.
- Bloom só com FPS ≥ 50.
- Posições determinísticas em vez de salvas no servidor.
- Organograma em HTML/CSS (não SVG).
- Painel mostra as últimas 10 quedas.

## 7. Esclarecimentos (revisão do construtor)

1. **"Sub-redes" no §2**: não é um agrupamento novo. Sub-redes já existem na Fase 1 (`/api/v1/subredes`, painel admin); removê-las pausa equipamentos e readicioná-las retoma. Na Teia isso aparece apenas como mudança de estado (pausado/retomado) que já chega pelo WS. Nenhum campo ou mensagem nova no backend.
2. **Protótipo é referência, não especificação**: portar as ideias e a aparência de `teia-3d-v2.html`, reescrevendo as funções de posição limpas e testáveis; A, B e D passam a usar a casca esférica inclinada (§5.2); C e E mantêm a forma do protótipo.
3. **Classes**: o conjunto vem do backend (12 classes semeadas; a API só edita, não cria). Cor = `Classe.cor` do backend; ordem na casca = `Classe.ordem`. A classe `sentinela` não vira nó de classe (o servidor é o centro). Cor inválida → paleta de reserva determinística por hash do slug.
4. **Estabilidade**: posição de cada classe calculada por `ordem` dentro de 12 vagas fixas (não pelo índice entre as presentes), e de cada equipamento pelo hash do seu id dentro da sua classe — inserir/remover equipamento só mexe no próprio equipamento; classe sem equipamentos continua na sua vaga.
5. **Build**: os módulos `web/src/js/teia/*.js` e as bibliotecas são empacotados juntos pelo esbuild em **um** arquivo `web/src/vendor/teia-3d.bundle.js` (ESM, carregado por um único `import()`), com `web/src/vendor/teia-3d.sha256`. Script `web/build/construir-teia.sh` regenera os dois. O CI regera o bundle e falha se diferir do commitado (evita bundle velho). O Dockerfile do web confere o sha256 e falha o build se divergir; ele não minifica de novo o bundle. nginx já serve `.js` como `application/javascript` (ESM ok com `script-src 'self'`). O teste de primeira tela continua sem carregar o bundle.
6. **Painel de classes**: painel fixo à esquerda na aba Teia listando as classes com contagem por estado; clicar/Enter foca a classe na cena (alternativa acessível ao 3D). Abaixo de 768 px vira uma fileira de chips rolável horizontalmente dentro do próprio painel (sem rolagem horizontal da página).
7. **Permissões**: histórico (`GET /api/v1/equipamentos/{id}/eventos`) é permitido a qualquer usuário logado (já é assim na Fase 1). "Pausar/retomar" no painel só aparece para admin e usa `POST /api/v1/equipamentos/{id}/pausar|retomar` (já exigem admin + CSRF no backend).

## 8. Deixado para quem construir

Detalhes de cores de cada classe (usar as do protótipo como ponto de partida), intensidade exata de luz/névoa/bloom dentro do orçamento, formato interno dos módulos, textos de interface em português.
