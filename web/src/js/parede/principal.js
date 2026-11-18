// Telão /parede (JS puro, sem Alpine; empacotado em ES2017 para TVs).
//
// Fluxo: abre o /ws/parede. Snapshot → telão (Teia reduzida, ou Organograma sem WebGL, com
// a Teia lenta ou se ela não carregar). 4401 (sem token, revogado) → pede um código
// (POST /api/v1/parede/pedido), mostra-o e consulta o próprio pedido a cada 5 s; aprovado, o
// cookie do token chega na resposta e o WS é aberto de novo. O código é renovado sozinho ao
// vencer. Sem nenhuma mensagem do servidor por mais de 60 s: "Sem conexão com o servidor".
//
// O telão só recebe nome, classe, estado e pai de cada equipamento (o servidor já filtra) e
// todo texto vindo da rede entra no DOM por textContent. Nada clicável, nada focável.
import { aplicarEquipamento, aplicarEstado, aplicarSnapshot, criarStore, ESTADOS, grupoDe } from "../lista.js";
import { montarOrganograma } from "../organograma.js";
import { webglDisponivel } from "../visoes.js";
import { criarConexao } from "../ws.js";
import { proximoPasso, validadeDoCodigoMs } from "./emparelhar.js";
import {
  contadoresDaParede, estadoDaConexao, faixaDeAlertas, horaNoFuso, textoDosRestantes,
} from "./estado.js";
import { criarMedidorFps, criarVigiaDaCena } from "./fps.js";

const API = "/api/v1/parede";
const BUNDLE_TEIA = "/parede/teia-parede.bundle.js";
const ESPERA_TEIA_MS = 15000;
const INTERVALO_ORG_MS = 1000; // no máximo 1 render do Organograma por segundo
const TIQUE_MS = 1000; // relógio e checagem de conexão
const CONSULTA_PADRAO_S = 5;
const ANTECEDENCIA_RENOVAR_MS = 5000;
const RECUO_PEDIDO_MS = [5000, 10000, 20000, 30000];
const ESPERA_RECUSADO_MS = 60000;
const ROLAGEM_PX_S = 24; // Organograma: rolagem automática lenta
const PAUSA_ROLAGEM_MS = 4000;
const VIGIA_MS = 1000; // de quanto em quanto a vigia olha a câmera da cena
const SVG = "http://www.w3.org/2000/svg";

const ROTULOS_CONTADOR = {
  online: ["online", "online"],
  instavel: ["instável", "instáveis"],
  offline: ["offline", "offline"],
  inalcancavel: ["inalcançável", "inalcançáveis"],
};

function icone(doc, id) {
  const svg = doc.createElementNS(SVG, "svg");
  svg.setAttribute("class", "icone-status");
  svg.setAttribute("aria-hidden", "true");
  svg.setAttribute("focusable", "false");
  const uso = doc.createElementNS(SVG, "use");
  uso.setAttribute("href", `#${id}`);
  svg.appendChild(uso);
  return svg;
}

/** Troca os filhos (sem replaceChildren: Chromium 63 das TVs Tizen 5 não tem). */
function trocarFilhos(pai, novo) {
  while (pai.firstChild) pai.removeChild(pai.firstChild);
  if (novo) pai.appendChild(novo);
}

function elemento(doc, tag, classe, texto) {
  const el = doc.createElement(tag);
  if (classe) el.className = classe;
  if (texto !== undefined) el.textContent = texto;
  return el;
}

async function pedir(metodo, caminho) {
  try {
    const r = await fetch(API + caminho, {
      method: metodo,
      headers: { Accept: "application/json" },
      credentials: "same-origin",
      cache: "no-store",
    });
    let dados = null;
    try {
      dados = await r.json();
    } catch {
      dados = null;
    }
    const espera = Number.parseInt(r.headers.get("Retry-After") || "0", 10) || 0;
    return { status: r.status, dados, espera };
  } catch {
    return { status: 0, dados: null, espera: 0 }; // rede fora
  }
}

export function iniciarParede(doc = document) {
  const $ = (id) => doc.getElementById(id);
  const corpo = doc.body;
  const el = {
    carregando: $("pr-carregando"),
    codigo: $("pr-codigo"),
    codigoValor: $("pr-codigo-valor"),
    codigoStatus: $("pr-codigo-status"),
    telao: $("pr-telao"),
    nome: $("pr-nome"),
    relogio: $("pr-relogio"),
    palco: $("pr-palco"),
    teia: $("pr-teia"),
    org: $("pr-org"),
    alertas: $("pr-alertas"),
    semAlertas: $("pr-sem-alertas"),
    semConexao: $("pr-sem-conexao"),
  };
  const contas = {};
  for (const grupo of Object.keys(ROTULOS_CONTADOR)) {
    contas[grupo] = { n: $(`pr-n-${grupo}`), rotulo: $(`pr-r-${grupo}`) };
  }

  const store = criarStore();
  const alertas = new Map();
  let fuso = "";
  let modo = "carregando";
  let contato = Date.now();
  let conexao = null;
  let timerPedido = 0;
  let timerRenovar = 0;
  let tentativasPedido = 0;
  let geracao = 0; // pedidos de código antigos não mexem na tela depois de um novo
  // visual do telão
  let visao = ""; // "teia" | "organograma"
  let teiaNegada = false;
  let controle = null;
  let medidor = null;
  let rafFps = 0;
  let vigia = null;
  let timerVigia = 0;
  let recusadoAgora = false; // 4403: a tela já explica; "sem conexão" por cima seria falso
  let ultimoOrg = 0;
  let timerOrg = 0;
  let rafRolagem = 0;

  if (doc.location.protocol === "http:") corpo.classList.add("pr-sem-cifra");

  function mostrar(novo) {
    modo = novo;
    corpo.dataset.modo = novo;
    el.carregando.hidden = novo !== "carregando";
    el.codigo.hidden = novo !== "codigo";
    el.telao.hidden = novo !== "telao";
    doc.title = novo === "telao" ? "Sentinela · Telão" : "Sentinela · Emparelhar telão";
  }

  // ---------- conexão ao vivo ----------
  function conectar() {
    if (conexao) conexao.parar();
    recusadoAgora = false;
    contato = Date.now(); // a contagem dos 60 s recomeça a cada tentativa nova
    conexao = criarConexao(
      {
        aoMensagem: receber,
        aoMudarEstado: (estado) => {
          if (estado === "recusado") recusado();
        },
        aoExpirar: () => {
          conexao = null;
          emparelhar();
        },
      },
      "/ws/parede",
    );
    conexao.iniciar();
  }

  /** 4403: origem diferente ou telão sem HTTPS desligado. Tenta de novo daqui a 1 min. */
  function recusado() {
    conexao = null;
    recusadoAgora = true;
    pararTelao();
    mostrar("codigo");
    mostrarCodigo("");
    el.codigoStatus.textContent =
      "O servidor recusou este telão (endereço diferente do oficial ou telão sem HTTPS desligado). Nova tentativa em 1 minuto.";
    window.setTimeout(conectar, ESPERA_RECUSADO_MS);
  }

  function receber(msg) {
    contato = Date.now();
    atualizarConexao();
    if (msg.tipo === "snapshot") {
      entrarNoTelao(msg);
      return;
    }
    if (modo !== "telao") return;
    if (msg.tipo === "estado") {
      if (!aplicarEstado(store, msg)) return;
      if (controle) controle.atualizarEstado(msg.id);
      renderizarEquipamentos();
    } else if (msg.tipo === "equipamento") {
      if (!aplicarEquipamento(store, msg)) return;
      if (controle) controle.sincronizar(store);
      renderizarEquipamentos();
    } else if (msg.tipo === "alerta") {
      if (msg.acao === "fechado" || msg.acao === "removido") alertas.delete(msg.id);
      else if (msg.alerta && msg.alerta.id !== undefined) alertas.set(msg.alerta.id, msg.alerta);
      renderizarFaixa();
    }
  }

  // ---------- emparelhamento ----------
  function mostrarCodigo(codigo) {
    el.codigoValor.textContent = codigo;
    el.codigoValor.hidden = !codigo; // sem código: só a mensagem de situação
  }

  function limparPedido() {
    window.clearTimeout(timerPedido);
    window.clearTimeout(timerRenovar);
    timerPedido = 0;
    timerRenovar = 0;
  }

  async function emparelhar() {
    limparPedido();
    pararTelao();
    mostrar("codigo");
    const minha = ++geracao;
    mostrarCodigo(""); // o código anterior já não vale (um novo é pedido agora)
    el.codigoStatus.textContent = "Pedindo um código ao servidor…";
    const r = await pedir("POST", "/pedido");
    if (minha !== geracao) return;
    if (r.status !== 0) contato = Date.now();
    if (r.status === 201 && r.dados && typeof r.dados.codigo === "string") {
      tentativasPedido = 0;
      mostrarCodigo(r.dados.codigo);
      el.codigoStatus.textContent = "Aguardando a aprovação no painel…";
      const consulta = (Number(r.dados.consulta_s) || CONSULTA_PADRAO_S) * 1000;
      timerPedido = window.setTimeout(() => consultar(minha, consulta), consulta);
      const validade = validadeDoCodigoMs(r.dados.expira_em, Date.now());
      timerRenovar = window.setTimeout(
        () => emparelhar(),
        Math.max(consulta, validade - ANTECEDENCIA_RENOVAR_MS),
      );
      return;
    }
    let espera = RECUO_PEDIDO_MS[Math.min(tentativasPedido, RECUO_PEDIDO_MS.length - 1)];
    tentativasPedido += 1;
    if (r.status === 429) {
      espera = Math.max(1, r.espera) * 1000;
      el.codigoStatus.textContent = "Muitos pedidos seguidos; um código novo sai em instantes.";
    } else if (r.status === 404) {
      el.codigoStatus.textContent = "O telão sem HTTPS está desligado no servidor. Nova tentativa em instantes.";
    } else {
      el.codigoStatus.textContent = "Sem resposta do servidor. Nova tentativa em instantes.";
    }
    timerPedido = window.setTimeout(() => emparelhar(), espera);
  }

  async function consultar(minha, intervalo) {
    const r = await pedir("GET", "/pedido");
    if (minha !== geracao) return;
    if (r.status !== 0) contato = Date.now();
    atualizarConexao();
    const passo = proximoPasso(r.status);
    if (passo === "entrar") {
      limparPedido();
      geracao += 1;
      el.codigoStatus.textContent = "Aprovado. Entrando…";
      conectar();
    } else if (passo === "novo_codigo") {
      emparelhar();
    } else {
      timerPedido = window.setTimeout(() => consultar(minha, intervalo), intervalo);
    }
  }

  // ---------- telão ----------
  function entrarNoTelao(msg) {
    limparPedido();
    geracao += 1;
    aplicarSnapshot(store, msg);
    alertas.clear();
    for (const a of msg.alertas || []) alertas.set(a.id, a);
    fuso = typeof msg.fuso === "string" ? msg.fuso : "";
    el.nome.textContent = typeof msg.nome === "string" ? msg.nome : "";
    const primeiraVez = modo !== "telao";
    mostrar("telao");
    if (primeiraVez) escolherVisao();
    else if (controle) controle.sincronizar(store);
    renderizarEquipamentos(true);
    renderizarFaixa();
    tique();
  }

  function pararTelao() {
    pararTeia();
    pararOrganograma();
    visao = "";
  }

  function escolherVisao() {
    if (teiaNegada || !webglDisponivel(doc)) {
      usarOrganograma();
      return;
    }
    visao = "teia";
    corpo.dataset.visao = "teia";
    el.teia.hidden = false;
    el.org.hidden = true;
    carregarTeia().then(montar, () => usarOrganograma());
  }

  function carregarTeia() {
    if (window.SentinelaTeiaParede) return Promise.resolve(window.SentinelaTeiaParede);
    return new Promise((resolver, rejeitar) => {
      const script = doc.createElement("script");
      script.type = "module";
      script.src = BUNDLE_TEIA;
      const limite = window.setTimeout(() => rejeitar(new Error("tempo")), ESPERA_TEIA_MS);
      script.onload = () => {
        window.clearTimeout(limite);
        if (window.SentinelaTeiaParede) resolver(window.SentinelaTeiaParede);
        else rejeitar(new Error("bundle sem a Teia"));
      };
      script.onerror = () => {
        window.clearTimeout(limite);
        rejeitar(new Error("falha ao carregar a Teia"));
      };
      doc.head.appendChild(script);
    });
  }

  function montar(modulo) {
    if (visao !== "teia" || modo !== "telao") return;
    try {
      controle = modulo.montarTeia(el.teia, {
        estilo: "a",
        particulas: false,
        interativo: false,
        caberNaTela: true, // câmera recua até a Teia (com rótulos) caber no palco, em qualquer tela
        movimentoReduzido: false, // rotação lenta mesmo assim: é o telão
      });
      controle.sincronizar(store);
    } catch {
      usarOrganograma();
      return;
    }
    medidor = criarMedidorFps();
    const quadro = (ts) => {
      rafFps = 0;
      if (!medidor) return;
      medidor.quadro(ts);
      if (medidor.deveTrocar()) {
        usarOrganograma(); // TV lenta: Organograma até a página ser recarregada
        return;
      }
      rafFps = window.requestAnimationFrame(quadro);
    };
    rafFps = window.requestAnimationFrame(quadro);
    // exceção dentro do laço do three não chega aqui: a vigia percebe a câmera parada
    vigia = criarVigiaDaCena();
    timerVigia = window.setInterval(() => {
      if (visao !== "teia" || !vigia) return;
      if (doc.hidden) {
        vigia.reiniciar();
        return;
      }
      if (vigia.amostra(el.teia.dataset.camera, el.teia.dataset.girando === "sim", Date.now())) {
        usarOrganograma();
      }
    }, VIGIA_MS);
  }

  /** Erro solto (ex.: no laço de desenho do three) com a Teia na tela: Organograma. */
  function aoErroNaTeia() {
    if (visao === "teia") usarOrganograma();
  }

  function pararTeia() {
    window.cancelAnimationFrame(rafFps);
    rafFps = 0;
    medidor = null;
    window.clearInterval(timerVigia);
    timerVigia = 0;
    vigia = null;
    if (controle) {
      try {
        controle.destruir();
      } catch {
        /* cena já quebrada: só some */
      }
      controle = null;
    }
    el.teia.hidden = true;
  }

  function usarOrganograma() {
    if (visao === "teia") teiaNegada = true;
    pararTeia();
    visao = "organograma";
    corpo.dataset.visao = "organograma";
    el.org.hidden = false;
    renderizarOrganograma(true);
    iniciarRolagem();
  }

  function pararOrganograma() {
    window.clearTimeout(timerOrg);
    timerOrg = 0;
    window.cancelAnimationFrame(rafRolagem);
    rafRolagem = 0;
    el.org.hidden = true;
    trocarFilhos(el.org, null);
    delete corpo.dataset.visao;
  }

  function renderizarEquipamentos(imediato = false) {
    const c = contadoresDaParede(store.itens.values());
    for (const grupo of Object.keys(contas)) {
      const n = c[grupo];
      const [um, varios] = ROTULOS_CONTADOR[grupo];
      contas[grupo].n.textContent = String(n);
      contas[grupo].rotulo.textContent = n === 1 ? um : varios;
    }
    if (visao === "organograma") renderizarOrganograma(imediato);
  }

  function renderizarOrganograma(imediato = false) {
    const agora = Date.now();
    if (!imediato && agora - ultimoOrg < INTERVALO_ORG_MS) {
      if (!timerOrg) {
        timerOrg = window.setTimeout(() => {
          timerOrg = 0;
          renderizarOrganograma(true);
        }, INTERVALO_ORG_MS - (agora - ultimoOrg));
      }
      return;
    }
    ultimoOrg = agora;
    const cartoes = montarOrganograma(store, { classe: "", estado: "", busca: "" });
    const frag = doc.createDocumentFragment();
    for (const c of cartoes) frag.appendChild(cartaoDaClasse(c));
    if (!cartoes.length) frag.appendChild(elemento(doc, "p", "pr-org-vazio", "Nenhum equipamento cadastrado."));
    trocarFilhos(el.org, frag);
  }

  function cartaoDaClasse(c) {
    const secao = elemento(doc, "section", "pr-org-classe");
    secao.style.setProperty("--cor-classe", c.cor);
    const cabeca = elemento(doc, "div", "pr-org-cabeca");
    const titulo = elemento(doc, "h2", "pr-org-titulo");
    titulo.appendChild(elemento(doc, "span", "pr-pino"));
    titulo.appendChild(elemento(doc, "span", "", c.nome));
    cabeca.appendChild(titulo);
    const resumo = elemento(doc, "p", "pr-org-resumo");
    resumo.appendChild(elemento(doc, "span", "pr-org-total", `${c.total} ${c.total === 1 ? "equipamento" : "equipamentos"}`));
    for (const grupo of ["offline", "inalcancavel", "instavel"]) {
      const n = c.contagem[grupo];
      if (!n) continue;
      const [um, varios] = ROTULOS_CONTADOR[grupo];
      const conta = elemento(doc, "span", `pr-org-conta st-${grupo}`);
      conta.appendChild(icone(doc, ESTADOS[grupo].icone));
      conta.appendChild(elemento(doc, "span", "", `${n} ${n === 1 ? um : varios}`));
      resumo.appendChild(conta);
    }
    cabeca.appendChild(resumo);
    secao.appendChild(cabeca);
    const lista = elemento(doc, "ul", "pr-org-itens");
    for (const it of c.itens) {
      const chave = ESTADOS[it.estado] ? it.estado : "desconhecido";
      const grupo = grupoDe(it.estado);
      const li = elemento(doc, "li", `pr-org-item st-${chave === "suspeito" ? "online" : chave}`);
      li.appendChild(icone(doc, ESTADOS[chave].icone));
      const texto = elemento(doc, "span", "pr-org-texto");
      texto.appendChild(elemento(doc, "span", "pr-org-nome", it.nome));
      if (grupo !== "online") {
        let rotulo = ESTADOS[chave].rotulo;
        const pai = it.pai_id ? store.itens.get(it.pai_id) : null;
        if (chave === "inalcancavel" && pai) rotulo += ` · depende de ${pai.nome}`;
        texto.appendChild(elemento(doc, "span", "pr-org-estado", rotulo));
      }
      li.appendChild(texto);
      lista.appendChild(li);
    }
    secao.appendChild(lista);
    return secao;
  }

  /** Rolagem automática lenta do Organograma: desce, pausa no fim, volta ao topo, pausa. */
  function iniciarRolagem() {
    window.cancelAnimationFrame(rafRolagem);
    const reduzido = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let posicao = 0;
    let anterior = 0;
    let pausaAte = 0;
    let ultimoSalto = 0;
    const passo = (ts) => {
      rafRolagem = window.requestAnimationFrame(passo);
      const max = el.org.scrollHeight - el.org.clientHeight;
      if (max <= 0) {
        el.org.scrollTop = 0;
        posicao = 0;
        anterior = ts;
        return;
      }
      if (ts < pausaAte) {
        anterior = ts;
        return;
      }
      if (reduzido) {
        // sem movimento contínuo: uma tela por vez a cada 10 s
        if (ts - ultimoSalto < 10000) return;
        ultimoSalto = ts;
        posicao = posicao >= max ? 0 : Math.min(max, posicao + el.org.clientHeight * 0.9);
      } else {
        const dt = anterior ? Math.min(100, ts - anterior) : 0;
        anterior = ts;
        posicao += (ROLAGEM_PX_S * dt) / 1000;
        if (posicao >= max) {
          posicao = max;
          pausaAte = ts + PAUSA_ROLAGEM_MS;
          el.org.scrollTop = posicao;
          posicao = -1; // volta ao topo depois da pausa
          return;
        }
        if (posicao < 0) {
          posicao = 0;
          pausaAte = ts + PAUSA_ROLAGEM_MS;
        }
      }
      el.org.scrollTop = Math.max(0, posicao);
    };
    rafRolagem = window.requestAnimationFrame(passo);
  }

  function renderizarFaixa() {
    const { visiveis, restantes } = faixaDeAlertas([...alertas.values()]);
    const frag = doc.createDocumentFragment();
    for (const a of visiveis) {
      const li = elemento(doc, "li", `pr-alerta pr-al-${a.tipo === "instavel" ? "instavel" : "queda"}`);
      li.appendChild(icone(doc, a.tipo === "instavel" ? "i-instavel" : "i-offline"));
      const corpoAlerta = elemento(doc, "span", "pr-al-corpo");
      corpoAlerta.appendChild(elemento(doc, "span", "pr-al-texto", String(a.texto || "")));
      const quando = new Date(a.aberto_em);
      if (!Number.isNaN(quando.getTime())) {
        corpoAlerta.appendChild(doc.createTextNode(" "));
        corpoAlerta.appendChild(elemento(doc, "span", "pr-al-hora", `desde ${horaNoFuso(quando, fuso)}`));
      }
      li.appendChild(corpoAlerta);
      frag.appendChild(li);
    }
    if (restantes) frag.appendChild(elemento(doc, "li", "pr-alerta pr-al-mais", textoDosRestantes(restantes)));
    trocarFilhos(el.alertas, frag);
    el.semAlertas.hidden = visiveis.length > 0;
  }

  // ---------- relógio e "sem conexão" ----------
  function atualizarConexao() {
    const sem = !recusadoAgora && estadoDaConexao(contato, Date.now()) === "sem_conexao";
    el.semConexao.hidden = !sem;
    corpo.classList.toggle("pr-desconectado", sem);
  }

  function tique() {
    el.relogio.textContent = horaNoFuso(new Date(), fuso);
    atualizarConexao();
  }

  window.addEventListener("error", aoErroNaTeia);
  window.addEventListener("unhandledrejection", aoErroNaTeia);
  doc.addEventListener("visibilitychange", () => {
    if (medidor) medidor.reiniciar(); // aba oculta não desenha: não é lentidão
    if (vigia) vigia.reiniciar();
  });
  mostrar("carregando");
  window.setInterval(tique, TIQUE_MS);
  conectar();
}
