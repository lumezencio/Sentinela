import test from "node:test";
import assert from "node:assert/strict";
import {
  cartaoDaFonte, formatarImpressao, formularioFonte, montarFonte, orientacaoErro, rotuloTipoFonte,
  TIPOS_FONTE, validarFonte, valoresIniciais,
} from "../../src/js/configuracoes.js";

const nomes = (campos) => campos.map((c) => c.nome);

test("tipos que o admin cria: os quatro da API (a simulada é só da demonstração)", () => {
  assert.deepEqual(TIPOS_FONTE.map((t) => t.tipo), ["mikrotik", "snmp", "hikvision", "dahua"]);
  assert.equal(rotuloTipoFonte("simulada"), "Simulada");
  assert.equal(rotuloTipoFonte("snmp"), "SNMP");
  assert.equal(rotuloTipoFonte("??"), "??");
});

test("formularioFonte: MikroTik e gravadores pedem usuário e senha; TLS só onde existe", () => {
  for (const tipo of ["mikrotik", "hikvision", "dahua"]) {
    const campos = formularioFonte(tipo);
    assert.deepEqual(nomes(campos), ["nome", "host", "porta", "tls", "intervalo_s", "ativa", "usuario", "senha"], tipo);
    const senha = campos.find((c) => c.nome === "senha");
    assert.equal(senha.tipo, "password");
    assert.equal(senha.obrigatorio, true);
  }
  assert.ok(!nomes(formularioFonte("snmp")).includes("tls"));
});

test("formularioFonte: SNMP v2c pede comunidade; v3 pede usuário e senhas", () => {
  assert.deepEqual(
    nomes(formularioFonte("snmp", { versao: "2c" })),
    ["nome", "host", "porta", "intervalo_s", "ativa", "versao", "comunidade"],
  );
  const v3 = formularioFonte("snmp", { versao: "3" });
  assert.deepEqual(
    nomes(v3),
    ["nome", "host", "porta", "intervalo_s", "ativa", "versao", "usuario", "auth", "senha_auth", "priv", "senha_priv"],
  );
  assert.equal(v3.find((c) => c.nome === "senha_auth").tipo, "password");
  assert.equal(v3.find((c) => c.nome === "senha_auth").obrigatorio, true);
  assert.equal(formularioFonte("snmp").find((c) => c.nome === "comunidade").tipo, "password");
});

test("formularioFonte: na edição os segredos não são obrigatórios e dizem 'deixe em branco para manter'", () => {
  const campos = formularioFonte("mikrotik", { edicao: true });
  const senha = campos.find((c) => c.nome === "senha");
  assert.equal(senha.obrigatorio, false);
  assert.match(senha.dica, /deixe em branco para manter/);
  assert.equal(campos.find((c) => c.nome === "usuario").obrigatorio, false);
});

test("valoresIniciais: senha nunca volta preenchida; edição traz só os dados não secretos", () => {
  const fonte = {
    id: "f1", tipo: "mikrotik", nome: "Borda", host: "10.99.40.1", porta: 8729, tls: true,
    ativa: true, intervalo_s: 900, credencial_definida: true,
  };
  const v = valoresIniciais(fonte);
  assert.equal(v.nome, "Borda");
  assert.equal(v.porta, "8729");
  assert.equal(v.intervalo_s, "900");
  for (const segredo of ["senha", "comunidade", "senha_auth", "senha_priv", "usuario"]) assert.equal(v[segredo], "");
  const novo = valoresIniciais(null, "snmp");
  assert.equal(novo.tls, false);
  assert.equal(novo.versao, "2c");
  assert.equal(novo.intervalo_s, "600");
  assert.equal(valoresIniciais(null, "mikrotik").tls, true);
});

test("validarFonte: campos obrigatórios, porta e intervalo dentro dos limites", () => {
  const e = validarFonte("mikrotik", { nome: " ", host: "", porta: "70000", intervalo_s: "100", usuario: "", senha: "" });
  assert.deepEqual(Object.keys(e).sort(), ["host", "intervalo_s", "nome", "porta", "senha", "usuario"]);
  const ok = validarFonte("hikvision", {
    nome: "NVR", host: "10.99.50.10", porta: "", intervalo_s: "600", usuario: "admin", senha: "x",
  });
  assert.deepEqual(ok, {});
});

test("validarFonte: SNMP v3 exige usuário e senha de autenticação (8+); privacidade com senha", () => {
  const base = { nome: "SW", host: "10.99.40.10", porta: "", intervalo_s: "600", versao: "3" };
  const e = validarFonte("snmp", { ...base, usuario: "", senha_auth: "curta" });
  assert.ok(e.usuario && e.senha_auth);
  const p = validarFonte("snmp", { ...base, usuario: "u", auth: "SHA", senha_auth: "12345678", priv: "AES", senha_priv: "" });
  assert.ok(p.senha_priv);
  assert.deepEqual(validarFonte("snmp", { ...base, usuario: "u", auth: "SHA", senha_auth: "12345678", priv: "" }), {});
  assert.ok(validarFonte("snmp", { ...base, versao: "2c", comunidade: "" }).comunidade);
});

test("validarFonte: na edição senha em branco mantém; trocar só o usuário pede a senha", () => {
  const base = { nome: "NVR", host: "10.99.50.10", porta: "80", intervalo_s: "600" };
  assert.deepEqual(validarFonte("dahua", { ...base, usuario: "", senha: "" }, { edicao: true }), {});
  assert.ok(validarFonte("dahua", { ...base, usuario: "outro", senha: "" }, { edicao: true }).senha);
  assert.ok(validarFonte("snmp", { ...base, versao: "3", usuario: "u", senha_auth: "" }, { edicao: true }).senha_auth);
});

test("montarFonte: corpo da API por tipo; porta vazia some; credencial só com segredo", () => {
  const novo = montarFonte("mikrotik", {
    nome: " Borda ", host: " 10.99.40.1 ", porta: "", tls: true, ativa: true, intervalo_s: "600",
    usuario: "api", senha: "s3nh@",
  });
  assert.deepEqual(novo, {
    tipo: "mikrotik", nome: "Borda", host: "10.99.40.1", tls: true, ativa: true, intervalo_s: 600,
    credencial: { usuario: "api", senha: "s3nh@" },
  });
  const v3 = montarFonte("snmp", {
    nome: "SW", host: "10.99.40.10", porta: "1161", ativa: false, intervalo_s: "900", versao: "3",
    usuario: "u", auth: "SHA256", senha_auth: "12345678", priv: "AES", senha_priv: "abcdefgh",
  });
  assert.equal(v3.porta, 1161);
  assert.equal("tls" in v3, false);
  assert.deepEqual(v3.credencial, {
    versao: "3", usuario: "u", auth: "SHA256", senha_auth: "12345678", priv: "AES", senha_priv: "abcdefgh",
  });
  const v2 = montarFonte("snmp", { nome: "SW", host: "h", versao: "2c", comunidade: "c", intervalo_s: "600", ativa: true });
  assert.deepEqual(v2.credencial, { versao: "2c", comunidade: "c" });
  // edição sem segredo: nada de credencial nem de tipo (o tipo não muda)
  const ed = montarFonte("hikvision", {
    nome: "NVR", host: "10.99.50.10", porta: "443", tls: true, ativa: true, intervalo_s: "600", usuario: "", senha: "",
  }, { edicao: true });
  assert.equal("credencial" in ed, false);
  assert.equal("tipo" in ed, false);
  assert.equal(ed.porta, 443);
});

test("orientacaoErro (R5): api-ssl sem certificado orienta a instalar o certificado no RouterOS", () => {
  const sem = orientacaoErro("o RouterOS não apresentou certificado TLS", "mikrotik", true);
  assert.match(sem, /\/certificate/);
  assert.match(sem, /api-ssl/);
  assert.match(orientacaoErro("não foi possível conectar ao RouterOS", "mikrotik", true), /certificado/);
  assert.equal(orientacaoErro("não foi possível conectar ao RouterOS", "mikrotik", false), "");
  assert.match(orientacaoErro("certificado do aparelho ainda não confiado", "hikvision", true), /Confiar neste certificado/);
  assert.match(orientacaoErro("certificado do aparelho mudou", "dahua", true), /mudou|troca/);
  assert.equal(orientacaoErro("", "mikrotik", true), "");
  assert.equal(orientacaoErro(null, "mikrotik", true), "");
});

test("formatarImpressao: pares hex em maiúsculas separados por dois-pontos; só hex de 64", () => {
  const hex = "ab".repeat(32);
  const f = formatarImpressao(hex);
  assert.equal(f.split(":").length, 32);
  assert.ok(f.startsWith("AB:AB"));
  assert.equal(formatarImpressao("<script>"), "");
  assert.equal(formatarImpressao(null), "");
});

test("cartaoDaFonte: tipo, endereço, TLS, ativa, última coleta e erro com orientação", () => {
  const agora = Date.parse("2026-11-17T12:00:00Z");
  const c = cartaoDaFonte({
    id: "f", tipo: "mikrotik", nome: "Borda", host: "10.99.40.1", porta: 8729, tls: true, ativa: true,
    intervalo_s: 600, impressao_tls: null, ultima_coleta: "2026-11-17T11:57:00Z",
    ultimo_erro: "o RouterOS não apresentou certificado TLS", equipamento_id: null, credencial_definida: true,
  }, agora);
  assert.equal(c.tipoRotulo, "MikroTik");
  assert.equal(c.endereco, "10.99.40.1:8729");
  assert.equal(c.tlsRotulo, "TLS");
  assert.equal(c.ativaRotulo, "Ativa");
  assert.equal(c.coleta, "há 3 minutos");
  assert.equal(c.erro, "o RouterOS não apresentou certificado TLS");
  assert.match(c.orientacao, /certificate/);
  assert.equal(c.rotuloRemover, "Remover Borda");
  const n = cartaoDaFonte({
    id: "g", tipo: "snmp", nome: "SW", host: "h", porta: 161, tls: false, ativa: false, intervalo_s: 600,
    impressao_tls: "ab".repeat(32), ultima_coleta: null, ultimo_erro: null,
  }, agora);
  assert.equal(n.tlsRotulo, "sem TLS");
  assert.equal(n.ativaRotulo, "Desativada");
  assert.equal(n.coleta, "nunca");
  assert.equal(n.erro, "");
  assert.equal(n.confiada, true);
});
