// Ponto de entrada do bundle da Teia do telão (src/parede/teia-parede.bundle.js): a mesma cena
// do painel (three + 3d-force-graph), em ES2017 para TVs. O telão (parede.bundle.js, IIFE)
// injeta este arquivo com <script type="module"> e o encontra em window.SentinelaTeiaParede;
// se a carga falhar, der erro de sintaxe ou a TV não tiver WebGL, o telão usa o Organograma.
import "../src/js/parede/compat.js";
import { montarTeia } from "../src/js/teia/cena.js";

window.SentinelaTeiaParede = { montarTeia };
