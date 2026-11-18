// Aparência dos nós da Teia: estado -> marca visual e cor da classe. Funções puras.
// O estado nunca é transmitido só pela cor: forma, pulso, tremor e opacidade também mudam.
import { ESTADOS } from "../lista.js";
import { hashTexto } from "./hash.js";

const VERDE = "#4CA878";
const CINZA = "#7A8194";

// Só o que é visual; o rótulo vem de ESTADOS (lista.js) para não duplicar a tabela.
const VISUAL = {
  online: { cor: VERDE, forma: "cheia", pulsa: false, treme: false, opacidade: 1 },
  instavel: { cor: "#D9A441", forma: "anel", pulsa: false, treme: false, opacidade: 1 },
  suspeito: { cor: VERDE, forma: "cheia", pulsa: false, treme: true, opacidade: 1 },
  offline: { cor: "#D97373", forma: "cruz", pulsa: true, treme: false, opacidade: 1 },
  pausado: { cor: CINZA, forma: "translucida", pulsa: false, treme: false, opacidade: 0.45 },
  inalcancavel: { cor: CINZA, forma: "elo", pulsa: false, treme: false, opacidade: 0.7 },
  desconhecido: { cor: CINZA, forma: "anel", pulsa: false, treme: false, opacidade: 0.7 },
};

/** Aparência do nó; estado fora da tabela cai em "desconhecido". Devolve um objeto novo. */
export function aparenciaDe(estado) {
  const chave = Object.hasOwn(VISUAL, estado) ? estado : "desconhecido";
  return { ...VISUAL[chave], rotulo: ESTADOS[chave].rotulo };
}

/** 8 cores suaves e distintas, com contraste AA (>= 4.5:1) sobre o fundo #0e1016. */
export const PALETA_RESERVA = [
  "#7FB2E5", "#B79CE8", "#E58FB8", "#E8A27C",
  "#C9C46A", "#6CC6B8", "#9AA7F0", "#D69AD6",
];

const COR_VALIDA = /^#[0-9A-Fa-f]{6}$/;

/** Cor da classe vinda do backend; inválida -> reserva determinística por hash do slug. */
export function corDaClasse(classe) {
  const cor = classe?.cor;
  if (typeof cor === "string" && COR_VALIDA.test(cor)) return cor;
  return PALETA_RESERVA[hashTexto(String(classe?.slug ?? "")) % PALETA_RESERVA.length];
}
