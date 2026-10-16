# DGM-MAT Cockpit Frontend

Frontend independente para o cockpit web/desktop do DGM-MAT. O cérebro e a fonte de verdade continuam a ser o runtime/API do repositório `AndreVazao/DGM-MAT`.

## Objetivo

Disponibilizar uma interface de chat contínuo em português europeu, com histórico de conversas, criação/renomeação de threads, estado de ligação e envio de documentos de texto como contexto de uma mensagem, sem exigir terminais ao utilizador.

## Integração confirmada no backend

- `GET /health`
- `GET /mobile/status`
- `GET /mobile/threads`
- `POST /mobile/threads`
- `GET /mobile/threads/{thread_id}`
- `POST /mobile/threads/{thread_id}/messages`
- `POST /mobile/threads/{thread_id}/rename`
- `POST /auth/session` para trocar o token local de bootstrap por uma sessão temporária.

O backend usa autenticação Bearer com sessões locais e exige que a interface seja servida pela API local em `http://127.0.0.1:8181` ou `http://localhost:8181`. Não colocar tokens no código nem no Git.

## Princípios

- UI vanilla HTML/CSS/JavaScript, sem dependências de build, adequada ao PC de poucos recursos.
- O runtime DGM-MAT permanece a autoridade de execução.
- Não declarar tarefas concluídas sem confirmação do backend.
- Anexos textuais são lidos localmente no browser e enviados no conteúdo da mensagem; não se presume existir um endpoint de upload binário.
- A integração deve respeitar o fluxo de sessão local do DGM-MAT.
