// Empacota o telão com o esbuild (chamado por construir-teia.sh, a partir de web/):
//  1. src/parede/parede.bundle.js: IIFE, target es2017, minificado, sem sourcemap (só nosso
//     código: página, emparelhamento, WS, contadores, faixa, relógio e Organograma);
//  2. src/parede/teia-parede.bundle.js: ESM, target es2017, a Teia (three + 3d-force-graph)
//     com os mesmos plugins do bundle do painel; licenças em LICENSES-teia-parede.txt.
import { build } from "esbuild";
import { anexarLicencas, semEstiloInjetado, semWebgpu } from "./empacotar-teia.mjs";

const PASTA = "src/parede";
const ALVO = "es2017";

await build({
  entryPoints: ["build/parede-entrada.js"],
  bundle: true,
  format: "iife",
  minify: true,
  legalComments: "none",
  target: ALVO,
  outfile: `${PASTA}/parede.bundle.js`,
  sourcemap: false,
  logLevel: "warning",
});

const teia = await build({
  entryPoints: ["build/teia-parede-entrada.js"],
  bundle: true,
  format: "esm",
  minify: true,
  legalComments: "external",
  target: ALVO,
  outfile: `${PASTA}/teia-parede.bundle.js`,
  sourcemap: false,
  metafile: true,
  logLevel: "warning",
  plugins: [semEstiloInjetado, semWebgpu],
});
await anexarLicencas(teia.metafile, `${PASTA}/teia-parede.bundle.js.LEGAL.txt`);
