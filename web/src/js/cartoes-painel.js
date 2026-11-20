// Cartões de alerta do painel (qualquer aba): estado e métodos misturados ao componente
// "painel" (mesmo `this`). A pilha, a montagem dos dados e as transições são funções puras de
// cartoes.js; aqui ficam a busca do que o store não tem (MAC, fabricante e afetados), os
// temporizadores, o som e as ações (Ver na Teia, Ver alerta, Reconhecer, Silenciar…).
import { horaNoFuso } from "./alertas.js";
import { api } from "./api.js";
import {
  aplicarNaPilha, dadosDoCartao, dispensarDaPilha, expirarDaPilha, listaDeAfetados, MAX_NO_PAINEL,
  pilhaVazia, renovarNaPilha, textoDoMais, TIPOS_DO_PAINEL, visiveisDaPilha,
} from "./cartoes.js";

const CHAVE_SOM = "sentinela-som-alertas";
const MSG_RECONHECER = "Não foi possível reconhecer. Tente de novo.";

function lerSom() {
  try {
    return window.localStorage.getItem(CHAVE_SOM) === "1";
  } catch {
    return false;
  }
}

function gravarSom(ligado) {
  try {
    window.localStorage.setItem(CHAVE_SOM, ligado ? "1" : "0");
  } catch {
    /* sem armazenamento: vale só nesta aba */
  }
}

export function cartoesDoPainel(store) {
  let pilha = pilhaVazia();
  const extras = new Map(); // id do alerta -> {mac, fabricante, afetados, ...}
  let expirar = 0;
  let snapshots = 0;
  const retidos = new Map(); // id do cartão -> fontes que o seguram ("mouse", "foco")
  let audio = null;
  let interagiu = false; // WebAudio só depois de um gesto do usuário

  function extrasDe(id) {
    let e = extras.get(id);
    if (!e) {
      e = {
        mac: "", fabricante: "", afetados: [], totalBuscado: -1, carregando: false, erro: "",
        expandido: false, buscouEquipamento: false, buscandoEquipamento: false, ultimaTentativa: 0, erroAcao: "",
      };
      extras.set(id, e);
    }
    return e;
  }

  const noPilha = (id) => pilha.cartoes.some((c) => c.id === id);

  function bip() {
    try {
      const Contexto = window.AudioContext || window.webkitAudioContext;
      if (!Contexto) return;
      if (!audio) audio = new Contexto();
      if (audio.state === "suspended") audio.resume();
      const t = audio.currentTime;
      const osc = audio.createOscillator();
      const ganho = audio.createGain();
      osc.type = "sine";
      osc.frequency.value = 880;
      ganho.gain.setValueAtTime(0.0001, t);
      ganho.gain.exponentialRampToValueAtTime(0.12, t + 0.02);
      ganho.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
      osc.connect(ganho);
      ganho.connect(audio.destination);
      osc.start(t);
      osc.stop(t + 0.24);
    } catch {
      /* sem áudio: o cartão aparece do mesmo jeito */
    }
  }

  return {
    cartoes: [],
    cartoesMais: 0,
    somAlertas: lerSom(),

    iniciarCartoes() {
      const marcar = () => {
        interagiu = true;
        document.removeEventListener("pointerdown", marcar, true);
        document.removeEventListener("keydown", marcar, true);
      };
      document.addEventListener("pointerdown", marcar, true);
      document.addEventListener("keydown", marcar, true);
    },

    /** Reconexão (do 2º snapshot em diante): o que passou fora vem do servidor e o que estava
     * na tela é velho; recomeça sem cartões, como o telão. */
    cartoesAoSnapshot() {
      if (snapshots++ > 0) this.reiniciarCartoes();
    },
    reiniciarCartoes() {
      pilha = pilhaVazia();
      extras.clear();
      retidos.clear();
      this.renderizarCartoes();
    },

    // ---------- mensagens ao vivo ----------
    cartoesAoMensagem(msg) {
      const antes = pilha;
      pilha = aplicarNaPilha(pilha, msg, Date.now(), TIPOS_DO_PAINEL);
      if (pilha === antes) return;
      const novo = msg.acao === "aberto" && pilha.cartoes.length > antes.cartoes.length;
      this.renderizarCartoes();
      if (novo && this.somAlertas && interagiu) bip();
    },

    renderizarCartoes() {
      window.clearTimeout(expirar);
      const agora = Date.now();
      pilha = expirarDaPilha(pilha, agora, new Set(retidos.keys()));
      const { visiveis, mais } = visiveisDaPilha(pilha, MAX_NO_PAINEL);
      this.cartoes = visiveis.map((entrada, i) => {
        const e = extrasDe(entrada.id);
        this.buscarExtrasDoCartao(entrada);
        const c = dadosDoCartao(entrada, store, {
          agora,
          hora: (iso) => horaNoFuso(iso, agora, this.fuso),
          reduzido: false,
          extras: { ...e, afetados: listaDeAfetados(e.afetados, store) },
        });
        // o mais novo abre inteiro; os outros ficam recolhidos (IP, causa e quando) até o clique
        const aberto = e.aberto === undefined ? i === 0 : e.aberto;
        const linhas = aberto ? c.linhas : c.linhas.filter((l) => l.principal);
        if (!aberto && c.afetados) {
          linhas.push({ rotulo: "Afetados", valor: c.rotuloAfetados, classe: "", principal: true });
        }
        return {
          ...c,
          linhas,
          aberto,
          ariaAberto: aberto ? "true" : "false",
          rotuloAlternar: `${aberto ? "Recolher" : "Mostrar tudo de"} ${c.titulo}`,
          erroAcao: e.erroAcao,
        };
      });
      this.cartoesMais = mais;
      for (const id of [...extras.keys()]) {
        if (!pilha.cartoes.some((c) => c.id === id)) extras.delete(id);
      }
      const prazos = pilha.cartoes.filter((c) => c.fechado && !retidos.has(c.id)).map((c) => c.expiraEm);
      if (prazos.length) {
        expirar = window.setTimeout(() => this.renderizarCartoes(), Math.max(200, Math.min(...prazos) - agora));
      }
    },

    /** MAC e fabricante (GET do equipamento) e lista de afetados (GET do alerta): sem repetir. */
    buscarExtrasDoCartao(entrada) {
      this.buscarEquipamentoDoCartao(entrada);
      this.buscarAfetadosDoCartao(entrada);
    },
    async buscarEquipamentoDoCartao(entrada) {
      const e = extrasDe(entrada.id);
      if (!entrada.alerta.equipamento_id || e.buscouEquipamento || e.buscandoEquipamento) return;
      if (Date.now() - e.ultimaTentativa < 10000) return; // falhou há pouco: sem rajada de pedidos
      e.ultimaTentativa = Date.now();
      e.buscandoEquipamento = true;
      const r = await api.verEquipamento(entrada.alerta.equipamento_id);
      e.buscandoEquipamento = false;
      if (!r.ok || !r.dados || !noPilha(entrada.id)) return; // falhou: o próximo render tenta de novo
      e.buscouEquipamento = true;
      e.mac = typeof r.dados.mac === "string" ? r.dados.mac : "";
      e.fabricante = typeof r.dados.fabricante === "string" ? r.dados.fabricante : "";
      this.renderizarCartoes();
    },
    async buscarAfetadosDoCartao(entrada) {
      const e = extrasDe(entrada.id);
      const total = Number.isInteger(entrada.alerta.afetados_total) ? entrada.alerta.afetados_total : 0;
      if (total <= 0 || e.totalBuscado === total || e.carregando) return;
      e.carregando = true;
      e.erro = "";
      const r = await api.verAlerta(entrada.id);
      e.carregando = false;
      if (!noPilha(entrada.id)) return; // cartão fechado enquanto a resposta vinha: descarta
      e.totalBuscado = total; // com falha também: o próximo "atualizado" tenta de novo
      if (r.ok && r.dados && Array.isArray(r.dados.afetados)) e.afetados = r.dados.afetados;
      else e.erro = "Não foi possível carregar os afetados.";
      this.renderizarCartoes();
    },

    // ---------- ações ----------
    dispensarCartao(id, devolverFoco = true) {
      // o foco estava no cartão que sai: vai ao próximo cartão (ou ao conteúdo) em vez de se perder
      const ordem = this.cartoes.map((c) => c.id);
      const i = ordem.indexOf(id);
      const proximo = i >= 0 ? (i + 1 < ordem.length ? ordem[i + 1] : i > 0 ? ordem[i - 1] : null) : null;
      const atual = document.querySelector(`#cartoes-alerta article[data-id="${id}"]`);
      const tinhaFoco = Boolean(atual && document.activeElement && atual.contains(document.activeElement));
      retidos.delete(id);
      pilha = dispensarDaPilha(pilha, id);
      this.renderizarCartoes();
      if (!tinhaFoco || !devolverFoco) return;
      window.setTimeout(() => {
        const alvo = (proximo !== null && document.querySelector(`#cartoes-alerta article[data-id="${proximo}"]`))
          || document.getElementById("conteudo");
        if (alvo) alvo.focus();
      }, 0);
    },
    /** Foco ou mouse em cima do cartão: o "voltou" espera (fonte: "mouse" ou "foco"). */
    reterCartao(id, fonte = "mouse") {
      const fontes = retidos.get(id) || new Set();
      fontes.add(fonte);
      retidos.set(id, fontes);
    },
    soltarCartao(id, fonte = "mouse") {
      const fontes = retidos.get(id);
      if (!fontes) return;
      fontes.delete(fonte);
      if (fontes.size) return;
      retidos.delete(id);
      pilha = renovarNaPilha(pilha, id, Date.now());
      this.renderizarCartoes();
    },
    alternarDadosDoCartao(id) {
      const atual = this.cartoes.find((c) => c.id === id);
      extrasDe(id).aberto = atual ? !atual.aberto : true;
      this.renderizarCartoes();
    },
    alternarAfetadosDoCartao(id) {
      const e = extrasDe(id);
      e.expandido = !e.expandido;
      this.renderizarCartoes();
    },
    verTodosOsAlertas() {
      this.irPara("alertas");
    },
    verAlertaDoCartao(id) {
      this.dispensarCartao(id);
      this.irPara("alertas");
    },
    /** Aparelho novo: fecha o aviso e leva à fila de Novos, já no cartão desse aparelho. */
    verEmNovosDoCartao(id) {
      const c = pilha.cartoes.find((x) => x.id === id);
      const descoberta = c && c.alerta.descoberta_id;
      if (typeof descoberta !== "string" || !descoberta) return;
      this.dispensarCartao(id, false); // o foco vai ao cartão em Novos, não a #conteudo
      this.verDescobertaEmNovos(descoberta);
    },
    /** Abre a ficha do equipamento: na Teia, ou no Organograma se o navegador não tem 3D. */
    verNaTeiaDoCartao(id) {
      const c = pilha.cartoes.find((x) => x.id === id);
      const eq = c && c.alerta.equipamento_id;
      if (!eq || !store.itens.has(eq)) return;
      if (window.location.hash !== "#teia") window.location.hash = "teia";
      this.aplicarRota(); // o hash já mudou: a aba troca agora (o hashchange repete, sem efeito)
      if (this.aba === "teia") this.abrirEquipamento(eq);
      else if (this.aba === "organograma") this.abrirNoOrganograma(eq);
    },
    async reconhecerDoCartao(id) {
      if (!this.admin) return;
      const e = extrasDe(id);
      e.erroAcao = "";
      const r = await api.reconhecerAlerta(id);
      if (!r.ok) {
        e.erroAcao = MSG_RECONHECER;
        this.renderizarCartoes();
        return;
      }
      const m = { tipo: "alerta", acao: "atualizado", id, alerta: r.dados };
      pilha = aplicarNaPilha(pilha, m, Date.now(), TIPOS_DO_PAINEL);
      this.alertasAoMensagem(m); // a aba Alertas, se já carregada
      this.renderizarCartoes();
    },
    silenciarDoCartao(id) {
      const c = pilha.cartoes.find((x) => x.id === id);
      const eq = c && c.alerta.equipamento_id;
      if (!eq) return;
      const item = store.itens.get(eq);
      this.abrirSilencio({ equipamentoId: eq, nome: item ? item.nome : c.alerta.equipamento_nome || "Equipamento" });
    },

    // ---------- som ----------
    aoMudarSom() {
      gravarSom(this.somAlertas);
      if (this.somAlertas) bip(); // o clique já é o gesto do usuário: confirma com um bip
    },

    get temCartoes() {
      return this.cartoes.length > 0;
    },
    get temMaisCartoes() {
      return this.cartoesMais > 0;
    },
    get rotuloMaisCartoes() {
      return textoDoMais(this.cartoesMais);
    },
  };
}
