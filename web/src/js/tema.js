// Aplica o tema salvo antes da primeira pintura (script síncrono no <head>, sem inline).
(function () {
  try {
    var salvo = window.localStorage.getItem("sentinela-tema");
    if (salvo === "claro" || salvo === "escuro") document.documentElement.dataset.tema = salvo;
  } catch (e) {
    /* armazenamento bloqueado: segue a preferência do sistema */
  }
})();
