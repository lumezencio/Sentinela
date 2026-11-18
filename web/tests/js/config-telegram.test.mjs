import test from "node:test";
import assert from "node:assert/strict";
import {
  chatsDoTexto, montarRemoverToken, montarTelegram, textoDosChats, validarTelegram,
} from "../../src/js/config-telegram.js";

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
