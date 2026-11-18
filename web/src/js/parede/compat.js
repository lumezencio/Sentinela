// Navegadores de TV (Tizen 5.0, Chromium 63) não têm Object.hasOwn (ES2022); a sintaxe nova o
// esbuild rebaixa, mas APIs de biblioteca não. Só o mínimo que o código do telão usa.
if (typeof Object.hasOwn !== "function") {
  Object.defineProperty(Object, "hasOwn", {
    value: (objeto, chave) => Object.prototype.hasOwnProperty.call(objeto, chave),
    configurable: true,
    writable: true,
  });
}
