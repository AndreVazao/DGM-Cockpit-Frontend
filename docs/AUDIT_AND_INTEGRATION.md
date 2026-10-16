# Auditoria e integração — cockpit simples para PC

Data: 2026-10-16

## Decisão de âmbito

Esta branch serve exclusivamente uma interface provisória de chat no PC local. O objetivo é o utilizador poder enviar prompts, instruções e documentos textuais ao DGM-MAT, receber o resultado devolvido pelo backend e rever o histórico. Não construir aqui o estúdio 3D nem uma aplicação móvel.

## Evidência verificada no repositório DGM-MAT

- `shared/config/settings.py` define o host por omissão como `127.0.0.1` e a porta como `8181`.
- `core/api/api_server.py` regista as rotas de runtime, conversas, governance e autenticação local, e monta uma interface estática em `/app` quando encontra uma pasta com `index.html`.
- `DGM_MOBILE_UI_PATH` é o nome legado da variável de configuração para indicar a pasta da UI.
- `core/api/mobile_bridge.py` implementa estado, criação/leitura/envio/renomeação de conversas. Os caminhos `/mobile/*` são reutilizados por compatibilidade; não implicam implantação móvel nesta fase.
- `core/mobile_runtime/service.py` pode usar Ollama quando os recursos locais permitem, mas pode devolver fallback por intenção. A interface não deve prometer que existe sempre um LLM geral.
- `core/api/security_policy.py` classifica as rotas de conversas como locais/protegidas; `POST /auth/session` troca um token bootstrap por uma sessão temporária.
- Não foi encontrado endpoint de upload binário de documentos no contrato inspecionado.

## Decisão sobre o dashboard legado

O frontend de `AndreVazao/devops-god-mode` está ligado a um backend/relay legado e tem uma superfície de controlo mais ampla. Portar o dashboard completo agora aumentaria o trabalho e não resolve melhor o objetivo imediato. Reutilizar o contrato de conversas do próprio DGM-MAT é o caminho mais curto.

## Comportamento desta interface

- Chat contínuo, histórico, nova conversa e renomeação.
- Seleção local do bootstrap token para criar sessão temporária; o token não é gravado no código.
- Anexos de texto/código lidos no browser e incorporados na mensagem.
- Limites: 8 ficheiros, 2 MiB por ficheiro, 5 MiB total.
- Não contorna os gates de aprovação do DGM-MAT.
- Não declara sucesso quando o backend não confirma o envio.

## Ativação e validação pendentes

1. Colocar o repositório no PC em `C:\\ProgramasGodMode\\DGM-Cockpit-Frontend`.
2. Configurar `DGM_MOBILE_UI_PATH` para essa pasta no ambiente/launcher da API.
3. Reiniciar o DGM-MAT.
4. Abrir `http://127.0.0.1:8181/app/` e selecionar o bootstrap token quando pedido.
5. Testar health, pairing, envio, histórico persistente, criação/renomeação e falha de sessão.

A validação sintática de JavaScript passou anteriormente. Testes end-to-end no PC não foram executados. A máquina Desktop Commander associada está atualmente offline, pelo que não foi possível ativar ou testar a interface localmente.
