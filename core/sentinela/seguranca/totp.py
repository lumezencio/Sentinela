"""TOTP (RFC 6238; SHA-1, 6 dígitos, passo de 30 s, tolerância de ±1 janela).

O segredo vive no cofre (`usuario.totp_cifrado`, base64 do blob Fernet de
`{"segredo_totp": <base32>}`). Estado: pendente = cifrado sem contador; ativo = ambos. Nenhuma
função devolve ou registra segredo/código em mensagem de erro.
"""

import base64
import binascii
import hmac
from datetime import datetime
from io import BytesIO
from urllib.parse import quote

import pyotp
import segno

from sentinela.db.modelos import Usuario
from sentinela.seguranca.cofre import Cofre, ErroCofre

PASSO_S = 30
JANELAS = 1
EMISSOR = "Sentinela"
DIGITOS = 6
_ASCII_DIGITOS = frozenset("0123456789")


def novo_segredo() -> str:
    return pyotp.random_base32(32)


def totp_ativo(u: Usuario) -> bool:
    return u.totp_cifrado is not None and u.totp_ultimo_contador is not None


def totp_pendente(u: Usuario) -> bool:
    return u.totp_cifrado is not None and u.totp_ultimo_contador is None


def cifrar_segredo(cofre: Cofre, segredo: str) -> str:
    return base64.b64encode(cofre.cifrar({"segredo_totp": segredo})).decode("ascii")


def decifrar_segredo(cofre: Cofre, blob: str | None) -> str | None:
    """Segredo em base32, ou ``None`` se ausente, corrompido ou de outra chave."""
    if not blob:
        return None
    try:
        dados = cofre.decifrar(base64.b64decode(blob, validate=True))
    except (ErroCofre, binascii.Error, ValueError):
        return None
    return dados.get("segredo_totp") or None


def contador_de(instante: datetime) -> int:
    return int(instante.timestamp()) // PASSO_S


def conferir(segredo: str, codigo: str, agora: datetime, ultimo_contador: int | None) -> int | None:
    """Contador cujo código confere (de ``c-1`` a ``c+1``) e é maior que ``ultimo_contador``;
    ``None`` caso contrário. Só 6 dígitos ASCII; comparação em tempo constante."""
    if len(codigo) != DIGITOS or not _ASCII_DIGITOS.issuperset(codigo):
        return None
    atual = contador_de(agora)
    gerador = pyotp.TOTP(segredo, digits=DIGITOS, interval=PASSO_S)
    aceito: int | None = None
    for contador in range(atual - JANELAS, atual + JANELAS + 1):
        candidato = gerador.generate_otp(contador)
        # percorre todos, para não variar o tempo conforme a janela que acertou
        if hmac.compare_digest(candidato.encode(), codigo.encode()) and (
            ultimo_contador is None or contador > ultimo_contador
        ):
            aceito = contador
    return aceito


def uri(segredo: str, login: str) -> str:
    rotulo = quote(f"{EMISSOR}:{login}", safe=":")
    return (
        f"otpauth://totp/{rotulo}?secret={segredo}&issuer={EMISSOR}"
        f"&algorithm=SHA1&digits={DIGITOS}&period={PASSO_S}"
    )


def qr_svg(texto: str) -> bytes:
    """QR em SVG (sem declaração XML, sem script nem estilo; `viewBox` para escalar)."""
    saida = BytesIO()
    segno.make(texto, error="m").save(
        saida, kind="svg", xmldecl=False, svgns=True, nl=False, scale=1, border=2, omitsize=True
    )
    return saida.getvalue()
