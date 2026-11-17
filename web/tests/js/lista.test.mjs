import test from "node:test";
import assert from "node:assert/strict";
import { aplicarEquipamento, aplicarSnapshot, criarStore, linhaDeTela } from "../../src/js/lista.js";

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
