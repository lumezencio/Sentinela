// Aba Alertas (#alertas): lista ao vivo de quedas e instabilidades, reconhecimento (admin),
// silêncios e janelas de manutenção. Funções puras (testadas no Node) + o pedaço do componente
// "painel". O texto do alerta vem do banco (nome de equipamento pode ser hostil e longo): só
// vai à tela por x-text e nunca é cortado; quem exibe quebra a linha.
import { api } from "./api.js";
import { candidatosPai } from "./dependencia.js";
import { ESTADOS, haQuanto } from "./lista.js";
import { textoSeguro } from "./novos.js";
import { formatarDuracao } from "./visoes.js";

export const ATALHOS = [
  { valor: "1h", rotulo: "1 hora" },
  { valor: "4h", rotulo: "4 horas" },
  { valor: "amanha_8h", rotulo: "Até amanhã 08:00" },
  { valor: "personalizado", rotulo: "Personalizado" },
];
export const PERIODOS = [
  { valor: "", rotulo: "Todo o período" },
  { valor: "24h", rotulo: "Últimas 24 horas" },
  { valor: "7d", rotulo: "Últimos 7 dias" },
  { valor: "30d", rotulo: "Últimos 30 dias" },
];
export const FUSO_PADRAO = "America/Sao_Paulo";
const POR_PAGINA_ALERTAS = 50;
const MAX_DIAS = 30;
const DIA_MS = 86_400_000;
const MAX_MOTIVO = 200;
const MAX_CANDIDATOS = 8;
const MSG_FALHA = "Não foi possível concluir. Tente de novo.";
const MSG_ALERTAS = "Não foi possível carregar os alertas.";
const MARCAS = {
  aberto: { icone: "#i-offline", rotulo: "Aberto" },
  instavel: { icone: "#i-instavel", rotulo: "Instável" },
  fechado: { icone: "#i-online", rotulo: "Resolvido" },
};
const ENVIOS = {
  enviado: "Telegram enviado",
  pendente: "Telegram pendente",
  falhou: "Telegram falhou",
};

// ---------- horário no fuso configurado ----------
const formatadores = new Map();

function formatador(fuso, tipo) {
  const chave = `${fuso}|${tipo}`;
  let f = formatadores.get(chave);
  if (!f) {
    const opcoes = {
      hora: { hour: "2-digit", minute: "2-digit", hourCycle: "h23" },
      dia: { day: "2-digit", month: "2-digit" },
      chave: { year: "numeric", month: "2-digit", day: "2-digit" },
      tudo: {
        year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit",
        second: "2-digit", hourCycle: "h23",
      },
    }[tipo];
    try {
      f = new Intl.DateTimeFormat("pt-BR", { ...opcoes, timeZone: fuso });
    } catch {
      f = new Intl.DateTimeFormat("pt-BR", opcoes); // fuso inválido: fuso do navegador
    }
    formatadores.set(chave, f);
  }
  return f;
}

/** "14:32" se for no mesmo dia de `agora` (no fuso); senão "16/11 22:05". "—" se a data é inválida. */
export function horaNoFuso(iso, agora, fuso) {
  const t = typeof iso === "number" ? iso : Date.parse(iso);
  if (Number.isNaN(t)) return "—";
  const hm = formatador(fuso, "hora").format(t);
  if (formatador(fuso, "chave").format(t) === formatador(fuso, "chave").format(agora)) return hm;
  return `${formatador(fuso, "dia").format(t)} ${hm}`;
}

/** Deslocamento (ms) do fuso em `ms`: relógio de parede em UTC menos o instante. */
function deslocamento(ms, fuso) {
  const p = {};
  for (const parte of formatador(fuso, "tudo").formatToParts(ms)) p[parte.type] = Number(parte.value);
  const parede = Date.UTC(p.year, p.month - 1, p.day, p.hour % 24, p.minute, p.second);
  return parede - Math.floor(ms / 1000) * 1000;
}

/**
 * "2026-11-18T20:00" (campo datetime-local) lido como horário do fuso configurado → ISO em UTC.
 * Vazio ou inválido → "".
 */
export function instanteNoFuso(valor, fuso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(String(valor ?? ""));
  if (!m) return "";
  const [ano, mes, dia, hora, min] = m.slice(1).map(Number);
  const parede = Date.UTC(ano, mes - 1, dia, hora, min);
  const d = new Date(parede);
  if (d.getUTCMonth() !== mes - 1 || d.getUTCDate() !== dia || d.getUTCHours() !== hora) return "";
  let t = parede - deslocamento(parede, fuso);
  t = parede - deslocamento(t, fuso); // 2ª passada: a hora do deslocamento pode mudar (horário de verão)
  return new Date(t).toISOString();
}

// ---------- linhas ----------
export function rotuloEnvio(envio, silenciado) {
  if (silenciado) return "Silenciado";
  return Object.hasOwn(ENVIOS, envio) ? ENVIOS[envio] : "";
}

const plural = (n, um, varios) => `${n} ${n === 1 ? um : varios}`;

/** Linha pronta para a tela (objeto plano; o texto do alerta fica INTEIRO). */
export function linhaDoAlerta(a, agora = Date.now(), fuso = FUSO_PADRAO) {
  const fechado = Boolean(a.fechado_em);
  const marca = fechado ? "fechado" : a.tipo === "instavel" ? "instavel" : "aberto";
  const afetados = Number.isInteger(a.afetados_total) ? a.afetados_total : 0;
  let fechadoTexto = "";
  if (fechado) {
    const dur = (Date.parse(a.fechado_em) - Date.parse(a.aberto_em)) / 1000;
    fechadoTexto = `Resolvido às ${horaNoFuso(a.fechado_em, agora, fuso)}`;
    if (Number.isFinite(dur)) fechadoTexto += ` · durou ${formatarDuracao(dur)}`;
  }
  return {
    id: a.id,
    marca,
    icone: MARCAS[marca].icone,
    rotuloMarca: MARCAS[marca].rotulo,
    hora: horaNoFuso(a.aberto_em, agora, fuso),
    quando: haQuanto(a.aberto_em, agora),
    texto: String(a.texto ?? ""),
    rotuloEnvio: rotuloEnvio(a.envio, a.silenciado),
    afetados,
    rotuloAfetados: afetados ? plural(afetados, "afetado", "afetados") : "",
    reconhecivel: !fechado && !a.reconhecido_em,
    reconhecimento: a.reconhecido_em
      ? `Reconhecido por ${textoSeguro(a.reconhecido_por, 64) || "um administrador"} às ${horaNoFuso(a.reconhecido_em, agora, fuso)}`
      : "",
    fechado: fechadoTexto,
    equipamentoId: a.equipamento_id || "",
    classe: a.classe || "",
  };
}

const maisRecente = (a, b) => Date.parse(b.aberto_em) - Date.parse(a.aberto_em) || b.id - a.id;

/** Aplica uma mensagem WS "alerta" à lista (devolve outra, mais recente primeiro; não muta). */
export function aplicarMensagemAlerta(lista, msg) {
  if (!msg || typeof msg !== "object") return lista;
  const id = Number.isInteger(msg.id) ? msg.id : msg.alerta && msg.alerta.id;
  if (!Number.isInteger(id)) return lista;
  const resto = lista.filter((a) => a.id !== id);
  const novo = msg.acao === "removido" ? null : msg.alerta;
  if (!novo) return resto.length === lista.length ? lista : resto;
  if (!Number.isInteger(novo.id) || typeof novo.aberto_em !== "string") return lista;
  return [...resto, novo].sort(maisRecente);
}

export const contarAbertos = (lista) => lista.reduce((n, a) => n + (a.fechado_em ? 0 : 1), 0);

/** Contador de abertos que o servidor manda em cada mensagem; sem ele, fica o atual. */
export function abertosDaMensagem(msg, atual) {
  return msg && Number.isInteger(msg.abertos) && msg.abertos >= 0 ? msg.abertos : atual;
}

/** Filtros da tela sobre a lista local (o servidor já filtra a carga inicial). */
export function filtrarAlertas(lista, { filtro = "abertos", classe = "", desde = 0 } = {}) {
  return lista.filter((a) => {
    if (filtro === "abertos" && a.fechado_em) return false;
    if (filtro === "reconhecidos" && !a.reconhecido_em) return false;
    if (classe && a.classe !== classe) return false;
    if (desde && Date.parse(a.aberto_em) < desde) return false;
    return true;
  });
}

/** Início do período (ms) ou 0 para "todo o período". */
export function desdeDoPeriodo(periodo, agora = Date.now()) {
  const dias = { "24h": 1, "7d": 7, "30d": 30 }[periodo];
  return dias ? agora - dias * DIA_MS : 0;
}

// ---------- silêncio / manutenção ----------
/** Erros por campo ({} = válido). `fim` (ISO com fuso) só conta com o atalho "personalizado". */
export function validarSilencio(form, agora = Date.now()) {
  const f = form || {};
  const e = {};
  if (!String(f.alvo ?? "").trim()) {
    e.alvo = f.alvo_tipo === "classe" ? "Escolha a classe." : "Escolha o equipamento.";
  }
  if (!ATALHOS.some((a) => a.valor === f.atalho)) {
    e.atalho = "Escolha por quanto tempo.";
  } else if (f.atalho === "personalizado") {
    const fim = Date.parse(f.fim);
    if (!String(f.fim ?? "") || Number.isNaN(fim)) e.fim = "Informe quando termina.";
    else if (fim <= agora) e.fim = "O fim precisa ser no futuro.";
    else if (fim > agora + MAX_DIAS * DIA_MS) e.fim = `No máximo ${MAX_DIAS} dias.`;
  }
  if (String(f.motivo ?? "").trim().length > MAX_MOTIVO) {
    e.motivo = `Até ${MAX_MOTIVO} caracteres.`;
  }
  return e;
}

/** Corpo do POST /silencios: atalho OU fim (nunca os dois); motivo só se houver. */
export function montarSilencio(form) {
  const corpo = {
    tipo: form.tipo,
    alvo_tipo: form.alvo_tipo,
    alvo: String(form.alvo ?? "").trim(),
  };
  if (form.atalho === "personalizado") corpo.fim = form.fim;
  else corpo.atalho = form.atalho;
  const motivo = String(form.motivo ?? "").trim();
  if (motivo) corpo.motivo = motivo;
  return corpo;
}

const novoForm = () => ({
  tipo: "silencio", alvo_tipo: "equipamento", alvo: "", atalho: "1h", fimLocal: "", motivo: "",
});

function linhaDoSilencio(s, agora, fuso) {
  const manutencao = s.tipo === "manutencao";
  const alvoClasse = s.alvo_tipo === "classe";
  return {
    id: s.id,
    manutencao,
    rotuloTipo: manutencao ? "Manutenção" : "Silêncio",
    icone: manutencao ? "#i-pausado" : "#i-instavel",
    alvo: textoSeguro(s.alvo_nome, 200),
    rotuloAlvo: alvoClasse ? "Classe" : "Equipamento",
    ate: `Até ${horaNoFuso(s.fim, agora, fuso)}`,
    motivo: textoSeguro(s.motivo, 200),
    criadoPor: textoSeguro(s.criado_por, 64),
    pausados: manutencao && s.pausados ? plural(s.pausados, "equipamento pausado", "equipamentos pausados") : "",
    fimMs: Date.parse(s.fim),
  };
}

/** Estado e métodos da aba; mesmo `this` do componente "painel" (store = o da lista). */
export function alertasDoPainel(store) {
  let bruta = []; // alertas carregados, fora da reatividade
  let carregada = false;
  let silenciosCarregados = false;
  let silenciosBrutos = [];
  let pedido = 0; // descarta resposta de um filtro anterior
  const detalhes = new Map(); // id -> {carregando, erro, lista}
  const expandidos = new Set();
  let focoAntesDoSilencio = null;
  let snapshots = 0;

  const desdeAtual = (ctx) => desdeDoPeriodo(ctx.periodoAlertas);

  return {
    alertasAbertos: 0,
    fuso: FUSO_PADRAO,
    filtroAlertas: "abertos",
    classeAlertas: "",
    periodoAlertas: "",
    periodos: PERIODOS,
    atalhos: ATALHOS,
    alertasLinhas: [],
    alertasTotal: 0,
    alertasPagina: 1,
    alertasCarregando: false,
    alertasMais: false,
    alertasErro: "",
    alertasAviso: "",
    silencios: [],
    silenciosErro: "",
    // diálogo de silêncio/manutenção
    silForm: novoForm(),
    silErros: {},
    silErroGeral: "",
    silEnviando: false,
    silBusca: "",
    silCandidatos: [],
    silAlvoNome: "",

    // ---------- carga ----------
    async carregarGeral() {
      const r = await api.verGeral();
      if (r.ok && r.dados && typeof r.dados.fuso === "string") {
        this.fuso = textoSeguro(r.dados.fuso, 64) || FUSO_PADRAO;
        this.renderizarAlertas();
      }
    },

    entrarEmAlertas() {
      if (!carregada) this.recarregarAlertas();
      this.carregarSilencios();
    },

    async recarregarAlertas() {
      carregada = true;
      const meu = ++pedido;
      this.alertasCarregando = true;
      const desde = desdeAtual(this);
      const r = await api.listarAlertas({
        filtro: this.filtroAlertas,
        classe: this.classeAlertas,
        desde: desde ? new Date(desde).toISOString() : "",
        pagina: 1,
        porPagina: POR_PAGINA_ALERTAS,
      });
      if (meu !== pedido) return;
      this.alertasCarregando = false;
      if (!r.ok || !r.dados || !Array.isArray(r.dados.itens)) {
        this.alertasErro = r.erro || MSG_ALERTAS;
        return;
      }
      this.alertasErro = "";
      bruta = r.dados.itens;
      this.alertasTotal = Number(r.dados.total) || bruta.length;
      this.alertasPagina = 1;
      this.renderizarAlertas();
    },

    async maisAlertas() {
      if (this.alertasCarregando) return;
      const meu = ++pedido;
      this.alertasCarregando = true;
      const desde = desdeAtual(this);
      const r = await api.listarAlertas({
        filtro: this.filtroAlertas,
        classe: this.classeAlertas,
        desde: desde ? new Date(desde).toISOString() : "",
        pagina: this.alertasPagina + 1,
        porPagina: POR_PAGINA_ALERTAS,
      });
      if (meu !== pedido) return;
      this.alertasCarregando = false;
      if (!r.ok || !r.dados || !Array.isArray(r.dados.itens)) {
        this.alertasErro = r.erro || MSG_ALERTAS;
        return;
      }
      this.alertasErro = "";
      const ja = new Set(bruta.map((a) => a.id));
      bruta = [...bruta, ...r.dados.itens.filter((a) => !ja.has(a.id))].sort(maisRecente);
      this.alertasPagina += 1;
      this.alertasTotal = Math.max(Number(r.dados.total) || 0, bruta.length);
      this.renderizarAlertas();
    },

    aoFiltrarAlertas() {
      this.recarregarAlertas();
    },
    filtrarAlertasPor(filtro) {
      if (this.filtroAlertas === filtro) return;
      this.filtroAlertas = filtro;
      this.recarregarAlertas();
    },
    filtroAlertasAtivo(filtro) {
      return this.filtroAlertas === filtro ? "true" : "false";
    },

    // ---------- ao vivo ----------
    alertasAoSnapshot(msg) {
      this.alertasAbertos = abertosDaMensagem({ abertos: msg.alertas_abertos }, this.alertasAbertos);
      // reconexão (do 2º snapshot em diante): o que passou fora volta do servidor
      if (snapshots++ === 0) return;
      if (carregada) this.recarregarAlertas();
      if (silenciosCarregados) this.carregarSilencios();
    },

    alertasAoMensagem(msg) {
      if (msg.tipo === "silencio") {
        if (silenciosCarregados) this.carregarSilencios();
        return;
      }
      this.alertasAbertos = abertosDaMensagem(msg, this.alertasAbertos);
      if (!carregada) return;
      const filtros = { filtro: this.filtroAlertas, classe: this.classeAlertas, desde: desdeAtual(this) };
      const antes = filtrarAlertas(bruta, filtros).length;
      bruta = aplicarMensagemAlerta(bruta, msg);
      this.alertasTotal = Math.max(0, this.alertasTotal + filtrarAlertas(bruta, filtros).length - antes);
      this.renderizarAlertas();
    },

    renderizarAlertas() {
      const agora = Date.now();
      const visiveis = filtrarAlertas(bruta, {
        filtro: this.filtroAlertas, classe: this.classeAlertas, desde: desdeAtual(this),
      });
      this.alertasLinhas = visiveis.map((a) => {
        const l = linhaDoAlerta(a, agora, this.fuso);
        const classe = store.classes.get(l.classe);
        const aberto = expandidos.has(a.id);
        const d = detalhes.get(a.id) || { carregando: false, erro: "", lista: [] };
        return {
          ...l,
          classeNome: classe ? classe.nome : textoSeguro(l.classe, 32),
          classeLinha: `al-linha al-${l.marca}`,
          expandido: aberto,
          ariaExpandido: aberto ? "true" : "false",
          idDetalhe: `al-detalhe-${a.id}`,
          detalhe: { carregando: d.carregando, erro: d.erro, lista: d.lista, vazio: !d.carregando && !d.erro && d.lista.length === 0 },
          rotuloVer: aberto ? "Ocultar afetados" : "Ver afetados",
          rotuloReconhecer: `Reconhecer alerta: ${textoSeguro(l.texto, 120)}`,
        };
      });
      const agoraMs = Date.now();
      this.silencios = silenciosBrutos
        .filter((s) => s.fimMs > agoraMs)
        .map((s) => ({ ...s, rotuloEncerrar: `Encerrar ${s.rotuloTipo.toLowerCase()} de ${s.alvo}` }));
      this.alertasMais = this.alertasPagina * POR_PAGINA_ALERTAS < this.alertasTotal;
    },

    get alertasVazio() {
      return !this.alertasCarregando && !this.alertasErro && this.alertasLinhas.length === 0;
    },
    get alertasTextoVazio() {
      return this.filtroAlertas === "abertos"
        ? "Nenhum alerta aberto. Tudo certo por aqui."
        : "Nenhum alerta neste filtro.";
    },
    get temAlertasAbertos() {
      return this.alertasAbertos > 0;
    },
    get rotuloAlertasAbertos() {
      return this.alertasAbertos > 99 ? "99+" : String(this.alertasAbertos);
    },
    get alertasResumo() {
      const n = this.alertasLinhas.length;
      return n === 0 ? "" : `Mostrando ${n} de ${Math.max(this.alertasTotal, n)}`;
    },
    get semSilencios() {
      return this.silencios.length === 0 && !this.silenciosErro;
    },

    // ---------- afetados ----------
    async alternarAfetados(id) {
      if (expandidos.has(id)) {
        expandidos.delete(id);
        this.renderizarAlertas();
        return;
      }
      expandidos.add(id);
      detalhes.set(id, { carregando: true, erro: "", lista: [] });
      this.renderizarAlertas();
      const r = await api.verAlerta(id);
      if (!r.ok || !r.dados || !Array.isArray(r.dados.afetados)) {
        detalhes.set(id, { carregando: false, erro: r.erro || "Não foi possível carregar os afetados.", lista: [] });
      } else {
        const lista = r.dados.afetados.map((x) => {
          const est = ESTADOS[x.estado] || ESTADOS.desconhecido;
          const classe = store.classes.get(x.classe);
          return {
            id: x.id,
            nome: textoSeguro(x.nome, 200),
            classeNome: classe ? classe.nome : textoSeguro(x.classe, 32),
            estadoRotulo: est.rotulo,
            estadoIcone: `#${est.icone}`,
            estadoClasse: `estado st-${ESTADOS[x.estado] ? x.estado : "desconhecido"}`,
          };
        });
        detalhes.set(id, { carregando: false, erro: "", lista });
      }
      this.renderizarAlertas();
    },

    // ---------- reconhecer (admin) ----------
    async reconhecerAlerta(id) {
      if (!this.admin) return;
      this.alertasErro = "";
      const r = await api.reconhecerAlerta(id);
      if (!r.ok) {
        this.alertasErro = r.erro;
        return;
      }
      // o WS traz o mesmo "atualizado"; aplicar de novo é idempotente
      this.alertasAoMensagem({ tipo: "alerta", acao: "atualizado", id, alerta: r.dados });
    },

    // ---------- silêncios ----------
    async carregarSilencios() {
      const r = await api.listarSilencios();
      silenciosCarregados = true;
      if (!r.ok || !Array.isArray(r.dados)) {
        this.silenciosErro = r.erro || "Não foi possível carregar os silêncios.";
        return;
      }
      this.silenciosErro = "";
      const agora = Date.now();
      silenciosBrutos = r.dados.map((s) => linhaDoSilencio(s, agora, this.fuso));
      this.renderizarAlertas();
    },

    async encerrarSilencio(id) {
      if (!this.admin) return;
      this.silenciosErro = "";
      const r = await api.encerrarSilencio(id);
      if (!r.ok) {
        this.silenciosErro = r.erro;
        return;
      }
      silenciosBrutos = silenciosBrutos.filter((s) => s.id !== id);
      this.alertasAviso = "Encerrado.";
      this.renderizarAlertas();
    },

    abrirSilencio(pre) {
      if (!this.admin) return;
      focoAntesDoSilencio = document.activeElement;
      this.silForm = novoForm();
      this.silErros = {};
      this.silErroGeral = "";
      this.silBusca = "";
      this.silCandidatos = [];
      this.silAlvoNome = "";
      if (pre && pre.equipamentoId) {
        this.silForm.alvo = pre.equipamentoId;
        this.silAlvoNome = textoSeguro(pre.nome, 200);
      }
      this.$refs.dlgSilencio.showModal();
    },
    abrirSilencioDoAlerta(id) {
      const l = this.alertasLinhas.find((x) => x.id === id);
      if (!l || !l.equipamentoId) return;
      const item = store.itens.get(l.equipamentoId);
      this.abrirSilencio({ equipamentoId: l.equipamentoId, nome: item ? item.nome : "" });
    },
    fecharSilencio() {
      this.$refs.dlgSilencio.close();
    },
    aoFecharSilencio() {
      const voltar = focoAntesDoSilencio;
      focoAntesDoSilencio = null;
      if (voltar && voltar.isConnected && typeof voltar.focus === "function") voltar.focus();
    },
    aoTrocarAlvoTipo() {
      this.silForm.alvo = "";
      this.silAlvoNome = "";
      this.silBusca = "";
      this.silCandidatos = [];
      this.silErros = { ...this.silErros, alvo: "" };
    },
    aoBuscarAlvo() {
      const termo = this.silBusca.trim();
      this.silCandidatos = termo ? candidatosPai(store, "", termo, MAX_CANDIDATOS).map((c) => ({
        ...c, rotulo: `${c.nome} (${c.classe})`,
      })) : [];
    },
    escolherAlvo(id) {
      const c = this.silCandidatos.find((x) => x.id === id);
      if (!c) return;
      this.silForm.alvo = c.id;
      this.silAlvoNome = textoSeguro(c.nome, 200);
      this.silCandidatos = [];
      this.silBusca = "";
      this.silErros = { ...this.silErros, alvo: "" };
    },
    trocarAlvo() {
      this.silForm.alvo = "";
      this.silAlvoNome = "";
    },
    get silEquipamento() {
      return this.silForm.alvo_tipo === "equipamento";
    },
    get silSemAlvoEscolhido() {
      return this.silEquipamento && !this.silForm.alvo;
    },
    get silComAlvoEscolhido() {
      return this.silEquipamento && Boolean(this.silForm.alvo);
    },
    get silPersonalizado() {
      return this.silForm.atalho === "personalizado";
    },
    get silTitulo() {
      return this.silForm.tipo === "manutencao" ? "Janela de manutenção" : "Silenciar alertas";
    },
    get silDica() {
      return this.silForm.tipo === "manutencao"
        ? "A manutenção silencia os alertas e também pausa a checagem do alvo até o fim; ao acabar, a checagem volta sozinha."
        : "O silêncio só deixa de avisar no Telegram; o equipamento continua sendo checado e o alerta aparece aqui.";
    },
    get silRotuloEnviar() {
      return this.silForm.tipo === "manutencao" ? "Iniciar manutenção" : "Silenciar";
    },
    get silDicaFuso() {
      return `Horário de ${this.fuso}. No máximo ${MAX_DIAS} dias.`;
    },
    silEscolherTipo(tipo) {
      this.silForm.tipo = tipo;
    },
    silTipoAtivo(tipo) {
      return this.silForm.tipo === tipo ? "true" : "false";
    },

    async criarSilencio() {
      if (this.silEnviando) return;
      this.silErroGeral = "";
      const form = { ...this.silForm, fim: instanteNoFuso(this.silForm.fimLocal, this.fuso) };
      this.silErros = validarSilencio(form, Date.now());
      if (Object.keys(this.silErros).length) return;
      this.silEnviando = true;
      const r = await api.criarSilencio(montarSilencio(form));
      this.silEnviando = false;
      if (!r.ok) {
        this.silErroGeral = r.erro;
        return;
      }
      this.$refs.dlgSilencio.close();
      this.alertasAviso = form.tipo === "manutencao" ? "Manutenção iniciada." : "Silêncio criado.";
      this.carregarSilencios();
    },
  };
}
