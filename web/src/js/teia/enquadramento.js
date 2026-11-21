// Enquadramento da câmera ao focar classe/equipamento: funções puras (sem three, sem DOM).
// - distância pelo raio do que se quer ver e pelo campo de visão (não um número fixo);
// - aproximação girada ~40° em volta do eixo vertical e um pouco de cima, para o servidor
//   (ou o hub da classe) nunca ficar colinear atrás do alvo;
// - centro da vista deslocado para a área livre (sem os painéis laterais / folha de baixo).

const GRAUS = Math.PI / 180;
export const FOLGA = 1.15;
export const GIRO_GRAUS = 40;
export const ELEVACAO = 0.45; // componente vertical da direção (antes de normalizar)

const sub = (a, b) => ({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z });
const soma = (a, b) => ({ x: a.x + b.x, y: a.y + b.y, z: a.z + b.z });
const esc = (a, k) => ({ x: a.x * k, y: a.y * k, z: a.z * k });
const dot = (a, b) => a.x * b.x + a.y * b.y + a.z * b.z;
const cruz = (a, b) => ({ x: a.y * b.z - a.z * b.y, y: a.z * b.x - a.x * b.z, z: a.x * b.y - a.y * b.x });
const norma = (a) => Math.hypot(a.x, a.y, a.z);
function unit(a) {
  const n = norma(a);
  return n < 1e-9 ? { x: 0, y: 0, z: 1 } : esc(a, 1 / n);
}

/** Raio que envolve `pontos` em volta de `centro` (+ `margem`), nunca menor que `minimo`. */
export function raioEnvolvente(centro, pontos, margem = 0, minimo = 1) {
  let r = 0;
  for (const p of pontos) r = Math.max(r, norma(sub(p, centro)));
  return Math.max(minimo, r + margem);
}

/**
 * Distância para uma esfera de raio R caber na vista. `fracao` (0–1] é o lado livre da tela
 * (o menor entre largura/altura livres, relativo à altura total): painéis reduzem a área.
 */
export function distanciaParaRaio(raio, fovGraus, { aspecto = 1, fracao = 1, folga = FOLGA } = {}) {
  const tanV = Math.tan((fovGraus * GRAUS) / 2);
  const lado = Math.max(0.15, Math.min(fracao, aspecto * fracao));
  const meio = Math.atan(tanV * lado);
  return (raio / Math.sin(meio)) * folga;
}

/**
 * Direção (unitária) de onde a câmera olha `para`: a direção horizontal de `de` → `para`
 * girada `giroGraus` em volta do eixo vertical, mais `elevacao` para cima.
 */
export function direcaoDeAproximacao(de, para, giroGraus = GIRO_GRAUS, elevacao = ELEVACAO) {
  let hx = para.x - de.x, hz = para.z - de.z;
  if (Math.hypot(hx, hz) < 1e-6) { hx = 0; hz = 1; }
  const n = Math.hypot(hx, hz);
  hx /= n; hz /= n;
  const a = giroGraus * GRAUS, c = Math.cos(a), s = Math.sin(a);
  return unit({ x: hx * c - hz * s, y: elevacao, z: hx * s + hz * c });
}

/**
 * Câmera e ponto de mira para ver `alvo` (raio `raio`) com a área livre da tela.
 * margens (px): {esquerda, direita, cima, baixo} cobertas por painéis.
 * @returns {{camera: {x,y,z}, olhar: {x,y,z}, distancia: number}}
 */
export function enquadrar({ alvo, de, raio, fov, largura, altura, margens = {} }) {
  const { esquerda = 0, direita = 0, cima = 0, baixo = 0 } = margens;
  const livreL = Math.max(1, largura - esquerda - direita);
  const livreA = Math.max(1, altura - cima - baixo);
  const fracao = Math.min(livreL, livreA) / altura;
  const distancia = distanciaParaRaio(raio, fov, { fracao });
  const dir = direcaoDeAproximacao(de, alvo);
  // base da câmera: frente (câmera → alvo), direita e cima da tela
  const frente = esc(dir, -1);
  let direitaV = cruz(frente, { x: 0, y: 1, z: 0 });
  if (norma(direitaV) < 1e-6) direitaV = { x: 1, y: 0, z: 0 };
  direitaV = unit(direitaV);
  const cimaV = cruz(direitaV, frente);
  // o alvo deve aparecer no centro da área livre: deslocamento em px → mundo na distância
  const mundoPorPx = (2 * distancia * Math.tan((fov * GRAUS) / 2)) / altura;
  const dxPx = (esquerda - direita) / 2; // + = centro livre à direita
  const dyPx = (baixo - cima) / 2; // + = centro livre acima
  const olhar = soma(alvo, soma(esc(direitaV, -dxPx * mundoPorPx), esc(cimaV, -dyPx * mundoPorPx)));
  return { camera: soma(olhar, esc(dir, distancia)), olhar, distancia };
}

/** Posição de `p` na tela (px a partir do centro, y para cima) vista de câmera→olhar. */
export function projetarNaTela(p, camera, olhar, fov, altura) {
  const frente = unit(sub(olhar, camera));
  let direitaV = cruz(frente, { x: 0, y: 1, z: 0 });
  if (norma(direitaV) < 1e-6) direitaV = { x: 1, y: 0, z: 0 };
  direitaV = unit(direitaV);
  const cimaV = cruz(direitaV, frente);
  const v = sub(p, camera);
  const z = dot(v, frente);
  const k = altura / 2 / Math.tan((fov * GRAUS) / 2) / z;
  return { x: dot(v, direitaV) * k, y: dot(v, cimaV) * k, profundidade: z };
}

/** Cosseno do ângulo entre a linha de visão e a reta alvo→`de` (1 = colinear atrás). */
export function alinhamentoAtras(camera, alvo, de) {
  const visao = unit(sub(alvo, camera));
  const paraDe = unit(sub(de, alvo));
  return dot(visao, paraDe);
}

// ---------- rótulos HTML (sobreposição; fora do bloom) ----------
export const DIST_MAX_ROTULO = 2600;
export const ESCALA_ROTULO = { min: 0.72, max: 1.12, referencia: 420 };

/**
 * Onde desenhar um rótulo a partir da projeção NDC do ponto (three: x,y em -1..1, z em
 * -1..1 dentro do frustum). Escondido atrás da câmera, longe demais ou fora da tela.
 */
export function posicaoDoRotulo({ ndc, distancia, largura, altura, margem = 40 }) {
  if (!ndc || !(ndc.z > -1 && ndc.z < 1) || !(distancia > 0) || distancia > DIST_MAX_ROTULO) {
    return { visivel: false };
  }
  const x = ((ndc.x + 1) / 2) * largura;
  const y = ((1 - ndc.y) / 2) * altura;
  if (x < -margem || x > largura + margem || y < -margem || y > altura + margem) {
    return { visivel: false };
  }
  const { min, max, referencia } = ESCALA_ROTULO;
  const escala = Math.min(max, Math.max(min, referencia / distancia));
  return { visivel: true, x: Math.round(x), y: Math.round(y), escala: Math.round(escala * 100) / 100 };
}

/**
 * Mantém a caixa de um rótulo de classe inteira dentro do palco (nunca cortada pela borda):
 * ancora no ponto projetado (x, y); a caixa tem `largura` x `altura` (px já com a escala),
 * centrada em x e com o topo em y + `desloque`. Se a ÂNCORA está fora do palco, some (sem
 * rótulo solto de um grupo que não se vê); senão desliza o mínimo para dentro, com `folga`.
 * Devolve {visivel, x, y} com x/y no mesmo sentido do ponto de entrada.
 */
export function manterRotuloNoPalco({
  x, y, largura, altura, palcoL, palcoA, desloque = 0, folga = 4,
}) {
  if (!(x >= 0 && x <= palcoL && y >= 0 && y <= palcoA)) return { visivel: false };
  const maxX = palcoL - folga - largura / 2;
  const minX = folga + largura / 2;
  const cx = minX > maxX ? palcoL / 2 : Math.min(maxX, Math.max(minX, x));
  const maxY = palcoA - folga - altura - desloque;
  const minY = folga - desloque;
  const cy = minY > maxY ? minY : Math.min(maxY, Math.max(minY, y));
  return { visivel: true, x: Math.round(cx), y: Math.round(cy) };
}

// ---------- vista geral: tudo (com os rótulos) dentro da área livre, em qualquer giro ----------
export const PAD_ROTULO = { lado: 60, vertical: 46 }; // meia largura e altura+vão de um rótulo de classe

/** Giro de `p` em volta do eixo vertical que passa por `centro`. */
function girarY(p, centro, c, s) {
  const x = p.x - centro.x, z = p.z - centro.z;
  return { x: centro.x + x * c + z * s, y: p.y, z: centro.z - x * s + z * c };
}

/** Caixa (px, y para cima, a partir do centro da tela) que contém todos os pontos em todos os giros. */
function caixaDaVista(pontos, alvo, camera, fov, altura, giros) {
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  for (const [c, s] of giros) {
    for (const p of pontos) {
      const q = girarY(p, alvo, c, s);
      const t = projetarNaTela(q, camera, alvo, fov, altura);
      if (!(t.profundidade > 1)) return null; // atrás da câmera
      const k = altura / 2 / Math.tan((fov * GRAUS) / 2) / t.profundidade;
      const r = (p.raio || 0) * k;
      const pl = p.rotulo ? Math.max(r, PAD_ROTULO.lado) : r;
      const pv = p.rotulo ? Math.max(r, PAD_ROTULO.vertical) : r;
      x0 = Math.min(x0, t.x - pl); x1 = Math.max(x1, t.x + pl);
      y0 = Math.min(y0, t.y - pv); y1 = Math.max(y1, t.y + pv);
    }
  }
  return { x0, x1, y0, y1 };
}

/**
 * Câmera da vista geral: a menor distância (na direção `direcao`, olhando `alvo`) em que todos
 * os `pontos` ({x,y,z,raio,rotulo}) cabem na área livre (tela menos as `margens` dos painéis),
 * em qualquer um dos `passos` giros da rotação automática em volta do eixo vertical. A área
 * livre costuma ser descentrada: em vez de mover o alvo (que é o pivô da rotação), devolve o
 * `desvio` em px (x para a direita, y para cima) para a cena aplicar como deslocamento da janela.
 * @returns {{camera, olhar, distancia, desvio:{x,y}, coube:boolean, girar:boolean}} `girar` = false quando só
 * cabe parado (tela estreita): a cena desliga a rotação automática.
 */
export function enquadrarVistaGeral({
  pontos, alvo, direcao, fov, largura, altura, margens = {}, folga = 4, minimo = 120, maximo = 2200, passos = 12,
}) {
  const { esquerda = 0, direita = 0, cima = 0, baixo = 0 } = margens;
  const livreL = Math.max(1, largura - esquerda - direita - 2 * folga);
  const livreA = Math.max(1, altura - cima - baixo - 2 * folga);
  const dir = unit(direcao);
  const giros = Array.from({ length: passos }, (_, j) => [Math.cos((j * 2 * Math.PI) / passos), Math.sin((j * 2 * Math.PI) / passos)]);
  const cam = (d) => soma(alvo, esc(dir, d));
  const cabe = (d) => {
    const b = caixaDaVista(pontos, alvo, cam(d), fov, altura, giros);
    return b && b.x1 - b.x0 <= livreL && b.y1 - b.y0 <= livreA;
  };
  let d = maximo, coube = cabe(maximo);
  let giraLivre = true;
  if (!coube) {
    // não cabe em todos os giros nem na distância máxima: vale só a vista parada (a cena para de girar)
    giraLivre = false;
    giros.length = 1;
    coube = cabe(maximo);
  }
  if (coube) {
    let lo = minimo, hi = maximo;
    if (cabe(lo)) hi = lo;
    for (let k = 0; k < 24 && hi - lo > 0.5; k++) {
      const mid = (lo + hi) / 2;
      if (cabe(mid)) hi = mid; else lo = mid;
    }
    d = hi;
  }
  const b = caixaDaVista(pontos, alvo, cam(d), fov, altura, giros) || { x0: 0, x1: 0, y0: 0, y1: 0 };
  const desvio = {
    x: Math.round((esquerda - direita) / 2 - (b.x0 + b.x1) / 2),
    y: Math.round((baixo - cima) / 2 - (b.y0 + b.y1) / 2),
  };
  return { camera: cam(d), olhar: alvo, distancia: d, desvio, coube, girar: giraLivre };
}

/**
 * Tira as sobreposições entre rótulos movendo cada um o mínimo possível na vertical (para cima
 * ou para baixo, escolhendo a vaga livre mais próxima do grupo dentro de `[0, limite]`).
 * `caixas`: {x (centro), topo, l, a} em px, na ordem de prioridade (o 1º não se move).
 * Devolve o deslocamento vertical de cada caixa (mesma ordem).
 */
export function separarRotulos(caixas, { folga = 4, limite = Infinity } = {}) {
  const eps = 1e-6;
  const fixas = [];
  const dy = [];
  const bateCom = (c, topo) => fixas.some((o) => Math.abs(o.x - c.x) < (o.l + c.l) / 2 + folga - eps
    && topo < o.topo + o.a + folga - eps && topo + c.a + folga - eps > o.topo);
  for (const c of caixas) {
    let melhor = null;
    if (!bateCom(c, c.topo)) {
      melhor = c.topo;
    } else {
      const vagas = [];
      for (const o of fixas) {
        if (Math.abs(o.x - c.x) < (o.l + c.l) / 2 + folga - eps) {
          vagas.push(o.topo - folga - c.a, o.topo + o.a + folga);
        }
      }
      for (const v of vagas) {
        if (v < -eps || v + c.a > limite + eps) continue;
        if (bateCom(c, v)) continue;
        if (melhor === null || Math.abs(v - c.topo) < Math.abs(melhor - c.topo) - eps) {
          melhor = v;
        }
      }
      if (melhor === null) {
        // sem vaga livre dentro do palco: empurra para fora (rotulosQueCabem esconde no LOD)
        melhor = Math.max(c.topo, ...fixas.map((o) => o.topo + o.a + folga));
      }
    }
    const d = melhor - c.topo;
    dy.push(d);
    fixas.push({ x: c.x, topo: melhor, l: c.l, a: c.a });
  }
  return dy;
}

/**
 * Nível de detalhe dos rótulos: depois de `separarRotulos`, quem ainda bate num rótulo já posto,
 * sai do palco (quando o palco é baixo como no celular) ou foi empurrado longe demais do próprio
 * grupo (`maxDeslocamento`) não aparece. A ordem é a mesma da separação (servidor e classes
 * maiores primeiro), então os mais importantes ficam.
 */
export function rotulosQueCabem(caixas, dy, { folga = 4, limite = Infinity, maxDeslocamento = Infinity } = {}) {
  const eps = 1e-6;
  const postas = [];
  return caixas.map((c, i) => {
    const d = dy[i] || 0;
    const topo = c.topo + d;
    const cabeNoPalco = topo >= -eps && topo + c.a <= limite + eps;
    const perto = Math.abs(d) <= maxDeslocamento + eps;
    const bate = postas.some((o) => Math.abs(o.x - c.x) < (o.l + c.l) / 2 + folga - eps
      && topo < o.topo + o.a + folga - eps && topo + c.a + folga - eps > o.topo);
    const fica = i === 0 || (cabeNoPalco && perto && !bate);
    if (fica) postas.push({ x: c.x, topo, l: c.l, a: c.a });
    return fica;
  });
}
