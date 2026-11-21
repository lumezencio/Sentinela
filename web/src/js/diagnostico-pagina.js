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
const FRESCO_MS = 30000;
const POR_LOTE = 20;
const MSG_FALHA = "Não foi possível carregar o diagnóstico. Tente de novo.";
const FUSO_PADRAO = "America/Sao_Paulo";

export function diagnosticoDoPainel() {
  let pedido = 0; // descarta resposta de um período anterior
  let modulo = null;
  let carregadoEm = 0;
  let ouvindoImpressao = false;

  return {
    dgPeriodo: "24h",
    dgPeriodos: PERIODOS.map((valor) => ({ valor, rotulo: ROTULOS[valor] })),
    dgCarregando: false,
    dgErro: "",
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
      if (!this.dgVisao || Date.now() - carregadoEm > FRESCO_MS) this.carregarDiagnostico();
    },

    async carregarDiagnostico() {
      const meu = ++pedido;
      const periodo = this.dgPeriodo;
      this.dgCarregando = true;
      this.dgErro = "";
      this.dgLimite = POR_LOTE;
      const r = await api.verDiagnostico(periodo);
      if (meu !== pedido) return;
      this.dgCarregando = false;
      if (!r.ok || !r.dados || !Array.isArray(r.dados.incidentes)) {
        this.dgVisao = null; // nunca deixa na tela os números de outro período
        this.dgErro =
          r.status === 429
            ? `Muitas consultas seguidas. Aguarde ${r.espera || 30} s e tente de novo.`
            : r.status === 401 ? "" : r.erro || MSG_FALHA;
        return;
      }
      try {
        modulo = modulo || (await import("./diagnostico.js"));
      } catch {
        this.dgErro = MSG_FALHA;
        return;
      }
      if (meu !== pedido) return;
      carregadoEm = Date.now();
      this.dgVisao = modulo.visaoDoDiagnostico(r.dados, this.fuso || FUSO_PADRAO, Date.now());
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
      return Boolean(this.dgVisao && this.dgVisao.vazio && !this.dgErro);
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
