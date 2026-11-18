import test from "node:test";
import assert from "node:assert/strict";
import {
  aplicarEquipamento, aplicarEstado, aplicarSnapshot, contar, criarStore, ESTADOS, filtrar, grupoDe,
  linhaDeTela,
} from "../../src/js/lista.js";

function loja() {
  const store = criarStore();
  aplicarSnapshot(store, {
    classes: [{ slug: "camera", nome: "Câmeras", cor: "#5B8DEF", ordem: 1 }],
    equipamentos: [
      { id: "nvr", nome: "NVR A", ip: "10.99.50.10", classe: "camera", estado: "online", desde: "2026-11-17T10:00:00Z" },
    ],
  });
  return store;
}

const linha = {
  id: "c1", nome: "Portão", ip: "192.168.254.1", classe: "camera", estado: "desconhecido",
  desde: "2026-11-17T10:00:00Z", latencia_ms: null, checagem: "gravador", porta: null,
  pai_id: "nvr", canal: 1,
};

test("aplicarEquipamento: criado insere com pai e canal; repetido é idempotente", () => {
  const store = loja();
  assert.equal(aplicarEquipamento(store, { acao: "criado", equipamento: linha }), true);
  assert.equal(aplicarEquipamento(store, { acao: "criado", equipamento: linha }), true);
  assert.equal(store.itens.size, 2);
  const it = store.itens.get("c1");
  assert.equal(it.pai_id, "nvr");
  assert.equal(it.canal, 1);
});

test("aplicarEquipamento: atualizado troca a linha (IP novo); removido apaga; inválido ignora", () => {
  const store = loja();
  aplicarEquipamento(store, { acao: "criado", equipamento: linha });
  aplicarEquipamento(store, { acao: "atualizado", equipamento: { ...linha, ip: "192.168.254.9" } });
  assert.equal(store.itens.get("c1").ip, "192.168.254.9");
  assert.equal(store.itens.size, 2);
  assert.equal(aplicarEquipamento(store, { acao: "removido", id: "c1" }), true);
  assert.equal(store.itens.has("c1"), false);
  assert.equal(aplicarEquipamento(store, { acao: "removido", id: "c1" }), false);
  assert.equal(aplicarEquipamento(store, { acao: "criado" }), false);
  assert.equal(aplicarEquipamento(store, { acao: "criado", equipamento: { nome: "sem id" } }), false);
  assert.equal(aplicarEquipamento(store, { acao: "outra", equipamento: linha }), false);
});

test("linhaDeTela: filho do gravador mostra o gravador e o canal", () => {
  const store = loja();
  aplicarEquipamento(store, { acao: "criado", equipamento: linha });
  const l = linhaDeTela(store.itens.get("c1"), store, Date.parse("2026-11-17T10:00:00Z"));
  assert.equal(l.atras, "Atrás do gravador NVR A, canal 1");
  assert.equal(linhaDeTela(store.itens.get("nvr"), store, 0).atras, "");
});

function lojaDependencia() {
  const store = criarStore();
  aplicarSnapshot(store, {
    classes: [{ slug: "switch", nome: "Switches", cor: "#5B8DEF", ordem: 1 }],
    equipamentos: [
      { id: "sw", nome: "Switch Bloco B", ip: "10.99.1.1", classe: "switch", estado: "offline", desde: "2026-11-17T10:00:00Z" },
      { id: "f1", nome: "Filho 1", ip: "10.99.1.2", classe: "switch", estado: "online", desde: "2026-11-17T10:00:00Z", pai_id: "sw" },
      { id: "f2", nome: "Filho 2", ip: "10.99.1.3", classe: "switch", estado: "instavel", desde: "2026-11-17T10:00:00Z" },
    ],
  });
  return store;
}

test("inalcancavel: rótulo, ícone, peso e grupo próprios", () => {
  assert.deepEqual(ESTADOS.inalcancavel, { rotulo: "Inalcançável", icone: "i-inalcancavel", peso: 1 });
  assert.equal(grupoDe("inalcancavel"), "inalcancavel");
  const pesos = ["offline", "inalcancavel", "instavel", "desconhecido", "pausado", "online"].map((e) => ESTADOS[e].peso);
  assert.deepEqual(pesos, [...pesos].sort((a, b) => a - b));
  assert.equal(new Set(pesos).size, pesos.length);
});

test("aplicarEstado guarda a causa e contar/filtrar enxergam inalcancavel", () => {
  const store = lojaDependencia();
  assert.equal(aplicarEstado(store, { id: "f1", estado: "inalcancavel", desde: "2026-11-18T10:00:00Z", causa: "pai:sw" }), true);
  assert.equal(store.itens.get("f1").causa, "pai:sw");
  assert.equal(contar(store).inalcancavel, 1);
  const so = filtrar(store, { classe: "", estado: "inalcancavel", busca: "" }, { campo: "nome", crescente: true });
  assert.deepEqual(so.map((i) => i.id), ["f1"]);
  aplicarEstado(store, { id: "f1", estado: "desconhecido", desde: "2026-11-18T10:01:00Z" });
  assert.equal(store.itens.get("f1").causa, null);
  assert.equal(contar(store).inalcancavel, 0);
});

test("ordenar por estado: offline, inalcançável, instável", () => {
  const store = lojaDependencia();
  aplicarEstado(store, { id: "f1", estado: "inalcancavel", desde: "2026-11-18T10:00:00Z", causa: "pai:sw" });
  const lista = filtrar(store, { classe: "", estado: "", busca: "" }, { campo: "estado", crescente: true });
  assert.deepEqual(lista.map((i) => i.id), ["sw", "f1", "f2"]);
});

test("linhaDeTela: inalcançável mostra de quem depende; dependente comum não vira 'gravador'", () => {
  const store = lojaDependencia();
  aplicarEstado(store, { id: "f1", estado: "inalcancavel", desde: "2026-11-18T10:00:00Z", causa: "pai:sw" });
  const l = linhaDeTela(store.itens.get("f1"), store, Date.parse("2026-11-18T10:05:00Z"));
  assert.equal(l.estadoRotulo, "Inalcançável");
  assert.equal(l.estadoIcone, "#i-inalcancavel");
  assert.equal(l.estadoClasse, "estado st-inalcancavel");
  assert.equal(l.atras, "");
  assert.equal(l.motivo, "Depende de Switch Bloco B (inalcançável)");
  assert.equal(linhaDeTela(store.itens.get("sw"), store, 0).motivo, "");
});
