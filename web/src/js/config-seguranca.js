// Segurança (login em duas etapas, ativação e cartão em Configurações): funções puras,
// testadas no Node. Nada daqui grava em console nem em armazenamento do navegador: a chave
// e os códigos de recuperação só existem na memória da página enquanto ela estiver aberta.

const ALFABETO_RECUPERACAO = "23456789ABCDEFGHJKMNPQRSTUVWXYZ"; // sem 0, 1, I, L, O (igual ao servidor)
const PAPEIS = { admin: "Administrador", visualizador: "Visualizador" };

/** Código do aplicativo: 6 dígitos, com espaços no meio tolerados ("123 456"). */
export function validarCodigoTotp(texto) {
  const limpo = String(texto ?? "").replace(/\s+/g, "");
  if (/^\d{6}$/.test(limpo)) return { ok: true, codigo: limpo, erro: "" };
  return { ok: false, codigo: "", erro: "Digite os 6 números do aplicativo." };
}

/** Código de recuperação: 10 caracteres (5-5); maiúsculas ou minúsculas, com ou sem hífen. */
export function validarCodigoRecuperacao(texto) {
  const limpo = String(texto ?? "").trim().toUpperCase().replace(/[\s-]/g, "");
  if (limpo.length === 10 && [...limpo].every((c) => ALFABETO_RECUPERACAO.includes(c))) {
    return { ok: true, codigo: `${limpo.slice(0, 5)}-${limpo.slice(5)}`, erro: "" };
  }
  return { ok: false, codigo: "", erro: "Digite o código de recuperação inteiro (10 caracteres)." };
}

/** Chave do aplicativo em blocos de 4 para digitar sem errar. */
export function agruparChave(chave) {
  const limpa = String(chave ?? "").replace(/\s+/g, "");
  return limpa.match(/.{1,4}/g)?.join(" ") ?? "";
}

/** Linha da lista de usuários; `podeZerar` só com o segundo fator ativo. */
export function linhaDoUsuario(u) {
  const papel = String(u.papel ?? "");
  const ativo = Boolean(u.totp_ativo);
  return {
    id: u.id,
    login: String(u.login ?? ""),
    papel: PAPEIS[papel] ?? papel,
    totp: ativo ? "Segundo fator ativo" : "Segundo fator desligado",
    podeZerar: ativo,
  };
}

/** Arquivo de texto dos códigos de recuperação (gerado na hora, no navegador). */
export function textoCodigosParaBaixar(codigos) {
  const linhas = (Array.isArray(codigos) ? codigos : []).map((c, i) => `${i + 1}. ${c}`);
  return [
    "Sentinela: códigos de recuperação do segundo fator",
    "",
    "Guarde este arquivo em lugar seguro (gerenciador de senhas ou cofre), fora deste computador.",
    "Cada código vale uma vez. Eles só servem se você perder o aplicativo autenticador.",
    "",
    ...linhas,
    "",
  ].join("\n");
}
