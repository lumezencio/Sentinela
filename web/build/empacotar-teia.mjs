// Empacota a Teia com o esbuild (chamado por construir-teia.sh, a partir de web/).
// Mesmas opções do CLI (--bundle --format=esm --minify --legal-comments=external
// --target=es2022, sem sourcemap), mais dois plugins:
//  1. sem-estilo-injetado: 3d-force-graph, three-render-objects e float-tooltip injetam CSS
//     com <style> ao carregar, o que a CSP (style-src 'self') barra e reporta como erro.
//     A chamada styleInject(css_248z) é removida; o pouco CSS necessário a cena aplica por
//     CSSOM. Se a forma do código mudar numa versão nova, o build falha (não passa calado).
//     No three-render-objects também sai a linha `window.scene = state.scene` (atalho de
//     depuração que deixaria a cena exposta no console), com a mesma trava.
//  2. sem-webgpu: three-render-objects importa WebGPURenderer (three/webgpu) só para a opção
//     useWebGPU, que a Teia não usa; o stub tira o renderizador WebGPU inteiro do bundle.
// Depois do build, as licenças completas de cada pacote empacotado são acrescentadas ao
// .LEGAL.txt (que o construir-teia.sh move para LICENSES-teia.txt).
// Os plugins e a anexação das licenças são exportados para o empacotar-parede.mjs (Teia do
// telão); o build daqui só roda quando este arquivo é o chamado pela linha de comando.
import { appendFile, readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const SAIDA = "src/vendor/teia-3d.bundle.js";
const COM_ESTILO = /[\\/]node_modules[\\/](3d-force-graph|three-render-objects|float-tooltip)[\\/]dist[\\/][^\\/]+\.mjs$/;
const CHAMADA = "styleInject(css_248z);";
const SCENE_GLOBAL = "window.scene = state.scene;";

export const semEstiloInjetado = {
  name: "sem-estilo-injetado",
  setup(b) {
    b.onLoad({ filter: COM_ESTILO }, async (args) => {
      let fonte = await readFile(args.path, "utf8");
      const vezes = fonte.split(CHAMADA).length - 1;
      if (vezes !== 1) throw new Error(`${args.path}: esperava 1 ${CHAMADA}, achei ${vezes}`);
      fonte = fonte.replace(CHAMADA, "/* CSS injetado removido (CSP) */");
      if (/three-render-objects/.test(args.path)) {
        // atalho de depuração da lib: não deixa a cena exposta em window.scene
        const n = fonte.split(SCENE_GLOBAL).length - 1;
        if (n !== 1) throw new Error(`${args.path}: esperava 1 ${SCENE_GLOBAL}, achei ${n}`);
        fonte = fonte.replace(SCENE_GLOBAL, "/* window.scene removido (depuração) */");
      }
      return { contents: fonte, loader: "js" };
    });
  },
};

export const semWebgpu = {
  name: "sem-webgpu",
  setup(b) {
    b.onResolve({ filter: /^three\/webgpu$/ }, () => ({ path: "three-webgpu-stub", namespace: "teia-stub" }));
    b.onLoad({ filter: /.*/, namespace: "teia-stub" }, () => ({
      contents: "export class WebGPURenderer { constructor() { throw new Error('WebGPU fora do bundle da Teia'); } }",
      loader: "js",
    }));
  },
};

/** Acrescenta ao `arquivoLegal` a licença completa de cada pacote que entrou no bundle. */
export async function anexarLicencas(metafile, arquivoLegal) {
  // pacotes que de fato entraram no bundle (raiz de cada node_modules/<pacote>)
  const raizes = new Set();
  for (const entrada of Object.keys(metafile.inputs)) {
    const m = entrada.replaceAll("\\", "/").match(/node_modules\/((?:@[^/]+\/)?[^/]+)\//);
    if (m) raizes.add(m[1]);
  }

  let texto = "\n\n==== Licenças completas dos pacotes empacotados ====\n";
  for (const nome of [...raizes].sort()) {
    const dir = path.join("node_modules", nome);
    const pkg = JSON.parse(await readFile(path.join(dir, "package.json"), "utf8"));
    const arquivo = (await readdir(dir)).sort().find((f) => /^(licen[cs]e|copying)/i.test(f));
    if (!arquivo) throw new Error(`${nome}: sem arquivo de licença`);
    const corpo = (await readFile(path.join(dir, arquivo), "utf8")).replaceAll("\r\n", "\n").trim();
    texto += `\n---- ${nome}@${pkg.version} (${pkg.license}) ----\n${corpo}\n`;
  }
  await appendFile(arquivoLegal, texto);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const resultado = await build({
    entryPoints: ["build/teia-entrada.js"],
    bundle: true,
    format: "esm",
    minify: true,
    legalComments: "external",
    target: "es2022",
    outfile: SAIDA,
    sourcemap: false,
    metafile: true,
    logLevel: "warning",
    plugins: [semEstiloInjetado, semWebgpu],
  });
  await anexarLicencas(resultado.metafile, `${SAIDA}.LEGAL.txt`);
}
