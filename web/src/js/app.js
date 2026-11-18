// Painel (Alpine CSP): sessão, conexão ao vivo, contadores, lista e cadastro (admin).
import { alertasDoPainel } from "./alertas.js";
import { api, irParaLogin } from "./api.js";
import { cartoesDoPainel } from "./cartoes-painel.js";
import { paredesDoPainel } from "./config-paredes.js";
import { telegramDoPainel } from "./config-telegram.js";
import { configuracoesDoPainel } from "./configuracoes.js";
import {
  aplicarEquipamento,
  aplicarEstado,
  aplicarLatencias,
  aplicarSnapshot,
  contar,
  criarStore,
  filtrar,
  linhaDeTela,
  paginar,
  prepararItem,
} from "./lista.js";
import { novosDoPainel, textoSeguro } from "./novos.js";
import { organogramaDoPainel } from "./organograma.js";
import { visoesDoPainel } from "./teia-pagina.js";
import { criarConexao } from "./ws.js";

const CHAVE_TEMA = "sentinela-tema";
const LIMITE_CSV = 1024 * 1024;
const ERROS_CSV_NA_TELA = 50;
const RECUO_INICIAL_MS = 1000; // mesmo recuo do WS: 1 s → 30 s
const RECUO_MAXIMO_MS = 30000;
const MSG_SAIR = "Não foi possível sair. Tente de novo.";

function dormir(ms) {
  return new Promise((resolver) => window.setTimeout(resolver, ms));
}

function temaAtual() {
  const forcado = document.documentElement.dataset.tema;
  if (forcado) return forcado;
  return window.matchMedia("(prefers-color-scheme: light)").matches ? "claro" : "escuro";
}

/** Faixa da varredura a partir da mensagem "varredura" (ou do GET /varredura). */
function estadoDaVarredura(p) {
  if (!p || p.estado !== "rodando") return { rodando: false, cidr: "", pct: 0, achados: 0 };
  const total = Number(p.total) || 0;
  const feitos = Number(p.feitos) || 0;
  const pct = total > 0 ? Math.min(100, Math.floor((feitos / total) * 100)) : 0;
  return { rodando: true, cidr: textoSeguro(p.cidr, 43), pct, achados: Number(p.achados) || 0 };
}

function novoFormulario() {
  return { nome: "", ip: "", mac: "", classe: "", checagem: "icmp", porta: "" };
}

function painel() {
  // fora do proxy reativo: só a página visível e os contadores são reativos
  const store = criarStore();
  let conexao = null;
  let quadro = 0;
  let relogio = 0;
  let ressinc = 0;
  let resolverConfirmacao = null;
  let focoAntesDaConfirmacao = null;

  const dados = {
    usuario: "",
    admin: false,
    conexao: "conectando",
    carregado: false,
    contadores: {
      total: 0, online: 0, instavel: 0, offline: 0, inalcancavel: 0, pausado: 0, aguardando: 0,
    },
    classes: [],
    filtroClasse: "",
    filtroEstado: "",
    busca: "",
    campo: "nome",
    crescente: true,
    pagina: 1,
    paginas: 1,
    totalFiltrado: 0,
    linhas: [],
    tema: temaAtual(),
    aviso: "",
    novo: novoFormulario(),
    novoErro: "",
    enviando: false,
    csvErro: "",
    csvResultado: null,
    subredes: [],
    novaSubrede: "",
    subredeErro: "",
    subredeAviso: "",
    varredura: estadoDaVarredura(null),
    varreduraErro: "",
    confirmacao: { titulo: "", texto: "", botao: "Confirmar", perigo: false },

    async init() {
      this.iniciarVisoes(); // aba pelo hash já na abertura (a Teia monta sob demanda)
      this.iniciarOrganograma(); // depois: o hashchange das visões já trocou a aba
      // core fora do ar ao abrir a página: tenta de novo com recuo (1 s → 30 s)
      let eu = await api.eu();
      let recuo = RECUO_INICIAL_MS;
      while (!eu.ok) {
        if (eu.status === 401) return; // api.js já mandou para o login
        this.conexao = "reconectando";
        await dormir(recuo);
        recuo = Math.min(recuo * 2, RECUO_MAXIMO_MS);
        eu = await api.eu();
      }
      this.usuario = eu.dados.login;
      this.admin = eu.dados.papel === "admin";
      this.liberarTeia(); // só agora a Teia monta (e o bundle é pedido) e Novos/Config carregam
      this.carregarVarredura();
      this.carregarGeral(); // fuso dos horários de alertas e silêncios
      this.iniciarCartoes();
      conexao = criarConexao({
        aoMensagem: (msg) => this.receber(msg),
        aoMudarEstado: (estado) => {
          this.conexao = estado;
        },
        aoExpirar: irParaLogin,
      });
      conexao.iniciar();
      relogio = window.setInterval(() => {
        this.agendarRender();
        this.renderizarCartoes(); // "há N min" dos cartões de alerta
      }, 30000);
      document.addEventListener("visibilitychange", () => {
        if (!document.hidden) this.agendarRender();
      });
    },

    destroy() {
      if (conexao) conexao.parar();
      window.clearInterval(relogio);
    },

    receber(msg) {
      if (msg.tipo === "snapshot") {
        aplicarSnapshot(store, msg);
        this.classes = store.ordemClasses.map((c) => ({ slug: c.slug, nome: c.nome }));
        this.carregado = true;
        this.teiaAoMudarStore();
        this.novosAoMensagem(msg);
        this.alertasAoSnapshot(msg);
        this.cartoesAoSnapshot();
      } else if (msg.tipo === "estado") {
        if (aplicarEstado(store, msg)) this.teiaAoEstado(msg.id);
        else this.pedirRessincronizacao();
      } else if (msg.tipo === "latencias") {
        aplicarLatencias(store, msg.lote);
      } else if (msg.tipo === "equipamento") {
        // aprovação (o gravador pode vir "criado" mais de uma vez: upsert idempotente)
        if (!aplicarEquipamento(store, msg)) return;
        this.teiaAoMudarStore();
      } else if (msg.tipo === "descoberta" || msg.tipo === "pendentes") {
        this.novosAoMensagem(msg);
        return;
      } else if (msg.tipo === "varredura") {
        this.aplicarVarredura(msg);
        return;
      } else if (msg.tipo === "alerta" || msg.tipo === "silencio") {
        this.alertasAoMensagem(msg);
        if (msg.tipo === "alerta") this.cartoesAoMensagem(msg);
        return;
      } else if (msg.tipo === "fonte") {
        this.cfgAoMensagem(msg);
        return;
      } else {
        return; // ping e tipos futuros
      }
      this.agendarRender();
    },

    pedirRessincronizacao() {
      window.clearTimeout(ressinc);
      ressinc = window.setTimeout(() => conexao && conexao.ressincronizar(), 1500);
    },

    agendarRender() {
      if (quadro || document.hidden) return;
      quadro = window.requestAnimationFrame(() => {
        quadro = 0;
        this.renderizar();
      });
    },

    renderizar() {
      this.contadores = contar(store);
      this.renderizarTeia();
      this.renderizarOrganograma(); // só na aba dele; no máximo 2 vezes por segundo
      if (this.aba === "configuracoes") {
        this.renderizarFontes(); // "há N min" das coletas
        this.renderizarParedes(); // "último acesso há N min" dos telões
      }
      if (this.aba === "alertas") this.renderizarAlertas(); // "há N min" e silêncios vencidos
      if (this.cartoes.length) this.renderizarCartoes(); // estado atual do equipamento no cartão
      if (this.aba !== "lista") return; // a lista só é montada na aba dela
      const filtrada = filtrar(
        store,
        { classe: this.filtroClasse, estado: this.filtroEstado, busca: this.busca },
        { campo: this.campo, crescente: this.crescente },
      );
      const pag = paginar(filtrada, this.pagina);
      const agora = Date.now();
      this.totalFiltrado = filtrada.length;
      this.pagina = pag.pagina;
      this.paginas = pag.paginas;
      this.linhas = pag.itens.map((item) => linhaDeTela(item, store, agora));
    },

    // ---------- filtros, ordenação, paginação ----------
    aoFiltrar() {
      // filtros compartilhados entre Lista e Organograma: as duas voltam à 1ª página
      this.pagina = 1;
      this.zerarPaginasOrganograma();
      this.renderizar();
    },
    filtrarEstado(grupo) {
      this.filtroEstado = this.filtroEstado === grupo ? "" : grupo;
      this.aoFiltrar();
    },
    pressionado(grupo) {
      return this.filtroEstado === grupo ? "true" : "false";
    },
    ordenar(campo) {
      if (this.campo === campo) this.crescente = !this.crescente;
      else {
        this.campo = campo;
        this.crescente = true;
      }
      this.renderizar();
    },
    ariaSort(campo) {
      if (this.campo !== campo) return "none";
      return this.crescente ? "ascending" : "descending";
    },
    anterior() {
      if (this.pagina > 1) {
        this.pagina -= 1;
        this.renderizar();
      }
    },
    proxima() {
      if (this.pagina < this.paginas) {
        this.pagina += 1;
        this.renderizar();
      }
    },
    get semAnterior() {
      return this.pagina <= 1;
    },
    get semProxima() {
      return this.pagina >= this.paginas;
    },
    get infoPagina() {
      return `Página ${this.pagina} de ${this.paginas}`;
    },
    get vazio() {
      return this.carregado && this.totalFiltrado === 0;
    },
    get carregando() {
      return !this.carregado;
    },

    // ---------- conexão ----------
    get bannerVisivel() {
      return this.conexao === "reconectando" || this.conexao === "recusado";
    },
    get bannerErro() {
      return this.conexao === "recusado";
    },
    get textoBanner() {
      if (this.conexao === "recusado") {
        return "Conexão ao vivo recusada: abra o Sentinela pelo endereço oficial.";
      }
      return "Reconectando…";
    },
    get aoVivo() {
      return this.conexao === "ao_vivo";
    },

    // ---------- tema e sessão ----------
    alternarTema() {
      this.tema = this.tema === "escuro" ? "claro" : "escuro";
      document.documentElement.dataset.tema = this.tema;
      try {
        window.localStorage.setItem(CHAVE_TEMA, this.tema);
      } catch {
        /* sem armazenamento: vale só nesta aba */
      }
    },
    get rotuloTema() {
      return this.tema === "escuro" ? "Usar tema claro" : "Usar tema escuro";
    },
    get temaEscuro() {
      return this.tema === "escuro";
    },
    async sair() {
      const r = await api.sair();
      if (r.status === 204 || r.status === 401) {
        if (conexao) conexao.parar();
        irParaLogin();
        return;
      }
      // a sessão pode continuar válida no servidor: fica na página e avisa
      this.aviso = MSG_SAIR;
    },

    // ---------- varredura lenta (faixa no topo, todas as abas) ----------
    async carregarVarredura() {
      const r = await api.verVarredura();
      if (r.ok && r.dados && r.dados.rodando) {
        this.aplicarVarredura({ ...r.dados.progresso, estado: "rodando" });
      }
    },
    aplicarVarredura(p) {
      this.varredura = estadoDaVarredura(p);
      if (!this.varredura.rodando) this.varreduraErro = "";
    },
    get faixaVarredura() {
      return this.varredura.rodando;
    },
    get textoVarredura() {
      return `Varredura lenta em ${this.varredura.cidr}: ${this.varredura.pct}%.`;
    },
    get detalheVarredura() {
      const n = this.varredura.achados;
      return `${n} ${n === 1 ? "achado" : "achados"}`;
    },
    get estiloVarredura() {
      return { "--pct": `${this.varredura.pct}%` };
    },
    async cancelarVarredura() {
      if (!this.admin) return;
      this.varreduraErro = "";
      const r = await api.cancelarVarredura();
      if (!r.ok) {
        this.varreduraErro = r.erro;
        return;
      }
      this.varredura = estadoDaVarredura(null); // o WS confirma com "cancelada"
    },

    // ---------- confirmação (diálogo próprio, acessível; devolve true/false) ----------
    confirmar({ titulo, texto, botao = "Confirmar", perigo = false }) {
      if (resolverConfirmacao) resolverConfirmacao(false);
      this.confirmacao = { titulo, texto, botao, perigo };
      focoAntesDaConfirmacao = document.activeElement;
      const dlg = this.$refs.dlgConfirmar;
      dlg.returnValue = "";
      dlg.showModal();
      this.$nextTick(() => this.$refs.naoConfirmar && this.$refs.naoConfirmar.focus());
      return new Promise((resolver) => {
        resolverConfirmacao = resolver;
      });
    },
    aoFecharConfirmacao() {
      const ok = this.$refs.dlgConfirmar.returnValue === "sim";
      const resolver = resolverConfirmacao;
      resolverConfirmacao = null;
      const voltar = focoAntesDaConfirmacao;
      focoAntesDaConfirmacao = null;
      if (voltar && voltar.isConnected && typeof voltar.focus === "function") voltar.focus();
      if (resolver) resolver(ok);
    },
    get classeConfirmar() {
      return this.confirmacao.perigo ? "botao botao-perigo" : "botao botao-primario";
    },

    /**
     * Equipamento aprovado em Novos: entra no store já, se o WS ainda não o trouxe. Nunca
     * sobrescreve a linha do WS (ela tem pai_id/canal; a resposta do POST não).
     */
    inserirAprovado(e) {
      if (!e || typeof e.id !== "string" || store.itens.has(e.id)) return;
      aplicarEquipamento(store, {
        acao: "criado",
        equipamento: { ...e, desde: e.desde || e.estado_desde },
      });
      this.teiaAoMudarStore();
      this.agendarRender();
    },

    // ---------- novo equipamento (admin) ----------
    abrirNovo() {
      this.novo = novoFormulario();
      this.novoErro = "";
      this.$refs.dlgNovo.showModal();
    },
    fecharNovo() {
      this.$refs.dlgNovo.close();
    },
    async criar() {
      if (this.enviando) return;
      const n = this.novo;
      const dados = {
        nome: n.nome.trim(),
        ip: n.ip.trim(),
        classe: n.classe,
        checagem: n.checagem,
      };
      if (n.mac.trim()) dados.mac = n.mac.trim();
      if (String(n.porta).trim()) {
        const porta = Number.parseInt(n.porta, 10);
        if (!(porta >= 1 && porta <= 65535)) {
          this.novoErro = "Porta deve ser um número de 1 a 65535.";
          return;
        }
        dados.porta = porta;
      }
      this.enviando = true;
      const r = await api.criarEquipamento(dados);
      this.enviando = false;
      if (!r.ok) {
        this.novoErro = r.erro;
        return;
      }
      const e = r.dados;
      store.itens.set(e.id, prepararItem({ ...e, desde: e.estado_desde }));
      this.teiaAoMudarStore();
      this.$refs.dlgNovo.close();
      this.aviso = `“${e.nome}” cadastrado.`;
      this.renderizar();
    },

    // ---------- importar CSV (admin) ----------
    abrirCsv() {
      this.csvErro = "";
      this.csvResultado = null;
      this.$refs.formCsv.reset();
      this.$refs.dlgCsv.showModal();
    },
    fecharCsv() {
      this.$refs.dlgCsv.close();
    },
    async importar() {
      if (this.enviando) return;
      const arquivo = this.$refs.arquivoCsv.files[0];
      this.csvErro = "";
      this.csvResultado = null;
      if (!arquivo) {
        this.csvErro = "Escolha um arquivo CSV.";
        return;
      }
      if (arquivo.size > LIMITE_CSV) {
        this.csvErro = "Arquivo maior que 1 MB.";
        return;
      }
      this.enviando = true;
      const r = await api.importarCsv(arquivo);
      this.enviando = false;
      if (!r.ok) {
        this.csvErro = r.erro;
        return;
      }
      const erros = Array.isArray(r.dados.erros) ? r.dados.erros : [];
      const total = Number.isInteger(r.dados.total_erros) ? r.dados.total_erros : erros.length;
      const mostrados = erros.slice(0, ERROS_CSV_NA_TELA);
      const parcial = total > mostrados.length ? ` (mostrando as primeiras ${mostrados.length})` : "";
      this.csvResultado = {
        resumo: `${r.dados.importados} importado(s), ${total} linha(s) com erro${parcial}.`,
        erros: mostrados.map((x) => ({ chave: x.linha, texto: `Linha ${x.linha}: ${x.motivo}` })),
      };
      if (r.dados.importados > 0 && conexao) conexao.ressincronizar();
    },
    get temErrosCsv() {
      return Boolean(this.csvResultado && this.csvResultado.erros.length);
    },

    // ---------- sub-redes (admin) ----------
    async abrirSubredes() {
      this.novaSubrede = "";
      this.subredeErro = "";
      this.subredeAviso = "";
      this.$refs.dlgSubredes.showModal();
      await this.carregarSubredes();
    },
    fecharSubredes() {
      this.$refs.dlgSubredes.close();
    },
    async carregarSubredes() {
      const r = await api.listarSubredes();
      if (!r.ok) {
        this.subredeErro = r.erro;
        return;
      }
      this.subredes = (Array.isArray(r.dados) ? r.dados : []).map((s) => ({
        id: s.id,
        cidr: s.cidr,
        rotulo: `Remover ${s.cidr}`,
      }));
    },
    get semSubredes() {
      return this.subredes.length === 0 && !this.subredeErro;
    },
    async adicionarSubrede() {
      if (this.enviando) return;
      const cidr = this.novaSubrede.trim();
      this.subredeErro = "";
      this.subredeAviso = "";
      if (!cidr) {
        this.subredeErro = "Informe a sub-rede, ex. 10.99.0.0/24.";
        return;
      }
      this.enviando = true;
      const r = await api.criarSubrede(cidr);
      this.enviando = false;
      if (!r.ok) {
        this.subredeErro = r.erro;
        return;
      }
      this.novaSubrede = "";
      this.subredeAviso = `Sub-rede ${r.dados.cidr} adicionada.`;
      await this.carregarSubredes();
      if (conexao) conexao.ressincronizar(); // equipamentos podem ter sido retomados
    },
    async removerSubrede(id) {
      if (this.enviando) return;
      const sub = this.subredes.find((s) => s.id === id);
      if (!sub) return;
      const ok = window.confirm(
        `Remover ${sub.cidr}? Os equipamentos dela ficam pausados até a sub-rede voltar.`,
      );
      if (!ok) return;
      this.subredeErro = "";
      this.subredeAviso = "";
      this.enviando = true;
      const r = await api.removerSubrede(id);
      this.enviando = false;
      if (!r.ok) {
        this.subredeErro = r.erro;
        return;
      }
      this.subredeAviso = `Sub-rede ${sub.cidr} removida.`;
      await this.carregarSubredes();
      if (conexao) conexao.ressincronizar();
    },
  };
  // abas e Teia (teia-pagina.js), Organograma, Novos e Configurações: mesmas propriedades no
  // mesmo objeto, getters preservados
  for (const parte of [
    visoesDoPainel(store),
    organogramaDoPainel(store),
    novosDoPainel(store),
    configuracoesDoPainel(),
    alertasDoPainel(store),
    cartoesDoPainel(store),
    telegramDoPainel(),
    paredesDoPainel(),
  ]) {
    Object.defineProperties(dados, Object.getOwnPropertyDescriptors(parte));
  }
  return dados;
}

document.addEventListener("alpine:init", () => {
  window.Alpine.data("painel", painel);
});
