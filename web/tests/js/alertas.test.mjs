import test from "node:test";
import assert from "node:assert/strict";
import {
  abertosDaMensagem, aplicarMensagemAlerta, ATALHOS, contarAbertos, filtrarAlertas,
  instanteNoFuso, linhaDoAlerta, montarSilencio, rotuloEnvio, validarSilencio,
} from "../../src/js/alertas.js";
import { ABAS } from "../../src/js/visoes.js";

const AGORA = Date.parse("2026-11-18T17:40:00Z"); // 14:40 em São Paulo
const FUSO = "America/Sao_Paulo";

function alerta(extra = {}) {
  return {
    id: 1, tipo: "queda", texto: "Switch Bloco B caiu · 14 afetados", equipamento_id: "e1",
    equipamento_nome: "Switch Bloco B", classe: "switch", afetados_total: 14,
    aberto_em: "2026-11-18T17:32:00Z", fechado_em: null, breve: false, reconhecido_por: null,
    reconhecido_em: null, silenciado: false, envio: "enviado", ...extra,
  };
}

test("a aba existe e fica entre o Organograma e Novos", () => {
  assert.ok(ABAS.includes("alertas"));
  assert.ok(ABAS.indexOf("alertas") > ABAS.indexOf("organograma"));
});

test("linha aberta: ícone e rótulo de texto, hora no fuso e envio", () => {
  const l = linhaDoAlerta(alerta(), AGORA, FUSO);
  assert.equal(l.id, 1);
  assert.equal(l.marca, "aberto");
  assert.equal(l.icone, "#i-offline");
  assert.equal(l.rotuloMarca, "Aberto");
  assert.equal(l.hora, "14:32");
  assert.equal(l.texto, "Switch Bloco B caiu · 14 afetados");
  assert.equal(l.rotuloEnvio, "Telegram enviado");
  assert.equal(l.afetados, 14);
  assert.equal(l.rotuloAfetados, "14 afetados");
  assert.equal(l.reconhecivel, true);
});

test("linha instável (aberta, tipo instavel) e linha fechada", () => {
  const i = linhaDoAlerta(alerta({ tipo: "instavel", afetados_total: 0 }), AGORA, FUSO);
  assert.equal(i.marca, "instavel");
  assert.equal(i.icone, "#i-instavel");
  assert.equal(i.rotuloAfetados, "");
  const f = linhaDoAlerta(
    alerta({ fechado_em: "2026-11-18T17:38:00Z", breve: true, afetados_total: 1 }), AGORA, FUSO,
  );
  assert.equal(f.marca, "fechado");
  assert.equal(f.icone, "#i-online");
  assert.equal(f.rotuloMarca, "Resolvido");
  assert.equal(f.rotuloAfetados, "1 afetado");
  assert.equal(f.reconhecivel, false);
  assert.match(f.fechado, /14:38/);
  assert.match(f.fechado, /6 min/);
});

test("alerta de outro dia mostra a data junto da hora", () => {
  const l = linhaDoAlerta(alerta({ aberto_em: "2026-11-17T01:05:00Z" }), AGORA, FUSO);
  assert.match(l.hora, /16\/11/); // 22:05 de 16/11 em São Paulo
  assert.match(l.hora, /22:05/);
});

test("fuso inválido não derruba a linha", () => {
  const l = linhaDoAlerta(alerta(), AGORA, "Marte/Olimpo");
  assert.match(l.hora, /\d{2}:\d{2}/);
});

test("reconhecido mostra quem e deixa de oferecer o botão", () => {
  const l = linhaDoAlerta(
    alerta({ reconhecido_por: "admin", reconhecido_em: "2026-11-18T17:35:00Z" }), AGORA, FUSO,
  );
  assert.equal(l.reconhecivel, false);
  assert.match(l.reconhecimento, /admin/);
  assert.match(l.reconhecimento, /14:35/);
});

test("texto de 300 caracteres continua inteiro, sem reticências", () => {
  const longo = "Equipamento ".concat("de nome muito longo ".repeat(15)).slice(0, 300);
  assert.equal(longo.length, 300);
  const l = linhaDoAlerta(alerta({ texto: longo }), AGORA, FUSO);
  assert.equal(l.texto, longo);
  assert.ok(!l.texto.includes("…"));
});

test("rotuloEnvio: um rótulo por situação, silenciado na frente", () => {
  assert.equal(rotuloEnvio("enviado", false), "Telegram enviado");
  assert.equal(rotuloEnvio("pendente", false), "Telegram pendente");
  assert.equal(rotuloEnvio("falhou", false), "Telegram falhou");
  assert.equal(rotuloEnvio("nao_aplica", false), "");
  assert.equal(rotuloEnvio("nao_aplica", true), "Silenciado");
  assert.equal(rotuloEnvio("enviado", true), "Silenciado");
  assert.equal(rotuloEnvio("??", false), "");
});

test("mensagens aberto/atualizado/fechado/removido aplicadas em ordem", () => {
  let lista = [];
  const original = lista;
  lista = aplicarMensagemAlerta(lista, { tipo: "alerta", acao: "aberto", id: 1, alerta: alerta({ id: 1 }), abertos: 1 });
  lista = aplicarMensagemAlerta(lista, {
    tipo: "alerta", acao: "aberto", id: 2,
    alerta: alerta({ id: 2, aberto_em: "2026-11-18T17:36:00Z" }), abertos: 2,
  });
  assert.deepEqual(lista.map((a) => a.id), [2, 1]); // mais recente primeiro
  assert.deepEqual(original, []); // não muta a entrada
  lista = aplicarMensagemAlerta(lista, {
    tipo: "alerta", acao: "atualizado", id: 1,
    alerta: alerta({ id: 1, reconhecido_por: "admin", reconhecido_em: "2026-11-18T17:37:00Z" }), abertos: 2,
  });
  assert.equal(lista.find((a) => a.id === 1).reconhecido_por, "admin");
  assert.equal(lista.length, 2);
  lista = aplicarMensagemAlerta(lista, {
    tipo: "alerta", acao: "fechado", id: 2, alerta: alerta({ id: 2, fechado_em: "2026-11-18T17:39:00Z" }), abertos: 1,
  });
  assert.equal(contarAbertos(lista), 1);
  lista = aplicarMensagemAlerta(lista, { tipo: "alerta", acao: "removido", id: 1, alerta: null, abertos: 0 });
  assert.deepEqual(lista.map((a) => a.id), [2]);
  // alerta nulo fora de "removido" também some (já apagado no servidor)
  lista = aplicarMensagemAlerta(lista, { tipo: "alerta", acao: "atualizado", id: 2, alerta: null, abertos: 0 });
  assert.deepEqual(lista, []);
});

test("mensagem malformada não altera a lista", () => {
  const lista = [alerta()];
  assert.deepEqual(aplicarMensagemAlerta(lista, null), lista);
  assert.deepEqual(aplicarMensagemAlerta(lista, { tipo: "alerta", acao: "aberto", alerta: { x: 1 } }), lista);
});

test("contador de abertos: o da mensagem vale; sem ele, mantém o atual", () => {
  assert.equal(abertosDaMensagem({ abertos: 7 }, 3), 7);
  assert.equal(abertosDaMensagem({ abertos: "7" }, 3), 3);
  assert.equal(abertosDaMensagem({}, 3), 3);
  assert.equal(contarAbertos([alerta({ id: 1 }), alerta({ id: 2, fechado_em: "2026-11-18T17:39:00Z" })]), 1);
});

test("filtrarAlertas: abertos, reconhecidos, todos, classe e período", () => {
  const a = alerta({ id: 1 });
  const b = alerta({ id: 2, fechado_em: "2026-11-18T17:39:00Z", reconhecido_em: "2026-11-18T17:35:00Z", classe: "camera" });
  const c = alerta({ id: 3, reconhecido_em: "2026-11-18T17:35:00Z", aberto_em: "2026-11-10T10:00:00Z" });
  const lista = [a, b, c];
  const ids = (f) => filtrarAlertas(lista, f).map((x) => x.id);
  assert.deepEqual(ids({ filtro: "abertos" }), [1, 3]);
  assert.deepEqual(ids({ filtro: "reconhecidos" }), [2, 3]);
  assert.deepEqual(ids({ filtro: "todos" }), [1, 2, 3]);
  assert.deepEqual(ids({ filtro: "todos", classe: "camera" }), [2]);
  assert.deepEqual(ids({ filtro: "todos", desde: Date.parse("2026-11-18T00:00:00Z") }), [1, 2]);
});

test("atalhos do silêncio, na ordem da tela", () => {
  assert.deepEqual(ATALHOS, [
    { valor: "1h", rotulo: "1 hora" },
    { valor: "4h", rotulo: "4 horas" },
    { valor: "amanha_8h", rotulo: "Até amanhã 08:00" },
    { valor: "personalizado", rotulo: "Personalizado" },
  ]);
});

const form = (extra = {}) => ({
  tipo: "silencio", alvo_tipo: "equipamento", alvo: "e1", atalho: "1h", fim: "", motivo: "", ...extra,
});

test("validarSilencio: atalho com alvo é válido; alvo é obrigatório", () => {
  assert.deepEqual(validarSilencio(form(), AGORA), {});
  assert.ok(validarSilencio(form({ alvo: "" }), AGORA).alvo);
  assert.ok(validarSilencio(form({ alvo: "   " }), AGORA).alvo);
});

test("validarSilencio: personalizado precisa de fim futuro e de no máximo 30 dias", () => {
  const p = (fim) => validarSilencio(form({ atalho: "personalizado", fim }), AGORA);
  assert.ok(p("").fim);
  assert.ok(p(new Date(AGORA - 60_000).toISOString()).fim);
  assert.ok(p(new Date(AGORA).toISOString()).fim);
  assert.deepEqual(p(new Date(AGORA + 3_600_000).toISOString()), {});
  assert.deepEqual(p(new Date(AGORA + 30 * 86_400_000).toISOString()), {});
  assert.ok(p(new Date(AGORA + 30 * 86_400_000 + 60_000).toISOString()).fim);
  assert.ok(p("lixo").fim);
});

test("validarSilencio: atalho desconhecido e motivo longo", () => {
  assert.ok(validarSilencio(form({ atalho: "2h" }), AGORA).atalho);
  assert.ok(validarSilencio(form({ motivo: "x".repeat(201) }), AGORA).motivo);
  assert.deepEqual(validarSilencio(form({ motivo: "x".repeat(200) }), AGORA), {});
});

test("montarSilencio: atalho ou fim, motivo só se houver", () => {
  assert.deepEqual(montarSilencio(form({ alvo: " e1 ", motivo: " troca de nobreak " })), {
    tipo: "silencio", alvo_tipo: "equipamento", alvo: "e1", atalho: "1h", motivo: "troca de nobreak",
  });
  const fim = "2026-11-18T20:00:00.000Z";
  assert.deepEqual(montarSilencio(form({ tipo: "manutencao", atalho: "personalizado", fim })), {
    tipo: "manutencao", alvo_tipo: "equipamento", alvo: "e1", fim,
  });
});

test("instanteNoFuso: horário digitado vale no fuso configurado", () => {
  // São Paulo é UTC-3 o ano todo desde 2019
  assert.equal(instanteNoFuso("2026-11-18T20:00", "America/Sao_Paulo"), "2026-11-18T23:00:00.000Z");
  assert.equal(instanteNoFuso("2026-11-18T20:00", "UTC"), "2026-11-18T20:00:00.000Z");
  assert.equal(instanteNoFuso("", "UTC"), "");
  assert.equal(instanteNoFuso("lixo", "UTC"), "");
});
