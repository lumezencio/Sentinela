// Aba Configurações (#configuracoes, só admin): fontes de descoberta (cartões, formulário
// por tipo, testar/confiar/coletar/remover), sub-redes com a chave de varredura e a
// aprovação automática. Funções puras (testadas no Node) + o pedaço do componente "painel".
// Senha nunca volta para o formulário (a API nem a devolve: só `credencial_definida`).
import { api } from "./api.js";
import { avisoDoPainel, dispensarAviso, foiDispensado, textoDoAgendamento, textoDoResultado } from "./config-atualizacoes.js";
import { horaNoFuso } from "./alertas.js";
import { haQuanto } from "./lista.js";
import { textoSeguro } from "./novos.js";

export const TIPOS_FONTE = [
  { tipo: "mikrotik", nome: "MikroTik (RouterOS)" },
  { tipo: "snmp", nome: "Switch SNMP" },
  { tipo: "hikvision", nome: "Gravador Hikvision" },
  { tipo: "dahua", nome: "Gravador Dahua/Intelbras" },
];
const ROTULOS_TIPO = {
  mikrotik: "MikroTik", snmp: "SNMP", hikvision: "Hikvision", dahua: "Dahua", simulada: "Simulada",
};
const MANTER = "deixe em branco para manter a atual";
const MSG_FALHA = "Não foi possível concluir. Tente de novo.";
const HEX64 = /^[0-9a-f]{64}$/;
const IPV4 = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
const CIDR_V4 = /^(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})\/(\d{1,2})$/;
const MSG_GATEWAY_FORMATO = "Informe um endereço IPv4, como 192.168.15.1.";
const MSG_GATEWAY_FORA = "O gateway precisa estar dentro da sub-rede.";
const MSG_INTERVALO = "Informe de 15 a 240 minutos.";
export const INTERVALO_MIN = 15;
export const INTERVALO_MAX = 240;

/** IPv4 "a.b.c.d" como número sem sinal; null se o formato ou algum octeto é inválido. */
function ipv4ParaNumero(texto) {
  const m = IPV4.exec(texto);
  if (!m) return null;
  let n = 0;
  for (let i = 1; i <= 4; i++) {
    const octeto = Number(m[i]);
    if (octeto > 255) return null;
    n = n * 256 + octeto;
  }
  return n;
}

/**
 * Erro do campo "Gateway" de uma sub-rede ("" = pode enviar). Vazio apaga o gateway. Mesma regra
 * do servidor: endereço de host dentro da sub-rede (nem o da rede nem o de broadcast).
 */
export function validarGatewaySubrede(texto, cidr) {
  const t = String(texto ?? "").trim();
  if (!t) return "";
  const ip = ipv4ParaNumero(t);
  if (ip === null) return MSG_GATEWAY_FORMATO;
  const m = CIDR_V4.exec(String(cidr ?? ""));
  const base = m ? ipv4ParaNumero(m[1]) : null;
  const bits = m ? Number(m[2]) : -1;
  if (base === null || bits < 0 || bits > 32) return ""; // CIDR que o front não entende: o servidor decide
  const tamanho = 2 ** (32 - bits);
  const rede = base - (base % tamanho);
  if (ip < rede || ip >= rede + tamanho) return MSG_GATEWAY_FORA;
  if (tamanho > 2 && (ip === rede || ip === rede + tamanho - 1)) return MSG_GATEWAY_FORA;
  return "";
}

/** Intervalo da varredura automática (minutos): {valor, erro}; fora de 15 a 240 ou não inteiro → erro. */
export function validarIntervaloVarredura(texto) {
  const t = String(texto ?? "").trim();
  if (!/^\d{1,4}$/.test(t)) return { valor: null, erro: MSG_INTERVALO };
  const n = Number(t);
  if (n < INTERVALO_MIN || n > INTERVALO_MAX) return { valor: null, erro: MSG_INTERVALO };
  return { valor: n, erro: "" };
}

export function rotuloTipoFonte(tipo) {
  return Object.hasOwn(ROTULOS_TIPO, tipo) ? ROTULOS_TIPO[tipo] : textoSeguro(tipo, 32);
}

const temTls = (tipo) => tipo !== "snmp";

function campo(nome, rotulo, tipo, obrigatorio, dica = "") {
  return { nome, rotulo, tipo, obrigatorio, dica };
}

/** Campos do formulário, na ordem da tela, para o tipo (e a versão SNMP). */
export function formularioFonte(tipo, { versao = "2c", edicao = false } = {}) {
  const segredo = (nome, rotulo, dicaNovo = "") =>
    campo(nome, rotulo, "password", !edicao, edicao ? MANTER : dicaNovo);
  const campos = [
    campo("nome", "Nome", "text", true),
    campo("host", "Endereço IP", "text", true, "Precisa estar numa sub-rede monitorada."),
    campo("porta", "Porta (opcional)", "number", false, "Em branco usa a padrão do tipo."),
  ];
  if (temTls(tipo)) campos.push(campo("tls", "Usar TLS", "checkbox", false));
  campos.push(
    campo("intervalo_s", "Coletar a cada (segundos)", "number", true, "De 300 a 3600."),
    campo("ativa", "Fonte ativa", "checkbox", false),
  );
  if (tipo === "snmp") {
    campos.push(campo("versao", "Versão do SNMP", "select", true));
    if (versao === "3") {
      campos.push(
        campo("usuario", "Usuário SNMPv3", "text", !edicao, edicao ? MANTER : ""),
        campo("auth", "Autenticação", "select", true),
        segredo("senha_auth", "Senha de autenticação", "Mínimo de 8 caracteres."),
        campo("priv", "Privacidade (cifra)", "select", false),
        segredo("senha_priv", "Senha de privacidade", "Só com privacidade; mínimo de 8."),
      );
      campos[campos.length - 1].obrigatorio = false;
    } else {
      campos.push(segredo("comunidade", "Comunidade"));
    }
  } else {
    campos.push(
      campo("usuario", "Usuário", "text", !edicao, edicao ? MANTER : ""),
      segredo("senha", "Senha"),
    );
  }
  return campos;
}

/** Valores do formulário: dados não secretos da fonte (edição) ou padrões do tipo (nova). */
export function valoresIniciais(fonte, tipo = "mikrotik") {
  const t = fonte ? fonte.tipo : tipo;
  return {
    tipo: t,
    nome: fonte ? fonte.nome : "",
    host: fonte ? fonte.host : "",
    porta: fonte && fonte.porta ? String(fonte.porta) : "",
    tls: fonte ? Boolean(fonte.tls) : temTls(t),
    ativa: fonte ? Boolean(fonte.ativa) : true,
    intervalo_s: String(fonte ? fonte.intervalo_s : 600),
    versao: "2c",
    usuario: "",
    senha: "",
    comunidade: "",
    auth: "SHA",
    senha_auth: "",
    priv: "",
    senha_priv: "",
  };
}

const vazio = (v) => String(v ?? "").trim() === "";

/** Erros por campo ({} = válido). Na edição, segredo em branco mantém o atual. */
export function validarFonte(tipo, valores, { edicao = false } = {}) {
  const v = valores || {};
  const e = {};
  const nome = String(v.nome ?? "").trim();
  if (!nome) e.nome = "Informe um nome.";
  else if (nome.length > 64) e.nome = "Até 64 caracteres.";
  const host = String(v.host ?? "").trim();
  if (!host) e.host = "Informe o endereço.";
  else if (host.length > 45) e.host = "Endereço longo demais.";
  if (!vazio(v.porta)) {
    const p = Number(v.porta);
    if (!Number.isInteger(p) || p < 1 || p > 65535) e.porta = "Porta de 1 a 65535.";
  }
  const intervalo = Number(v.intervalo_s);
  if (!Number.isInteger(intervalo) || intervalo < 300 || intervalo > 3600) {
    e.intervalo_s = "De 300 a 3600 segundos.";
  }
  if (tipo === "snmp" && v.versao === "3") {
    const algum = !vazio(v.usuario) || !vazio(v.senha_auth) || !vazio(v.senha_priv);
    if (!edicao || algum) {
      if (vazio(v.usuario)) e.usuario = "Informe o usuário.";
      if (String(v.senha_auth ?? "").length < 8) e.senha_auth = "Mínimo de 8 caracteres.";
      if (!vazio(v.priv) && String(v.senha_priv ?? "").length < 8) {
        e.senha_priv = "Com privacidade, a senha tem no mínimo 8 caracteres.";
      }
    }
  } else if (tipo === "snmp") {
    if (!edicao && vazio(v.comunidade)) e.comunidade = "Informe a comunidade.";
  } else {
    const algum = !vazio(v.usuario) || !vazio(v.senha);
    if (!edicao || algum) {
      if (vazio(v.usuario)) e.usuario = "Informe o usuário.";
      if (vazio(v.senha)) e.senha = edicao ? "Para trocar o usuário, informe a senha também." : "Informe a senha.";
    }
  }
  return e;
}

function credencialDe(tipo, v, edicao) {
  if (tipo === "snmp" && v.versao === "3") {
    if (edicao && vazio(v.senha_auth)) return null;
    const c = { versao: "3", usuario: String(v.usuario), auth: v.auth || "SHA", senha_auth: String(v.senha_auth) };
    if (!vazio(v.priv)) {
      c.priv = v.priv;
      c.senha_priv = String(v.senha_priv);
    }
    return c;
  }
  if (tipo === "snmp") {
    if (edicao && vazio(v.comunidade)) return null;
    return { versao: "2c", comunidade: String(v.comunidade) };
  }
  if (edicao && vazio(v.senha)) return null;
  return { usuario: String(v.usuario), senha: String(v.senha) };
}

/** Corpo do POST (nova) ou do PATCH (edição: sem tipo; sem credencial se não houver segredo). */
export function montarFonte(tipo, valores, { edicao = false } = {}) {
  const v = valores || {};
  const corpo = {};
  if (!edicao) corpo.tipo = tipo;
  corpo.nome = String(v.nome ?? "").trim();
  corpo.host = String(v.host ?? "").trim();
  if (!vazio(v.porta)) corpo.porta = Number(v.porta);
  if (temTls(tipo)) corpo.tls = Boolean(v.tls);
  corpo.ativa = Boolean(v.ativa);
  corpo.intervalo_s = Number(v.intervalo_s);
  const credencial = credencialDe(tipo, v, edicao);
  if (credencial) corpo.credencial = credencial;
  return corpo;
}

const COMANDOS_CERTIFICADO =
  "No RouterOS: /certificate add name=sentinela common-name=sentinela days-valid=3650; " +
  "/certificate sign sentinela; /ip service set api-ssl certificate=sentinela. " +
  "Depois teste de novo e confira a impressão.";

/** Orientação para o erro de uma fonte (R5: api-ssl sem certificado no RouterOS). */
export function orientacaoErro(erro, tipo, tls) {
  const texto = String(erro ?? "");
  if (!texto) return "";
  if (texto.includes("não apresentou certificado")) {
    return tipo === "mikrotik"
      ? `O api-ssl (porta 8729) do RouterOS está sem certificado. ${COMANDOS_CERTIFICADO}`
      : "O aparelho não apresentou certificado TLS: ative o HTTPS nele ou desligue o TLS da fonte.";
  }
  if (tipo === "mikrotik" && tls && texto.includes("não foi possível conectar")) {
    return "Se a porta 8729 responde mas a conexão TLS falha, o api-ssl pode estar sem certificado. " +
      COMANDOS_CERTIFICADO;
  }
  if (texto.includes("ainda não confiado")) {
    return "Clique em Testar, confira a impressão do certificado com a do aparelho e use “Confiar neste certificado”.";
  }
  if (texto.includes("certificado do aparelho mudou")) {
    return "O certificado mudou desde a confirmação. Se a troca foi sua, teste e confie de novo; senão, investigue o aparelho.";
  }
  return "";
}

/** Impressão SHA-256 em pares "AB:CD:…"; qualquer coisa que não seja 64 hex → "". */
export function formatarImpressao(hex) {
  const h = String(hex ?? "").toLowerCase();
  if (!HEX64.test(h)) return "";
  return h.toUpperCase().match(/../g).join(":");
}

/** Dados de tela de uma fonte (objeto plano). */
export function cartaoDaFonte(f, agora = Date.now()) {
  const erro = textoSeguro(f.ultimo_erro, 200);
  return {
    id: String(f.id),
    tipo: f.tipo,
    tipoRotulo: rotuloTipoFonte(f.tipo),
    nome: textoSeguro(f.nome, 64),
    endereco: `${textoSeguro(f.host, 45)}:${Number(f.porta) || ""}`,
    tls: Boolean(f.tls),
    tlsRotulo: f.tls ? "TLS" : "sem TLS",
    ativa: Boolean(f.ativa),
    ativaRotulo: f.ativa ? "Ativa" : "Desativada",
    ativaIcone: f.ativa ? "#i-online" : "#i-pausado",
    coleta: f.ultima_coleta ? haQuanto(f.ultima_coleta, agora) : "nunca",
    coletaTitulo: f.ultima_coleta ? String(f.ultima_coleta) : "",
    erro,
    orientacao: orientacaoErro(erro, f.tipo, Boolean(f.tls)),
    confiada: Boolean(f.impressao_tls),
    credencialIlegivel: Boolean(f.credencial_ilegivel), // banco restaurado de outra instalação
    simulada: f.tipo === "simulada",
    idTitulo: `cfg-fonte-${String(f.id)}`,
    rotuloRemover: `Remover ${textoSeguro(f.nome, 64)}`,
    rotuloEditar: `Editar ${textoSeguro(f.nome, 64)}`,
    rotuloTestar: `Testar ${textoSeguro(f.nome, 64)}`,
    rotuloColetar: `Coletar agora ${textoSeguro(f.nome, 64)}`,
  };
}

function resultadoDoTeste(t, fonte) {
  const erro = textoSeguro(t.erro, 200);
  const avisos = (Array.isArray(t.avisos) ? t.avisos : []).slice(0, 10);
  return {
    ok: Boolean(t.ok),
    icone: t.ok ? "#i-online" : "#i-offline",
    temAvisos: avisos.length > 0,
    titulo: t.ok ? "Conexão funcionando" : "O teste falhou",
    identidade: textoSeguro(t.identidade, 120),
    versao: textoSeguro(t.versao, 64),
    avisos: avisos.map((a, i) => ({ i, texto: textoSeguro(a) })),
    impressao: HEX64.test(String(t.impressao_tls ?? "")) ? t.impressao_tls : "",
    impressaoFmt: formatarImpressao(t.impressao_tls),
    erro,
    orientacao: orientacaoErro(erro, fonte ? fonte.tipo : "", fonte ? Boolean(fonte.tls) : false),
  };
}

/** Estado e métodos da aba Configurações (admin). */
export function configuracoesDoPainel() {
  let fontes = []; // da API, fora da reatividade
  const testes = new Map(); // id -> resultado do último teste nesta tela
  const ocupadas = new Set();
  let pedidoFontes = 0; // número do último GET /fontes pedido (ver carregarFontes)
  const recusas = new Map(); // id -> erro da última ação no cartão
  let carregada = false;
  let gravarLimiar = 0;
  const gateways = new Map(); // id da sub-rede -> texto digitado no campo do gateway (ainda não salvo)
  const gatewayErros = new Map(); // id -> erro do campo

  return {
    cfgFontes: [],
    cfgCarregando: false,
    cfgPronta: false, // o conteúdo só aparece inteiro, depois da 1ª carga (sem pular de lugar)
    cfgErro: "",
    cfgAviso: "",
    cfgSubredes: [],
    cfgSubredesErro: "",
    ajustes: { aprovacao_automatica: false, limiar: 80, intervalo: 30 },
    ajustesErro: "",
    intervaloCampo: "30",
    intervaloErro: "",
    intervaloEditado: false, // o campo tem texto que ainda não foi salvo
    tiposFonte: TIPOS_FONTE,
    // formulário da fonte (diálogo)
    fonteForm: valoresIniciais(null),
    fonteEditando: "",
    fonteErros: {},
    fonteErroGeral: "",

    entrarEmConfiguracoes() {
      if (!this.admin) return;
      if (!carregada) this.carregarConfiguracoes();
      this.carregarAtualizacao(); // o resultado da madrugada, sem esperar o relógio
    },

    async carregarConfiguracoes() {
      carregada = true;
      this.cfgCarregando = true;
      await Promise.all([this.carregarFontes(), this.carregarSubredesCfg(), this.carregarAjustes()]);
      this.cfgCarregando = false;
      this.cfgPronta = true;
    },
    get cfgMostrar() {
      return this.admin && this.cfgPronta;
    },
    get cfgAguardando() {
      return this.admin && !this.cfgPronta;
    },

    cfgAoMensagem(msg) {
      if (msg.tipo === "fonte" && msg.acao === "coletada" && carregada && this.admin) {
        this.carregarFontes(); // ultimo_erro só vem em GET /fontes
      }
    },

    // ---------- fontes ----------
    async carregarFontes() {
      // uma lista pedida ANTES de outra (ex.: disparada por "coletada") pode chegar depois dela
      // e apagar a fonte recém-criada: só vale a resposta do pedido mais recente
      const pedido = ++pedidoFontes;
      const r = await api.listarFontes();
      if (pedido !== pedidoFontes) return;
      if (!r.ok || !Array.isArray(r.dados)) {
        this.cfgErro = r.erro || MSG_FALHA;
        return;
      }
      this.cfgErro = "";
      fontes = r.dados;
      this.renderizarFontes();
    },

    renderizarFontes() {
      const agora = Date.now();
      this.cfgFontes = fontes.map((f) => {
        const c = cartaoDaFonte(f, agora);
        const t = testes.get(c.id) || null;
        return {
          ...c,
          ocupada: ocupadas.has(c.id),
          recusa: recusas.get(c.id) || "",
          teste: t,
          temTeste: Boolean(t),
          idTeste: `cfg-teste-${c.id}`,
        };
      });
    },
    get semSubredesCfg() {
      return !this.cfgSubredesErro && this.cfgSubredes.length === 0 && carregada && !this.cfgCarregando;
    },
    get varreduraOcupada() {
      return this.enviando || this.varredura.rodando;
    },
    get cfgSemFontes() {
      return !this.cfgCarregando && !this.cfgErro && this.cfgFontes.length === 0;
    },

    async acaoFonte(id, chamar) {
      if (ocupadas.has(id)) return null;
      ocupadas.add(id);
      recusas.delete(id);
      this.cfgAviso = "";
      this.renderizarFontes();
      const r = await chamar();
      ocupadas.delete(id);
      if (!r.ok) {
        let msg = r.erro || MSG_FALHA;
        if (r.status === 429 && r.espera) msg = `${msg} (de novo em ${r.espera} s)`;
        recusas.set(id, msg);
      }
      this.renderizarFontes();
      return r.ok ? r : null;
    },

    async testarFonte(id) {
      const fonte = fontes.find((f) => f.id === id);
      const r = await this.acaoFonte(id, () => api.testarFonte(id));
      if (!r || !r.dados) return;
      testes.set(id, resultadoDoTeste(r.dados, fonte));
      this.renderizarFontes();
      this.$nextTick(() => {
        const el = document.getElementById(`cfg-teste-${id}`);
        if (el) el.focus();
      });
    },

    async confiarFonte(id) {
      const t = testes.get(id);
      if (!t || !t.impressao) return;
      const r = await this.acaoFonte(id, () => api.confiarFonte(id, t.impressao));
      if (!r) return;
      testes.delete(id);
      this.cfgAviso = "Certificado confiado: a coleta já pode usar esta conexão.";
      await this.carregarFontes();
    },

    fecharTesteFonte(id) {
      testes.delete(id);
      this.renderizarFontes();
    },

    async coletarFonte(id) {
      const r = await this.acaoFonte(id, () => api.coletarFonte(id));
      if (!r) return;
      this.cfgAviso = "Coleta pedida: o resultado aparece no cartão quando terminar.";
    },

    async removerFonte(id) {
      const f = fontes.find((x) => x.id === id);
      if (!f) return;
      const ok = await this.confirmar({
        titulo: `Remover ${textoSeguro(f.nome, 64)}?`,
        texto: "A fonte deixa de ser coletada e a credencial guardada é apagada. Câmeras deste" +
          " gravador ainda não aprovadas saem da fila de Novos. Equipamentos já aprovados continuam.",
        botao: "Remover",
        perigo: true,
      });
      if (!ok) return;
      const r = await this.acaoFonte(id, () => api.removerFonte(id));
      if (!r) return;
      testes.delete(id);
      this.cfgAviso = `Fonte “${textoSeguro(f.nome, 64)}” removida.`;
      await this.carregarFontes();
    },

    // ---------- formulário ----------
    abrirNovaFonte() {
      this.fonteEditando = "";
      this.fonteForm = valoresIniciais(null, "mikrotik");
      this.fonteErros = {};
      this.fonteErroGeral = "";
      this.$refs.dlgFonte.showModal();
    },
    abrirEdicaoFonte(id) {
      const f = fontes.find((x) => x.id === id);
      if (!f || f.tipo === "simulada") return;
      this.fonteEditando = id;
      this.fonteForm = valoresIniciais(f); // senha nunca volta preenchida
      this.fonteErros = {};
      this.fonteErroGeral = "";
      this.$refs.dlgFonte.showModal();
    },
    fecharFonte() {
      this.$refs.dlgFonte.close();
    },
    /** Trocar o tipo (só na criação) volta TLS ao padrão do tipo. */
    aoTrocarTipoFonte() {
      this.fonteForm.tls = temTls(this.fonteForm.tipo);
      this.fonteErros = {};
    },
    camposFonte() {
      return formularioFonte(this.fonteForm.tipo, {
        versao: this.fonteForm.versao,
        edicao: Boolean(this.fonteEditando),
      });
    },
    campoFonte(nome) {
      return this.camposFonte().some((c) => c.nome === nome);
    },
    obrigatorioFonte(nome) {
      const c = this.camposFonte().find((x) => x.nome === nome);
      return Boolean(c && c.obrigatorio);
    },
    dicaFonte(nome) {
      const c = this.camposFonte().find((x) => x.nome === nome);
      return c ? c.dica : "";
    },
    invalidoFonte(nome) {
      return this.fonteErros[nome] ? "true" : "false";
    },
    get tituloFonte() {
      return this.fonteEditando ? "Editar fonte" : "Nova fonte";
    },
    get criandoFonte() {
      return !this.fonteEditando;
    },
    get rotuloSalvarFonte() {
      return this.fonteEditando ? "Salvar" : "Criar fonte";
    },

    async salvarFonte() {
      if (this.enviando) return;
      const edicao = Boolean(this.fonteEditando);
      const tipo = this.fonteForm.tipo;
      this.fonteErros = validarFonte(tipo, this.fonteForm, { edicao });
      this.fonteErroGeral = "";
      const primeiro = Object.keys(this.fonteErros)[0];
      if (primeiro) {
        this.$nextTick(() => {
          const el = document.getElementById(`fonte-${primeiro}`);
          if (el) el.focus();
        });
        return;
      }
      const corpo = montarFonte(tipo, this.fonteForm, { edicao });
      this.enviando = true;
      const r = edicao ? await api.editarFonte(this.fonteEditando, corpo) : await api.criarFonte(corpo);
      this.enviando = false;
      // os segredos saem da memória da tela assim que o pedido termina
      this.fonteForm.senha = "";
      this.fonteForm.comunidade = "";
      this.fonteForm.senha_auth = "";
      this.fonteForm.senha_priv = "";
      if (!r.ok) {
        this.fonteErroGeral = r.erro || MSG_FALHA;
        return;
      }
      if (edicao) testes.delete(this.fonteEditando);
      this.$refs.dlgFonte.close();
      this.cfgAviso = edicao
        ? `Fonte “${textoSeguro(r.dados && r.dados.nome, 64)}” salva.`
        : `Fonte “${textoSeguro(r.dados && r.dados.nome, 64)}” criada. Use Testar para conferir a conexão.`;
      await this.carregarFontes();
    },

    // ---------- sub-redes e varredura ----------
    async carregarSubredesCfg() {
      const r = await api.listarSubredes();
      if (!r.ok || !Array.isArray(r.dados)) {
        this.cfgSubredesErro = r.erro || MSG_FALHA;
        return;
      }
      this.cfgSubredesErro = "";
      this.cfgSubredes = r.dados.map((s) => this.linhaDaSubrede(s));
    },

    linhaDaSubrede(s) {
      const cidr = textoSeguro(s.cidr, 43);
      const gateway = typeof s.gateway_ip === "string" ? textoSeguro(s.gateway_ip, 45) : "";
      const campo = gateways.has(s.id) ? gateways.get(s.id) : gateway;
      return {
        id: s.id,
        cidr,
        permite: Boolean(s.permite_varredura),
        marcado: s.permite_varredura ? "true" : "false",
        rotuloChave: `Permitir varredura em ${cidr}`,
        rotuloIniciar: `Iniciar varredura em ${cidr}`,
        gateway,
        gatewayCampo: campo,
        gatewayErro: gatewayErros.get(s.id) || "",
        ultimaVarreduraIso: s.ultima_varredura_em || null,
        idGateway: `cfg-gw-${s.id}`,
        idGatewayErro: `cfg-gw-erro-${s.id}`,
        rotuloGateway: `Gateway (roteador) de ${cidr}`,
        rotuloSalvarGateway: `Salvar o gateway de ${cidr}`,
        ultimaVarredura: s.ultima_varredura_em
          ? `Última varredura: ${horaNoFuso(s.ultima_varredura_em, Date.now(), this.fuso)}`
          : "Ainda não foi varrida.",
      };
    },

    /** Digitou no campo do gateway: guarda (fora da reatividade das linhas) e limpa o erro. */
    aoEditarGateway(evento) {
      const id = Number(evento.target.dataset.id);
      gateways.set(id, evento.target.value);
      if (gatewayErros.delete(id)) this.renderizarSubredesCfg();
    },
    renderizarSubredesCfg() {
      this.cfgSubredes = this.cfgSubredes.map((x) => this.linhaDaSubrede({
        id: x.id, cidr: x.cidr, permite_varredura: x.permite, gateway_ip: x.gateway || null,
        ultima_varredura_em: x.ultimaVarreduraIso,
      }));
    },
    async salvarGatewaySubrede(id) {
      if (!this.admin || this.enviando) return;
      const s = this.cfgSubredes.find((x) => x.id === id);
      if (!s) return;
      const texto = (gateways.has(id) ? gateways.get(id) : s.gateway).trim();
      const erro = validarGatewaySubrede(texto, s.cidr);
      if (erro) {
        gatewayErros.set(id, erro);
        this.renderizarSubredesCfg();
        return;
      }
      this.enviando = true;
      this.cfgSubredesErro = "";
      const r = await api.editarSubrede(id, { gateway_ip: texto || null });
      this.enviando = false;
      if (!r.ok) {
        gatewayErros.set(id, r.erro || MSG_FALHA);
        this.renderizarSubredesCfg();
        return;
      }
      gateways.delete(id);
      gatewayErros.delete(id);
      this.cfgAviso = texto ? `Gateway de ${s.cidr} salvo.` : `Gateway de ${s.cidr} removido.`;
      await this.carregarSubredesCfg();
    },

    async alternarVarreduraSubrede(id) {
      const s = this.cfgSubredes.find((x) => x.id === id);
      if (!s || this.enviando) return;
      this.enviando = true;
      this.cfgSubredesErro = "";
      const r = await api.editarSubrede(id, { permite_varredura: !s.permite });
      this.enviando = false;
      if (!r.ok) {
        this.cfgSubredesErro = r.erro || MSG_FALHA;
        return;
      }
      this.cfgAviso = r.dados.permite_varredura
        ? `Varredura permitida em ${s.cidr}.`
        : `Varredura desligada em ${s.cidr}.`;
      await this.carregarSubredesCfg();
    },

    async iniciarVarreduraSubrede(id) {
      const s = this.cfgSubredes.find((x) => x.id === id);
      if (!s || this.enviando) return;
      this.enviando = true;
      this.cfgSubredesErro = "";
      const r = await api.iniciarVarredura(id);
      this.enviando = false;
      if (!r.ok) {
        this.cfgSubredesErro = r.erro || MSG_FALHA;
        return;
      }
      if (r.dados && r.dados.progresso) this.aplicarVarredura({ ...r.dados.progresso, estado: "rodando" });
    },

    // ---------- aprovação automática ----------
    async carregarAjustes() {
      const r = await api.verAjustes();
      if (!r.ok || !r.dados) {
        this.ajustesErro = r.erro || MSG_FALHA;
        return;
      }
      this.aplicarAjustes(r.dados);
    },
    aplicarAjustes(a) {
      this.ajustesErro = "";
      this.ajustes = {
        aprovacao_automatica: Boolean(a.aprovacao_automatica),
        limiar: Math.round(Number(a.limiar_aprovacao) * 100) || 80,
        intervalo: Number.isInteger(a.varredura_continua_min) ? a.varredura_continua_min : 30,
      };
      if (!this.intervaloEditado) this.intervaloCampo = String(this.ajustes.intervalo);
    },
    /** Intervalo da varredura automática: 15 a 240 minutos; fora disso nada é enviado. */
    aoEditarIntervalo() {
      this.intervaloEditado = true;
      this.intervaloErro = "";
    },
    async salvarIntervalo() {
      if (!this.admin || this.enviando) return;
      const { valor, erro } = validarIntervaloVarredura(this.intervaloCampo);
      if (erro) {
        this.intervaloErro = erro;
        return;
      }
      this.enviando = true;
      this.intervaloErro = "";
      const r = await api.editarAjustes({ varredura_continua_min: valor });
      this.enviando = false;
      if (!r.ok || !r.dados) {
        this.intervaloErro = r.erro || MSG_FALHA;
        return;
      }
      this.intervaloEditado = false;
      this.aplicarAjustes(r.dados);
      this.cfgAviso = `A varredura automática vai rodar a cada ${valor} minutos.`;
    },
    get intervaloSemErro() {
      return !this.intervaloErro;
    },
    get rotuloAutomatica() {
      return this.ajustes.aprovacao_automatica ? "true" : "false";
    },
    get textoLimiar() {
      return `${this.ajustes.limiar}%`;
    },
    async alternarAprovacaoAutomatica() {
      if (this.enviando) return;
      this.enviando = true;
      const r = await api.editarAjustes({ aprovacao_automatica: !this.ajustes.aprovacao_automatica });
      this.enviando = false;
      if (!r.ok || !r.dados) {
        this.ajustesErro = r.erro || MSG_FALHA;
        return;
      }
      this.aplicarAjustes(r.dados);
    },
    aoMoverLimiar(evento) {
      const valor = Math.min(100, Math.max(50, Math.round(Number(evento.target.value)) || 80));
      this.ajustes.limiar = valor;
      window.clearTimeout(gravarLimiar);
      gravarLimiar = window.setTimeout(() => this.gravarLimiar(valor), 400);
    },
    async gravarLimiar(valor) {
      const r = await api.editarAjustes({ limiar_aprovacao: valor / 100 });
      if (!r.ok || !r.dados) {
        this.ajustesErro = r.erro || MSG_FALHA;
        return;
      }
      this.aplicarAjustes(r.dados);
    },
  };
}

// ---------- cartões Segurança e Backup (Fase 4B) ----------
// Moram aqui (e não num módulo próprio) para a aba abrir sem mais um pedido de rede. Nada aqui
// grava senha, chave ou código em console ou armazenamento; texto do servidor só por x-text.

// As funções puras dos cartões só são baixadas quando um cartão vai ser mostrado: a aba
// Configurações abre com menos pedidos (cada módulo a mais custa uma ida e volta na rede).
const carregarFormatadores = {
  backup: () => import("./config-backup.js"),
  seguranca: () => import("./config-seguranca.js"),
};

/**
 * Chama `acao` quando o cartão `id` está na janela (ou já, sem IntersectionObserver). Os pedidos
 * dos cartões Segurança e Backup só saem quando alguém os vê: a aba Configurações abre sem
 * esse custo extra de rede e de renderização.
 */
function quandoVisivel(id, acao) {
  const alvo = document.getElementById(id);
  if (!alvo || typeof IntersectionObserver !== "function") {
    acao();
    return;
  }
  const obs = new IntersectionObserver((entradas) => {
    if (!entradas.some((e) => e.isIntersecting)) return;
    obs.disconnect();
    acao();
  });
  obs.observe(alvo);
}

/** Estado e métodos do cartão Segurança; mesmo `this` do componente "painel". */
export function segurancaDoPainel() {
  let carregando = false;
  let focoAntes = null;
  let formatar = null; // módulo config-seguranca.js, depois do 1º carregamento

  return {
    segExigir: false,
    segMeuTotp: false,
    segUsuarios: [],
    segCarregando: false,
    segSalvando: false,
    segErroGeral: "",
    segAviso: "",
    // diálogo "Zerar segundo fator"
    segAlvo: { id: 0, login: "" },
    segSenha: "",
    segZerarErro: "",
    segZerando: false,

    entrarEmSeguranca() {
      if (!this.admin) return;
      quandoVisivel("cfg-seguranca", async () => {
        if (carregando) return;
        carregando = true;
        try {
          await this.carregarSeguranca(this.segUsuarios.length === 0);
        } finally {
          carregando = false;
        }
      });
    },

    async carregarSeguranca(comAviso = true) {
      this.segCarregando = comAviso;
      const [politica, usuarios, eu] = await Promise.all([
        api.verSeguranca(),
        api.listarUsuarios(),
        api.eu(),
      ]);
      if (!politica.ok || !usuarios.ok || !eu.ok) {
        this.segCarregando = false;
        this.segErroGeral = (!politica.ok ? politica : !usuarios.ok ? usuarios : eu).erro || MSG_FALHA;
        return false;
      }
      this.segErroGeral = "";
      this.segExigir = Boolean(politica.dados && politica.dados.exigir_totp_admin);
      this.segMeuTotp = Boolean(eu.dados && eu.dados.totp_ativo);
      try {
        formatar = await carregarFormatadores.seguranca();
        this.segUsuarios = (Array.isArray(usuarios.dados) ? usuarios.dados : []).map((u) => ({
          ...formatar.linhaDoUsuario(u),
          rotuloZerar: `Zerar o segundo fator de ${textoSeguro(u.login, 64)}`,
        }));
      } finally {
        // só depois da lista: com "carregando" falso e a lista ainda vazia, o aviso "Nenhum usuário"
        // aparece por um instante e o Alpine (x-show adia o "mostrar" para o próximo quadro) o deixa
        // preso na tela depois que a lista chega
        this.segCarregando = false;
      }
      return true;
    },

    get segExigirMarcado() {
      return this.segExigir ? "true" : "false";
    },
    get segMeuTotpTexto() {
      return this.segMeuTotp
        ? "O segundo fator está ativo na sua conta."
        : "O segundo fator ainda não está ativo na sua conta.";
    },
    get segSemUsuarios() {
      return !this.segCarregando && this.segUsuarios.length === 0;
    },
    get segTituloZerar() {
      return `Zerar o segundo fator de ${this.segAlvo.login}?`;
    },

    async alternarExigirTotp() {
      if (this.segSalvando) return;
      const novo = !this.segExigir;
      if (novo && !this.segMeuTotp) {
        const ok = await this.confirmar({
          titulo: "Exigir o segundo fator?",
          texto:
            "Sua conta ainda não tem o segundo fator. Se você exigir agora, a política vale na hora: " +
            "esta sessão fica restrita e você será levado à página Segurança para ativá-lo antes de " +
            "voltar ao painel. Prefere ativar o seu antes? Cancele e use “Proteger minha conta”.",
          botao: "Exigir mesmo assim",
          perigo: true,
        });
        if (!ok) return;
      }
      this.segAviso = "";
      this.segErroGeral = "";
      this.segSalvando = true;
      const r = await api.definirSeguranca(novo);
      this.segSalvando = false;
      if (!r.ok) {
        this.segErroGeral = r.erro || MSG_FALHA;
        return;
      }
      this.segExigir = Boolean(r.dados && r.dados.exigir_totp_admin);
      if (this.segExigir && !this.segMeuTotp) {
        // a política vale na hora e a sessão passa a ser restrita: o painel inteiro daria 403
        window.location.replace("seguranca.html");
        return;
      }
      this.segAviso = this.segExigir
        ? "Agora todo administrador precisa do segundo fator."
        : "O segundo fator deixou de ser obrigatório para administradores.";
    },

    abrirZerar(id) {
      const u = this.segUsuarios.find((x) => x.id === id);
      if (!u || this.segZerando) return;
      this.segAlvo = { id: u.id, login: u.login };
      this.segSenha = "";
      this.segZerarErro = "";
      focoAntes = document.activeElement;
      this.$refs.dlgZerar.showModal();
      this.$nextTick(() => this.$refs.segSenhaCampo && this.$refs.segSenhaCampo.focus());
    },

    fecharZerar() {
      this.$refs.dlgZerar.close();
    },

    aoFecharZerar() {
      this.segSenha = "";
      this.segZerarErro = "";
      if (focoAntes && focoAntes.isConnected && typeof focoAntes.focus === "function") focoAntes.focus();
      focoAntes = null;
    },

    async confirmarZerar() {
      if (this.segZerando) return;
      if (!this.segSenha) {
        this.segZerarErro = "Digite sua senha para confirmar.";
        return;
      }
      this.segZerando = true;
      this.segZerarErro = "";
      const r = await api.zerarTotp(this.segAlvo.id, this.segSenha);
      this.segZerando = false;
      this.segSenha = "";
      if (!r.ok) {
        this.segZerarErro =
          r.status === 401 ? "Senha incorreta." : r.status === 404 ? "Usuário não encontrado." : r.erro || MSG_FALHA;
        return;
      }
      const login = this.segAlvo.login;
      this.$refs.dlgZerar.close();
      this.segAviso = `Segundo fator de ${login} zerado. As sessões dele foram encerradas.`;
      await this.carregarSeguranca(false);
    },
  };
}

/** Estado e métodos do cartão Backup; mesmo `this` do componente "painel". */
export function backupDoPainel() {
  let carregado = false;
  let carregando = false;
  let formatar = null; // módulo config-backup.js, depois do 1º carregamento
  let leitura = 0; // número da leitura mais recente de GET /backup

  return {
    bkUltimoErro: "",
    bkDiretorio: "",
    bkCarregando: false,
    bkCriando: false,
    bkErro: "",
    bkAviso: "",
    bkStatusBruto: null,

    entrarEmBackup() {
      if (!this.admin) return;
      quandoVisivel("cfg-backup", async () => {
        if (carregando) return;
        carregando = true;
        try {
          carregado = await this.carregarBackup(!carregado);
        } finally {
          carregando = false;
        }
      });
    },

    async carregarBackup(comAviso = true) {
      // a leitura inicial (cartão visível) e a releitura do "Fazer backup agora" podem correr
      // juntas: só a mais recente mexe no cartão, senão a resposta antiga sobrescreve a nova e o
      // aviso de lista vazia vai e volta no mesmo quadro (o x-show do Alpine perde um "esconder"
      // nessa sequência e o aviso fica preso por cima da lista)
      const minha = ++leitura;
      this.bkCarregando = comAviso;
      const r = await api.verBackup();
      const deu = Boolean(r.ok && r.dados);
      if (deu) formatar = formatar || (await carregarFormatadores.backup());
      if (minha !== leitura) return deu;
      if (!deu) {
        this.bkCarregando = false;
        this.bkErro = r.erro || MSG_FALHA;
        return false;
      }
      this.bkErro = "";
      try {
        await this.aplicarBackup(r.dados);
      } finally {
        this.bkCarregando = false; // só depois da lista (mesmo motivo do carregarSeguranca)
      }
      return true;
    },

    async aplicarBackup(d) {
      formatar = formatar || (await carregarFormatadores.backup()); // antes de mostrar a lista
      this.bkStatusBruto = d;
      this.bkDiretorio = textoSeguro(d.diretorio, 120);
      this.bkUltimoErro = textoSeguro(d.ultimo_erro, 300);
    },

    // calculados a cada leitura: se o fuso chegar depois da lista, os horários se refazem sozinhos
    get bkResumo() {
      return this.bkStatusBruto ? formatar.resumoDoUltimo(this.bkStatusBruto, this.fuso) : "";
    },
    get bkCopias() {
      const d = this.bkStatusBruto;
      if (!d) return [];
      return (Array.isArray(d.copias) ? d.copias : []).map((c, i) => ({
        i,
        ...formatar.linhaDoBackup(c, this.fuso),
      }));
    },

    // só depois de uma leitura: antes dela não se sabe se há cópias
    get bkSemCopias() {
      return this.bkStatusBruto !== null && !this.bkCarregando && this.bkCopias.length === 0;
    },
    get bkTextoAgenda() {
      return `Cópia automática todos os dias às 03:00, no fuso ${this.fuso}. Ficam 7 diárias e 4 semanais.`;
    },

    async fazerBackupAgora() {
      if (this.bkCriando) return;
      this.bkAviso = "";
      this.bkErro = "";
      this.bkCriando = true;
      const r = await api.criarBackup();
      this.bkCriando = false;
      if (!r.ok) {
        this.bkErro = r.erro || MSG_FALHA;
        return;
      }
      this.bkAviso = "Backup feito.";
      await this.carregarBackup(false);
    },
  };
}

// ---------- cartão Atualizações e aviso de 24 h (Fase 5) ----------
/**
 * Estado e métodos de Configurações → Atualizações e do aviso abaixo do cabeçalho; mesmo `this`
 * do componente "painel". Qualquer usuário lê o estado (o aviso é de todos); só o admin liga e
 * desliga. A API só lê e grava o atualizacao.json: quem atualiza é o update.sh no servidor.
 */
export function atualizacaoDoPainel() {
  let pedido = 0;

  return {
    atz: null, // estado bruto de GET /atualizacao
    atzAvisoDispensado: false, // a pessoa já dispensou este aviso (guardado por pessoa)
    atzSalvando: false,
    atzErro: "",
    atzAviso: "",

    async carregarAtualizacao() {
      const meu = ++pedido;
      const r = await api.verAtualizacao();
      if (meu !== pedido || !r.ok || !r.dados || typeof r.dados.versao !== "string") return;
      this.atz = r.dados;
      this.atzAvisoDispensado = foiDispensado(r.dados, this.usuario);
    },

    // ---- aviso abaixo do cabeçalho (todos os usuários) ----
    get atzAvisoDados() {
      return this.atz ? avisoDoPainel(this.atz, this.fuso) : null;
    },
    get atzAvisoVisivel() {
      return this.atzAvisoDados !== null && !this.atzAvisoDispensado;
    },
    get atzAvisoTexto() {
      const a = this.atzAvisoDados;
      return a ? a.texto : "";
    },
    get atzAvisoClasse() {
      const a = this.atzAvisoDados;
      return a && a.tipo === "atencao" ? "aviso-atz aviso-atz-atencao" : "aviso-atz";
    },
    dispensarAvisoAtualizacao() {
      if (!this.atz) return;
      dispensarAviso(this.atz, this.usuario);
      this.atzAvisoDispensado = true;
    },

    // ---- cartão em Configurações (admin) ----
    get atzVersao() {
      return this.atz ? `Versão instalada: ${textoSeguro(this.atz.versao, 32)}` : "";
    },
    get atzMarcado() {
      return this.atz && this.atz.ativo ? "true" : "false";
    },
    get atzResultado() {
      return this.atz ? textoDoResultado(this.atz, this.fuso) : "";
    },
    get atzResultadoClasse() {
      const r = this.atz ? this.atz.resultado : null;
      if (r === "voltou" || r === "falhou") return "alerta cfg-atz-resultado";
      if (r === "atualizado") return "alerta alerta-ok cfg-atz-resultado";
      return "alerta cfg-atz-resultado cfg-atz-neutro";
    },
    get atzAgendamento() {
      return this.atz ? textoDoAgendamento(this.atz) : "";
    },
    get atzIlegivel() {
      return Boolean(this.atz && this.atz.arquivo_ilegivel);
    },
    get atzCarregado() {
      return this.atz !== null;
    },

    async alternarAtualizacao() {
      if (!this.admin || !this.atz || this.atzSalvando) return;
      this.atzSalvando = true;
      this.atzErro = "";
      this.atzAviso = "";
      const r = await api.definirAtualizacao(!this.atz.ativo);
      this.atzSalvando = false;
      if (!r.ok || !r.dados) {
        this.atzErro = r.erro || MSG_FALHA;
        return;
      }
      this.atz = r.dados;
      this.atzAviso = r.dados.ativo
        ? "Atualização automática ligada."
        : "Atualização automática desligada.";
    },
  };
}
