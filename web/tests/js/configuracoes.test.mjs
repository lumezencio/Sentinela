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

import { validarGatewaySubrede, validarIntervaloVarredura } from "../../src/js/configuracoes.js";

test("subrede gateway inválido bloqueia envio", () => {
  const cidr = "192.168.15.0/24";
  assert.equal(validarGatewaySubrede("192.168.15.1", cidr), "");
  assert.equal(validarGatewaySubrede("  192.168.15.254 ", cidr), "");
  assert.equal(validarGatewaySubrede("", cidr), "", "vazio apaga o gateway");
  assert.equal(validarGatewaySubrede("roteador", cidr), "Informe um endereço IPv4, como 192.168.15.1.");
  assert.equal(validarGatewaySubrede("192.168.15.256", cidr), "Informe um endereço IPv4, como 192.168.15.1.");
  assert.equal(validarGatewaySubrede("10.0.0.1", cidr), "O gateway precisa estar dentro da sub-rede.");
  assert.equal(validarGatewaySubrede("192.168.15.0", cidr), "O gateway precisa estar dentro da sub-rede.");
  assert.equal(validarGatewaySubrede("192.168.15.255", cidr), "O gateway precisa estar dentro da sub-rede.");
});

test("subrede gateway: zero à esquerda e /31 /32 seguem a regra do servidor (ipaddress do Python)", () => {
  const formato = "Informe um endereço IPv4, como 192.168.15.1.";
  const fora = "O gateway precisa estar dentro da sub-rede.";
  // o servidor recusa octeto com zero à esquerda (ambíguo: octal em alguns sistemas)
  assert.equal(validarGatewaySubrede("192.168.015.1", "192.168.15.0/24"), formato);
  assert.equal(validarGatewaySubrede("192.168.15.01", "192.168.15.0/24"), formato);
  assert.equal(validarGatewaySubrede("010.99.0.1", "10.99.0.0/16"), formato);
  assert.equal(validarGatewaySubrede("192.168.15.0", "192.168.15.0/24"), fora);
  assert.equal(validarGatewaySubrede("10.99.0.10", "10.99.0.0/16"), "", "zero sozinho no octeto é válido");
  // /31 e /32: o servidor considera os dois endereços (ou o único) rede/broadcast
  assert.equal(validarGatewaySubrede("192.168.15.0", "192.168.15.0/31"), fora);
  assert.equal(validarGatewaySubrede("192.168.15.1", "192.168.15.0/31"), fora);
  assert.equal(validarGatewaySubrede("192.168.15.7", "192.168.15.7/32"), fora);
  assert.equal(validarGatewaySubrede("192.168.15.1", "192.168.15.0/30"), "");
});

test("intervalo fora de 15 a 240 bloqueia", () => {
  assert.deepEqual(validarIntervaloVarredura("30"), { valor: 30, erro: "" });
  assert.deepEqual(validarIntervaloVarredura(" 15 "), { valor: 15, erro: "" });
  assert.equal(validarIntervaloVarredura("240").valor, 240);
  for (const ruim of ["14", "241", "0", "", "abc", "30.5", "-30", "1e2"]) {
    const r = validarIntervaloVarredura(ruim);
    assert.equal(r.erro, "Informe de 15 a 240 minutos.", ruim);
    assert.equal(r.valor, null);
  }
});

async function painelConfig() {
  const { configuracoesDoPainel } = await import("../../src/js/configuracoes.js");
  const { api } = await import("../../src/js/api.js");
  const p = {};
  Object.defineProperties(p, Object.getOwnPropertyDescriptors(configuracoesDoPainel()));
  Object.assign(p, { admin: true, enviando: false, fuso: "America/Sao_Paulo" });
  return { p, api };
}

test("salvar gateway inválido não chama a API e mostra o erro na própria sub-rede", async () => {
  const { p, api } = await painelConfig();
  const chamadas = [];
  const original = { editar: api.editarSubrede, listar: api.listarSubredes };
  api.editarSubrede = async (...a) => { chamadas.push(a); return { ok: true, dados: {} }; };
  api.listarSubredes = async () => ({ ok: true, dados: [{ id: 1, cidr: "192.168.15.0/24", permite_varredura: false, gateway_ip: "192.168.15.1", ultima_varredura_em: null }] });
  try {
    await p.carregarSubredesCfg();
    assert.equal(p.cfgSubredes[0].gatewayCampo, "192.168.15.1");
    p.aoEditarGateway({ target: { dataset: { id: "1" }, value: "10.0.0.1" } });
    await p.salvarGatewaySubrede(1);
    assert.deepEqual(chamadas, []);
    assert.equal(p.cfgSubredes[0].gatewayErro, "O gateway precisa estar dentro da sub-rede.");
    // corrigiu: o erro some ao digitar e o envio leva só o gateway
    p.aoEditarGateway({ target: { dataset: { id: "1" }, value: "192.168.15.254" } });
    assert.equal(p.cfgSubredes[0].gatewayErro, "");
    await p.salvarGatewaySubrede(1);
    assert.deepEqual(chamadas, [[1, { gateway_ip: "192.168.15.254" }]]);
    // vazio apaga (null)
    p.aoEditarGateway({ target: { dataset: { id: "1" }, value: "  " } });
    await p.salvarGatewaySubrede(1);
    assert.deepEqual(chamadas[1], [1, { gateway_ip: null }]);
    // visualizador (não admin) não envia nada
    p.admin = false;
    await p.salvarGatewaySubrede(1);
    assert.equal(chamadas.length, 2);
  } finally {
    api.editarSubrede = original.editar;
    api.listarSubredes = original.listar;
  }
});

test("salvar intervalo fora de 15 a 240 não chama a API; válido envia só o intervalo", async () => {
  const { p, api } = await painelConfig();
  const chamadas = [];
  const original = api.editarAjustes;
  api.editarAjustes = async (dados) => {
    chamadas.push(dados);
    return { ok: true, dados: { aprovacao_automatica: false, limiar_aprovacao: 0.8, varredura_continua_min: dados.varredura_continua_min } };
  };
  try {
    p.intervaloCampo = "14";
    await p.salvarIntervalo();
    p.intervaloCampo = "241";
    await p.salvarIntervalo();
    assert.deepEqual(chamadas, []);
    assert.equal(p.intervaloErro, "Informe de 15 a 240 minutos.");
    p.intervaloCampo = "45";
    await p.salvarIntervalo();
    assert.deepEqual(chamadas, [{ varredura_continua_min: 45 }]);
    assert.equal(p.intervaloErro, "");
    assert.equal(p.ajustes.intervalo, 45);
    assert.equal(p.intervaloCampo, "45");
  } finally {
    api.editarAjustes = original;
  }
});
