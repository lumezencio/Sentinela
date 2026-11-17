# Simuladores da captura (RouterOS, SNMP, gravador) + script de cena.
# Base: a imagem do núcleo construída pelo próprio compose (contexto "nucleo" = service:core),
# que já traz o pacote sentinela (codificador da API RouterOS), pysnmp, cryptography e httpx.
# Os simuladores vêm de core/tests/descoberta sem cópia de lógica. Só para teste: nunca publicada.
FROM nucleo
WORKDIR /sim
COPY --from=testes __init__.py tests/__init__.py
COPY --from=testes descoberta/__init__.py descoberta/simulador_routeros.py \
     descoberta/simulador_gravador.py descoberta/agente_snmp.py tests/descoberta/
COPY --from=testes fixtures/gravadores/ tests/fixtures/gravadores/
COPY rodar.py cena.py ./
USER 10001:10001
# python rodar.py <simulador> | python cena.py (o diretório do script, /sim, entra no sys.path)
ENTRYPOINT ["python"]
