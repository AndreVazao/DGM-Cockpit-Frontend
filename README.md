# DGM-MAT PC Chat Cockpit

Interface provisória, simples e exclusiva para utilizar no PC local: enviar prompts, instruções e ficheiros de texto ao cérebro DGM-MAT e consultar as conversas guardadas pelo runtime.

**Âmbito desta fase:** PC apenas. Não é o dashboard 3D definitivo, não é uma aplicação móvel e não substitui o DGM-MAT.

## O que inclui
- Chat contínuo em português europeu.
- Histórico persistente servido pelo DGM-MAT.
- Criar e renomear conversas.
- Colar prompts e anexar ficheiros de texto/código.
- Ligação local autenticada com sessão temporária.
- Interface sem frameworks, dependências de build ou serviços pagos.

## Estado real
- [x] Código da interface criado.
- [x] Verificação sintática JavaScript concluída com PASS após o painel de motores.
- [x] Painel lateral de motores com LEDs verde/amarelo/vermelho e sondas para API, conversas, Ollama e diagnóstico de autocorreção.
- [x] Controlo web mostrado como indisponível/não confirmado até existir implementação real.
- [ ] Validação visual e de integração no PC real ainda pendente.
- [ ] Testes de integração no PC real ainda por executar.
- [ ] Instalação/ativação local ainda por executar.
- [ ] Capacidades de resposta e execução do DGM-MAT têm de ser validadas separadamente; a interface não transforma respostas de fallback em inteligência geral.

## Ativação prevista no PC
1. Colocar o checkout em `C:\\ProgramasGodMode\\DGM-Cockpit-Frontend`.
2. Configurar `DGM_MOBILE_UI_PATH=C:\\ProgramasGodMode\\DGM-Cockpit-Frontend` no ambiente/launcher do DGM-MAT. O nome desta variável é legado; nesta fase serve apenas para indicar a pasta da interface PC.
3. Reiniciar a API do DGM-MAT.
4. Abrir `http://127.0.0.1:8181/app/`.
5. Quando solicitado, selecionar `%LOCALAPPDATA%\\DGM-MAT\\security\\bootstrap.token` para obter uma sessão temporária.

A API serve a interface em `/app` quando a pasta configurada contém `index.html`. Sem configuração explícita, o backend atual procura a antiga pasta `DGM-MAT-Mobile/web`.

## Contrato utilizado
O frontend reutiliza o contrato de conversas que já existe no backend DGM-MAT:
- `GET /mobile/status`
- `GET/POST /mobile/threads`
- `GET /mobile/threads/{thread_id}`
- `POST /mobile/threads/{thread_id}/messages`
- `POST /mobile/threads/{thread_id}/rename`
- `POST /auth/session`

Os caminhos `/mobile/*` são nomes históricos do backend; não significam que esta fase inclua suporte ou instalação móvel.

## Anexos e limites
Os ficheiros de texto/código suportados são lidos localmente no browser e incluídos no texto da mensagem. Máximo de 8 ficheiros, 2 MiB por ficheiro e 5 MiB no total. Não existe upload binário independente neste contrato; PDF e DOCX não são suportados nesta versão.

## Segurança e limitações
- O token bootstrap não é embutido nem guardado no código; é selecionado localmente para pedir uma sessão temporária.
- A sessão fica em `sessionStorage` e é invalidada quando a API responde 401.
- A interface não contorna aprovações nem declara uma tarefa concluída sem confirmação do backend.
- O runtime pode devolver respostas de fallback se o modelo local não estiver disponível ou se os recursos do PC forem insuficientes.
- Nenhum teste end-to-end foi executado no PC nesta fase.

O cérebro e a fonte de verdade continuam no repositório `AndreVazao/DGM-MAT`. O futuro estúdio 3D permanece fora do âmbito desta ferramenta provisória.
