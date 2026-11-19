// Backup: tamanho legível, linha de cada cópia no fuso e resumo da última.
import test from "node:test";
import assert from "node:assert/strict";

import { formatarTamanho, linhaDoBackup, resumoDoUltimo } from "../../src/js/config-backup.js";

test("test_formatar_tamanho_kb_mb_gb", () => {
  assert.equal(formatarTamanho(0), "0 B");
  assert.equal(formatarTamanho(512), "512 B");
  assert.equal(formatarTamanho(1536), "1,5 KB");
  assert.equal(formatarTamanho(12.4 * 1024 * 1024), "12,4 MB");
  assert.equal(formatarTamanho(3.25 * 1024 ** 3), "3,3 GB");
  assert.equal(formatarTamanho(-1), "—");
  assert.equal(formatarTamanho(null), "—");
});

test("test_linha_do_backup_usa_fuso_e_nao_trunca_nome", () => {
  const nome = "sentinela-20261118T030000Z-diario-0.4.0-com-um-nome-muito-comprido-de-proposito.tar.gz";
  const l = linhaDoBackup(
    { nome, tipo: "diario", criado_em: "2026-11-18T03:00:00+00:00", tamanho: 12.4 * 1024 * 1024 },
    "America/Sao_Paulo",
  );
  assert.equal(l.nome, nome);
  assert.equal(l.tipo, "Diário");
  assert.match(l.quando, /18\/11\/2026/);
  assert.match(l.quando, /00:00/); // 03:00 UTC = 00:00 em São Paulo
  assert.equal(l.tamanho, "12,4 MB");
  const utc = linhaDoBackup({ nome: "a", tipo: "manual", criado_em: "2026-11-18T03:00:00Z", tamanho: 1 }, "UTC");
  assert.match(utc.quando, /03:00/);
  assert.equal(utc.tipo, "Manual");
  assert.equal(linhaDoBackup({ nome: "a", tipo: "pre-restore", criado_em: "x", tamanho: 1 }, "UTC").quando, "—");
  assert.equal(linhaDoBackup({ nome: "a", tipo: "estranho", criado_em: "x", tamanho: 1 }, "UTC").tipo, "estranho");
});

test("test_resumo_sem_backup_diz_que_ainda_nao_houve", () => {
  assert.match(resumoDoUltimo({ ultimo_em: null, ultimo_tamanho: null, ultimo_erro: null }, "UTC"), /ainda não houve/i);
  const r = resumoDoUltimo({ ultimo_em: "2026-11-18T03:00:00Z", ultimo_tamanho: 2048, ultimo_erro: null }, "UTC");
  assert.match(r, /Último backup/);
  assert.match(r, /2,0 KB/);
  assert.match(r, /18\/11\/2026/);
});
