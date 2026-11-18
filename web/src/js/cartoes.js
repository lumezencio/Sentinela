// Cartão de alerta na tela (painel e telão): só funções puras. A pilha de cartões segue as
// mensagens "alerta" do WebSocket; cada cartão é montado a partir do alerta + o store dos
// equipamentos (já na memória do navegador). O módulo é carregado também pelo bundle do telão
// (Chromium 63): sem Object.hasOwn, flatMap, ?. nem regex \p{...}, e só importa o que o telão
// já carrega. Texto da rede (nome, MAC, fabricante) vai à tela só por textContent/x-text e nunca
// é cortado: o cartão cresce.
import { ESTADOS, formatarLatencia, haQuanto, rotuloChecagem, textoDoIp } from "./lista.js";
import { formatarDuracao } from "./visoes.js";

export const TIPOS_DO_CARTAO = ["queda", "instavel", "fonte_falhou"];
export const MAX_NO_PAINEL = 3;
export const MAX_NO_TELAO = 2;
export const VOLTOU_MS = 10000;
const MAX_GUARDADOS = 50; // cartões na memória (os de cima aparecem, o resto vira "e mais N")
const MAX_DISPENSADOS = 200;
const MAX_TEXTO = 400; // nome de equipamento vai até 300 caracteres

const CONTROLES = /[\u0000-\u001f\u007f-\u009f­؜​-‏‪-‮⁠-⁯﻿￹-￻]/g;

export function limpar(texto, max) {
  if (texto === null || texto === undefined) return "";
  return String(texto).replace(CONTROLES, "").slice(0, max || MAX_TEXTO);
}

const MARCAS = {
  queda: { icone: "#i-offline", rotulo: "Fora do ar", estilo: "queda" },
  instavel: { icone: "#i-instavel", rotulo: "Instável", estilo: "aviso" },
  fonte_falhou: { icone: "#i-instavel", rotulo: "Fonte sem coleta", estilo: "aviso" },
  voltou: { icone: "#i-online", rotulo: "Voltou", estilo: "ok" },
};

// ---------- pilha ----------
export function pilhaVazia() {
  return { cartoes: [], dispensados: [] };
}

function idDaMensagem(msg) {
  if (Number.isInteger(msg.id)) return msg.id;
  return msg.alerta && Number.isInteger(msg.alerta.id) ? msg.alerta.id : null;
}

function fechado(entrada, alerta, agora) {
  const dado = { ...entrada.alerta, ...(alerta || {}) };
  if (!dado.fechado_em) dado.fechado_em = new Date(agora).toISOString();
  return { ...entrada, alerta: dado, fechado: true, expiraEm: agora + VOLTOU_MS };
}

/**
 * Aplica uma mensagem WS "alerta" à pilha (devolve outra; não muta). Só `aberto` cria cartão
 * (alerta que já estava aberto antes da conexão nunca vira cartão: `atualizado` de um id
 * desconhecido é ignorado); silenciado não abre; `fechado` vira "voltou" por 10 s; `removido`
 * (absorvido pelo pai) tira o cartão.
 */
export function aplicarNaPilha(pilha, msg, agora) {
  if (!msg || typeof msg !== "object") return pilha;
  const id = idDaMensagem(msg);
  if (id === null) return pilha;
  const idx = pilha.cartoes.findIndex((c) => c.id === id);
  const atual = idx >= 0 ? pilha.cartoes[idx] : null;
  const a = msg.alerta && typeof msg.alerta === "object" ? msg.alerta : null;
  const trocar = (nova) => ({
    ...pilha,
    cartoes: pilha.cartoes.map((c, i) => (i === idx ? nova : c)),
  });
  if (msg.acao === "removido") {
    return atual ? { ...pilha, cartoes: pilha.cartoes.filter((c) => c.id !== id) } : pilha;
  }
  if (msg.acao === "fechado") return atual ? trocar(fechado(atual, a, agora)) : pilha;
  if (msg.acao === "atualizado") {
    if (!atual) return pilha;
    if (a && a.fechado_em) return trocar(fechado(atual, a, agora));
    return a ? trocar({ ...atual, alerta: { ...atual.alerta, ...a } }) : pilha;
  }
  if (msg.acao === "aberto") {
    if (!a || a.fechado_em || a.silenciado || TIPOS_DO_CARTAO.indexOf(a.tipo) < 0) return pilha;
    if (atual) return trocar({ ...atual, alerta: { ...atual.alerta, ...a } });
    if (pilha.dispensados.indexOf(id) >= 0) return pilha;
    const nova = { id, alerta: a, fechado: false, expiraEm: 0, chegou: agora };
    return { ...pilha, cartoes: [nova, ...pilha.cartoes].slice(0, MAX_GUARDADOS) };
  }
  return pilha;
}

/** Fechar (×/Esc): o cartão sai e esse alerta não reabre sozinho. */
export function dispensarDaPilha(pilha, id) {
  const cartoes = pilha.cartoes.filter((c) => c.id !== id);
  if (cartoes.length === pilha.cartoes.length) return pilha;
  return { cartoes, dispensados: [...pilha.dispensados, id].slice(-MAX_DISPENSADOS) };
}

/** Tira os cartões "voltou" que já cumpriram os 10 s. */
export function expirarDaPilha(pilha, agora) {
  const cartoes = pilha.cartoes.filter((c) => !(c.fechado && c.expiraEm <= agora));
  return cartoes.length === pilha.cartoes.length ? pilha : { ...pilha, cartoes };
}

/** Até `max` cartões à vista (os mais novos primeiro) e quantos ficaram de fora. */
export function visiveisDaPilha(pilha, max) {
  const limite = Math.max(0, max === undefined ? MAX_NO_PAINEL : max);
  return {
    visiveis: pilha.cartoes.slice(0, limite),
    mais: Math.max(0, pilha.cartoes.length - limite),
  };
}

export function textoDoMais(n) {
  return `e mais ${n} ${n === 1 ? "alerta" : "alertas"}`;
}

// ---------- montagem dos dados de um cartão ----------
const plural = (n, um, varios) => `${n} ${n === 1 ? um : varios}`;

function estadoDe(item) {
  const chave = item && ESTADOS[item.estado] ? item.estado : "desconhecido";
  const est = ESTADOS[chave];
  return {
    rotulo: est.rotulo,
    icone: `#${est.icone}`,
    classe: `estado st-${chave === "suspeito" ? "online" : chave}`,
  };
}

/** Pai do equipamento e causa ("Inalcançável por causa de X"), do store. */
function paiEcausa(item, store) {
  const pai = item && item.pai_id ? store.itens.get(item.pai_id) : null;
  const dependeDe = item && item.pai_id
    ? (pai ? `${limpar(pai.nome)} (${ESTADOS[pai.estado] ? ESTADOS[pai.estado].rotulo.toLowerCase() : "sem estado"})` : "equipamento removido")
    : "";
  let causa = "";
  if (item && item.estado === "inalcancavel") {
    const idCausa = typeof item.causa === "string" && item.causa.indexOf("pai:") === 0 ? item.causa.slice(4) : item.pai_id;
    const quem = idCausa ? store.itens.get(idCausa) : null;
    if (quem) causa = `Inalcançável por causa de ${limpar(quem.nome)}`;
  }
  return { dependeDe, causa };
}

/** Afetados que a API devolve (id, nome, classe, estado) com o IP vindo do store. */
export function listaDeAfetados(afetados, store) {
  if (!Array.isArray(afetados)) return [];
  return afetados.map((x) => {
    const item = store.itens.get(x.id);
    const est = estadoDe({ estado: x.estado });
    const classe = store.classes.get(x.classe);
    return {
      id: x.id,
      nome: limpar(x.nome),
      ip: item ? textoDoIp(item.ip) : "",
      classeNome: classe ? limpar(classe.nome, 64) : limpar(x.classe, 32),
      estadoRotulo: est.rotulo,
      estadoIcone: est.icone,
      estadoClasse: est.classe,
    };
  });
}

/**
 * Dados do cartão (objeto plano para a tela). `opcoes`: `agora` (ms), `hora(iso)` (texto da
 * hora no fuso), `reduzido` (telão: sem IP, MAC, fabricante, checagem nem latência) e `extras`
 * ({mac, fabricante, afetados, expandido, erro, carregando}; só o painel os busca).
 */
export function dadosDoCartao(entrada, store, opcoes) {
  const { agora, hora, reduzido } = opcoes;
  const extras = opcoes.extras || {};
  const a = entrada.alerta;
  const item = a.equipamento_id ? store.itens.get(a.equipamento_id) || null : null;
  const marca = entrada.fechado ? MARCAS.voltou : MARCAS[a.tipo] || MARCAS.queda;
  const semEquipamento = a.tipo === "fonte_falhou" || (!item && !a.equipamento_nome);
  const nome = semEquipamento ? limpar(a.texto) : limpar(a.equipamento_nome || (item && item.nome) || a.texto);
  const classe = item ? store.classes.get(item.classe) : null;
  const classeSlug = a.classe || (item && item.classe) || "";
  const { dependeDe, causa } = paiEcausa(item, store);
  const n = Number.isInteger(a.afetados_total) ? a.afetados_total : Number.isInteger(a.afetados) ? a.afetados : 0;
  const quando = haQuanto(a.aberto_em, opcoes.agora);
  const linhas = [];
  // `principal`: o que o cartão recolhido ainda mostra (IP, causa e quando)
  const linha = (rotulo, valor, mono, principal) => {
    if (valor) linhas.push({ rotulo, valor, classe: mono ? "mono" : "", principal: Boolean(principal) });
  };
  if (!reduzido && item) {
    linha("IP", textoDoIp(item.ip), true, true);
    linha("MAC", limpar(extras.mac, 32), true);
    linha("Fabricante", limpar(extras.fabricante, 120), false);
    linha("Checagem", rotuloChecagem(item.checagem, item.porta), true);
  }
  linha("Depende de", item ? dependeDe : "", false);
  linha("Causa", causa, false, true);
  linha("Desde", `${hora(a.aberto_em)} (${quando})`, false, true);
  if (entrada.fechado) {
    const seg = (Date.parse(a.fechado_em) - Date.parse(a.aberto_em)) / 1000;
    linha("Resolvido", Number.isFinite(seg) ? `voltou após ${formatarDuracao(seg)}` : "voltou", false, true);
  }
  const lat = item ? (item.latencia_ms !== null && item.latencia_ms !== undefined ? item.latencia_ms : item.ultima_latencia_ms) : null;
  if (!reduzido && item && lat !== null && lat !== undefined) linha("Última latência", formatarLatencia(lat), true);
  const est = item ? estadoDe(item) : null;
  const afetadosLista = reduzido ? [] : Array.isArray(extras.afetados) ? extras.afetados : [];
  return {
    id: entrada.id,
    tipo: a.tipo,
    estilo: marca.estilo,
    classeCartao: `ca ca-${marca.estilo}`,
    icone: marca.icone,
    rotuloMarca: marca.rotulo,
    titulo: nome,
    tamanhoTitulo: nome.length > 160 ? "longo" : nome.length > 90 ? "medio" : "",
    classeNome: classe ? limpar(classe.nome, 64) : limpar(classeSlug, 32),
    corClasse: classe && /^#[0-9a-fA-F]{3,8}$/.test(classe.cor || "") ? classe.cor : "",
    temEstado: Boolean(est),
    estadoRotulo: est ? est.rotulo : "",
    estadoIcone: est ? est.icone : "#i-desconhecido",
    estadoClasse: est ? est.classe : "estado st-desconhecido",
    linhas,
    equipamentoId: a.equipamento_id || "",
    temEquipamento: Boolean(item),
    afetados: n,
    rotuloAfetados: n ? plural(n, "equipamento afetado", "equipamentos afetados") : "",
    lista: afetadosLista,
    classeLista: afetadosLista.length > 4 ? "ca-afetados ca-rola" : "ca-afetados", // rola: borda esmaecida
    expandido: Boolean(extras.expandido),
    ariaExpandido: extras.expandido ? "true" : "false",
    rotuloVer: extras.expandido ? "Ocultar afetados" : "Ver afetados",
    idLista: `ca-afetados-${entrada.id}`,
    carregando: Boolean(extras.carregando),
    erro: limpar(extras.erro, 200),
    reconhecivel: !reduzido && !entrada.fechado && !a.reconhecido_em && Boolean(a.equipamento_id),
    reconhecimento: !reduzido && a.reconhecido_em
      ? `Reconhecido por ${limpar(a.reconhecido_por, 64) || "um administrador"} às ${hora(a.reconhecido_em)}`
      : "",
    rotuloFechar: `Fechar o aviso: ${nome}`,
    rotuloReconhecer: `Reconhecer alerta: ${nome}`,
    agora,
  };
}
