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
export const DIST_MAX_ROTULO = 1500;
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
