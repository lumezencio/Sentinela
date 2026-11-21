import test from "node:test";
import assert from "node:assert/strict";
import {
  barrasPorHora, linhaDoIncidente, PERIODOS, resumoDoPeriodo, urlDoCsv, visaoDoDiagnostico,
} from "../../src/js/diagnostico.js";

const FUSO = "America/Sao_Paulo";

function incidente(extra = {}) {
  return {
    inicio: "2026-11-19T22:04:10Z", // 19:04 em São Paulo (UTC-3)
    fim: "2026-11-19T22:05:40Z",
    duracao_s: 90,
    tipo: "roteador_reiniciou",
    certeza: "provavel",
    rotulo: "Roteador reiniciou (provável)",
    porque: ["O gateway e os aparelhos de trás caíram juntos e voltaram juntos em 90 s."],
    sugestoes: ["Trocar a fonte do roteador.", "Ligar o roteador num nobreak."],
    equipamentos: [
      { id: "a", nome: "Roteador da casa (demo)", classe: "roteador" },
      { id: "b", nome: "Câmera da entrada (demo)", classe: "camera" },
    ],
    equipamentos_total: 2,
    ...extra,
  };
}

test("test_barras_24_proporcionais_e_zeros", () => {
  const horas = Array.from({ length: 24 }, () => 0);
  horas[19] = 6;
  horas[3] = 3;
  horas[7] = 1;
  const b = barrasPorHora(horas);
  assert.equal(b.length, 24);
  assert.deepEqual(b.map((x) => x.hora), Array.from({ length: 24 }, (_, i) => i));
  assert.equal(b[19].altura, 100);
  assert.equal(b[19].rotulo, "19 h: 6 incidentes");
  assert.equal(b[3].altura, 50);
  assert.equal(b[7].rotulo, "7 h: 1 incidente");
  assert.ok(b[7].altura > 0 && b[7].altura < 50, "queda isolada continua visível");
  assert.equal(b[0].altura, 0);
  assert.equal(b[0].rotulo, "0 h: 0 incidentes");
  // sem nenhum incidente: tudo zero, sem dividir por zero
  assert.ok(barrasPorHora(Array(24).fill(0)).every((x) => x.altura === 0));
  // entrada torta: completa para 24 e trata lixo como zero
  const torta = barrasPorHora([2, "x", -4, null]);
  assert.equal(torta.length, 24);
  assert.deepEqual(torta.slice(0, 4).map((x) => x.total), [2, 0, 0, 0]);
  assert.equal(barrasPorHora(undefined).length, 24);
});

test("test_linha_do_incidente_no_fuso_com_porque_e_sugestoes", () => {
  const l = linhaDoIncidente(incidente(), FUSO);
  assert.equal(l.quando, "19/11/2026 19:04");
  assert.equal(l.duracao, "2 min"); // 90 s arredonda como o resto do painel
  assert.equal(l.rotulo, "Roteador reiniciou (provável)");
  assert.deepEqual(l.porque, incidente().porque);
  assert.deepEqual(l.equipamentos, ["Roteador da casa (demo)", "Câmera da entrada (demo)"]);
  assert.deepEqual(l.sugestoes, incidente().sugestoes);
  assert.equal(l.classe, "dg-tipo-roteador_reiniciou");
  assert.equal(l.maisEquipamentos, "");
  // outro fuso muda a hora; o mesmo instante
  assert.equal(linhaDoIncidente(incidente(), "UTC").quando, "19/11/2026 22:04");
  // em andamento, nome longo inteiro (sem corte), lista cortada pelo servidor
  const nome = "Câmera ".repeat(60).trim();
  const aberto = linhaDoIncidente(
    incidente({
      fim: null, duracao_s: 3600, certeza: "confirmado", rotulo: "Roteador reiniciou (confirmado)",
      equipamentos: [{ id: "x", nome, classe: "camera" }], equipamentos_total: 250,
    }),
    FUSO,
  );
  assert.match(aberto.duracao, /^1 h/);
  assert.match(aberto.duracao, /ainda fora/);
  assert.equal(aberto.equipamentos[0], nome);
  assert.equal(aberto.maisEquipamentos, "e mais 249 aparelhos");
  assert.match(aberto.rotulo, /confirmado/);
  // tipo desconhecido não vira classe CSS arbitrária; texto hostil perde só os controles
  const hostil = linhaDoIncidente(
    incidente({ tipo: '"><img src=x>', equipamentos: [{ id: "h", nome: "<b>x</b>\u0007y", classe: "c" }] }),
    FUSO,
  );
  assert.equal(hostil.classe, "dg-tipo-outro");
  assert.equal(hostil.equipamentos[0], "<b>x</b>y");
});

test("test_resumo_com_tempo_fora_formatado", () => {
  const r = resumoDoPeriodo({
    incidentes: 31, fora_s: 7500,
    por_tipo: { queda_isolada: 3, roteador_reiniciou: 25, instabilidade: 1, tipo_novo: 2, pai_derrubou_filhos: 0 },
  });
  assert.equal(r.fora, "2 h 5 min");
  assert.equal(r.total, 31);
  assert.deepEqual(r.itens[0], { rotulo: "Roteador reiniciou", total: 25 });
  assert.deepEqual(r.itens.map((i) => i.total), [25, 3, 2, 1]); // maiores primeiro, zeros fora
  assert.equal(resumoDoPeriodo({ incidentes: 0, por_tipo: {}, fora_s: 0 }).fora, "0 s");
  assert.deepEqual(resumoDoPeriodo(null).itens, []);
});

test("test_url_do_csv_so_periodos_validos", () => {
  assert.deepEqual(PERIODOS, ["24h", "7d", "30d"]);
  for (const p of PERIODOS) assert.equal(urlDoCsv(p), `/api/v1/diagnostico/laudo.csv?periodo=${p}`);
  for (const ruim of ["", "1h", "24H", "7d&x=1", "../x", undefined, null, 7]) {
    assert.equal(urlDoCsv(ruim), "", String(ruim));
  }
});

test("visao: vazio positivo, truncado, sugestões por tipo e pico", () => {
  const base = {
    periodo: "24h", de: "2026-11-19T18:00:00Z", ate: "2026-11-20T18:00:00Z",
    resumo: { incidentes: 0, por_tipo: {}, fora_s: 0 }, horas: Array(24).fill(0), incidentes: [],
    gateway_configurado: true, truncado: false, aviso_energia: "energia", aviso_gateway: null,
  };
  const vazio = visaoDoDiagnostico(base, FUSO, "2026-11-20T18:00:00Z");
  assert.equal(vazio.vazio, true);
  assert.equal(vazio.pico, "");
  assert.equal(vazio.avisoGateway, "");
  assert.match(vazio.periodoTexto, /19\/11\/2026 15:00/);
  assert.match(vazio.periodoTexto, /20\/11\/2026 15:00/);

  const horas = Array(24).fill(0);
  horas[19] = 2;
  const cheio = visaoDoDiagnostico(
    {
      ...base, horas, truncado: true, gateway_configurado: false, aviso_gateway: "Sem gateway",
      resumo: { incidentes: 2, por_tipo: { roteador_reiniciou: 2 }, fora_s: 180 },
      incidentes: [incidente(), incidente({ inicio: "2026-11-18T22:00:00Z" })],
    },
    FUSO,
    "2026-11-20T18:00:00Z",
  );
  assert.equal(cheio.vazio, false);
  assert.equal(cheio.truncado, true);
  assert.equal(cheio.avisoGateway, "Sem gateway");
  assert.equal(cheio.pico, "Pico às 19 h: 2 incidentes");
  assert.equal(cheio.incidentes.length, 2);
  assert.equal(cheio.sugestoesPorTipo.length, 1);
  assert.equal(cheio.sugestoesPorTipo[0].rotulo, "Roteador reiniciou");
  assert.deepEqual(cheio.sugestoesPorTipo[0].sugestoes, incidente().sugestoes);
});
