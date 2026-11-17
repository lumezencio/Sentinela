// Reconciliação da Teia com o store da página: funções puras (sem three, sem DOM).
// A cena só cria/remove/repinta o que estas funções apontam.
import { ESTADOS } from "../lista.js";

/** Classe do próprio servidor: não vira nó de classe nem de equipamento (é o centro). */
export const CLASSE_SERVIDOR = "sentinela";

const naCena = (item) => item && item.classe !== CLASSE_SERVIDOR;

/** Assinatura mínima de cada equipamento da cena: id -> {classe, estado}. */
export function assinaturas(itens) {
  const m = new Map();
  for (const [id, it] of itens) if (naCena(it)) m.set(id, { classe: it.classe, estado: it.estado });
  return m;
}

/**
 * Diferença entre a cena anterior (assinaturas) e os itens atuais do store.
 * Ordem das listas = ordem de inserção dos Maps (estável).
 */
export function diferencaNos(anteriores, itens) {
  const adicionar = [], remover = [], mudouClasse = [], mudouEstado = [];
  for (const [id, it] of itens) {
    if (!naCena(it)) continue;
    const antes = anteriores.get(id);
    if (!antes) adicionar.push(id);
    else if (antes.classe !== it.classe) mudouClasse.push(id);
    else if (antes.estado !== it.estado) mudouEstado.push(id);
  }
  for (const id of anteriores.keys()) if (!naCena(itens.get(id))) remover.push(id);
  return { adicionar, remover, mudouClasse, mudouEstado };
}

/** Classes que viram nó (ordem do backend, sem a do servidor), com a contagem de equipamentos. */
export function classesDaCena(store) {
  const totais = new Map();
  for (const it of store.itens.values()) {
    if (naCena(it)) totais.set(it.classe, (totais.get(it.classe) || 0) + 1);
  }
  return store.ordemClasses
    .filter((c) => c && c.slug !== CLASSE_SERVIDOR)
    .map((c) => ({ slug: c.slug, nome: c.nome, cor: c.cor, ordem: c.ordem, total: totais.get(c.slug) || 0 }));
}

const peso = (estado) => (Object.hasOwn(ESTADOS, estado) ? ESTADOS[estado].peso : ESTADOS.desconhecido.peso);
const normal = (estado) => (Object.hasOwn(ESTADOS, estado) ? estado : "desconhecido");

/** Estado mais grave (menor peso em ESTADOS); vazio -> "desconhecido". */
export function piorEstado(estados) {
  let pior = null;
  for (const e of estados) {
    const n = normal(e);
    if (pior === null || peso(n) < peso(pior)) pior = n;
  }
  return pior ?? "desconhecido";
}

/** slug -> {total, pior} só com equipamentos da cena (super-nós do nível "agrupado"). */
export function resumoPorClasse(itens) {
  const estados = new Map();
  for (const it of itens.values()) {
    if (!naCena(it)) continue;
    if (!estados.has(it.classe)) estados.set(it.classe, []);
    estados.get(it.classe).push(it.estado);
  }
  const r = new Map();
  for (const [slug, lista] of estados) r.set(slug, { total: lista.length, pior: piorEstado(lista) });
  return r;
}

/** Raio do super-nó pela contagem (raiz cúbica: volume ~ quantidade), entre 5 e 30. */
export function raioSuperNo(total) {
  const n = Math.max(0, Number(total) || 0);
  return Math.min(30, 5 + 2.2 * Math.cbrt(n));
}

export function textoRotuloClasse(nome, total) {
  return `${nome ?? ""} · ${total}`.trim();
}
