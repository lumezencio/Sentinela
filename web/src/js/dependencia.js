// "Depende de" (Fase 4): árvore de dependência entre equipamentos, só funções puras sobre o
// store da lista. A API é quem valida de verdade (ciclo, profundidade); aqui só se evita
// oferecer ao usuário o que ela recusaria. Não importa nada de lista.js (que importa este).

const MAX_CANDIDATOS = 50;

function normalizar(texto) {
  return String(texto || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

/** Câmera de gravador (canal) ou o próprio gravador: o vínculo é do gravador, só leitura. */
export function vinculoDoGravador(item) {
  return Boolean(item) && (Number.isInteger(item.canal) || item.checagem === "gravador");
}

/** Ids de toda a subárvore abaixo de `id` (sem o próprio); tolera ciclo corrompido. */
export function descendentes(store, id) {
  const filhos = new Map();
  for (const it of store.itens.values()) {
    if (!it.pai_id) continue;
    let lista = filhos.get(it.pai_id);
    if (!lista) filhos.set(it.pai_id, (lista = []));
    lista.push(it.id);
  }
  const achados = new Set();
  const fila = [id];
  while (fila.length) {
    for (const filho of filhos.get(fila.pop()) || []) {
      if (filho === id || achados.has(filho)) continue;
      achados.add(filho);
      fila.push(filho);
    }
  }
  return achados;
}

/**
 * Equipamentos que `id` pode ter como pai: nunca ele mesmo nem a subárvore dele (fecharia um
 * ciclo). Busca por nome ou IP sem acento nem maiúscula; ordem por nome; até `max`.
 */
export function candidatosPai(store, id, busca, max = MAX_CANDIDATOS) {
  const proibidos = descendentes(store, id);
  proibidos.add(id);
  const termo = normalizar(busca).trim();
  const achados = [];
  for (const it of store.itens.values()) {
    if (proibidos.has(it.id)) continue;
    if (termo && !it._busca.includes(termo)) continue;
    const classe = store.classes.get(it.classe);
    achados.push({ id: it.id, nome: it.nome, classe: classe ? classe.nome : it.classe });
  }
  achados.sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR", { numeric: true }));
  return achados.slice(0, Math.max(0, max));
}

/** "Depende de Switch Bloco B (inalcançável)" para item inalcançável; "" nos demais. */
export function motivoInalcancavel(item, store) {
  if (!item || item.estado !== "inalcancavel") return "";
  const causa = typeof item.causa === "string" && item.causa.startsWith("pai:") ? item.causa.slice(4) : "";
  const idPai = causa || item.pai_id;
  if (!idPai) return "";
  const pai = store.itens.get(idPai);
  return `Depende de ${pai ? pai.nome : "equipamento removido"} (inalcançável)`;
}
