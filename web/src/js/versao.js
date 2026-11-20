// Versão em execução, mostrada em todo elemento [data-versao] (topo do painel, login). O número
// vem do backend (GET /api/v1/saude, que já é público) e só é aceito no formato X.Y.Z, para que
// nada vindo da rede vire marcação.
const FORMATO = /^\d{1,3}\.\d{1,3}\.\d{1,3}(?:[-+][0-9A-Za-z.]{1,16})?$/;

/** "0.4.1" -> "v0.4.1"; qualquer outra coisa -> "". */
export function textoDaVersao(valor) {
  return typeof valor === "string" && FORMATO.test(valor) ? `v${valor}` : "";
}

export function mostrarVersao(texto, raiz = document) {
  for (const el of raiz.querySelectorAll("[data-versao]")) {
    el.textContent = texto;
    el.hidden = !texto;
    if (texto) el.title = `Sentinela ${texto}`;
  }
}

export async function carregarVersao() {
  try {
    const r = await fetch("/api/v1/saude", { credentials: "same-origin", cache: "no-store" });
    if (!r.ok) return;
    const dados = await r.json();
    mostrarVersao(textoDaVersao(dados && dados.versao));
  } catch {
    /* sem versão na tela: nada a fazer */
  }
}
