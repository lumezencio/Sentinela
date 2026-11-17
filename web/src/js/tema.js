// Antes da primeira pintura (script síncrono no <head>, sem inline): aplica o tema salvo e
// marca a aba do hash em <html data-aba> para o CSS esconder a Lista num link direto para
// #teia/#organograma (sem o "pisca" da Lista até o Alpine assumir).
(function () {
  try {
    var salvo = window.localStorage.getItem("sentinela-tema");
    if (salvo === "claro" || salvo === "escuro") document.documentElement.dataset.tema = salvo;
  } catch (e) {
    /* armazenamento bloqueado: segue a preferência do sistema */
  }
  var aba = String(window.location.hash || "").replace(/^#/, "");
  document.documentElement.dataset.aba = aba === "teia" || aba === "organograma" ? aba : "lista";
})();
