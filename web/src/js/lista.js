// Estado em memória da lista (fora da reatividade do Alpine) e funções puras de
// filtro, ordenação, paginação e contadores. 300–2000 itens cabem folgados aqui; só a
// página visível (50 linhas) vira objeto reativo.

import { motivoInalcancavel, vinculoDoGravador } from "./dependencia.js";

export const POR_PAGINA = 50;

/** Rótulo, ícone e peso (gravidade, para ordenar) de cada estado. */
export const ESTADOS = {
  online: { rotulo: "Online", icone: "i-online", peso: 5 },
  suspeito: { rotulo: "Online", icone: "i-online", peso: 5, dica: "verificando" },
  instavel: { rotulo: "Instável", icone: "i-instavel", peso: 2 },
  offline: { rotulo: "Offline", icone: "i-offline", peso: 0 },
  inalcancavel: { rotulo: "Inalcançável", icone: "i-inalcancavel", peso: 1 },
  pausado: { rotulo: "Pausado", icone: "i-pausado", peso: 4 },
  desconhecido: { rotulo: "Aguardando", icone: "i-desconhecido", peso: 3 },
};

/** Grupo do contador/filtro: "suspeito" conta como online (§9.2: nunca vermelho). */
export function grupoDe(estado) {
  if (estado === "suspeito") return "online";
  return ESTADOS[estado] ? (estado === "desconhecido" ? "aguardando" : estado) : "aguardando";
}

function normalizar(texto) {
  return String(texto || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

function ipNumerico(ip) {
  const partes = String(ip).split(".");
  if (partes.length !== 4) return Number.MAX_SAFE_INTEGER;
  return partes.reduce((acc, p) => acc * 256 + (Number.parseInt(p, 10) || 0), 0);
}

export function criarStore() {
  return {
    itens: new Map(), // id -> equipamento
    classes: new Map(), // slug -> classe
    ordemClasses: [],
  };
}

export function aplicarSnapshot(store, msg) {
  store.itens.clear();
  store.classes.clear();
  store.ordemClasses = [];
  for (const c of msg.classes || []) {
    store.classes.set(c.slug, c);
    store.ordemClasses.push(c);
  }
  for (const e of msg.equipamentos || []) store.itens.set(e.id, prepararItem(e));
}

export function prepararItem(e) {
  return {
    id: e.id,
    nome: e.nome,
    ip: e.ip,
    classe: e.classe,
    estado: e.estado,
    desde: e.desde,
    latencia_ms: e.latencia_ms ?? null,
    checagem: e.checagem || "icmp",
    porta: e.porta ?? null,
    pai_id: typeof e.pai_id === "string" ? e.pai_id : null, // "Depende de" / gravador da câmera
    causa: typeof e.causa === "string" ? e.causa : null, // "pai:<id>" quando inalcançável
    canal: Number.isInteger(e.canal) ? e.canal : null,
    _busca: normalizar(`${e.nome} ${e.ip}`),
    _ip: ipNumerico(e.ip),
  };
}

/** @returns {boolean} false se o id é desconhecido (pede ressincronização). */
export function aplicarEstado(store, msg) {
  const item = store.itens.get(msg.id);
  if (!item) return false;
  item.estado = msg.estado;
  item.desde = msg.desde;
  item.causa = typeof msg.causa === "string" ? msg.causa : null;
  if (msg.estado === "offline" || msg.estado === "pausado" || msg.estado === "inalcancavel") {
    item.latencia_ms = null;
  }
  return true;
}

/**
 * Mensagem "equipamento" do WS (aprovação, IP mudado, checagem trocada): criado/atualizado
 * trazem a linha no formato do snapshot e viram upsert (idempotente: o gravador pode ser
 * anunciado "criado" mais de uma vez); removido apaga. @returns {boolean} o store mudou.
 */
export function aplicarEquipamento(store, msg) {
  if (!msg) return false;
  if (msg.acao === "removido") return typeof msg.id === "string" && store.itens.delete(msg.id);
  if (msg.acao !== "criado" && msg.acao !== "atualizado") return false;
  const e = msg.equipamento;
  if (!e || typeof e.id !== "string" || typeof e.nome !== "string") return false;
  const anterior = store.itens.get(e.id);
  const novo = prepararItem(e);
  // a linha do WS não traz a causa: quem continua inalcançável continua com ela
  if (novo.causa === null && anterior && anterior.estado === novo.estado) novo.causa = anterior.causa;
  store.itens.set(e.id, novo);
  return true;
}

/** "Atrás do gravador NVR A, canal 3" para câmera de gravador; "" para os demais. */
export function atrasDoGravador(item, store) {
  if (!item || !item.pai_id || !vinculoDoGravador(item)) return "";
  const pai = store.itens.get(item.pai_id);
  const canal = item.canal !== null && item.canal !== undefined ? `, canal ${item.canal}` : "";
  return pai ? `Atrás do gravador ${pai.nome}${canal}` : `Atrás do gravador${canal}`;
}

export function aplicarLatencias(store, lote) {
  for (const par of lote || []) {
    const item = store.itens.get(par[0]);
    if (item) item.latencia_ms = par[1];
  }
}

export function contar(store) {
  const c = { total: 0, online: 0, instavel: 0, offline: 0, inalcancavel: 0, pausado: 0, aguardando: 0 };
  for (const item of store.itens.values()) {
    c.total += 1;
    c[grupoDe(item.estado)] += 1;
  }
  return c;
}

const COMPARADORES = {
  nome: (a, b) => a.nome.localeCompare(b.nome, "pt-BR", { numeric: true }),
  ip: (a, b) => a._ip - b._ip,
  classe: (a, b, store) =>
    (store.classes.get(a.classe)?.nome || a.classe).localeCompare(
      store.classes.get(b.classe)?.nome || b.classe,
      "pt-BR",
    ),
  estado: (a, b) => (ESTADOS[a.estado]?.peso ?? 9) - (ESTADOS[b.estado]?.peso ?? 9),
  desde: (a, b) => Date.parse(a.desde) - Date.parse(b.desde),
  latencia: (a, b) => (a.latencia_ms ?? Infinity) - (b.latencia_ms ?? Infinity),
};

/** Filtra e ordena; devolve a lista completa filtrada (ainda não paginada). */
export function filtrar(store, { classe, estado, busca }, { campo, crescente }) {
  const termo = normalizar(busca).trim();
  const resultado = [];
  for (const item of store.itens.values()) {
    if (classe && item.classe !== classe) continue;
    if (estado && grupoDe(item.estado) !== estado) continue;
    if (termo && !item._busca.includes(termo)) continue;
    resultado.push(item);
  }
  const cmp = COMPARADORES[campo] || COMPARADORES.nome;
  const sinal = crescente ? 1 : -1;
  resultado.sort((a, b) => sinal * cmp(a, b, store) || COMPARADORES.nome(a, b));
  return resultado;
}

export function paginar(lista, pagina) {
  const paginas = Math.max(1, Math.ceil(lista.length / POR_PAGINA));
  const atual = Math.min(Math.max(1, pagina), paginas);
  const inicio = (atual - 1) * POR_PAGINA;
  return { itens: lista.slice(inicio, inicio + POR_PAGINA), pagina: atual, paginas };
}

// Criado só no 1º uso: Intl.RelativeTimeFormat não existe no Chromium 63 (TV Tizen 5.0) e,
// no topo do módulo, derrubaria o bundle do telão inteiro antes de qualquer coisa.
let relativo;
const UNIDADES = { minute: ["minuto", "minutos"], hour: ["hora", "horas"], day: ["dia", "dias"] };

function formatarRelativo(n, unidade) {
  if (relativo === undefined) {
    relativo = typeof Intl.RelativeTimeFormat === "function"
      ? new Intl.RelativeTimeFormat("pt-BR", { numeric: "auto" })
      : null;
  }
  if (relativo) return relativo.format(n, unidade);
  const abs = Math.abs(n);
  const texto = `${abs} ${UNIDADES[unidade][abs === 1 ? 0 : 1]}`;
  return n < 0 ? `há ${texto}` : `em ${texto}`;
}

export function haQuanto(iso, agora = Date.now()) {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return "—";
  const s = Math.round((t - agora) / 1000);
  const abs = Math.abs(s);
  if (abs < 45) return "agora";
  if (abs < 3600) return formatarRelativo(Math.round(s / 60), "minute");
  if (abs < 86400) return formatarRelativo(Math.round(s / 3600), "hour");
  return formatarRelativo(Math.round(s / 86400), "day");
}

export function formatarLatencia(ms) {
  if (ms === null || ms === undefined) return "—";
  return ms < 10 ? `${ms.toFixed(1)} ms` : `${Math.round(ms)} ms`;
}

/** "ICMP", "TCP 554", "HTTP 80": tipo de checagem e porta, para a lista. */
export function rotuloChecagem(checagem, porta) {
  const tipo = String(checagem || "icmp").toUpperCase();
  return porta ? `${tipo} ${porta}` : tipo;
}

/** Linha pronta para a tela (objeto plano, sem referência ao store). */
export function linhaDeTela(item, store, agora) {
  const est = ESTADOS[item.estado] || ESTADOS.desconhecido;
  const classe = store.classes.get(item.classe);
  return {
    id: item.id,
    nome: item.nome,
    ip: item.ip,
    classe: classe ? classe.nome : item.classe,
    corClasse: classe ? classe.cor : "",
    estadoClasse: `estado st-${ESTADOS[item.estado] ? item.estado : "desconhecido"}`,
    estadoIcone: `#${est.icone}`,
    estadoRotulo: est.rotulo,
    estadoDica: est.dica ? `${est.rotulo} (${est.dica})` : est.rotulo,
    desde: haQuanto(item.desde, agora),
    desdeTitulo: item.desde,
    latencia: formatarLatencia(item.latencia_ms),
    checagem: rotuloChecagem(item.checagem, item.porta),
    atras: atrasDoGravador(item, store),
    motivo: motivoInalcancavel(item, store),
  };
}
