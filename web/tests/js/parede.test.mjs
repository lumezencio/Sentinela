// Telão /parede: medidor de FPS, contadores, faixa de alertas, conexão, relógio no fuso,
// passos do emparelhamento e a sintaxe do bundle gerado (ES2017 para TVs).
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { criarMedidorFps, criarVigiaDaCena } from "../../src/js/parede/fps.js";
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

test("fps: TV travada com a página visível (lacuna > 2 s) conta como lentidão", () => {
  const m = criarMedidorFps();
  quadros(m, 0, 1000, 16);
  m.quadro(12000); // 11 s sem desenhar nenhum quadro
  assert.equal(m.deveTrocar(), true);
});

test("fps: reiniciar() (troca de visibilidade) zera a medida; aba oculta não é lentidão", () => {
  const m = criarMedidorFps();
  quadros(m, 0, 8000, 50); // 8 s lentos
  m.reiniciar(); // aba oculta
  m.quadro(60000); // visível de novo, 52 s depois
  quadros(m, 60050, 63000, 50);
  assert.equal(m.deveTrocar(), false, "só 3 s lentos desde a volta");
  const n = criarMedidorFps();
  n.quadro(0);
  n.reiniciar();
  quadros(n, 60000, 63000, 16);
  assert.equal(n.deveTrocar(), false);
});

test("vigia: câmera parada 5 s com a rotação ligada = cena congelada", () => {
  const v = criarVigiaDaCena();
  assert.equal(v.amostra("0,260,520", true, 0), false);
  assert.equal(v.amostra("10,260,519", true, 1000), false);
  assert.equal(v.amostra("10,260,519", true, 5999), false);
  assert.equal(v.amostra("10,260,519", true, 6000), true);
  assert.equal(v.amostra("20,260,518", true, 7000), false, "voltou a mexer");
});

test("vigia: sem rotação, sem leitura ou depois de reiniciar() não acusa", () => {
  const v = criarVigiaDaCena({ paradaMs: 2000 });
  v.amostra("1,1,1", false, 0);
  assert.equal(v.amostra("1,1,1", false, 10000), false, "rotação desligada: parada é normal");
  assert.equal(v.amostra(undefined, true, 20000), false, "cena ainda sem data-camera");
  v.amostra("2,2,2", true, 30000);
  v.reiniciar();
  assert.equal(v.amostra("2,2,2", true, 33000), false, "reiniciar recomeça a contagem");
  assert.equal(v.amostra("2,2,2", true, 35000), true);
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
  // escape de propriedade Unicode em regex (\p{...}) só existe a partir do Chrome 64
  assert.doesNotMatch(texto, /\\[pP]\{/, "regex com \\p{...}");
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
  assert.doesNotMatch(texto, /\\[pP]\{/, "regex com \\p{...}");
});

// APIs posteriores ao Chromium 63 (TV Tizen 5.0): o bundle do telão não pode usá-las, salvo as
// que compat.js completa (Object.hasOwn).
const DEPOIS_DO_CHROME_63 = [
  "RelativeTimeFormat", "globalThis", "AbortController", "queueMicrotask", "replaceAll",
  "structuredClone", ".at(", "Object.fromEntries", "flatMap", "Promise.allSettled", "matchAll",
];

test("bundle do telão: nenhuma API posterior ao Chromium 63 (além do que compat.js completa)", () => {
  const texto = readFileSync(new URL("../../src/parede/parede.bundle.js", import.meta.url), "utf8");
  const achadas = DEPOIS_DO_CHROME_63.filter((api) => texto.includes(api));
  assert.deepEqual(achadas, []);
});

test("haQuanto: sem Intl.RelativeTimeFormat (TV antiga) cai em texto simples", async () => {
  const original = Intl.RelativeTimeFormat;
  try {
    delete Intl.RelativeTimeFormat;
    const { haQuanto } = await import(`../../src/js/lista.js?sem-rtf=${Date.now()}`);
    const agora = Date.parse("2026-11-18T12:00:00Z");
    assert.equal(haQuanto("2026-11-18T11:57:00Z", agora), "há 3 minutos");
    assert.equal(haQuanto("2026-11-18T11:59:00Z", agora), "há 1 minuto");
    assert.equal(haQuanto("2026-11-18T09:00:00Z", agora), "há 3 horas");
    assert.equal(haQuanto("2026-11-16T12:00:00Z", agora), "há 2 dias");
    assert.equal(haQuanto("2026-11-18T12:30:00Z", agora), "em 30 minutos");
  } finally {
    Intl.RelativeTimeFormat = original;
  }
});
