// Conexão ao vivo com recuo exponencial (1 s → 30 s).
//   4401: sessão ausente/expirada → login.  4403: origem recusada → erro visível, sem retentar.
//   Qualquer outro fechamento → "Reconectando…" e nova tentativa; o snapshot novo substitui tudo.

export const FECHA_NAO_AUTENTICADO = 4401;
export const FECHA_ORIGEM_PROIBIDA = 4403;
const RECUO_INICIAL_MS = 1000;
const RECUO_MAXIMO_MS = 30000;

export function urlDoWs(caminho = "/ws") {
  const esquema = window.location.protocol === "https:" ? "wss" : "ws";
  return `${esquema}://${window.location.host}${caminho}`;
}

/**
 * @param {{
 *   aoMensagem: (msg: any) => void,
 *   aoMudarEstado: (estado: "conectando"|"ao_vivo"|"reconectando"|"recusado") => void,
 *   aoExpirar: () => void,
 * }} ganchos
 * @param {string} caminho  "/ws" (painel) ou "/ws/parede" (telão)
 */
export function criarConexao(ganchos, caminho = "/ws") {
  let socket = null;
  let recuo = RECUO_INICIAL_MS;
  let timer = 0;
  let parado = false;

  function agendar() {
    clearTimeout(timer);
    timer = setTimeout(abrir, recuo);
    recuo = Math.min(recuo * 2, RECUO_MAXIMO_MS);
  }

  function abrir() {
    if (parado) return;
    let ws;
    try {
      ws = new WebSocket(urlDoWs(caminho));
    } catch {
      ganchos.aoMudarEstado("reconectando");
      agendar();
      return;
    }
    socket = ws;
    ws.onmessage = (evento) => {
      let msg;
      try {
        msg = JSON.parse(evento.data);
      } catch {
        return;
      }
      if (!msg || typeof msg.tipo !== "string") return;
      if (msg.tipo === "snapshot") {
        recuo = RECUO_INICIAL_MS; // só zera com dados reais chegando
        ganchos.aoMudarEstado("ao_vivo");
      }
      ganchos.aoMensagem(msg);
    };
    ws.onclose = (evento) => {
      if (socket !== ws) return; // fechamento de uma conexão já substituída
      socket = null;
      if (parado) return;
      if (evento.code === FECHA_NAO_AUTENTICADO) {
        parado = true;
        ganchos.aoExpirar();
        return;
      }
      if (evento.code === FECHA_ORIGEM_PROIBIDA) {
        parado = true;
        ganchos.aoMudarEstado("recusado");
        return;
      }
      ganchos.aoMudarEstado("reconectando");
      agendar();
    };
  }

  return {
    iniciar() {
      parado = false;
      ganchos.aoMudarEstado("conectando");
      abrir();
    },
    /** Pede um snapshot novo sem mostrar o banner (ex.: após importar CSV). */
    ressincronizar() {
      if (parado) return;
      const antigo = socket;
      socket = null;
      clearTimeout(timer);
      recuo = RECUO_INICIAL_MS;
      if (antigo) antigo.close(1000);
      abrir();
    },
    parar() {
      parado = true;
      clearTimeout(timer);
      if (socket) socket.close(1000);
      socket = null;
    },
  };
}
