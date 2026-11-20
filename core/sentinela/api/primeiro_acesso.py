"""Primeiro acesso pela tela: o código de instalação (impresso no terminal de quem instalou)
abre um assistente que cria o administrador, confirma a rede e entra, sem terminal.

Rotas sem sessão e isentas de CSRF (ainda não há usuário), mas TODAS respondem o 404 genérico
assim que existe qualquer usuário (e no modo demonstração, que já nasce com administrador): o
assistente deixa de existir. O código nunca é logado, auditado nem devolvido; conferir e concluir
têm limite por IP e bloqueio progressivo global (a reserva da tentativa vem ANTES da verificação
lenta e é devolvida no acerto, como no login). A conclusão é UMA transação: o ``INSERT`` do
administrador é guardado por ``WHERE NOT EXISTS`` (só um concluir simultâneo vence) e o único
commit está em ``aplicar_guarda``; a primeira varredura só começa depois dele.
"""

import logging
import math
from pathlib import Path
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import exists, insert, literal, select
from sqlalchemy.ext.asyncio import AsyncSession

from sentinela.api.auth import abrir_sessao, exigir_json
from sentinela.api.comum import auditar, classe_por_chave, erro, nao_encontrado, retrato
from sentinela.api.deps import SessaoDB, agora_utc, isento_de_csrf
from sentinela.api.subredes import _gateway_valido, aplicar_guarda, normalizar_cidr
from sentinela.config import pasta_dados
from sentinela.db.modelos import Equipamento, SubRede, Usuario
from sentinela.descoberta.varredura import Varredura
from sentinela.rede.guarda import DestinoProibido
from sentinela.seguranca import instalacao
from sentinela.seguranca.bloqueio import BloqueioFantasma, LimitadorIP
from sentinela.seguranca.senhas import SENHA_MAXIMA, gerar_hash_async, validar_senha

log = logging.getLogger("sentinela.primeiro_acesso")

MSG_CODIGO = "Código inválido."
MSG_MUITAS = (
    "Muitas tentativas. Aguarde, ou gere um código novo no terminal "
    "(python -m sentinela.cli codigo-instalacao)."
)
CHAVE_BLOQUEIO = "instalacao"  # chave fixa: o bloqueio vale para todos os IPs


async def exigir_sem_usuarios(request: Request, db: SessaoDB) -> None:
    """404 genérico se existe qualquer usuário (ou no modo demonstração)."""
    if request.app.state.settings.demo:
        raise nao_encontrado()
    existe = await db.scalar(select(Usuario.id).limit(1))
    await db.rollback()  # nenhuma leitura fica aberta antes do INSERT guardado do concluir
    if existe is not None:
        raise nao_encontrado()


router = APIRouter(
    prefix="/api/v1/primeiro-acesso",
    tags=["primeiro-acesso"],
    dependencies=[Depends(exigir_sem_usuarios)],  # antes do 415 e do 422
)


class Conferencia(BaseModel):
    model_config = ConfigDict(extra="forbid")

    codigo: str = Field(max_length=16)


class Conclusao(BaseModel):
    model_config = ConfigDict(extra="forbid")

    codigo: str = Field(max_length=16)
    login: str = Field(min_length=1, max_length=64)
    senha: str = Field(min_length=1, max_length=SENHA_MAXIMA)
    cidr: str = Field(min_length=1, max_length=43)
    gateway: str | None = Field(default=None, max_length=45)
    varredura: bool


class Estado(BaseModel):
    codigo: Literal["ativo", "expirado", "ausente"]


class RedeSugerida(BaseModel):
    cidr: str | None
    gateway: str | None


class Sugestao(BaseModel):
    rede: RedeSugerida


def _muitas(espera_s: float) -> HTTPException:
    return HTTPException(
        status.HTTP_429_TOO_MANY_REQUESTS,
        detail=MSG_MUITAS,
        headers={"Retry-After": str(max(1, math.ceil(espera_s)))},
    )


def _ip(request: Request) -> str:
    return request.client.host if request.client else "desconhecido"


def _sincronizar_contadores(request: Request, pasta: Path) -> None:
    """Código novo (a CLI roda noutro processo) zera o bloqueio global e os contadores por IP.

    Mecanismo: o core guarda a ``marca`` (``criado_em`` gravado) vista por último; se o arquivo
    traz outra, houve ``codigo-instalacao``. Assim o dono sai de um bloqueio provocado por
    terceiros na LAN sem reiniciar o core; quem não tem terminal não gera código novo.
    """
    atual = instalacao.marca(pasta)
    if atual != getattr(request.app.state, "marca_codigo", None):
        request.app.state.marca_codigo = atual
        request.app.state.falhas_codigo.reiniciar()
        request.app.state.bloqueio_codigo.limpar(CHAVE_BLOQUEIO)


async def _conferir_codigo(request: Request, texto: str) -> None:
    """Reserva a tentativa (IP e global) ANTES do argon2; acerto devolve as duas reservas.

    Levanta 429 (sem cota) ou 401 genérico (errado, expirado ou ausente).
    """
    falhas_ip: LimitadorIP = request.app.state.falhas_codigo
    bloqueio: BloqueioFantasma = request.app.state.bloqueio_codigo
    ip = _ip(request)
    pasta = pasta_dados(request.app.state.settings)
    _sincronizar_contadores(request, pasta)
    espera = falhas_ip.reservar(ip)
    if espera:
        log.warning("primeiro acesso: tentativa barrada pelo limite do IP (ip=%s)", ip)
        raise _muitas(espera)
    espera = bloqueio.reservar(CHAVE_BLOQUEIO)
    if espera:
        falhas_ip.liberar(ip)  # bloqueada pelo global: não gasta a cota do IP
        log.warning("primeiro acesso: tentativa barrada pelo bloqueio global (ip=%s)", ip)
        raise _muitas(espera)
    if not await instalacao.conferir(pasta, texto, agora_utc()):
        # nunca o texto digitado: só o IP e a contagem de falhas recentes dele
        log.warning(
            "primeiro acesso: código recusado (ip=%s, falhas_do_ip=%d)",
            ip,
            falhas_ip.contagem(ip),
        )
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail=MSG_CODIGO)
    falhas_ip.liberar(ip)
    bloqueio.limpar(CHAVE_BLOQUEIO)  # só quem tem o código chega aqui: sem bloqueio novo


@router.get("", response_model=Estado)
async def ver_estado(request: Request) -> Estado:
    pasta = pasta_dados(request.app.state.settings)
    return Estado(codigo=instalacao.estado(pasta, agora_utc()))


@router.post("/conferir", response_model=Sugestao, dependencies=[Depends(exigir_json)])
@isento_de_csrf
async def conferir(entrada: Conferencia, request: Request) -> Sugestao:
    await _conferir_codigo(request, entrada.codigo)
    settings = request.app.state.settings
    return Sugestao(
        rede=RedeSugerida(
            cidr=settings.rede_sugerida or None, gateway=settings.gateway_sugerido or None
        )
    )


async def _subrede_da_instalacao(
    db: AsyncSession, cidr: str, varredura: bool, gateway: str | None
) -> tuple[SubRede, dict[str, object] | None]:
    """Cria a sub-rede (ou reaproveita a que já existe, p.ex. criada pela CLI)."""
    sub = await db.scalar(select(SubRede).where(SubRede.cidr == cidr))
    antes: dict[str, object] | None = None
    if sub is None:
        sub = SubRede(cidr=cidr, permite_varredura=varredura, gateway_ip=gateway)
        db.add(sub)
    else:
        antes = {"permite_varredura": bool(sub.permite_varredura), "gateway_ip": sub.gateway_ip}
        sub.permite_varredura = varredura
        sub.gateway_ip = gateway
    await db.flush()
    return sub, antes


@router.post(
    "/concluir",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(exigir_json)],
    response_class=Response,
)
@isento_de_csrf
async def concluir(entrada: Conclusao, request: Request, db: SessaoDB) -> Response:
    await _conferir_codigo(request, entrada.codigo)

    login = entrada.login.strip()
    if not 1 <= len(login) <= 64:
        raise erro(status.HTTP_422_UNPROCESSABLE_CONTENT, "Informe o login.")
    try:
        validar_senha(entrada.senha)
    except ValueError as e:
        raise erro(status.HTTP_422_UNPROCESSABLE_CONTENT, str(e)) from None
    try:
        cidr = normalizar_cidr(entrada.cidr)
    except DestinoProibido as e:
        raise erro(status.HTTP_422_UNPROCESSABLE_CONTENT, e.motivo) from None
    gateway = _gateway_valido(entrada.gateway, cidr) if entrada.gateway else None
    hash_senha = await gerar_hash_async(entrada.senha)  # argon2 fora da transação de escrita

    # ---- uma transação: o INSERT guardado é o PRIMEIRO comando; o único commit é o da Guarda
    criado = await db.execute(
        insert(Usuario)
        .from_select(
            ["login", "hash_senha", "papel", "falhas"],
            select(literal(login), literal(hash_senha), literal("admin"), literal(0)).where(
                ~exists(select(Usuario.id))
            ),
        )
        .returning(Usuario.id)
    )
    admin_id = criado.scalar_one_or_none()
    if admin_id is None:  # outro concluir venceu entre a checagem e o INSERT
        await db.rollback()
        raise nao_encontrado()
    admin = await db.get(Usuario, admin_id)
    if admin is None:  # inalcançável: acabou de ser inserido nesta transação
        raise nao_encontrado()
    agora = agora_utc()

    auditar(db, request, admin, "primeiro_acesso.concluir", f"usuario:{admin.id}")
    sub, antes = await _subrede_da_instalacao(db, cidr, entrada.varredura, gateway)
    if antes is None:
        auditar(db, request, admin, "subrede.criar", cidr, depois={"cidr": cidr})
    else:  # sub-rede que já existia (p.ex. criada pela CLI): é edição, com antes e depois
        depois = {"permite_varredura": entrada.varredura, "gateway_ip": gateway}
        auditar(db, request, admin, "subrede.editar", cidr, antes, depois)
    if gateway is not None and (
        await db.scalar(select(Equipamento.id).where(Equipamento.ip == gateway)) is None
    ):
        classe = await classe_por_chave(db, "roteador")
        roteador = Equipamento(
            nome="Roteador",
            ip=gateway,
            classe_id=classe.id,
            classe_origem="manual",
            checagem="icmp",
            estado="desconhecido",
            estado_desde=agora,
            pausado=False,
            criado_em=agora,
        )
        db.add(roteador)
        await db.flush()
        auditar(
            db,
            request,
            admin,
            "equipamento.criar",
            roteador.id,
            depois=retrato(roteador, classe.slug),
        )
    sub_id = sub.id
    await aplicar_guarda(request, db)  # o único commit

    try:
        instalacao.invalidar(pasta_dados(request.app.state.settings))
    except OSError:
        log.warning("não foi possível apagar o arquivo do código de instalação")
    if entrada.varredura:
        varredura: Varredura = request.app.state.varredura
        try:
            await varredura.iniciar(sub_id, origem="primeiro_acesso")
        except Exception as e:  # nada do que já foi gravado se desfaz
            log.warning("a primeira varredura não começou: %s", type(e).__name__)
    log.info("primeiro acesso concluído")
    return await abrir_sessao(db, request, admin.id, agora)
