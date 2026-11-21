// Pedaço do componente "painel" da aba Diagnóstico. Só o estado e o pedido ficam aqui; as
// regras (diagnostico.js) carregam por import() na primeira visita à aba, fora da 1ª tela.
import { api } from "./api.js";

const PERIODOS = ["24h", "7d", "30d"];
const ROTULOS = { "24h": "24 horas", "7d": "7 dias", "30d": "30 dias" };
const TITULOS_LAUDO = {
  "24h": "Laudo de quedas: últimas 24 horas",
  "7d": "Laudo de quedas: últimos 7 dias",
  "30d": "Laudo de quedas: últimos 30 dias",
};
const FRESCO_MS = 60000; // cache por período: alternar 24 h/7 d/30 d não refaz o pedido
const POR_LOTE = 20;
const MSG_FALHA = "Não foi possível carregar o diagnóstico. Tente de novo.";
const MSG_CSV = "Não foi possível baixar o CSV. Tente de novo.";
const FUSO_PADRAO = "America/Sao_Paulo";
const MIN_MS = 60000;
const HORA_MS = 60 * MIN_MS;
const DIA_MS = 24 * HORA_MS;

/** Idade de uma visão guardada, para o aviso "números buscados há ..." (nunca "há pouco" vago). */
export function idadeDaVisao(ms) {
  if (!(ms >= MIN_MS)) return "há menos de 1 minuto";
  if (ms < HORA_MS) {
    const n = Math.floor(ms / MIN_MS);
    return `há ${n} ${n === 1 ? "minuto" : "minutos"}`;
  }
  if (ms < DIA_MS) return `há ${Math.floor(ms / HORA_MS)} h`;
  const n = Math.floor(ms / DIA_MS);
  return `há ${n} ${n === 1 ? "dia" : "dias"}`;
}

export function diagnosticoDoPainel() {
  let pedido = 0; // descarta resposta de um período anterior
  let modulo = null;
  const cache = new Map(); // período -> {visao, em}
  let mostrado = ""; // período da visão que está na tela
  let falhou = ""; // período que o último pedido não conseguiu trazer
  let ouvindoImpressao = false;

  return {
    dgPeriodo: "24h",
    dgPeriodos: PERIODOS.map((valor) => ({ valor, rotulo: ROTULOS[valor] })),
    dgCarregando: false,
    dgErro: "",
    dgErroCsv: "",
    dgBaixando: false,
    dgVisao: null,
    dgLimite: POR_LOTE,

    entrarEmDiagnostico() {
      if (!ouvindoImpressao) {
        ouvindoImpressao = true;
        // Ctrl+P direto: o laudo leva todos os incidentes, não só os já mostrados
        window.addEventListener("beforeprint", () => {
          if (this.aba === "diagnostico") this.dgLimite = Infinity;
        });
        window.addEventListener("afterprint", () => {
          this.dgLimite = POR_LOTE;
        });
      }
      this.carregarDiagnostico();
    },

    /** Mostra o período escolhido: do cache (até 60 s) ou do servidor; `forcar` ignora o cache. */
    async carregarDiagnostico(forcar = false) {
      const meu = ++pedido;
      const periodo = this.dgPeriodo;
      const guardado = cache.get(periodo);
      this.dgErroCsv = "";
      if (!forcar && guardado && Date.now() - guardado.em < FRESCO_MS) {
        this.dgCarregando = false;
        this.dgErro = "";
        falhou = "";
        mostrado = periodo;
        this.dgLimite = POR_LOTE;
        this.dgVisao = guardado.visao;
        return;
      }
      this.dgCarregando = true;
      this.dgErro = "";
      const r = await api.verDiagnostico(periodo);
      if (meu !== pedido) return;
      this.dgCarregando = false;
      // sessão expirada: requisitar() já mandou para o login; a tela fica como está até sair
      if (r.status === 401) return;
      let motivo = "";
      if (!r.ok || !r.dados || !Array.isArray(r.dados.incidentes)) {
        motivo =
          r.status === 429
            ? `Muitas consultas seguidas. Aguarde ${r.espera || 30} s e tente de novo.`
            : r.erro || MSG_FALHA;
      } else {
        try {
          modulo = modulo || (await import("./diagnostico.js"));
        } catch {
          motivo = MSG_FALHA;
        }
      }
      if (meu !== pedido) return;
      if (motivo || !modulo) {
        // a tela continua com o que já tinha (mesmo período, mesmo vencido, ou o anterior) e avisa
        falhou = periodo;
        const seguro = guardado ? guardado.visao : this.dgVisao;
        this.dgVisao = seguro;
        if (seguro) {
          this.dgPeriodo = guardado ? periodo : mostrado || periodo;
          this.dgErro = guardado
            ? `${motivo} Mostrando os números de ${ROTULOS[periodo]} buscados ${idadeDaVisao(Date.now() - guardado.em)}.`
            : `${motivo} Continua na tela o período de ${ROTULOS[mostrado] || "antes"}.`;
        } else {
          this.dgErro = motivo;
        }
        return;
      }
      falhou = "";
      const visao = modulo.visaoDoDiagnostico(r.dados, this.fuso || FUSO_PADRAO, Date.now());
      cache.set(periodo, { visao, em: Date.now() });
      mostrado = periodo;
      this.dgLimite = POR_LOTE;
      this.dgVisao = visao;
    },

    tentarDiagnosticoDeNovo() {
      if (falhou) this.dgPeriodo = falhou;
      this.carregarDiagnostico(true);
    },

    /** CSV por fetch: erro (429 etc.) aparece na página em vez de virar download quebrado. */
    async baixarCsv() {
      const url = this.dgUrlCsv;
      if (!url || this.dgBaixando) return;
      this.dgBaixando = true;
      this.dgErroCsv = "";
      try {
        const r = await fetch(url, { credentials: "same-origin", cache: "no-store" });
        if (!r.ok) {
          const espera = Number.parseInt(r.headers.get("Retry-After") || "0", 10) || 30;
          this.dgErroCsv =
            r.status === 429
              ? `Muitos downloads seguidos. Aguarde ${espera} s e tente de novo.`
              : r.status === 401 ? "" : MSG_CSV;
          if (r.status === 401) window.location.replace("login.html");
          return;
        }
        const blob = await r.blob();
        const link = document.createElement("a");
        const endereco = URL.createObjectURL(blob);
        link.href = endereco;
        const nome = /filename="([\w.-]{1,100})"/.exec(r.headers.get("Content-Disposition") || "");
        link.download = nome ? nome[1] : this.dgNomeCsv; // o nome do servidor leva a data
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.setTimeout(() => URL.revokeObjectURL(endereco), 10000);
      } catch {
        this.dgErroCsv = MSG_CSV;
      } finally {
        this.dgBaixando = false;
      }
    },

    trocarPeriodoDiagnostico(valor) {
      if (!PERIODOS.includes(valor) || valor === this.dgPeriodo) return;
      this.dgPeriodo = valor;
      this.carregarDiagnostico();
    },
    periodoDiagnosticoAtivo(valor) {
      return this.dgPeriodo === valor ? "true" : "false";
    },
    mostrarMaisDiagnostico() {
      this.dgLimite += POR_LOTE;
    },
    async imprimirLaudo() {
      this.dgLimite = Infinity;
      await this.$nextTick();
      window.print();
    },

    get dgClasse() {
      return this.dgCarregando && this.dgVisao ? "dg-atualizando" : "";
    },
    get dgOcupado() {
      return this.dgCarregando ? "true" : "false";
    },

    get dgUrlCsv() {
      return PERIODOS.includes(this.dgPeriodo)
        ? `/api/v1/diagnostico/laudo.csv?periodo=${this.dgPeriodo}`
        : "";
    },
    get dgNomeCsv() {
      return `sentinela-diagnostico-${this.dgPeriodo}.csv`;
    },
    get dgTemDados() {
      return Boolean(this.dgVisao);
    },
    get dgVazio() {
      return Boolean(this.dgVisao && this.dgVisao.vazio);
    },
    get dgTemIncidentes() {
      return Boolean(this.dgVisao && this.dgVisao.incidentes.length);
    },
    get dgIncidentes() {
      return this.dgVisao ? this.dgVisao.incidentes.slice(0, this.dgLimite) : [];
    },
    get dgTemMais() {
      return Boolean(this.dgVisao && this.dgVisao.incidentes.length > this.dgLimite);
    },
    get dgRotuloMais() {
      const falta = this.dgVisao ? this.dgVisao.incidentes.length - this.dgLimite : 0;
      return `Mostrar mais incidentes (faltam ${falta})`;
    },
    get dgContagem() {
      if (!this.dgVisao) return "";
      const total = this.dgVisao.incidentes.length;
      const n = Math.min(total, this.dgLimite);
      return n < total ? `Mostrando ${n} de ${total} incidentes.` : `${total} incidentes na lista.`;
    },
    get dgAvisoGateway() {
      return this.dgVisao ? this.dgVisao.avisoGateway : "";
    },
    get dgTruncado() {
      return Boolean(this.dgVisao && this.dgVisao.truncado);
    },
    get dgTotal() {
      return this.dgVisao ? String(this.dgVisao.resumo.total) : "0";
    },
    get dgFora() {
      return this.dgVisao ? this.dgVisao.resumo.fora : "";
    },
    get dgTiposResumo() {
      return this.dgVisao ? this.dgVisao.resumo.itens : [];
    },
    get dgBarras() {
      return this.dgVisao ? this.dgVisao.barras : [];
    },
    get dgPico() {
      return this.dgVisao ? this.dgVisao.pico : "";
    },
    get dgSugestoes() {
      return this.dgVisao ? this.dgVisao.sugestoesPorTipo : [];
    },
    get dgPeriodoTexto() {
      return this.dgVisao ? this.dgVisao.periodoTexto : "";
    },
    get dgGeradoEm() {
      return this.dgVisao ? `Gerado em ${this.dgVisao.geradoEm}` : "";
    },
    get dgAvisoEnergia() {
      return this.dgVisao ? this.dgVisao.avisoEnergia : "";
    },
    get dgRotuloPeriodo() {
      return ROTULOS[this.dgPeriodo] || "";
    },
    get dgTituloLaudo() {
      return TITULOS_LAUDO[this.dgPeriodo] || "Laudo de quedas";
    },
  };
}
