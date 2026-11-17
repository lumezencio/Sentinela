// O bundle da Teia (vendor/teia-3d.bundle.js) exporta montarTeia. Sem DOM o import puro
// falha (3d-force-graph lê window.THREE ao carregar), então: (1) análise do texto do
// export ESM final e (2) import real num processo à parte com só `window = globalThis`.
import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const URL_BUNDLE = new URL("../../src/vendor/teia-3d.bundle.js", import.meta.url);
const texto = readFileSync(URL_BUNDLE, "utf8");

test("bundle: o export ESM final inclui montarTeia, ESTILOS e NOMES_ESTILO", () => {
  const m = texto.match(/export\s*\{([^}]*)\}\s*;?\s*$/);
  assert.ok(m, "bundle sem export ESM no fim");
  const nomes = m[1].split(",").map((s) => s.trim().split(/\s+as\s+/).pop());
  for (const nome of ["montarTeia", "ESTILOS", "NOMES_ESTILO"]) assert.ok(nomes.includes(nome), nome);
});

test("bundle: importado (window mínimo) expõe montarTeia como função", () => {
  const codigo = `globalThis.window = globalThis;
    const m = await import(${JSON.stringify(URL_BUNDLE.href)});
    process.stdout.write(JSON.stringify({ tipo: typeof m.montarTeia, estilos: m.ESTILOS }));`;
  const saida = execFileSync(process.execPath, ["--input-type=module", "-e", codigo], { encoding: "utf8" });
  assert.deepEqual(JSON.parse(saida), { tipo: "function", estilos: ["a", "b", "c", "d", "e"] });
});

test("bundle: sem sourcemap, sem <style> injetado, sem WebGPU, sem eval", () => {
  assert.doesNotMatch(texto, /sourceMappingURL/);
  assert.doesNotMatch(texto, /createElement\(["']style["']\)/);
  assert.doesNotMatch(texto, /WebGPURenderer/);
  assert.doesNotMatch(texto, /\beval\(/);
  assert.ok(fileURLToPath(URL_BUNDLE).endsWith("teia-3d.bundle.js"));
});
