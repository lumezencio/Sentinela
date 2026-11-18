"""Telegram falso da prova de captura: HTTPS em 443 com o certificado de ``api.telegram.org``.

O certificado e a chave vêm de ``/certs-teste`` (CA descartável gerada pelo ``rodar.sh``). Aceita
``POST /bot<token>/sendMessage`` e ``/editMessageText`` (corpo JSON) e responde
``{"ok": true, "result": {"message_id": N}}``. ``GET /_recebidas`` devolve o que chegou (a cena
usa para provar que a mensagem de queda saiu). O token recebido nunca é guardado nem impresso:
só o método e o texto da mensagem (nome fictício de equipamento).
"""

import json
import re
import ssl
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

CERTS = Path("/certs-teste")
_ROTA = re.compile(r"^/bot[^/]{1,128}/(sendMessage|editMessageText)$")

_trava = threading.Lock()
_recebidas: list[dict[str, object]] = []
_proximo_id = 100


class Atendente(BaseHTTPRequestHandler):
    server_version = "TelegramFalso"
    protocol_version = "HTTP/1.1"

    def _responder(self, codigo: int, corpo: object) -> None:
        dados = json.dumps(corpo).encode()
        self.send_response(codigo)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(dados)))
        self.end_headers()
        self.wfile.write(dados)

    def do_GET(self) -> None:  # noqa: N802 - API do http.server
        if self.path != "/_recebidas":
            self._responder(404, {"ok": False})
            return
        with _trava:
            self._responder(200, list(_recebidas))

    def do_POST(self) -> None:  # noqa: N802 - API do http.server
        global _proximo_id
        achou = _ROTA.match(self.path)
        tamanho = int(self.headers.get("Content-Length") or 0)
        bruto = self.rfile.read(min(tamanho, 65536))
        if achou is None:
            self._responder(404, {"ok": False})
            return
        try:
            corpo = json.loads(bruto)
        except ValueError:
            corpo = {}
        with _trava:
            if achou.group(1) == "sendMessage":
                _proximo_id += 1
                mid = _proximo_id
            else:
                mid = int(corpo.get("message_id") or 0)
            _recebidas.append(
                {
                    "metodo": achou.group(1),
                    "chat_id": str(corpo.get("chat_id", "")),
                    "texto": str(corpo.get("text", "")),
                    "message_id": mid,
                }
            )
        print(f"telegram falso: {achou.group(1)} chat={corpo.get('chat_id')}", flush=True)
        self._responder(200, {"ok": True, "result": {"message_id": mid}})

    def log_message(self, formato: str, *args: object) -> None:  # silencioso: sem token no log
        return


def servir() -> None:
    contexto = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
    contexto.load_cert_chain(CERTS / "telegram.pem", CERTS / "telegram.key")
    servidor = ThreadingHTTPServer(("0.0.0.0", 443), Atendente)  # noqa: S104 - rede isolada
    servidor.socket = contexto.wrap_socket(servidor.socket, server_side=True)
    print("telegram falso: https em 443", flush=True)
    servidor.serve_forever()
