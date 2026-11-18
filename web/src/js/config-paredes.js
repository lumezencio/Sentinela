// Configurações → Telões (só admin): aprovar o código mostrado na TV, listar e revogar
// telões e a chave "permitir telão sem HTTPS". Funções puras (testadas no Node) + o pedaço
// do componente "painel" (mesmo `this` do Alpine). Texto do servidor só por x-text.
import { api } from "./api.js";
import { haQuanto } from "./lista.js";

// mesma regra de sentinela/parede/emparelhamento.py (sem 0/O, 1/I/L)
const ALFABETO = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
const METADE = 4;
const MAX_NOME = 64;
const MSG_FALHA = "Não foi possível concluir. Tente de novo.";
const ATUALIZAR_MS = 30000; // com Configurações aberta, a lista (último acesso) se atualiza

/** "k7mq 2xdp" → "K7MQ-2XDP"; null se não forem 8 caracteres do alfabeto. */
export function normalizarCodigo(texto) {
  if (typeof texto !== "string") return null;
  const limpo = texto.trim().toUpperCase().replace(/[-\s]/g, "");
  if (limpo.length !== 2 * METADE) return null;
  for (const c of limpo) if (!ALFABETO.includes(c)) return null;
  return `${limpo.slice(0, METADE)}-${limpo.slice(METADE)}`;
}

/** Corpo do POST /paredes/aprovar ou os erros por campo (corpo null). */
export function montarAprovacao(valores) {
  const v = valores || {};
  const erros = {};
  const codigo = normalizarCodigo(String(v.codigo ?? ""));
  const nome = String(v.nome ?? "").trim();
  if (!codigo) erros.codigo = "Digite os 8 caracteres que aparecem na TV.";
  if (!nome) erros.nome = "Dê um nome a esta tela (ex. TV Portaria).";
  else if (nome.length > MAX_NOME) erros.nome = `No máximo ${MAX_NOME} caracteres.`;
  if (Object.keys(erros).length) return { erros, corpo: null };
  return { erros, corpo: { codigo, nome } };
}

/** Linha da lista de telões, pronta para a tela. */
export function linhaDoTelao(p, agora = Date.now()) {
  const http = p.modo === "http";
  let acesso = "Ainda não conectou";
  if (p.ultimo_acesso) {
    acesso = `Último acesso ${haQuanto(p.ultimo_acesso, agora)}`;
    if (p.ultimo_ip) acesso += ` · ${p.ultimo_ip}`;
  }
  return {
    id: p.id,
    nome: String(p.nome ?? ""),
    modo: http ? "HTTP sem cifra" : "HTTPS",
    http,
    ativa: Boolean(p.ativa),
    situacao: p.ativa ? "Ativo" : "Revogado",
    acesso,
    criado: `Aprovado ${haQuanto(p.criado_em, agora)}`,
    rotuloRevogar: `Revogar ${p.nome}`,
  };
}

/** Estado e métodos do cartão Telões; mesmo `this` do componente "painel". */
export function paredesDoPainel() {
  let carregando = false;
  let timer = 0;
  let dados = [];

  return {
    telForm: { codigo: "", nome: "" },
    telErros: {},
    telErroGeral: "",
    telAviso: "",
    telLinhas: [],
    telCarregando: false,
    telEnviando: false,
    telHttp: false,

    /** A cada entrada na aba: lista nova (último acesso, telões aprovados em outra aba) e,
     * enquanto ela estiver aberta e visível, de novo a cada 30 s. */
    async entrarEmParedes() {
      if (!this.admin) return;
      if (!timer) {
        timer = window.setInterval(() => {
          if (this.aba !== "configuracoes") {
            window.clearInterval(timer);
            timer = 0;
            return;
          }
          if (!document.hidden) this.recarregarParedes(false);
        }, ATUALIZAR_MS);
      }
      await this.recarregarParedes(this.telLinhas.length === 0);
    },

    async recarregarParedes(comAviso) {
      if (carregando) return;
      carregando = true;
      try {
        await this.carregarParedes(comAviso);
      } finally {
        carregando = false;
      }
    },

    async carregarParedes(comAviso = true) {
      if (comAviso) this.telCarregando = true;
      const [lista, config] = await Promise.all([api.listarParedes(), api.verConfigParedes()]);
      this.telCarregando = false;
      if (!lista.ok || !config.ok) {
        this.telErroGeral = (!lista.ok ? lista.erro : config.erro) || MSG_FALHA;
        return false;
      }
      this.telErroGeral = "";
      dados = Array.isArray(lista.dados) ? lista.dados : [];
      this.telHttp = Boolean(config.dados && config.dados.permitir_http);
      this.renderizarParedes();
      return true;
    },

    renderizarParedes() {
      const agora = Date.now();
      this.telLinhas = dados.map((p) => linhaDoTelao(p, agora));
    },

    get telSemTeloes() {
      return !this.telCarregando && !this.telErroGeral && this.telLinhas.length === 0;
    },
    get telInvalidoCodigo() {
      return this.telErros.codigo ? "true" : "false";
    },
    get telInvalidoNome() {
      return this.telErros.nome ? "true" : "false";
    },
    get telHttpMarcado() {
      return this.telHttp ? "true" : "false";
    },

    async aprovarTelao() {
      if (this.telEnviando) return;
      this.telAviso = "";
      this.telErroGeral = "";
      const { erros, corpo } = montarAprovacao(this.telForm);
      this.telErros = erros;
      if (!corpo) return;
      this.telForm.codigo = corpo.codigo;
      this.telEnviando = true;
      const r = await api.aprovarParede(corpo);
      this.telEnviando = false;
      if (!r.ok) {
        // 404 do servidor: "Código inválido ou expirado." (sem dizer qual dos dois)
        this.telErros = { codigo: r.erro || MSG_FALHA };
        return;
      }
      this.telForm = { codigo: "", nome: "" };
      this.telAviso = `“${r.dados.nome}” aprovado. A TV entra sozinha em alguns segundos.`;
      await this.carregarParedes();
    },

    async revogarTelao(id) {
      if (this.telEnviando) return;
      const linha = this.telLinhas.find((l) => l.id === id);
      if (!linha) return;
      const ok = await this.confirmar({
        titulo: `Revogar “${linha.nome}”?`,
        texto: "A TV sai do ar na hora e volta a mostrar um código. Para usá-la de novo, aprove o código novo.",
        botao: "Revogar",
        perigo: true,
      });
      if (!ok) return;
      this.telAviso = "";
      this.telErroGeral = "";
      this.telEnviando = true;
      const r = await api.revogarParede(id);
      this.telEnviando = false;
      if (!r.ok) {
        this.telErroGeral = r.erro || MSG_FALHA;
        return;
      }
      this.telAviso = `“${linha.nome}” revogado.`;
      await this.carregarParedes();
    },

    async alternarParedesHttp() {
      if (this.telEnviando) return;
      const novo = !this.telHttp;
      if (novo) {
        const ok = await this.confirmar({
          titulo: "Permitir telão sem HTTPS?",
          texto:
            "O telão poderá ser aberto pela porta 80, sem cifra: quem estiver na rede local consegue ler o que ele mostra. Use só se a TV recusar o certificado.",
          botao: "Permitir",
          perigo: true,
        });
        if (!ok) return;
      }
      this.telAviso = "";
      this.telErroGeral = "";
      this.telEnviando = true;
      const r = await api.editarConfigParedes({ permitir_http: novo });
      this.telEnviando = false;
      if (!r.ok) {
        this.telErroGeral = r.erro || MSG_FALHA;
        return;
      }
      this.telHttp = Boolean(r.dados && r.dados.permitir_http);
      this.telAviso = this.telHttp
        ? "Telão sem HTTPS permitido."
        : "Telão sem HTTPS desligado; os telões por HTTP saíram do ar.";
    },
  };
}
