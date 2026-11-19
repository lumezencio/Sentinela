// Segurança: código do segundo fator, chave agrupada, linha de usuário e arquivo de códigos.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  agruparChave, linhaDoUsuario, textoCodigosParaBaixar, validarCodigoRecuperacao, validarCodigoTotp,
} from "../../src/js/config-seguranca.js";

test("test_codigo_totp_aceita_6_digitos_com_espaco", () => {
  for (const bom of ["123456", "123 456", " 123456 ", "1 2 3 4 5 6"]) {
    assert.deepEqual(validarCodigoTotp(bom), { ok: true, codigo: bom.replace(/\s/g, ""), erro: "" }, bom);
  }
});

test("test_codigo_totp_recusa_letras_e_5_digitos", () => {
  for (const ruim of ["", "12345", "1234567", "12345a", "abcdef", "123-456", null, undefined]) {
    const r = validarCodigoTotp(ruim);
    assert.equal(r.ok, false, String(ruim));
    assert.equal(r.codigo, "");
    assert.ok(r.erro.length > 0);
    assert.ok(!r.erro.includes(String(ruim)) || ruim === "" || ruim == null);
  }
});

test("test_codigo_recuperacao_aceita_minusculas_e_sem_hifen", () => {
  for (const bom of ["K7MQ2-XDP34", "k7mq2xdp34", "k7mq2 xdp34", " K7MQ2-XDP34 "]) {
    const r = validarCodigoRecuperacao(bom);
    assert.equal(r.ok, true, bom);
    assert.equal(r.codigo, "K7MQ2-XDP34");
  }
  for (const ruim of ["", "K7MQ2-XDP3", "K7MQ2-XDP345", "K7MQ2-XDP30", "K7MQ2-XDP3I", null]) {
    assert.equal(validarCodigoRecuperacao(ruim).ok, false, String(ruim));
  }
});

test("colar com espaço no começo: código do aplicativo e de recuperação", () => {
  assert.deepEqual(validarCodigoTotp(" 123 456"), { ok: true, codigo: "123456", erro: "" });
  assert.equal(validarCodigoRecuperacao(" k7mq2-xdp34").codigo, "K7MQ2-XDP34");
  assert.equal(validarCodigoRecuperacao(" K7MQ2 XDP34 ").ok, true);
});

test("test_agrupar_chave_32_em_8_blocos", () => {
  const chave = "JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP";
  const g = agruparChave(chave);
  assert.equal(g.split(" ").length, 8);
  assert.ok(g.split(" ").every((b) => b.length === 4));
  assert.equal(g.replace(/ /g, ""), chave);
  assert.equal(agruparChave("JBSW Y3DP"), "JBSW Y3DP"); // já agrupada: não duplica espaços
  assert.equal(agruparChave(""), "");
  assert.equal(agruparChave(null), "");
});

test("test_texto_para_baixar_tem_10_linhas_e_aviso", () => {
  const codigos = Array.from({ length: 10 }, (_, i) => `ABCD${i % 8 + 2}-EFGH${i % 8 + 2}`);
  const texto = textoCodigosParaBaixar(codigos);
  const linhas = texto.split("\n");
  assert.equal(linhas.filter((l) => /^\d+\. [A-Z0-9]{5}-[A-Z0-9]{5}$/.test(l)).length, 10);
  assert.match(texto, /cada código vale uma vez/i);
  assert.match(texto, /guarde/i);
  assert.ok(texto.endsWith("\n"));
  for (const c of codigos) assert.ok(texto.includes(c));
});

test("test_linha_do_usuario_sem_totp_nao_oferece_zerar", () => {
  assert.deepEqual(linhaDoUsuario({ id: 2, login: "joana", papel: "admin", totp_ativo: false }), {
    id: 2, login: "joana", papel: "Administrador", totp: "Segundo fator desligado", podeZerar: false,
  });
  const com = linhaDoUsuario({ id: 3, login: "pedro", papel: "visualizador", totp_ativo: true });
  assert.equal(com.podeZerar, true);
  assert.equal(com.papel, "Visualizador");
  assert.equal(com.totp, "Segundo fator ativo");
  const longo = "u".repeat(64);
  assert.equal(linhaDoUsuario({ id: 4, login: longo, papel: "admin", totp_ativo: true }).login, longo);
});

test("segredo e códigos nunca vão a console nem localStorage (varre os módulos)", () => {
  for (const arq of ["config-seguranca.js", "config-backup.js", "seguranca.js", "login.js"]) {
    const fonte = readFileSync(new URL(`../../src/js/${arq}`, import.meta.url), "utf8");
    assert.ok(!/console\./.test(fonte), `${arq}: console`);
    assert.ok(!/localStorage|sessionStorage|indexedDB/.test(fonte), `${arq}: armazenamento`);
    assert.ok(!/innerHTML|outerHTML|insertAdjacentHTML|document\.write/.test(fonte), `${arq}: HTML`);
  }
});
