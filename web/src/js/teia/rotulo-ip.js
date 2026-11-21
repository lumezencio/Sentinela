// Rótulo de IP dentro de cada esfera (só no painel com login; o telão não liga a opção e o
// payload dele nem traz IP). Funções puras: quando o rótulo aparece (nível de detalhe pelo
// tamanho projetado e pelo total de nós), de que tamanho, com que cores, e um cache LRU das
// texturas por texto. O desenho em canvas -> sprite fica em objetos.js.

/** Abaixo disto (diâmetro projetado da esfera, em px) o rótulo some: ilegível e caro. */
export const DIAMETRO_MIN_PX = 24;
/** O rótulo entra esmaecendo em tempo (sem "estalo"); parado, fica sempre pleno (AA). */
export const ENTRADA_MS = 180;
/** Acima disto (super-nós) nenhum rótulo é desenhado. */
export const MAX_NOS_ROTULO = 3000;
/** Letra do rótulo na tela, em px: legível no mínimo, sem engolir a vizinhança no máximo. */
const LETRA_MIN_PX = 11;
const LETRA_MAX_PX = 15;

/**
 * Texto claro sobre pílula escura quase opaca: AA sobre qualquer cor de esfera ou brilho. A
 * luminância do texto fica abaixo do limiar do bloom (0.55, cena.js): a letra não "acende" nem
 * borra quando o bloom liga.
 */
export const COR_TEXTO_ROTULO = "#BCC2CE";
export const COR_FUNDO_ROTULO = "rgba(6,10,25,0.94)";

/** Diâmetro na tela (px) de uma esfera de `raio` a `distancia` da câmera perspectiva. */
export function diametroProjetadoPx({ raio, distancia, fovGraus, alturaPx }) {
  if (!(alturaPx > 0)) return 0;
  if (!(distancia > 0)) return Infinity;
  const tan = Math.tan((fovGraus * Math.PI) / 360);
  return (2 * raio * alturaPx) / (2 * distancia * tan);
}

/** O rótulo aparece? Pelo tamanho projetado da esfera e pelo total de nós. */
export function rotuloIpVisivel({ diametroPx, totalNos }) {
  return totalNos <= MAX_NOS_ROTULO && diametroPx >= DIAMETRO_MIN_PX;
}

/** Opacidade de entrada: 0 -> 1 em ENTRADA_MS desde que o rótulo apareceu. */
export function opacidadeEntrada(msDesdeQueApareceu) {
  if (!(msDesdeQueApareceu > 0)) return 0;
  return Math.min(1, msDesdeQueApareceu / ENTRADA_MS);
}

/** Altura da letra (px de tela) para uma esfera com `diametroPx` na tela. */
export function tamanhoRotuloPx(diametroPx) {
  return Math.min(LETRA_MAX_PX, Math.max(LETRA_MIN_PX, Math.round(diametroPx * 0.3)));
}

/**
 * Cache LRU de recursos por texto (textura do IP). `obter(texto, quadro)` cria uma vez e marca
 * o uso no quadro; ao criar um novo, descarta os menos recentes fora do quadro atual até
 * voltar ao `limite` (o que está na tela no quadro atual nunca sai).
 */
export function criarCacheRotulos({ limite, criar, liberar }) {
  const itens = new Map(); // texto -> {recurso, quadro}; ordem = uso mais antigo primeiro
  return {
    obter(texto, quadro) {
      let e = itens.get(texto);
      if (e) {
        itens.delete(texto);
        e.quadro = quadro;
        itens.set(texto, e);
        return e.recurso;
      }
      e = { recurso: criar(texto), quadro };
      itens.set(texto, e);
      if (itens.size > limite) {
        for (const [t, v] of itens) {
          if (itens.size <= limite) break;
          if (v.quadro >= quadro) continue;
          itens.delete(t);
          liberar(v.recurso);
        }
      }
      return e.recurso;
    },
    get tamanho() {
      return itens.size;
    },
    liberarTudo() {
      for (const v of itens.values()) liberar(v.recurso);
      itens.clear();
    },
  };
}

/**
 * Tira a sobreposição entre rótulos: `caixas` ({x, y, l, a}: centro e tamanho, em px de tela)
 * já vêm na ordem de prioridade (selecionado e mais perto primeiro); cada uma entra se não
 * encostar (com `folga` px) em nenhuma já posta nem nas `fixas` (painéis e rótulos HTML). Devolve um booleano por caixa. Nada sai
 * cortado ou empilhado: o que não cabe some até a câmera chegar mais perto.
 */
export function semSobreposicao(caixas, folga, fixas = []) {
  const postas = [...fixas]; // obstáculos já na tela (painéis, rótulos das classes)
  return caixas.map((c) => {
    for (const p of postas) {
      if (Math.abs(c.x - p.x) * 2 < c.l + p.l + 2 * folga
        && Math.abs(c.y - p.y) * 2 < c.a + p.a + 2 * folga) return false;
    }
    postas.push(c);
    return true;
  });
}
