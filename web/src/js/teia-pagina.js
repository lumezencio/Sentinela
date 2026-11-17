// Abas (rota pelo hash) e a página da Teia: carga preguiçosa do bundle 3D, um único
// renderer (montado na 1ª visita, depois só pausar/retomar), seletor de estilo, painel de
// classes, painel do equipamento com histórico e atalhos de admin. Misturado ao componente
// "painel" do app.js (mesmo `this` do Alpine); a cena fica FORA da reatividade.
import { api } from "./api.js";
import {
  abaDoHash, carregarTeia, equipamentosDaClasse, ESTILOS, estiloSalvo, fichaDoEquipamento,
  margensDosPaineis, NOMES_ESTILO, quedasDoHistorico, resumoDasClasses, salvarEstilo,
  webglDisponivel,
} from "./visoes.js";

const AVISO_SEM_3D = "Seu navegador não tem 3D; mostrando o Organograma.";
const MSG_HISTORICO = "Não foi possível carregar o histórico.";
const MSG_CARGA = "Não foi possível abrir a Teia. Tente de novo.";
const MSG_PAUSA = "Não foi possível pausar/retomar.";
const TITULOS = { lista: "Lista", teia: "Teia", organograma: "Organograma" };

const FICHA_VAZIA = {
  id: "", nome: "", classe: "", corClasse: "", ip: "", checagem: "", estadoClasse: "",
  estadoIcone: "#i-desconhecido", estadoRotulo: "", desde: "", desdeTitulo: "", latencia: "",
  pausado: false,
};

function movimentoReduzido() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Estado e métodos das abas e da Teia; `store` é o mesmo da lista (fora do Alpine). */
export function visoesDoPainel(store) {
  let controle = null; // controle da cena devolvido por montarTeia
  let montagem = null; // promessa da montagem em curso (evita dois renderers)
  let webgl = null; // detecção memorizada
  let pedidoHistorico = 0; // descarta respostas de um equipamento anterior
  let focoAntesDoPainel = null;
  let autenticado = false; // a Teia (e o pedido do bundle) só depois do /auth/eu

  return {
    aba: abaDoHash(window.location.hash),
    avisoVisao: "",
    estilo: estiloSalvo(),
    estilos: ESTILOS.map((id) => ({ id, nome: NOMES_ESTILO[id] })),
    teiaCarregando: false,
    teiaErro: "",
    teiaClasses: [],
    classeFocada: "",
    classeFocadaNome: "",
    classeFocadaTotal: "",
    teiaEquips: [],
    teiaPagina: 1,
    teiaPaginas: 1,
    equip: { ...FICHA_VAZIA },
    equipAberto: false,
    historico: [],
    historicoCarregando: false,
    historicoErro: "",
    acaoErro: "",
    pausando: false,

    // ---------- abas ----------
    iniciarVisoes() {
      window.addEventListener("hashchange", () => this.aplicarRota());
      document.addEventListener("visibilitychange", () => {
        if (!controle) return;
        if (document.hidden) controle.pausar();
        else if (this.aba === "teia") controle.retomar();
      });
      this.aplicarRota();
    },

    /** Chamado pelo app.js quando /auth/eu respondeu: a Teia pode montar. */
    liberarTeia() {
      autenticado = true;
      if (this.aba === "teia") this.entrarNaTeia();
    },

    aplicarRota() {
      let nova = abaDoHash(window.location.hash);
      if (nova === "teia" && !this.temWebgl()) {
        this.avisoVisao = AVISO_SEM_3D;
        window.history.replaceState(null, "", "#organograma");
        nova = "organograma";
      }
      this.aba = nova;
      document.documentElement.dataset.aba = nova;
      document.title = `Sentinela · ${TITULOS[nova]}`;
      if (nova === "teia") {
        if (autenticado) this.entrarNaTeia();
      } else {
        if (controle) controle.pausar();
        this.agendarRender();
      }
    },

    irPara(aba) {
      if (window.location.hash === `#${aba}`) this.aplicarRota();
      else window.location.hash = aba; // entra no histórico: voltar/avançar trocam a aba
    },

    temWebgl() {
      if (webgl === null) webgl = webglDisponivel();
      return webgl;
    },

    abaSelecionada(aba) {
      return this.aba === aba ? "true" : "false";
    },
    get abaLista() {
      return this.aba === "lista";
    },
    get abaTeia() {
      return this.aba === "teia";
    },
    get abaOrganograma() {
      return this.aba === "organograma";
    },

    // ---------- montagem preguiçosa ----------
    entrarNaTeia() {
      this.renderizarTeia();
      if (controle) {
        controle.retomar();
        return;
      }
      if (!montagem) {
        montagem = this.montarTeia().finally(() => {
          montagem = null;
        });
      }
    },

    async montarTeia() {
      this.teiaCarregando = true;
      this.teiaErro = "";
      let modulo;
      try {
        modulo = await carregarTeia();
      } catch {
        this.teiaCarregando = false;
        this.teiaErro = MSG_CARGA;
        return;
      }
      await this.$nextTick(); // a seção já está visível: o contêiner tem tamanho
      if (controle) return;
      try {
        controle = modulo.montarTeia(this.$refs.palcoTeia, {
          estilo: this.estilo,
          movimentoReduzido: movimentoReduzido(),
          aoClicarEquipamento: (id) => this.abrirEquipamento(id),
          aoClicarClasse: (slug) => this.focarClasse(slug),
          margens: () => this.margensDaCena(),
        });
      } catch {
        controle = null;
        this.teiaCarregando = false;
        this.teiaErro = MSG_CARGA;
        return;
      }
      this.teiaCarregando = false;
      if (this.carregado) controle.sincronizar(store);
      if (this.classeFocada) controle.focarClasse(this.classeFocada);
      if (this.aba !== "teia" || document.hidden) controle.pausar();
    },

    /** px da cena cobertos pelo painel de classes e pelo do equipamento (se aberto). */
    margensDaCena() {
      const palco = this.$refs.palcoTeia;
      if (!palco) return {};
      const caixa = (id) => {
        const el = document.getElementById(id);
        return el && !el.hidden ? el.getBoundingClientRect() : null;
      };
      return margensDosPaineis(palco.getBoundingClientRect(), [
        caixa("teia-classes"),
        this.equipAberto ? caixa("painel-equipamento") : null,
      ]);
    },

    tentarTeiaDeNovo() {
      this.teiaErro = "";
      this.entrarNaTeia();
    },

    // ---------- dados vindos do store (snapshot / estado / render) ----------
    teiaAoMudarStore() {
      if (controle) controle.sincronizar(store);
      if (this.equipAberto && !store.itens.has(this.equip.id)) this.fecharEquipamento();
    },

    teiaAoEstado(id) {
      if (controle) controle.atualizarEstado(id);
      if (this.equipAberto && this.equip.id === id) this.carregarHistorico(id, true);
    },

    /** Painéis da Teia a partir do store (chamado no render da página). */
    renderizarTeia() {
      if (this.aba !== "teia") return;
      this.teiaClasses = resumoDasClasses(store);
      if (this.classeFocada) {
        const c = this.teiaClasses.find((x) => x.slug === this.classeFocada);
        if (!c) {
          this.classeFocada = "";
        } else {
          const r = equipamentosDaClasse(store, c.slug, this.teiaPagina);
          this.classeFocadaNome = c.nome;
          this.classeFocadaTotal = `${c.total} equipamento${c.total === 1 ? "" : "s"}`;
          this.teiaEquips = r.itens;
          this.teiaPagina = r.pagina;
          this.teiaPaginas = r.paginas;
        }
      }
      if (this.equipAberto) {
        const it = store.itens.get(this.equip.id);
        if (it) this.equip = fichaDoEquipamento(it, store);
      }
    },

    // ---------- estilo ----------
    escolherEstilo(id) {
      if (!ESTILOS.includes(id)) return;
      this.estilo = id;
      salvarEstilo(id);
      if (controle) controle.definirEstilo(id);
    },
    estiloPressionado(id) {
      return this.estilo === id ? "true" : "false";
    },

    // ---------- classes ----------
    focarClasse(slug) {
      if (!slug) return;
      this.classeFocada = slug;
      this.teiaPagina = 1;
      this.renderizarTeia();
      if (controle) controle.focarClasse(slug);
      this.$nextTick(() => this.$refs.tituloClasse && this.$refs.tituloClasse.focus());
    },
    get temClasseFocada() {
      return this.classeFocada !== "";
    },
    get semClasseFocada() {
      return this.classeFocada === "";
    },
    classePressionada(slug) {
      return this.classeFocada === slug ? "true" : "false";
    },
    paginaClasseAnterior() {
      if (this.teiaPagina > 1) {
        this.teiaPagina -= 1;
        this.renderizarTeia();
      }
    },
    paginaClasseProxima() {
      if (this.teiaPagina < this.teiaPaginas) {
        this.teiaPagina += 1;
        this.renderizarTeia();
      }
    },
    get classeSemAnterior() {
      return this.teiaPagina <= 1;
    },
    get classeSemProxima() {
      return this.teiaPagina >= this.teiaPaginas;
    },
    get classeVariasPaginas() {
      return this.teiaPaginas > 1;
    },
    get infoPaginaClasse() {
      return `${this.teiaPagina} de ${this.teiaPaginas}`;
    },

    /** Tira o foco da classe e fecha o painel do equipamento: vista completa. */
    verTudo() {
      const anterior = this.classeFocada;
      this.fecharEquipamento(false);
      this.classeFocada = "";
      if (controle) controle.verTudo();
      if (anterior) {
        this.$nextTick(() => {
          const botao = document.querySelector(`#teia-classes [data-slug="${CSS.escape(anterior)}"]`);
          if (botao) botao.focus();
        });
      }
    },

    aoEsc() {
      if (this.aba !== "teia") return;
      if (this.equipAberto) this.fecharEquipamento();
      else this.verTudo();
    },

    // ---------- painel do equipamento ----------
    abrirEquipamento(id) {
      const it = store.itens.get(id);
      if (!it) return;
      if (!this.equipAberto) focoAntesDoPainel = document.activeElement;
      this.equip = fichaDoEquipamento(it, store);
      this.equipAberto = true;
      this.acaoErro = "";
      this.carregarHistorico(id, false);
      this.$nextTick(() => {
        // painel já desenhado: a câmera desconta a largura dele (ou a folha de baixo)
        if (controle && this.equipAberto && this.equip.id === id) controle.focarEquipamento(id);
        if (this.$refs.tituloEquip) this.$refs.tituloEquip.focus();
      });
    },

    fecharEquipamento(devolverFoco = true) {
      if (!this.equipAberto) return;
      pedidoHistorico += 1;
      this.equipAberto = false;
      this.historico = [];
      this.historicoErro = "";
      this.historicoCarregando = false;
      this.acaoErro = "";
      const voltar = focoAntesDoPainel;
      focoAntesDoPainel = null;
      if (controle) {
        controle.limparSelecao();
        if (devolverFoco) this.$nextTick(() => controle && controle.reenquadrar());
      }
      if (devolverFoco && voltar && voltar.isConnected && typeof voltar.focus === "function") {
        voltar.focus();
      }
    },

    async carregarHistorico(id, silencioso) {
      const pedido = ++pedidoHistorico;
      if (!silencioso) {
        this.historico = [];
        this.historicoCarregando = true;
      }
      this.historicoErro = "";
      const r = await api.eventosEquipamento(id);
      if (pedido !== pedidoHistorico) return; // outro equipamento já foi aberto
      this.historicoCarregando = false;
      if (!r.ok || !Array.isArray(r.dados)) {
        if (silencioso) return; // recarga em segundo plano: mantém a lista mostrada
        this.historico = [];
        this.historicoErro = MSG_HISTORICO;
        return;
      }
      this.historico = quedasDoHistorico(r.dados);
    },

    equipAtual(id) {
      return this.equipAberto && this.equip.id === id ? "true" : "false";
    },
    get historicoVazio() {
      return !this.historicoCarregando && !this.historicoErro && this.historico.length === 0;
    },
    get rotuloPausa() {
      return this.equip.pausado ? "Retomar" : "Pausar";
    },

    async alternarPausa() {
      if (!this.admin || !this.equipAberto || this.pausando) return;
      const id = this.equip.id;
      const pausar = !this.equip.pausado;
      this.acaoErro = "";
      this.pausando = true;
      const r = pausar ? await api.pausarEquipamento(id) : await api.retomarEquipamento(id);
      this.pausando = false;
      if (!r.ok || !r.dados) {
        if (this.equipAberto && this.equip.id === id) this.acaoErro = MSG_PAUSA;
        return;
      }
      // a resposta já vale para o store (o WS confirma depois): painel, lista e cena juntos
      const e = r.dados;
      const item = store.itens.get(id);
      if (item) {
        item.estado = e.estado;
        item.desde = e.estado_desde;
        item.latencia_ms = e.latencia_ms ?? null;
        if (controle) controle.atualizarEstado(id);
        this.agendarRender();
      }
      if (!this.equipAberto || this.equip.id !== id) return;
      if (item) this.equip = fichaDoEquipamento(item, store);
      this.carregarHistorico(id, true);
    },
  };
}
