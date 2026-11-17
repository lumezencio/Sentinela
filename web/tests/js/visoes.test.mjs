import test from "node:test";
import assert from "node:assert/strict";
import { aplicarSnapshot, criarStore } from "../../src/js/lista.js";
import {
  ESTILOS as ESTILOS_TEIA, NOMES_ESTILO as NOMES_TEIA,
} from "../../src/js/teia/estilos.js";
import {
  abaDoHash, CHAVE_ESTILO, carregarTeia, equipamentosDaClasse, ESTILOS, estiloSalvo,
  fichaDoEquipamento, linhaDeHistorico, NOMES_ESTILO, resumoDasClasses, salvarEstilo,
  URL_BUNDLE_TEIA, webglDisponivel,
} from "../../src/js/visoes.js";

function armazenamento(inicial = {}) {
  const dados = { ...inicial };
  return {
    dados,
    getItem: (k) => (k in dados ? dados[k] : null),
    setItem: (k, v) => { dados[k] = String(v); },
  };
}
const quebrado = {
  getItem() { throw new Error("bloqueado"); },
  setItem() { throw new Error("bloqueado"); },
};

function lojaDemo() {
  const store = criarStore();
  aplicarSnapshot(store, {
    classes: [
      { slug: "sentinela", nome: "Sentinela", cor: "#8793E8", ordem: 0 },
      { slug: "camera", nome: "Câmeras", cor: "#E59866", ordem: 4 },
      { slug: "iot", nome: "IoT", cor: "#00FF00", ordem: 10 },
      { slug: "wifi", nome: "Wi-Fi", cor: "#5DADE2", ordem: 3 },
    ],
    equipamentos: [
      { id: "s", nome: "Sentinela", ip: "10.99.0.1", classe: "sentinela", estado: "online", desde: "2026-11-17T10:00:00Z" },
      { id: "c1", nome: "Câmera 10", ip: "10.99.10.10", classe: "camera", estado: "online", desde: "2026-11-17T10:00:00Z" },
      { id: "c2", nome: "Câmera 2", ip: "10.99.10.11", classe: "camera", estado: "offline", desde: "2026-11-17T10:00:00Z" },
      { id: "c3", nome: "Câmera 1", ip: "10.99.10.12", classe: "camera", estado: "pausado", desde: "2026-11-17T10:00:00Z" },
      { id: "c4", nome: "Câmera 3", ip: "10.99.10.13", classe: "camera", estado: "instavel", desde: "2026-11-17T10:00:00Z" },
      { id: "c5", nome: "Câmera 4", ip: "10.99.10.14", classe: "camera", estado: "suspeito", desde: "2026-11-17T10:00:00Z" },
      { id: "w1", nome: "AP Bloco A", ip: "10.99.20.10", classe: "wifi", estado: "desconhecido", desde: "2026-11-17T10:00:00Z", checagem: "tcp", porta: 554, latencia_ms: 3.25 },
    ],
  });
  return store;
}

// ---------- abas ----------
test("abaDoHash: #teia, #organograma, #lista e o padrão", () => {
  assert.equal(abaDoHash("#teia"), "teia");
  assert.equal(abaDoHash("#organograma"), "organograma");
  assert.equal(abaDoHash("#lista"), "lista");
  assert.equal(abaDoHash("#xyz"), "lista");
  assert.equal(abaDoHash(""), "lista");
  assert.equal(abaDoHash(undefined), "lista");
  assert.equal(abaDoHash("teia"), "teia");
  assert.equal(abaDoHash("#__proto__"), "lista");
});

// ---------- estilos ----------
test("ESTILOS/NOMES_ESTILO iguais aos da cena (estilos.js)", () => {
  assert.deepEqual(ESTILOS, ESTILOS_TEIA);
  assert.deepEqual(NOMES_ESTILO, NOMES_TEIA);
  assert.equal(CHAVE_ESTILO, "sentinela.teia.estilo");
});

test("estiloSalvo: armazenamento que lança exceção → 'a'", () => {
  assert.equal(estiloSalvo(quebrado), "a");
});

test("estiloSalvo: window.localStorage inacessível (getter lança) → 'a'", () => {
  const antes = globalThis.window;
  globalThis.window = {};
  Object.defineProperty(globalThis.window, "localStorage", { get() { throw new Error("SecurityError"); } });
  try {
    assert.equal(estiloSalvo(), "a");
    assert.doesNotThrow(() => salvarEstilo("b"));
  } finally {
    globalThis.window = antes;
  }
});

test("estiloSalvo: valor inválido ou ausente → 'a'; válido → ele mesmo", () => {
  assert.equal(estiloSalvo(armazenamento({ [CHAVE_ESTILO]: "z" })), "a");
  assert.equal(estiloSalvo(armazenamento({ [CHAVE_ESTILO]: "__proto__" })), "a");
  assert.equal(estiloSalvo(armazenamento()), "a");
  assert.equal(estiloSalvo(armazenamento({ [CHAVE_ESTILO]: "d" })), "d");
});

test("salvarEstilo: grava só estilo válido e não lança com armazenamento quebrado", () => {
  const a = armazenamento();
  salvarEstilo("c", a);
  assert.equal(a.dados[CHAVE_ESTILO], "c");
  salvarEstilo("<script>", a);
  assert.equal(a.dados[CHAVE_ESTILO], "c");
  assert.doesNotThrow(() => salvarEstilo("b", quebrado));
});

// ---------- WebGL e carga preguiçosa ----------
test("webglDisponivel: true com webgl2 ou webgl; false sem contexto ou com exceção", () => {
  const doc = (ctx) => ({ createElement: () => ({ getContext: (t) => ctx(t) }) });
  assert.equal(webglDisponivel(doc((t) => (t === "webgl2" ? {} : null))), true);
  assert.equal(webglDisponivel(doc((t) => (t === "webgl" ? {} : null))), true);
  assert.equal(webglDisponivel(doc(() => null)), false);
  assert.equal(webglDisponivel(doc(() => { throw new Error("x"); })), false);
  assert.equal(webglDisponivel(null), false);
});

test("carregarTeia: um único import() do bundle (promessa memorizada)", async () => {
  const chamadas = [];
  const importar = (u) => { chamadas.push(u); return Promise.resolve({ montarTeia() {} }); };
  const p1 = carregarTeia(importar);
  const p2 = carregarTeia(importar);
  assert.equal(p1, p2);
  await p1;
  assert.deepEqual(chamadas, ["/vendor/teia-3d.bundle.js"]);
  assert.equal(URL_BUNDLE_TEIA, "/vendor/teia-3d.bundle.js");
});

// ---------- painel de classes ----------
test("resumoDasClasses: ordem do backend, sem 'sentinela', contagem por estado", () => {
  const r = resumoDasClasses(lojaDemo());
  assert.deepEqual(r.map((c) => c.slug), ["wifi", "camera", "iot"]);
  const cam = r.find((c) => c.slug === "camera");
  assert.equal(cam.nome, "Câmeras");
  assert.equal(cam.total, 5);
  assert.deepEqual(cam.contagem, { online: 2, instavel: 1, offline: 1, pausado: 1, aguardando: 0 });
  assert.equal(cam.cor, "#E59866");
  assert.match(cam.rotulo, /^Câmeras: 5 equipamentos/);
  assert.match(cam.rotulo, /1 offline/);
  const iot = r.find((c) => c.slug === "iot");
  assert.equal(iot.total, 0);
  assert.equal(iot.vazia, true);
});

test("resumoDasClasses: cor inválida do backend não vai para o CSS", () => {
  const store = lojaDemo();
  store.classes.get("iot").cor = "red;background:url(x)";
  const iot = resumoDasClasses(store).find((c) => c.slug === "iot");
  assert.equal(iot.cor, "");
});

test("equipamentosDaClasse: piores estados primeiro, depois nome numérico; 50 por página", () => {
  const r = equipamentosDaClasse(lojaDemo(), "camera", 1);
  assert.deepEqual(r.itens.map((i) => i.id), ["c2", "c4", "c3", "c5", "c1"]);
  assert.equal(r.total, 5);
  assert.equal(r.paginas, 1);
  assert.equal(r.itens[0].estadoRotulo, "Offline");
  assert.equal(r.itens[0].estadoIcone, "#i-offline");

  const store = criarStore();
  aplicarSnapshot(store, {
    classes: [{ slug: "camera", nome: "Câmeras", cor: "#E59866", ordem: 4 }],
    equipamentos: Array.from({ length: 120 }, (_, n) => ({
      id: `e${n}`, nome: `Câmera ${n}`, ip: `10.99.10.${n}`, classe: "camera",
      estado: n === 77 ? "offline" : "online", desde: "2026-11-17T10:00:00Z",
    })),
  });
  const p1 = equipamentosDaClasse(store, "camera", 1);
  assert.equal(p1.itens.length, 50);
  assert.equal(p1.paginas, 3);
  assert.equal(p1.itens[0].id, "e77");
  assert.equal(p1.itens[1].nome, "Câmera 0");
  assert.equal(p1.itens[2].nome, "Câmera 1");
  const p3 = equipamentosDaClasse(store, "camera", 9);
  assert.equal(p3.pagina, 3);
  assert.equal(p3.itens.length, 20);
});

// ---------- painel do equipamento ----------
test("fichaDoEquipamento: nome, classe, IP, checagem, estado, há quanto, latência", () => {
  const store = lojaDemo();
  const agora = Date.parse("2026-11-17T10:10:00Z");
  const f = fichaDoEquipamento(store.itens.get("w1"), store, agora);
  assert.equal(f.id, "w1");
  assert.equal(f.nome, "AP Bloco A");
  assert.equal(f.classe, "Wi-Fi");
  assert.equal(f.ip, "10.99.20.10");
  assert.equal(f.checagem, "TCP 554");
  assert.equal(f.estadoRotulo, "Aguardando");
  assert.equal(f.estadoClasse, "estado st-desconhecido");
  assert.equal(f.desde, "há 10 minutos");
  assert.equal(f.latencia, "3.3 ms");
  assert.equal(f.pausado, false);
  assert.equal(fichaDoEquipamento(store.itens.get("c3"), store, agora).pausado, true);
});

test("linhaDeHistorico: rótulos de ESTADOS e data pt-BR", () => {
  const l = linhaDeHistorico({ id: 7, de: "online", para: "offline", em: "2026-11-17T13:05:00+00:00", duracao_s: null, causa: null });
  assert.equal(l.id, 7);
  assert.equal(l.de, "Online");
  assert.equal(l.para, "Offline");
  assert.equal(l.paraClasse, "st-offline");
  assert.match(l.data, /^17\/11\/2026,? \d{2}:\d{2}$/);
  assert.equal(l.dataIso, "2026-11-17T13:05:00+00:00");
  const estranho = linhaDeHistorico({ id: 8, de: "x<b>", para: "desconhecido", em: "lixo" });
  assert.equal(estranho.de, "x<b>"); // texto, nunca HTML (vai por x-text)
  assert.equal(estranho.para, "Aguardando");
  assert.equal(estranho.paraClasse, "st-desconhecido");
  assert.equal(estranho.data, "—");
  // suspeito parece online (§9.2), mas o histórico não mostra "Online → Online"
  assert.equal(linhaDeHistorico({ id: 9, de: "online", para: "suspeito", em: "x" }).para, "Online (verificando)");
});
