// Desempenho da Teia: nível de detalhe, medidor de FPS e porta do bloom. Funções puras.

const JANELA_MS = 3000;
const MINIMO_MS = 1000;
const HISTORICO_MS = 30000;

/**
 * Nível de detalhe pela quantidade de nós e pelo FPS.
 * `fpsMedio` é o contrato do chamador: passe o FPS médio somente quando
 * `medidor.abaixoDe(30, 3)` for verdadeiro (queda sustentada); caso contrário passe
 * null (ou um valor >= 30). Um valor < 30 aqui força "agrupado".
 * completo: <= 1000 nós; reduzido: 1001-3000; agrupado: > 3000 ou FPS < 30.
 */
export function nivelDeDetalhe(totalNos, fpsMedio) {
  if (totalNos > 3000) return "agrupado";
  if (fpsMedio !== null && fpsMedio !== undefined && fpsMedio < 30) return "agrupado";
  if (totalNos > 1000) return "reduzido";
  return "completo";
}

/**
 * Medidor de FPS com média móvel de 3 s.
 * - quadro(): registra um quadro renderizado.
 * - media(): quadros por segundo na janela; null com menos de 1 s de amostras.
 * - abaixoDe(limite, segundos): true se a média ficou abaixo de `limite` de forma
 *   contínua durante os últimos `segundos` (até 30 s de histórico).
 */
export function criarMedidorFps(agora = () => performance.now()) {
  let quadros = []; // instantes dos quadros dentro da janela
  let medias = []; // {t, v}: média após cada quadro (só com >= 1 s de amostras)

  function calcular() {
    if (quadros.length < 2) return null;
    const span = quadros[quadros.length - 1] - quadros[0];
    if (span < MINIMO_MS) return null;
    return ((quadros.length - 1) * 1000) / span;
  }

  return {
    quadro() {
      const t = agora();
      quadros.push(t);
      const corte = t - JANELA_MS;
      let i = 0;
      while (i < quadros.length && quadros[i] < corte) i++;
      if (i) quadros = quadros.slice(i);
      const v = calcular();
      if (v !== null) medias.push({ t, v });
      const corteH = t - HISTORICO_MS;
      let j = 0;
      while (j < medias.length && medias[j].t < corteH) j++;
      if (j) medias = medias.slice(j);
    },
    media() {
      return calcular();
    },
    abaixoDe(limite, segundos) {
      if (!medias.length) return false;
      const ultimo = medias[medias.length - 1];
      let inicio = null;
      for (let i = medias.length - 1; i >= 0 && medias[i].v < limite; i--) inicio = medias[i].t;
      if (inicio === null) return false;
      return ultimo.t - inicio >= segundos * 1000;
    },
  };
}

/** Bloom só se o FPS medido nos primeiros 3 s for >= 50 e sem movimento reduzido. */
export function bloomPermitido(fpsInicial, movimentoReduzido) {
  return fpsInicial !== null && fpsInicial !== undefined && fpsInicial >= 50 && !movimentoReduzido;
}

/** Queda de FPS que agrupa (R5): média de 3 s abaixo de 24 fps por 5 s seguidos. */
export const FPS_AGRUPAR = 24;
export const SEGUNDOS_AGRUPAR = 5;
/** Intervalo mínimo entre duas entradas em "agrupado" por FPS (sem vaivém). */
export const INTERVALO_REAGRUPAR_MS = 60000;

/** true se o medidor registra a queda sustentada que agrupa. */
export function quedaSustentada(medidor) {
  return medidor.abaixoDe(FPS_AGRUPAR, SEGUNDOS_AGRUPAR);
}

/**
 * Decide o nível de detalhe. Puro: recebe e devolve o estado da decisão.
 * - total: nº de equipamentos; se ele já implica "agrupado", o caminho de FPS é ignorado.
 * - agrupadoPorFps: a cena está agrupada por FPS (fica até ser limpo por limparAgrupadoPorFps).
 * - queda: quedaSustentada(medidor) agora.
 * - agora / ultimaEntrada: ms; reentrar em "agrupado" por FPS só 60 s após a última entrada.
 * Devolve {nivel, agrupadoPorFps, ultimaEntrada}.
 */
export function decidirNivel({ total, agrupadoPorFps = false, queda = false, agora = 0, ultimaEntrada = -Infinity }) {
  const porContagem = nivelDeDetalhe(total, null);
  if (porContagem === "agrupado") return { nivel: "agrupado", agrupadoPorFps: false, ultimaEntrada };
  if (agrupadoPorFps) return { nivel: "agrupado", agrupadoPorFps: true, ultimaEntrada };
  if (queda && agora - ultimaEntrada >= INTERVALO_REAGRUPAR_MS) {
    return { nivel: "agrupado", agrupadoPorFps: true, ultimaEntrada: agora };
  }
  return { nivel: porContagem, agrupadoPorFps: false, ultimaEntrada };
}

/** Pedido do usuário (retomar, trocar estilo, ver tudo): volta à vista completa possível. */
export function limparAgrupadoPorFps(decisao) {
  return { ...decisao, agrupadoPorFps: false };
}
