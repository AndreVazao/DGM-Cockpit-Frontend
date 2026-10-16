# Auditoria e integração do cockpit chat-first

Data da auditoria: 2026-10-16

## Decisão

A opção mais curta é reutilizar o contrato conversacional já implementado em AndreVazao/DGM-MAT e aproveitar os padrões visuais do AndreVazao/DGM-MAT-Mobile. O cockpit visual antigo do AndreVazao/devops-god-mode existe, mas é uma Home Visual Shell de controlo mais ampla; reconstruir essa superfície para obter apenas chat acrescentaria trabalho sem benefício imediato.

Este frontend está isolado neste repositório e não substitui o runtime DGM-MAT.

## Evidência verificada nos repositórios

### DGM-MAT

- shared/config/settings.py define DGM_API_HOST por omissão como 127.0.0.1 e DGM_API_PORT por omissão como 8181.
- core/api/api_server.py regista as rotas de runtime, mobile, governance e autenticação local.
- O backend expõe /health e serve uma UI estática em /app quando encontra uma pasta com index.html.
- DGM_MOBILE_UI_PATH pode indicar a pasta da UI. Sem essa variável, o código procura DGM-MAT-Mobile/web junto do checkout do DGM-MAT.
- core/api/mobile_bridge.py implementa status, threads, leitura de histórico, envio de mensagens e renomeação.
- core/mobile_runtime/store.py guarda as conversas duráveis por omissão em C:/ProgramasGodMode/DGM-MAT/storage/runtime/sessions/mobile_conversations.json, ou sob DGM_STORAGE_PATH.
- core/mobile_runtime/service.py interpreta intenção, persiste mensagens, pode criar uma missão governada e tenta usar Ollama apenas quando os recursos locais permitem. Sem resposta do modelo, devolve respostas de fallback por intenção; isto não equivale a um LLM geral sempre disponível.
- core/api/security_policy.py classifica as rotas /mobile/* como locais e protegidas. core/api/auth_middleware.py exige uma sessão Bearer para aceder às rotas privadas. O endpoint POST /auth/session troca um token bootstrap local por uma sessão temporária e é limitado a loopback.
- Não foi encontrado um endpoint de upload binário de documentos no contrato inspecionado.

### DGM-MAT-Mobile

- web/index.html, web/styles.css e web/app.js já implementam chat contínuo, histórico, criação e renomeação de threads, estado de ligação e fila local.
- A implementação original chama /mobile/* sem enviar Authorization: Bearer, apesar de o backend atual exigir sessão.
- Os assets originais usam URLs absolutas como /styles.css, que podem falhar quando a UI é servida sob o mount /app.
- O repositório tem uma especificação explícita de cockpit conversacional, mas o README não documenta uma interface de upload binário.

### DevOps God Mode

- README.md documenta o cockpit principal em /app/home e as APIs da Home Visual Shell.
- frontend/index.html contém uma interface de controlo mais abrangente. Não é necessário transportar todo esse painel para obter o primeiro chat funcional.
- O backend legado é separado do backend DGM-MAT; misturar os dois motores ou mudar portas não é necessário para o cockpit chat-first.

## O que este frontend implementa

- Interface web responsiva para PC, com barra lateral de histórico e conversa contínua.
- Nova conversa, seleção de conversa e renomeação.
- Envio através dos endpoints /mobile/threads existentes.
- Sessão local: o utilizador escolhe o ficheiro bootstrap.token; o conteúdo é usado apenas para pedir uma sessão a POST /auth/session, não é guardado no browser nem incluído no código.
- Token de sessão guardado em sessionStorage, com expiração detetada pelo backend.
- Anexos de texto lidos localmente e enviados no corpo da mensagem, sem presumir um endpoint binário.
- Limites de anexos: 8 ficheiros, 2 MiB por ficheiro, 5 MiB no total; extensões de texto/código listadas na interface.
- Não executa nem aprova ações autonomamente a partir da interface.

## Limitações explícitas

1. A interface não está automaticamente instalada no PC. O checkout local tem de ser colocado no caminho esperado ou configurado através de DGM_MOBILE_UI_PATH, e a API tem de ser reiniciada para montar a pasta.
2. A autenticação local exige selecionar o bootstrap.token uma vez por sessão. Não contornar esta proteção nem embutir o token no frontend.
3. Os anexos são texto extraído no browser e incluído na mensagem; não há upload binário nem armazenamento de documentos independente. PDF/DOCX não são suportados nesta primeira versão.
4. O backend atual pode responder com texto de fallback quando Ollama não está disponível ou a RAM livre é insuficiente. O chat não deve ser apresentado como um LLM de grande capacidade garantido.
5. Ainda é necessário validar a interface no PC real: pairing, histórico persistente, criação/renomeação, envio, expiração de sessão e limites de anexos.

## Ativação prevista no PC

1. Obter este repositório no PC em C:\ProgramasGodMode\DGM-Cockpit-Frontend.
2. Definir DGM_MOBILE_UI_PATH=C:\ProgramasGodMode\DGM-Cockpit-Frontend no ambiente do processo DGM-MAT, ou configurar o launcher equivalente para esse valor.
3. Reiniciar o serviço DGM-MAT e abrir http://127.0.0.1:8181/app/.
4. Selecionar %LOCALAPPDATA%\DGM-MAT\security\bootstrap.token quando a interface pedir o pairing.
5. Confirmar que /health responde, que a lista de conversas carrega e que uma mensagem aparece no histórico persistente.

Não foi feita nenhuma alteração ao backend DGM-MAT nem ao repositório legado nesta branch. A ativação no PC e os testes de runtime continuam pendentes.
