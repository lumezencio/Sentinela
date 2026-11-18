// Telão /parede: medidor de FPS, contadores, faixa de alertas, conexão, relógio no fuso,
// passos do emparelhamento e a sintaxe do bundle gerado (ES2017 para TVs).
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { criarMedidorFps } from "../../src/js/parede/fps.js";
import {
  contadoresDaParede, estadoDaConexao, faixaDeAlertas, horaNoFuso, textoDosRestantes,
} from "../../src/js/parede/estado.js";
import { proximoPasso, validadeDoCodigoMs } from "../../src/js/parede/emparelhar.js";

/** Quadros a cada `passo` ms de `de` até `ate` (inclusive). Devolve o último instante. */
function quadros(medidor, de, ate, passo) {
  let t = de;
  for (; t <= ate; t += passo) medidor.quadro(t);
  return t - passo;
}

test("fps: 20 FPS por 9,9 s não troca; aos 10 s troca", () => {
  const m = criarMedidorFps();
  // o 1º quadro só marca o início; abaixo de 30 desde o 2º (t = 50)
  quadros(m, 0, 9950, 50);
  assert.equal(m.deveTrocar(), false, "9,9 s abaixo do limite ainda não troca");
  m.quadro(10050);
  assert.equal(m.deveTrocar(), true, "10 s abaixo do limite troca");
});

test("fps: 60 FPS nunca troca", () => {
  const m = criarMedidorFps();
  quadros(m, 0, 30000, 1000 / 60);
  assert.equal(m.deveTrocar(), false);
});

test("fps: oscilação acima do limite zera a contagem", () => {
  const m = criarMedidorFps();
  let t = quadros(m, 0, 8000, 50); // 8 s a 20 FPS
  t = quadros(m, t + 16, t + 3000, 16); // 3 s a 60 FPS
  assert.equal(m.deveTrocar(), false);
  t = quadros(m, t + 50, t + 8000, 50); // mais 8 s a 20 FPS: 8 s < 10 s desde a volta
  assert.equal(m.deveTrocar(), false, "a contagem recomeçou depois da subida");
  quadros(m, t + 50, t + 4000, 50);
  assert.equal(m.deveTrocar(), true);
});

test("fps: limite e janela configuráveis", () => {
  const m = criarMedidorFps({ limite: 50, janelaMs: 2000 });
  quadros(m, 0, 2100, 25); // 40 FPS < 50
  assert.equal(m.deveTrocar(), true);
});

test("fps: aba oculta (intervalo enorme entre quadros) não conta como lentidão", () => {
  const m = criarMedidorFps();
  m.quadro(0);
  m.quadro(60000); // a TV não desenhou por 1 min (aba oculta): recomeça a medida
  quadros(m, 60016, 63000, 16);
  assert.equal(m.deveTrocar(), false);
});

test("contadores: online (com suspeito), instável, offline e inalcançável", () => {
  const itens = [
    { estado: "online" }, { estado: "suspeito" }, { estado: "online" },
    { estado: "instavel" },
    { estado: "offline" }, { estado: "offline" },
    { estado: "inalcancavel" }, { estado: "inalcancavel" }, { estado: "inalcancavel" },
    { estado: "pausado" }, { estado: "desconhecido" },
  ];
  assert.deepEqual(contadoresDaParede(itens), { online: 3, instavel: 1, offline: 2, inalcancavel: 3 });
  assert.deepEqual(contadoresDaParede(new Map(itens.map((x, i) => [i, x])).values()), {
    online: 3, instavel: 1, offline: 2, inalcancavel: 3,
  });
  assert.deepEqual(contadoresDaParede([]), { online: 0, instavel: 0, offline: 0, inalcancavel: 0 });
});

test("faixa: 9 alertas → 6 visíveis (mais novos primeiro) + 'e mais 3'", () => {
  const alertas = Array.from({ length: 9 }, (_, i) => ({
    id: i + 1,
    tipo: "queda",
    texto: `Equipamento ${i + 1} caiu`,
    aberto_em: `2026-11-18T1${i}:00:00+00:00`,
  }));
  const { visiveis, restantes } = faixaDeAlertas(alertas);
  assert.equal(visiveis.length, 6);
  assert.equal(restantes, 3);
  assert.deepEqual(visiveis.map((a) => a.id), [9, 8, 7, 6, 5, 4]);
  assert.equal(textoDosRestantes(restantes), "e mais 3");
  assert.equal(textoDosRestantes(1), "e mais 1");
  assert.equal(textoDosRestantes(0), "");
});

test("faixa: até 6 cabem todas; max configurável; entrada inválida vira vazio", () => {
  const tres = [1, 2, 3].map((id) => ({ id, texto: "x", aberto_em: `2026-11-18T10:0${id}:00Z` }));
  assert.deepEqual(faixaDeAlertas(tres).restantes, 0);
  assert.equal(faixaDeAlertas(tres).visiveis.length, 3);
  assert.deepEqual(faixaDeAlertas(tres, 2).visiveis.map((a) => a.id), [3, 2]);
  assert.deepEqual(faixaDeAlertas(null), { visiveis: [], restantes: 0 });
});

test("conexão: sem conexão só depois de 60 s sem contato", () => {
  assert.equal(estadoDaConexao(0, 60000), "ok");
  assert.equal(estadoDaConexao(0, 60001), "sem_conexao");
  assert.equal(estadoDaConexao(1000, 1000), "ok");
});

test("relógio: hora no fuso configurado, HH:MM em 24 h", () => {
  const data = new Date("2026-11-18T17:32:10Z");
  assert.equal(horaNoFuso(data, "America/Sao_Paulo"), "14:32");
  assert.equal(horaNoFuso(data, "UTC"), "17:32");
  assert.equal(horaNoFuso(new Date("2026-11-18T03:05:00Z"), "America/Sao_Paulo"), "00:05");
  // fuso inválido não quebra o telão: cai no fuso do navegador, ainda HH:MM
  assert.match(horaNoFuso(data, "Fuso/Inexistente"), /^\d{2}:\d{2}$/);
});

test("emparelhamento: próximo passo por status da consulta", () => {
  assert.equal(proximoPasso(202), "esperar");
  assert.equal(proximoPasso(200), "entrar");
  assert.equal(proximoPasso(410), "novo_codigo");
  assert.equal(proximoPasso(401), "novo_codigo");
  // rede fora, 429 e erro do servidor: espera e consulta de novo
  for (const s of [0, 429, 500, 502, 503]) assert.equal(proximoPasso(s), "esperar", String(s));
});

test("emparelhamento: validade do código pelo relógio do servidor, com teto de 10 min", () => {
  const agora = Date.parse("2026-11-18T12:00:00Z");
  assert.equal(validadeDoCodigoMs("2026-11-18T12:10:00+00:00", agora), 600000);
  assert.equal(validadeDoCodigoMs("2026-11-18T12:04:00Z", agora), 240000);
  // relógio da TV errado (data no passado ou longe no futuro) ou texto inválido: 10 min
  assert.equal(validadeDoCodigoMs("2026-11-18T11:00:00Z", agora), 600000);
  assert.equal(validadeDoCodigoMs("2026-11-19T12:00:00Z", agora), 600000);
  assert.equal(validadeDoCodigoMs("lixo", agora), 600000);
});

test("bundle do telão: sem sintaxe posterior ao ES2017 e sem sourcemap", () => {
  const texto = readFileSync(new URL("../../src/parede/parede.bundle.js", import.meta.url), "utf8");
  assert.ok(texto.length > 1000, "bundle vazio: rode bash build/construir-teia.sh");
  // `?.` seguido de dígito é um ternário com decimal minificado (a?.5:1), não encadeamento
  assert.doesNotMatch(texto, /\?\.(?!\d)/, "encadeamento opcional (?.)");
  assert.doesNotMatch(texto, /\?\?/, "coalescência nula (??)");
  assert.doesNotMatch(texto, /class\s*[\w$]*\s*(extends\s+[\w$.]+\s*)?\{\s*[\w$]+\s*=/, "campo de classe");
  assert.doesNotMatch(texto, /#[A-Za-z_$][\w$]*\s*(=|;|\(|in\b)/, "membro privado (#)");
  assert.doesNotMatch(texto, /sourceMappingURL/);
  assert.doesNotMatch(texto, /\beval\(/);
});

test("bundle da Teia do telão: ESM ES2017 que publica window.SentinelaTeiaParede", () => {
  const texto = readFileSync(new URL("../../src/parede/teia-parede.bundle.js", import.meta.url), "utf8");
  assert.match(texto, /SentinelaTeiaParede/);
  assert.doesNotMatch(texto, /\?\.(?!\d)/);
  assert.doesNotMatch(texto, /\?\?/);
  assert.doesNotMatch(texto, /sourceMappingURL/);
  assert.doesNotMatch(texto, /createElement\(["']style["']\)/);
  assert.doesNotMatch(texto, /WebGPURenderer/);
  assert.doesNotMatch(texto, /window\.scene\s*=/);
});
