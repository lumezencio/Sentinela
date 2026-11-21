// Cartões do painel (cartoes-painel.js) com um DOM mínimo: reconexão zera a pilha, Esc/× move o
// foco e o cartão "voltou" não some enquanto tem foco ou o mouse em cima.
import test from "node:test";
import assert from "node:assert/strict";

import { criarStore } from "../../src/js/lista.js";

const alerta = (id) => ({
  id, tipo: "queda", texto: "Switch caiu", equipamento_id: null, equipamento_nome: `Switch ${id}`,
  classe: "switch", afetados_total: 0, aberto_em: "2026-11-18T17:32:00Z", fechado_em: null,
  silenciado: false, reconhecido_em: null,
});

/** window/document mínimos; `foco` é o elemento que `document.activeElement` devolve. */
function ambiente() {
  const focados = [];
  const elementos = new Map(); // seletor -> elemento
  const el = (nome) => {
    const e = { nome, focus() { focados.push(nome); }, contains: (x) => x === e };
    return e;
  };
  const doc = {
    activeElement: null,
    addEventListener() {}, removeEventListener() {},
    querySelector: (sel) => elementos.get(sel) || null,
    getElementById: (id) => elementos.get(`#${id}`) || null,
  };
  const timers = [];
  const win = {
    localStorage: { getItem: () => "0", setItem() {} },
    location: { hash: "" },
    clearTimeout() {},
    setTimeout: (fn) => { timers.push(fn); return timers.length; },
  };
  globalThis.window = win;
  globalThis.document = doc;
  return { doc, elementos, focados, el, rodarTimers: () => { while (timers.length) timers.shift()(); } };
}

async function painel() {
  const { cartoesDoPainel } = await import(`../../src/js/cartoes-painel.js?${Math.random()}`);
  const base = cartoesDoPainel(criarStore());
  const obj = {};
  Object.defineProperties(obj, Object.getOwnPropertyDescriptors(base));
  obj.fuso = "America/Sao_Paulo";
  return obj;
}

const abrir = (p, id) => p.cartoesAoMensagem({ tipo: "alerta", acao: "aberto", id, alerta: alerta(id) });

test("reconexão (2º snapshot em diante) zera a pilha de cartões; o 1º não mexe", async () => {
  const amb = ambiente();
  try {
    const p = await painel();
    abrir(p, 1);
    abrir(p, 2);
    assert.equal(p.cartoes.length, 2);
    p.cartoesAoSnapshot(); // 1ª carga
    assert.equal(p.cartoes.length, 2);
    p.cartoesAoSnapshot(); // reconexão
    assert.equal(p.cartoes.length, 0);
    abrir(p, 3); // depois da reconexão tudo volta ao normal
    assert.deepEqual(p.cartoes.map((c) => c.id), [3]);
    p.reiniciarCartoes();
    assert.equal(p.cartoes.length, 0);
  } finally {
    delete globalThis.window; delete globalThis.document;
    void amb;
  }
});

test("Esc/× no cartão passa o foco ao próximo cartão (ou a #conteudo se era o último)", async () => {
  const amb = ambiente();
  try {
    const p = await painel();
    abrir(p, 1);
    abrir(p, 2); // ordem na tela: 2, 1
    const c2 = amb.el("cartao2");
    const c1 = amb.el("cartao1");
    amb.elementos.set('#cartoes-alerta article[data-id="2"]', c2);
    amb.elementos.set('#cartoes-alerta article[data-id="1"]', c1);
    amb.elementos.set("#conteudo", amb.el("conteudo"));
    amb.doc.activeElement = c2; // o foco estava no cartão fechado
    p.dispensarCartao(2);
    amb.rodarTimers();
    assert.deepEqual(amb.focados, ["cartao1"]);
    amb.doc.activeElement = c1;
    p.dispensarCartao(1);
    amb.rodarTimers();
    assert.deepEqual(amb.focados, ["cartao1", "conteudo"]);
    // foco fora do cartão (clique no ×, por exemplo, sem foco dentro): não rouba o foco
    abrir(p, 5);
    amb.doc.activeElement = null;
    p.dispensarCartao(5);
    amb.rodarTimers();
    assert.deepEqual(amb.focados, ["cartao1", "conteudo"]);
  } finally {
    delete globalThis.window; delete globalThis.document;
  }
});

test("cartão 'voltou' não expira com foco ou mouse em cima; ao soltar, ganha novo prazo", async () => {
  const amb = ambiente();
  try {
    const p = await painel();
    abrir(p, 1);
    p.cartoesAoMensagem({ tipo: "alerta", acao: "fechado", id: 1, alerta: { fechado_em: "2026-11-18T17:40:00Z" } });
    p.reterCartao(1);
    const realAgora = Date.now;
    Date.now = () => realAgora() + 60_000; // muito além dos 10 s
    try {
      p.renderizarCartoes();
      assert.equal(p.cartoes.length, 1, "retido: não some");
      p.soltarCartao(1);
      assert.equal(p.cartoes.length, 1, "recém-solto: ainda tem prazo");
      Date.now = () => realAgora() + 60_000 + 11_000;
      p.renderizarCartoes();
      assert.equal(p.cartoes.length, 0, "passado o novo prazo, some");
    } finally {
      Date.now = realAgora;
    }
  } finally {
    delete globalThis.window; delete globalThis.document;
    void amb;
  }
});

const aparelhoNovo = (id) => ({
  id, tipo: "aparelho_novo", texto: "novo aparelho conectou na rede", equipamento_id: null,
  equipamento_nome: null, classe: null, afetados_total: 0, aberto_em: "2026-11-18T17:32:00Z",
  fechado_em: null, silenciado: false, reconhecido_em: null, envio: "nao_aplica",
  descoberta_id: `d-${id}`, ip: "192.168.15.23", fabricante: "Fabricante Fictício", portas: [80, 443],
});

test("cartão de aparelho novo no painel: abre ao vivo e Ver em Novos leva à descoberta", async () => {
  const amb = ambiente();
  try {
    const p = await painel();
    p.cartoesAoMensagem({ tipo: "alerta", acao: "aberto", id: 4, alerta: aparelhoNovo(4) });
    assert.equal(p.cartoes.length, 1);
    assert.equal(p.cartoes[0].verEmNovos, "d-4");
    const pedidos = [];
    p.verDescobertaEmNovos = (id) => pedidos.push(id);
    p.verEmNovosDoCartao(4);
    assert.deepEqual(pedidos, ["d-4"]);
    assert.equal(p.cartoes.length, 0, "o cartão sai: o aviso cumpriu o papel");
    // o alerta fechado (aprovado ou ignorado) tira o cartão sem virar voltou
    p.cartoesAoMensagem({ tipo: "alerta", acao: "aberto", id: 5, alerta: aparelhoNovo(5) });
    p.cartoesAoMensagem({ tipo: "alerta", acao: "fechado", id: 5, alerta: { fechado_em: "2026-11-18T17:40:00Z" } });
    assert.equal(p.cartoes.length, 0);
  } finally {
    delete globalThis.window; delete globalThis.document;
    void amb;
  }
});

test("faixa de alertas ao vivo (abaixo de 1280 px): resumo, abrir/fechar e fecha sozinha sem cartões", async () => {
  const amb = ambiente();
  try {
    const p = await painel();
    assert.equal(p.rotuloResumoCartoes, "Nenhum alerta ao vivo");
    assert.equal(p.caAberto, false);
    assert.equal(p.classePilha, "ca-pilha");
    abrir(p, 1);
    assert.equal(p.rotuloResumoCartoes, "1 alerta ao vivo");
    assert.equal(p.detalheResumoCartoes, p.cartoes[0].titulo);
    assert.equal(p.classePilha, "ca-pilha ca-com");
    p.alternarCartoes();
    assert.equal(p.caAberto, true);
    assert.equal(p.ariaCartoesAbertos, "true");
    assert.equal(p.rotuloAcaoCartoes, "Fechar");
    assert.equal(p.classePilha, "ca-pilha ca-com ca-aberta");
    abrir(p, 2);
    abrir(p, 3);
    abrir(p, 4);
    assert.equal(p.rotuloResumoCartoes, "4 alertas ao vivo"); // 3 à vista + "e mais 1"
    p.fecharCartoes();
    assert.equal(p.caAberto, false);
    p.alternarCartoes();
    p.reiniciarCartoes(); // sem cartões, a faixa fecha
    assert.equal(p.caAberto, false);
    assert.equal(p.rotuloResumoCartoes, "Nenhum alerta ao vivo");
  } finally {
    delete globalThis.window; delete globalThis.document;
    void amb;
  }
});
