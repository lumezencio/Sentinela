import test from "node:test";
import assert from "node:assert/strict";
import { hashTexto } from "../../src/js/teia/hash.js";
import { aparenciaDe, corDaClasse, PALETA_RESERVA } from "../../src/js/teia/aparencia.js";
import { nivelDeDetalhe, criarMedidorFps, bloomPermitido } from "../../src/js/teia/desempenho.js";

test("aparenciaDe: valores por estado", () => {
  assert.deepEqual(aparenciaDe("online"),
    { cor: "#4CA878", forma: "cheia", pulsa: false, treme: false, opacidade: 1, rotulo: "Online" });
  assert.deepEqual(aparenciaDe("instavel"),
    { cor: "#D9A441", forma: "anel", pulsa: false, treme: false, opacidade: 1, rotulo: "Instável" });
  assert.deepEqual(aparenciaDe("suspeito"),
    { cor: "#4CA878", forma: "cheia", pulsa: false, treme: true, opacidade: 1, rotulo: "Online" });
  assert.deepEqual(aparenciaDe("offline"),
    { cor: "#D97373", forma: "cruz", pulsa: true, treme: false, opacidade: 1, rotulo: "Offline" });
  assert.deepEqual(aparenciaDe("pausado"),
    { cor: "#7A8194", forma: "translucida", pulsa: false, treme: false, opacidade: 0.45, rotulo: "Pausado" });
  assert.deepEqual(aparenciaDe("desconhecido"),
    { cor: "#7A8194", forma: "anel", pulsa: false, treme: false, opacidade: 0.7, rotulo: "Aguardando" });
});

test("aparenciaDe: estado nunca depende só de cor", () => {
  const estados = ["online", "instavel", "suspeito", "offline", "pausado", "desconhecido"];
  const chaves = estados.map((e) => {
    const a = aparenciaDe(e);
    return `${a.forma}|${a.pulsa}|${a.treme}|${a.opacidade}`;
  });
  assert.equal(new Set(chaves).size, estados.length, "cada estado tem marca não cromática distinta");
});

test("aparenciaDe: estado desconhecido do servidor cai em Aguardando; sem aliasing", () => {
  assert.equal(aparenciaDe("xyz").rotulo, "Aguardando");
  assert.equal(aparenciaDe(undefined).forma, "anel");
  const a = aparenciaDe("online");
  a.cor = "#000000";
  assert.equal(aparenciaDe("online").cor, "#4CA878");
});

test("corDaClasse: cor válida passa", () => {
  assert.equal(corDaClasse({ slug: "camera", cor: "#aBc123" }), "#aBc123");
});

test("corDaClasse: inválida cai na reserva determinística", () => {
  assert.equal(PALETA_RESERVA.length, 8);
  for (const cor of ["red", "#12345", "<script>", "#12345G", "", null, undefined, "#1234567"]) {
    const c = corDaClasse({ slug: "camera", cor });
    assert.equal(c, PALETA_RESERVA[hashTexto("camera") % 8]);
    assert.match(c, /^#[0-9A-Fa-f]{6}$/);
  }
  assert.equal(corDaClasse({ slug: "wifi" }), PALETA_RESERVA[hashTexto("wifi") % 8]);
});

test("nivelDeDetalhe: fronteiras de contagem", () => {
  assert.equal(nivelDeDetalhe(0, null), "completo");
  assert.equal(nivelDeDetalhe(1000, null), "completo");
  assert.equal(nivelDeDetalhe(1001, null), "reduzido");
  assert.equal(nivelDeDetalhe(3000, null), "reduzido");
  assert.equal(nivelDeDetalhe(3001, null), "agrupado");
});

test("nivelDeDetalhe: fps baixo força agrupado", () => {
  assert.equal(nivelDeDetalhe(10, 29.9), "agrupado");
  assert.equal(nivelDeDetalhe(10, 30), "completo");
  assert.equal(nivelDeDetalhe(10, null), "completo");
});

function relogio() {
  const r = { t: 0, agora: () => r.t };
  return r;
}
function alimentar(r, m, fps, segundos) {
  const passo = 1000 / fps;
  const fim = r.t + segundos * 1000;
  while (r.t < fim) { r.t += passo; m.quadro(); }
}

test("medidor: null até 1 s de amostras", () => {
  const r = relogio();
  const m = criarMedidorFps(r.agora);
  assert.equal(m.media(), null);
  alimentar(r, m, 60, 0.5);
  assert.equal(m.media(), null);
  alimentar(r, m, 60, 1);
  assert.ok(Math.abs(m.media() - 60) < 1.5);
});

test("medidor: janela móvel de 3 s", () => {
  const r = relogio();
  const m = criarMedidorFps(r.agora);
  alimentar(r, m, 60, 3);
  alimentar(r, m, 20, 3);
  assert.ok(Math.abs(m.media() - 20) < 1.5);
});

test("medidor: abaixoDe exige permanência contínua", () => {
  const r = relogio();
  const m = criarMedidorFps(r.agora);
  alimentar(r, m, 60, 2);
  assert.equal(m.abaixoDe(30, 3), false);
  alimentar(r, m, 20, 4); // média cai abaixo de 30 por volta de 1,5 s
  assert.equal(m.abaixoDe(30, 3), false); // ainda não há 3 s contínuos
  alimentar(r, m, 20, 3);
  assert.equal(m.abaixoDe(30, 3), true);
  alimentar(r, m, 60, 3); // recupera
  assert.equal(m.abaixoDe(30, 3), false);
});

test("medidor: 29.9 fps por 3 s -> agrupado", () => {
  const r = relogio();
  const m = criarMedidorFps(r.agora);
  alimentar(r, m, 29.9, 5);
  assert.equal(m.abaixoDe(30, 3), true);
  assert.equal(nivelDeDetalhe(10, m.abaixoDe(30, 3) ? m.media() : null), "agrupado");
});

test("bloomPermitido", () => {
  assert.equal(bloomPermitido(49.9, false), false);
  assert.equal(bloomPermitido(50, false), true);
  assert.equal(bloomPermitido(50, true), false);
  assert.equal(bloomPermitido(null, false), false);
});
