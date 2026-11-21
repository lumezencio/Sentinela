// Aba Diagnóstico (#diagnostico): funções puras (testadas no Node) que transformam a resposta
// de GET /api/v1/diagnostico em dados prontos para a tela e para o laudo impresso. Os nomes de
// equipamento vêm da rede (podem ser longos e hostis): só passam por limparTexto (tira
// caracteres de controle, nunca corta) e vão à tela por x-text, nunca como HTML.
import { limparTexto } from "./lista.js";
import { formatarDuracao } from "./visoes.js";

export const PERIODOS = ["24h", "7d", "30d"];
export const ROTULOS_PERIODO = { "24h": "24 horas", "7d": "7 dias", "30d": "30 dias" };
export const URL_BASE = "/api/v1/diagnostico";
export const FUSO_PADRAO = "America/Sao_Paulo";
// mesmos textos de core/sentinela/diagnostico/textos.py (o backend manda o rótulo completo de
// cada incidente; estes servem aos cartões do resumo)
export const ROTULOS_TIPO = {
  roteador_reiniciou: "Roteador reiniciou",
  gateway_sem_reinicio: "Queda do gateway sem reinício",
  pai_derrubou_filhos: "Equipamento pai derrubou os filhos",
  queda_isolada: "Queda isolada",
  instabilidade: "Instabilidade",
  quedas_simultaneas: "Quedas simultâneas",
};
const ROTULO_OUTRO = "Outro tipo";
const NOME_NA_LISTA = Object.hasOwn;
const formatadores = new Map();

const ehTipo = (tipo) => typeof tipo === "string" && NOME_NA_LISTA(ROTULOS_TIPO, tipo);
const plural = (n, um, varios) => `${n} ${n === 1 ? um : varios}`;

/** Endereço do CSV do laudo; período fora de PERIODOS → "" (o link fica desligado). */
export function urlDoCsv(periodo) {
  return PERIODOS.includes(periodo) ? `${URL_BASE}/laudo.csv?periodo=${periodo}` : "";
}

/** Endereço da consulta; período inválido cai em 24 h. */
export function urlDaConsulta(periodo) {
  return `${URL_BASE}?periodo=${PERIODOS.includes(periodo) ? periodo : "24h"}`;
}

function formatador(fuso) {
  let f = formatadores.get(fuso);
  if (!f) {
    const opcoes = {
      year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit",
      hourCycle: "h23",
    };
    try {
      f = new Intl.DateTimeFormat("pt-BR", { ...opcoes, timeZone: fuso });
    } catch {
      f = new Intl.DateTimeFormat("pt-BR", opcoes); // fuso inválido: o do navegador
    }
    formatadores.set(fuso, f);
  }
  return f;
}

/** "19/11/2026 19:04" no fuso configurado (sempre com a data: o laudo vale em papel). */
export function dataHora(iso, fuso) {
  const t = typeof iso === "number" ? iso : Date.parse(iso);
  if (Number.isNaN(t)) return "—";
  return formatador(fuso || FUSO_PADRAO).format(t).replace(",", "");
}

/** 24 barras (uma por hora local): a maior vale 100; quem tem incidente nunca some (mín. 4). */
export function barrasPorHora(horas) {
  const lista = Array.isArray(horas) ? horas : [];
  const totais = Array.from({ length: 24 }, (_, h) => {
    const n = Number(lista[h]);
    return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
  });
  const maior = Math.max(...totais);
  return totais.map((total, hora) => ({
    hora,
    total,
    altura: total === 0 ? 0 : Math.max(4, Math.round((total / maior) * 100)),
    rotulo: `${hora} h: ${plural(total, "incidente", "incidentes")}`,
  }));
}

/** Texto do horário de pico ("" se não houve incidente). */
export function picoDasHoras(horas) {
  const barras = barrasPorHora(horas);
  const pico = barras.reduce((a, b) => (b.total > a.total ? b : a), barras[0]);
  return pico.total > 0 ? `Pico às ${pico.rotulo}` : "";
}

/** Cartões do resumo: tipos com incidente (maiores primeiro) e o tempo fora já formatado. */
export function resumoDoPeriodo(resumo) {
  const r = resumo && typeof resumo === "object" ? resumo : {};
  const por = r.por_tipo && typeof r.por_tipo === "object" ? r.por_tipo : {};
  const itens = Object.entries(por)
    .filter(([, n]) => Number(n) > 0)
    .map(([tipo, n]) => ({
      rotulo: ehTipo(tipo) ? ROTULOS_TIPO[tipo] : ROTULO_OUTRO,
      total: Number(n),
      ordem: ehTipo(tipo) ? Object.keys(ROTULOS_TIPO).indexOf(tipo) : 99,
    }))
    .sort((a, b) => b.total - a.total || a.ordem - b.ordem)
    .map(({ rotulo, total }) => ({ rotulo, total }));
  return { itens, fora: formatarDuracao(r.fora_s ?? 0), total: Number(r.incidentes) || 0 };
}

const ICONES = { instabilidade: "#i-instavel", quedas_simultaneas: "#i-instavel" };

/** Uma linha da lista de incidentes: tudo em texto, pronto para x-text. */
export function linhaDoIncidente(inc, fuso) {
  const tipo = ehTipo(inc && inc.tipo) ? inc.tipo : "outro";
  const texto = (lista) => (Array.isArray(lista) ? lista : []).map((t) => limparTexto(t));
  const equipamentos = (Array.isArray(inc.equipamentos) ? inc.equipamentos : []).map((e) =>
    limparTexto(e && e.nome),
  );
  const faltam = Math.max(0, (Number(inc.equipamentos_total) || 0) - equipamentos.length);
  const dur = formatarDuracao(inc.duracao_s);
  return {
    quando: dataHora(inc.inicio, fuso),
    duracao: inc.fim ? dur : `${dur} e ainda fora`,
    rotulo: limparTexto(inc.rotulo),
    certeza: inc.certeza === "confirmado" ? "confirmado" : "provavel",
    porque: texto(inc.porque),
    equipamentos,
    maisEquipamentos: faltam ? `e mais ${plural(faltam, "aparelho", "aparelhos")}` : "",
    sugestoes: texto(inc.sugestoes),
    classe: `dg-tipo-${tipo}`,
    icone: ICONES[tipo] || "#i-offline",
    tipo,
  };
}

/** Barras com a classe, o estilo (altura) e o texto de cada coluna; a do pico se destaca. */
function barrasDaTela(horas) {
  const barras = barrasPorHora(horas);
  const maior = Math.max(...barras.map((b) => b.total));
  let achou = false;
  return barras.map((b) => {
    const pico = maior > 0 && b.total === maior && !achou;
    achou = achou || pico;
    return {
      ...b,
      classe: pico ? "dg-barra dg-barra-pico" : "dg-barra",
      estilo: { "--altura": `${b.altura}%` },
      numero: b.total > 0 ? String(b.total) : "",
      eixo: b.hora % 3 === 0 ? String(b.hora) : "",
      rotuloHora: `${b.hora} h`,
    };
  });
}

const comChaves = (lista, chave) => lista.map((t, k) => ({ [chave]: t, k }));

/** Dados completos da tela a partir da resposta da API (sem referência a ela). */
export function visaoDoDiagnostico(dados, fuso, agora) {
  const d = dados && typeof dados === "object" ? dados : {};
  const linhas = (Array.isArray(d.incidentes) ? d.incidentes : []).map((inc) =>
    linhaDoIncidente(inc, fuso),
  );
  const vistos = new Map();
  for (const l of linhas) {
    if (l.tipo !== "outro" && !vistos.has(l.tipo)) {
      vistos.set(l.tipo, { tipo: l.tipo, rotulo: ROTULOS_TIPO[l.tipo], sugestoes: l.sugestoes });
    }
  }
  const resumo = resumoDoPeriodo(d.resumo);
  return {
    periodo: d.periodo,
    periodoTexto: `De ${dataHora(d.de, fuso)} até ${dataHora(d.ate, fuso)} (horário de ${fuso || FUSO_PADRAO})`,
    geradoEm: dataHora(agora, fuso),
    vazio: linhas.length === 0 && resumo.total === 0,
    truncado: Boolean(d.truncado),
    avisoGateway: d.gateway_configurado === false ? limparTexto(d.aviso_gateway) : "",
    avisoEnergia: limparTexto(d.aviso_energia),
    resumo: { ...resumo, itens: resumo.itens.map((it, k) => ({ ...it, k })) },
    barras: barrasDaTela(d.horas),
    pico: picoDasHoras(d.horas),
    incidentes: linhas.map((l, i) => ({
      ...l,
      chave: i,
      porqueItens: comChaves(l.porque, "t"),
      equipamentosItens: comChaves(l.equipamentos, "nome"),
    })),
    sugestoesPorTipo: [...vistos.values()].map((s) => ({
      ...s,
      sugestoesItens: comChaves(s.sugestoes, "t"),
    })),
  };
}
