import test from "node:test";
import assert from "node:assert/strict";
import {
  chatsDoTexto, montarRemoverToken, montarTelegram, textoDosChats, validarTelegram,
  telegramDoPainel,
} from "../../src/js/config-telegram.js";
import { api } from "../../src/js/api.js";

// token fictício, só no formato
const TOKEN = "1234567890:AAExampleExampleExampleExampleExample12";

test("chatsDoTexto: uma linha ou vírgula por destino, sem vazios", () => {
  assert.deepEqual(chatsDoTexto("-1001234567890\n@canal_do_noc, 42 \n\n"), ["-1001234567890", "@canal_do_noc", "42"]);
  assert.deepEqual(chatsDoTexto(""), []);
  assert.deepEqual(chatsDoTexto(["1", " 2 "]), ["1", "2"]);
  assert.equal(textoDosChats(["1", "@abcde"]), "1\n@abcde");
});

test("validarTelegram: válido com token e 10 chats; token em branco é válido (mantém)", () => {
  const chats = Array.from({ length: 10 }, (_, i) => String(1000 + i)).join("\n");
  assert.deepEqual(validarTelegram({ token: TOKEN, chats, incluir_ip: false }), {});
  assert.deepEqual(validarTelegram({ token: "", chats: "123", incluir_ip: true }), {});
});

test("validarTelegram: 11 chats, repetidos e formato", () => {
  const onze = Array.from({ length: 11 }, (_, i) => String(1000 + i)).join("\n");
  assert.ok(validarTelegram({ token: "", chats: onze }).chats);
  assert.ok(validarTelegram({ token: "", chats: "1\n1" }).chats);
  assert.ok(validarTelegram({ token: "", chats: "abc" }).chats);
  assert.ok(validarTelegram({ token: "", chats: "@abc" }).chats); // @ com menos de 5 letras
  assert.deepEqual(validarTelegram({ token: "", chats: "@canal_ok" }), {});
});

test("validarTelegram: token malformado e sem eco do valor", () => {
  for (const ruim of ["abc", "123:curto", `${TOKEN} extra`, "1234567890:" + "é".repeat(35)]) {
    const e = validarTelegram({ token: ruim, chats: "1" });
    assert.ok(e.token, ruim);
    assert.ok(!e.token.includes(ruim));
  }
});

test("montarTelegram: campo de token vazio não manda token (não apaga)", () => {
  const corpo = montarTelegram({ token: "", chats: "1\n@canal_ok", incluir_ip: true });
  assert.deepEqual(corpo, { chats: ["1", "@canal_ok"], incluir_ip: true });
  assert.ok(!("token" in corpo));
  assert.ok(!("token" in montarTelegram({ token: "   ", chats: "", incluir_ip: false })));
  assert.deepEqual(montarTelegram({ token: ` ${TOKEN} `, chats: "7", incluir_ip: false }), {
    token: TOKEN, chats: ["7"], incluir_ip: false,
  });
});

test("montarRemoverToken apaga só o token", () => {
  assert.deepEqual(montarRemoverToken(), { token: "" });
});

test("entrarEmTelegram: carga que falhou tenta de novo na próxima visita; a que deu certo não repete", async () => {
  const original = api.verTelegram;
  let chamadas = 0;
  api.verTelegram = async () => {
    chamadas += 1;
    return chamadas === 1
      ? { ok: false, status: 0, dados: null, erro: "Sem conexão com o servidor." }
      : { ok: true, status: 200, dados: { token_definido: true, chats: ["1"], incluir_ip: false, ultimo_envio: null, ultimo_erro: null }, erro: "" };
  };
  try {
    const painel = telegramDoPainel();
    painel.admin = true;
    await painel.entrarEmTelegram();
    assert.equal(chamadas, 1);
    assert.equal(painel.tgErroGeral, "Sem conexão com o servidor.");
    await painel.entrarEmTelegram(); // visita seguinte: tenta de novo
    assert.equal(chamadas, 2);
    assert.equal(painel.tgErroGeral, "");
    assert.equal(painel.tg.definido, true);
    await painel.entrarEmTelegram(); // já carregou: não repete
    assert.equal(chamadas, 2);
  } finally {
    api.verTelegram = original;
  }
});
