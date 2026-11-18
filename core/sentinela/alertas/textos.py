"""Texto de um alerta para o painel, o telão e o Telegram: só texto puro, nunca HTML.

O nome do equipamento vem do cadastro e pode ser hostil (``<b>``, 300 caracteres): sai como
veio, sem escape e sem truncar; quem exibe usa ``textContent`` e decide a quebra de linha. O
Telegram recebe o texto sem ``parse_mode``, então nada é interpretado como marcação.

Telegram: só nome, horário (no fuso configurado) e duração; IP apenas com ``incluir_ip``
(minimização de dados, desligado por padrão).
"""

from dataclasses import dataclass
from datetime import datetime
from zoneinfo import ZoneInfo

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from sentinela.db.modelos import Alerta, Classe, Equipamento, Fonte
from sentinela.horario import formatar_duracao, hora_local

NOME_REMOVIDO = "Equipamento removido"
TEXTO_TESTE = "✅ Teste do Sentinela: as mensagens estão chegando."


@dataclass(frozen=True)
class DadosAlerta:
    tipo: str
    nome: str
    ip: str | None
    classe: str | None
    quedas: int
    afetados: int
    aberto_em: datetime
    fechado_em: datetime | None
    breve: bool
    fonte: str | None


def _duracao(d: DadosAlerta) -> str | None:
    if d.fechado_em is None:
        return None
    return formatar_duracao((d.fechado_em - d.aberto_em).total_seconds())


def texto_painel(d: DadosAlerta) -> str:
    if d.tipo == "fonte_falhou":
        return f"Fonte {d.fonte or d.nome} sem coleta"
    if d.tipo == "instavel":
        return f"{d.nome} instável"
    if d.tipo == "volta":
        dur = _duracao(d)
        return f"{d.nome} voltou" + (f" (fora por {dur})" if dur else "")
    grupo = d.quedas > 1
    if d.breve:
        dur = _duracao(d)
        base = f"{d.quedas} equipamentos caíram e voltaram" if grupo else f"{d.nome} caiu e voltou"
        return base + (f" ({dur})" if dur else "")
    if grupo:
        return f"{d.quedas} equipamentos caíram"
    if d.afetados:
        return f"{d.nome} caiu · {d.afetados} {'afetado' if d.afetados == 1 else 'afetados'}"
    return f"{d.nome} caiu"


def texto_telegram(d: DadosAlerta, fuso: ZoneInfo, incluir_ip: bool) -> str:
    nome = f"{d.nome} ({d.ip})" if incluir_ip and d.ip else d.nome
    if d.tipo == "fonte_falhou":
        return f"⚠️ Fonte {d.fonte or d.nome} sem coleta desde {hora_local(d.aberto_em, fuso)}"
    if d.tipo == "instavel":
        return f"🟠 {nome} instável desde {hora_local(d.aberto_em, fuso)}"
    if d.tipo == "volta":
        # com a origem, ``fechado_em`` é o instante da volta; sem ela, o próprio ``aberto_em``
        instante = d.fechado_em or d.aberto_em
        dur = _duracao(d)
        texto = f"🟢 {nome} voltou às {hora_local(instante, fuso)}"
        return texto + (f" (fora por {dur})" if dur else "")
    grupo = d.quedas > 1
    if d.breve:
        dur = _duracao(d)
        base = f"{d.quedas} equipamentos caíram e voltaram" if grupo else f"{nome} caiu e voltou"
        return f"🟡 {base}" + (f" ({dur})" if dur else "")
    hora = hora_local(d.aberto_em, fuso)
    if grupo:
        return f"🔴 {d.quedas} equipamentos caíram às {hora}"
    if d.afetados:
        plural = "equipamento afetado" if d.afetados == 1 else "equipamentos afetados"
        return f"🔴 {nome} caiu às {hora} — {d.afetados} {plural}"
    return f"🔴 {nome} caiu às {hora}"


def texto_resumo(n: int) -> str:
    """Fila acumulada além do limite por minuto: uma mensagem só pelos ``n`` restantes."""
    return f"… e mais {n} {'alerta' if n == 1 else 'alertas'}, veja no painel"


def total_afetados(a: Alerta) -> int:
    """Incluídos além do principal: ``afetados`` já traz as quedas agrupadas, e a união
    protege de uma linha em que ``quedas`` traga ids que ``afetados`` não repete."""
    principal = a.equipamento_id
    return len({x for x in (*a.afetados, *a.quedas[1:]) if x != principal})


async def dados_do_alerta(db: AsyncSession, alerta: Alerta) -> DadosAlerta:
    nome = NOME_REMOVIDO
    ip: str | None = None
    classe: str | None = None
    if alerta.equipamento_id is not None:
        linha = (
            await db.execute(
                select(Equipamento.nome, Equipamento.ip, Classe.slug)
                .join(Classe, Equipamento.classe_id == Classe.id)
                .where(Equipamento.id == alerta.equipamento_id)
            )
        ).first()
        if linha is not None:
            nome, ip, classe = linha
    fonte: str | None = None
    if alerta.fonte_id is not None:
        fonte = await db.scalar(select(Fonte.nome).where(Fonte.id == alerta.fonte_id))
        if alerta.tipo == "fonte_falhou" and fonte is not None:
            nome = fonte
    aberto_em, fechado_em = alerta.aberto_em, alerta.fechado_em
    if alerta.tipo == "volta":
        # a duração fora vai da queda de origem até o instante da volta
        origem = (
            await db.get(Alerta, alerta.alerta_origem_id)
            if alerta.alerta_origem_id is not None
            else None
        )
        if origem is not None:
            aberto_em, fechado_em = origem.aberto_em, alerta.aberto_em
        else:
            fechado_em = None
    return DadosAlerta(
        tipo=alerta.tipo,
        nome=nome,
        ip=ip,
        classe=classe,
        quedas=len(alerta.quedas),
        afetados=total_afetados(alerta),
        aberto_em=aberto_em,
        fechado_em=fechado_em,
        breve=alerta.breve,
        fonte=fonte,
    )
