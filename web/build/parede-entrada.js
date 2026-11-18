// Ponto de entrada do bundle do telão (src/parede/parede.bundle.js): IIFE em ES2017, JS puro
// (sem Alpine). Página, emparelhamento, WebSocket, contadores, faixa, relógio e Organograma.
import "../src/js/parede/compat.js";
import { iniciarParede } from "../src/js/parede/principal.js";

iniciarParede();
