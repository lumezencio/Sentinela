// Cartões Segurança e Backup: o pedaço do componente, com a API trocada por dublês.
import test from "node:test";
import assert from "node:assert/strict";

import { api } from "../../src/js/api.js";
import { backupDoPainel, segurancaDoPainel } from "../../src/js/configuracoes.js";

function com(api_, funcao) {
  const originais = Object.fromEntries(Object.keys(api_).map((k) => [k, api[k]]));
  Object.assign(api, api_);
  return Promise.resolve(funcao()).finally(() => Object.assign(api, originais));
}

const ok = (dados) => ({ ok: true, status: 200, dados, erro: "", espera: 0 });

test("carregarSeguranca: política, linhas dos usuários e o meu segundo fator", async () => {
  const c = segurancaDoPainel();
  await com(
    {
      verSeguranca: async () => ok({ exigir_totp_admin: true }),
      listarUsuarios: async () => ok([
        { id: 1, login: "a".repeat(64), papel: "admin", totp_ativo: true },
        { id: 2, login: "leitor", papel: "visualizador", totp_ativo: false },
      ]),
      eu: async () => ok({ login: "a", papel: "admin", totp_ativo: true, restrita: false }),
    },
    () => c.carregarSeguranca(),
  );
  assert.equal(c.segExigir, true);
  assert.equal(c.segExigirMarcado, "true");
  assert.equal(c.segMeuTotp, true);
  assert.equal(c.segUsuarios.length, 2);
  assert.equal(c.segUsuarios[0].login.length, 64);
  assert.equal(c.segUsuarios[0].podeZerar, true);
  assert.equal(c.segUsuarios[1].podeZerar, false);
});

test("alternarExigirTotp: com o meu fator ativo liga sem confirmar e mostra o aviso", async () => {
  const c = segurancaDoPainel();
  c.segMeuTotp = true;
  c.confirmar = async () => assert.fail("não devia pedir confirmação");
  let corpo = null;
  await com(
    { definirSeguranca: async (v) => ((corpo = v), ok({ exigir_totp_admin: v })) },
    () => c.alternarExigirTotp(),
  );
  assert.equal(corpo, true);
  assert.equal(c.segExigir, true);
  assert.match(c.segAviso, /precisa do segundo fator/);
});

test("alternarExigirTotp: sem o meu fator pede confirmação e respeita o 'não'", async () => {
  const c = segurancaDoPainel();
  c.segMeuTotp = false;
  c.confirmar = async () => false;
  let chamou = false;
  await com({ definirSeguranca: async () => ((chamou = true), ok({})) }, () => c.alternarExigirTotp());
  assert.equal(chamou, false);
  assert.equal(c.segExigir, false);
});

test("backup: sem cópias diz que ainda não houve; com cópias usa o fuso e não trunca", async () => {
  const c = backupDoPainel();
  c.fuso = "UTC";
  await c.aplicarBackup({ ultimo_em: null, ultimo_tamanho: null, ultimo_erro: null, copias: [], diretorio: "/dados/backups" });
  assert.match(c.bkResumo, /ainda não houve/i);
  assert.equal(c.bkCopias.length, 0);
  const copias = Array.from({ length: 20 }, (_, i) => ({
    nome: `sentinela-${i}-${"x".repeat(60)}.tar.gz`, tipo: "diario", criado_em: "2026-11-18T03:00:00Z", tamanho: 1024 * (i + 1),
  }));
  await c.aplicarBackup({ ultimo_em: "2026-11-18T03:00:00Z", ultimo_tamanho: 2048, ultimo_erro: "falha\u0007 de disco", copias, diretorio: "/dados/backups" });
  assert.equal(c.bkCopias.length, 20);
  assert.equal(c.bkCopias[3].nome, copias[3].nome);
  assert.match(c.bkResumo, /03:00/);
  assert.ok(!c.bkUltimoErro.includes("\u0007"));
});

test("backup: se o fuso chegar depois da lista, os horários se refazem", async () => {
  const c = backupDoPainel();
  c.fuso = "UTC";
  await c.aplicarBackup({
    ultimo_em: "2026-11-18T03:00:00Z", ultimo_tamanho: 1024, ultimo_erro: null, diretorio: "/x",
    copias: [{ nome: "a", tipo: "diario", criado_em: "2026-11-18T03:00:00Z", tamanho: 1 }],
  });
  assert.match(c.bkCopias[0].quando, /03:00/);
  c.fuso = "America/Sao_Paulo"; // chegou depois
  assert.match(c.bkCopias[0].quando, /00:00/);
  assert.match(c.bkResumo, /00:00/);
});

test("fazerBackupAgora: sucesso recarrega e avisa; falha mostra o texto fixo do servidor", async () => {
  const c = backupDoPainel();
  c.fuso = "UTC";
  let n = 0;
  await com(
    {
      criarBackup: async () => ok({}),
      verBackup: async () => ((n += 1), ok({ ultimo_em: null, ultimo_tamanho: null, ultimo_erro: null, copias: [], diretorio: "/x" })),
    },
    () => c.fazerBackupAgora(),
  );
  assert.equal(c.bkAviso, "Backup feito.");
  assert.equal(n, 1);
  await com(
    { criarBackup: async () => ({ ok: false, status: 500, dados: null, erro: "Não foi possível fazer o backup.", espera: 0 }) },
    () => c.fazerBackupAgora(),
  );
  assert.equal(c.bkErro, "Não foi possível fazer o backup.");
  assert.equal(c.bkCriando, false);
});

function adiado() {
  let resolver;
  const promessa = new Promise((r) => (resolver = r));
  return { promessa, resolver };
}

test("backup: 'Nenhuma cópia' só depois de uma leitura sem cópias, nunca no meio de duas leituras", async () => {
  // regressão do smoke: a leitura inicial (cartão visível) e a releitura do "Fazer backup agora"
  // corriam juntas; o aviso de lista vazia ia e voltava no mesmo quadro (o x-show do Alpine
  // perde um "esconder" assim) e a resposta antiga podia sobrescrever a nova
  const c = backupDoPainel();
  c.fuso = "UTC";
  const vistos = [];
  const espiar = () => vistos.push(c.bkSemCopias);
  espiar();
  const antiga = adiado();
  const nova = adiado();
  const pedidos = [antiga, nova];
  const linha = (nome) => ({ nome, tipo: "manual", criado_em: "2026-11-18T03:00:00Z", tamanho: 1 });
  const dados = (copias) => ({ ultimo_em: null, ultimo_tamanho: null, ultimo_erro: null, copias, diretorio: "/x" });
  await com(
    {
      verBackup: () => pedidos.shift().promessa,
      criarBackup: async () => ok({}),
    },
    async () => {
      const inicial = c.carregarBackup(true);
      espiar();
      const agora = c.fazerBackupAgora();
      await new Promise((r) => setTimeout(r, 0));
      espiar(); // releitura saiu e a inicial ainda não voltou
      nova.resolver(ok(dados([linha("nova"), linha("antiga")])));
      await agora;
      espiar();
      antiga.resolver(ok(dados([]))); // a resposta da leitura inicial chega por último
      await inicial;
      espiar();
    },
  );
  assert.deepEqual(vistos, [false, false, false, false, false]);
  assert.deepEqual(c.bkCopias.map((x) => x.nome), ["nova", "antiga"]);
  assert.equal(c.bkCarregando, false);
});

test("backup: leitura sem cópias mostra o aviso de lista vazia", async () => {
  const c = backupDoPainel();
  c.fuso = "UTC";
  await com(
    { verBackup: async () => ok({ ultimo_em: null, ultimo_tamanho: null, ultimo_erro: null, copias: [], diretorio: "/x" }) },
    () => c.carregarBackup(true),
  );
  assert.equal(c.bkSemCopias, true);
});
