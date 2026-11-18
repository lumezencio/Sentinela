// Cliente HTTP mínimo: mesma origem, cookies de sessão, X-CSRF em toda escrita.

const BASE = "/api/v1";
const MSG_GENERICA = "Não foi possível concluir. Tente de novo.";

export function lerCookie(nome) {
  const prefixo = `${nome}=`;
  for (const parte of document.cookie.split(";")) {
    const item = parte.trim();
    if (item.startsWith(prefixo)) return decodeURIComponent(item.slice(prefixo.length));
  }
  return "";
}

export function irParaLogin() {
  window.location.replace("login.html");
}

/** Mensagem segura para a tela: só textos fixos do servidor (strings), nunca HTML. */
function mensagemDe(dados, status) {
  if (dados && typeof dados.detail === "string") return dados.detail;
  if (status === 422) return "Verifique os campos e tente de novo.";
  if (status === 403) return "Sem permissão para esta ação.";
  if (status === 429) return "Muitas tentativas seguidas. Aguarde um pouco e tente de novo.";
  return MSG_GENERICA;
}

/**
 * @returns {Promise<{ok: boolean, status: number, dados: any, erro: string, espera: number}>}
 */
export async function requisitar(metodo, caminho, { json, form, redirecionar401 = true } = {}) {
  const cabecalhos = { Accept: "application/json" };
  if (metodo !== "GET") cabecalhos["X-CSRF"] = lerCookie("sentinela_csrf");
  let corpo;
  if (json !== undefined) {
    cabecalhos["Content-Type"] = "application/json";
    corpo = JSON.stringify(json);
  } else if (form !== undefined) {
    corpo = form; // o navegador define o boundary do multipart
  }
  let resposta;
  try {
    resposta = await fetch(BASE + caminho, {
      method: metodo,
      headers: cabecalhos,
      body: corpo,
      credentials: "same-origin",
      cache: "no-store",
    });
  } catch {
    return { ok: false, status: 0, dados: null, erro: "Sem conexão com o servidor.", espera: 0 };
  }
  if (resposta.status === 401 && redirecionar401) {
    irParaLogin();
  }
  let dados = null;
  if (resposta.status !== 204) {
    try {
      dados = await resposta.json();
    } catch {
      dados = null;
    }
  }
  const espera = Number.parseInt(resposta.headers.get("Retry-After") || "0", 10) || 0;
  return {
    ok: resposta.ok,
    status: resposta.status,
    dados,
    erro: resposta.ok ? "" : mensagemDe(dados, resposta.status),
    espera,
  };
}

export const api = {
  entrar: (login, senha) =>
    requisitar("POST", "/auth/login", { json: { login, senha }, redirecionar401: false }),
  sair: () => requisitar("POST", "/auth/logout", { redirecionar401: false }),
  eu: () => requisitar("GET", "/auth/eu"),
  criarEquipamento: (dados) => requisitar("POST", "/equipamentos", { json: dados }),
  eventosEquipamento: (id) =>
    requisitar("GET", `/equipamentos/${encodeURIComponent(id)}/eventos?limit=50`),
  pausarEquipamento: (id) => requisitar("POST", `/equipamentos/${encodeURIComponent(id)}/pausar`),
  retomarEquipamento: (id) =>
    requisitar("POST", `/equipamentos/${encodeURIComponent(id)}/retomar`),
  definirPai: (id, paiId) =>
    requisitar("PATCH", `/equipamentos/${encodeURIComponent(id)}`, { json: { pai_id: paiId } }),
  listarSubredes: () => requisitar("GET", "/subredes"),
  criarSubrede: (cidr) => requisitar("POST", "/subredes", { json: { cidr } }),
  removerSubrede: (id) => requisitar("DELETE", `/subredes/${encodeURIComponent(id)}`),
  // ---- descoberta (Fase 3) ----
  listarDescobertas: (status, offset, limit) =>
    requisitar(
      "GET",
      `/descobertas?status=${encodeURIComponent(status)}&limit=${limit}&offset=${offset}`,
    ),
  aprovarDescoberta: (id, dados) =>
    requisitar("POST", `/descobertas/${encodeURIComponent(id)}/aprovar`, { json: dados }),
  aprovarLote: (ids) => requisitar("POST", "/descobertas/aprovar-lote", { json: { ids } }),
  ignorarDescoberta: (id) => requisitar("POST", `/descobertas/${encodeURIComponent(id)}/ignorar`),
  reabrirDescoberta: (id) => requisitar("POST", `/descobertas/${encodeURIComponent(id)}/reabrir`),
  sondarDescoberta: (id) => requisitar("POST", `/descobertas/${encodeURIComponent(id)}/sondar`),
  declararSubrede: (id) =>
    requisitar("POST", `/descobertas/${encodeURIComponent(id)}/declarar-subrede`),
  listarFontes: () => requisitar("GET", "/fontes"),
  criarFonte: (dados) => requisitar("POST", "/fontes", { json: dados }),
  editarFonte: (id, dados) =>
    requisitar("PATCH", `/fontes/${encodeURIComponent(id)}`, { json: dados }),
  removerFonte: (id) => requisitar("DELETE", `/fontes/${encodeURIComponent(id)}`),
  testarFonte: (id) => requisitar("POST", `/fontes/${encodeURIComponent(id)}/testar`),
  confiarFonte: (id, impressao) =>
    requisitar("POST", `/fontes/${encodeURIComponent(id)}/confiar`, { json: { impressao } }),
  coletarFonte: (id) => requisitar("POST", `/fontes/${encodeURIComponent(id)}/coletar`),
  editarSubrede: (id, permite) =>
    requisitar("PATCH", `/subredes/${encodeURIComponent(id)}`, {
      json: { permite_varredura: permite },
    }),
  verVarredura: () => requisitar("GET", "/varredura"),
  iniciarVarredura: (subRedeId) =>
    requisitar("POST", "/varredura", { json: { sub_rede_id: subRedeId } }),
  cancelarVarredura: () => requisitar("DELETE", "/varredura"),
  verAjustes: () => requisitar("GET", "/config/descoberta"),
  editarAjustes: (dados) => requisitar("PATCH", "/config/descoberta", { json: dados }),
  // ---- alertas, silêncios e Telegram (Fase 4) ----
  listarAlertas: ({ filtro = "abertos", classe = "", desde = "", pagina = 1, porPagina = 50 }) => {
    const q = new URLSearchParams({ filtro, pagina: String(pagina), por_pagina: String(porPagina) });
    if (classe) q.set("classe", classe);
    if (desde) q.set("desde", desde);
    return requisitar("GET", `/alertas?${q}`);
  },
  verAlerta: (id) => requisitar("GET", `/alertas/${encodeURIComponent(id)}`),
  reconhecerAlerta: (id) => requisitar("POST", `/alertas/${encodeURIComponent(id)}/reconhecer`),
  listarSilencios: () => requisitar("GET", "/silencios"),
  criarSilencio: (dados) => requisitar("POST", "/silencios", { json: dados }),
  encerrarSilencio: (id) => requisitar("POST", `/silencios/${encodeURIComponent(id)}/encerrar`),
  verTelegram: () => requisitar("GET", "/config/telegram"),
  editarTelegram: (dados) => requisitar("PATCH", "/config/telegram", { json: dados }),
  testarTelegram: () => requisitar("POST", "/config/telegram/teste"),
  verGeral: () => requisitar("GET", "/config/geral"),
  // ---- telões (Fase 4) ----
  listarParedes: () => requisitar("GET", "/paredes"),
  aprovarParede: (dados) => requisitar("POST", "/paredes/aprovar", { json: dados }),
  revogarParede: (id) => requisitar("DELETE", `/paredes/${encodeURIComponent(id)}`),
  verConfigParedes: () => requisitar("GET", "/config/paredes"),
  editarConfigParedes: (dados) => requisitar("PATCH", "/config/paredes", { json: dados }),
  importarCsv: (arquivo) => {
    const form = new FormData();
    form.append("arquivo", arquivo);
    return requisitar("POST", "/equipamentos/importar", { form });
  },
};
