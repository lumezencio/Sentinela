"""Cena da prova de zero broadcast: dirige o núcleo só pela API, como o admin faria.

Roda num container próprio (10.99.250.5) da rede de captura. Passos: login; declara
10.99.250.0/27 (sem varredura) e 10.99.250.32/28 (com varredura); cria as fontes MikroTik
(api-ssl), SNMP v2c e gravador Hikvision; testa as três, confia na impressão TLS do MikroTik,
coleta as três; aprova 2 descobertas (um computador do ARP do MikroTik e uma câmera do
gravador, que aprova o gravador junto); sonda 1; varre o /28. No fim grava em ``/saida``:

- ``arp_permitido.txt``: os IPs para os quais o Sentinela PODE ter emitido ARP request (spec
  §9.1): hosts das fontes cadastradas pelo admin, aprovados (exceto câmeras atrás do
  gravador, que nunca recebem socket), o sondado e o /28 varrido;
- ``contato_exigido.txt``: os hosts das fontes, que precisam aparecer com unicast do
  Sentinela na captura (prova de que o pcap viu o trabalho real);
- ``cena.json``: o resumo (contagens) para o relatório.

A senha do admin vem de ``SENTINELA_CENA_SENHA`` (gerada pelo rodar.sh; nunca impressa).
"""

import json
import os
import sys
import time
from pathlib import Path
from typing import Any

import httpx

from tests.descoberta.agente_snmp import COMUNIDADE
from tests.descoberta.simulador_gravador import SENHA as SENHA_GRAVADOR
from tests.descoberta.simulador_gravador import USUARIO as USUARIO_GRAVADOR
from tests.descoberta.simulador_routeros import SimuladorRouterOS

NUCLEO = os.environ.get("SENTINELA_CENA_URL", "http://10.99.250.10:8000")
SAIDA = Path(os.environ.get("SENTINELA_CENA_SAIDA", "/saida"))
SUB_FONTES = "10.99.250.0/27"
SUB_VARREDURA = "10.99.250.32/28"
IP_ROUTEROS, IP_SNMP, IP_GRAVADOR = "10.99.250.11", "10.99.250.12", "10.99.250.35"
IP_APROVAR, IP_SONDAR = "10.99.250.20", "10.99.250.21"
# descobertas esperadas depois das coletas (ARP, DHCP, vizinho, SNMP, gravador e canais)
IPS_ESPERADOS = {"10.99.250.20", "10.99.250.21", "10.99.250.22", "10.99.250.23", IP_GRAVADOR}
CANAIS_ESPERADOS = {1, 2}


def passo(texto: str) -> None:
    print(f"[cena] {texto}", flush=True)


class Api:
    """Cliente HTTP simples. Os cookies do núcleo são ``Secure`` (só HTTPS no navegador);
    aqui o núcleo é falado direto em HTTP na rede de teste, então os cookies vão à mão."""

    def __init__(self) -> None:
        self._http = httpx.Client(base_url=NUCLEO, timeout=30.0)
        self._cookies: dict[str, str] = {}

    def _cabecalhos(self) -> dict[str, str]:
        cab = {"Cookie": "; ".join(f"{k}={v}" for k, v in self._cookies.items())}
        if "sentinela_csrf" in self._cookies:
            cab["X-CSRF"] = self._cookies["sentinela_csrf"]
        return cab

    def pedir(self, metodo: str, caminho: str, esperado: int, **kw: Any) -> Any:
        r = self._http.request(metodo, f"/api/v1{caminho}", headers=self._cabecalhos(), **kw)
        if r.status_code != esperado:
            # só o status e o detalhe genérico do núcleo (que nunca ecoa credenciais)
            raise SystemExit(f"[cena] {metodo} {caminho}: {r.status_code} {r.text[:300]}")
        return r.json() if r.content else None

    def entrar(self, login: str, senha: str) -> None:
        r = self._http.post("/api/v1/auth/login", json={"login": login, "senha": senha})
        if r.status_code != 204:
            raise SystemExit(f"[cena] login falhou: {r.status_code}")
        self._cookies = {k: v for k, v in r.cookies.items()}


def esperar_nucleo(api: Api) -> None:
    limite = time.monotonic() + 120
    while time.monotonic() < limite:
        try:
            if api._http.get("/api/v1/saude").status_code == 200:
                return
        except httpx.HTTPError:
            pass
        time.sleep(1)
    raise SystemExit("[cena] núcleo não respondeu")


def esperar(descricao: str, condicao: Any, limite_s: float) -> Any:
    fim = time.monotonic() + limite_s
    while time.monotonic() < fim:
        valor = condicao()
        if valor:
            return valor
        time.sleep(2)
    raise SystemExit(f"[cena] tempo esgotado: {descricao}")


def pendentes(api: Api) -> list[dict[str, Any]]:
    pagina = api.pedir("GET", "/descobertas?status=pendente&limit=100", 200)
    itens: list[dict[str, Any]] = pagina["itens"]
    return itens


def main() -> int:
    senha = os.environ.get("SENTINELA_CENA_SENHA", "")
    if not senha:
        raise SystemExit("[cena] defina SENTINELA_CENA_SENHA")
    api = Api()
    esperar_nucleo(api)
    api.entrar("admin", senha)
    passo("login ok")

    api.pedir("POST", "/subredes", 201, json={"cidr": SUB_FONTES})
    varrivel = api.pedir("POST", "/subredes", 201, json={"cidr": SUB_VARREDURA})
    api.pedir("PATCH", f"/subredes/{varrivel['id']}", 200, json={"permite_varredura": True})
    passo(f"sub-redes {SUB_FONTES} e {SUB_VARREDURA} (varredura ligada)")

    usuario_ros, (senha_ros, _) = next(iter(SimuladorRouterOS().usuarios.items()))
    fontes = {
        "mikrotik": api.pedir(
            "POST",
            "/fontes",
            201,
            json={
                "tipo": "mikrotik",
                "nome": "rb-captura",
                "host": IP_ROUTEROS,
                "tls": True,
                "credencial": {"usuario": usuario_ros, "senha": senha_ros},
            },
        ),
        "snmp": api.pedir(
            "POST",
            "/fontes",
            201,
            json={
                "tipo": "snmp",
                "nome": "sw-andar-1",
                "host": IP_SNMP,
                "credencial": {"versao": "2c", "comunidade": COMUNIDADE},
            },
        ),
        "hikvision": api.pedir(
            "POST",
            "/fontes",
            201,
            json={
                "tipo": "hikvision",
                "nome": "nvr-captura",
                "host": IP_GRAVADOR,
                "tls": False,
                "porta": 80,
                "credencial": {"usuario": USUARIO_GRAVADOR, "senha": SENHA_GRAVADOR},
            },
        ),
    }
    passo("3 fontes criadas")

    for tipo, fonte in fontes.items():
        teste = api.pedir("POST", f"/fontes/{fonte['id']}/testar", 200)
        if tipo == "mikrotik":
            impressao = teste["impressao_tls"]
            if not impressao:
                raise SystemExit("[cena] o teste do MikroTik não mostrou a impressão TLS")
            api.pedir("POST", f"/fontes/{fonte['id']}/confiar", 200, json={"impressao": impressao})
            passo("mikrotik: impressão TLS confiada")
        elif not teste["ok"]:
            raise SystemExit(f"[cena] teste da fonte {tipo} falhou: {teste['erro']}")
        else:
            passo(f"{tipo}: teste ok")

    for fonte in fontes.values():
        api.pedir("POST", f"/fontes/{fonte['id']}/coletar", 202)

    def coletadas() -> list[dict[str, Any]] | None:
        lista: list[dict[str, Any]] = api.pedir("GET", "/fontes", 200)
        if all(f["ultima_coleta"] or f["ultimo_erro"] for f in lista):
            return lista
        return None

    for f in esperar("coleta das 3 fontes", coletadas, 180):
        if f["ultimo_erro"] or not f["ultima_coleta"]:
            raise SystemExit(f"[cena] coleta da fonte {f['tipo']} falhou: {f['ultimo_erro']}")
    passo("coletas concluídas")

    def completas() -> list[dict[str, Any]] | None:
        itens = pendentes(api)
        ips = {d["ip"] for d in itens if d["canal"] is None}
        canais = {d["canal"] for d in itens if d["canal"] is not None}
        return itens if IPS_ESPERADOS <= ips and CANAIS_ESPERADOS <= canais else None

    fila = esperar("descobertas esperadas", completas, 60)
    passo(f"{len(fila)} descobertas pendentes")

    alvo = next(d for d in fila if d["ip"] == IP_APROVAR and d["canal"] is None)
    camera = next(d for d in fila if d["canal"] == 1)
    api.pedir("POST", f"/descobertas/{alvo['id']}/aprovar", 200, json={"classe": "computador"})
    api.pedir("POST", f"/descobertas/{camera['id']}/aprovar", 200, json={"classe": "camera"})
    passo("aprovadas: 1 computador e 1 câmera do gravador (o gravador vai junto)")

    sondada = next(d for d in pendentes(api) if d["ip"] == IP_SONDAR and d["canal"] is None)
    api.pedir("POST", f"/descobertas/{sondada['id']}/sondar", 200)
    passo(f"sondada: {IP_SONDAR}")

    inicio = api.pedir("POST", "/varredura", 202, json={"sub_rede_id": varrivel["id"]})
    progresso: dict[str, Any] = dict(inicio["progresso"] or {})

    def varredura_terminou() -> bool:
        v = api.pedir("GET", "/varredura", 200)
        if v["progresso"]:
            progresso.update(v["progresso"])  # o último visto (depois do fim volta None)
        return not v["rodando"]

    esperar("fim da varredura", varredura_terminou, 300)
    passo(f"varredura de {SUB_VARREDURA} concluída (último progresso visto: {progresso})")

    # deixa o monitoramento dos aprovados rodar alguns ciclos dentro da captura
    time.sleep(int(os.environ.get("SENTINELA_CENA_MONITOR_S", "40")))
    equipamentos = api.pedir("GET", "/equipamentos?limit=100", 200)["itens"]
    aprovados = sorted(e["ip"] for e in equipamentos if e["checagem"] != "gravador")
    camaras = [e for e in equipamentos if e["checagem"] == "gravador"]
    permitidos = sorted({IP_ROUTEROS, IP_SNMP, IP_GRAVADOR, IP_SONDAR, *aprovados})
    permitidos.append(SUB_VARREDURA)
    SAIDA.mkdir(parents=True, exist_ok=True)
    (SAIDA / "arp_permitido.txt").write_text(",".join(permitidos) + "\n", encoding="utf-8")
    # hosts das fontes: a captura TEM de mostrar unicast do Sentinela para cada um (senão o
    # pcap não viu o trabalho real e a ausência de broadcast não prova nada)
    contato = ",".join((IP_ROUTEROS, IP_SNMP, IP_GRAVADOR))
    (SAIDA / "contato_exigido.txt").write_text(contato + "\n", encoding="utf-8")
    resumo = {
        "descobertas_pendentes_apos_coleta": len(fila),
        "aprovados_com_socket": aprovados,
        "cameras_atras_do_gravador": len(camaras),
        "sondado": IP_SONDAR,
        "varredura": {"cidr": SUB_VARREDURA, "ultimo_progresso_visto": progresso},
        "estados": {e["ip"]: e["estado"] for e in equipamentos},
    }
    (SAIDA / "cena.json").write_text(json.dumps(resumo, indent=2, default=str), encoding="utf-8")
    passo(f"ARP permitido para: {','.join(permitidos)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
