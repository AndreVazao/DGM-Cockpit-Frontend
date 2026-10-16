# Dashboard DGM-MAT para Windows

Este ZIP contém apenas os ficheiros estáticos do dashboard e o atalho DGM-MAT Dashboard.url.

## Utilização

- O dashboard não deve ser aberto diretamente pelo ficheiro index.html.
- O back-office DGM-MAT tem de estar instalado e a responder em http://127.0.0.1:8181.
- Clica em DGM-MAT Dashboard.url para abrir http://127.0.0.1:8181/app/ no browser predefinido.
- A autenticação continua a ser feita pela sessão/token temporário previsto no backend. O pacote não contém credenciais.

## Build e limites

O workflow Windows Dashboard Package é manual (workflow_dispatch), valida a sintaxe JavaScript e executa os testes de contrato Node antes de criar o ZIP. O pacote não instala nem inicia o back-office e não prova que a API está disponível no PC.
