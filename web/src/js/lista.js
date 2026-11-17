// Estado em memória da lista (fora da reatividade do Alpine) e funções puras de
// filtro, ordenação, paginação e contadores. 300–2000 itens cabem folgados aqui; só a
// página visível (50 linhas) vira objeto reativo.

export const POR_PAGINA = 50;

/** Rótulo, ícone e peso (gravidade, para ordenar) de cada estado. */
export const ESTADOS = {
  online: { rotulo: "Online", icone: "i-online", peso: 4 },
  suspeito: { rotulo: "Online", icone: "i-online", peso: 4, dica: "verificando" },
  instavel: { rotulo: "Instável", icone: "i-instavel", peso: 1 },
  offline: { rotulo: "Offline", icone: "i-offline", peso: 0 },
  pausado: { rotulo: "Pausado", icone: "i-pausado", peso: 3 },
  desconhecido: { rotulo: "Aguardando", icone: "i-desconhecido", peso: 2 },
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
  if (msg.estado === "offline" || msg.estado === "pausado") item.latencia_ms = null;
  return true;
}

export function aplicarLatencias(store, lote) {
  for (const par of lote || []) {
    const item = store.itens.get(par[0]);
    if (item) item.latencia_ms = par[1];
  }
}

export function contar(store) {
  const c = { total: 0, online: 0, instavel: 0, offline: 0, pausado: 0, aguardando: 0 };
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

const relativo = new Intl.RelativeTimeFormat("pt-BR", { numeric: "auto" });

export function haQuanto(iso, agora = Date.now()) {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return "—";
  const s = Math.round((t - agora) / 1000);
  const abs = Math.abs(s);
  if (abs < 45) return "agora";
  if (abs < 3600) return relativo.format(Math.round(s / 60), "minute");
  if (abs < 86400) return relativo.format(Math.round(s / 3600), "hour");
  return relativo.format(Math.round(s / 86400), "day");
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
  };
}
