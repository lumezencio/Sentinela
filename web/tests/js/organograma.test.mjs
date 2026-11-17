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
  assert.deepEqual(cameras.contagem, { online: 3, instavel: 1, offline: 2, pausado: 1, aguardando: 1 });
});

test("organograma: GRAVIDADE crescente do pior ao melhor", () => {
  const ordem = ["offline", "instavel", "suspeito", "desconhecido", "pausado", "online"];
  for (let i = 1; i < ordem.length; i++) assert.ok(GRAVIDADE[ordem[i - 1]] < GRAVIDADE[ordem[i]]);
});

test("organograma: filtro por estado mantém só as classes com itens no estado", () => {
  const org = montarOrganograma(lojaDemo(), { ...SEM_FILTRO, estado: "offline" });
  assert.deepEqual(org.map((c) => c.slug), ["camera"]);
  assert.deepEqual(org[0].itens.map((i) => i.id), ["c6", "c8"]);
  assert.equal(org[0].total, 2);
  assert.deepEqual(org[0].contagem, { online: 0, instavel: 0, offline: 2, pausado: 0, aguardando: 0 });
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
    ["estadoClasse", "estadoIcone", "estadoRotulo", "id", "nome", "peso"]);
  assert.equal(p1.itens[0].estadoClasse, "estado st-offline");
  assert.equal(p1.itens[0].estadoIcone, "#i-offline");
  assert.equal(paginaDoCartao(cartao, 99).pagina, 3);
  assert.equal(paginaDoCartao(cartao, 99).itens.length, 20);
  assert.equal(paginaDoCartao(cartao, 0).pagina, 1);
});
