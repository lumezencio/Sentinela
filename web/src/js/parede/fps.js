// Medidor de FPS e vigia da cena do telão: a Teia só fica se a TV der conta e se ela estiver
// de fato desenhando.
//
// criarMedidorFps: abaixo de `limite` FPS por `janelaMs` seguidos, deveTrocar() vira true (o
// telão passa para o Organograma). Uma subida acima do limite zera a contagem. O FPS é a média
// do último segundo de quadros. Uma lacuna longa entre quadros com a página visível (a TV
// travou) conta como lentidão desde o último quadro; só reiniciar() (chamado na troca de
// visibilidade da página: aba oculta não desenha) zera a medida.
//
// criarVigiaDaCena: a cena grava a posição da câmera (data-camera) enquanto desenha; girando
// sozinha, ela muda o tempo todo. Parada por `paradaMs` com a rotação ligada = o laço de
// desenho morreu (exceção dentro do three/3d-force-graph) e o telão estaria congelado.

const JANELA_MEDIA_MS = 1000;
const LACUNA_MS = 2000;

export function criarMedidorFps({ limite = 30, janelaMs = 10000 } = {}) {
  let tempos = [];
  let abaixoDesde = null;
  let ultimo = null;

  return {
    /** Chamar a cada quadro com o instante do requestAnimationFrame (ms). */
    quadro(ts) {
      if (ultimo !== null && ts - ultimo > LACUNA_MS) {
        // TV travada com a página visível: lento desde o último quadro desenhado
        if (abaixoDesde === null) abaixoDesde = ultimo;
        tempos = [ultimo];
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
    /** Página oculta e visível de novo: a medida recomeça do zero. */
    reiniciar() {
      tempos = [];
      abaixoDesde = null;
      ultimo = null;
    },
  };
}

export function criarVigiaDaCena({ paradaMs = 5000 } = {}) {
  let ultima = null;
  let desde = 0;

  return {
    /** true = câmera parada há `paradaMs` com a rotação ligada (cena congelada). */
    amostra(camera, girando, agora) {
      if (!girando || !camera) {
        ultima = null;
        return false;
      }
      if (camera !== ultima) {
        ultima = camera;
        desde = agora;
        return false;
      }
      return agora - desde >= paradaMs;
    },
    reiniciar() {
      ultima = null;
    },
  };
}
