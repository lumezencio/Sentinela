// Componente da aba Diagnóstico (diagnostico-pagina.js) com fetch falso: 401 depois de o módulo de
// regras já estar carregado não quebra (TypeError) e o aviso de "números antigos" diz a idade real
// da visão guardada (Task R, pendências da revisão da Task 11).
import test, { mock } from "node:test";
import assert from "node:assert/strict";

const BASE = {
  periodo: "24h", de: "2026-11-19T18:00:00Z", ate: "2026-11-20T18:00:00Z",
  resumo: { incidentes: 0, por_tipo: {}, fora_s: 0 }, horas: Array(24).fill(0), incidentes: [],
  gateway_configurado: true, truncado: false, aviso_energia: "energia", aviso_gateway: null,
};

function resposta(status, corpo, cabecalhos = {}) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: (n) => cabecalhos[n] ?? null },
    json: async () => corpo,
  };
}

async function montar(respostas) {
  const fila = [...respostas];
  const redirecionou = [];
  globalThis.fetch = async () => fila.shift();
  globalThis.window = {
    location: { replace: (u) => redirecionou.push(u) },
    addEventListener() {},
  };
  globalThis.document = { cookie: "" };
  const { diagnosticoDoPainel } = await import("../../src/js/diagnostico-pagina.js");
  const painel = { aba: "diagnostico", fuso: "America/Sao_Paulo", ...diagnosticoDoPainel() };
  return { painel, redirecionou };
}

test("diagnóstico: 401 com o módulo já carregado não estoura e mantém a tela", async () => {
  const { painel, redirecionou } = await montar([
    resposta(200, BASE),
    resposta(401, { detail: "Sessão expirada." }),
  ]);
  await painel.carregarDiagnostico();
  assert.ok(painel.dgVisao, "a primeira visão chegou");
  const antes = painel.dgVisao;
  await painel.carregarDiagnostico(true); // sem rejeição (antes: TypeError em visaoDoDiagnostico)
  assert.equal(painel.dgVisao, antes, "a tela não some enquanto o login abre");
  assert.equal(painel.dgErro, "", "nada de erro na tela: o navegador já vai para o login");
  assert.deepEqual(redirecionou, ["login.html"]);
});

test("diagnóstico: aviso de números antigos diz a idade da visão guardada", async () => {
  mock.timers.enable({ apis: ["Date"], now: Date.parse("2026-11-20T18:00:00Z") });
  try {
    const { painel } = await montar([
      resposta(200, BASE),
      resposta(429, { detail: "Muitas consultas." }, { "Retry-After": "30" }),
      resposta(429, { detail: "Muitas consultas." }, { "Retry-After": "30" }),
    ]);
    await painel.carregarDiagnostico();
    mock.timers.tick(3 * 3600 * 1000 + 5 * 60 * 1000); // 3 h 5 min depois
    await painel.carregarDiagnostico();
    assert.match(painel.dgErro, /Muitas consultas seguidas/);
    assert.match(painel.dgErro, /números de 24 horas buscados há 3 h\./, painel.dgErro);
    assert.doesNotMatch(painel.dgErro, /há pouco/);
  } finally {
    mock.timers.reset();
  }
});

test("diagnóstico: idade da visão em minutos, horas e dias", async () => {
  const { idadeDaVisao } = await import("../../src/js/diagnostico-pagina.js");
  assert.equal(idadeDaVisao(20 * 1000), "há menos de 1 minuto");
  assert.equal(idadeDaVisao(61 * 1000), "há 1 minuto");
  assert.equal(idadeDaVisao(59 * 60 * 1000), "há 59 minutos");
  assert.equal(idadeDaVisao(60 * 60 * 1000), "há 1 h");
  assert.equal(idadeDaVisao(3 * 3600 * 1000 + 5 * 60 * 1000), "há 3 h");
  assert.equal(idadeDaVisao(26 * 3600 * 1000), "há 1 dia");
  assert.equal(idadeDaVisao(3 * 86400 * 1000), "há 3 dias");
  assert.equal(idadeDaVisao(-5), "há menos de 1 minuto");
});
