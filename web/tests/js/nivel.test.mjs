import test from "node:test";
import assert from "node:assert/strict";
import {
  criarMedidorFps, decidirNivel, INTERVALO_REAGRUPAR_MS, limparAgrupadoPorFps, quedaSustentada,
} from "../../src/js/teia/desempenho.js";

// medidor com relógio falso alimentado a `fps` durante `segundos`
function medidorA(fps, segundos, inicio = 0) {
  let t = inicio;
  const m = criarMedidorFps(() => t);
  const passo = 1000 / fps;
  for (let i = 0; i <= segundos * fps; i++) { m.quadro(); t += passo; }
  return { m, agora: t };
}

test("teto de 30 fps (economia de energia/vsync) não agrupa", () => {
  const { m, agora } = medidorA(30, 20);
  assert.equal(quedaSustentada(m), false);
  assert.equal(decidirNivel({ total: 300, queda: quedaSustentada(m), agora }).nivel, "completo");
});

test("25 fps contínuos também não agrupam (limite é < 24)", () => {
  const { m } = medidorA(25, 20);
  assert.equal(quedaSustentada(m), false);
});

test("20 fps por 5 s agrupam; por menos de 5 s ainda não", () => {
  const curto = medidorA(20, 5); // média só existe após 1 s: < 5 s de queda registrada
  assert.equal(quedaSustentada(curto.m), false);
  const { m, agora } = medidorA(20, 8);
  assert.equal(quedaSustentada(m), true);
  assert.deepEqual(decidirNivel({ total: 300, queda: true, agora }),
    { nivel: "agrupado", agrupadoPorFps: true, ultimaEntrada: agora });
});

test("agrupado por FPS persiste até ser limpo; limpar volta ao nível da contagem", () => {
  let d = decidirNivel({ total: 1500, queda: true, agora: 1000 });
  assert.equal(d.nivel, "agrupado");
  d = decidirNivel({ total: 1500, ...d, queda: false, agora: 2000 });
  assert.equal(d.nivel, "agrupado");
  d = limparAgrupadoPorFps(d); // retomar() / definirEstilo() / verTudo()
  d = decidirNivel({ total: 1500, ...d, queda: false, agora: 3000 });
  assert.deepEqual(d, { nivel: "reduzido", agrupadoPorFps: false, ultimaEntrada: 1000 });
});

test("contagem que já implica agrupado ignora o caminho de FPS", () => {
  const d = decidirNivel({ total: 3500, queda: true, agora: 5000 });
  assert.deepEqual(d, { nivel: "agrupado", agrupadoPorFps: false, ultimaEntrada: -Infinity });
});

test("reentrar em agrupado por FPS no máximo 1 vez por minuto", () => {
  let d = decidirNivel({ total: 300, queda: true, agora: 10_000 });
  d = limparAgrupadoPorFps(d);
  d = decidirNivel({ total: 300, ...d, queda: true, agora: 10_000 + INTERVALO_REAGRUPAR_MS - 1 });
  assert.equal(d.nivel, "completo");
  d = decidirNivel({ total: 300, ...d, queda: true, agora: 10_000 + INTERVALO_REAGRUPAR_MS });
  assert.equal(d.nivel, "agrupado");
});
