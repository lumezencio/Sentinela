import test from "node:test";
import assert from "node:assert/strict";
import { aplicarSnapshot, aplicarEstado, criarStore } from "../../src/js/lista.js";
import { candidatosPai, descendentes, motivoInalcancavel } from "../../src/js/dependencia.js";

const T = "2026-11-18T10:00:00Z";
const eq = (id, nome, extra = {}) => ({
  id, nome, ip: `10.99.1.${id.length}${id.charCodeAt(0) % 90}`, classe: "switch", estado: "online",
  desde: T, ...extra,
});

function loja(equipamentos) {
  const store = criarStore();
  aplicarSnapshot(store, {
    classes: [{ slug: "switch", nome: "Switches", cor: "#5B8DEF", ordem: 1 }],
    equipamentos,
  });
  return store;
}

// raiz -> b -> c -> d ; raiz -> e ; solto
const arvore = () =>
  loja([
    eq("raiz", "Switch Bloco A"),
    eq("b", "Switch Bloco B", { pai_id: "raiz" }),
    eq("c", "Câmera Pátio", { pai_id: "b" }),
    eq("d", "Impressora", { pai_id: "c" }),
    eq("e", "Roteador Filial", { pai_id: "raiz" }),
    eq("solto", "Ponto Isolado"),
  ]);

test("descendentes: toda a subárvore, sem o próprio", () => {
  const store = arvore();
  assert.deepEqual([...descendentes(store, "raiz")].sort(), ["b", "c", "d", "e"]);
  assert.deepEqual([...descendentes(store, "b")].sort(), ["c", "d"]);
  assert.equal(descendentes(store, "solto").size, 0);
});

test("descendentes: ciclo corrompido não trava", () => {
  const store = loja([eq("x", "X", { pai_id: "y" }), eq("y", "Y", { pai_id: "x" })]);
  assert.deepEqual([...descendentes(store, "x")], ["y"]);
});

test("candidatosPai: exclui o próprio e os descendentes (nunca oferece ciclo)", () => {
  const store = arvore();
  const ids = candidatosPai(store, "b", "").map((c) => c.id).sort();
  assert.deepEqual(ids, ["e", "raiz", "solto"]);
});

test("candidatosPai: busca sem acento nem maiúscula; devolve id, nome e classe", () => {
  const store = arvore();
  const r = candidatosPai(store, "solto", "CAMERA");
  assert.deepEqual(r, [{ id: "c", nome: "Câmera Pátio", classe: "Switches" }]);
  assert.deepEqual(candidatosPai(store, "solto", "zzz"), []);
});

test("candidatosPai: respeita o máximo e ordena por nome", () => {
  const muitos = Array.from({ length: 80 }, (_, i) => eq(`n${i}`, `Nó ${String(i).padStart(2, "0")}`));
  const store = loja([eq("alvo", "Alvo"), ...muitos]);
  const r = candidatosPai(store, "alvo", "");
  assert.equal(r.length, 50);
  assert.equal(r[0].nome, "Nó 00");
  assert.equal(candidatosPai(store, "alvo", "", 5).length, 5);
});

test("candidatosPai: nome hostil continua texto puro", () => {
  const hostil = "<img src=x onerror=alert(1)>";
  const store = loja([eq("alvo", "Alvo"), eq("h", hostil)]);
  const r = candidatosPai(store, "alvo", "onerror");
  assert.equal(r.length, 1);
  assert.equal(r[0].nome, hostil);
  assert.equal(typeof r[0].nome, "string");
});

test("motivoInalcancavel: nome do pai pela causa do estado", () => {
  const store = arvore();
  aplicarEstado(store, { id: "c", estado: "inalcancavel", desde: T, causa: "pai:b" });
  assert.equal(motivoInalcancavel(store.itens.get("c"), store), "Depende de Switch Bloco B (inalcançável)");
});

test("motivoInalcancavel: sem causa usa pai_id; fora do estado ou sem pai devolve vazio", () => {
  const store = arvore();
  aplicarEstado(store, { id: "c", estado: "inalcancavel", desde: T });
  assert.equal(motivoInalcancavel(store.itens.get("c"), store), "Depende de Switch Bloco B (inalcançável)");
  assert.equal(motivoInalcancavel(store.itens.get("b"), store), "");
  aplicarEstado(store, { id: "solto", estado: "inalcancavel", desde: T, causa: "pai:inexistente" });
  assert.equal(motivoInalcancavel(store.itens.get("solto"), store), "Depende de equipamento removido (inalcançável)");
});
