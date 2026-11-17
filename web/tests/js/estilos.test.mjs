import test from "node:test";
import assert from "node:assert/strict";
import { hashTexto } from "../../src/js/teia/hash.js";
import {
  ESTILOS, NOMES_ESTILO, VAGAS, RAIO_CLASSES, calcularPosicoes,
} from "../../src/js/teia/estilos.js";

const SLUGS = ["sentinela", "roteador", "switch", "wifi", "camera", "gravador",
  "controle_acesso", "servidor", "computador", "impressora", "iot", "desconhecido"];
const CLASSES = SLUGS.map((slug, ordem) => ({ slug, nome: slug, ordem }));

function equips(n, classe = "camera", prefixo = "eq") {
  return Array.from({ length: n }, (_, i) => ({ id: `${prefixo}-${classe}-${i}`, classe }));
}
function cenario() {
  return [...equips(25, "camera"), ...equips(7, "iot"), ...equips(1, "switch"), ...equips(13, "computador")];
}
const igual = (a, b) => {
  assert.deepEqual([...a.entries()].sort(), [...b.entries()].sort());
};

test("hashTexto FNV-1a de 'abc' e sem sinal 32 bits", () => {
  assert.equal(hashTexto("abc"), 0x1a47e90b);
  assert.equal(hashTexto(""), 0x811c9dc5);
  const h = hashTexto("qualquer coisa com acento: ção");
  assert.ok(Number.isInteger(h) && h >= 0 && h <= 0xffffffff);
});

test("constantes e nomes", () => {
  assert.deepEqual(ESTILOS, ["a", "b", "c", "d", "e"]);
  assert.deepEqual(NOMES_ESTILO, { a: "Constelação", b: "Órbitas", c: "Galáxia", d: "Átomo", e: "Árvore 3D" });
  assert.equal(VAGAS, 12);
  assert.equal(RAIO_CLASSES, 230);
});

for (const estilo of ESTILOS) {
  test(`${estilo}: chaves presentes e números finitos`, () => {
    const eqs = cenario();
    const m = calcularPosicoes(estilo, CLASSES, eqs);
    assert.ok(m.has("srv"));
    for (const c of CLASSES) assert.equal(m.has(`h-${c.slug}`), c.slug !== "sentinela");
    for (const e of eqs) assert.ok(m.has(e.id));
    assert.equal(m.size, 1 + 11 + eqs.length);
    for (const p of m.values()) {
      for (const k of ["x", "y", "z"]) assert.ok(Number.isFinite(p[k]));
    }
    assert.deepEqual(m.get("srv"), { x: 0, y: estilo === "e" ? 200 : 0, z: 0 });
  });

  test(`${estilo}: determinismo e independência da ordem de entrada`, () => {
    const eqs = cenario();
    igual(calcularPosicoes(estilo, CLASSES, eqs), calcularPosicoes(estilo, CLASSES, eqs));
    const emb = [...eqs].reverse().sort((a, b) => hashTexto(a.id) % 7 - hashTexto(b.id) % 7);
    igual(calcularPosicoes(estilo, CLASSES, eqs), calcularPosicoes(estilo, [...CLASSES].reverse(), emb));
  });

  if (estilo === "a") {
    test("a: remover um equipamento não move os demais (posição só pelo hash)", () => {
      const eqs = cenario();
      const antes = calcularPosicoes(estilo, CLASSES, eqs);
      for (const alvo of [eqs[0], eqs[10], eqs[eqs.length - 1]]) {
        const depois = calcularPosicoes(estilo, CLASSES, eqs.filter((e) => e !== alvo));
        for (const e of eqs) if (e !== alvo) assert.deepEqual(depois.get(e.id), antes.get(e.id));
      }
    });
  } else {
    test(`${estilo}: remover/adicionar move no máximo 5% da classe e nada fora dela`, () => {
      const eqs = [...equips(120, "camera"), ...equips(30, "iot"), ...equips(3, "wifi")];
      const antes = calcularPosicoes(estilo, CLASSES, eqs);
      const moveu = (depois, ids) => ids.filter((id) => depois.has(id)
        && JSON.stringify(depois.get(id)) !== JSON.stringify(antes.get(id)));
      const camera = eqs.filter((e) => e.classe === "camera").map((e) => e.id);
      for (const alvo of [camera[0], camera[40], camera[119]]) {
        const depois = calcularPosicoes(estilo, CLASSES, eqs.filter((e) => e.id !== alvo));
        const outros = camera.filter((id) => id !== alvo);
        assert.ok(moveu(depois, outros).length <= Math.floor(outros.length * 0.05), "remoção moveu >5%");
        const fora = eqs.filter((e) => e.classe !== "camera").map((e) => e.id);
        assert.equal(moveu(depois, fora).length, 0);
      }
      for (const novo of ["novo-1", "novo-2", "zz-3"]) {
        const depois = calcularPosicoes(estilo, CLASSES, [...eqs, { id: novo, classe: "camera" }]);
        assert.ok(moveu(depois, camera).length <= Math.floor(camera.length * 0.05), "adição moveu >5%");
        assert.equal(moveu(depois, eqs.filter((e) => e.classe !== "camera").map((e) => e.id)).length, 0);
      }
    });

    for (const n of [120, 129, 500, 1500]) {
      test(`${estilo}: ${n} equipamentos numa classe sem sobreposição (mín. 4 unidades)`, () => {
        const eqs = equips(n, "gravador");
        const m = calcularPosicoes(estilo, CLASSES, eqs);
        const pts = eqs.map((e) => m.get(e.id));
        let min = Infinity;
        for (let i = 0; i < pts.length; i++) {
          for (let j = i + 1; j < pts.length; j++) {
            min = Math.min(min, Math.hypot(pts[i].x - pts[j].x, pts[i].y - pts[j].y, pts[i].z - pts[j].z));
          }
        }
        assert.ok(min >= 4, `distância mínima ${min}`);
      });
    }
  }

  test(`${estilo}: classe com 0 e com 1 equipamento`, () => {
    const zero = calcularPosicoes(estilo, CLASSES, []);
    assert.equal(zero.size, 12);
    const um = calcularPosicoes(estilo, CLASSES, equips(1, "wifi"));
    assert.equal(um.size, 13);
    const semClasses = calcularPosicoes(estilo, [], []);
    assert.deepEqual(semClasses.get("srv"), { x: 0, y: estilo === "e" ? 200 : 0, z: 0 });
  });

  if (estilo !== "e") {
    test(`${estilo}: 120 equipamentos ficam a 30+ unidades do servidor`, () => {
      const eqs = equips(120, "gravador");
      const m = calcularPosicoes(estilo, CLASSES, eqs);
      for (const e of eqs) {
        const p = m.get(e.id);
        assert.ok(Math.hypot(p.x, p.y, p.z) >= 30, `${e.id} perto demais`);
      }
    });
  }
}

test("A, B e D: hubs com y variando (casca inclinada)", () => {
  for (const estilo of ["a", "b", "d"]) {
    const m = calcularPosicoes(estilo, CLASSES, []);
    const ys = new Set(CLASSES.filter((c) => c.slug !== "sentinela").map((c) => Math.round(m.get(`h-${c.slug}`).y)));
    assert.ok(ys.size > 3, `${estilo}: y quase constante`);
  }
});

test("A e B: hubs na casca de raio 230 e equipamento perto do seu hub", () => {
  for (const estilo of ["a", "b"]) {
    const eqs = equips(30, "wifi");
    const m = calcularPosicoes(estilo, CLASSES, eqs);
    const h = m.get("h-wifi");
    assert.ok(Math.abs(Math.hypot(h.x, h.z) - 230) < 100);
    for (const e of eqs) {
      const p = m.get(e.id);
      assert.ok(Math.hypot(p.x - h.x, p.y - h.y, p.z - h.z) < 100);
    }
  }
});

test("E: servidor no topo, classes no meio, equipamentos abaixo", () => {
  const eqs = equips(40, "roteador");
  const m = calcularPosicoes("e", CLASSES, eqs);
  assert.equal(m.get("srv").y, 200);
  assert.equal(m.get("h-roteador").y, 90);
  for (const e of eqs) assert.ok(m.get(e.id).y <= 40);
});

test("estilo desconhecido equivale a 'a'", () => {
  const eqs = cenario();
  igual(calcularPosicoes("zzz", CLASSES, eqs), calcularPosicoes("a", CLASSES, eqs));
  igual(calcularPosicoes(undefined, CLASSES, eqs), calcularPosicoes("a", CLASSES, eqs));
});

test("estilos diferentes produzem posições diferentes", () => {
  const eqs = equips(5, "camera");
  const chaves = ESTILOS.map((s) => JSON.stringify(calcularPosicoes(s, CLASSES, eqs).get(eqs[0].id)));
  assert.equal(new Set(chaves).size, 5);
});
