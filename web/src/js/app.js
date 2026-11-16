// Painel (Alpine CSP): sessão, conexão ao vivo, contadores, lista e cadastro (admin).
import { api, irParaLogin } from "./api.js";
import {
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
import { criarConexao } from "./ws.js";

const CHAVE_TEMA = "sentinela-tema";
const LIMITE_CSV = 1024 * 1024;

function temaAtual() {
  const forcado = document.documentElement.dataset.tema;
  if (forcado) return forcado;
  return window.matchMedia("(prefers-color-scheme: light)").matches ? "claro" : "escuro";
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

  return {
    usuario: "",
    admin: false,
    conexao: "conectando",
    carregado: false,
    contadores: { total: 0, online: 0, instavel: 0, offline: 0, pausado: 0, aguardando: 0 },
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

    async init() {
      const eu = await api.eu();
      if (!eu.ok) {
        if (eu.status !== 401) this.conexao = "reconectando";
        return; // 401 já redireciona
      }
      this.usuario = eu.dados.login;
      this.admin = eu.dados.papel === "admin";
      conexao = criarConexao({
        aoMensagem: (msg) => this.receber(msg),
        aoMudarEstado: (estado) => {
          this.conexao = estado;
        },
        aoExpirar: irParaLogin,
      });
      conexao.iniciar();
      relogio = window.setInterval(() => this.agendarRender(), 30000);
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
      } else if (msg.tipo === "estado") {
        if (!aplicarEstado(store, msg)) this.pedirRessincronizacao();
      } else if (msg.tipo === "latencias") {
        aplicarLatencias(store, msg.lote);
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
      this.pagina = 1;
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
      if (conexao) conexao.parar();
      await api.sair();
      irParaLogin();
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
      this.csvResultado = {
        resumo: `${r.dados.importados} importado(s), ${erros.length} linha(s) com erro.`,
        erros: erros.slice(0, 50).map((x) => ({ chave: x.linha, texto: `Linha ${x.linha}: ${x.motivo}` })),
      };
      if (r.dados.importados > 0 && conexao) conexao.ressincronizar();
    },
    get temErrosCsv() {
      return Boolean(this.csvResultado && this.csvResultado.erros.length);
    },
  };
}

document.addEventListener("alpine:init", () => {
  window.Alpine.data("painel", painel);
});
