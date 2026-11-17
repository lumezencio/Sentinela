// Antes da primeira pintura (script síncrono no <head>, sem inline): aplica o tema salvo e
// marca a aba do hash em <html data-aba> para o CSS esconder a Lista num link direto para
// #teia/#organograma/#novos/#configuracoes (sem o "pisca" da Lista até o Alpine assumir).
(function () {
  try {
    var salvo = window.localStorage.getItem("sentinela-tema");
    if (salvo === "claro" || salvo === "escuro") document.documentElement.dataset.tema = salvo;
  } catch (e) {
    /* armazenamento bloqueado: segue a preferência do sistema */
  }
  // O Alpine CSP lê todas as globais do window ao carregar; a "fence" (API Fenced Frame,
  // depreciada) gera aviso de depreciação no navegador. O app nunca usa fenced frames:
  // remove a global antes do Alpine (o ideal é o Alpine ignorar "fence", como já faz com
  // "styleMedia" e "sharedStorage").
  try {
    delete window.fence;
  } catch (e) {
    /* não configurável neste navegador: segue com o aviso */
  }
  var aba = String(window.location.hash || "").replace(/^#/, "");
  var abas = ["teia", "organograma", "novos", "configuracoes"];
  document.documentElement.dataset.aba = abas.indexOf(aba) >= 0 ? aba : "lista";
})();
