# DGM-MAT Cockpit Frontend

Frontend web/desktop independente para conversar com o runtime DGM-MAT. O cérebro e a fonte de verdade continuam no repositório AndreVazao/DGM-MAT.

## Estado desta branch

- [x] Interface de chat contínuo em português europeu, sem frameworks nem dependências de build.
- [x] Histórico, seleção, nova conversa e renomeação através das rotas reais /mobile/*.
- [x] Pairing local com bootstrap.token e sessão temporária Bearer; o token bootstrap não é guardado.
- [x] Anexos textuais lidos no browser e incluídos no conteúdo da mensagem.
- [x] Layout responsivo e navegação lateral com scroll independente.
- [x] Registo de auditoria e limitações em docs/AUDIT_AND_INTEGRATION.md.
- [x] Verificação sintática JavaScript com resultado PASS.
- [ ] Testes de runtime no PC real: ainda não executados.
- [ ] Instalação/configuração no PC: ainda não executada.

## Ativar no PC

1. Colocar o checkout em C:\\ProgramasGodMode\\DGM-Cockpit-Frontend.
2. Configurar DGM_MOBILE_UI_PATH para essa pasta no processo/launcher DGM-MAT.
3. Reiniciar o DGM-MAT.
4. Abrir http://127.0.0.1:8181/app/ ou http://localhost:8181/app/.
5. Quando solicitado, selecionar o ficheiro %LOCALAPPDATA%\\DGM-MAT\\security\\bootstrap.token para criar uma sessão temporária.

O serviço serve a UI a partir de /app quando DGM_MOBILE_UI_PATH aponta para uma pasta que contenha index.html. Sem essa configuração, o backend atual procura DGM-MAT-Mobile/web.

## Conversas

A UI usa o contrato implementado no backend:
- GET /mobile/status
- GET/POST /mobile/threads
- GET /mobile/threads/{thread_id}
- POST /mobile/threads/{thread_id}/messages
- POST /mobile/threads/{thread_id}/rename
- POST /auth/session

As conversas são persistidas pelo DGM-MAT, por omissão em C:\\ProgramasGodMode\\DGM-MAT\\storage\\runtime\\sessions\\mobile_conversations.json.

## Documentos

Não foi encontrado endpoint de upload binário no backend atual. Nesta primeira versão, os ficheiros textuais suportados são lidos localmente no browser e incluídos na mensagem. Limites: 8 ficheiros por mensagem, 2 MiB por ficheiro e 5 MiB no total. PDF/DOCX e armazenamento documental independente ficam fora desta versão.

## Segurança e limitações

- A sessão é guardada apenas em sessionStorage e é invalidada pelo frontend quando o backend devolve 401.
- O bootstrap.token só é lido após o utilizador selecionar o ficheiro e só é enviado ao endpoint local de pairing.
- A interface não contorna gates de aprovação.
- A resposta do runtime pode ser uma resposta de fallback quando Ollama está indisponível ou a RAM livre é insuficiente; não se promete um LLM geral sempre disponível.
- A ativação e os testes end-to-end no PC ainda estão pendentes.

Ver também: docs/AUDIT_AND_INTEGRATION.md.
