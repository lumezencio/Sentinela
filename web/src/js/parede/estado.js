// Funções puras do telão: contadores, faixa de alertas, conexão e relógio no fuso.
import { grupoDe } from "../lista.js";

const SEM_CONTATO_MS = 60000;

/** Contadores do topo do telão (suspeito conta como online, como no painel). */
export function contadoresDaParede(itens) {
  const c = { online: 0, instavel: 0, offline: 0, inalcancavel: 0 };
  for (const item of itens || []) {
    const grupo = grupoDe(item && item.estado);
    if (grupo in c) c[grupo] += 1;
  }
  return c;
}

/** Até `max` alertas abertos, os mais novos primeiro; `restantes` = quantos ficaram de fora. */
export function faixaDeAlertas(alertas, max = 6) {
  if (!Array.isArray(alertas)) return { visiveis: [], restantes: 0 };
  const ordenados = alertas
    .slice()
    .sort((a, b) => (Date.parse(b.aberto_em) || 0) - (Date.parse(a.aberto_em) || 0) || b.id - a.id);
  return { visiveis: ordenados.slice(0, max), restantes: Math.max(0, ordenados.length - max) };
}

export function textoDosRestantes(restantes) {
  return restantes > 0 ? `e mais ${restantes}` : "";
}

/** "sem_conexao" depois de 60 s sem nenhuma mensagem do servidor (o telão nunca congela verde). */
export function estadoDaConexao(ultimoContatoMs, agoraMs) {
  return agoraMs - ultimoContatoMs > SEM_CONTATO_MS ? "sem_conexao" : "ok";
}

const formatos = new Map();

function formatoDo(fuso) {
  if (!formatos.has(fuso)) {
    const opcoes = { hour: "2-digit", minute: "2-digit", hour12: false };
    let f;
    try {
      f = new Intl.DateTimeFormat("pt-BR", fuso ? { ...opcoes, timeZone: fuso } : opcoes);
    } catch {
      f = new Intl.DateTimeFormat("pt-BR", opcoes); // fuso inválido: o do navegador
    }
    formatos.set(fuso, f);
  }
  return formatos.get(fuso);
}

/** "14:32" no fuso dado (IANA); alguns motores escrevem meia-noite como "24:05". */
export function horaNoFuso(data, fuso) {
  return formatoDo(String(fuso || "")).format(data).replace(/^24:/, "00:");
}
