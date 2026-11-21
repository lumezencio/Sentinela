// Configurações → Atualizações e o aviso de 24 h: funções puras (testadas no Node). O estado vem
// de GET /atualizacao; o texto livre (mensagem do update.sh) é texto: só vai à tela por x-text e
// nunca é cortado. Os horários da API são UTC; aqui viram o horário local da instalação (fuso).
import { quando } from "./config-backup.js";
import { limparTexto } from "./lista.js";

const MAX_MENSAGEM = 200;
const PREFIXO_ATUALIZADO = "Atualizado para ";
const PREFIXO_SEM_VERIFICAR = "O Sentinela não conseguiu verificar atualizações desde ";
const CHAVE_DISPENSA = "sentinela-aviso-atualizacao";
const SEM_AGENDAMENTO =
  "Este computador não tem atualização agendada (Windows, Docker Desktop ou instalação manual)." +
  " Para atualizar, rode ./update.sh na pasta do Sentinela.";

const texto = (valor, max) => limparTexto(valor, max);

/** "dd/mm" no fuso; vazio se a data não é válida. */
function diaMes(iso, fuso) {
  const s = quando(iso, fuso);
  return s === "—" ? "" : s.slice(0, 5);
}

/** Frase do último resultado, com data e hora locais; a mensagem do servidor vai inteira. */
export function textoDoResultado(e, fuso) {
  if (!e || !e.resultado || !e.ultima_verificacao) return "Ainda não houve verificação de atualização.";
  const quandoTexto = quando(e.ultima_verificacao, fuso);
  const para = texto(e.para, 32);
  const de = texto(e.de, 32);
  const msg = texto(e.mensagem, MAX_MENSAGEM);
  const com = (frase) => (msg ? `${frase} ${msg}` : frase);
  switch (e.resultado) {
    case "atualizado":
      return de && para ? `Atualizado de ${de} para ${para} em ${quandoTexto}.` : `Atualizado em ${quandoTexto}.`;
    case "sem_novidade":
      return `Verificado em ${quandoTexto}: já está na versão mais recente.`;
    case "voltou":
      return com(`A atualização${para ? ` para ${para}` : ""} falhou em ${quandoTexto}${de ? `; o Sentinela voltou para ${de}` : ""}.`);
    case "falhou":
      return com(`A atualização${para ? ` para ${para}` : ""} falhou em ${quandoTexto}.`);
    case "sem_conexao":
      return `Não foi possível verificar em ${quandoTexto}: sem conexão com a internet.`;
    default:
      return "Ainda não houve verificação de atualização.";
  }
}

/** Quando a atualização roda (ou como fazer à mão, onde não há timer). */
export function textoDoAgendamento(e) {
  if (!e || !e.agendado) return SEM_AGENDAMENTO;
  if (!e.ativo) {
    return "A atualização automática está desligada. Para atualizar, rode ./update.sh na pasta do Sentinela.";
  }
  return "O Sentinela verifica e instala atualizações todos os dias às 03:00, no horário da instalação.";
}

/** Aviso do painel (24 h depois de atualizar ou voltar; 7 dias sem verificar): {texto, tipo} ou null. */
export function avisoDoPainel(e, fuso) {
  if (!e || typeof e.aviso !== "string" || !e.aviso) return null;
  let aviso = texto(e.aviso, 300);
  if (!aviso) return null;
  if (aviso.startsWith(PREFIXO_SEM_VERIFICAR)) {
    // o servidor guarda a data em UTC e escreve só dia/mês: refaz no horário local da instalação
    const dia = diaMes(e.ultima_verificacao_ok, fuso);
    if (dia) aviso = `${PREFIXO_SEM_VERIFICAR}${dia}`;
  }
  const ok = e.resultado === "atualizado" && aviso.startsWith(PREFIXO_ATUALIZADO);
  return { texto: aviso, tipo: ok ? "ok" : "atencao" };
}

/** Identifica este aviso para a dispensa: um aviso novo (outra verificação) volta a aparecer. */
export function chaveDoAviso(e) {
  if (e && typeof e.aviso === "string" && e.aviso.startsWith(PREFIXO_SEM_VERIFICAR)) {
    // a mesma falta de verificação não volta a cada tentativa noturna: vale a última boa
    return `sem-verificar|${e.ultima_verificacao_ok || ""}`;
  }
  return `${(e && e.resultado) || ""}|${(e && e.ultima_verificacao) || ""}|${(e && e.para) || ""}`;
}

const chaveDaPessoa = (usuario) => `${CHAVE_DISPENSA}:${String(usuario || "")}`;

function armazenamentoPadrao() {
  try {
    return globalThis.localStorage || null;
  } catch {
    return null;
  }
}

/** A pessoa já dispensou este aviso? (localStorage por pessoa; sem armazenamento, nunca.) */
export function foiDispensado(e, usuario, armazenamento = armazenamentoPadrao()) {
  try {
    return Boolean(armazenamento) && armazenamento.getItem(chaveDaPessoa(usuario)) === chaveDoAviso(e);
  } catch {
    return false;
  }
}

export function dispensarAviso(e, usuario, armazenamento = armazenamentoPadrao()) {
  try {
    if (armazenamento) armazenamento.setItem(chaveDaPessoa(usuario), chaveDoAviso(e));
  } catch {
    /* sem armazenamento: o aviso some só nesta página */
  }
}
