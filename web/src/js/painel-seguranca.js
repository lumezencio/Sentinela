// Configurações → cartões Segurança e Backup (só admin): o pedaço do componente "painel".
// As funções puras (formatação, validação) ficam em config-seguranca.js e config-backup.js.
// Nada aqui grava senha, chave ou código em console ou armazenamento; texto do servidor só
// entra na tela por x-text (textContent).
import { api } from "./api.js";
import { linhaDoBackup, resumoDoUltimo } from "./config-backup.js";
import { linhaDoUsuario } from "./config-seguranca.js";
import { limparTexto } from "./lista.js";

const MSG_FALHA = "Não foi possível concluir. Tente de novo.";

/** Estado e métodos do cartão Segurança; mesmo `this` do componente "painel". */
export function segurancaDoPainel() {
  let carregando = false;
  let focoAntes = null;

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

    async entrarEmSeguranca() {
      if (!this.admin || carregando) return;
      carregando = true;
      try {
        await this.carregarSeguranca(this.segUsuarios.length === 0);
      } finally {
        carregando = false;
      }
    },

    async carregarSeguranca(comAviso = true) {
      this.segCarregando = comAviso;
      const [politica, usuarios, eu] = await Promise.all([
        api.verSeguranca(),
        api.listarUsuarios(),
        api.eu(),
      ]);
      this.segCarregando = false;
      if (!politica.ok || !usuarios.ok || !eu.ok) {
        this.segErroGeral = (!politica.ok ? politica : !usuarios.ok ? usuarios : eu).erro || MSG_FALHA;
        return false;
      }
      this.segErroGeral = "";
      this.segExigir = Boolean(politica.dados && politica.dados.exigir_totp_admin);
      this.segMeuTotp = Boolean(eu.dados && eu.dados.totp_ativo);
      this.segUsuarios = (Array.isArray(usuarios.dados) ? usuarios.dados : []).map((u) => ({
        ...linhaDoUsuario(u),
        rotuloZerar: `Zerar o segundo fator de ${limparTexto(u.login, 64)}`,
      }));
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
            "Sua conta ainda não tem o segundo fator. Se você exigir agora, o seu próximo acesso " +
            "só poderá ativá-lo. Ative o seu antes em “Proteger minha conta”, ou continue sabendo disso.",
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

  return {
    bkCopias: [],
    bkResumo: "",
    bkUltimoErro: "",
    bkDiretorio: "",
    bkCarregando: false,
    bkCriando: false,
    bkErro: "",
    bkAviso: "",
    bkStatusBruto: null,

    async entrarEmBackup() {
      if (!this.admin || carregando) return;
      carregando = true;
      try {
        carregado = await this.carregarBackup(!carregado);
      } finally {
        carregando = false;
      }
    },

    async carregarBackup(comAviso = true) {
      this.bkCarregando = comAviso;
      const r = await api.verBackup();
      this.bkCarregando = false;
      if (!r.ok || !r.dados) {
        this.bkErro = r.erro || MSG_FALHA;
        return false;
      }
      this.bkErro = "";
      this.aplicarBackup(r.dados);
      return true;
    },

    aplicarBackup(d) {
      this.bkStatusBruto = d;
      this.bkDiretorio = limparTexto(d.diretorio, 120);
      this.bkUltimoErro = limparTexto(d.ultimo_erro, 300);
      this.redesenharBackup();
    },

    /** Recalcula resumo e linhas (o fuso pode chegar depois da lista). */
    redesenharBackup() {
      const d = this.bkStatusBruto;
      if (!d) return;
      this.bkResumo = resumoDoUltimo(d, this.fuso);
      this.bkCopias = (Array.isArray(d.copias) ? d.copias : []).map((c, i) => ({
        i,
        ...linhaDoBackup(c, this.fuso),
      }));
    },

    get bkSemCopias() {
      return !this.bkCarregando && this.bkCopias.length === 0;
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
