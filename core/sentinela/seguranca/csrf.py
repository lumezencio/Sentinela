"""CSRF por cookie duplo: o cookie legível por JS deve voltar igual no cabeçalho."""

import hmac
import secrets

COOKIE_CSRF = "sentinela_csrf"
CABECALHO_CSRF = "X-CSRF"
METODOS_ESCRITA = frozenset({"POST", "PUT", "PATCH", "DELETE"})


def gerar_token_csrf() -> str:
    return secrets.token_urlsafe(32)


def tokens_conferem(cookie: str | None, cabecalho: str | None) -> bool:
    if not cookie or not cabecalho:
        return False
    return hmac.compare_digest(cookie.encode(), cabecalho.encode())
