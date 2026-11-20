import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  COMANDO_NOVO_CODIGO,
  PASSOS,
  validarAdministrador,
  validarCodigoInstalacao,
  validarRede,
} from "../../src/js/primeiro-acesso.js";

const ler = (caminho) => readFileSync(new URL(caminho, import.meta.url), "utf8");

test("constantes do assistente", () => {
  assert.deepEqual(PASSOS, ["codigo", "administrador", "rede", "concluir"]);
  assert.equal(COMANDO_NOVO_CODIGO, "docker compose exec core python -m sentinela.cli codigo-instalacao");
});

test("test_codigo_aceita_minusculas_hifen_e_espaco", () => {
  for (const texto of ["abcd-2345", "ABCD 2345", "  abcd2345  ", "AbCd-2345", "ab cd-23 45"]) {
    const v = validarCodigoInstalacao(texto);
    assert.equal(v.ok, true, texto);
    assert.equal(v.codigo, "ABCD2345");
    assert.equal(v.erro, "");
  }
});

test("test_codigo_recusa_ambiguos_e_tamanho_errado", () => {
  for (const texto of ["", "   ", "ABCD-234", "ABCD-23456", "ABCD-2340", "ABCD-2341", "ABCDI234", "ABCDL234", "ABCDO234", "ABCD-23#5", "ABCD_2345", 5, null, undefined]) {
    const v = validarCodigoInstalacao(texto);
    assert.equal(v.ok, false, String(texto));
    assert.equal(v.codigo, "");
    assert.ok(v.erro.length > 0);
  }
});

test("test_rede_publica_barra_8_e_gateway_fora_recusados", () => {
  assert.deepEqual(validarRede("192.168.1.0/24", "192.168.1.1"), { ok: true, erro: "" });
  assert.deepEqual(validarRede("10.99.60.0/24", ""), { ok: true, erro: "" });
  assert.deepEqual(validarRede("172.16.0.0/16", "172.16.255.254"), { ok: true, erro: "" });
  assert.equal(validarRede("10.0.0.0/30", "10.0.0.1").ok, true);
  const publica = validarRede("8.8.8.0/24", "");
  assert.equal(publica.ok, false);
  assert.equal(publica.erro, "A sub-rede deve ser privada (RFC 1918).");
  const barra8 = validarRede("10.0.0.0/8", "");
  assert.equal(barra8.erro, "O prefixo da sub-rede deve ficar entre /16 e /30.");
  assert.equal(validarRede("192.168.1.0/31", "").erro, "O prefixo da sub-rede deve ficar entre /16 e /30.");
  assert.equal(validarRede("172.16.0.0/12", "").erro, "O prefixo da sub-rede deve ficar entre /16 e /30.");
  const MSG_CIDR = "Sub-rede inválida: use a notação CIDR da rede, ex. 10.99.0.0/24.";
  for (const ruim of ["", "banana", "192.168.1.5/24", "192.168.1.0", "192.168.1.0/", "192.168.001.0/24", "300.1.1.0/24", "192.168.1.0/24/1", "::1/64"]) {
    assert.equal(validarRede(ruim, "").erro, MSG_CIDR, ruim);
  }
  const MSG_GW = "O gateway precisa estar dentro da sub-rede.";
  for (const gw of ["192.168.2.1", "192.168.1.0", "192.168.1.255", "abc", "192.168.1.1.1", "192.168.1.256"]) {
    assert.deepEqual(validarRede("192.168.1.0/24", gw), { ok: false, erro: MSG_GW }, gw);
  }
});

test("administrador: login, regra de 12 caracteres e confirmação", () => {
  assert.equal(validarAdministrador("", "umasenhalonga1", "umasenhalonga1").ok, false);
  assert.equal(validarAdministrador("   ", "umasenhalonga1", "umasenhalonga1").ok, false);
  assert.equal(validarAdministrador("a".repeat(65), "umasenhalonga1", "umasenhalonga1").ok, false);
  assert.match(validarAdministrador("ana", "curta", "curta").erro, /pelo menos 12 caracteres/);
  assert.match(validarAdministrador("ana", "umasenhalonga1", "outrasenhalonga").erro, /não conferem/);
  assert.equal(validarAdministrador("a".repeat(64), "x".repeat(12), "x".repeat(12)).ok, true);
  assert.equal(validarAdministrador("ana", "x".repeat(1025), "x".repeat(1025)).ok, false);
});

test("test_codigo_nunca_vai_a_console_nem_storage", () => {
  for (const arquivo of ["../../src/js/primeiro-acesso.js", "../../src/js/primeiro-acesso-pagina.js"]) {
    const fonte = ler(arquivo);
    assert.doesNotMatch(fonte, /console\./, arquivo);
    assert.doesNotMatch(fonte, /localStorage|sessionStorage|indexedDB|document\.cookie|history\.(push|replace)State|location\.(search|hash)/, arquivo);
    assert.doesNotMatch(fonte, /innerHTML|insertAdjacentHTML|document\.write|eval\(/, arquivo);
  }
});

test("nginx: o limite do login vale para /api/v1/primeiro-acesso/", () => {
  const conf = ler("../../nginx/nginx.conf");
  const m = conf.match(/location \/api\/v1\/primeiro-acesso\/ \{([^}]*)\}/);
  assert.ok(m, "location do primeiro acesso ausente");
  assert.match(m[1], /limit_req zone=login burst=10 nodelay;/);
  assert.match(m[1], /include \/etc\/nginx\/proxy-core\.conf;/);
  assert.ok(conf.indexOf("primeiro-acesso/ {") < conf.indexOf("location /api/ {"));
});
