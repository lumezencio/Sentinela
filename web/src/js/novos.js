// Aba Novos (#novos): fila de descobertas pendentes/ignoradas. Funções puras (testadas no
// Node) + o pedaço do componente "painel" (mesmo `this` do Alpine). Todo texto vindo da rede
// (nome sugerido, fabricante, sinais, origens) é texto: passa por textoSeguro e vai à tela só
// por x-text. A fila carrega 100 por vez ("Carregar mais"); as edições (classe, nome) e a
// seleção ficam fora da reatividade e sobrevivem às recargas.
import { api } from "./api.js";

export const POR_PAGINA_NOVOS = 100;
const MAX_LOTE = 200;
const CONTROLES = /[\u0000-\u001f\u007f-\u009f]/g;
const IPV4 = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
const MSG_FALHA = "Não foi possível concluir. Tente de novo.";
export const AVISO_ARP = "Sondar gera um pedido ARP na rede (um broadcast do sistema operacional)" +
  " e testa as portas da lista fixa neste endereço.";

/** Texto da rede pronto para x-text: sem caracteres de controle e com tamanho limitado. */
export function textoSeguro(texto, max = 200) {
  if (texto === null || texto === undefined) return "";
  return String(texto).replace(CONTROLES, "").slice(0, max);
}

const nomeDaClasse = (nomes, slug) =>
  (nomes && Object.hasOwn(nomes, slug) ? nomes[slug] : "") || textoSeguro(slug, 32);

/**
 * Sinais do classificador em linguagem simples: [{texto, pontos}], com pontos por classe do
 * maior para o menor ("+30 Câmeras · +20 Gravadores"); zero e valor não inteiro saem.
 */
export function sinaisLegiveis(sinais, nomes = {}) {
  if (!Array.isArray(sinais)) return [];
  const saida = [];
  for (const s of sinais) {
    if (!s || typeof s.descricao !== "string") continue;
    const pares = [];
    if (s.pontos && typeof s.pontos === "object") {
      for (const [slug, valor] of Object.entries(s.pontos)) {
        if (slug === "__proto__" || !Number.isInteger(valor) || valor === 0) continue;
        pares.push([slug, valor]);
      }
    }
    pares.sort((a, b) => b[1] - a[1]);
    const pontos = pares
      .map(([slug, v]) => `${v > 0 ? "+" : "−"}${Math.abs(v)} ${nomeDaClasse(nomes, slug)}`)
      .join(" · ");
    saida.push({ texto: textoSeguro(s.descricao), pontos });
  }
  return saida;
}

const ehCanal = (d) => Boolean(d && d.gravador_fonte_id && Number.isInteger(d.canal));

function fonteDoGravador(d) {
  for (const o of Array.isArray(d.origens) ? d.origens : []) {
    if (o && o.origem === "gravador" && o.fonte_id) return String(o.fonte_id);
  }
  return "";
}

/**
 * Câmeras de gravador sob o gravador: [{chave, gravador, fonteId, canais[]}]. O gravador é a
 * descoberta com origem "gravador" daquela fonte; sem ela na lista (já aprovado ou em outra
 * página) o grupo fica sem cabeça (gravador null). Ordem de chegada; canais por número.
 */
export function agruparPorGravador(descobertas) {
  if (!Array.isArray(descobertas)) return [];
  const cabecas = new Map(); // fonte_id -> descoberta do gravador
  for (const d of descobertas) {
    if (!d || ehCanal(d)) continue;
    const f = fonteDoGravador(d);
    if (f && !cabecas.has(f)) cabecas.set(f, d);
  }
  const grupos = [];
  const porFonte = new Map();
  const grupoDaFonte = (f) => {
    let g = porFonte.get(f);
    if (!g) {
      g = { chave: `g:${f}`, gravador: cabecas.get(f) || null, fonteId: f, canais: [] };
      porFonte.set(f, g);
      grupos.push(g);
    }
    return g;
  };
  for (const d of descobertas) {
    if (!d) continue;
    if (ehCanal(d)) {
      grupoDaFonte(String(d.gravador_fonte_id)).canais.push(d);
      continue;
    }
    const f = fonteDoGravador(d);
    if (f && cabecas.get(f) === d) grupoDaFonte(f);
    else grupos.push({ chave: `d:${d.id}`, gravador: d, fonteId: "", canais: [] });
  }
  for (const g of grupos) g.canais.sort((a, b) => a.canal - b.canal);
  return grupos;
}

/** "10.99.70.0/24" do IPv4 (o botão "Declarar sub-rede"); inválido → "". */
export function cidr24(ip) {
  const m = IPV4.exec(String(ip ?? ""));
  if (!m) return "";
  const p = m.slice(1, 5).map(Number);
  if (p.some((n) => n > 255)) return "";
  return `${p[0]}.${p[1]}.${p[2]}.0/24`;
}

/** Confiança 0–1 → inteiro 0–100. */
export function percentual(confianca) {
  const n = Number(confianca);
  if (!Number.isFinite(n)) return 0;
  return Math.round(Math.min(1, Math.max(0, n)) * 100);
}

const ORIGENS = {
  arp: "ARP", dhcp: "DHCP", wifi: "Wi-Fi", vizinho: "Vizinho (RouterOS)", snmp_arp: "SNMP (ARP)",
  lldp: "LLDP", gravador: "Gravador", gravador_canal: "Canal do gravador", varredura: "Varredura",
  sondagem: "Sondagem",
};

export function rotuloOrigem(origem) {
  const chave = String(origem ?? "");
  return Object.hasOwn(ORIGENS, chave) ? ORIGENS[chave] : textoSeguro(chave, 32);
}

/** Dados de tela de uma descoberta (objeto plano). */
export function cartaoDaDescoberta(d, nomes = {}) {
  const canal = ehCanal(d);
  const classe = typeof d.classe_sugerida === "string" && d.classe_sugerida ? d.classe_sugerida : "";
  const pct = percentual(d.confianca);
  const cidr = canal ? "" : cidr24(d.ip);
  const classeNome = classe ? nomeDaClasse(nomes, classe) : "Desconhecido";
  const origens = [];
  for (const o of Array.isArray(d.origens) ? d.origens : []) {
    const r = rotuloOrigem(o && o.origem);
    if (r && !origens.includes(r)) origens.push(r);
  }
  const conflito = textoSeguro(d.conflito_com_nome, 80);
  return {
    id: String(d.id),
    titulo: textoSeguro(d.nome_sugerido, 80) || textoSeguro(d.ip, 45),
    nomeSugerido: textoSeguro(d.nome_sugerido, 80),
    ip: textoSeguro(d.ip, 45),
    mac: textoSeguro(d.mac, 32),
    fabricante: textoSeguro(d.fabricante, 64),
    classe,
    classeNome,
    pct,
    pctTexto: `${pct}%`,
    origens,
    sinais: sinaisLegiveis(d.sinais, nomes),
    porqueTitulo: `Por que ${classeNome}?`,
    fora: Boolean(d.fora_das_subredes) && !canal,
    cidr,
    rotuloDeclarar: cidr ? `Declarar sub-rede ${cidr}` : "",
    conflito: conflito ? `conflito de IP com ${conflito}` : "",
    canal: canal ? d.canal : null,
    canalRotulo: canal ? `Canal ${d.canal}` : "",
    status: d.status,
  };
}

/**
 * Corpo do POST /aprovar a partir da edição da linha: a classe escolhida (ou a sugerida) e
 * o nome só se o admin digitou um diferente do sugerido.
 */
export function dadosDeAprovacao(d, edicao) {
  const e = edicao || {};
  const dados = { classe: e.classe || d.classe_sugerida || "desconhecido" };
  const nome = typeof e.nome === "string" ? e.nome.trim() : "";
  if (nome && nome !== (d.nome_sugerido || "")) dados.nome = nome;
  return dados;
}

/** A linha foi editada (classe diferente da sugerida ou nome novo)? */
export function foiEditada(d, edicao) {
  const dados = dadosDeAprovacao(d, edicao);
  return dados.classe !== (d.classe_sugerida || "desconhecido") || "nome" in dados;
}

/**
 * Divide a seleção do lote: linhas editadas vão uma a uma (POST /aprovar com classe/nome,
 * que o /aprovar-lote não aceita); as demais vão juntas no lote. Ids fora da lista saem.
 */
export function dividirLote(ids, descobertas, edicoes) {
  const porId = new Map((descobertas || []).map((d) => [d.id, d]));
  const individuais = [];
  const lote = [];
  for (const id of ids) {
    const d = porId.get(id);
    if (!d) continue;
    const e = edicoes && edicoes.get(id);
    if (foiEditada(d, e)) individuais.push({ id, dados: dadosDeAprovacao(d, e) });
    else lote.push(id);
  }
  return { individuais, lote };
}

const plural = (n, um, varios) => `${n} ${n === 1 ? um : varios}`;

/** Estado e métodos da aba Novos; `store` é o mesmo da lista (nomes de classes e gravadores). */
export function novosDoPainel(store) {
  let lista = []; // descobertas carregadas (da API), fora da reatividade
  const edicoes = new Map(); // id -> {classe, nome}
  const selecao = new Set();
  const erros = new Map(); // id -> motivo (recusa do lote ou da ação)
  const ocupados = new Set();
  const recolhidos = new Set(); // grupos de gravador recolhidos
  let carregadoUmaVez = false;
  let desatualizado = false;
  let pedido = 0; // descarta respostas antigas (troca de filtro no meio)

  const nomesDasClasses = () => {
    const nomes = {};
    for (const c of store.ordemClasses) nomes[c.slug] = c.nome;
    return nomes;
  };

  return {
    pendentes: 0,
    novosStatus: "pendente",
    novosTotal: 0,
    novosCarregados: 0,
    novosAprovaveis: 0,
    novosLinhas: [],
    novosCarregando: false,
    novosErro: "",
    novosAviso: "",
    novosNovidades: 0,
    novosSelecionados: 0,
    novosOcupado: false,
    novosJaCarregou: false,

    // ---------- entrada na aba e WebSocket ----------
    entrarEmNovos() {
      if (!carregadoUmaVez || desatualizado) this.carregarNovos(true);
    },

    novosAoMensagem(msg) {
      if (msg.tipo === "snapshot") {
        // nomes de classes e gravadores vêm do store: a fila carregada antes dele se redesenha
        if (this.aba === "novos" && carregadoUmaVez) this.renderizarNovos();
        if (!Number.isInteger(msg.pendentes)) return;
        this.pendentes = msg.pendentes;
        // reconexão: se a fila mudou enquanto o WS estava fora, oferece "Atualizar" (nunca
        // recarrega sozinha: o admin pode estar editando classe/nome)
        if (carregadoUmaVez && this.novosStatus === "pendente" && msg.pendentes !== this.novosTotal) {
          if (this.aba === "novos") this.novosNovidades += 1;
          else desatualizado = true;
        }
        return;
      }
      if (msg.tipo === "pendentes") {
        if (Number.isInteger(msg.total)) this.pendentes = msg.total;
        return;
      }
      if (msg.tipo !== "descoberta" || typeof msg.id !== "string") return;
      if (msg.acao === "removida") {
        if (this.tirarDaLista(msg.id)) this.renderizarNovos();
        return;
      }
      // nova/atualizada: não mexe na fila que o admin está editando; oferece "Atualizar"
      if (this.aba === "novos" && this.novosStatus === "pendente" && carregadoUmaVez) {
        this.novosNovidades += 1;
      } else {
        desatualizado = true;
      }
    },

    tirarDaLista(id) {
      const antes = lista.length;
      lista = lista.filter((d) => d.id !== id);
      selecao.delete(id);
      erros.delete(id);
      edicoes.delete(id);
      if (lista.length === antes) return false;
      this.novosTotal = Math.max(0, this.novosTotal - 1);
      return true;
    },

    // ---------- carga ----------
    async carregarNovos(doZero) {
      const meu = ++pedido;
      const offset = doZero ? 0 : lista.length;
      this.novosCarregando = true;
      this.novosErro = "";
      const r = await api.listarDescobertas(this.novosStatus, offset, POR_PAGINA_NOVOS);
      if (meu !== pedido) return;
      this.novosCarregando = false;
      if (!r.ok || !r.dados || !Array.isArray(r.dados.itens)) {
        this.novosErro = r.erro || MSG_FALHA;
        return;
      }
      if (doZero) {
        lista = [];
        selecao.clear();
        erros.clear();
        this.novosNovidades = 0;
      }
      const vistos = new Set(lista.map((d) => d.id));
      for (const d of r.dados.itens) if (d && typeof d.id === "string" && !vistos.has(d.id)) lista.push(d);
      this.novosTotal = Number.isInteger(r.dados.total) ? r.dados.total : lista.length;
      if (this.novosStatus === "pendente") this.pendentes = this.novosTotal;
      carregadoUmaVez = true;
      this.novosJaCarregou = true;
      desatualizado = false;
      this.renderizarNovos();
    },

    carregarMaisNovos() {
      if (!this.novosCarregando) this.carregarNovos(false);
    },
    atualizarNovos() {
      this.novosAviso = "";
      this.carregarNovos(true);
    },
    verNovos(status) {
      if (status !== "pendente" && status !== "ignorada") return;
      if (this.novosStatus === status) return;
      this.novosStatus = status;
      this.novosAviso = "";
      lista = [];
      this.renderizarNovos();
      this.carregarNovos(true);
    },
    filtroNovos(status) {
      return this.novosStatus === status ? "true" : "false";
    },
    get novosIgnoradas() {
      return this.novosStatus === "ignorada";
    },
    get novosPendentesVisao() {
      return this.novosStatus === "pendente";
    },
    get novosTemMais() {
      return this.novosCarregados < this.novosTotal;
    },
    get novosInfo() {
      const tipo = this.novosStatus === "pendente" ? "pendente" : "ignorada";
      const tipos = this.novosStatus === "pendente" ? "pendentes" : "ignoradas";
      return `Mostrando ${this.novosCarregados} de ${plural(this.novosTotal, tipo, tipos)}`;
    },
    // getters leem só estado reativo (novosCarregados espelha lista.length a cada render)
    get novosCarregandoVazio() {
      return this.novosCarregando && this.novosCarregados === 0;
    },
    get loteVisivel() {
      return this.admin && this.novosStatus === "pendente" && this.novosCarregados > 0;
    },
    get novosVazio() {
      return this.novosJaCarregou && !this.novosCarregando && !this.novosErro && this.novosCarregados === 0;
    },
    get textoVazioNovos() {
      return this.novosStatus === "pendente"
        ? "Nenhum equipamento novo esperando aprovação."
        : "Nenhuma descoberta ignorada.";
    },
    get rotuloNovidades() {
      return `${plural(this.novosNovidades, "mudança", "mudanças")} na fila desde a carga.`;
    },
    get rotuloPendentes() {
      return this.pendentes > 9999 ? "9999+" : String(this.pendentes);
    },
    get temPendentes() {
      return this.pendentes > 0;
    },
    get classesAprovacao() {
      return this.classes.filter((c) => c.slug !== "sentinela");
    },

    // ---------- render ----------
    renderizarNovos() {
      const nomes = nomesDasClasses();
      const editavel = this.admin && this.novosStatus === "pendente";
      const cartao = (d, filho) => {
        const c = cartaoDaDescoberta(d, nomes);
        const e = edicoes.get(c.id);
        const ocupado = ocupados.has(c.id);
        return {
          ...c,
          sinais: c.sinais.map((x, i) => ({ ...x, i })),
          semSinais: c.sinais.length === 0,
          classeEscolhida: e && e.classe ? e.classe : c.classe || "desconhecido",
          nomeEscolhido: e && e.nome !== undefined ? e.nome : c.nomeSugerido,
          selecionada: selecao.has(c.id),
          erro: erros.get(c.id) || "",
          ocupado,
          bloqueado: ocupado || c.fora,
          editavel,
          sondavel: c.canal === null,
          estiloPct: { "--pct": `${c.pct}%` },
          classeCartao: [filho ? "nv-filho" : "", c.fora ? "nv-fora" : "", ocupado ? "nv-ocupado" : ""]
            .filter(Boolean).join(" "),
          idTitulo: `nv-titulo-${c.id}`,
          idClasse: `nv-classe-${c.id}`,
          idNome: `nv-nome-${c.id}`,
          idAviso: `nv-aviso-${c.id}`,
          descAprovar: c.fora ? `nv-aviso-${c.id}` : null,
          rotuloSelecionar: `Selecionar ${c.titulo}`,
          rotuloAprovar: `Aprovar ${c.titulo}`,
          rotuloIgnorar: `Ignorar ${c.titulo}`,
          rotuloSondar: `Sondar ${c.titulo} (gera um pedido ARP na rede)`,
          rotuloReabrir: `Reabrir ${c.titulo}`,
        };
      };
      // uma lista plana (um único x-for e um único molde de cartão): cabeça do grupo,
      // linha que recolhe/expande os canais e os canais do gravador
      const linhas = [];
      for (const g of agruparPorGravador(lista)) {
        if (g.gravador) linhas.push({ chave: `c:${g.gravador.id}`, ehCartao: true, ehGrupo: false, classe: "", d: cartao(g.gravador, false) });
        if (!g.canais.length) continue;
        const recolhido = recolhidos.has(g.chave);
        let titulo = "Câmeras do gravador";
        if (!g.gravador) {
          const pai = g.canais.find((d) => d.pai_equipamento_id);
          const eq = pai ? store.itens.get(pai.pai_equipamento_id) : null;
          titulo = eq ? `Câmeras de ${textoSeguro(eq.nome, 80)} (já monitorado)` : "Câmeras de um gravador fora desta página";
        }
        linhas.push({
          chave: `t:${g.chave}`,
          ehCartao: false,
          ehGrupo: true,
          classe: "nv-linha-grupo",
          grupo: g.chave,
          titulo,
          rotulo: plural(g.canais.length, "câmera", "câmeras"),
          expandido: recolhido ? "false" : "true",
        });
        if (recolhido) continue;
        for (const d of g.canais) {
          linhas.push({ chave: `c:${d.id}`, ehCartao: true, ehGrupo: false, classe: "nv-linha-filho", d: cartao(d, true) });
        }
      }
      this.novosLinhas = linhas;
      this.novosCarregados = lista.length;
      this.novosAprovaveis = lista.filter((d) => !ehForaAprovavel(d)).length;
      this.novosSelecionados = selecao.size;
    },

    alternarGrupoNovos(chave) {
      if (recolhidos.has(chave)) recolhidos.delete(chave);
      else recolhidos.add(chave);
      this.renderizarNovos();
    },

    // ---------- edição por linha (eventos com data-id; nada de estado no DOM) ----------
    aoEscolherClasse(evento) {
      const id = evento.target.dataset.id;
      edicoes.set(id, { ...edicoes.get(id), classe: evento.target.value });
    },
    aoEditarNome(evento) {
      const id = evento.target.dataset.id;
      edicoes.set(id, { ...edicoes.get(id), nome: evento.target.value });
    },
    aoSelecionar(evento) {
      const id = evento.target.dataset.id;
      if (evento.target.checked) selecao.add(id);
      else selecao.delete(id);
      this.novosSelecionados = selecao.size;
    },
    aoSelecionarTodas(evento) {
      selecao.clear();
      if (evento.target.checked) {
        for (const d of lista.slice(0, MAX_LOTE)) if (!ehForaAprovavel(d)) selecao.add(d.id);
      }
      this.renderizarNovos();
    },
    get todasSelecionadas() {
      const aprovaveis = Math.min(this.novosAprovaveis, MAX_LOTE);
      return aprovaveis > 0 && this.novosSelecionados >= aprovaveis;
    },
    get semSelecao() {
      return this.novosSelecionados === 0 || this.novosOcupado;
    },
    get rotuloSelecao() {
      return `${plural(this.novosSelecionados, "selecionada", "selecionadas")}`;
    },

    // ---------- ações (admin) ----------
    async aprovarNovo(id) {
      const d = lista.find((x) => x.id === id);
      if (!this.admin || !d || ocupados.has(id)) return;
      const dados = dadosDeAprovacao(d, edicoes.get(id));
      const r = await this.acaoNovo(id, () => api.aprovarDescoberta(id, dados));
      if (!r) return;
      const posicao = this.posicaoNaTela(id);
      this.tirarDaLista(id);
      if (r.dados && typeof r.dados.id === "string") this.inserirAprovado(r.dados);
      this.novosAviso = `“${textoSeguro(r.dados && r.dados.nome, 80) || d.ip}” aprovado: já aparece na Lista.`;
      this.renderizarNovos();
      this.focarVizinho(posicao);
    },

    async ignorarNovo(id) {
      if (!this.admin) return;
      const r = await this.acaoNovo(id, () => api.ignorarDescoberta(id));
      if (!r) return;
      const posicao = this.posicaoNaTela(id);
      this.tirarDaLista(id);
      this.novosAviso = "Descoberta ignorada. Veja em “Ignoradas” para reabrir.";
      this.renderizarNovos();
      this.focarVizinho(posicao);
    },

    async reabrirNovo(id) {
      if (!this.admin) return;
      const r = await this.acaoNovo(id, () => api.reabrirDescoberta(id));
      if (!r) return;
      const posicao = this.posicaoNaTela(id);
      this.tirarDaLista(id);
      this.novosAviso = "Descoberta reaberta: voltou para os pendentes.";
      this.renderizarNovos();
      this.focarVizinho(posicao);
    },

    async sondarNovo(id) {
      if (!this.admin) return;
      const d = lista.find((x) => x.id === id);
      if (!d) return;
      const ok = await this.confirmar({
        titulo: `Sondar ${textoSeguro(d.nome_sugerido, 80) || d.ip}?`,
        texto: `${AVISO_ARP} A tentativa fica registrada na auditoria.`,
        botao: "Sondar",
      });
      if (!ok) return;
      const r = await this.acaoNovo(id, () => api.sondarDescoberta(id));
      if (!r || !r.dados) return;
      const i = lista.findIndex((x) => x.id === id);
      if (i >= 0) lista[i] = r.dados;
      this.novosAviso = "Sondagem concluída: classe e sinais atualizados.";
      this.renderizarNovos();
    },

    async declararSubredeNovo(id) {
      if (!this.admin) return;
      const r = await this.acaoNovo(id, () => api.declararSubrede(id));
      if (!r) return;
      this.novosAviso = `Sub-rede ${textoSeguro(r.dados && r.dados.cidr, 43)} declarada: já dá para aprovar.`;
      await this.carregarNovos(true);
    },

    /** Índice do cartão na tela (para devolver o foco ao vizinho quando ele sair). */
    posicaoNaTela(id) {
      const cartoes = [...document.querySelectorAll("#conteudo-novos .nv-cartao")];
      return cartoes.findIndex((c) => c.dataset.id === id);
    },
    /** Depois que um cartão sai da fila, o foco vai ao cartão que ocupou o lugar dele. */
    focarVizinho(posicao) {
      this.$nextTick(() => {
        const cartoes = document.querySelectorAll("#conteudo-novos .nv-cartao");
        const alvo = cartoes[Math.min(Math.max(posicao, 0), cartoes.length - 1)];
        const botao = alvo && alvo.querySelector(".nv-botoes .botao:not(:disabled)");
        const destino = botao || document.querySelector("#conteudo-novos .secao-titulo");
        if (destino) destino.focus();
      });
    },

    /** Roda uma ação de linha: marca ocupada, guarda a recusa na própria linha. */
    async acaoNovo(id, chamar) {
      ocupados.add(id);
      erros.delete(id);
      this.novosAviso = "";
      this.renderizarNovos();
      const r = await chamar();
      ocupados.delete(id);
      if (!r.ok) {
        if (r.status === 404) {
          this.tirarDaLista(id);
          this.novosAviso = "Essa descoberta já saiu da fila.";
        } else {
          erros.set(id, r.erro || MSG_FALHA);
        }
        this.renderizarNovos();
        return null;
      }
      return r;
    },

    async aprovarSelecionadas() {
      if (!this.admin || this.novosOcupado || selecao.size === 0) return;
      const ids = [...selecao].slice(0, MAX_LOTE);
      // linhas com classe/nome editados vão uma a uma (o lote só leva ids): nada se perde
      const { individuais, lote } = dividirLote(ids, lista, edicoes);
      this.novosOcupado = true;
      this.novosAviso = "";
      for (const id of ids) ocupados.add(id);
      this.renderizarNovos();
      const aprovadas = [];
      const recusadas = [];
      let falhaGeral = "";
      for (const { id, dados } of individuais) {
        const r = await api.aprovarDescoberta(id, dados);
        if (r.ok) {
          aprovadas.push(id);
          if (r.dados && typeof r.dados.id === "string") this.inserirAprovado(r.dados);
        } else if (r.status === 404) {
          this.tirarDaLista(id);
        } else {
          recusadas.push({ id, motivo: r.erro || MSG_FALHA });
        }
      }
      if (lote.length) {
        const r = await api.aprovarLote(lote);
        if (r.ok && r.dados) {
          if (Array.isArray(r.dados.aprovadas)) aprovadas.push(...r.dados.aprovadas.map(String));
          if (Array.isArray(r.dados.recusadas)) recusadas.push(...r.dados.recusadas);
        } else {
          falhaGeral = r.erro || MSG_FALHA;
        }
      }
      for (const id of ids) ocupados.delete(id);
      this.novosOcupado = false;
      for (const id of aprovadas) this.tirarDaLista(id);
      for (const x of recusadas) if (x && x.id) erros.set(String(x.id), textoSeguro(x.motivo, 160));
      const partes = [plural(aprovadas.length, "aprovada", "aprovadas")];
      if (recusadas.length) partes.push(`${plural(recusadas.length, "recusada", "recusadas")} (motivo na linha)`);
      this.novosAviso = falhaGeral ? `${partes.join(", ")}. ${falhaGeral}` : `${partes.join(", ")}.`;
      this.renderizarNovos();
    },

    async ignorarSelecionadas() {
      if (!this.admin || this.novosOcupado || selecao.size === 0) return;
      const ids = [...selecao];
      this.novosOcupado = true;
      this.novosAviso = "";
      let feitas = 0;
      for (const id of ids) {
        const r = await api.ignorarDescoberta(id);
        if (r.ok) {
          this.tirarDaLista(id);
          feitas += 1;
        } else if (r.status !== 404) {
          erros.set(id, r.erro || MSG_FALHA);
        }
      }
      this.novosOcupado = false;
      this.novosAviso = `${plural(feitas, "ignorada", "ignoradas")}.`;
      this.renderizarNovos();
    },
  };
}

// fora das sub-redes não entra no lote (o servidor recusaria; aprovar exige declarar antes)
function ehForaAprovavel(d) {
  return Boolean(d.fora_das_subredes) && !ehCanal(d);
}
