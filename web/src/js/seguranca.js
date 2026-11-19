// Página seguranca.html: ativação do segundo fator em passos (senha, QR e código, códigos de
// recuperação). A chave e os códigos só vivem na memória desta página e na tela: nada vai a
// console nem a armazenamento do navegador, e os códigos não podem ser pedidos de novo ao
// servidor (só aparecem na resposta da confirmação). Todo texto entra por textContent.
import { api } from "./api.js";
import { agruparChave, textoCodigosParaBaixar, validarCodigoTotp } from "./config-seguranca.js";

const URL_QR = "/api/v1/auth/totp/qr";
const MSG_FALHA = "Não foi possível concluir. Tente de novo.";

const $ = (id) => document.getElementById(id);
const el = {
  quem: $("seg-quem"),
  restrita: $("seg-restrita"),
  erro: $("seg-erro-geral"),
  status: $("seg-status"),
  passo: $("seg-passo"),
  carregando: $("seg-carregando"),
  passoSenha: $("passo-senha"),
  senha: $("seg-senha"),
  senhaErro: $("seg-senha-erro"),
  iniciar: $("seg-iniciar"),
  passoQr: $("passo-qr"),
  qr: $("seg-qr"),
  chave: $("seg-chave"),
  copiarChave: $("seg-copiar-chave"),
  codigo: $("seg-codigo"),
  codigoErro: $("seg-codigo-erro"),
  confirmar: $("seg-confirmar"),
  passoCodigos: $("passo-codigos"),
  tituloCodigos: $("titulo-codigos"),
  lista: $("seg-codigos"),
  copiarCodigos: $("seg-copiar-codigos"),
  baixarCodigos: $("seg-baixar-codigos"),
  guardei: $("seg-guardei"),
  continuar: $("seg-continuar"),
  passoAtivo: $("passo-ativo"),
  ativoTexto: $("seg-ativo-texto"),
  sair: $("seg-sair"),
};

// só em memória; zerados assim que a tela deixa de precisar deles
let chaveSemEspacos = "";
let codigosEmMemoria = [];
let jaAtivo = false;

function mostrar(alvo, texto) {
  alvo.textContent = texto;
  alvo.hidden = !texto;
}

function aviso(texto) {
  mostrar(el.status, texto);
}

function mostrarPasso(qual, numero) {
  for (const p of [el.passoSenha, el.passoQr, el.passoCodigos, el.passoAtivo]) p.hidden = p !== qual;
  el.carregando.hidden = true;
  mostrar(el.passo, numero ? `Passo ${numero} de 3` : "");
}

async function copiar(texto, mensagem) {
  try {
    await navigator.clipboard.writeText(texto);
    aviso(mensagem);
  } catch {
    aviso("Não foi possível copiar automaticamente. Selecione o texto e copie à mão.");
  }
}

function desenharChave(chave) {
  el.chave.replaceChildren();
  for (const bloco of agruparChave(chave).split(" ")) {
    const span = document.createElement("span");
    span.textContent = bloco;
    el.chave.append(span);
  }
}

function desenharCodigos(codigos) {
  el.lista.replaceChildren();
  for (const c of codigos) {
    const li = document.createElement("li");
    li.textContent = c;
    el.lista.append(li);
  }
}

function limparSegredos() {
  chaveSemEspacos = "";
  el.chave.replaceChildren();
  el.qr.removeAttribute("src");
}

async function carregar() {
  const r = await api.eu();
  if (!r.ok) {
    if (r.status !== 401) {
      el.carregando.hidden = true;
      mostrar(el.erro, r.erro || MSG_FALHA);
    }
    return; // 401: api.js já mandou para o login
  }
  const eu = r.dados;
  mostrar(el.quem, `Conta: ${eu.login}`);
  el.restrita.hidden = !eu.restrita;
  if (eu.totp_ativo) {
    jaAtivo = true;
    const n = typeof eu.codigos_restantes === "number" ? eu.codigos_restantes : null;
    el.ativoTexto.textContent =
      "O segundo fator já está ativo nesta conta." +
      (n === null ? "" : ` Códigos de recuperação que ainda valem: ${n}.`);
    mostrarPasso(el.passoAtivo, 0);
    return;
  }
  mostrarPasso(el.passoSenha, 1);
  el.senha.focus();
}

el.passoSenha.addEventListener("submit", async (evento) => {
  evento.preventDefault();
  mostrar(el.erro, "");
  mostrar(el.senhaErro, "");
  const senha = el.senha.value;
  if (!senha) {
    mostrar(el.senhaErro, "Informe sua senha.");
    el.senha.focus();
    return;
  }
  el.iniciar.disabled = true;
  const r = await api.iniciarTotp(senha);
  el.iniciar.disabled = false;
  el.senha.value = "";
  if (!r.ok || !r.dados || typeof r.dados.chave !== "string") {
    if (r.status === 401) mostrar(el.senhaErro, "Senha incorreta.");
    else if (r.status === 409) mostrar(el.erro, r.erro);
    else mostrar(el.erro, r.erro || MSG_FALHA);
    el.senha.focus();
    return;
  }
  chaveSemEspacos = r.dados.chave.replace(/\s+/g, "");
  desenharChave(chaveSemEspacos);
  el.qr.src = URL_QR; // endereço fixo do servidor (CSP img-src 'self'); o valor da resposta não é usado
  mostrarPasso(el.passoQr, 2);
  el.codigo.focus();
});

el.copiarChave.addEventListener("click", () => {
  copiar(chaveSemEspacos, "Chave copiada.");
});

el.passoQr.addEventListener("submit", async (evento) => {
  evento.preventDefault();
  mostrar(el.erro, "");
  mostrar(el.codigoErro, "");
  const v = validarCodigoTotp(el.codigo.value);
  if (!v.ok) {
    mostrar(el.codigoErro, v.erro);
    el.codigo.focus();
    return;
  }
  el.confirmar.disabled = true;
  const r = await api.confirmarTotp(v.codigo);
  el.confirmar.disabled = false;
  el.codigo.value = "";
  if (!r.ok || !r.dados || !Array.isArray(r.dados.codigos)) {
    if (r.status === 401) mostrar(el.codigoErro, "Código inválido. Confira o horário do celular e tente o código seguinte.");
    else mostrar(el.erro, r.erro || MSG_FALHA);
    el.codigo.focus();
    return;
  }
  codigosEmMemoria = r.dados.codigos.map((c) => String(c));
  limparSegredos();
  desenharCodigos(codigosEmMemoria);
  mostrarPasso(el.passoCodigos, 3);
  aviso("Segundo fator ativado.");
  el.tituloCodigos.focus();
});

el.copiarCodigos.addEventListener("click", () => {
  copiar(codigosEmMemoria.join("\n"), "Códigos copiados.");
});

el.baixarCodigos.addEventListener("click", () => {
  const blob = new Blob([textoCodigosParaBaixar(codigosEmMemoria)], { type: "text/plain;charset=utf-8" });
  const endereco = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = endereco;
  a.download = "sentinela-codigos-de-recuperacao.txt";
  document.body.append(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(endereco), 1000);
  aviso("Arquivo gerado neste computador. Guarde-o fora dele.");
});

el.guardei.addEventListener("change", () => {
  el.continuar.disabled = !el.guardei.checked;
});

el.continuar.addEventListener("click", () => {
  codigosEmMemoria = [];
  el.lista.replaceChildren();
  window.location.replace("index.html");
});

el.sair.addEventListener("click", async () => {
  await api.sair();
  window.location.replace("login.html");
});

// ao sair da página (inclusive para o cache de voltar/avançar) nada de segredo fica na memória nem no DOM
window.addEventListener("pagehide", () => {
  limparSegredos();
  codigosEmMemoria = [];
  el.lista.replaceChildren();
});

carregar();
