import test from "node:test";
import assert from "node:assert/strict";
import {
  agruparPorGravador, cartaoDaDescoberta, cidr24, dadosDeAprovacao, dividirLote, foiEditada, percentual, POR_PAGINA_NOVOS, rotuloOrigem,
  sinaisLegiveis, textoSeguro,
} from "../../src/js/novos.js";

const NOMES = { camera: "Câmeras", gravador: "Gravadores", controle_acesso: "Controle de acesso" };

function desc(id, extra = {}) {
  return {
    id,
    ip: "10.99.10.200",
    mac: "02:00:00:fd:00:0f",
    fabricante: null,
    nome_sugerido: null,
    classe_sugerida: null,
    confianca: 0,
    sinais: [],
    origens: [],
    status: "pendente",
    fora_das_subredes: false,
    conflito_com_nome: null,
    pai_equipamento_id: null,
    canal: null,
    gravador_fonte_id: null,
    ...extra,
  };
}

test("página da fila: 100 por vez", () => {
  assert.equal(POR_PAGINA_NOVOS, 100);
});

test("sinaisLegiveis: descrição e pontos por classe em linguagem simples, maior primeiro", () => {
  const r = sinaisLegiveis(
    [
      { descricao: "Fabricante Hikvision", pontos: { gravador: 20, camera: 30 } },
      { descricao: "Porta 554 (vídeo RTSP) aberta", pontos: { camera: 40 } },
    ],
    NOMES,
  );
  assert.deepEqual(r, [
    { texto: "Fabricante Hikvision", pontos: "+30 Câmeras · +20 Gravadores" },
    { texto: "Porta 554 (vídeo RTSP) aberta", pontos: "+40 Câmeras" },
  ]);
});

test("sinaisLegiveis: pontos negativos com sinal de menos, zero omitido, classe sem nome usa o slug", () => {
  const r = sinaisLegiveis([{ descricao: "Nome de impressora", pontos: { camera: -20, iot: 0, xyz: 5 } }], NOMES);
  assert.deepEqual(r, [{ texto: "Nome de impressora", pontos: "+5 xyz · −20 Câmeras" }]);
});

test("sinaisLegiveis: texto hostil passa como texto (sem controle, truncado), nunca vira HTML", () => {
  const hostil = '<img src=x onerror="alert(1)">\u0000\u001b[31m' + "a".repeat(300);
  const [s] = sinaisLegiveis([{ descricao: hostil, pontos: { camera: 10 } }], NOMES);
  assert.ok(s.texto.startsWith('<img src=x onerror="alert(1)">'), "o texto chega intacto para o x-text");
  assert.ok(!/[\u0000-\u001f\u007f]/.test(s.texto), "sem caracteres de controle");
  assert.ok(s.texto.length <= 200);
});

test("sinaisLegiveis: entrada malformada vira lista vazia ou é ignorada", () => {
  assert.deepEqual(sinaisLegiveis(null, NOMES), []);
  assert.deepEqual(sinaisLegiveis("x", NOMES), []);
  assert.deepEqual(
    sinaisLegiveis([null, { descricao: 3 }, { descricao: "ok", pontos: "x" }, { descricao: "ok2" }], NOMES),
    [{ texto: "ok", pontos: "" }, { texto: "ok2", pontos: "" }],
  );
  // pontos não inteiros (ou de chave __proto__) não entram
  const r = sinaisLegiveis([{ descricao: "a", pontos: { camera: "30", gravador: 1.5, ["__proto__"]: 9 } }], NOMES);
  assert.deepEqual(r, [{ texto: "a", pontos: "" }]);
});

test("textoSeguro: tira controles, corta no limite, aceita não-texto", () => {
  assert.equal(textoSeguro("a\u0007b\nc"), "abc");
  assert.equal(textoSeguro("x".repeat(10), 4), "xxxx");
  assert.equal(textoSeguro(null), "");
  assert.equal(textoSeguro(42), "42");
});

test("agruparPorGravador: canais sob o gravador (pela origem), por canal, na ordem de chegada", () => {
  const nvr = desc("g", {
    ip: "10.99.50.10",
    nome_sugerido: "NVR demonstração",
    origens: [{ origem: "gravador", fonte_id: "F1" }],
  });
  const c2 = desc("c2", { canal: 2, gravador_fonte_id: "F1", origens: [{ origem: "gravador_canal", fonte_id: "F1" }] });
  const c1 = desc("c1", { canal: 1, gravador_fonte_id: "F1" });
  const pc = desc("pc", { ip: "10.99.60.150" });
  const r = agruparPorGravador([c2, pc, nvr, c1]);
  assert.equal(r.length, 2);
  assert.equal(r[0].gravador, nvr); // grupo nasce no 1º canal, cabeça é o gravador
  assert.deepEqual(r[0].canais.map((d) => d.id), ["c1", "c2"]);
  assert.equal(r[1].gravador, pc);
  assert.deepEqual(r[1].canais, []);
  // chaves estáveis e únicas para o x-for
  assert.equal(new Set(r.map((g) => g.chave)).size, r.length);
});

test("agruparPorGravador: canal órfão (gravador fora da página ou já aprovado) fica num grupo sem cabeça", () => {
  const c5 = desc("c5", { canal: 5, gravador_fonte_id: "F9", pai_equipamento_id: "eq-nvr" });
  const c3 = desc("c3", { canal: 3, gravador_fonte_id: "F9" });
  const r = agruparPorGravador([c5, c3]);
  assert.equal(r.length, 1);
  assert.equal(r[0].gravador, null);
  assert.equal(r[0].fonteId, "F9");
  assert.deepEqual(r[0].canais.map((d) => d.id), ["c3", "c5"]);
});

test("agruparPorGravador: dois gravadores não se misturam; lista vazia ou inválida", () => {
  const a = desc("a", { origens: [{ origem: "gravador", fonte_id: "FA" }] });
  const b = desc("b", { origens: [{ origem: "gravador", fonte_id: "FB" }] });
  const ca = desc("ca", { canal: 1, gravador_fonte_id: "FA" });
  const cb = desc("cb", { canal: 1, gravador_fonte_id: "FB" });
  const r = agruparPorGravador([a, b, cb, ca]);
  assert.deepEqual(r.map((g) => [g.gravador.id, g.canais.map((d) => d.id)]), [["a", ["ca"]], ["b", ["cb"]]]);
  assert.deepEqual(agruparPorGravador([]), []);
  assert.deepEqual(agruparPorGravador(null), []);
});

test("cidr24: /24 do IPv4; inválido vira vazio", () => {
  assert.equal(cidr24("10.99.70.20"), "10.99.70.0/24");
  assert.equal(cidr24("192.168.1.255"), "192.168.1.0/24");
  assert.equal(cidr24("10.99.70"), "");
  assert.equal(cidr24("10.99.70.300"), "");
  assert.equal(cidr24("<b>"), "");
  assert.equal(cidr24(null), "");
});

test("percentual: 0–100 inteiro, nunca NaN", () => {
  assert.equal(percentual(0.857), 86);
  assert.equal(percentual(1), 100);
  assert.equal(percentual(1.7), 100);
  assert.equal(percentual(-1), 0);
  assert.equal(percentual("x"), 0);
});

test("rotuloOrigem: nomes conhecidos; desconhecido passa como texto seguro", () => {
  assert.equal(rotuloOrigem("dhcp"), "DHCP");
  assert.equal(rotuloOrigem("gravador_canal"), "Canal do gravador");
  assert.equal(rotuloOrigem("novo\u0000tipo"), "novotipo");
});

test("cartaoDaDescoberta: título, meta, selos, confiança com texto e cidr do botão", () => {
  const d = desc("x", {
    ip: "10.99.70.20",
    nome_sugerido: "tv-sala-reuniao",
    fabricante: "Samsung",
    classe_sugerida: "camera",
    confianca: 0.86,
    fora_das_subredes: true,
    conflito_com_nome: "Câmera Portão",
    origens: [{ origem: "dhcp", fonte_id: "F" }, { origem: "dhcp", fonte_id: "G" }, { origem: "arp", fonte_id: "F" }],
    sinais: [{ descricao: "Fabricante Samsung", pontos: { camera: 5 } }],
  });
  const c = cartaoDaDescoberta(d, NOMES);
  assert.equal(c.titulo, "tv-sala-reuniao");
  assert.equal(c.pct, 86);
  assert.equal(c.pctTexto, "86%");
  assert.equal(c.classe, "camera");
  assert.equal(c.classeNome, "Câmeras");
  assert.equal(c.fora, true);
  assert.equal(c.cidr, "10.99.70.0/24");
  assert.equal(c.rotuloDeclarar, "Declarar sub-rede 10.99.70.0/24");
  assert.equal(c.conflito, "conflito de IP com Câmera Portão");
  assert.deepEqual(c.origens, ["DHCP", "ARP"]); // sem repetição
  assert.equal(c.sinais.length, 1);
  assert.equal(c.porqueTitulo, "Por que Câmeras?");
  // sem nome sugerido: o IP é o título; sem classe: "Desconhecido"
  const s = cartaoDaDescoberta(desc("y", { ip: "10.99.1.9" }), NOMES);
  assert.equal(s.titulo, "10.99.1.9");
  assert.equal(s.classeNome, "Desconhecido");
  assert.equal(s.fora, false);
  assert.equal(s.conflito, "");
  // canal: rótulo e sem "Declarar sub-rede"
  const ch = cartaoDaDescoberta(desc("z", { canal: 4, gravador_fonte_id: "F", fora_das_subredes: true }), NOMES);
  assert.equal(ch.canalRotulo, "Canal 4");
  assert.equal(ch.fora, false);
});

test("dividirLote: linhas com classe ou nome editados vão uma a uma, com os dados da edição", () => {
  const a = desc("a", { classe_sugerida: null, nome_sugerido: "cam-a" });
  const b = desc("b", { classe_sugerida: "camera", nome_sugerido: "cam-b" });
  const c = desc("c", { classe_sugerida: "camera", nome_sugerido: "cam-c" });
  const d = desc("d", { classe_sugerida: "iot" });
  const edicoes = new Map([
    ["a", { classe: "camera" }], // Desconhecido → Câmeras
    ["b", { classe: "camera", nome: "cam-b" }], // mexeu mas voltou ao sugerido: sem edição
    ["c", { nome: "  Portão Norte " }], // só o nome
  ]);
  const r = dividirLote(["a", "b", "c", "d", "sumiu"], [a, b, c, d], edicoes);
  assert.deepEqual(r.individuais, [
    { id: "a", dados: { classe: "camera" } },
    { id: "c", dados: { classe: "camera", nome: "Portão Norte" } },
  ]);
  assert.deepEqual(r.lote, ["b", "d"]);
  assert.deepEqual(dividirLote(["d"], [d], new Map()), { individuais: [], lote: ["d"] });
});

test("dadosDeAprovacao/foiEditada: padrão é a classe sugerida (ou desconhecido) sem nome", () => {
  const x = desc("x", { classe_sugerida: null, nome_sugerido: "n" });
  assert.deepEqual(dadosDeAprovacao(x, undefined), { classe: "desconhecido" });
  assert.equal(foiEditada(x, undefined), false);
  assert.equal(foiEditada(x, { classe: "desconhecido", nome: "n" }), false);
  assert.equal(foiEditada(x, { nome: "outro" }), true);
});
