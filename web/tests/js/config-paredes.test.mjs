// Configurações → Telões: código digitado (mesma regra do servidor) e linha de cada telão.
import test from "node:test";
import assert from "node:assert/strict";

import { linhaDoTelao, montarAprovacao, normalizarCodigo } from "../../src/js/config-paredes.js";

test("normalizarCodigo: maiúsculas, sem espaço nem hífen, 8 do alfabeto sem ambíguos", () => {
  assert.equal(normalizarCodigo("K7MQ-2XDP"), "K7MQ-2XDP");
  assert.equal(normalizarCodigo("k7mq2xdp"), "K7MQ-2XDP");
  assert.equal(normalizarCodigo("  k7mq 2xdp  "), "K7MQ-2XDP");
  assert.equal(normalizarCodigo("K7-MQ-2X-DP"), "K7MQ-2XDP");
});

test("normalizarCodigo: tamanho errado ou caractere ambíguo → null", () => {
  for (const ruim of ["", "K7MQ-2XD", "K7MQ-2XDPP", "K7MQ-2XD0", "K7MQ-2XDO", "K7MQ-2XD1", "K7MQ-2XDI",
    "K7MQ-2XDL", "K7MQ_2XDP", "K7MQ-2XD!", null, undefined]) {
    assert.equal(normalizarCodigo(ruim), null, String(ruim));
  }
});

test("montarAprovacao: código normalizado e nome aparado; erros por campo", () => {
  assert.deepEqual(montarAprovacao({ codigo: "k7mq 2xdp", nome: "  TV Portaria " }), {
    erros: {},
    corpo: { codigo: "K7MQ-2XDP", nome: "TV Portaria" },
  });
  const r = montarAprovacao({ codigo: "abc", nome: "  " });
  assert.equal(r.corpo, null);
  assert.match(r.erros.codigo, /8 caracteres/);
  assert.match(r.erros.nome, /nome/i);
  assert.match(montarAprovacao({ codigo: "K7MQ-2XDP", nome: "x".repeat(65) }).erros.nome, /64/);
});

const AGORA = Date.parse("2026-11-18T12:00:00Z");

test("linhaDoTelao: ativo por HTTPS com último acesso", () => {
  const l = linhaDoTelao(
    {
      id: 7, nome: "TV Portaria", modo: "https", ativa: true,
      criado_em: "2026-11-18T09:00:00Z", ultimo_acesso: "2026-11-18T11:57:00Z", ultimo_ip: "10.99.0.50",
    },
    AGORA,
  );
  assert.equal(l.id, 7);
  assert.equal(l.nome, "TV Portaria");
  assert.equal(l.modo, "HTTPS");
  assert.equal(l.http, false);
  assert.equal(l.ativa, true);
  assert.equal(l.situacao, "Ativo");
  assert.equal(l.acesso, "Último acesso há 3 minutos · 10.99.0.50");
  assert.equal(l.criado, "Aprovado há 3 horas");
  assert.equal(l.rotuloRevogar, "Revogar TV Portaria");
});

test("linhaDoTelao: HTTP sem acesso ainda; revogado", () => {
  const http = linhaDoTelao(
    { id: 1, nome: "TV Guarita", modo: "http", ativa: true, criado_em: "2026-11-18T11:59:30Z", ultimo_acesso: null, ultimo_ip: null },
    AGORA,
  );
  assert.equal(http.modo, "HTTP sem cifra");
  assert.equal(http.http, true);
  assert.equal(http.acesso, "Ainda não conectou");
  const rev = linhaDoTelao({ id: 2, nome: "TV antiga", modo: "https", ativa: false, criado_em: "2026-11-10T12:00:00Z" }, AGORA);
  assert.equal(rev.ativa, false);
  assert.equal(rev.situacao, "Revogado");
});
