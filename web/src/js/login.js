// Tela de login: JSON para /auth/login; mensagens genéricas; espera do 429 com contagem.
// Com o segundo fator ativo o servidor responde 202 e a MESMA página mostra a etapa do código
// (aplicativo ou recuperação). O código digitado nunca vai a log nem a armazenamento.
import { api } from "./api.js";
import { validarCodigoRecuperacao, validarCodigoTotp } from "./config-seguranca.js";

const form = document.getElementById("form-login");
const campoLogin = document.getElementById("login");
const campoSenha = document.getElementById("senha");
const botao = document.getElementById("entrar");
const erro = document.getElementById("erro-login");
const formTotp = document.getElementById("form-totp");
const tituloTotp = document.getElementById("titulo-totp");
const dicaTotp = document.getElementById("dica-totp");
const rotuloTotp = document.getElementById("rotulo-totp");
const campoTotp = document.getElementById("codigo-totp");
const botaoTotp = document.getElementById("confirmar-totp");
const erroTotp = document.getElementById("erro-totp");
const alternar = document.getElementById("alternar-recuperacao");
const voltar = document.getElementById("voltar-login");

let contagem = 0;
let modoRecuperacao = false;
let etapaDesde = 0; // quando a etapa do código abriu (o token do servidor vale 5 minutos)
let falhasSeguidas = 0;
const VALIDADE_ETAPA_MS = 5 * 60 * 1000;
const MSG_EXPIROU = "A etapa expirou; entre de novo.";

function mostrarErro(texto) {
  erro.textContent = texto;
  erro.hidden = !texto;
}

function mostrarErroTotp(texto) {
  erroTotp.textContent = texto;
  erroTotp.hidden = !texto;
}

function bloquear(el, rotulo, segundos) {
  window.clearInterval(contagem);
  let resta = Math.max(1, segundos);
  el.disabled = true;
  const tique = () => {
    if (resta <= 0) {
      window.clearInterval(contagem);
      el.disabled = false;
      el.textContent = rotulo;
      return;
    }
    el.textContent = `Aguarde ${resta} s`;
    resta -= 1;
  };
  tique();
  contagem = window.setInterval(tique, 1000);
}

function ajustarCampoDoCodigo() {
  campoTotp.value = "";
  mostrarErroTotp("");
  if (modoRecuperacao) {
    tituloTotp.textContent = "Código de recuperação";
    dicaTotp.textContent =
      "Digite um dos códigos que você guardou ao ativar o segundo fator. Cada um vale uma vez.";
    rotuloTotp.textContent = "Código de recuperação";
    campoTotp.setAttribute("maxlength", "16");
    campoTotp.setAttribute("inputmode", "text");
    campoTotp.setAttribute("autocapitalize", "characters");
    alternar.textContent = "Usar o código do aplicativo";
  } else {
    tituloTotp.textContent = "Confirme que é você";
    dicaTotp.textContent = "Abra o aplicativo autenticador e digite o código de 6 números que ele mostra.";
    rotuloTotp.textContent = "Código do aplicativo";
    campoTotp.setAttribute("maxlength", "16");
    campoTotp.setAttribute("inputmode", "numeric");
    campoTotp.setAttribute("autocapitalize", "none");
    alternar.textContent = "Usar código de recuperação";
  }
}

function abrirEtapaTotp() {
  window.clearInterval(contagem);
  modoRecuperacao = false;
  etapaDesde = Date.now();
  falhasSeguidas = 0;
  form.hidden = true;
  formTotp.hidden = false;
  botaoTotp.disabled = false;
  botaoTotp.textContent = "Confirmar";
  ajustarCampoDoCodigo();
  campoTotp.focus();
}

function voltarAoLogin() {
  window.clearInterval(contagem);
  campoTotp.value = "";
  mostrarErroTotp("");
  formTotp.hidden = true;
  form.hidden = false;
  campoSenha.value = "";
  botao.disabled = false;
  botao.textContent = "Entrar";
  campoSenha.focus();
}

/** Etapa vencida (5 min) ou 2 recusas seguidas: o token provavelmente não vale mais. */
function etapaExpirou() {
  return Date.now() - etapaDesde > VALIDADE_ETAPA_MS || falhasSeguidas >= 2;
}

form.addEventListener("submit", async (evento) => {
  evento.preventDefault();
  const login = campoLogin.value.trim();
  const senha = campoSenha.value;
  if (!login || !senha) {
    mostrarErro("Informe login e senha.");
    return;
  }
  mostrarErro("");
  botao.disabled = true;
  botao.textContent = "Entrando…";
  const r = await api.entrar(login, senha);
  if (r.ok && r.etapa === "totp") {
    campoSenha.value = "";
    abrirEtapaTotp();
    return;
  }
  if (r.ok) {
    window.location.replace("index.html");
    return;
  }
  campoSenha.value = "";
  if (r.status === 429) {
    mostrarErro("Muitas tentativas. Aguarde e tente novamente.");
    bloquear(botao, "Entrar", r.espera || 30);
    return;
  }
  botao.disabled = false;
  botao.textContent = "Entrar";
  mostrarErro(r.status === 401 ? "Login ou senha inválidos." : "Não foi possível entrar agora.");
  campoSenha.focus();
});

formTotp.addEventListener("submit", async (evento) => {
  evento.preventDefault();
  const v = modoRecuperacao
    ? validarCodigoRecuperacao(campoTotp.value)
    : validarCodigoTotp(campoTotp.value);
  if (!v.ok) {
    mostrarErroTotp(v.erro);
    campoTotp.focus();
    return;
  }
  if (Date.now() - etapaDesde > VALIDADE_ETAPA_MS) {
    voltarAoLogin();
    mostrarErro(MSG_EXPIROU);
    return;
  }
  mostrarErroTotp("");
  botaoTotp.disabled = true;
  botaoTotp.textContent = "Confirmando…";
  const r = await api.entrarTotp(modoRecuperacao ? { recuperacao: v.codigo } : { codigo: v.codigo });
  if (r.ok) {
    window.location.replace("index.html");
    return;
  }
  campoTotp.value = "";
  if (r.status === 429) {
    mostrarErroTotp("Muitas tentativas. Aguarde e tente novamente.");
    bloquear(botaoTotp, "Confirmar", r.espera || 30);
    return;
  }
  botaoTotp.disabled = false;
  botaoTotp.textContent = "Confirmar";
  if (r.status === 401) falhasSeguidas += 1;
  if (r.status === 401 && etapaExpirou()) {
    voltarAoLogin();
    mostrarErro(MSG_EXPIROU);
    return;
  }
  mostrarErroTotp(r.status === 401 ? "Código inválido." : "Não foi possível entrar agora.");
  campoTotp.focus();
});

alternar.addEventListener("click", () => {
  modoRecuperacao = !modoRecuperacao;
  ajustarCampoDoCodigo();
  campoTotp.focus();
});

voltar.addEventListener("click", voltarAoLogin);

// Instalação nova: o /saude público diz primeiro_acesso="ativo" (sem usuário e com código válido:
// o login leva ao primeiro-acesso.html) ou "expirado" (sem usuário e sem código válido: o login
// fica e avisa como gerar um código novo). Qualquer outra resposta ou falha deixa o login como
// está (e sem 404 no console, que a consulta a /primeiro-acesso causaria).
api.estadoDaInstalacao().then((estado) => {
  if (estado === "ativo") window.location.replace("primeiro-acesso.html");
  else if (estado === "expirado") document.getElementById("aviso-instalacao").hidden = false;
});
