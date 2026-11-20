"""Bloqueio progressivo de login.

- Por login (persistido em ``Usuario.falhas``/``bloqueado_ate``): a partir da 5ª falha
  seguida, bloqueia 1 min, dobrando a cada falha seguinte, até 30 min.
- Logins inexistentes seguem a mesma escala em memória (``BloqueioFantasma``), para que a
  resposta não revele se a conta existe.
- Por IP (``LimitadorIP``): 20 falhas em 10 min (janela deslizante) bloqueiam o IP.

Concorrência: ``reservar`` verifica e registra a tentativa no mesmo passo síncrono (sem
``await`` no meio), ANTES da verificação lenta da senha. Assim N requisições simultâneas não
passam todas pela checagem antes de a primeira falha ser contada.

A memória é limitada (``max_chaves``, descarta o mais antigo) para não virar vetor de
esgotamento.
"""

from collections import OrderedDict, deque

from sentinela.relogio import Relogio

FALHAS_ANTES_DO_BLOQUEIO = 5
BLOQUEIO_INICIAL_S = 60
BLOQUEIO_MAXIMO_S = 30 * 60
FALHAS_POR_IP = 20
JANELA_IP_S = 10 * 60
MAX_CHAVES = 10_000


def duracao_bloqueio(falhas: int) -> int:
    """Segundos de bloqueio após ``falhas`` falhas seguidas (0 = sem bloqueio)."""
    if falhas < FALHAS_ANTES_DO_BLOQUEIO:
        return 0
    expoente = min(falhas - FALHAS_ANTES_DO_BLOQUEIO, 16)
    return min(BLOQUEIO_INICIAL_S << expoente, BLOQUEIO_MAXIMO_S)


class BloqueioFantasma:
    """Mesma escala do bloqueio por login, em memória, para logins que não existem."""

    def __init__(self, relogio: Relogio, max_chaves: int = MAX_CHAVES) -> None:
        self._relogio = relogio
        self._max = max_chaves
        # login -> (falhas, bloqueado_ate)
        self._estado: OrderedDict[str, tuple[int, float]] = OrderedDict()

    def __len__(self) -> int:
        return len(self._estado)

    def restante(self, login: str) -> float:
        _, ate = self._estado.get(login, (0, 0.0))
        return max(0.0, ate - self._relogio.agora())

    def reservar(self, login: str) -> float:
        """Se bloqueado, devolve a espera (s) sem contar; senão conta a falha e devolve 0.

        Para login inexistente toda tentativa é falha, então reservar = registrar."""
        espera = self.restante(login)
        if espera:
            return espera
        self.registrar_falha(login)
        return 0.0

    def liberar(self, login: str) -> None:
        """Devolve UMA tentativa reservada que deu certo; abaixo do limiar, o bloqueio sai."""
        atual = self._estado.get(login)
        if atual is None:
            return
        falhas = atual[0] - 1
        if falhas <= 0:
            del self._estado[login]
        elif falhas < FALHAS_ANTES_DO_BLOQUEIO:
            self._estado[login] = (falhas, 0.0)
        else:
            self._estado[login] = (falhas, atual[1])

    def registrar_falha(self, login: str) -> None:
        falhas, _ = self._estado.pop(login, (0, 0.0))
        falhas += 1
        self._estado[login] = (falhas, self._relogio.agora() + duracao_bloqueio(falhas))
        while len(self._estado) > self._max:
            self._estado.popitem(last=False)


class LimitadorIP:
    """Janela deslizante de falhas por IP."""

    def __init__(
        self,
        relogio: Relogio,
        max_falhas: int = FALHAS_POR_IP,
        janela_s: float = JANELA_IP_S,
        max_chaves: int = MAX_CHAVES,
    ) -> None:
        self._relogio = relogio
        self._max_falhas = max_falhas
        self._janela = janela_s
        self._max = max_chaves
        self._falhas: OrderedDict[str, deque[float]] = OrderedDict()

    def __len__(self) -> int:
        return len(self._falhas)

    def _podar(self, ip: str) -> deque[float] | None:
        instantes = self._falhas.get(ip)
        if instantes is None:
            return None
        limite = self._relogio.agora() - self._janela
        while instantes and instantes[0] <= limite:
            instantes.popleft()
        if not instantes:
            del self._falhas[ip]
            return None
        return instantes

    def restante(self, ip: str) -> float:
        """Segundos até o IP poder tentar de novo (0 = liberado)."""
        instantes = self._podar(ip)
        if instantes is None or len(instantes) < self._max_falhas:
            return 0.0
        # libera quando a falha mais antiga que mantém a contagem no limite sair da janela
        return max(0.0, instantes[-self._max_falhas] + self._janela - self._relogio.agora())

    def reservar(self, ip: str) -> float:
        """Se o IP está sem cota, devolve a espera (s) sem registrar; senão registra a
        tentativa como falha provisória e devolve 0 (desfeita por ``liberar`` no sucesso)."""
        espera = self.restante(ip)
        if espera:
            return espera
        self.registrar_falha(ip)
        return 0.0

    def liberar(self, ip: str) -> None:
        """Devolve uma tentativa reservada que deu certo (remove o registro mais recente)."""
        instantes = self._podar(ip)
        if instantes:
            instantes.pop()
            if not instantes:
                del self._falhas[ip]

    def registrar_falha(self, ip: str) -> None:
        instantes = self._podar(ip) or deque()
        instantes.append(self._relogio.agora())
        while len(instantes) > self._max_falhas:  # só o necessário para decidir
            instantes.popleft()
        self._falhas.pop(ip, None)
        self._falhas[ip] = instantes
        while len(self._falhas) > self._max:
            self._falhas.popitem(last=False)
