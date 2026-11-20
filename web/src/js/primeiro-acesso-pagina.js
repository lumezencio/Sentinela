// Página primeiro-acesso.html: assistente de quatro passos (código, administrador, rede, concluir).
// O código de instalação só existe na variável `codigoConferido` (nunca em log, URL, armazenamento
// nem na tela depois de enviado); o campo é limpo a cada envio. Texto do servidor só por textContent.
import { api } from "./api.js";
import { AVISO_ARP } from "./novos.js";
import {
  COMANDO_NOVO_CODIGO,
  PASSOS,
  validarAdministrador,
  validarCodigoInstalacao,
  validarRede,
} from "./primeiro-acesso.js";

const $ = (id) => document.getElementById(id);
const formularios = Object.fromEntries(PASSOS.map((p) => [p, $(`passo-${p}`)]));
const campoCodigo = $("codigo");
const campoLogin = $("login-admin");
const campoSenha = $("senha-admin");
const campoConfirma = $("senha-confirma");
const campoCidr = $("cidr");
const campoGateway = $("gateway");
const chave = $("chave-varredura");
const blocoComando = $("pa-novo-codigo");
const textoComando = $("pa-novo-texto");
const trilha = [...$("pa-trilha").children];
const MSG_SEM_CONEXAO = "Não foi possível falar com o servidor. Confira a conexão e tente de novo.";
const MSG_NOVO_CODIGO = "O código de instalação não existe ou expirou. No computador onde o Sentinela está instalado, gere um novo com este comando:";

let codigoConferido = ""; // só aqui; vira "" no erro e ao sair da página
let passo = 0;
let contagem = 0;

$("pa-arp").textContent = `${AVISO_ARP} Com a chave desligada nada é enviado aos aparelhos; dá para ligar depois em Configurações.`;
$("pa-comando").textContent = COMANDO_NOVO_CODIGO;

function mostrarErro(id, texto) {
  const el = $(id);
  el.textContent = texto;
  el.hidden = !texto;
  for (const campo of el.closest("form").querySelectorAll("[aria-invalid]")) campo.removeAttribute("aria-invalid");
}

function marcarInvalido(campo) {
  campo.setAttribute("aria-invalid", "true");
  campo.focus();
}

function irPara(indice, focar = true) {
  passo = indice;
  PASSOS.forEach((nome, i) => {
    formularios[nome].hidden = i !== indice;
  });
  trilha.forEach((el, i) => el.classList.toggle("feito", i <= indice));
  $("pa-passo").textContent = `Passo ${indice + 1} de ${PASSOS.length}`;
  if (focar) {
    // foco no título do passo: o leitor de tela anuncia onde está; Tab segue para o primeiro campo
    $(`h-${PASSOS[indice]}`).focus();
  }
}

function voltarAoLogin() {
  codigoConferido = "";
  window.location.replace("login.html");
}

function destacarComando(texto) {
  textoComando.textContent = texto;
  blocoComando.classList.add("pa-destaque");
}

function bloquear(botao, rotulo, segundos) {
  window.clearInterval(contagem);
  let resta = Math.max(1, segundos);
  botao.disabled = true;
  const tique = () => {
    if (resta <= 0) {
      window.clearInterval(contagem);
      botao.disabled = false;
      botao.textContent = rotulo;
      return;
    }
    botao.textContent = `Aguarde ${resta} s`;
    resta -= 1;
  };
  tique();
  contagem = window.setInterval(tique, 1000);
}

/** Volta ao passo do código, com o campo limpo e o motivo na tela. */
function recomecarPeloCodigo(mensagem) {
  codigoConferido = "";
  campoCodigo.value = "";
  irPara(0, false);
  mostrarErro("erro-codigo", mensagem);
  campoCodigo.focus();
}

async function atualizarEstadoDoCodigo() {
  const r = await api.estadoPrimeiroAcesso();
  if (r.status === 404) {
    voltarAoLogin();
    return;
  }
  if (r.estado === "expirado" || r.estado === "ausente") destacarComando(MSG_NOVO_CODIGO);
}

formularios.codigo.addEventListener("submit", async (evento) => {
  evento.preventDefault();
  const botao = $("continuar-codigo");
  const v = validarCodigoInstalacao(campoCodigo.value);
  if (!v.ok) {
    mostrarErro("erro-codigo", v.erro);
    marcarInvalido(campoCodigo);
    return;
  }
  mostrarErro("erro-codigo", "");
  botao.disabled = true;
  botao.textContent = "Conferindo…";
  const r = await api.conferirCodigo(v.codigo);
  campoCodigo.value = ""; // o código nunca fica no campo depois de enviado
  if (r.status === 404) {
    voltarAoLogin();
    return;
  }
  if (r.ok) {
    codigoConferido = v.codigo;
    const rede = (r.dados && r.dados.rede) || {};
    campoCidr.value = typeof rede.cidr === "string" ? rede.cidr : "";
    campoGateway.value = typeof rede.gateway === "string" ? rede.gateway : "";
    botao.disabled = false;
    botao.textContent = "Continuar";
    irPara(1);
    return;
  }
  codigoConferido = "";
  if (r.status === 429) {
    mostrarErro("erro-codigo", r.erro);
    destacarComando("Para gerar um código novo (isso também libera o bloqueio), rode no computador do Sentinela:");
    bloquear(botao, "Continuar", r.espera || 30);
    return;
  }
  botao.disabled = false;
  botao.textContent = "Continuar";
  if (r.status === 401) {
    mostrarErro("erro-codigo", r.erro);
    await atualizarEstadoDoCodigo();
  } else {
    mostrarErro("erro-codigo", r.status === 0 ? MSG_SEM_CONEXAO : "Não foi possível conferir agora. Tente de novo.");
  }
  campoCodigo.focus();
});

formularios.administrador.addEventListener("submit", (evento) => {
  evento.preventDefault();
  const v = validarAdministrador(campoLogin.value, campoSenha.value, campoConfirma.value);
  if (!v.ok) {
    mostrarErro("erro-administrador", v.erro);
    marcarInvalido(campoLogin.value.trim() === "" || campoLogin.value.trim().length > 64 ? campoLogin : campoSenha);
    return;
  }
  mostrarErro("erro-administrador", "");
  irPara(2);
});

chave.addEventListener("click", () => {
  chave.setAttribute("aria-checked", chave.getAttribute("aria-checked") === "true" ? "false" : "true");
});

formularios.rede.addEventListener("submit", (evento) => {
  evento.preventDefault();
  const v = validarRede(campoCidr.value, campoGateway.value);
  if (!v.ok) {
    mostrarErro("erro-rede", v.erro);
    // o gateway só falha se a sub-rede estiver certa
    const cidrOk = validarRede(campoCidr.value, "").ok;
    marcarInvalido(cidrOk ? campoGateway : campoCidr);
    return;
  }
  mostrarErro("erro-rede", "");
  const gateway = campoGateway.value.trim();
  $("res-login").textContent = campoLogin.value.trim();
  $("res-cidr").textContent = campoCidr.value.trim();
  $("res-gateway").textContent = gateway || "Não informado";
  $("res-varredura").textContent =
    chave.getAttribute("aria-checked") === "true"
      ? "Ligada: o Sentinela procura os aparelhos devagar, a cada 30 minutos"
      : "Desligada: você pode ligar depois em Configurações";
  mostrarErro("erro-concluir", "");
  irPara(3);
});

formularios.concluir.addEventListener("submit", async (evento) => {
  evento.preventDefault();
  const botao = $("concluir");
  mostrarErro("erro-concluir", "");
  botao.disabled = true;
  botao.textContent = "Concluindo…";
  const r = await api.concluirPrimeiroAcesso({
    codigo: codigoConferido,
    login: campoLogin.value.trim(),
    senha: campoSenha.value,
    cidr: campoCidr.value.trim(),
    gateway: campoGateway.value.trim(),
    varredura: chave.getAttribute("aria-checked") === "true",
  });
  if (r.ok) {
    codigoConferido = "";
    campoSenha.value = "";
    campoConfirma.value = "";
    window.location.replace("index.html");
    return;
  }
  if (r.status === 404) {
    voltarAoLogin();
    return;
  }
  if (r.status === 401) {
    recomecarPeloCodigo(r.erro);
    botao.disabled = false;
    botao.textContent = "Concluir e entrar";
    await atualizarEstadoDoCodigo();
    return;
  }
  if (r.status === 429) {
    mostrarErro("erro-concluir", r.erro);
    bloquear(botao, "Concluir e entrar", r.espera || 30);
    return;
  }
  botao.disabled = false;
  botao.textContent = "Concluir e entrar";
  mostrarErro("erro-concluir", r.status === 0 ? MSG_SEM_CONEXAO : r.erro);
});

for (const voltar of document.querySelectorAll("[data-voltar]")) {
  voltar.addEventListener("click", () => irPara(Math.max(0, passo - 1)));
}

window.addEventListener("pagehide", () => {
  codigoConferido = "";
});

atualizarEstadoDoCodigo();
