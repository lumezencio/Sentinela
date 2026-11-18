// Configurações → Telegram (só admin): token do bot, destinos e "incluir IP". Funções puras
// (testadas no Node) + o pedaço do componente "painel". O token NUNCA volta da API (só
// `token_definido`): o campo começa sempre vazio e, vazio, o PATCH não o menciona (manter).
// Só apagar: "Remover token" manda token "".
import { api } from "./api.js";
import { haQuanto } from "./lista.js";
import { textoSeguro } from "./novos.js";

const MAX_CHATS = 10;
const TOKEN = /^\d{5,12}:[A-Za-z0-9_-]{30,50}$/;
const CHAT = /^(-?\d{1,20}|@[A-Za-z0-9_]{5,32})$/;
const MSG_FALHA = "Não foi possível concluir. Tente de novo.";

/** Destinos digitados: um por linha (ou separados por vírgula/ponto e vírgula), sem vazios. */
export function chatsDoTexto(texto) {
  const partes = Array.isArray(texto) ? texto : String(texto ?? "").split(/[\n,;]+/);
  return partes.map((p) => String(p).trim()).filter(Boolean);
}

export function textoDosChats(chats) {
  return Array.isArray(chats) ? chats.join("\n") : "";
}

/** Erros por campo ({} = válido). Token vazio é válido: significa "manter o atual". */
export function validarTelegram(valores) {
  const v = valores || {};
  const e = {};
  const token = String(v.token ?? "").trim();
  if (token && !TOKEN.test(token)) {
    e.token = "Token em formato inválido. Copie-o inteiro do BotFather (número, dois pontos e letras).";
  }
  const chats = chatsDoTexto(v.chats);
  if (chats.length > MAX_CHATS) {
    e.chats = `No máximo ${MAX_CHATS} destinos.`;
  } else if (chats.some((c) => !CHAT.test(c))) {
    e.chats = "Cada destino é um número (ex. -1001234567890) ou @canal com 5 letras ou mais.";
  } else if (new Set(chats).size !== chats.length) {
    e.chats = "Há destinos repetidos.";
  }
  return e;
}

/** Corpo do PATCH: sem `token` quando o campo ficou vazio (não apaga o que já existe). */
export function montarTelegram(valores) {
  const v = valores || {};
  const corpo = { chats: chatsDoTexto(v.chats), incluir_ip: Boolean(v.incluir_ip) };
  const token = String(v.token ?? "").trim();
  if (token) corpo.token = token;
  return corpo;
}

export function montarRemoverToken() {
  return { token: "" };
}

const FORM_VAZIO = () => ({ token: "", chats: "", incluir_ip: false });

/** Estado e métodos do cartão Telegram; mesmo `this` do componente "painel". */
export function telegramDoPainel() {
  let carregado = false;

  return {
    tg: { definido: false, ultimoEnvio: "", ultimoErro: "" },
    tgForm: FORM_VAZIO(),
    tgErros: {},
    tgErroGeral: "",
    tgAviso: "",
    tgCarregando: false,
    tgSalvando: false,
    tgTestando: false,
    tgTeste: null, // {ok, texto} do último "Enviar teste"

    entrarEmTelegram() {
      if (!this.admin || carregado) return;
      carregado = true;
      this.carregarTelegram();
    },

    async carregarTelegram(comFormulario = true) {
      this.tgCarregando = comFormulario;
      const r = await api.verTelegram();
      this.tgCarregando = false;
      if (!r.ok || !r.dados) {
        this.tgErroGeral = r.erro || MSG_FALHA;
        return;
      }
      this.tgErroGeral = "";
      this.aplicarTelegram(r.dados);
      if (comFormulario) {
        this.tgForm = { token: "", chats: textoDosChats(r.dados.chats), incluir_ip: Boolean(r.dados.incluir_ip) };
      }
    },

    aplicarTelegram(d) {
      this.tg = {
        definido: Boolean(d.token_definido),
        ultimoEnvio: d.ultimo_envio ? haQuanto(d.ultimo_envio) : "",
        ultimoErro: textoSeguro(d.ultimo_erro, 300),
      };
    },

    get tgRotuloToken() {
      return this.tg.definido ? "Token definido" : "Token não definido";
    },
    get tgDicaToken() {
      return this.tg.definido
        ? "Deixe em branco para manter o token atual. Ele nunca volta para a tela."
        : "Cole o token do bot (criado no BotFather). Fica cifrado e nunca volta para a tela.";
    },
    get tgTextoEnvio() {
      return this.tg.ultimoEnvio ? `Último envio: ${this.tg.ultimoEnvio}` : "Nenhum envio ainda.";
    },
    get tgInvalidoToken() {
      return this.tgErros.token ? "true" : "false";
    },
    get tgInvalidoChats() {
      return this.tgErros.chats ? "true" : "false";
    },
    get tgIpMarcado() {
      return this.tgForm.incluir_ip ? "true" : "false";
    },
    alternarIpTelegram() {
      this.tgForm.incluir_ip = !this.tgForm.incluir_ip;
    },
    get tgTesteClasse() {
      return this.tgTeste && this.tgTeste.ok ? "alerta-ok" : "";
    },
    get tgTesteTexto() {
      return this.tgTeste ? this.tgTeste.texto : "";
    },
    get tgSemTesteDisponivel() {
      return this.tgTestando || this.tgSalvando;
    },

    async salvarTelegram() {
      if (this.tgSalvando) return;
      this.tgAviso = "";
      this.tgErroGeral = "";
      this.tgTeste = null;
      this.tgErros = validarTelegram(this.tgForm);
      if (Object.keys(this.tgErros).length) return;
      this.tgSalvando = true;
      const r = await api.editarTelegram(montarTelegram(this.tgForm));
      this.tgSalvando = false;
      if (!r.ok) {
        this.tgErroGeral = r.erro;
        return;
      }
      this.aplicarTelegram(r.dados);
      this.tgForm = { token: "", chats: textoDosChats(r.dados.chats), incluir_ip: Boolean(r.dados.incluir_ip) };
      this.tgAviso = "Configuração do Telegram salva.";
    },

    async removerTokenTelegram() {
      if (this.tgSalvando || !this.tg.definido) return;
      const ok = await this.confirmar({
        titulo: "Remover o token?",
        texto: "O Sentinela deixa de enviar alertas ao Telegram até você cadastrar um novo token.",
        botao: "Remover token",
        perigo: true,
      });
      if (!ok) return;
      this.tgAviso = "";
      this.tgErroGeral = "";
      this.tgTeste = null;
      this.tgSalvando = true;
      const r = await api.editarTelegram(montarRemoverToken());
      this.tgSalvando = false;
      if (!r.ok) {
        this.tgErroGeral = r.erro;
        return;
      }
      this.aplicarTelegram(r.dados);
      this.tgForm.token = "";
      this.tgAviso = "Token removido.";
    },

    async testarTelegram() {
      if (this.tgTestando) return;
      this.tgAviso = "";
      this.tgErroGeral = "";
      this.tgTeste = null;
      this.tgTestando = true;
      const r = await api.testarTelegram();
      this.tgTestando = false;
      if (!r.ok) {
        // 409 (demonstração, sem token/destino) e 429 trazem texto fixo do servidor
        this.tgTeste = { ok: false, texto: r.erro };
        return;
      }
      const d = r.dados || {};
      this.tgTeste = d.ok
        ? { ok: true, texto: "Mensagem de teste enviada. Confira no Telegram." }
        : { ok: false, texto: textoSeguro(d.erro, 300) || MSG_FALHA };
      this.carregarTelegram(false); // último envio/erro gravados pelo servidor; não mexe no formulário
    },
  };
}
