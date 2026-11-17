"""Mescla dos achados das fontes em descobertas (spec §5.2 e §9.2/§9.3/§9.5).

Identidade: MAC > IP. Um achado sem MAC cujo IP aparece com MAC no mesmo lote (ou numa
descoberta com chave de MAC) junta-se a ela. Canais de gravador têm chave própria,
``nvr:<fonte_id>:<canal>``, e nunca passam pela mescla por MAC/IP (o IP interno de câmeras
de gravadores diferentes se repete).

Para cada grupo:

1. **equipamento cadastrado** (MAC igual, ou IP igual sem MAC; canal: mesmo gravador e
   canal): atualiza ``visto_em`` e preenche ``fabricante`` vazio. MAC conhecido com IP novo:
   o IP do equipamento muda (auditoria de sistema), salvo se o IP novo já é de outro
   equipamento (§9.5): nada muda e a descoberta fica pendente com ``conflito_com``.
   Equipamento só com IP que aparece com MAC ganha o MAC (auditado), se ninguém o tiver.
   Canal cuja câmera aprovada perdeu o pai (gravador removido e aprovado de novo) é
   achado pela ``Descoberta.equipamento_id`` e volta a ser filho do gravador atual (auditado).
2. **descoberta ignorada**: só ``ultima_vez``.
3. **nova ou pendente**: grava/atualiza e classifica **passivamente** (§9.1). A sondagem de
   portas só roda em sub-rede com ``permite_varredura``, no máximo uma vez a cada 24 h por
   chave, e antes de qualquer escrita no banco (a sessão só leu até ali).

Teto: no máximo ``MAX_PENDENTES`` descobertas pendentes; acima disso o achado novo é
descartado e ``ResultadoMescla.truncado`` avisa quem chama.

Nada aqui faz commit nem publica: quem chama (orquestrador) faz as duas coisas.
"""

import logging
import uuid
from collections.abc import Awaitable, Callable, Iterable
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from ipaddress import IPv4Address, IPv4Network
from typing import Any, Literal

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from sentinela.db.modelos import Auditoria, Descoberta, Equipamento, Fonte, SubRede
from sentinela.descoberta.classificador.oui import BaseOui
from sentinela.descoberta.classificador.regras import Fatos, classificar
from sentinela.descoberta.fontes.base import Achado
from sentinela.monitor.checagens import GRAVADOR
from sentinela.rede.guarda import DestinoProibido, Guarda

log = logging.getLogger(__name__)

PENDENTE, APROVADA, IGNORADA = "pendente", "aprovada", "ignorada"
INTERVALO_SONDAGEM = timedelta(hours=24)
FONTE_VARREDURA = "varredura"  # ``fonte_id`` dos achados da varredura lenta
MAX_ORIGENS = 20
MAX_SINAIS_FONTE = 32
LIMITE_TEXTO = 120
# teto de descobertas pendentes: uma fonte (ou rede) hostil não enche o banco nem a fila
MAX_PENDENTES = 10_000
# a origem decide qual IP vale quando o mesmo MAC aparece com IPs diferentes
_PRIORIDADE_IP = {"arp": 0, "snmp_arp": 1, "varredura": 2, "dhcp": 3}

Sondador = Callable[[str], Awaitable[tuple[set[int], str | None]]]
Modo = Literal["conhecido", "conflito", "descoberta"]


@dataclass
class ResultadoMescla:
    novas: list[str] = field(default_factory=list)
    atualizadas: list[str] = field(default_factory=list)
    equipamentos_atualizados: list[str] = field(default_factory=list)
    conflitos: list[str] = field(default_factory=list)
    removidas: list[str] = field(default_factory=list)  # saíram da fila (viraram equipamento)
    # sem ``sondador``: descobertas que podem ser sondadas agora (quem chama sonda fora da
    # transação/trava e grava o resultado depois)
    a_sondar: list[str] = field(default_factory=list)
    # achados que não viraram descoberta porque a fila de pendentes chegou a MAX_PENDENTES
    truncado: bool = False
    vagas: int = MAX_PENDENTES  # pendentes que ainda cabem (preenchido por ``mesclar``)


def chave_de(a: Achado) -> str:
    """``nvr:<fonte>:<canal>`` para canal de gravador; MAC normalizado; senão ``ip:<ip>``."""
    if a.canal is not None and a.pai_fonte_id:
        return f"nvr:{a.pai_fonte_id}:{a.canal}"
    if a.mac:
        return a.mac
    if a.ip:
        return f"ip:{a.ip}"
    raise ValueError("achado sem MAC nem IP")


@dataclass
class _Grupo:
    chave: str
    ip: str | None = None
    mac: str | None = None
    fabricante: str | None = None
    nome: str | None = None
    pai_fonte_id: str | None = None
    canal: int | None = None
    origens: list[dict[str, str]] = field(default_factory=list)
    sinais: dict[str, str] = field(default_factory=dict)
    _prioridade_ip: int = 99

    def juntar(self, a: Achado) -> None:
        if a.ip and (p := _PRIORIDADE_IP.get(a.origem, 9)) < self._prioridade_ip:
            self.ip, self._prioridade_ip = a.ip, p
        self.mac = self.mac or a.mac
        self.fabricante = self.fabricante or a.fabricante
        self.nome = self.nome or a.nome
        self.pai_fonte_id = self.pai_fonte_id or a.pai_fonte_id
        self.canal = self.canal if self.canal is not None else a.canal
        self.origens = _juntar_origens(self.origens, [{"fonte_id": a.fonte_id, "origem": a.origem}])
        for k, v in a.sinais.items():
            if len(self.sinais) < MAX_SINAIS_FONTE:
                self.sinais.setdefault(k, v)


def _juntar_origens(
    atuais: Iterable[dict[str, Any]], novas: Iterable[dict[str, str]]
) -> list[dict[str, str]]:
    vistas: list[dict[str, str]] = []
    for o in (*atuais, *novas):
        item = {"fonte_id": str(o.get("fonte_id", "")), "origem": str(o.get("origem", ""))}
        if item not in vistas and len(vistas) < MAX_ORIGENS:
            vistas.append(item)
    return vistas


def agrupar(achados: Iterable[Achado]) -> list[_Grupo]:
    """Junta os achados por identidade (canal > MAC > IP); achado sem MAC nem IP é ignorado."""
    grupos: dict[str, _Grupo] = {}
    sem_mac: list[Achado] = []

    def _no(chave: str, a: Achado) -> None:
        grupos.setdefault(chave, _Grupo(chave)).juntar(a)

    for a in achados:
        if a.canal is not None and a.pai_fonte_id:
            _no(chave_de(a), a)
        elif a.mac:
            _no(a.mac, a)
        elif a.ip:
            sem_mac.append(a)
    ip_do_mac = {g.ip: g.chave for g in grupos.values() if g.mac and g.ip and g.canal is None}
    for a in sem_mac:
        ip = a.ip or ""
        _no(ip_do_mac.get(ip, f"ip:{ip}"), a)
    return list(grupos.values())


def dentro_das_subredes(guarda: Guarda, ip: str | None) -> bool:
    if not ip:
        return False
    try:
        guarda.validar(ip, None, "icmp")
    except DestinoProibido:
        return False
    return True


def fatos_da_descoberta(d: Descoberta) -> Fatos:
    """Fatos guardados na própria descoberta (passivos + sondagem, se houve)."""
    sinais = d.sinais or {}
    fonte = sinais.get("fonte")
    portas = sinais.get("portas")
    titulo = sinais.get("titulo")
    return Fatos(
        fabricante=d.fabricante,
        origens={str(o.get("origem")) for o in d.origens or [] if isinstance(o, dict)},
        portas_abertas={p for p in portas if isinstance(p, int)}
        if isinstance(portas, list)
        else set(),
        titulo_http=titulo if isinstance(titulo, str) else None,
        nome=d.nome_sugerido,
        sinais_fonte={str(k): str(v) for k, v in fonte.items()} if isinstance(fonte, dict) else {},
    )


def reclassificar(d: Descoberta) -> None:
    """Classe sugerida, confiança e motivos ("por que") a partir dos fatos guardados."""
    c = classificar(fatos_da_descoberta(d))
    d.classe_sugerida = c.classe
    d.confianca = round(c.confianca, 4)
    motivos = [{"regra": s.regra, "descricao": s.descricao, "pontos": s.pontos} for s in c.sinais]
    d.sinais = {**(d.sinais or {}), "motivos": motivos}


def auditar_sistema(
    db: AsyncSession,
    acao: str,
    alvo: str | None,
    agora: datetime,
    antes: dict[str, Any] | None = None,
    depois: dict[str, Any] | None = None,
) -> None:
    """Auditoria de ação automática (sem usuário)."""
    db.add(Auditoria(usuario_id=None, acao=acao, alvo=alvo, antes=antes, depois=depois, em=agora))


async def equipamento_por_ip(
    db: AsyncSession, ip: str, ignorar: str | None = None
) -> Equipamento | None:
    """Equipamento com checagem própria naquele IP (câmeras de gravador não contam)."""
    consulta = select(Equipamento).where(Equipamento.ip == ip, Equipamento.checagem != GRAVADOR)
    if ignorar is not None:
        consulta = consulta.where(Equipamento.id != ignorar)
    return await db.scalar(consulta.limit(1))


async def _existe(db: AsyncSession, equipamento_id: str | None) -> bool:
    return equipamento_id is not None and await db.get(Equipamento, equipamento_id) is not None


async def _equipamento_por_mac(db: AsyncSession, mac: str) -> Equipamento | None:
    return await db.scalar(select(Equipamento).where(Equipamento.mac == mac).limit(1))


async def _descoberta(db: AsyncSession, chave: str) -> Descoberta | None:
    return await db.scalar(select(Descoberta).where(Descoberta.chave == chave))


async def redes_com_varredura(db: AsyncSession) -> list[IPv4Network]:
    redes: list[IPv4Network] = []
    for cidr in (
        await db.execute(select(SubRede.cidr).where(SubRede.permite_varredura.is_(True)))
    ).scalars():
        try:
            redes.append(IPv4Network(cidr))
        except ValueError:
            continue
    return redes


def na_rede(ip: str, redes: list[IPv4Network]) -> bool:
    try:
        endereco = IPv4Address(ip)
    except ValueError:
        return False
    return any(endereco in r for r in redes)


def _foto(d: Descoberta) -> tuple[Any, ...]:
    """O que, se mudar, vale publicar como "atualizada"."""
    portas = (d.sinais or {}).get("portas")
    return (
        d.ip,
        d.mac,
        d.fabricante,
        d.nome_sugerido,
        d.classe_sugerida,
        d.confianca,
        d.fora_das_subredes,
        d.conflito_com,
        d.status,
        d.pai_equipamento_id,
        tuple(portas) if isinstance(portas, list) else None,
    )


@dataclass
class _Plano:
    grupo: _Grupo
    modo: Modo
    equipamento: Equipamento | None = None
    descoberta: Descoberta | None = None
    nova_chave: str | None = None  # descoberta "ip:<ip>" que passa a ter chave de MAC
    conflito_com: str | None = None
    fora: bool = False
    sondar: bool = False
    pai: str | None = None
    fonte: Fonte | None = None


async def _planejar_canal(db: AsyncSession, g: _Grupo) -> _Plano:
    fonte = await db.get(Fonte, g.pai_fonte_id) if g.pai_fonte_id else None
    pai = fonte.equipamento_id if fonte is not None else None
    if fonte is not None and pai is None:
        # §9.3: o gravador já cadastrado com o IP da fonte vira o pai das câmeras
        gravador = await equipamento_por_ip(db, fonte.host)
        pai = gravador.id if gravador is not None else None
    eq = None
    if pai is not None:
        eq = await db.scalar(
            select(Equipamento).where(
                Equipamento.pai_id == pai,
                Equipamento.canal == g.canal,
                Equipamento.checagem == GRAVADOR,
            )
        )
    d = await _descoberta(db, g.chave)
    if eq is None and pai is not None and d is not None and d.equipamento_id is not None:
        # câmera já aprovada cujo gravador foi removido e aprovado/ligado de novo: o pai
        # volta pela descoberta (a chave ``nvr:<fonte>:<canal>`` é desta fonte)
        anterior = await db.get(Equipamento, d.equipamento_id)
        if anterior is not None and anterior.checagem == GRAVADOR and anterior.canal == g.canal:
            eq = anterior
    modo: Modo = "conhecido" if eq is not None else "descoberta"
    return _Plano(g, modo, eq, d, pai=pai, fonte=fonte)


async def _planejar(
    db: AsyncSession, g: _Grupo, guarda: Guarda, agora: datetime, redes: list[IPv4Network]
) -> _Plano:
    if g.canal is not None:
        return await _planejar_canal(db, g)
    eq = await _equipamento_por_mac(db, g.mac) if g.mac else None
    conflito: str | None = None
    if eq is None and g.ip:
        dono_do_ip = await equipamento_por_ip(db, g.ip)
        if dono_do_ip is not None:
            if g.mac is None or dono_do_ip.mac is None:
                eq = dono_do_ip
            else:
                conflito = dono_do_ip.id  # MAC novo num IP de outro equipamento
    modo: Modo = "descoberta"
    if eq is not None:
        modo = "conhecido"
        mudou_ip = g.mac is not None and eq.mac == g.mac and g.ip and g.ip != eq.ip
        if g.ip and mudou_ip and eq.checagem != GRAVADOR:
            outro = await equipamento_por_ip(db, g.ip, ignorar=eq.id)
            if outro is not None:
                modo, conflito = "conflito", outro.id
    nova_chave: str | None = None
    d = await _descoberta(db, g.chave)
    if d is None and g.ip and g.mac is None:
        # só IP: junta-se à descoberta mais recente que já tem o MAC deste IP
        d = await db.scalar(
            select(Descoberta)
            .where(
                Descoberta.ip == g.ip,
                Descoberta.chave.not_like("ip:%"),
                Descoberta.chave.not_like("nvr:%"),
            )
            .order_by(Descoberta.ultima_vez.desc())
            .limit(1)
        )
    elif d is None and g.ip and g.mac:
        d = await _descoberta(db, f"ip:{g.ip}")
        if d is not None:
            nova_chave = g.mac
    fora = not dentro_das_subredes(guarda, g.ip)
    plano = _Plano(g, modo, eq, d, nova_chave, conflito, fora)
    plano.sondar = (
        modo != "conhecido"
        and g.ip is not None
        and not fora
        and (d is None or d.status == PENDENTE)
        and (d is None or d.sondada_em is None or agora - d.sondada_em >= INTERVALO_SONDAGEM)
        and na_rede(g.ip, redes)
    )
    return plano


async def mesclar(
    db: AsyncSession,
    achados: list[Achado],
    guarda: Guarda,
    agora: datetime,
    *,
    oui: BaseOui | None = None,
    sondador: Sondador | None = None,
) -> ResultadoMescla:
    """Aplica os achados ao banco (sem commit). ``sondador`` só é chamado para IPs em
    sub-redes com ``permite_varredura`` (§9.1 a), uma vez a cada 24 h por chave. Sem
    ``sondador`` (orquestrador), essas descobertas vão em ``a_sondar`` para quem chama
    sondar fora da transação."""
    r = ResultadoMescla()
    grupos = agrupar(achados)
    if not grupos:
        return r
    base = oui if oui is not None else BaseOui.carregar()
    for g in grupos:
        if g.fabricante is None and g.mac:
            g.fabricante = base.fabricante(g.mac)
    redes = await redes_com_varredura(db)
    pendentes = await db.scalar(
        select(func.count()).select_from(Descoberta).where(Descoberta.status == PENDENTE)
    )
    r.vagas = max(0, MAX_PENDENTES - int(pendentes or 0))
    planos = [await _planejar(db, g, guarda, agora, redes) for g in grupos]
    sondas: dict[str, tuple[set[int], str | None]] = {}
    if sondador is not None:
        for p in planos:
            ip = p.grupo.ip
            if p.sondar and ip is not None and ip not in sondas:
                try:
                    sondas[ip] = await sondador(ip)
                except Exception as e:  # noqa: BLE001 - sondagem é só um sinal a mais
                    log.warning("sondagem falhou: %s", type(e).__name__)
    for p in planos:
        ip = p.grupo.ip
        sonda = sondas.get(ip) if p.sondar and ip is not None else None
        d = await _aplicar(db, p, agora, sonda, r)
        if p.sondar and sondador is None and d is not None:
            r.a_sondar.append(d.id)
    await db.flush()
    return r


async def _aplicar(
    db: AsyncSession,
    p: _Plano,
    agora: datetime,
    sonda: tuple[set[int], str | None] | None,
    r: ResultadoMescla,
) -> Descoberta | None:
    g = p.grupo
    if p.fonte is not None and p.fonte.equipamento_id is None and p.pai is not None:
        p.fonte.equipamento_id = p.pai  # §9.3: liga a fonte ao gravador pelo IP
    eq = p.equipamento
    if p.modo == "conhecido" and eq is not None:
        # no "conflito" (§9.5) nada muda no equipamento: só a descoberta registra o caso
        eq.visto_em = agora
        if not eq.fabricante and g.fabricante:
            eq.fabricante = g.fabricante[:LIMITE_TEXTO]
        await _atualizar_conhecido(db, eq, g, agora, r, p.pai)
        d = p.descoberta
        if d is not None and d.status == PENDENTE:
            d.status, d.equipamento_id, d.conflito_com = APROVADA, eq.id, None
            d.ultima_vez = agora
            r.removidas.append(d.id)
        elif d is not None:
            d.ultima_vez = agora
        return None
    return await _aplicar_descoberta(db, p, agora, sonda, r)


async def _atualizar_conhecido(
    db: AsyncSession,
    eq: Equipamento,
    g: _Grupo,
    agora: datetime,
    r: ResultadoMescla,
    pai: str | None = None,
) -> None:
    if g.canal is not None:
        if pai is not None and eq.pai_id != pai:
            antes = eq.pai_id
            eq.pai_id = pai  # gravador aprovado/ligado de novo: a câmera volta a ser filha
            auditar_sistema(
                db, "equipamento.pai_automatico", eq.id, agora, {"pai_id": antes}, {"pai_id": pai}
            )
            r.equipamentos_atualizados.append(eq.id)
        return
    if g.mac and eq.mac is None and await _equipamento_por_mac(db, g.mac) is None:
        eq.mac = g.mac
        auditar_sistema(
            db, "equipamento.mac_automatico", eq.id, agora, {"mac": None}, {"mac": g.mac}
        )
    if g.mac and eq.mac == g.mac and g.ip and g.ip != eq.ip and eq.checagem != GRAVADOR:
        antes = eq.ip
        eq.ip = g.ip
        auditar_sistema(db, "equipamento.ip_automatico", eq.id, agora, {"ip": antes}, {"ip": g.ip})
        r.equipamentos_atualizados.append(eq.id)


async def _aplicar_descoberta(
    db: AsyncSession,
    p: _Plano,
    agora: datetime,
    sonda: tuple[set[int], str | None] | None,
    r: ResultadoMescla,
) -> Descoberta | None:
    g = p.grupo
    d = p.descoberta
    if d is not None and d.status == IGNORADA:
        d.ultima_vez = agora
        return None
    if d is not None and d.status == APROVADA:
        if await _existe(db, d.equipamento_id):
            d.ultima_vez = agora
            return None
        if r.vagas <= 0:
            r.truncado = True
            return None
        r.vagas -= 1
        d.status, d.equipamento_id = PENDENTE, None  # o equipamento foi removido: volta
    nova = d is None
    if d is None:
        if not g.ip and g.canal is None:
            return None  # só MAC (ex.: tabela FDB) e ninguém conhecido: nada a monitorar ainda
        if r.vagas <= 0:
            r.truncado = True  # fila cheia: o achado é descartado (quem chama avisa)
            return None
        r.vagas -= 1
        d = Descoberta(
            id=str(uuid.uuid4()),
            chave=g.chave,
            ip=g.ip or "",
            status=PENDENTE,
            sinais={},
            origens=[],
            confianca=0.0,
            primeira_vez=agora,
            ultima_vez=agora,
        )
        db.add(d)
    antes = None if nova else _foto(d)
    if p.nova_chave is not None:
        d.chave = p.nova_chave
    d.ip = g.ip or d.ip
    d.mac = g.mac or d.mac
    d.fabricante = (g.fabricante or d.fabricante or "")[:LIMITE_TEXTO] or None
    d.nome_sugerido = (g.nome or d.nome_sugerido or "")[:LIMITE_TEXTO] or None
    d.origens = _juntar_origens(d.origens or [], g.origens)
    sinais = dict(d.sinais or {})
    fonte = sinais.get("fonte")
    fonte = dict(fonte) if isinstance(fonte, dict) else {}
    for k, v in g.sinais.items():
        if k in fonte or len(fonte) < MAX_SINAIS_FONTE:
            fonte[k] = v
    sinais["fonte"] = fonte
    if sonda is not None:
        portas, titulo = sonda
        sinais["portas"] = sorted(portas)
        sinais["titulo"] = titulo
        d.sondada_em = agora
    d.sinais = sinais
    if g.canal is not None:
        d.canal = g.canal
        d.pai_equipamento_id = p.pai
        d.fora_das_subredes = False  # segue o gravador, cujo host passou pela Guarda
        d.conflito_com = None
    else:
        d.fora_das_subredes = p.fora
        d.conflito_com = p.conflito_com
    reclassificar(d)
    d.ultima_vez = agora
    if nova:
        r.novas.append(d.id)
    elif _foto(d) != antes:
        r.atualizadas.append(d.id)
    if d.conflito_com is not None:
        r.conflitos.append(d.id)
    return d
