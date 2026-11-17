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
