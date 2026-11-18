// Visões do painel (abas Lista/Teia/Organograma): rota pelo hash, estilo salvo da Teia,
// detecção de WebGL, carga preguiçosa do bundle 3D e dados prontos para os painéis da
// Teia. Funções puras ou com dependências injetáveis (testadas no Node, sem navegador).
// Não importa nada de js/teia/: esses fontes só existem dentro do bundle.
import { vinculoDoGravador } from "./dependencia.js";
import {
  atrasDoGravador, ESTADOS, formatarLatencia, grupoDe, haQuanto, paginar, rotuloChecagem,
} from "./lista.js";

export const ABAS = ["lista", "teia", "organograma", "novos", "configuracoes"];

/** Aba a partir de location.hash ("#teia" → "teia"); qualquer outra coisa → "lista". */
export function abaDoHash(hash) {
  const nome = String(hash || "").replace(/^#/, "");
  return ABAS.includes(nome) ? nome : "lista";
}

// cópia de js/teia/estilos.js (o teste visoes.test.mjs garante que são iguais): a página
// precisa dos nomes antes de baixar o bundle
export const ESTILOS = ["a", "b", "c", "d", "e"];
export const NOMES_ESTILO = {
  a: "Constelação", b: "Órbitas", c: "Galáxia", d: "Átomo", e: "Árvore 3D",
};
export const CHAVE_ESTILO = "sentinela.teia.estilo";

function armazenamentoPadrao() {
  return globalThis.window.localStorage; // pode lançar (modo privado, política do navegador)
}

/** Estilo salvo no localStorage, validado contra ESTILOS; qualquer falha → "a". */
export function estiloSalvo(armazenamento) {
  try {
    const valor = (armazenamento || armazenamentoPadrao()).getItem(CHAVE_ESTILO);
    return ESTILOS.includes(valor) ? valor : "a";
  } catch {
    return "a";
  }
}

/** Grava o estilo (só valores de ESTILOS); sem armazenamento vale só nesta aba. */
export function salvarEstilo(estilo, armazenamento) {
  if (!ESTILOS.includes(estilo)) return;
  try {
    (armazenamento || armazenamentoPadrao()).setItem(CHAVE_ESTILO, estilo);
  } catch {
    /* armazenamento bloqueado */
  }
}

/** Há contexto WebGL (2 ou 1) neste navegador? */
export function webglDisponivel(doc = globalThis.document) {
  try {
    const canvas = doc.createElement("canvas");
    const ctx = canvas.getContext("webgl2") || canvas.getContext("webgl");
    if (!ctx) return false;
    // só uma sondagem: devolve o contexto já (o navegador limita quantos ficam vivos)
    const perder = typeof ctx.getExtension === "function" ? ctx.getExtension("WEBGL_lose_context") : null;
    if (perder) perder.loseContext();
    return true;
  } catch {
    return false;
  }
}

export const URL_BUNDLE_TEIA = "/vendor/teia-3d.bundle.js";
let promessaTeia = null;

/** import() do bundle da Teia uma única vez; se falhar, a próxima chamada tenta de novo. */
export function carregarTeia(importar = (url) => import(url)) {
  if (!promessaTeia) {
    promessaTeia = Promise.resolve()
      .then(() => importar(URL_BUNDLE_TEIA))
      .catch((erro) => {
        promessaTeia = null;
        throw erro;
      });
  }
  return promessaTeia;
}

// ---------- dados dos painéis da Teia ----------
const CLASSE_SERVIDOR = "sentinela";
const COR_HEX = /^#[0-9a-f]{6}$/i;

const corSegura = (cor) => (COR_HEX.test(String(cor || "")) ? cor : "");
const chaveEstado = (estado) => (ESTADOS[estado] ? estado : "desconhecido");

function plural(n, um, varios) {
  return `${n} ${n === 1 ? um : varios}`;
}

/** Classes do painel lateral (ordem do backend, sem a do servidor) com contagem por estado. */
export function resumoDasClasses(store) {
  const contagens = new Map();
  for (const it of store.itens.values()) {
    let c = contagens.get(it.classe);
    if (!c) {
      c = { online: 0, instavel: 0, offline: 0, inalcancavel: 0, pausado: 0, aguardando: 0 };
      contagens.set(it.classe, c);
    }
    c[grupoDe(it.estado)] += 1;
  }
  const ordenadas = [...store.ordemClasses].sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0));
  const lista = [];
  for (const classe of ordenadas) {
    if (classe.slug === CLASSE_SERVIDOR) continue;
    const contagem = contagens.get(classe.slug) || {
      online: 0, instavel: 0, offline: 0, inalcancavel: 0, pausado: 0, aguardando: 0,
    };
    const total = Object.values(contagem).reduce((a, b) => a + b, 0);
    const partes = [plural(total, "equipamento", "equipamentos")];
    if (contagem.offline) partes.push(`${contagem.offline} offline`);
    if (contagem.inalcancavel) {
      partes.push(plural(contagem.inalcancavel, "inalcançável", "inalcançáveis"));
    }
    if (contagem.instavel) partes.push(plural(contagem.instavel, "instável", "instáveis"));
    if (contagem.pausado) partes.push(plural(contagem.pausado, "pausado", "pausados"));
    lista.push({
      slug: classe.slug,
      nome: classe.nome,
      cor: corSegura(classe.cor),
      total,
      vazia: total === 0,
      contagem,
      rotulo: `${classe.nome}: ${partes.join(", ")}`,
    });
  }
  return lista;
}

const pesoDe = (item) => ESTADOS[item.estado]?.peso ?? 9;
const porNome = (a, b) => a.nome.localeCompare(b.nome, "pt-BR", { numeric: true });

/** Equipamentos da classe focada: piores estados primeiro, depois nome; 50 por página. */
export function equipamentosDaClasse(store, slug, pagina) {
  const daClasse = [];
  for (const it of store.itens.values()) if (it.classe === slug) daClasse.push(it);
  daClasse.sort((a, b) => pesoDe(a) - pesoDe(b) || porNome(a, b));
  const pag = paginar(daClasse, pagina);
  return {
    itens: pag.itens.map((it) => {
      const est = ESTADOS[chaveEstado(it.estado)];
      return {
        id: it.id,
        nome: it.nome,
        ip: it.ip,
        estadoClasse: `estado st-${chaveEstado(it.estado)}`,
        estadoIcone: `#${est.icone}`,
        estadoRotulo: est.rotulo,
      };
    }),
    pagina: pag.pagina,
    paginas: pag.paginas,
    total: daClasse.length,
  };
}

/** Dados do painel do equipamento (objeto plano, sem referência ao store). */
export function fichaDoEquipamento(item, store, agora = Date.now()) {
  const chave = chaveEstado(item.estado);
  const est = ESTADOS[chave];
  const classe = store.classes.get(item.classe);
  const pai = item.pai_id ? store.itens.get(item.pai_id) : null;
  return {
    id: item.id,
    nome: item.nome,
    classe: classe ? classe.nome : item.classe,
    corClasse: corSegura(classe && classe.cor),
    ip: item.ip,
    checagem: rotuloChecagem(item.checagem, item.porta),
    estadoClasse: `estado st-${chave}`,
    estadoIcone: `#${est.icone}`,
    estadoRotulo: est.dica ? `${est.rotulo} (${est.dica})` : est.rotulo,
    desde: haQuanto(item.desde, agora),
    desdeTitulo: item.desde,
    latencia: formatarLatencia(item.latencia_ms),
    pausado: item.estado === "pausado",
    atras: atrasDoGravador(item, store),
    // "Depende de": o vínculo da câmera/gravador é do gravador (só leitura); os demais o admin edita
    dependeDeId: item.pai_id || "",
    dependeDe: item.pai_id ? (pai ? pai.nome : "equipamento removido") : "",
    dependeSoLeitura: vinculoDoGravador(item),
  };
}

const formatoData = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" });
const VOLTAS = new Set(["online", "suspeito", "instavel"]);
export const MAX_QUEDAS = 10;

/** "42 s", "3 min", "2 h 5 min", "1 d 2 h". */
export function formatarDuracao(segundos) {
  const n = Number(segundos);
  if (!Number.isFinite(n)) return "—";
  const s = Math.max(0, Math.round(n));
  if (s < 60) return `${s} s`;
  const min = Math.round(s / 60);
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60), m = min % 60;
  if (h < 24) return m ? `${h} h ${m} min` : `${h} h`;
  const d = Math.floor(h / 24), hr = h % 24;
  return hr ? `${d} d ${hr} h` : `${d} d`;
}

/**
 * R7: só as quedas (para "offline"), das mais recentes para as mais antigas (a API já
 * devolve assim), até 10, cada uma com a data e, se o evento seguinte foi a volta,
 * "voltou após <duração>" (duracao_s do evento de volta ou diferença das datas).
 */
export function quedasDoHistorico(eventos) {
  if (!Array.isArray(eventos)) return [];
  const quedas = [];
  for (let i = 0; i < eventos.length && quedas.length < MAX_QUEDAS; i++) {
    const ev = eventos[i];
    if (!ev || ev.para !== "offline") continue;
    const t = Date.parse(ev.em);
    let volta = "";
    const seguinte = i > 0 ? eventos[i - 1] : null;
    if (!seguinte) {
      volta = "ainda offline";
    } else if (VOLTAS.has(seguinte.para)) {
      const dur = Number.isFinite(seguinte.duracao_s)
        ? seguinte.duracao_s
        : (Date.parse(seguinte.em) - t) / 1000;
      volta = `voltou após ${formatarDuracao(dur)}`;
    }
    quedas.push({
      id: ev.id,
      data: Number.isNaN(t) ? "—" : formatoData.format(t),
      dataIso: String(ev.em ?? ""),
      volta,
    });
  }
  return quedas;
}

/**
 * Quanto da área da cena (px) os painéis cobrem: painel mais alto que largo (em proporção
 * da cena) → lado (esquerda/direita); mais largo → faixa em cima/embaixo. Caixas como as de getBoundingClientRect; vazias ignoradas.
 */
export function margensDosPaineis(palco, caixas) {
  const m = { esquerda: 0, direita: 0, cima: 0, baixo: 0 };
  const cx = palco.left + palco.width / 2, cy = palco.top + palco.height / 2;
  for (const c of caixas || []) {
    if (!c || !(c.width > 0) || !(c.height > 0)) continue;
    // faixa (cima/baixo) se cobre proporcionalmente mais largura que altura; senão, lado
    const faixa = c.width / palco.width > c.height / palco.height;
    if (faixa) {
      if (c.top + c.height / 2 < cy) m.cima = Math.max(m.cima, Math.round(c.bottom - palco.top));
      else m.baixo = Math.max(m.baixo, Math.round(palco.bottom - c.top));
    } else if (c.left + c.width / 2 < cx) {
      m.esquerda = Math.max(m.esquerda, Math.round(c.right - palco.left));
    } else {
      m.direita = Math.max(m.direita, Math.round(palco.right - c.left));
    }
  }
  return m;
}
