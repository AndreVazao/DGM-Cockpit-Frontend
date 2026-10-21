# DGM-MAT Cockpit — Contrato de ligação ao runtime e verdade visual

**Data:** 2026-10-21  
**Estado:** contrato de integração documentado; alterações de interface por validar localmente  
**Repositórios:** `AndreVazao/DGM-Cockpit-Frontend` e `AndreVazao/DGM-MAT`

## 1. Fronteira de autoridade

- **DGM-MAT é a fonte de verdade** para missões, fila, aprovações, agentes, permissões, memória e resultados.
- **Cockpit é cliente de apresentação e entrada**: envia pedidos autenticados, apresenta estados observados e permite apenas ações que o backend exponha e autorize.
- **Escritório virtual é uma projeção** de eventos/estados observados. Uma sala desenhada, um LED ou uma animação não prova que exista um agente, worker ou departamento operacional.
- A falha, fecho ou atualização do cockpit não pode ser interpretada como falha ou cancelamento de uma missão no core.
- Nenhum texto vindo do browser concede permissões. O core revalida identidade, autorização, esquema, risco e estado atual.

## 2. Fluxo de comunicação

1. O frontend abre no PC local servido pelo DGM-MAT; a origem da API é a origem da página.
2. O operador escolhe o ficheiro de bootstrap local. O frontend envia-o para `POST /auth/session` e mantém o token de sessão apenas em `sessionStorage`.
3. Pedidos protegidos enviam `Authorization: Bearer <session-token>`. A sessão expirada deve limpar o token e voltar ao emparelhamento.
4. O frontend consulta os endpoints de conversas para listar/criar/renomear threads e enviar mensagens. Anexos suportados são lidos no browser e incorporados no texto; isto **não** equivale a upload binário persistente.
5. A vista do escritório consulta `GET /runtime/office/telemetry`. Esta leitura é observacional e não deve criar, aprovar ou executar missões.
6. Uma ação operacional só pode ser oferecida se existir endpoint autorizado, payload tipado, confirmação apropriada, resposta verificável e tratamento explícito de falhas.

## 3. Endpoints e significado da evidência

| Endpoint | Utilização no cockpit | O que prova — e o que não prova |
|---|---|---|
| `GET /health` | Sonda básica da API | A API HTTP respondeu. Não prova que a fila, os workers, Ollama ou providers estejam operacionais. |
| `POST /auth/session` | Trocar bootstrap por sessão local temporária | A sessão foi emitida. Não prova capacidade de executar missões. |
| `GET /mobile/status` | Estado do bridge/conversas e observação de Ollama | O bridge respondeu; campos como `status: ready` não devem ser tratados isoladamente como prova de worker de missões. |
| `GET /mobile/threads` e endpoints de thread/mensagens | Histórico e chat | O contrato de conversas respondeu. Não prova que qualquer pedido tenha sido executado pelo runtime de missões. |\n| `POST /mobile/threads/{thread_id}/messages` | Regista mensagem e devolve a thread/intent; pode devolver `mission_id` | O serviço interpreta a intenção e só cria missão quando `execution_candidate` é verdadeiro e não exige aprovação. A resposta conversacional não prova execução. O frontend atual não trata `data.mission_id` como estado estruturado de missão. |
| `GET /runtime/health`, `/runtime/status`, `/runtime/truth` | Diagnóstico do runtime, quando usado | Estado declarado pelo runtime/state store; deve ser mostrado com timestamp e sem confundir com teste end-to-end. |
| `GET /runtime/office/telemetry` | KPIs e salas do escritório | Contagens de checkpoints persistidos, estados da fila e heartbeat do worker. Não autoriza nem executa ações. |
| `GET /governance/commands/catalog` | Inventário de comandos permitidos | Catálogo observado, não autorização para inventar comandos. Só IDs recebidos e validados podem ser apresentados. |
| `POST /governance/commands/run` | Diagnóstico explícito escolhido pelo operador | Só executar um ID do catálogo, com autorização do core, e apresentar o resultado real; nunca enviar shell arbitrário. |
| `POST /runtime/missions` | Criar uma missão | `status: success` confirma aceitação/criação, não conclusão. Consultar o estado durável e o resultado da missão. |

Os endpoints e a proteção efetiva têm de ser confirmados na versão de DGM-MAT instalada. Este documento descreve o contrato observado no repositório remoto; não prova que o PC desligado esteja atualizado ou que o serviço esteja ativo.

## 4. Contrato de telemetria do escritório

Endpoint: `GET /runtime/office/telemetry`  
Esquema esperado: `dgm-mat.office-telemetry.v1`

Campos de topo atualmente definidos no backend:

- `generated_at`: momento em que foi construída a observação.
- `source`: fontes usadas para a observação.
- `runtime`: estado/degradação declarados pelo state store.
- `missions.total`, `missions.counts`, `missions.invalid_checkpoints`, `missions.recent`: resumo dos checkpoints duráveis; os itens recentes omitem goals e conteúdo de conversas.
- `actions.counts` e dados resumidos da fila: estado de ações duráveis.
- `queue_worker.worker_alive`, `last_heartbeat`, `registered_handler_count`: observação do consumidor da fila.
- `departments`: estados de engenharia, aprovações e operações derivados de evidência real. Investigação, memória e agentes permanecem `unknown` enquanto não existir feed próprio.
- `limitations`: limites explícitos da telemetria.

O frontend deve rejeitar o contrato se faltarem os campos essenciais e apresentar telemetria indisponível, sem inventar zeros ou atividade. Zero é um valor medido; desconhecido é ausência de evidência. Não mostrar goals, mensagens, credenciais, payloads completos ou dados pessoais no escritório.

## 5. Estados visuais normativos

| Estado interno | Apresentação recomendada | Regra |
|---|---|---|
| `active` | Ativo | Apenas quando o backend deriva atividade de uma fonte observada. |
| `waiting` | À espera | Existe trabalho/decisão pendente observada; não implica execução. |
| `idle` | Em espera | A fonte conhecida não mostra atividade nem espera relevante. |
| `degraded` | Degradado | O backend reportou degradação. |
| `unknown` / sem feed | Sem telemetria | Não desenhar atividade nem converter em “em espera”. |
| pedido HTTP sem resposta | API indisponível | Não reutilizar o último estado como se fosse atual; preservar timestamp antigo e marcar desatualizado. |
| sessão ausente/401 | Sessão necessária/expirada | Não consultar endpoints protegidos nem conservar visualmente estado verde. |

Os LEDs são resumos visuais, não a única comunicação do estado. Cada indicador deve ter texto acessível, fonte, momento da observação e erro/limitação quando aplicável.

## 6. Semântica do ciclo de missão

A UI deve separar claramente:

1. **Rascunho local** — ainda não enviado.
2. **Pedido enviado** — o frontend enviou o pedido; aguarda resposta.
3. **Aceite/criado** — o backend devolveu ID e estado inicial.
4. **À espera de aprovação** — a fila exige decisão autorizada.
5. **Em execução** — estado durável observado como `RUNNING`; heartbeat da fila é evidência separada.
6. **Concluído** — estado terminal durável e resultado persistido foram consultados.
7. **Falhado/cancelado** — estado terminal real, com erro sanitizado quando disponível.
8. **Desconhecido/desatualizado** — a UI não consegue confirmar o estado atual.

Uma resposta HTTP 2xx, um botão que deixa de girar, uma missão criada ou uma mensagem do modelo não bastam para declarar conclusão. Depois de criar uma missão, consultar o endpoint de estado/resultados duráveis; não tratar `POST /runtime/missions` como execução síncrona.

## 7. Ações, aprovações e segurança

- O frontend não cria políticas, aprovações implícitas nem comandos.
- Catálogo ausente, inválido ou não autenticado desativa a execução e explica o motivo.
- Só enviar IDs exatos do catálogo. Não adicionar campos `shell`, comando livre, elevação ou caminhos arbitrários.
- Ações mutáveis devem permanecer indisponíveis até existir um contrato backend governado, confirmação humana, idempotência, auditoria, recuperação e testes adequados.
- A aprovação deve mostrar o alvo, impacto, risco e resultado esperado antes da confirmação; a decisão é persistida e revalidada pelo core.
- Renderizar a saída de comandos como texto, nunca como HTML interpretável.

## 8. Limites atuais e próximos passos

### Confirmado por inspeção do código remoto
- O cockpit já contém chat, emparelhamento por sessão local, seleção de comandos governados e uma vista separada de escritório.
- O frontend consome `/runtime/office/telemetry` e valida o esquema `dgm-mat.office-telemetry.v1`.
- O backend remoto expõe esse endpoint a partir de checkpoints duráveis, fila e state store; omite goals e payloads completos.
- A telemetria deixa investigação, memória e atividade individual dos agentes como desconhecidas sem feeds específicos.
- Os testes do frontend contêm verificações estáticas do contrato e da regra de não inventar atividade.

### Ainda por provar no PC
1. A versão local do backend corresponde ao commit remoto que contém o endpoint.
2. A sessão local consegue consultar a telemetria e o catálogo de comandos.
3. O worker real da fila está ativo e os contadores correspondem ao estado persistido.
4. Criar, aprovar (quando aplicável), executar, consultar o resultado e recuperar após reinício funciona end-to-end.
5. A interface continua correta com API desligada, sessão expirada, esquema inválido e dados antigos.

### Ordem de implementação recomendada
1. Validar contrato e estados de falha com testes locais sem Actions.
2. Mostrar no topo separadamente: API, sessão, worker da fila e telemetria (cada um com evidência própria).
3. Acrescentar detalhe de missão a partir de estado durável, nunca apenas do retorno da criação.
4. Ligar novos departamentos apenas quando existir fonte de eventos real e contrato testado.
5. Só depois evoluir a representação visual 2D/3D. A cena nunca deve anteceder a instrumentação real.

## 9. Fontes de código inspecionadas

- DGM-Cockpit-Frontend `main`: `app.js`, `index.html`, `tests/cockpit-contract.test.cjs`, `docs/AUDIT_AND_INTEGRATION.md`.
- DGM-MAT `main`: `core/api/runtime_api.py`, `core/api/api_server.py`, `core/api/security_policy.py`, `core/api/mobile_bridge.py`, `docs/architecture/DGM-MAT-CANONICAL-OPERATING-MODEL-END-TO-END-AND-DEPARTMENTS-2026-10-21.md`.
- Inspeção remota do código apenas; não houve acesso ao PC, teste HTTP local nem execução de testes nesta sessão.
