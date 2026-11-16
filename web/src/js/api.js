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
  importarCsv: (arquivo) => {
    const form = new FormData();
    form.append("arquivo", arquivo);
    return requisitar("POST", "/equipamentos/importar", { form });
  },
};
