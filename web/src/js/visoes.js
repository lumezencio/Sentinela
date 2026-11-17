// Visões do painel (abas Lista/Teia/Organograma): rota pelo hash, estilo salvo da Teia,
// detecção de WebGL, carga preguiçosa do bundle 3D e dados prontos para os painéis da
// Teia. Funções puras ou com dependências injetáveis (testadas no Node, sem navegador).
// Não importa nada de js/teia/: esses fontes só existem dentro do bundle.
import { ESTADOS, formatarLatencia, grupoDe, haQuanto, paginar, rotuloChecagem } from "./lista.js";

export const ABAS = ["lista", "teia", "organograma"];

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
    return Boolean(canvas.getContext("webgl2") || canvas.getContext("webgl"));
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
      c = { online: 0, instavel: 0, offline: 0, pausado: 0, aguardando: 0 };
      contagens.set(it.classe, c);
    }
    c[grupoDe(it.estado)] += 1;
  }
  const ordenadas = [...store.ordemClasses].sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0));
  const lista = [];
  for (const classe of ordenadas) {
    if (classe.slug === CLASSE_SERVIDOR) continue;
    const contagem = contagens.get(classe.slug) || {
      online: 0, instavel: 0, offline: 0, pausado: 0, aguardando: 0,
    };
    const total = Object.values(contagem).reduce((a, b) => a + b, 0);
    const partes = [plural(total, "equipamento", "equipamentos")];
    if (contagem.offline) partes.push(`${contagem.offline} offline`);
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
  };
}

const formatoData = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" });

function rotuloEstado(estado) {
  const est = ESTADOS[estado];
  if (!est) return String(estado ?? "—");
  return est.dica ? `${est.rotulo} (${est.dica})` : est.rotulo;
}

/** Linha do histórico ("de → para" e data pt-BR) a partir de um EventoSaida da API. */
export function linhaDeHistorico(evento) {
  const t = Date.parse(evento.em);
  return {
    id: evento.id,
    de: rotuloEstado(evento.de),
    para: rotuloEstado(evento.para),
    paraClasse: `st-${chaveEstado(evento.para)}`,
    data: Number.isNaN(t) ? "—" : formatoData.format(t),
    dataIso: String(evento.em ?? ""),
  };
}
