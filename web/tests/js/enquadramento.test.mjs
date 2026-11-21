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

// ---------- vista geral na área livre ----------
import { enquadrarVistaGeral, rotulosQueCabem, separarRotulos } from "../../src/js/teia/enquadramento.js";

function hubsEmAnel(n, raio = 230) {
  return Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2;
    return { x: Math.cos(a) * raio, y: i % 2 ? -60 : 60, z: Math.sin(a) * raio, raio: 60, rotulo: true };
  });
}

for (const n of [1, 4, 12]) {
  test(`enquadrarVistaGeral: ${n} classe(s) cabem na área livre (1366x900 girando; 360x740 no mínimo parado)`, () => {
    const pontos = [{ x: 0, y: 0, z: 0, raio: 20, rotulo: true }, ...hubsEmAnel(n)];
    for (const [largura, altura, margens] of [
      [1366, 900, { esquerda: 300, cima: 130, baixo: 70 }],
      [360, 740, { cima: 330, baixo: 100 }],
    ]) {
      const v = enquadrarVistaGeral({
        pontos, alvo: { x: 0, y: 0, z: 0 }, direcao: { x: 0, y: 260, z: 520 }, fov: 50, largura, altura, margens,
      });
      assert.ok(v.coube, `${n} ${largura}`);
      if (largura === 1366) assert.ok(v.girar, `${n} cabe girando em 1366`);
      const livre = {
        x0: margens.esquerda ?? 0, x1: largura - (margens.direita ?? 0),
        y0: margens.cima ?? 0, y1: altura - (margens.baixo ?? 0),
      };
      for (let g = 0; g < (v.girar ? 12 : 1); g++) {
        const c = Math.cos((g * Math.PI) / 6), s = Math.sin((g * Math.PI) / 6);
        for (const p of pontos) {
          const q = { x: p.x * c + p.z * s, y: p.y, z: -p.x * s + p.z * c };
          const t = projetarNaTela(q, v.camera, v.olhar, 50, altura);
          const px = largura / 2 + t.x + v.desvio.x, py = altura / 2 - t.y - v.desvio.y;
          assert.ok(px >= livre.x0 && px <= livre.x1 && py >= livre.y0 && py <= livre.y1,
            `${n} classes, ${largura}px, giro ${g}: (${px.toFixed(0)}, ${py.toFixed(0)}) fora de ${JSON.stringify(livre)}`);
        }
      }
    }
  });
}

test("enquadrarVistaGeral: o desvio centra o desenho na área livre descentrada", () => {
  const pontos = [{ x: 0, y: 0, z: 0, raio: 20, rotulo: true }, ...hubsEmAnel(4)];
  const v = enquadrarVistaGeral({
    pontos, alvo: { x: 0, y: 0, z: 0 }, direcao: { x: 0, y: 260, z: 520 }, fov: 50,
    largura: 1366, altura: 900, margens: { esquerda: 300 },
  });
  assert.ok(v.desvio.x > 100, `desvio x ${v.desvio.x}`); // painel à esquerda: o desenho vai para a direita
});

test("separarRotulos: sobrepostos se afastam na vertical; separados ficam; o 1º não se move", () => {
  const dy = separarRotulos([
    { x: 100, topo: 100, l: 80, a: 20 },
    { x: 110, topo: 105, l: 80, a: 20 },
    { x: 400, topo: 100, l: 80, a: 20 },
  ], { limite: 900 });
  assert.equal(dy[0], 0);
  assert.notEqual(dy[1], 0);
  assert.equal(dy[2], 0);
  assert.ok(Math.abs(dy[1]) >= 19, `deslocamento ${dy[1]}`);
});

test("separarRotulos: vários empilhados nunca se tocam", () => {
  const caixas = Array.from({ length: 5 }, (_, i) => ({ x: 200 + i * 3, topo: 300, l: 90, a: 18 }));
  const dy = separarRotulos(caixas, { limite: 900, folga: 4 });
  const fin = caixas.map((c, i) => ({ ...c, topo: c.topo + dy[i] }));
  for (let i = 0; i < fin.length; i++) {
    for (let j = i + 1; j < fin.length; j++) {
      const sobrepoe = Math.abs(fin[i].x - fin[j].x) < 90 && fin[i].topo < fin[j].topo + 18 && fin[j].topo < fin[i].topo + 18;
      assert.ok(!sobrepoe, `${i} x ${j}`);
    }
  }
});

test("rotulosQueCabem: depois de separar, quem ainda bate num já posto some (nível de detalhe)", () => {
  // palco baixo (celular): três rótulos no mesmo lugar e só cabem dois, um acima do outro
  const caixas = [
    { x: 100, topo: 0, l: 80, a: 20 },
    { x: 100, topo: 0, l: 80, a: 20 },
    { x: 100, topo: 0, l: 80, a: 20 },
    { x: 300, topo: 10, l: 80, a: 20 },
  ];
  const dy = separarRotulos(caixas, { limite: 48 });
  const cabe = rotulosQueCabem(caixas, dy, { limite: 48 });
  assert.equal(cabe[0], true, "o 1º (servidor/maior) fica sempre");
  assert.equal(cabe[3], true, "longe dos outros: fica");
  assert.equal(cabe.filter(Boolean).length, 3);
  // nenhum par mantido se sobrepõe nem sai do palco
  const postas = caixas.map((c, i) => ({ ...c, topo: c.topo + dy[i] })).filter((_, i) => cabe[i]);
  for (const [i, a] of postas.entries()) {
    assert.ok(a.topo >= 0 && a.topo + a.a <= 48);
    for (const b of postas.slice(i + 1)) {
      const bate = Math.abs(a.x - b.x) < (a.l + b.l) / 2 && a.topo < b.topo + b.a && b.topo < a.topo + a.a;
      assert.equal(bate, false);
    }
  }
});

test("rotulosQueCabem: palco folgado mantém todos", () => {
  const caixas = [{ x: 0, topo: 0, l: 50, a: 20 }, { x: 0, topo: 0, l: 50, a: 20 }];
  const dy = separarRotulos(caixas, { limite: 500 });
  assert.deepEqual(rotulosQueCabem(caixas, dy, { limite: 500 }), [true, true]);
});
