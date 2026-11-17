// Posições determinísticas dos 5 estilos da Teia. Funções puras: a mesma entrada dá sempre
// o mesmo resultado, sem Math.random. A classe vai para a vaga `ordem % VAGAS`; o equipamento
// é posicionado só pelo hash do seu id e pela vaga da classe, então remover ou adicionar
// outro equipamento nunca o move.
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

const vaga = (ordem) => ((Number(ordem) || 0) % VAGAS + VAGAS) % VAGAS;

// Casca esférica inclinada: anel de 12 vagas, elevação alternada (±60) e inclinação de 18° em x.
function hubCasca(v) {
  const ang = (v / VAGAS) * DOIS_PI;
  const x = Math.cos(ang) * RAIO_CLASSES;
  const y = v % 2 === 0 ? ELEVACAO : -ELEVACAO;
  const z = Math.sin(ang) * RAIO_CLASSES;
  return {
    x,
    y: y * Math.cos(INCLINACAO) - z * Math.sin(INCLINACAO),
    z: y * Math.sin(INCLINACAO) + z * Math.cos(INCLINACAO),
  };
}

function estiloA(v, id, hub) {
  // posição inicial numa nuvem esférica em torno da classe (a física ajusta depois)
  const cosT = u(id, 1) * 2 - 1, sinT = Math.sqrt(1 - cosT * cosT);
  const fi = u(id, 2) * DOIS_PI, r = 18 + u(id, 3) * 28;
  return { x: hub.x + sinT * Math.cos(fi) * r, y: hub.y + cosT * r, z: hub.z + sinT * Math.sin(fi) * r };
}

function estiloB(v, id, hub) {
  // anéis concêntricos em volta da classe
  const anel = Math.floor(u(id, 1) * 8);
  const raio = 20 + anel * 11, a = u(id, 2) * DOIS_PI + anel * 0.4;
  return { x: hub.x + Math.cos(a) * raio, y: hub.y + Math.sin(a * 2) * 3, z: hub.z + Math.sin(a) * raio };
}

function hubC(v) {
  const base = (v / VAGAS) * DOIS_PI;
  return { x: Math.cos(base + 0.9) * 120, y: 0, z: Math.sin(base + 0.9) * 120 };
}
function estiloC(v, id) {
  // braço espiral: t ao longo do braço vem do hash
  const base = (v / VAGAS) * DOIS_PI, t = u(id, 1);
  const rr = 60 + t * 260, a = base + t * 2.6 + 0.9, esp = (u(id, 2) - 0.5) * 14;
  return { x: Math.cos(a) * rr + esp, y: (u(id, 3) - 0.5) * 10 * (1 - t), z: Math.sin(a) * rr + esp };
}

function orbita(v, a) {
  // órbita circular inclinada e girada, uma por vaga
  const rr = 90 + v * 26, incl = (v / VAGAS) * Math.PI, giro = v * 0.7;
  const x = Math.cos(a) * rr, z = Math.sin(a) * rr;
  const y2 = -z * Math.sin(incl), z2 = z * Math.cos(incl);
  return { x: x * Math.cos(giro) - z2 * Math.sin(giro), y: y2, z: x * Math.sin(giro) + z2 * Math.cos(giro) };
}
const hubD = (v) => orbita(v, Math.PI / 2);
const estiloD = (v, id) => orbita(v, u(id, 1) * DOIS_PI);

function colunaE(v) {
  return (v - (VAGAS - 1) / 2) * 70;
}
const hubE = (v) => ({ x: colunaE(v), y: 90, z: 0 });
function estiloE(v, id) {
  // árvore: servidor no topo, classes no meio, equipamentos em fileiras de 6 colunas abaixo
  const col = Math.floor(u(id, 1) * 6), lin = Math.floor(u(id, 2) * 20);
  return { x: colunaE(v) + (col - 2.5) * 9, y: 40 - lin * 9, z: (col % 2) * 6 };
}

const ESTILO_FN = {
  a: { hub: hubCasca, item: (v, id) => estiloA(v, id, hubCasca(v)) },
  b: { hub: hubCasca, item: (v, id) => estiloB(v, id, hubCasca(v)) },
  c: { hub: hubC, item: estiloC },
  d: { hub: hubD, item: estiloD },
  e: { hub: hubE, item: estiloE },
};

export function calcularPosicoes(estilo, classes, equipamentos) {
  const fn = ESTILO_FN[estilo] ?? ESTILO_FN.a;
  const chave = ESTILO_FN[estilo] ? estilo : "a";
  const pos = new Map();
  pos.set("srv", { x: 0, y: chave === "e" ? 200 : 0, z: 0 });

  const ordemClasse = new Map();
  for (const c of [...classes].sort((p, q) => p.ordem - q.ordem || (p.slug < q.slug ? -1 : 1))) {
    ordemClasse.set(c.slug, c.ordem);
    if (c.slug !== "sentinela") pos.set(`h-${c.slug}`, fn.hub(vaga(c.ordem)));
  }

  const ordenados = [...equipamentos].sort((p, q) => (p.id < q.id ? -1 : p.id > q.id ? 1 : 0));
  for (const e of ordenados) {
    // classe desconhecida: vaga estável pelo hash do slug
    const v = ordemClasse.has(e.classe) ? vaga(ordemClasse.get(e.classe)) : hashTexto(String(e.classe)) % VAGAS;
    pos.set(e.id, fn.item(v, e.id));
  }
  return pos;
}
