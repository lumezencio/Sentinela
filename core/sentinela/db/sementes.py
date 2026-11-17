from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from sentinela.db.modelos import Classe

# (slug, nome, cor, icone, critica, intervalo_s)
_BASE: list[tuple[str, str, str, str, bool, int]] = [
    ("sentinela", "Servidor Sentinela", "#7C9CBF", "shield-check", False, 60),
    ("roteador", "Roteadores", "#6FA8DC", "router", True, 15),
    ("switch", "Switches", "#76B7B2", "network", True, 15),
    ("wifi", "Wi‑Fi", "#8FB8DE", "wifi", False, 60),
    ("camera", "Câmeras", "#E59866", "cctv", True, 15),
    ("gravador", "Gravadores", "#D98880", "hard-drive", True, 15),
    ("controle_acesso", "Controle de acesso", "#BB8FCE", "key-round", True, 15),
    ("servidor", "Servidores", "#85C1A3", "server", False, 60),
    ("computador", "Computadores", "#7FB3D5", "monitor", False, 60),
    ("impressora", "Impressoras", "#C9B28A", "printer", False, 60),
    ("iot", "IoT/Automação", "#A9CC8F", "cpu", False, 60),
    ("desconhecido", "Desconhecidos", "#A6ACAF", "circle-help", False, 60),
]

CLASSES_PADRAO: list[dict[str, Any]] = [
    {
        "slug": s,
        "nome": n,
        "cor": c,
        "icone": i,
        "critica": crit,
        "intervalo_s": iv,
        "ordem": ordem,
    }
    for ordem, (s, n, c, i, crit, iv) in enumerate(_BASE)
]


async def semear_classes(sessao: AsyncSession) -> None:
    """Insere as classes padrão ausentes (idempotente; não altera as existentes)."""
    existentes = set((await sessao.execute(select(Classe.slug))).scalars())
    for dados in CLASSES_PADRAO:
        if dados["slug"] not in existentes:
            sessao.add(Classe(**dados))
    await sessao.commit()
