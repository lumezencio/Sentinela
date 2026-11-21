# Testes de operação

Testes dos scripts que mexem com Docker e com o banco (`instalar.sh`, `install.sh`, `update.sh`,
`backup.sh`, `restore.sh`) e do pipeline de release.

## Sem Docker de verdade (shims)

Rodam em qualquer máquina com `bash`; o `docker`, o `cosign`, o `curl`, o `ip`, o `systemctl`, o
`sudo` e o `uname` são substituídos por shims em `shims/` e `shims-cosign/`, e nada é tocado no
Docker real:

```bash
bash testes-operacao/test_restore_backup.sh
bash testes-operacao/test_update.sh
bash testes-operacao/test_install.sh
bash testes-operacao/test_instalar.sh      # instalador de uma linha (rede sugerida, código, timer)
bash testes-operacao/test_release_yml.sh   # estrutura do release.yml (identidade cosign, ordem, SHAs)
bash testes-operacao/test_pipeline.sh      # ci.yml, codeql.yml, dependabot e actions fixadas por SHA
```

Também: `shellcheck -S warning *.sh testes-operacao/*.sh` e `actionlint`.

## Com Docker de verdade (`rodar.sh`)

`rodar.sh` instala uma versão antiga num diretório temporário, tenta atualizar para uma que quebra
a migração e confere a volta automática (banco do backup, mesma imagem, checkout anterior). Só roda
no CI (`CI=true`) ou com `SENTINELA_OP_TESTE=1`, e **recusa rodar** se já existir qualquer contêiner,
volume ou imagem do projeto compose `sentinela` na máquina (ele usa esses nomes e a limpeza final
remove o que existe sob eles). Não rode numa máquina com o Sentinela instalado.
