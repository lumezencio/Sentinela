import test from "node:test";
import assert from "node:assert/strict";
import {
  CLASSE_SERVIDOR, assinaturas, classesDaCena, diferencaNos, piorEstado, posicaoDeAproximacao,
  raioSuperNo, resumoPorClasse, rotuloAbaixo, textoRotuloClasse,
} from "../../src/js/teia/reconciliar.js";

const item = (id, classe, estado = "online") => ({ id, nome: `n-${id}`, ip: "10.99.0.1", classe, estado });

function storeCom(itens, classes = [
  { slug: "camera", nome: "Câmeras", cor: "#8793E8", ordem: 1 },
  { slug: "switch", nome: "Switches", cor: "#7FC8A9", ordem: 2 },
  { slug: "sentinela", nome: "Sentinela", cor: "#68C7BC", ordem: 0 },
]) {
  return {
    itens: new Map(itens.map((i) => [i.id, i])),
    classes: new Map(classes.map((c) => [c.slug, c])),
    ordemClasses: classes,
  };
}

test("diferencaNos: tudo novo quando não havia nada", () => {
  const store = storeCom([item("a", "camera"), item("b", "switch")]);
  const d = diferencaNos(new Map(), store.itens);
  assert.deepEqual(d, { adicionar: ["a", "b"], remover: [], mudouClasse: [], mudouEstado: [] });
});

test("diferencaNos: remove, adiciona e detecta mudança de estado e de classe", () => {
  const antes = assinaturas(storeCom([
    item("a", "camera"), item("b", "switch"), item("c", "camera", "offline"), item("d", "camera"),
  ]).itens);
  const depois = storeCom([
    item("a", "camera"), // igual
    item("c", "camera", "online"), // mudou estado
    item("d", "switch"), // mudou classe
    item("e", "switch"), // novo
  ]);
  const d = diferencaNos(antes, depois.itens);
  assert.deepEqual(d, { adicionar: ["e"], remover: ["b"], mudouClasse: ["d"], mudouEstado: ["c"] });
});

test("diferencaNos: a classe do servidor nunca vira nó de equipamento", () => {
  const store = storeCom([item("srv1", CLASSE_SERVIDOR), item("a", "camera")]);
  const d = diferencaNos(new Map(), store.itens);
  assert.deepEqual(d.adicionar, ["a"]);
  // mudar para a classe do servidor equivale a sair da cena
  const antes = assinaturas(store.itens);
  store.itens.set("a", item("a", CLASSE_SERVIDOR));
  assert.deepEqual(diferencaNos(antes, store.itens).remover, ["a"]);
  assert.equal(assinaturas(store.itens).size, 0);
});

test("diferencaNos: sem mudanças devolve listas vazias", () => {
  const store = storeCom([item("a", "camera"), item("b", "switch", "instavel")]);
  const d = diferencaNos(assinaturas(store.itens), store.itens);
  assert.deepEqual(d, { adicionar: [], remover: [], mudouClasse: [], mudouEstado: [] });
});

test("classesDaCena: ordem do backend, sem a classe sentinela, com contagem (inclui vazias)", () => {
  const store = storeCom([item("a", "camera"), item("b", "camera"), item("x", "desconhecida")]);
  const cs = classesDaCena(store);
  assert.deepEqual(cs.map((c) => [c.slug, c.total]), [["camera", 2], ["switch", 0]]);
  assert.equal(cs[0].nome, "Câmeras");
  assert.equal(cs[0].cor, "#8793E8");
});

test("piorEstado: ordem de gravidade do ESTADOS; vazio é desconhecido", () => {
  assert.equal(piorEstado([]), "desconhecido");
  assert.equal(piorEstado(["online", "pausado"]), "pausado");
  assert.equal(piorEstado(["online", "instavel", "pausado"]), "instavel");
  assert.equal(piorEstado(["online", "offline", "instavel"]), "offline");
  assert.equal(piorEstado(["online", "suspeito"]), "online");
  assert.equal(piorEstado(["online", "estado-estranho"]), "desconhecido");
});

test("resumoPorClasse: total e pior estado por classe (só equipamentos da cena)", () => {
  const store = storeCom([
    item("a", "camera"), item("b", "camera", "offline"), item("c", "switch", "pausado"),
    item("s", CLASSE_SERVIDOR, "offline"),
  ]);
  const r = resumoPorClasse(store.itens);
  assert.deepEqual(r.get("camera"), { total: 2, pior: "offline" });
  assert.deepEqual(r.get("switch"), { total: 1, pior: "pausado" });
  assert.equal(r.has(CLASSE_SERVIDOR), false);
});

test("raioSuperNo: cresce com a contagem, limitado", () => {
  assert.ok(raioSuperNo(0) > 0);
  assert.ok(raioSuperNo(10) < raioSuperNo(100));
  assert.ok(raioSuperNo(100000) <= 30);
  assert.ok(Number.isFinite(raioSuperNo(-5)));
});

test("textoRotuloClasse", () => {
  assert.equal(textoRotuloClasse("Câmeras", 120), "Câmeras · 120");
  assert.equal(textoRotuloClasse("", 0), "· 0");
});

test("rotuloAbaixo: vaga par (hub elevado) acima, ímpar abaixo; segue ordem % 12", () => {
  assert.equal(rotuloAbaixo(0), false);
  assert.equal(rotuloAbaixo(1), true);
  assert.equal(rotuloAbaixo(4), false);
  assert.equal(rotuloAbaixo(13), true);
  assert.equal(rotuloAbaixo(-1), true);
  assert.equal(rotuloAbaixo(undefined), false);
});

test("posicaoDeAproximacao: ao longo do raio a partir do centro, 60 acima; centro -> null", () => {
  assert.equal(posicaoDeAproximacao({ x: 0, y: 0, z: 0.2 }, 160), null);
  const c = posicaoDeAproximacao({ x: 100, y: 0, z: 0 }, 160);
  assert.deepEqual(c, { x: 260, y: 60, z: 0 });
  const d = posicaoDeAproximacao({ x: 30, y: 40, z: 0 }, 50); // |p| = 50 -> k = 2
  assert.deepEqual(d, { x: 60, y: 140, z: 0 });
});
