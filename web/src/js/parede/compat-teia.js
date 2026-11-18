// Só para o bundle da Teia do telão (three + 3d-force-graph), carregado antes deles: o
// Chromium 63 das TVs Tizen 5.0 não tem queueMicrotask (Chrome 71, usado pelo preact do
// float-tooltip) nem AbortController (Chrome 66, criado pelo DefaultLoadingManager do three
// ao carregar o módulo). O telão não carrega arquivos pelo three, então um esboço basta.
if (typeof window.queueMicrotask !== "function") {
  window.queueMicrotask = (tarefa) => {
    Promise.resolve()
      .then(tarefa)
      .catch((erro) => {
        window.setTimeout(() => {
          throw erro;
        }, 0);
      });
  };
}

if (typeof window.AbortController !== "function") {
  class SinalDeAbortoEsboco {
    constructor() {
      this.aborted = false;
      this.onabort = null;
    }
    addEventListener() {}
    removeEventListener() {}
  }
  window.AbortController = class AbortControllerEsboco {
    constructor() {
      this.signal = new SinalDeAbortoEsboco();
    }
    abort() {
      this.signal.aborted = true;
      if (typeof this.signal.onabort === "function") this.signal.onabort();
    }
  };
}
