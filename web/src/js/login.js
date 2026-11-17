// Tela de login: JSON para /auth/login; mensagens genéricas; espera do 429 com contagem.
import { api } from "./api.js";

const form = document.getElementById("form-login");
const campoLogin = document.getElementById("login");
const campoSenha = document.getElementById("senha");
const botao = document.getElementById("entrar");
const erro = document.getElementById("erro-login");
let contagem = 0;

function mostrarErro(texto) {
  erro.textContent = texto;
  erro.hidden = !texto;
}

function bloquearPor(segundos) {
  window.clearInterval(contagem);
  let resta = Math.max(1, segundos);
  botao.disabled = true;
  const tique = () => {
    if (resta <= 0) {
      window.clearInterval(contagem);
      botao.disabled = false;
      botao.textContent = "Entrar";
      return;
    }
    botao.textContent = `Aguarde ${resta} s`;
    resta -= 1;
  };
  tique();
  contagem = window.setInterval(tique, 1000);
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
  if (r.ok) {
    window.location.replace("index.html");
    return;
  }
  campoSenha.value = "";
  if (r.status === 429) {
    mostrarErro("Muitas tentativas. Aguarde e tente novamente.");
    bloquearPor(r.espera || 30);
    return;
  }
  botao.disabled = false;
  botao.textContent = "Entrar";
  mostrarErro(r.status === 401 ? "Login ou senha inválidos." : "Não foi possível entrar agora.");
  campoSenha.focus();
});
