import test from "node:test";
import assert from "node:assert/strict";
import {
  avisoDoPainel, chaveDoAviso, dispensarAviso, foiDispensado, textoDoAgendamento, textoDoResultado,
} from "../../src/js/config-atualizacoes.js";

const FUSO = "America/Sao_Paulo";
const base = (extra = {}) => ({
  versao: "0.5.0", ativo: true, agendado: true, ultima_verificacao: "2026-11-20T06:00:00Z",
  ultima_verificacao_ok: "2026-11-20T06:00:00Z", resultado: "sem_novidade", de: null, para: null,
  mensagem: null, aviso: null, comando_manual: "./update.sh", arquivo_ilegivel: false, ...extra,
});

test("texto do resultado nos quatro resultados, sem conexão e sem verificação", () => {
  assert.equal(textoDoResultado(base({ resultado: "atualizado", de: "0.4.1", para: "0.5.0" }), FUSO),
    "Atualizado de 0.4.1 para 0.5.0 em 20/11/2026 03:00.");
  assert.equal(textoDoResultado(base(), FUSO),
    "Verificado em 20/11/2026 03:00: já está na versão mais recente.");
  assert.equal(
    textoDoResultado(base({ resultado: "voltou", de: "0.4.1", para: "0.5.0", mensagem: "o novo não subiu" }), FUSO),
    "A atualização para 0.5.0 falhou em 20/11/2026 03:00; o Sentinela voltou para 0.4.1. o novo não subiu",
  );
  const falhou = "x".repeat(200);
  const f = textoDoResultado(base({ resultado: "falhou", para: "0.5.0", mensagem: falhou }), FUSO);
  assert.ok(f.startsWith("A atualização para 0.5.0 falhou em 20/11/2026 03:00."));
  assert.ok(f.endsWith(falhou), "a mensagem de 200 caracteres vai inteira");
  assert.equal(textoDoResultado(base({ resultado: "sem_conexao" }), FUSO),
    "Não foi possível verificar em 20/11/2026 03:00: sem conexão com a internet.");
  assert.equal(textoDoResultado(base({ resultado: null, ultima_verificacao: null }), FUSO),
    "Ainda não houve verificação de atualização.");
});

test("sem agendamento mostra o comando", () => {
  assert.equal(
    textoDoAgendamento(base({ agendado: false })),
    "Este computador não tem atualização agendada (Windows, Docker Desktop ou instalação manual). Para atualizar, rode ./update.sh na pasta do Sentinela.",
  );
  assert.match(textoDoAgendamento(base()), /todos os dias às 03:00/);
  assert.match(textoDoAgendamento(base({ ativo: false })), /desligada/);
});

test("aviso voltou é atenção e some dispensado", () => {
  const e = base({
    resultado: "voltou", de: "0.4.1", para: "0.5.0",
    aviso: "A atualização para 0.5.0 falhou; o Sentinela voltou para 0.4.1",
  });
  const a = avisoDoPainel(e, FUSO);
  assert.equal(a.tipo, "atencao");
  assert.equal(a.texto, e.aviso);
  const ok = avisoDoPainel(base({ resultado: "atualizado", para: "0.5.0", aviso: "Atualizado para 0.5.0" }), FUSO);
  assert.equal(ok.tipo, "ok");
  assert.equal(avisoDoPainel(base(), FUSO), null);
  assert.equal(avisoDoPainel(null, FUSO), null);
  // dispensa por pessoa, em localStorage (aqui um armazenamento falso)
  const mem = new Map();
  const armazenamento = { getItem: (k) => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => mem.set(k, v) };
  assert.equal(foiDispensado(e, "ana", armazenamento), false);
  dispensarAviso(e, "ana", armazenamento);
  assert.equal(foiDispensado(e, "ana", armazenamento), true);
  assert.equal(foiDispensado(e, "bia", armazenamento), false, "dispensa é por pessoa");
  assert.notEqual(chaveDoAviso(e), chaveDoAviso({ ...e, ultima_verificacao: "2026-11-21T06:00:00Z" }));
  // sem armazenamento (ou que lança): não derruba, só não lembra
  const quebrado = { getItem() { throw new Error("x"); }, setItem() { throw new Error("x"); } };
  assert.equal(foiDispensado(e, "ana", quebrado), false);
  dispensarAviso(e, "ana", quebrado);
});

test("aviso de 7 dias mostra a data no horário local da instalação, não em UTC", () => {
  // 21/11 01:00 UTC é 20/11 22:00 em São Paulo
  const e = base({
    ultima_verificacao_ok: "2026-11-21T01:00:00Z", resultado: "sem_conexao",
    aviso: "O Sentinela não conseguiu verificar atualizações desde 21/11",
  });
  const a = avisoDoPainel(e, FUSO);
  assert.equal(a.texto, "O Sentinela não conseguiu verificar atualizações desde 20/11");
  assert.equal(a.tipo, "atencao");
  // a dispensa desse aviso não volta a cada tentativa noturna, só quando a última boa muda
  const outra = { ...e, ultima_verificacao: "2026-11-30T06:00:00Z" };
  assert.equal(chaveDoAviso(e), chaveDoAviso(outra));
});
