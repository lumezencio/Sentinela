// Assistente de primeiro acesso: regras puras (código, administrador, rede). Os textos de rede
// são os MESMOS do servidor (core/sentinela/api/subredes.py e rede/guarda.py), para que a tela
// avise antes e a resposta do servidor nunca contradiga. O código de instalação só existe numa
// variável da página (primeiro-acesso-pagina.js): nunca é logado nem guardado.
export const PASSOS = ["codigo", "administrador", "rede", "concluir"];
export const COMANDO_NOVO_CODIGO = "docker compose exec core python -m sentinela.cli codigo-instalacao";

export const SENHA_MINIMA = 12;
export const SENHA_MAXIMA = 1024;
export const LOGIN_MAXIMO = 64;

// alfabeto do telão: sem 0, 1, I, L e O
const ALFABETO = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
const TAMANHO_CODIGO = 8;

const MSG_CODIGO_VAZIO = "Digite o código de instalação.";
const MSG_CODIGO_FORMATO =
  "O código tem 8 letras e números (não há 0, 1, I, L nem O). Confira o que o terminal mostrou.";
const MSG_CIDR = "Sub-rede inválida: use a notação CIDR da rede, ex. 10.99.0.0/24.";
const MSG_PRIVADA = "A sub-rede deve ser privada (RFC 1918).";
const MSG_PREFIXO = "O prefixo da sub-rede deve ficar entre /16 e /30.";
const MSG_GATEWAY = "O gateway precisa estar dentro da sub-rede.";

/** Maiúsculas, sem hífen nem espaço; 8 caracteres do alfabeto do telão. */
export function validarCodigoInstalacao(texto) {
  if (typeof texto !== "string") return { ok: false, codigo: "", erro: MSG_CODIGO_VAZIO };
  const limpo = texto.toUpperCase().replace(/[-\s]/g, "");
  if (limpo === "") return { ok: false, codigo: "", erro: MSG_CODIGO_VAZIO };
  if (limpo.length !== TAMANHO_CODIGO || [...limpo].some((c) => !ALFABETO.includes(c))) {
    return { ok: false, codigo: "", erro: MSG_CODIGO_FORMATO };
  }
  return { ok: true, codigo: limpo, erro: "" };
}

/** Login (1 a 64) e senha (12 a 1024) com a confirmação igual. Nada da senha vai a mensagem. */
export function validarAdministrador(login, senha, confirmacao) {
  const nome = typeof login === "string" ? login.trim() : "";
  if (nome === "") return { ok: false, erro: "Informe o login do administrador." };
  if (nome.length > LOGIN_MAXIMO) return { ok: false, erro: `O login pode ter no máximo ${LOGIN_MAXIMO} caracteres.` };
  const s = typeof senha === "string" ? senha : "";
  if (s.length < SENHA_MINIMA) return { ok: false, erro: `A senha deve ter pelo menos ${SENHA_MINIMA} caracteres.` };
  if (s.length > SENHA_MAXIMA) return { ok: false, erro: `A senha deve ter no máximo ${SENHA_MAXIMA} caracteres.` };
  if (s !== confirmacao) return { ok: false, erro: "A senha e a confirmação não conferem." };
  return { ok: true, erro: "" };
}

/** "a.b.c.d" decimal sem zero à esquerda -> inteiro de 32 bits; senão null. */
function ipv4(texto) {
  const partes = texto.split(".");
  if (partes.length !== 4) return null;
  let n = 0;
  for (const p of partes) {
    if (!/^(0|[1-9]\d{0,2})$/.test(p) || Number(p) > 255) return null;
    n = n * 256 + Number(p);
  }
  return n;
}

const FAIXAS_PRIVADAS = [
  [ipv4("10.0.0.0"), 8],
  [ipv4("172.16.0.0"), 12],
  [ipv4("192.168.0.0"), 16],
];

/** Sub-rede privada (RFC 1918) de /16 a /30 e gateway opcional dentro dela (nem rede, nem broadcast). */
export function validarRede(cidr, gateway) {
  const m = typeof cidr === "string" ? cidr.trim().match(/^([\d.]+)\/(\d{1,2})$/) : null;
  const base = m ? ipv4(m[1]) : null;
  const prefixo = m ? Number(m[2]) : -1;
  if (base === null || prefixo > 32) return { ok: false, erro: MSG_CIDR };
  const tamanho = 2 ** (32 - prefixo);
  if (base % tamanho !== 0) return { ok: false, erro: MSG_CIDR }; // bits de host ligados
  const privada = FAIXAS_PRIVADAS.some(([rede, p]) => prefixo >= p && Math.floor(base / 2 ** (32 - p)) === Math.floor(rede / 2 ** (32 - p)));
  if (!privada) return { ok: false, erro: MSG_PRIVADA };
  if (prefixo < 16 || prefixo > 30) return { ok: false, erro: MSG_PREFIXO };
  const texto = typeof gateway === "string" ? gateway.trim() : "";
  if (texto !== "") {
    const g = ipv4(texto);
    if (g === null || g < base || g >= base + tamanho || g === base || g === base + tamanho - 1) {
      return { ok: false, erro: MSG_GATEWAY };
    }
  }
  return { ok: true, erro: "" };
}
