// FNV-1a de 32 bits sobre os bytes UTF-8: estável entre execuções e navegadores.
export function hashTexto(texto) {
  let h = 0x811c9dc5;
  for (const byte of new TextEncoder().encode(String(texto))) {
    h ^= byte;
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}
