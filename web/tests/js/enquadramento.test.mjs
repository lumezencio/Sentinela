import test from "node:test";
import assert from "node:assert/strict";
import {
  alinhamentoAtras, direcaoDeAproximacao, distanciaParaRaio, DIST_MAX_ROTULO, enquadrar,
  ESCALA_ROTULO, manterRotuloNoPalco, posicaoDoRotulo, projetarNaTela, raioEnvolvente,
} from "../../src/js/teia/enquadramento.js";

const perto = (a, b, eps = 1e-6) => assert.ok(Math.abs(a - b) < eps, `${a} != ${b}`);
const ORIGEM = { x: 0, y: 0, z: 0 };

test("raioEnvolvente: maior distância ao centro + margem, com mínimo", () => {
  const c = { x: 10, y: 0, z: 0 };
  perto(raioEnvolvente(c, [{ x: 13, y: 4, z: 0 }, { x: 10, y: 0, z: 2 }], 1), 6);
  perto(raioEnvolvente(c, [], 0, 20), 20);
});

test("distanciaParaRaio: R / sin(fov/2) × 1,15; painéis (fração menor) afastam", () => {
  perto(distanciaParaRaio(50, 60), (50 / Math.sin(Math.PI / 6)) * 1.15);
  assert.ok(distanciaParaRaio(50, 60, { fracao: 0.6 }) > distanciaParaRaio(50, 60));
  // tela estreita (retrato): o lado horizontal manda
  assert.ok(distanciaParaRaio(50, 60, { aspecto: 0.5 }) > distanciaParaRaio(50, 60));
  // dobra o raio, dobra a distância
  perto(distanciaParaRaio(100, 50) / distanciaParaRaio(50, 50), 2);
});

test("direcaoDeAproximacao: unitária, com elevação e nunca colinear com o servidor", () => {
  for (const p of [{ x: 230, y: 40, z: 0 }, { x: -100, y: -60, z: 180 }, { x: 0, y: 0, z: -230 }]) {
    const d = direcaoDeAproximacao(ORIGEM, p);
    perto(Math.hypot(d.x, d.y, d.z), 1);
    assert.ok(d.y > 0.3);
    const raio = Math.hypot(p.x, p.y, p.z);
    const cos = (d.x * p.x + d.y * p.y + d.z * p.z) / raio;
    assert.ok(cos < Math.cos((25 * Math.PI) / 180), `quase colinear: ${cos}`);
  }
  // alvo exatamente acima do "de" (estilo E): direção padrão, sem NaN
  const d = direcaoDeAproximacao({ x: 0, y: 200, z: 0 }, { x: 0, y: 40, z: 0 });
  assert.ok(Number.isFinite(d.x + d.y + d.z));
});

test("enquadrar: servidor não fica atrás do alvo; distância cresce com o raio", () => {
  const alvo = { x: 230, y: 40, z: 0 };
  const e = enquadrar({ alvo, de: ORIGEM, raio: 60, fov: 50, largura: 1280, altura: 740 });
  // o servidor (origem) não está na linha de visão logo atrás do alvo
  assert.ok(alinhamentoAtras(e.camera, alvo, ORIGEM) < 0.9);
  const e2 = enquadrar({ alvo, de: ORIGEM, raio: 120, fov: 50, largura: 1280, altura: 740 });
  perto(e2.distancia / e.distancia, 2);
  // sem painéis o alvo fica no centro
  const s = projetarNaTela(alvo, e.camera, e.olhar, 50, 740);
  perto(s.x, 0, 1e-6);
  perto(s.y, 0, 1e-6);
});

test("enquadrar: alvo no centro da área livre (painel à esquerda/direita e folha de baixo)", () => {
  const alvo = { x: -80, y: 30, z: 200 };
  const fov = 50, largura = 1280, altura = 740;
  const margens = { esquerda: 304, direita: 372 };
  const e = enquadrar({ alvo, de: ORIGEM, raio: 50, fov, largura, altura, margens });
  const s = projetarNaTela(alvo, e.camera, e.olhar, fov, altura);
  perto(s.x, (304 - 372) / 2, 1e-6);
  perto(s.y, 0, 1e-6);
  const m = enquadrar({ alvo, de: ORIGEM, raio: 50, fov, largura: 360, altura: 640, margens: { cima: 120, baixo: 360 } });
  const t = projetarNaTela(alvo, m.camera, m.olhar, fov, 640);
  perto(t.x, 0, 1e-6);
  perto(t.y, (360 - 120) / 2, 1e-6); // acima do centro: fora da folha de baixo
});

test("posicaoDoRotulo: atrás da câmera, longe ou fora da tela → escondido; escala limitada", () => {
  assert.equal(posicaoDoRotulo({ ndc: { x: 0, y: 0, z: 1.2 }, distancia: 100, largura: 800, altura: 600 }).visivel, false);
  assert.equal(posicaoDoRotulo({ ndc: { x: 0, y: 0, z: 0.5 }, distancia: DIST_MAX_ROTULO + 1, largura: 800, altura: 600 }).visivel, false);
  assert.equal(posicaoDoRotulo({ ndc: { x: 1.5, y: 0, z: 0.5 }, distancia: 100, largura: 800, altura: 600 }).visivel, false);
  const r = posicaoDoRotulo({ ndc: { x: 0, y: 0.5, z: 0.5 }, distancia: 420, largura: 800, altura: 600 });
  assert.deepEqual(r, { visivel: true, x: 400, y: 150, escala: 1 });
  assert.equal(posicaoDoRotulo({ ndc: { x: 0, y: 0, z: 0.5 }, distancia: 10, largura: 800, altura: 600 }).escala, ESCALA_ROTULO.max);
  assert.equal(posicaoDoRotulo({ ndc: { x: 0, y: 0, z: 0.5 }, distancia: 1400, largura: 800, altura: 600 }).escala, ESCALA_ROTULO.min);
});

test("manterRotuloNoPalco: caixa perto da borda desliza para dentro; âncora fora some", () => {
  const base = { largura: 100, altura: 24, palcoL: 800, palcoA: 600, desloque: 14, folga: 4 };
  // no meio: não mexe
  assert.deepEqual(manterRotuloNoPalco({ ...base, x: 400, y: 300 }), { visivel: true, x: 400, y: 300 });
  // borda direita: o centro recua para a caixa terminar na folga
  const d = manterRotuloNoPalco({ ...base, x: 790, y: 300 });
  assert.equal(d.x + 50, 796);
  // borda esquerda
  const e = manterRotuloNoPalco({ ...base, x: 3, y: 300 });
  assert.equal(e.x - 50, 4);
  // embaixo: topo da caixa (y + deslocamento) + altura cabe no palco
  const b = manterRotuloNoPalco({ ...base, x: 400, y: 599 });
  assert.equal(b.y + 14 + 24, 596);
  // em cima: a caixa (abaixo da âncora) já fica dentro
  const c = manterRotuloNoPalco({ ...base, x: 400, y: 0 });
  assert.ok(c.y + 14 >= 4);
  // âncora fora do palco: some
  assert.equal(manterRotuloNoPalco({ ...base, x: -5, y: 300 }).visivel, false);
  assert.equal(manterRotuloNoPalco({ ...base, x: 400, y: 601 }).visivel, false);
  // mais larga que o palco: centraliza (nunca passa a folga do mesmo lado errado)
  assert.equal(manterRotuloNoPalco({ ...base, largura: 900, x: 100, y: 300 }).x, 400);
});

test("manterRotuloNoPalco: rótulo ACIMA da âncora (desloque negativo) fica inteiro dentro do palco", () => {
  const altura = 40, desloque = -(14 + altura), palcoA = 600;
  for (const y of [0, 10, 30, 300, 590, 600]) {
    const r = manterRotuloNoPalco({
      x: 400, y, largura: 100, altura, palcoL: 800, palcoA, desloque, folga: 4,
    });
    assert.equal(r.visivel, true);
    assert.ok(r.y + desloque >= 4, `topo ${r.y + desloque}`);
    assert.ok(r.y + desloque + altura <= palcoA - 4, `base ${r.y + desloque + altura}`);
  }
});
