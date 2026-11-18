// Medidor de FPS do telão: a Teia só fica se a TV der conta. Abaixo de `limite` FPS por
// `janelaMs` seguidos, deveTrocar() vira true (o telão passa para o Organograma). Uma subida
// acima do limite zera a contagem. O FPS é a média do último segundo de quadros.

const JANELA_MEDIA_MS = 1000;
const LACUNA_MS = 2000; // sem quadro por mais que isso (aba oculta, TV em espera): recomeça

export function criarMedidorFps({ limite = 30, janelaMs = 10000 } = {}) {
  let tempos = [];
  let abaixoDesde = null;
  let ultimo = null;

  return {
    /** Chamar a cada quadro com o instante do requestAnimationFrame (ms). */
    quadro(ts) {
      if (ultimo !== null && ts - ultimo > LACUNA_MS) {
        tempos = [];
        abaixoDesde = null;
      }
      ultimo = ts;
      tempos.push(ts);
      while (tempos.length > 2 && ts - tempos[0] > JANELA_MEDIA_MS) tempos.shift();
      if (tempos.length < 2) return;
      const fps = ((tempos.length - 1) * 1000) / (ts - tempos[0]);
      if (fps < limite) {
        if (abaixoDesde === null) abaixoDesde = ts;
      } else {
        abaixoDesde = null;
      }
    },
    deveTrocar() {
      return abaixoDesde !== null && ultimo - abaixoDesde >= janelaMs;
    },
  };
}
