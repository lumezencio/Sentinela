import test from "node:test";
import assert from "node:assert/strict";
import { aplicarSnapshot, criarStore } from "../../src/js/lista.js";
import { hashTexto as hashTeia } from "../../src/js/teia/hash.js";
import { corDaClasse, PALETA_RESERVA as PALETA_TEIA } from "../../src/js/teia/aparencia.js";
import {
  corSeguraDaClasse, GRAVIDADE, hashTexto, montarOrganograma, PALETA_RESERVA, paginaDoCartao,
} from "../../src/js/organograma.js";

const SEM_FILTRO = { classe: "", estado: "", busca: "" };

function lojaDemo() {
  const store = criarStore();
  aplicarSnapshot(store, {
    classes: [
      { slug: "sentinela", nome: "Sentinela", cor: "#8793E8", ordem: 0 },
      { slug: "camera", nome: "Câmeras", cor: "#5B8DEF", ordem: 2 },
      { slug: "roteador", nome: "Roteadores", cor: "#C9C46A", ordem: 1 },
      { slug: "iot", nome: "IoT", cor: "vermelho", ordem: 3 },
      { slug: "impressora", nome: "Impressoras", cor: "#ABCDEF", ordem: 4 },
    ],
    equipamentos: [
      { id: "s", nome: "Servidor", ip: "10.99.0.1", classe: "sentinela", estado: "online" },
      { id: "c1", nome: "Cam 10", ip: "10.99.1.10", classe: "camera", estado: "online" },
      { id: "c2", nome: "Cam 2", ip: "10.99.1.2", classe: "camera", estado: "pausado" },
      { id: "c3", nome: "Cam 3", ip: "10.99.1.3", classe: "camera", estado: "desconhecido" },
      { id: "c4", nome: "Cam 4", ip: "10.99.1.4", classe: "camera", estado: "suspeito" },
      { id: "c5", nome: "Cam 5", ip: "10.99.1.5", classe: "camera", estado: "instavel" },
      { id: "c6", nome: "Cam 6", ip: "10.99.1.6", classe: "camera", estado: "offline" },
      { id: "c7", nome: "Cam 1", ip: "10.99.1.1", classe: "camera", estado: "online" },
      { id: "c8", nome: "Cam 9", ip: "10.99.1.9", classe: "camera", estado: "offline" },
      { id: "r1", nome: "Roteador A", ip: "10.99.2.1", classe: "roteador", estado: "online" },
      { id: "i1", nome: "Sensor", ip: "10.99.3.1", classe: "iot", estado: "estranho" },
    ],
  });
  return store;
}

test("organograma: uma entrada por classe na ordem Classe.ordem, sem sentinela e sem vazias", () => {
  const org = montarOrganograma(lojaDemo(), SEM_FILTRO);
  assert.deepEqual(org.map((c) => c.slug), ["roteador", "camera", "iot"]);
  assert.ok(!org.some((c) => c.slug === "sentinela"));
  assert.ok(!org.some((c) => c.slug === "impressora")); // classe sem itens omitida
});

test("organograma: itens por gravidade (offline, instável, suspeito, aguardando, pausado, online) e nome numérico", () => {
  const cameras = montarOrganograma(lojaDemo(), SEM_FILTRO).find((c) => c.slug === "camera");
  assert.deepEqual(
    cameras.itens.map((i) => i.id),
    ["c6", "c8", "c5", "c4", "c3", "c2", "c7", "c1"],
  );
  assert.equal(cameras.total, 8);
  assert.equal(cameras.nome, "Câmeras");
  assert.equal(cameras.cor, "#5B8DEF");
  assert.deepEqual(cameras.contagem, { online: 3, instavel: 1, offline: 2, pausado: 1, aguardando: 1, inalcancavel: 0 });
});

test("organograma: GRAVIDADE crescente do pior ao melhor", () => {
  const ordem = ["offline", "inalcancavel", "instavel", "suspeito", "desconhecido", "pausado", "online"];
  for (let i = 1; i < ordem.length; i++) assert.ok(GRAVIDADE[ordem[i - 1]] < GRAVIDADE[ordem[i]]);
});

test("organograma: filtro por estado mantém só as classes com itens no estado", () => {
  const org = montarOrganograma(lojaDemo(), { ...SEM_FILTRO, estado: "offline" });
  assert.deepEqual(org.map((c) => c.slug), ["camera"]);
  assert.deepEqual(org[0].itens.map((i) => i.id), ["c6", "c8"]);
  assert.equal(org[0].total, 2);
  assert.deepEqual(org[0].contagem, { online: 0, instavel: 0, offline: 2, pausado: 0, aguardando: 0, inalcancavel: 0 });
});

test("organograma: filtros de classe e busca (os mesmos da Lista)", () => {
  assert.deepEqual(
    montarOrganograma(lojaDemo(), { ...SEM_FILTRO, classe: "roteador" }).map((c) => c.slug),
    ["roteador"],
  );
  const busca = montarOrganograma(lojaDemo(), { ...SEM_FILTRO, busca: "10.99.1.1" });
  assert.deepEqual(busca.map((c) => c.slug), ["camera"]);
  assert.deepEqual(busca[0].itens.map((i) => i.id), ["c7", "c1"]); // 10.99.1.1 e 10.99.1.10
  assert.deepEqual(montarOrganograma(lojaDemo(), { ...SEM_FILTRO, busca: "nada-disso" }), []);
  // a classe do servidor nunca vira cartão, nem filtrada diretamente
  assert.deepEqual(montarOrganograma(lojaDemo(), { ...SEM_FILTRO, classe: "sentinela" }), []);
});

test("organograma: estado desconhecido pelo front conta como aguardando", () => {
  const iot = montarOrganograma(lojaDemo(), SEM_FILTRO).find((c) => c.slug === "iot");
  assert.equal(iot.contagem.aguardando, 1);
});

test("corSeguraDaClasse: #rrggbb do backend; inválida → reserva por hash do slug (igual à Teia)", () => {
  assert.equal(corSeguraDaClasse({ slug: "x", cor: "#a1B2c3" }), "#a1B2c3");
  for (const cor of ["vermelho", "#fff", "#12345g", "red; x: y", "", null, undefined, "url(x)"]) {
    const classe = { slug: "camera", cor };
    assert.equal(corSeguraDaClasse(classe), corDaClasse(classe), String(cor));
    assert.match(corSeguraDaClasse(classe), /^#[0-9A-Fa-f]{6}$/);
  }
  assert.equal(corSeguraDaClasse(undefined), corDaClasse(undefined));
  const iot = montarOrganograma(lojaDemo(), SEM_FILTRO).find((c) => c.slug === "iot");
  assert.equal(iot.cor, corDaClasse({ slug: "iot", cor: "vermelho" }));
});

test("cópias da Teia: paleta de reserva e hash iguais aos do bundle", () => {
  assert.deepEqual(PALETA_RESERVA, PALETA_TEIA);
  for (const t of ["", "camera", "iot", "ação", "x".repeat(50)]) assert.equal(hashTexto(t), hashTeia(t));
});

test("paginaDoCartao: 50 por cartão, página limitada, peso por gravidade", () => {
  const store = criarStore();
  const equipamentos = [];
  for (let n = 1; n <= 120; n++) {
    equipamentos.push({
      id: `c${n}`, nome: `Cam ${n}`, ip: `10.99.1.${n}`, classe: "camera",
      estado: n % 10 === 0 ? "offline" : "online",
    });
  }
  aplicarSnapshot(store, {
    classes: [{ slug: "camera", nome: "Câmeras", cor: "#5B8DEF", ordem: 2 }],
    equipamentos,
  });
  const [cartao] = montarOrganograma(store, SEM_FILTRO);
  const p1 = paginaDoCartao(cartao, 1);
  assert.equal(p1.itens.length, 50);
  assert.equal(p1.pagina, 1);
  assert.equal(p1.paginas, 3);
  assert.equal(p1.itens[0].peso, GRAVIDADE.offline);
  assert.equal(p1.itens[0].nome, "Cam 10");
  assert.equal(p1.itens[12].peso, GRAVIDADE.online);
  assert.deepEqual(Object.keys(p1.itens[0]).sort(),
    ["estadoClasse", "estadoIcone", "estadoRotulo", "id", "ip", "nome", "peso"]);
  assert.equal(p1.itens[0].ip, "10.99.1.10");
  assert.equal(p1.itens[0].estadoClasse, "estado st-offline");
  assert.equal(p1.itens[0].estadoIcone, "#i-offline");
  assert.equal(paginaDoCartao(cartao, 99).pagina, 3);
  assert.equal(paginaDoCartao(cartao, 99).itens.length, 20);
  assert.equal(paginaDoCartao(cartao, 0).pagina, 1);
});

// ---------- Fase 3: câmeras atrás do gravador ----------
function lojaComGravador() {
  const store = criarStore();
  aplicarSnapshot(store, {
    classes: [
      { slug: "camera", nome: "Câmeras", cor: "#5B8DEF", ordem: 2 },
      { slug: "gravador", nome: "Gravadores", cor: "#B79CE8", ordem: 3 },
    ],
    equipamentos: [
      { id: "n1", nome: "NVR Bloco B", ip: "10.99.50.10", classe: "gravador", estado: "online" },
      { id: "n2", nome: "NVR Bloco A", ip: "10.99.50.11", classe: "gravador", estado: "online" },
      { id: "solta", nome: "Cam Solta", ip: "10.99.1.2", classe: "camera", estado: "online" },
      { id: "solta2", nome: "Cam Caída", ip: "10.99.1.3", classe: "camera", estado: "offline" },
      { id: "f2", nome: "Canal 2", ip: "192.168.254.2", classe: "camera", estado: "online", pai_id: "n1", canal: 2 },
      { id: "f1", nome: "Canal 1", ip: "192.168.254.1", classe: "camera", estado: "offline", pai_id: "n1", canal: 1 },
      { id: "g1", nome: "Portão", ip: "192.168.254.1", classe: "camera", estado: "online", pai_id: "n2", canal: 1 },
    ],
  });
  return store;
}

test("organograma: câmeras de gravador vêm agrupadas sob ele, depois das soltas", () => {
  const cameras = montarOrganograma(lojaComGravador(), SEM_FILTRO).find((c) => c.slug === "camera");
  // soltas por gravidade; depois cada gravador (por nome), filhos por gravidade e canal
  assert.deepEqual(cameras.itens.map((i) => i.id), ["solta2", "solta", "g1", "f1", "f2"]);
  const p = paginaDoCartao(cameras, 1);
  assert.deepEqual(
    p.grupos.map((g) => [g.titulo, g.itens.map((i) => i.id)]),
    [["", ["solta2", "solta"]], ["Atrás de NVR Bloco A", ["g1"]], ["Atrás de NVR Bloco B", ["f1", "f2"]]],
  );
  assert.equal(new Set(p.grupos.map((g) => g.chave)).size, 3);
  // o formato dos itens não muda (a grade antiga continua valendo)
  assert.deepEqual(Object.keys(p.itens[0]).sort(),
    ["estadoClasse", "estadoIcone", "estadoRotulo", "id", "ip", "nome", "peso"]);
});

test("organograma: sem filhos há um único grupo sem título", () => {
  const p = paginaDoCartao(montarOrganograma(lojaDemo(), SEM_FILTRO).find((c) => c.slug === "camera"), 1);
  assert.equal(p.grupos.length, 1);
  assert.equal(p.grupos[0].titulo, "");
  assert.equal(p.grupos[0].itens.length, p.itens.length);
});

test("organograma: gravador que não está no store aparece como 'gravador'", () => {
  const store = lojaComGravador();
  store.itens.delete("n2");
  const cameras = montarOrganograma(store, SEM_FILTRO).find((c) => c.slug === "camera");
  const titulos = paginaDoCartao(cameras, 1).grupos.map((g) => g.titulo);
  assert.ok(titulos.includes("Atrás do gravador"), titulos);
});

test("organograma: inalcançável vem depois do offline e antes do instável; GRAVIDADE do brief", () => {
  assert.deepEqual(GRAVIDADE, {
    offline: 0, inalcancavel: 1, instavel: 2, suspeito: 3, desconhecido: 4, pausado: 5, online: 6,
  });
  const store = criarStore();
  aplicarSnapshot(store, {
    classes: [{ slug: "camera", nome: "Câmeras", cor: "#5B8DEF", ordem: 1 }],
    equipamentos: [
      { id: "a", nome: "A", ip: "10.99.1.1", classe: "camera", estado: "instavel" },
      { id: "b", nome: "B", ip: "10.99.1.2", classe: "camera", estado: "inalcancavel" },
      { id: "c", nome: "C", ip: "10.99.1.3", classe: "camera", estado: "offline" },
      { id: "d", nome: "D", ip: "10.99.1.4", classe: "camera", estado: "online" },
    ],
  });
  const [cartao] = montarOrganograma(store, SEM_FILTRO);
  assert.deepEqual(cartao.itens.map((i) => i.id), ["c", "b", "a", "d"]);
  assert.equal(cartao.contagem.inalcancavel, 1);
  const pag = paginaDoCartao(cartao, 1);
  assert.equal(pag.itens[1].estadoIcone, "#i-inalcancavel");
  assert.equal(pag.itens[1].estadoRotulo, "Inalcançável");
});

test("organograma: dependente comum (sem canal) não vira 'Atrás do gravador'", () => {
  const store = criarStore();
  aplicarSnapshot(store, {
    classes: [{ slug: "camera", nome: "Câmeras", cor: "#5B8DEF", ordem: 1 }],
    equipamentos: [
      { id: "sw", nome: "Switch", ip: "10.99.1.1", classe: "camera", estado: "online" },
      { id: "x", nome: "X", ip: "10.99.1.2", classe: "camera", estado: "online", pai_id: "sw" },
    ],
  });
  const [cartao] = montarOrganograma(store, SEM_FILTRO);
  const grupos = paginaDoCartao(cartao, 1).grupos;
  assert.equal(grupos.length, 1);
  assert.equal(grupos[0].titulo, "");
});

test("paginaDoCartao: IP do item como a API manda (câmera de gravador incluída), hostil vira texto", () => {
  const store = criarStore();
  aplicarSnapshot(store, {
    classes: [
      { slug: "gravador", nome: "Gravadores", cor: "#5B8DEF", ordem: 1 },
      { slug: "camera", nome: "Câmeras", cor: "#5B8DEF", ordem: 2 },
    ],
    equipamentos: [
      { id: "g", nome: "NVR A", ip: "10.99.2.1", classe: "gravador", estado: "online" },
      { id: "k", nome: "Cam canal 3", ip: "10.99.2.1", classe: "camera", estado: "online", pai_id: "g", canal: 3 },
      { id: "h", nome: "<b>x</b>", ip: "<script>1</script>", classe: "camera", estado: "online" },
      { id: "z", nome: "Sem IP", ip: null, classe: "camera", estado: "online" },
    ],
  });
  const cartoes = montarOrganograma(store, SEM_FILTRO);
  const cam = paginaDoCartao(cartoes.find((c) => c.slug === "camera"), 1).itens;
  const porId = Object.fromEntries(cam.map((q) => [q.id, q]));
  assert.equal(porId.k.ip, "10.99.2.1");
  assert.equal(porId.h.ip, "<script>1</script>");
  assert.equal(porId.z.ip, "");
});

test("organograma: classe aparece com o 1o equipamento e some ao esvaziar (ao vivo)", () => {
  const store = lojaDemo();
  assert.ok(!montarOrganograma(store, SEM_FILTRO).some((c) => c.slug === "impressora"));
  store.itens.set("p1", { id: "p1", nome: "Impressora 1", ip: "10.99.4.1", classe: "impressora", estado: "pausado" });
  assert.ok(montarOrganograma(store, SEM_FILTRO).some((c) => c.slug === "impressora"));
  store.itens.get("p1").classe = "roteador"; // reclassificado: impressora esvazia
  assert.ok(!montarOrganograma(store, SEM_FILTRO).some((c) => c.slug === "impressora"));
});
