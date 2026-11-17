import test from "node:test";
import assert from "node:assert/strict";
import { criarAcervo, criarEstrelas } from "../../src/js/teia/objetos.js";

function recurso() {
  const r = { liberacoes: 0 };
  r.dispose = () => { r.liberacoes++; };
  return r;
}

test("acervo: reutiliza por chave e só libera de verdade no liberar()", () => {
  const acervo = criarAcervo();
  let criados = 0;
  const criar = () => { criados++; return recurso(); };
  const a = acervo.obter("x", criar);
  const b = acervo.obter("x", criar);
  const c = acervo.obter("y", criar);
  assert.equal(a, b);
  assert.notEqual(a, c);
  assert.equal(criados, 2);
  assert.equal(acervo.tamanho, 2);
  a.dispose(); // o three-forcegraph chama dispose ao remover um nó: não pode valer
  assert.equal(a.liberacoes, 0);
  acervo.liberar();
  assert.equal(a.liberacoes, 1);
  assert.equal(c.liberacoes, 1);
  assert.equal(acervo.tamanho, 0);
});

test("estrelas: 1500 pontos determinísticos, finitos e longe do centro", () => {
  const e1 = criarEstrelas(), e2 = criarEstrelas();
  const p1 = e1.geometry.getAttribute("position").array;
  const p2 = e2.geometry.getAttribute("position").array;
  assert.equal(p1.length, 1500 * 3);
  assert.deepEqual(Array.from(p1.slice(0, 30)), Array.from(p2.slice(0, 30)));
  for (let i = 0; i < p1.length; i += 3) {
    const d = Math.hypot(p1[i], p1[i + 1], p1[i + 2]);
    assert.ok(Number.isFinite(d) && d >= 1799 && d <= 3201, `estrela ${i / 3} a ${d}`);
  }
  assert.equal(e1.material.fog, false);
});
