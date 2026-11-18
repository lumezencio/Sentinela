// Cartão de alerta na tela: montagem dos dados (alerta + store), pilha de 3, transições
// aberto/atualizado/fechado/removido e o cartão reduzido do telão (sem IP, MAC, fabricante).
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  aplicarNaPilha, dadosDoCartao, dispensarDaPilha, expirarDaPilha, listaDeAfetados, pilhaVazia,
  textoDoMais, visiveisDaPilha, VOLTOU_MS,
} from "../../src/js/cartoes.js";
import { aplicarLatencias, aplicarEstado, criarStore, aplicarSnapshot } from "../../src/js/lista.js";

const AGORA = Date.parse("2026-11-18T17:35:00Z");
const hora = (iso) => (Number.isNaN(Date.parse(iso)) ? "—" : "14:32");

function lojaDemo() {
  const store = criarStore();
  aplicarSnapshot(store, {
    classes: [
      { slug: "switch", nome: "Switches", cor: "#8793e8" },
      { slug: "camera", nome: "Câmeras", cor: "#68c7bc" },
    ],
    equipamentos: [
      { id: "sw", nome: "Switch Bloco B", ip: "10.99.0.2", classe: "switch", estado: "offline", desde: "2026-11-18T17:32:00Z", latencia_ms: 4.2, checagem: "icmp" },
      { id: "cam", nome: "Câmera Portaria", ip: "10.99.0.30", classe: "camera", estado: "inalcancavel", desde: "2026-11-18T17:32:00Z", checagem: "tcp", porta: 554, pai_id: "sw", causa: "pai:sw" },
      { id: "nvr", nome: "Gravador", ip: "10.99.0.40", classe: "camera", estado: "online", desde: "2026-11-18T10:00:00Z", pai_id: "sw" },
    ],
  });
  return store;
}

const queda = (id, extra = {}) => ({
  id, tipo: "queda", texto: "Switch Bloco B caiu · 2 afetados", equipamento_id: "sw",
  equipamento_nome: "Switch Bloco B", classe: "switch", afetados_total: 2,
  aberto_em: "2026-11-18T17:32:00Z", fechado_em: null, silenciado: false, reconhecido_em: null,
  reconhecido_por: null, envio: "pendente", breve: false, ...extra,
});
const msg = (acao, alerta, id) => ({ tipo: "alerta", acao, alerta, id: id ?? alerta.id });

test("dados do cartão: nome, classe, estado, IP, MAC, fabricante, checagem, pai, causa, hora", () => {
  const store = lojaDemo();
  const c = dadosDoCartao(
    { id: 1, alerta: queda(1, { equipamento_id: "cam", equipamento_nome: "Câmera Portaria", classe: "camera" }), fechado: false, expiraEm: 0 },
    store,
    { agora: AGORA, hora, reduzido: false, extras: { mac: "02:00:00:aa:bb:cc", fabricante: "Fabricante Fictício" } },
  );
  assert.equal(c.titulo, "Câmera Portaria");
  assert.equal(c.classeNome, "Câmeras");
  assert.equal(c.estadoRotulo, "Inalcançável");
  assert.equal(c.estilo, "queda");
  const por = Object.fromEntries(c.linhas.map((l) => [l.rotulo, l.valor]));
  assert.equal(por.IP, "10.99.0.30");
  assert.equal(por.MAC, "02:00:00:aa:bb:cc");
  assert.equal(por.Fabricante, "Fabricante Fictício");
  assert.equal(por.Checagem, "TCP 554");
  assert.equal(por["Depende de"], "Switch Bloco B (offline)");
  assert.equal(por.Causa, "Inalcançável por causa de Switch Bloco B");
  assert.match(por.Desde, /^14:32 \(/);
  assert.equal(c.rotuloAfetados, "2 equipamentos afetados");
  assert.equal(c.reconhecivel, true);
});

test("última latência sobrevive à queda (o store zera latencia_ms, o cartão mostra a última)", () => {
  const store = lojaDemo();
  aplicarLatencias(store, [["sw", 7.5]]);
  aplicarEstado(store, { id: "sw", estado: "offline", desde: "2026-11-18T17:32:00Z" });
  assert.equal(store.itens.get("sw").latencia_ms, null);
  const c = dadosDoCartao({ id: 1, alerta: queda(1), fechado: false }, store, { agora: AGORA, hora, reduzido: false });
  assert.equal(c.linhas.find((l) => l.rotulo === "Última latência").valor, "7.5 ms");
});

test("cartão do telão: sem IP, MAC, fabricante, checagem nem latência", () => {
  const store = lojaDemo();
  aplicarLatencias(store, [["sw", 7.5]]);
  const c = dadosDoCartao(
    { id: 1, alerta: queda(1), fechado: false },
    store,
    { agora: AGORA, hora, reduzido: true, extras: { mac: "02:00:00:aa:bb:cc", fabricante: "X", afetados: [{ id: "cam", nome: "n", classe: "camera", estado: "offline" }] } },
  );
  assert.deepEqual(c.linhas.map((l) => l.rotulo), ["Desde"]);
  const tudo = JSON.stringify(c);
  for (const proibido of ["10.99.", "02:00:00", "Fabricante", "Checagem", "latência", "7.5"]) {
    assert.ok(!tudo.includes(proibido), proibido);
  }
  assert.equal(c.lista.length, 0);
  assert.equal(c.reconhecivel, false);
  assert.equal(c.rotuloAfetados, "2 equipamentos afetados");
  // alerta reduzido do telão (sem equipamento_nome, `afetados` no lugar de afetados_total)
  const r = dadosDoCartao(
    { id: 2, alerta: { id: 2, tipo: "queda", texto: "x", aberto_em: "2026-11-18T17:32:00Z", equipamento_id: "sw", afetados: 14 }, fechado: false },
    store, { agora: AGORA, hora, reduzido: true },
  );
  assert.equal(r.titulo, "Switch Bloco B");
  assert.equal(r.rotuloAfetados, "14 equipamentos afetados");
});

test("nome hostil de 300 caracteres inteiro, sem controle nem bidi; nada de reticências", () => {
  const store = lojaDemo();
  const nome = `<b>${"Ç".repeat(290)}‮\u0007</b>`;
  const c = dadosDoCartao({ id: 1, alerta: queda(1, { equipamento_nome: nome }), fechado: false }, store, { agora: AGORA, hora, reduzido: false });
  assert.equal(c.titulo, `<b>${"Ç".repeat(290)}</b>`);
  assert.ok(!c.titulo.includes("…"));
});

test("fonte_falhou: sem equipamento, usa o texto e o estilo de aviso", () => {
  const c = dadosDoCartao(
    { id: 3, alerta: { id: 3, tipo: "fonte_falhou", texto: "Fonte MikroTik sem coleta", equipamento_id: null, equipamento_nome: null, afetados_total: 0, aberto_em: "2026-11-18T17:32:00Z" }, fechado: false },
    lojaDemo(), { agora: AGORA, hora, reduzido: false },
  );
  assert.equal(c.titulo, "Fonte MikroTik sem coleta");
  assert.equal(c.estilo, "aviso");
  assert.equal(c.temEquipamento, false);
  assert.equal(c.reconhecivel, false);
  assert.deepEqual(c.linhas.map((l) => l.rotulo), ["Desde"]);
});

test("instável: estilo de aviso (âmbar), mesmos dados", () => {
  const c = dadosDoCartao({ id: 4, alerta: queda(4, { tipo: "instavel", texto: "Switch Bloco B instável" }), fechado: false }, lojaDemo(), { agora: AGORA, hora, reduzido: false });
  assert.equal(c.estilo, "aviso");
  assert.equal(c.rotuloMarca, "Instável");
  assert.ok(c.linhas.some((l) => l.rotulo === "IP"));
});

test("lista de afetados: nome inteiro, IP do store, estado em texto", () => {
  const lista = listaDeAfetados(
    [{ id: "cam", nome: "Câmera Portaria", classe: "camera", estado: "inalcancavel" }, { id: "x", nome: "Sumiu", classe: "zzz", estado: "offline" }],
    lojaDemo(),
  );
  assert.equal(lista[0].ip, "10.99.0.30");
  assert.equal(lista[0].classeNome, "Câmeras");
  assert.equal(lista[0].estadoRotulo, "Inalcançável");
  assert.equal(lista[1].ip, "");
  assert.deepEqual(listaDeAfetados(null, lojaDemo()), []);
});

test("pilha: aberto cria; silenciado, fechado e tipo desconhecido não abrem", () => {
  let p = pilhaVazia();
  p = aplicarNaPilha(p, msg("aberto", queda(1)), AGORA);
  assert.deepEqual(p.cartoes.map((c) => c.id), [1]);
  assert.equal(aplicarNaPilha(p, msg("aberto", queda(2, { silenciado: true })), AGORA), p);
  assert.equal(aplicarNaPilha(p, msg("aberto", queda(3, { fechado_em: "2026-11-18T17:33:00Z" })), AGORA), p);
  assert.equal(aplicarNaPilha(p, msg("aberto", queda(4, { tipo: "volta" })), AGORA), p);
  assert.equal(aplicarNaPilha(p, null, AGORA), p);
  assert.equal(aplicarNaPilha(p, { tipo: "alerta", acao: "aberto" }, AGORA), p);
});

test("pilha: atualizado de alerta desconhecido (já aberto antes da conexão) não cria cartão", () => {
  const p = pilhaVazia();
  assert.equal(aplicarNaPilha(p, msg("atualizado", queda(9)), AGORA), p);
  assert.equal(aplicarNaPilha(p, msg("fechado", queda(9, { fechado_em: "2026-11-18T17:40:00Z" })), AGORA), p);
});

test("pilha: atualizado traz mais afetados; instavel e fonte_falhou também abrem", () => {
  let p = aplicarNaPilha(pilhaVazia(), msg("aberto", queda(1)), AGORA);
  p = aplicarNaPilha(p, msg("atualizado", queda(1, { afetados_total: 14 })), AGORA + 1000);
  assert.equal(p.cartoes[0].alerta.afetados_total, 14);
  assert.equal(p.cartoes.length, 1);
  p = aplicarNaPilha(p, msg("aberto", queda(2, { tipo: "instavel" })), AGORA);
  p = aplicarNaPilha(p, msg("aberto", queda(3, { tipo: "fonte_falhou", equipamento_id: null })), AGORA);
  assert.deepEqual(p.cartoes.map((c) => c.id), [3, 2, 1]);
});

test("pilha: fechado vira 'voltou' e some depois de 10 s", () => {
  let p = aplicarNaPilha(pilhaVazia(), msg("aberto", queda(1)), AGORA);
  p = aplicarNaPilha(p, msg("fechado", queda(1, { fechado_em: "2026-11-18T17:35:00Z" })), AGORA);
  assert.equal(p.cartoes[0].fechado, true);
  assert.equal(p.cartoes[0].expiraEm, AGORA + VOLTOU_MS);
  const c = dadosDoCartao(p.cartoes[0], lojaDemo(), { agora: AGORA, hora, reduzido: false });
  assert.equal(c.estilo, "ok");
  assert.equal(c.rotuloMarca, "Voltou");
  assert.equal(c.linhas.find((l) => l.rotulo === "Resolvido").valor, "voltou após 3 min");
  assert.equal(c.reconhecivel, false);
  assert.equal(expirarDaPilha(p, AGORA + VOLTOU_MS - 1), p);
  assert.equal(expirarDaPilha(p, AGORA + VOLTOU_MS).cartoes.length, 0);
});

test("pilha: fechado sem o alerta (telão) usa o instante da mensagem", () => {
  let p = aplicarNaPilha(pilhaVazia(), msg("aberto", queda(1)), AGORA);
  p = aplicarNaPilha(p, { tipo: "alerta", acao: "fechado", id: 1 }, AGORA);
  assert.equal(p.cartoes[0].alerta.fechado_em, new Date(AGORA).toISOString());
});

test("pilha: removido (absorvido pelo pai) some e o do pai assume", () => {
  let p = aplicarNaPilha(pilhaVazia(), msg("aberto", queda(1, { equipamento_id: "cam" })), AGORA);
  p = aplicarNaPilha(p, msg("aberto", queda(2)), AGORA + 500);
  p = aplicarNaPilha(p, { tipo: "alerta", acao: "removido", id: 1, alerta: null }, AGORA + 600);
  assert.deepEqual(p.cartoes.map((c) => c.id), [2]);
  assert.equal(aplicarNaPilha(p, { tipo: "alerta", acao: "removido", id: 77, alerta: null }, AGORA), p);
});

test("pilha: no máximo 3 à vista + 'e mais N alertas'; um cartão por alerta", () => {
  let p = pilhaVazia();
  for (let i = 1; i <= 5; i++) p = aplicarNaPilha(p, msg("aberto", queda(i)), AGORA + i);
  p = aplicarNaPilha(p, msg("aberto", queda(5)), AGORA + 9); // repetido: sem duplicar
  assert.equal(p.cartoes.length, 5);
  const { visiveis, mais } = visiveisDaPilha(p, 3);
  assert.deepEqual(visiveis.map((c) => c.id), [5, 4, 3]);
  assert.equal(mais, 2);
  assert.equal(textoDoMais(2), "e mais 2 alertas");
  assert.equal(textoDoMais(1), "e mais 1 alerta");
  assert.deepEqual(visiveisDaPilha(p, 2).visiveis.map((c) => c.id), [5, 4]); // telão
});

test("pilha: dispensar fecha e o mesmo alerta não reabre sozinho", () => {
  let p = aplicarNaPilha(pilhaVazia(), msg("aberto", queda(1)), AGORA);
  p = dispensarDaPilha(p, 1);
  assert.equal(p.cartoes.length, 0);
  assert.equal(aplicarNaPilha(p, msg("aberto", queda(1)), AGORA + 1).cartoes.length, 0);
  assert.equal(dispensarDaPilha(p, 1), p);
});

test("cartoes.js não usa API posterior ao Chromium 63 (o telão carrega este módulo)", () => {
  const texto = readFileSync(new URL("../../src/js/cartoes.js", import.meta.url), "utf8")
    .split("\n").filter((l) => !l.trim().startsWith("//")).join("\n");
  for (const api of ["Object.hasOwn", "flatMap", "replaceAll", ".at(", "fromEntries", "?.", "??", "\\p{"]) {
    assert.ok(!texto.includes(api), api);
  }
});
