// Cartões Segurança e Backup: o pedaço do componente, com a API trocada por dublês.
import test from "node:test";
import assert from "node:assert/strict";

import { api } from "../../src/js/api.js";
import { backupDoPainel, segurancaDoPainel } from "../../src/js/painel-seguranca.js";

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

test("backup: sem cópias diz que ainda não houve; com cópias usa o fuso e não trunca", () => {
  const c = backupDoPainel();
  c.fuso = "UTC";
  c.aplicarBackup({ ultimo_em: null, ultimo_tamanho: null, ultimo_erro: null, copias: [], diretorio: "/dados/backups" });
  assert.match(c.bkResumo, /ainda não houve/i);
  assert.equal(c.bkCopias.length, 0);
  const copias = Array.from({ length: 20 }, (_, i) => ({
    nome: `sentinela-${i}-${"x".repeat(60)}.tar.gz`, tipo: "diario", criado_em: "2026-11-18T03:00:00Z", tamanho: 1024 * (i + 1),
  }));
  c.aplicarBackup({ ultimo_em: "2026-11-18T03:00:00Z", ultimo_tamanho: 2048, ultimo_erro: "falha\u0007 de disco", copias, diretorio: "/dados/backups" });
  assert.equal(c.bkCopias.length, 20);
  assert.equal(c.bkCopias[3].nome, copias[3].nome);
  assert.match(c.bkResumo, /03:00/);
  assert.ok(!c.bkUltimoErro.includes("\u0007"));
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
