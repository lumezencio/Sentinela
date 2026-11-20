// Posições determinísticas dos 5 estilos da Teia. Funções puras: a mesma entrada dá sempre
// o mesmo resultado, sem Math.random. Só as classes COM equipamento ganham hub: elas se distribuem por igual
// (vaga = posição na ordem `Classe.ordem` entre as presentes), então os hubs só se movem quando
// uma classe aparece ou some.
//
// Estilo A: posição inicial só pelo hash do id (a física separa depois); estável sempre.
// Estilos B, C, D e E: alocação estável de "slots" por classe. Cada classe tem uma capacidade
// fixa por degrau (64, 256, 1024, 4096, ...: o menor degrau >= 2 x nº de equipamentos da classe).
// Os slots são posições discretas e espaçadas do estilo (anéis, braço espiral, órbita, grade).
// Os ids da classe, ordenados por (hash, id), tomam o slot `hash % capacidade` e, em colisão,
// avançam linearmente até o próximo livre. Consequências: sem sobreposição; as posições são
// estáveis enquanto o degrau não muda; remover um equipamento só pode mover quem passou por
// cima do slot dele; adicionar só pode mover quem entra na mesma cadeia de colisão. Ao cruzar
// um degrau (capacidade nova) os equipamentos da classe podem mudar de lugar, sem sobreposição.
import { hashTexto } from "./hash.js";

export const ESTILOS = ["a", "b", "c", "d", "e"];
export const NOMES_ESTILO = {
  a: "Constelação", b: "Órbitas", c: "Galáxia", d: "Átomo", e: "Árvore 3D",
};
export const VAGAS = 12;
export const RAIO_CLASSES = 230;

const ELEVACAO = 60;
const INCLINACAO = (18 * Math.PI) / 180;
const DOIS_PI = Math.PI * 2;

// Número em [0, 1) derivado do id e de um sal (cada sal dá uma coordenada independente).
const u = (id, sal) => hashTexto(`${id}#${sal}`) / 4294967296;

/**
 * Vagas das classes presentes: slug -> {i, n}. Ordem estável por (ordem, slug); classe que o
 * backend não listou vai ao fim, por slug. `n` é o número de classes presentes.
 */
export function vagasDasClasses(classes, equipamentos) {
  const presentes = new Set();
  for (const e of equipamentos) if (e.classe !== "sentinela") presentes.add(e.classe);
  const ordem = new Map();
  for (const c of classes) ordem.set(c.slug, Number.isFinite(c.ordem) ? c.ordem : 0);
  const lista = [...presentes].sort((p, q) => {
    const op = ordem.has(p) ? ordem.get(p) : Infinity, oq = ordem.has(q) ? ordem.get(q) : Infinity;
    if (op !== oq) return op < oq ? -1 : 1;
    return p < q ? -1 : p > q ? 1 : 0;
  });
  const vagas = new Map();
  lista.forEach((slug, i) => vagas.set(slug, { i, n: lista.length }));
  return vagas;
}

// Casca esférica inclinada: anel de n vagas, elevação alternada (±60) e inclinação de 18° em x.
function hubCasca(v, n) {
  const ang = (v / n) * DOIS_PI;
  const x = Math.cos(ang) * RAIO_CLASSES;
  // n ímpar: a última vaga (par) encostaria na primeira (par); ela fica na altura do plano
  const y = n > 1 && n % 2 === 1 && v === n - 1 ? 0 : v % 2 === 0 ? ELEVACAO : -ELEVACAO;
  const z = Math.sin(ang) * RAIO_CLASSES;
  return {
    x,
    y: y * Math.cos(INCLINACAO) - z * Math.sin(INCLINACAO),
    z: y * Math.sin(INCLINACAO) + z * Math.cos(INCLINACAO),
  };
}

function estiloA(v, id, n) {
  const hub = hubCasca(v, n);
  // posição inicial numa nuvem esférica em torno da classe (a física ajusta depois)
  const cosT = u(id, 1) * 2 - 1, sinT = Math.sqrt(1 - cosT * cosT);
  const fi = u(id, 2) * DOIS_PI, r = 18 + u(id, 3) * 28;
  return { x: hub.x + sinT * Math.cos(fi) * r, y: hub.y + cosT * r, z: hub.z + sinT * Math.sin(fi) * r };
}

const ESPACO = 5; // distância mínima entre slots vizinhos
const ordenaId = (p, q) => (p < q ? -1 : p > q ? 1 : 0);

// ---- B: anéis concêntricos em torno da classe (tabela de slots por capacidade) ----
const cacheAneis = new Map();
function aneis(K) {
  if (!cacheAneis.has(K)) {
    const t = [];
    for (let r = 0; t.length < K; r++) {
      const raio = 20 + r * 11, n = Math.max(1, Math.floor((DOIS_PI * raio) / ESPACO));
      for (let i = 0; i < n && t.length < K; i++) t.push({ r, i, n, raio });
    }
    cacheAneis.set(K, t);
  }
  return cacheAneis.get(K);
}
function estiloB(v, id, slot, K, n) {
  const hub = hubCasca(v, n), { r, i, n: nAnel, raio } = aneis(K)[slot];
  const a = ((i + 0.5 * (r % 2)) / nAnel) * DOIS_PI + r * 0.4;
  return { x: hub.x + Math.cos(a) * raio, y: hub.y + Math.sin(a * 2) * 3, z: hub.z + Math.sin(a) * raio };
}

// ---- C: braço espiral com 64 pontos ao longo e faixas (8 radiais x N verticais) ----
const AO_LONGO = 64, FAIXA = 9;
function hubC(v, n) {
  const base = (v / n) * DOIS_PI;
  return { x: Math.cos(base + 0.9) * 120, y: 0, z: Math.sin(base + 0.9) * 120 };
}
function estiloC(v, id, slot, K, n) {
  const base = (v / n) * DOIS_PI;
  const t = ((slot % AO_LONGO) + 0.5) / AO_LONGO, faixa = Math.floor(slot / AO_LONGO);
  const rr = 60 + t * 260 + (faixa % 8) * FAIXA, a = base + t * 2.6 + 0.9;
  return { x: Math.cos(a) * rr, y: Math.floor(faixa / 8) * FAIXA, z: Math.sin(a) * rr };
}

// o hub de cada classe avança ~3,17 rad na sua órbita por vaga: hubs alternam de lado e
// ficam >= 120 de distância entre si (o ângulo fixo de antes encostava hubs vizinhos)
const PASSO_HUB_D = 3.17;
function hubD(v) {
  return orbita(v, Math.PI / 2 + v * PASSO_HUB_D, 0, 0);
}
function orbita(v, a, rExtra, yLocal) {
  // órbita circular inclinada e girada, uma por vaga
  const rr = 90 + v * 26 + rExtra, incl = (v / VAGAS) * Math.PI, giro = v * 0.7;
  const x = Math.cos(a) * rr, z = Math.sin(a) * rr;
  const y2 = yLocal * Math.cos(incl) - z * Math.sin(incl), z2 = yLocal * Math.sin(incl) + z * Math.cos(incl);
  return { x: x * Math.cos(giro) - z2 * Math.sin(giro), y: y2, z: x * Math.sin(giro) + z2 * Math.cos(giro) };
}
// ---- D: 64 pontos por órbita; faixas viram órbitas extras (raio e altura) ----
function estiloD(v, id, slot) {
  const faixa = Math.floor(slot / AO_LONGO);
  const a = (((slot % AO_LONGO) + 0.5) / AO_LONGO) * DOIS_PI;
  return orbita(v, a, ((faixa % 8) + 1) * 8, Math.floor(faixa / 8) * 8);
}

// ---- E: grade de 12 colunas por classe, com recuo em z nas colunas/linhas alternadas ----
const colunaE = (v, n) => (v - (n - 1) / 2) * 70;
const hubE = (v, n) => ({ x: colunaE(v, n), y: 90, z: 0 });
function estiloE(v, id, slot, K, n) {
  const col = slot % 12, lin = Math.floor(slot / 12);
  return { x: colunaE(v, n) + (col - 5.5) * 5.5, y: 40 - lin * 6, z: (col % 2) * 4 + (lin % 2) * 3 };
}

const ESTILO_FN = {
  a: { hub: hubCasca, item: (v, id, slot, K, n) => estiloA(v, id, n), slots: false },
  b: { hub: hubCasca, item: estiloB },
  c: { hub: hubC, item: estiloC },
  d: { hub: hubD, item: estiloD },
  e: { hub: hubE, item: estiloE },
};

export function calcularPosicoes(estilo, classes, equipamentos) {
  const fn = ESTILO_FN[estilo] ?? ESTILO_FN.a;
  const chave = ESTILO_FN[estilo] ? estilo : "a";
  const pos = new Map();
  pos.set("srv", { x: 0, y: chave === "e" ? 200 : 0, z: 0 });

  const vagas = vagasDasClasses(classes, equipamentos);
  for (const [slug, { i, n }] of vagas) pos.set(`h-${slug}`, fn.hub(i, n));

  const grupos = new Map();
  for (const e of equipamentos) {
    if (!vagas.has(e.classe)) continue; // classe do servidor: não entra na cena
    if (!grupos.has(e.classe)) grupos.set(e.classe, []);
    grupos.get(e.classe).push(e.id);
  }
  for (const [slug, ids] of grupos) {
    const { i: v, n } = vagas.get(slug);
    if (fn.slots === false) {
      for (const id of ids) pos.set(id, fn.item(v, id, 0, 0, n));
      continue;
    }
    let K = 64;
    while (K < 2 * ids.length) K *= 4;
    const ocupados = new Set();
    const comHash = ids.map((id) => ({ id, h: hashTexto(id) }));
    comHash.sort((p, q) => p.h - q.h || ordenaId(p.id, q.id));
    for (const { id, h } of comHash) {
      let slot = h % K;
      while (ocupados.has(slot)) slot = (slot + 1) % K;
      ocupados.add(slot);
      pos.set(id, fn.item(v, id, slot, K, n));
    }
  }
  return pos;
}
