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
  /** 204 = dentro; 202 {"etapa": "totp"} = falta o código do segundo fator (`etapa: "totp"`). */
  entrar: async (login, senha) => {
    const r = await requisitar("POST", "/auth/login", {
      json: { login, senha },
      redirecionar401: false,
    });
    const etapa = r.status === 202 && r.dados && r.dados.etapa === "totp" ? "totp" : "";
    return { ...r, etapa };
  },
  /** Passo 2 do login: `codigo` (aplicativo) ou `recuperacao`, exatamente um. */
  entrarTotp: ({ codigo, recuperacao }) =>
    requisitar("POST", "/auth/totp/entrar", {
      json: recuperacao !== undefined ? { recuperacao } : { codigo },
      redirecionar401: false,
    }),
  // ---- primeiro acesso (Fase 5): rotas sem sessão; 404 = já existe usuário ----
  /** `/saude` público: "ativo" (assistente aberto), "expirado" (sem usuário e sem código válido) ou "". */
  estadoDaInstalacao: async () => {
    const r = await requisitar("GET", "/saude", { redirecionar401: false });
    const v = r.ok && r.dados !== null ? r.dados.primeiro_acesso : null;
    return v === "ativo" || v === "expirado" ? v : "";
  },
  /** `estado`: "ativo" | "expirado" | "ausente" (vazio se não foi 200). 404 = o assistente acabou. */
  estadoPrimeiroAcesso: async () => {
    const r = await requisitar("GET", "/primeiro-acesso", { redirecionar401: false });
    const valor = r.ok && r.dados ? r.dados.codigo : "";
    return { ...r, estado: ["ativo", "expirado", "ausente"].includes(valor) ? valor : "" };
  },
  /** 200 {rede: {cidr, gateway}} (sugestão detectada); 401 genérico; 429 com a espera. */
  conferirCodigo: (codigo) =>
    requisitar("POST", "/primeiro-acesso/conferir", { json: { codigo }, redirecionar401: false }),
  /** 204 = administrador criado e já logado. */
  concluirPrimeiroAcesso: ({ codigo, login, senha, cidr, gateway, varredura }) =>
    requisitar("POST", "/primeiro-acesso/concluir", {
      json: { codigo, login, senha, cidr, gateway: gateway || null, varredura: Boolean(varredura) },
      redirecionar401: false,
    }),
  sair: () => requisitar("POST", "/auth/logout", { redirecionar401: false }),
  eu: () => requisitar("GET", "/auth/eu"),
  // ---- segundo fator, política e usuários (Fase 4B) ----
  iniciarTotp: (senha) =>
    requisitar("POST", "/auth/totp/iniciar", { json: { senha }, redirecionar401: false }),
  confirmarTotp: (codigo) =>
    requisitar("POST", "/auth/totp/confirmar", { json: { codigo }, redirecionar401: false }),
  verSeguranca: () => requisitar("GET", "/config/seguranca"),
  definirSeguranca: (exigir) =>
    requisitar("PATCH", "/config/seguranca", { json: { exigir_totp_admin: Boolean(exigir) } }),
  listarUsuarios: () => requisitar("GET", "/usuarios"),
  zerarTotp: (id, senha) =>
    requisitar("POST", `/usuarios/${encodeURIComponent(id)}/totp/zerar`, {
      json: { senha },
      redirecionar401: false,
    }),
  // ---- backup (Fase 4B) ----
  verBackup: () => requisitar("GET", "/backup"),
  criarBackup: () => requisitar("POST", "/backup"),
  criarEquipamento: (dados) => requisitar("POST", "/equipamentos", { json: dados }),
  verEquipamento: (id) => requisitar("GET", `/equipamentos/${encodeURIComponent(id)}`),
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
  /** `campos`: `permite_varredura` (bool) e/ou `gateway_ip` (IPv4 da sub-rede; null apaga). */
  editarSubrede: (id, campos) =>
    requisitar("PATCH", `/subredes/${encodeURIComponent(id)}`, { json: campos }),
  verVarredura: () => requisitar("GET", "/varredura"),
  iniciarVarredura: (subRedeId) =>
    requisitar("POST", "/varredura", { json: { sub_rede_id: subRedeId } }),
  cancelarVarredura: () => requisitar("DELETE", "/varredura"),
  verAjustes: () => requisitar("GET", "/config/descoberta"),
  editarAjustes: (dados) => requisitar("PATCH", "/config/descoberta", { json: dados }),
  // ---- atualização automática (Fase 5): qualquer usuário lê; só o admin liga e desliga ----
  verAtualizacao: () => requisitar("GET", "/atualizacao"),
  definirAtualizacao: (ativo) => requisitar("PATCH", "/atualizacao", { json: { ativo: Boolean(ativo) } }),
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
