# DGM-Cockpit-Frontend — Observational Headquarters UI

## Purpose
Render the actual state and events emitted by the DGM-MAT brain as a clear visual cockpit/Headquarters.

## Non-negotiable authority boundary
This repository is presentation only. It must never become the brain, orchestrator, policy engine, approval authority or source of truth. The DGM-MAT runtime acts independently of this UI; the UI can be disconnected without stopping the brain.

Characters, rooms, labs, research activity, archive/warehouse activity and animations must be projections of verified runtime events and status. Never invent activity merely to make the office look busy.

## Allowed contents
Frontend components, visual states, event-to-view mapping, accessibility, layout, animation tied to real state and UI tests.

## Must remain in DGM-MAT core
Reasoning, task execution, agent lifecycle, permissions, memory, provider selection and all privileged operations.

## Safety and validation
Treat UI inputs as untrusted requests. The core revalidates every request and permission. Test stale/offline state, unknown events, authorization failures, accessibility and that UI failure does not stop core execution.

## Runtime integration contract

The current connection rules, telemetry schema, mission-state semantics, and virtual-office truth policy are documented in [docs/COCKPIT-RUNTIME-STATUS-CONTRACT-2026-10-21.md](docs/COCKPIT-RUNTIME-STATUS-CONTRACT-2026-10-21.md). The document distinguishes API/chat availability from actual mission-worker readiness and records what still requires local end-to-end verification.


## Chat local e teste de integridade E2E

O cockpit combina a vista leve do escritório digital com o chat de comandos. A vista do escritório é apenas apresentação: o backend continua a funcionar se o browser for fechado.

Para servir esta interface pelo backend local, coloca este repositório em `C:\\ProgramasGodMode\\DGM-Cockpit-Frontend` e configura `DGM_PC_COCKPIT_PATH=C:\\ProgramasGodMode\\DGM-Cockpit-Frontend`. Depois de integrar o mount opcional no DGM-MAT e reiniciar a API, abre `http://127.0.0.1:8181/cockpit/`. O mount é independente da rota móvel `/app` e a sua ausência não impede o arranque do cérebro.

Na vista Chat, seleciona o ficheiro `%LOCALAPPDATA%\\DGM-MAT\\security\\bootstrap.token` quando for pedido. O painel «Teste de integridade» executa apenas quando clicas no botão: verifica API, runtime, endpoints de missões/fila/aprovações e catálogo governado em leitura, sessão, round-trip de conversa e consulta do histórico. Usa uma thread de diagnóstico dedicada, envia um ping neutro e exige intenção `chat` sem `mission_id`; não deve criar missões nem executar comandos. O teste ainda precisa de ser executado contra o backend real no PC.


## Pesquisa do histórico e credencial local

- A barra lateral pesquisa conversas persistidas através de `GET /mobile/threads/search`; o backend devolve apenas metadados e snippets curtos.
- A pesquisa requer o backend atualizado do DGM-MAT (PR #285).
- O diálogo de ligação aceita o ficheiro `bootstrap.token` ou colagem manual do token. O segredo bootstrap é enviado apenas ao endpoint loopback `/auth/session`, limpo do campo e nunca guardado no browser; apenas a sessão temporária fica em `sessionStorage`.
- O contexto do chat mostra separadamente a disponibilidade da API e a disponibilidade efetiva de um motor de IA governado/Ollama. Não confundir saúde HTTP com inferência funcional.
- Não inserir API keys de fornecedores neste cockpit enquanto o CredentialVault não tiver proteção da chave-mestra pelo sistema operativo (Windows DPAPI/Windows Credential Manager).
