// Cena 3D da Teia sobre o 3d-force-graph: luz de verdade, névoa, estrelas, servidor com
// núcleo/halo/anéis, classes com rótulo, equipamentos por estado, partículas nos troncos,
// bloom opcional e degradação automática. Fina por cima de funções puras (estilos.js,
// aparencia.js, desempenho.js, reconciliar.js); empacotada no vendor/teia-3d.bundle.js.
import ForceGraph3D from "3d-force-graph";
import { AmbientLight, Color, FogExp2, PointLight, Vector2 } from "three";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { aparenciaDe, corDaClasse } from "./aparencia.js";
import {
  bloomPermitido, criarMedidorFps, decidirNivel, limparAgrupadoPorFps, quedaSustentada,
} from "./desempenho.js";
import { calcularPosicoes, ESTILOS, RAIO_CLASSES } from "./estilos.js";
import {
  atualizarRotulo, brilhoParaComposicaoLinear, criarAcervo, criarEstrelas, criarObjetoClasse,
  criarObjetoEquipamento, criarObjetoGrupo, criarObjetoServidor, FUNDO, OPACIDADE_ESMAECIDA,
  TAMANHO, vestirClasse, vestirCorpo,
} from "./objetos.js";
import {
  assinaturas, CLASSE_SERVIDOR, classesDaCena, diferencaNos, posicaoDeAproximacao, raioSuperNo,
  resumoPorClasse, rotuloAbaixo, textoRotuloClasse,
} from "./reconciliar.js";

const CAMERA_PADRAO = { x: 0, y: 260, z: 520 };
const CAMERA_E = { x: 0, y: 60, z: 620 };
const ALVO_E = { x: 0, y: 40, z: 0 };
const OPACIDADE_LINK = { a: 0.18, b: 0.07, c: 0.05, d: 0.1, e: 0.12 };
const LINKS_INTERNOS = { a: true, b: true, c: false, d: false, e: true };
const TRANSICAO_MS = 900;
const CAMERA_MS = 1200;
const AVALIAR_BLOOM_MS = 3000;

const estiloValido = (e) => (ESTILOS.includes(e) ? e : "a");
const suave = (t) => t * t * (3 - 2 * t);

function rgba(hex, alfa) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alfa})`;
}

/**
 * Monta a Teia dentro de `container` e devolve o controle da cena.
 * O container recebe data-nos (nós de equipamento na cena), data-nivel e data-movimento.
 */
export function montarTeia(container, opcoes = {}) {
  const aoClicarEquipamento = opcoes.aoClicarEquipamento || (() => {});
  const aoClicarClasse = opcoes.aoClicarClasse || (() => {});
  const reduzido = !!opcoes.movimentoReduzido;

  const est = {
    estilo: estiloValido(opcoes.estilo),
    nivel: "completo",
    total: 0, // equipamentos da cena no store (base do nível por contagem)
    // R5: queda sustentada (< 24 fps por 5 s) agrupa até retomar/definirEstilo/verTudo;
    // reentrar por FPS no máximo 1 vez por minuto
    agrupadoPorFps: false,
    ultimaEntradaFps: -Infinity,
    foco: null,
    girando: !reduzido,
    store: null,
    pausado: false,
    destruido: false,
    bloom: null, // null = ainda não avaliado; false = negado; {passe, saida} = ligado
    inicioRender: null,
    ultimoCheque: 0,
    transicao: null,
  };
  const acervo = criarAcervo();
  let medidor = criarMedidorFps();
  let raf = null;

  const srv = { id: "srv", tipo: "servidor", fx: 0, fy: 0, fz: 0, x: 0, y: 0, z: 0 };
  const nos = new Map(); // id -> nó de equipamento
  const hubs = new Map(); // slug -> nó de classe
  const grupos = new Map(); // slug -> super-nó (nível agrupado)
  const ligacoes = new Map(); // "a>b" -> link (reutilizado entre sincronizações)
  const animados = new Set(); // nós com pulso/tremor
  let assin = new Map();

  // ---------- grafo ----------
  container.classList.add("teia-cena"); // foco visível pelo CSS (componentes.css)
  const dica = document.createElement("div"); // conteúdo da dica: só textContent

  const G = new ForceGraph3D(container, {
    controlType: "orbit",
    rendererConfig: { antialias: true, alpha: false, powerPreference: "high-performance" },
  });
  G.backgroundColor(FUNDO)
    .showNavInfo(false)
    .enableNodeDrag(false)
    .width(container.clientWidth || window.innerWidth)
    .height(container.clientHeight || window.innerHeight)
    .nodeThreeObject(objetoDe)
    .nodeLabel(dicaDe)
    .linkWidth((l) => (l.tronco ? 1.2 : 0))
    .linkDirectionalParticleWidth(2.2)
    .linkDirectionalParticleSpeed(0.006)
    .linkDirectionalParticleColor((l) => l.cor)
    .cooldownTicks(160)
    .onNodeClick(clicar)
    .onNodeHover((n) => { container.style.cursor = n ? "pointer" : ""; });
  aplicarAcessoriosDeLink();

  // o 3d-force-graph injeta CSS com <style> (barrado pela CSP; removido no bundle): o mínimo
  // vai por CSSOM, que a CSP permite
  const caixaDica = container.querySelector(".float-tooltip-kap");
  if (caixaDica) {
    Object.assign(caixaDica.style, {
      position: "absolute", pointerEvents: "none", padding: "4px 8px", borderRadius: "8px",
      font: "12px system-ui, sans-serif", color: "#E8EBF2", background: "rgba(27,31,40,.85)",
      whiteSpace: "nowrap",
    });
  }
  const info = container.querySelector(".graph-info-msg");
  if (info) info.style.display = "none";

  const scene = G.scene();
  // fundo como scene.background (não só clear color): com o EffectComposer do bloom o clear
  // color sai convertido duas vezes (cinza); o background é limpo no espaço de cor do alvo
  scene.background = new Color(FUNDO);
  scene.fog = new FogExp2(FUNDO, 0.0012);
  const luzServidor = new PointLight(0xdfe4ff, 2.4, 0, 0);
  G.lights([new AmbientLight(0xffffff, 0.35), luzServidor]);
  const estrelas = criarEstrelas(1500);
  scene.add(estrelas);

  const controles = G.controls();
  controles.minDistance = 60; // não atravessar o servidor
  controles.maxDistance = 1600;
  controles.enableDamping = !reduzido;
  controles.dampingFactor = 0.08;
  controles.autoRotateSpeed = 0.6;
  controles.autoRotate = est.girando;

  const carga = G.d3Force("charge");
  // sem força de centro: com servidor e classes fixos ela só empurraria os equipamentos
  // soltos (estilo A) para longe das suas classes
  G.d3Force("center", null);
  G.cameraPosition(est.estilo === "e" ? CAMERA_E : CAMERA_PADRAO, est.estilo === "e" ? ALVO_E : { x: 0, y: 0, z: 0 });

  // ---------- objetos ----------
  function esmaecidoClasse(slug) {
    return est.foco !== null && slug !== est.foco;
  }

  function objetoDe(no) {
    if (no.tipo === "servidor") return criarObjetoServidor(acervo);
    if (no.tipo === "classe") {
      return criarObjetoClasse(acervo, {
        cor: no.cor, texto: textoRotuloClasse(no.nome, no.total), esmaecido: esmaecidoClasse(no.slug),
        abaixo: rotuloAbaixo(no.ordem),
      });
    }
    if (no.tipo === "grupo") {
      const obj = criarObjetoGrupo(acervo, {
        raio: raioSuperNo(no.total), estado: no.estado, texto: textoRotuloClasse(no.nome, no.total),
        corClasse: no.cor, esmaecido: esmaecidoClasse(no.slug), abaixo: rotuloAbaixo(no.ordem),
      });
      registrarAnimacao(no, obj);
      return obj;
    }
    const obj = criarObjetoEquipamento(acervo, no.estado, {
      esmaecido: esmaecidoClasse(no.classe), resolucao: est.nivel === "completo" ? 16 : 8,
    });
    registrarAnimacao(no, obj);
    return obj;
  }

  function registrarAnimacao(no, obj) {
    const ap = obj.userData.aparencia;
    if (!reduzido && ap && (ap.pulsa || ap.treme)) animados.add(no);
    else animados.delete(no);
  }

  function revestir(no) {
    const obj = no.__threeObj;
    if (!obj) return; // ainda não criado: objetoDe já usa o estado atual
    if (no.tipo === "classe") {
      vestirClasse(obj, acervo, no.cor, esmaecidoClasse(no.slug));
      atualizarRotulo(obj.userData.rotulo, textoRotuloClasse(no.nome, no.total), no.cor);
    } else if (no.tipo === "grupo") {
      vestirCorpo(obj, acervo, no.estado, esmaecidoClasse(no.slug));
      atualizarRotulo(obj.userData.rotulo, textoRotuloClasse(no.nome, no.total), no.cor);
      registrarAnimacao(no, obj);
    } else if (no.tipo === "equip") {
      vestirCorpo(obj, acervo, no.estado, esmaecidoClasse(no.classe));
      registrarAnimacao(no, obj);
    }
  }

  function dicaDe(no) {
    if (no.tipo === "servidor") dica.textContent = "Sentinela";
    else if (no.tipo === "classe") dica.textContent = textoRotuloClasse(no.nome, no.total);
    else if (no.tipo === "grupo") {
      dica.textContent = `${textoRotuloClasse(no.nome, no.total)} · pior: ${aparenciaDe(no.estado).rotulo}`;
    } else {
      const it = est.store?.itens.get(no.id);
      dica.textContent = `${it?.nome ?? no.id} · ${aparenciaDe(no.estado).rotulo}`;
    }
    return dica;
  }

  // ---------- links ----------
  function corLink(l) {
    const slug = l.slug;
    return esmaecidoClasse(slug) ? rgba(l.cor, OPACIDADE_ESMAECIDA) : l.cor;
  }

  function aplicarAcessoriosDeLink() {
    const internos = LINKS_INTERNOS[est.estilo];
    const particulas = !reduzido && est.nivel === "completo";
    // funções novas a cada chamada: força o three-forcegraph a reaplicar
    G.linkColor((l) => corLink(l))
      .linkOpacity(OPACIDADE_LINK[est.estilo])
      .linkVisibility((l) => l.tronco || internos)
      .linkDirectionalParticles((l) => (l.tronco && particulas ? 4 : 0));
  }

  // source/target são os próprios objetos dos nós: um nó recriado (mesmo id) ganha link novo
  function ligacao(origem, destino, cor, slug, tronco) {
    const chave = `${origem.id}>${destino.id}`;
    let l = ligacoes.get(chave);
    if (!l || l.cor !== cor || l.source !== origem || l.target !== destino) {
      l = { source: origem, target: destino, cor, slug, tronco, chave };
      ligacoes.set(chave, l);
    }
    return l;
  }

  // ---------- reconciliação ----------
  function equipamentosDaCena() {
    const lista = [];
    for (const it of est.store.itens.values()) if (it.classe !== CLASSE_SERVIDOR) lista.push(it);
    return lista;
  }

  function atualizarHubs(classes) {
    const vistos = new Set();
    for (const c of classes) {
      vistos.add(c.slug);
      const cor = corDaClasse(c);
      let h = hubs.get(c.slug);
      if (!h) {
        h = {
          id: `h-${c.slug}`, tipo: "classe", slug: c.slug, ordem: c.ordem, nome: c.nome, cor,
          total: c.total,
        };
        hubs.set(c.slug, h);
      } else if (h.nome !== c.nome || h.cor !== cor || h.total !== c.total) {
        Object.assign(h, { nome: c.nome, cor, total: c.total });
        revestir(h);
      }
    }
    for (const slug of [...hubs.keys()]) if (!vistos.has(slug)) hubs.delete(slug);
  }

  function atualizarGrupos(classes) {
    const resumo = resumoPorClasse(est.store.itens);
    const vistos = new Set();
    for (const c of classes) {
      const r = resumo.get(c.slug);
      if (!r) continue; // classe vazia não vira super-nó
      vistos.add(c.slug);
      const cor = corDaClasse(c);
      let g = grupos.get(c.slug);
      if (!g) {
        g = {
          id: `g-${c.slug}`, tipo: "grupo", slug: c.slug, ordem: c.ordem, nome: c.nome, cor,
          total: r.total, estado: r.pior,
        };
        grupos.set(c.slug, g);
      } else if (g.total !== r.total) {
        // o raio depende da contagem: recria o objeto (nó novo, mesmo id lógico)
        grupos.set(c.slug, { ...g, __threeObj: undefined, nome: c.nome, cor, total: r.total, estado: r.pior });
        animados.delete(g);
      } else if (g.estado !== r.pior || g.nome !== c.nome || g.cor !== cor) {
        Object.assign(g, { nome: c.nome, cor, estado: r.pior });
        revestir(g);
      }
    }
    for (const [slug, g] of [...grupos]) {
      if (!vistos.has(slug)) {
        grupos.delete(slug);
        animados.delete(g);
      }
    }
  }

  function aplicarDiferenca(dif) {
    const itens = est.store.itens;
    for (const id of dif.remover) {
      animados.delete(nos.get(id));
      nos.delete(id);
    }
    for (const id of dif.adicionar) {
      const it = itens.get(id);
      nos.set(id, { id, tipo: "equip", classe: it.classe, estado: it.estado });
    }
    for (const id of dif.mudouClasse) {
      const no = nos.get(id), it = itens.get(id);
      if (!no) continue;
      no.classe = it.classe;
      no.estado = it.estado;
      no.semPosicao = true;
      revestir(no);
    }
    for (const id of dif.mudouEstado) {
      const no = nos.get(id);
      if (!no) continue;
      no.estado = itens.get(id).estado;
      revestir(no);
    }
    for (const id of dif.adicionar) nos.get(id).semPosicao = true;
  }

  function posicionar({ todos = false, animar = false } = {}) {
    const pos = calcularPosicoes(est.estilo, est.store.ordemClasses, equipamentosDaCena());
    const fixo = est.estilo !== "a";
    const p0 = pos.get("srv");
    luzServidor.position.set(p0.x, p0.y, p0.z);

    const alvos = new Map([[srv, p0]]);
    for (const h of hubs.values()) {
      const p = pos.get(h.id);
      if (p) alvos.set(h, p);
    }
    for (const g of grupos.values()) {
      const p = pos.get(`h-${g.slug}`);
      if (p) alvos.set(g, p);
    }
    for (const no of nos.values()) {
      const p = pos.get(no.id);
      if (!p) continue;
      if (fixo) alvos.set(no, p);
      else if (todos || no.semPosicao) {
        // estilo A: posição inicial determinística; a física solta depois
        delete no.fx; delete no.fy; delete no.fz;
        Object.assign(no, { x: p.x, y: p.y, z: p.z, vx: 0, vy: 0, vz: 0 });
      }
      no.semPosicao = false;
    }
    if (animar && !reduzido) {
      const de = new Map();
      for (const [no, p] of alvos) {
        de.set(no, { x: no.x ?? p.x, y: no.y ?? p.y, z: no.z ?? p.z });
      }
      est.transicao = { inicio: null, de, para: alvos };
    } else {
      est.transicao = null;
      for (const [no, p] of alvos) Object.assign(no, { fx: p.x, fy: p.y, fz: p.z, x: p.x, y: p.y, z: p.z });
    }
  }

  function configurarForcas() {
    const link = G.d3Force("link");
    if (est.estilo === "a" && est.nivel !== "agrupado") {
      if (!G.d3Force("charge")) G.d3Force("charge", carga);
      carga.strength(-14);
      link.distance((l) => (l.tronco ? RAIO_CLASSES : 26)).strength((l) => (l.tronco ? 0 : 0.9));
    } else {
      // tudo fixo: sem cálculo de n-corpos a cada tique
      G.d3Force("charge", null);
      link.strength(0);
    }
  }

  function montarGrafo() {
    const nodes = [srv];
    const links = [];
    const usadas = new Set();
    const usar = (l) => { usadas.add(l.chave); links.push(l); };
    if (est.nivel === "agrupado") {
      for (const g of grupos.values()) {
        nodes.push(g);
        usar(ligacao(srv, g, g.cor, g.slug, true));
      }
    } else {
      for (const h of hubs.values()) {
        nodes.push(h);
        usar(ligacao(srv, h, h.cor, h.slug, true));
      }
      for (const no of nos.values()) {
        nodes.push(no);
        const h = hubs.get(no.classe);
        if (h) usar(ligacao(h, no, h.cor, h.slug, false));
        else usar(ligacao(srv, no, "#7A8194", no.classe, false)); // classe desconhecida
      }
    }
    for (const chave of [...ligacoes.keys()]) if (!usadas.has(chave)) ligacoes.delete(chave);
    G.graphData({ nodes, links });
  }

  function atualizarAtributos() {
    container.dataset.nos = String(est.nivel === "agrupado" ? 0 : nos.size);
    container.dataset.nivel = est.nivel;
    container.dataset.movimento = reduzido ? "reduzido" : "normal";
  }

  function trocarNivel(novo) {
    const antes = est.nivel;
    est.nivel = novo;
    if (novo !== "completo") desligarBloom();
    if (novo === "agrupado") {
      for (const no of nos.values()) animados.delete(no);
      nos.clear();
      assin = new Map(); // ao voltar, todos entram de novo
    } else {
      for (const g of grupos.values()) animados.delete(g);
      grupos.clear();
    }
    if (antes !== novo && novo !== "agrupado" && antes !== "agrupado") {
      // completo <-> reduzido: recria objetos (resolução das esferas)
      for (const no of nos.values()) animados.delete(no);
      G.nodeThreeObject((n) => objetoDe(n));
    }
  }

  function sincronizar(store) {
    if (est.destruido) return;
    est.store = store;
    est.total = assinaturas(store.itens).size;
    const d = decidirNivel({
      total: est.total, agrupadoPorFps: est.agrupadoPorFps, ultimaEntrada: est.ultimaEntradaFps,
    });
    est.agrupadoPorFps = d.agrupadoPorFps;
    if (d.nivel !== est.nivel) trocarNivel(d.nivel);

    const classes = classesDaCena(store);
    atualizarHubs(classes);
    if (est.nivel === "agrupado") {
      atualizarGrupos(classes);
      assin = new Map();
    } else {
      const dif = diferencaNos(assin, store.itens);
      aplicarDiferenca(dif);
      assin = assinaturas(store.itens);
    }
    posicionar();
    configurarForcas();
    aplicarAcessoriosDeLink();
    montarGrafo();
    atualizarAtributos();
  }

  function atualizarEstado(id) {
    if (est.destruido || !est.store) return;
    const it = est.store.itens.get(id);
    if (!it) return;
    if (est.nivel === "agrupado") {
      const g = grupos.get(it.classe);
      if (!g) return;
      const r = resumoPorClasse(est.store.itens).get(it.classe);
      if (r && r.pior !== g.estado) {
        g.estado = r.pior;
        revestir(g);
      }
      return;
    }
    const no = nos.get(id);
    if (!no || no.estado === it.estado) return;
    no.estado = it.estado;
    const a = assin.get(id);
    if (a) a.estado = it.estado;
    revestir(no);
  }

  // ---------- câmera, foco, estilo ----------
  function posicaoDe(no) {
    return { x: no.fx ?? no.x ?? 0, y: no.fy ?? no.y ?? 0, z: no.fz ?? no.z ?? 0 };
  }

  function aproximar(no, distancia) {
    const p = posicaoDe(no);
    G.cameraPosition(posicaoDeAproximacao(p, distancia) ?? CAMERA_PADRAO, p, reduzido ? 0 : CAMERA_MS);
  }

  function girar(ligado) {
    est.girando = ligado && !reduzido;
    controles.autoRotate = est.girando;
  }

  function clicar(no) {
    if (no.tipo === "equip") {
      focarEquipamento(no.id);
      aoClicarEquipamento(no.id);
    } else if (no.tipo === "classe" || no.tipo === "grupo") {
      aoClicarClasse(no.slug);
    } else if (no.tipo === "servidor" && est.store) {
      for (const it of est.store.itens.values()) {
        if (it.classe === CLASSE_SERVIDOR) {
          aoClicarEquipamento(it.id);
          break;
        }
      }
    }
  }

  function reaplicarEsmaecimento() {
    for (const h of hubs.values()) revestir(h);
    for (const g of grupos.values()) revestir(g);
    for (const no of nos.values()) revestir(no);
    aplicarAcessoriosDeLink();
  }

  function focarClasse(slug) {
    if (est.destruido) return;
    est.foco = slug ?? null;
    reaplicarEsmaecimento();
    if (est.foco === null) {
      girar(true);
      return;
    }
    girar(false);
    const alvo = est.nivel === "agrupado" ? grupos.get(est.foco) : hubs.get(est.foco);
    if (alvo) aproximar(alvo, 200);
  }

  /**
   * Câmera vai suavemente até o equipamento e a rotação para (painel aberto). No nível
   * agrupado o equipamento não está na cena: foca a classe dele. verTudo() desfaz.
   */
  function focarEquipamento(id) {
    if (est.destruido || !est.store) return;
    const it = est.store.itens.get(id);
    if (!it) return;
    if (est.nivel === "agrupado") {
      if (grupos.has(it.classe)) focarClasse(it.classe);
      return;
    }
    const no = nos.get(id);
    if (!no) return;
    girar(false);
    aproximar(no, 160);
  }

  // Pedido explícito do usuário: devolve a vista completa se o FPS a tinha agrupado.
  function liberarAgrupadoPorFps() {
    reiniciarMedicao();
    if (!est.agrupadoPorFps) return;
    est.agrupadoPorFps = limparAgrupadoPorFps({ agrupadoPorFps: true }).agrupadoPorFps;
    if (est.store) sincronizar(est.store);
  }

  function cameraGeral() {
    const e = est.estilo === "e";
    G.cameraPosition(e ? CAMERA_E : CAMERA_PADRAO, e ? ALVO_E : { x: 0, y: 0, z: 0 }, reduzido ? 0 : CAMERA_MS);
  }

  /** Tira o foco, volta a câmera à vista geral do estilo e retoma a rotação automática. */
  function verTudo() {
    if (est.destruido) return;
    liberarAgrupadoPorFps();
    if (est.foco !== null) {
      est.foco = null;
      reaplicarEsmaecimento();
    }
    girar(true);
    cameraGeral();
  }

  function definirEstilo(estilo) {
    if (est.destruido) return;
    const novo = estiloValido(estilo);
    if (novo === est.estilo) return;
    est.estilo = novo;
    liberarAgrupadoPorFps();
    if (est.store) {
      posicionar({ todos: true, animar: novo !== "a" });
      configurarForcas();
      aplicarAcessoriosDeLink();
      G.d3ReheatSimulation();
    }
    const alvo = est.foco && (est.nivel === "agrupado" ? grupos.get(est.foco) : hubs.get(est.foco));
    if (!alvo) cameraGeral();
    else if (!est.transicao) aproximar(alvo, 200); // com transição: foca ao terminar
  }

  // ---------- bloom ----------
  function decidirBloom() {
    const fps = medidor.media();
    if (est.nivel !== "completo" || !bloomPermitido(fps, reduzido)) {
      est.bloom = false;
      return;
    }
    const comp = G.postProcessingComposer();
    const passe = new UnrealBloomPass(new Vector2(G.width(), G.height()), 1.0, 0.5, 0.55);
    const saida = new OutputPass();
    comp.addPass(passe);
    comp.addPass(saida);
    brilhoParaComposicaoLinear(acervo, true);
    est.bloom = { passe, saida };
  }

  function desligarBloom() {
    if (est.bloom) {
      const comp = G.postProcessingComposer();
      comp.removePass(est.bloom.passe);
      comp.removePass(est.bloom.saida);
      est.bloom.passe.dispose();
      est.bloom.saida.dispose();
      brilhoParaComposicaoLinear(acervo, false); // halos normais de novo
    }
    if (est.bloom !== null) est.bloom = false; // só desliga; nunca religa
  }

  // ---------- laço de animação ----------
  function quadro(agora) {
    raf = requestAnimationFrame(quadro);
    medidor.quadro();
    if (est.inicioRender === null) est.inicioRender = agora;
    if (est.bloom === null && agora - est.inicioRender >= AVALIAR_BLOOM_MS) decidirBloom();
    if (agora - est.ultimoCheque >= 1000) {
      est.ultimoCheque = agora;
      // R5: com a contagem já agrupando, decidirNivel nem consulta o FPS
      if (est.store && !est.agrupadoPorFps) {
        const d = decidirNivel({
          total: est.total, agrupadoPorFps: false, queda: quedaSustentada(medidor), agora,
          ultimaEntrada: est.ultimaEntradaFps,
        });
        if (d.agrupadoPorFps) {
          est.agrupadoPorFps = true;
          est.ultimaEntradaFps = d.ultimaEntrada;
          sincronizar(est.store);
        }
      }
    }

    const tr = est.transicao;
    if (tr) {
      if (tr.inicio === null) tr.inicio = agora;
      const k = suave(Math.min(1, (agora - tr.inicio) / TRANSICAO_MS));
      for (const [no, p] of tr.para) {
        const d = tr.de.get(no);
        no.fx = d.x + (p.x - d.x) * k;
        no.fy = d.y + (p.y - d.y) * k;
        no.fz = d.z + (p.z - d.z) * k;
      }
      if (k >= 1) {
        est.transicao = null;
        if (est.foco) focarClasse(est.foco);
      }
    }

    if (reduzido) return;
    const t = agora / 1000;
    const aneis = srv.__threeObj?.userData.aneis;
    if (aneis) {
      aneis[0].rotation.x = t * 0.5;
      aneis[0].rotation.y = t * 0.3;
      aneis[1].rotation.y = -t * 0.25;
      aneis[1].rotation.z = t * 0.2;
    }
    estrelas.rotation.y = t * 0.004; // paralaxe lenta
    estrelas.rotation.x = Math.sin(t * 0.05) * 0.02;
    const onda = Math.abs(Math.sin(t * 3.2));
    for (const no of animados) {
      const obj = no.__threeObj;
      if (!obj) continue;
      const u = obj.userData, esc = u.escala || 1;
      if (u.aparencia.pulsa) {
        // super-nó (esc > 1): pulso mais contido, o halo já é grande
        const amp = esc > 1 ? 0.25 : 0.55, base = esc > 1 ? 1 : 1.4;
        const s = TAMANHO.haloEquipamento * esc * (1 + amp * onda) * base;
        u.halo.scale.set(s, s, 1);
        u.esfera.scale.setScalar(esc * (esc > 1 ? 0.95 + 0.1 * onda : 0.85 + 0.3 * onda));
      } else if (u.aparencia.treme) {
        u.esfera.position.set(Math.sin(t * 37 + u.semente) * 0.35, Math.cos(t * 41 + u.semente) * 0.35, 0);
      }
    }
  }

  function iniciarLaco() {
    if (raf === null) raf = requestAnimationFrame(quadro);
  }

  // ---------- pausa, tamanho, visibilidade ----------
  function reiniciarMedicao() {
    medidor = criarMedidorFps(); // amostras de antes da pausa não valem
    est.inicioRender = null;
    est.ultimoCheque = 0;
  }

  function pausar() {
    if (est.destruido || est.pausado) return;
    est.pausado = true;
    if (raf !== null) cancelAnimationFrame(raf);
    raf = null;
    G.pauseAnimation();
  }

  function retomar() {
    if (est.destruido || !est.pausado) return;
    est.pausado = false;
    G.resumeAnimation();
    liberarAgrupadoPorFps(); // também zera o medidor
    iniciarLaco();
  }

  function aoMudarVisibilidade() {
    if (document.visibilityState === "visible" && !est.pausado) reiniciarMedicao();
  }
  document.addEventListener("visibilitychange", aoMudarVisibilidade);

  function redimensionar() {
    const w = container.clientWidth, h = container.clientHeight;
    if (w > 0 && h > 0 && (w !== G.width() || h !== G.height())) G.width(w).height(h);
  }
  let observador = null;
  if (typeof ResizeObserver === "function") {
    observador = new ResizeObserver(redimensionar);
    observador.observe(container);
  } else {
    window.addEventListener("resize", redimensionar);
  }

  // ---------- destruir ----------
  function liberarObjeto(obj) {
    obj.traverse((o) => {
      o.geometry?.dispose();
      const mats = Array.isArray(o.material) ? o.material : o.material ? [o.material] : [];
      for (const m of mats) {
        m.map?.dispose();
        m.dispose();
      }
    });
  }

  function destruir() {
    if (est.destruido) return;
    est.destruido = true;
    if (raf !== null) cancelAnimationFrame(raf);
    raf = null;
    document.removeEventListener("visibilitychange", aoMudarVisibilidade);
    if (observador) observador.disconnect();
    else window.removeEventListener("resize", redimensionar);

    const renderer = G.renderer();
    const comp = G.postProcessingComposer();
    G.pauseAnimation();
    G.onNodeClick(null).onNodeHover(null);
    liberarObjeto(scene); // nós, links, partículas, estrelas, rótulos (compartilhados: no-op)
    acervo.liberar(); // agora sim: geometrias, materiais e texturas comuns
    G._destructor(); // esvazia o grafo (a lib descarta o que restar)
    for (const p of comp.passes) p.dispose?.();
    comp.dispose();
    controles.dispose();
    scene.clear();
    scene.fog = null;
    renderer.dispose();
    renderer.forceContextLoss();
    if (window.scene === scene) delete window.scene; // three-render-objects expõe a cena em window
    animados.clear();
    nos.clear(); hubs.clear(); grupos.clear(); ligacoes.clear();
    container.replaceChildren();
    container.style.cursor = "";
    container.classList.remove("teia-cena");
    delete container.dataset.nos;
    delete container.dataset.nivel;
    delete container.dataset.movimento;
  }

  atualizarAtributos();
  iniciarLaco();

  return {
    sincronizar,
    atualizarEstado,
    definirEstilo,
    focarClasse,
    focarEquipamento,
    verTudo,
    pausar,
    retomar,
    destruir,
    nivel: () => est.nivel,
  };
}
