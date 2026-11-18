import test from "node:test";
import assert from "node:assert/strict";
import { textoDoIp } from "../../src/js/lista.js";
import { aparenciaDe } from "../../src/js/teia/aparencia.js";
import {
  COR_FUNDO_ROTULO, COR_TEXTO_ROTULO, criarCacheRotulos, DIAMETRO_MIN_PX, diametroProjetadoPx,
  ENTRADA_MS, MAX_NOS_ROTULO, opacidadeEntrada, rotuloIpVisivel, semSobreposicao,
  tamanhoRotuloPx,
} from "../../src/js/teia/rotulo-ip.js";

test("textoDoIp: IPv4/IPv6 como vêm da API, sem inventar", () => {
  assert.equal(textoDoIp("10.99.1.10"), "10.99.1.10");
  assert.equal(textoDoIp("  10.99.1.10 "), "10.99.1.10");
  assert.equal(textoDoIp("fd00:99::1"), "fd00:99::1");
  assert.equal(textoDoIp(""), "");
  assert.equal(textoDoIp(null), "");
  assert.equal(textoDoIp(undefined), "");
  assert.equal(textoDoIp(1099), "");
  assert.equal(textoDoIp({ toString: () => "10.99.0.1" }), "");
});

test("textoDoIp: texto hostil vira texto (sem controle, sem HTML interpretado)", () => {
  assert.equal(textoDoIp("<img src=x onerror=alert(1)>"), "<img src=x onerror=alert(1)>");
  assert.equal(textoDoIp("10.99.\u0000\u001b[31m1.1‎\n"), "10.99.[31m1.1");
  // um "IP" absurdamente longo não é IP: nada de rótulo (e nunca corte no meio)
  assert.equal(textoDoIp("1".repeat(80)), "");
});

test("diametroProjetadoPx: raio, distância, fov e altura do palco", () => {
  // tan(25°) ~ 0.4663: 900 px / (2 * 100 * 0.4663) = 9.65 px por unidade
  const d = diametroProjetadoPx({ raio: 2.4, distancia: 100, fovGraus: 50, alturaPx: 900 });
  assert.ok(Math.abs(d - 4.8 * 9.65) < 0.2, String(d));
  assert.equal(diametroProjetadoPx({ raio: 2.4, distancia: 0, fovGraus: 50, alturaPx: 900 }), Infinity);
  assert.equal(diametroProjetadoPx({ raio: 2.4, distancia: 100, fovGraus: 50, alturaPx: 0 }), 0);
});

test("rotuloIpVisivel: some abaixo de 24 px de esfera na tela e acima de 3000 nós", () => {
  assert.equal(DIAMETRO_MIN_PX, 24);
  assert.equal(MAX_NOS_ROTULO, 3000);
  assert.equal(rotuloIpVisivel({ diametroPx: 8, totalNos: 300 }), false);
  assert.equal(rotuloIpVisivel({ diametroPx: 23.9, totalNos: 300 }), false);
  assert.equal(rotuloIpVisivel({ diametroPx: 24, totalNos: 300 }), true);
  assert.equal(rotuloIpVisivel({ diametroPx: 400, totalNos: 1000 }), true);
  assert.equal(rotuloIpVisivel({ diametroPx: 400, totalNos: 3000 }), true);
  assert.equal(rotuloIpVisivel({ diametroPx: 400, totalNos: 3001 }), false);
  assert.equal(rotuloIpVisivel({ diametroPx: Number.NaN, totalNos: 10 }), false);
});

test("opacidadeEntrada: entra esmaecendo em ENTRADA_MS e depois fica plena", () => {
  assert.equal(opacidadeEntrada(0), 0);
  assert.equal(opacidadeEntrada(Number.NaN), 0);
  assert.ok(Math.abs(opacidadeEntrada(ENTRADA_MS / 2) - 0.5) < 1e-9);
  assert.equal(opacidadeEntrada(ENTRADA_MS), 1);
  assert.equal(opacidadeEntrada(60_000), 1);
});

test("tamanhoRotuloPx: letra legível e limitada, cresce com a esfera", () => {
  assert.equal(tamanhoRotuloPx(24), 11);
  assert.equal(tamanhoRotuloPx(1000), 15);
  const a = tamanhoRotuloPx(40), b = tamanhoRotuloPx(45);
  assert.ok(a >= 11 && b >= a && b <= 15);
});

// contraste WCAG: texto do rótulo sobre a pílula composta por cima de cada cor de esfera
function lum(hex) {
  const n = parseInt(hex.slice(1), 16);
  const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}
const razao = (a, b) => (Math.max(lum(a), lum(b)) + 0.05) / (Math.min(lum(a), lum(b)) + 0.05);
function compor(fundo, sob) {
  const m = COR_FUNDO_ROTULO.match(/^rgba\((\d+),(\d+),(\d+),([\d.]+)\)$/);
  const [r, g, b, a] = [Number(m[1]), Number(m[2]), Number(m[3]), Number(m[4])];
  const n = parseInt(sob.slice(1), 16);
  const s = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  const c = [r, g, b].map((v, i) => Math.round(a * v + (1 - a) * s[i]));
  void fundo;
  return `#${c.map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}

test("rótulo: contraste AA (>= 4.5) sobre a esfera de todo estado, até sob brilho branco", () => {
  const estados = ["online", "instavel", "suspeito", "offline", "pausado", "inalcancavel", "desconhecido"];
  const cores = [...new Set(estados.map((e) => aparenciaDe(e).cor)), "#FFFFFF", "#0E1016", "#7A8194"];
  for (const cor of cores) {
    const r = razao(COR_TEXTO_ROTULO, compor(COR_FUNDO_ROTULO, cor));
    assert.ok(r >= 4.5, `${cor}: ${r.toFixed(2)}`);
  }
});

test("rótulo: texto abaixo do limiar do bloom (0.55) para não acender nem borrar", () => {
  assert.ok(lum(COR_TEXTO_ROTULO) < 0.55, String(lum(COR_TEXTO_ROTULO)));
});

test("criarCacheRotulos: um recurso por texto, LRU que não descarta o que está em uso", () => {
  const criados = [], liberados = [];
  const cache = criarCacheRotulos({
    limite: 2,
    criar: (texto) => { criados.push(texto); return { texto }; },
    liberar: (r) => liberados.push(r.texto),
  });
  const a = cache.obter("10.99.0.1", 1);
  assert.equal(cache.obter("10.99.0.1", 1), a);
  cache.obter("10.99.0.2", 1);
  cache.obter("10.99.0.3", 1); // 3 em uso no quadro 1: nada sai
  assert.deepEqual(liberados, []);
  assert.equal(cache.tamanho, 3);
  cache.obter("10.99.0.3", 2);
  cache.obter("10.99.0.4", 2); // quadro 2: sai o menos recente fora de uso
  assert.deepEqual(liberados, ["10.99.0.1", "10.99.0.2"]);
  assert.equal(cache.tamanho, 2);
  assert.deepEqual(criados, ["10.99.0.1", "10.99.0.2", "10.99.0.3", "10.99.0.4"]);
  cache.liberarTudo();
  assert.equal(cache.tamanho, 0);
  assert.deepEqual(liberados.sort(), ["10.99.0.1", "10.99.0.2", "10.99.0.3", "10.99.0.4"]);
});

test("rótulo de IP: desligado por padrão na cena, ligado só pelo painel (telão sem IP)", async () => {
  const { readFile } = await import("node:fs/promises");
  const ler = (p) => readFile(new URL(`../../src/js/${p}`, import.meta.url), "utf8");
  assert.match(await ler("teia/cena.js"), /const rotulosIp = opcoes\.rotulosIp === true;/);
  assert.match(await ler("teia-pagina.js"), /rotulosIp: true/);
  assert.doesNotMatch(await ler("parede/principal.js"), /rotulosIp/);
});

test("semSobreposicao: na ordem de prioridade, quem encosta num já posto fica de fora", () => {
  // caixas centradas: {x, y, l, a} em px
  const caixas = [
    { x: 100, y: 100, l: 80, a: 20 }, // posto
    { x: 150, y: 105, l: 80, a: 20 }, // cruza o 1º: fora
    { x: 100, y: 124, l: 80, a: 20 }, // logo abaixo do 1º, com folga de 4 px: posto
    { x: 300, y: 100, l: 80, a: 20 }, // longe: posto
    { x: 100, y: 121, l: 80, a: 20 }, // a 1 px do 1º (folga 2): fora
  ];
  assert.deepEqual(semSobreposicao(caixas, 2), [true, false, true, true, false]);
  assert.deepEqual(semSobreposicao([], 2), []);
  // obstáculos fixos (painel, rótulo de classe) contam como já postos
  const painel = { x: 40, y: 100, l: 80, a: 400 };
  assert.deepEqual(semSobreposicao([caixas[0], caixas[3]], 2, [painel]), [false, true]);
});
