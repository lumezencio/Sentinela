// Emparelhamento do telão: o que fazer com a resposta de GET /api/v1/parede/pedido.

const VALIDADE_MAXIMA_MS = 10 * 60 * 1000;

/** 202 → "esperar"; 200 → "entrar"; 410/401 → "novo_codigo"; o resto (rede, 429, 5xx) espera. */
export function proximoPasso(status) {
  if (status === 200) return "entrar";
  if (status === 410 || status === 401) return "novo_codigo";
  return "esperar";
}

/**
 * Quanto falta para o código vencer, pelo `expira_em` do servidor. Com o relógio da TV
 * errado (já vencido ou mais de 10 min à frente) ou texto inválido, vale a validade cheia.
 */
export function validadeDoCodigoMs(expiraEm, agoraMs) {
  const resta = Date.parse(expiraEm) - agoraMs;
  if (!(resta > 0) || resta > VALIDADE_MAXIMA_MS) return VALIDADE_MAXIMA_MS;
  return resta;
}
