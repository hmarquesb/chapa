# Proposal

## Why

Com a change `add-google-and-demo-login`, a web passa a exigir login, mas a conversa ainda não pertence a ninguém: quem tem o UUID lê e continua a conversa, e o link `/?sessao=<id>` segue funcionando como credencial ([ADR 0010](../../../docs/adr/0010-link-de-continuacao-em-vez-de-login.md), substituída pela 0020). O objetivo O1 do PRD (`prd-chapa-login.md`) exige que toda conversa pela web pertença a uma conta e que uma conta **nunca** leia nem continue a conversa de outra. Esta é a change 2 de 3. Ela **depende da change 1 estar aplicada e arquivada**, e os deltas abaixo foram escritos sobre o texto que a change 1 deixa nas specs.

## What Changes

- **Conversas por conta:** `sessions` ganha a coluna `account_id`, que referencia `accounts(id)` com `on delete cascade`. Toda conversa `web` passa a ser de uma conta, e as de `cli` e `eval` continuam sem conta.
- **Autorização no repositório:** toda leitura e escrita de conversa recebe o dono (a conta, ou "sem conta" no CLI e no eval) e filtra por ele no SQL, não só na rota. A conversa de outra conta responde **`404`**, com o mesmo texto de uma conversa que não existe.
- **BREAKING:** o **id da conversa é gerado pelo servidor**. Em `POST /api/chat`, o `sessionId` fica opcional: sem ele, o servidor cria uma conversa nova da conta e devolve o id na resposta, `{ status, answer, sources, sessionId }`. O `sessionId` vem nulo quando nada foi criado, como na primeira mensagem bloqueada pelo guardrail.
- **Rotas novas:** `GET /api/sessions` lista as conversas da conta (id, título e última atividade, da mais recente para a mais antiga, no máximo 50). `DELETE /api/sessions/[id]` apaga uma conversa da conta. O PRD sugeria `/api/conversas`. Os nomes seguem as rotas que já existem (`/api/sessions/...`), em inglês, e o comportamento é o do PRD.
- **Interface:** entram a lista de conversas (barra lateral no desktop e painel no celular), "Nova conversa" e a opção de apagar uma conversa, com confirmação. Ao abrir o chat, a conversa começa vazia e as anteriores ficam na lista.
- **BREAKING:** saem o link de continuação, a cópia do link, a abertura por `?sessao=` e o UUID salvo no `localStorage`. Um link antigo com `?sessao=` leva à tela de entrada, ou ao chat de quem já está logado, sem erro.
- **Retenção:** a conversa `web` é apagada depois de **30 dias sem mensagem nova**, e as de `cli` e `eval` depois de 7 dias, como hoje. Apagar a conta apaga as conversas dela. A limpeza diária também apaga, na hora, as conversas `web` antigas sem conta.
- **Script `npm run authz-check`:** confere a autorização contra o banco `dev`, com duas contas demo de teste que ele mesmo cria e apaga. O Vitest continua sem banco (`AGENTS.md`), então os testes de autorização com o repositório falso ficam no `npm test` e os testes contra o banco real ficam neste script.
- **ADR 0021** "Autorização por conta na camada de repositório", que **complementa a ADR 0005**.
- Smoke, `docs/architecture.md`, `docs/business.md`, `docs/development.md`, `docs/qa.md`, `README.md`, `AGENTS.md` e `docs/adr/README.md` atualizados.

## Fora do escopo

- O perfil na conta, o plano em escolha fechada, "Excluir minha conta", a página de privacidade e o limite diário por conta (change 3). Nesta change, o perfil continua salvo por conversa e no `localStorage`, como hoje.
- A **restrição no banco** de que uma conversa `web` tenha sempre um `account_id`. Ela entra na migração da change 3, depois que esta change estiver em produção. Assim, nenhum deploy fica com código antigo gravando conversas sem conta numa tabela que já as recusa (ver `design.md`, decisão 1).
- Mover as conversas de uma demo para uma conta Google. Renomear uma conversa. Buscar nas conversas. Paginar a lista além das 50 mais recentes.
- Policies de RLS por conta. O RLS continua ligado e sem policies, e a alternativa fica registrada na ADR 0021.
- Mudanças no RAG, nos prompts e no eval.

## Chamadas reais e checkpoints humanos

1. **Orquestrador (autorização prévia):** aplicar a migração no `dev` e rodar o `npm run authz-check` contra o `dev`. Fazer a verificação manual com `npm run dev`: duas demos em navegadores diferentes, lista, apagar e `?sessao=` antigo. Rodar o `npm run chat` uma vez, para confirmar que o CLI continua funcionando sem conta.
2. **Orquestrador (H5 parcial, autorizado):** aplicar a migração no `prod` **antes do merge**. Ela só acrescenta uma coluna que aceita nulo e um índice, então o código da change 1 continua funcionando com ela.
3. **Pessoa:** depois do merge, rodar o smoke em produção (ou autorizar o orquestrador). As conversas `web` anônimas que restarem são apagadas na primeira limpeza diária depois do deploy. Elas expirariam em 7 dias de qualquer forma.

A change não roda `ingest` nem `eval`.

## Capabilities

### New Capabilities

Nenhuma.

### Modified Capabilities

- `session-memory`: a conversa passa a pertencer a uma conta (na web) ou a nenhuma (no CLI e no eval), só o dono a continua, e a retenção vira 30 dias na web e 7 dias no CLI e no eval.
- `chat-api`: `sessionId` opcional e devolvido na resposta, dono da conversa nas rotas, `404` igual para conversa alheia e inexistente, as rotas de listar e apagar e a limpeza nova.
- `chat-ui`: entram a lista de conversas, apagar uma conversa e o tratamento do link antigo. Saem o link de continuação, a cópia do link, a abertura por `?sessao=` e a sessão salva no navegador.

## Impact

- **Código:** `src/core/types.ts`, `src/core/assistant.ts`, `src/core/errors.ts`, `src/core/conversations.ts` (novo), `src/infra/db/session-repository.ts`, `src/infra/db/account-repository.ts`, `src/infra/db/mappers.ts`, os handlers e as rotas da API (duas rotas novas), `src/lib/` (`types`, `api-client`, `session-id`, `format`), `src/components/chat/` (lista e diálogo novos; o `continue-dialog.tsx` sai), `src/app/page.tsx`, `scripts/chat.ts`, `scripts/eval.ts`, `scripts/smoke*.ts` e `scripts/authz-check.ts` (novo). A lista fechada está no `design.md`.
- **API:** muda o contrato do `POST /api/chat` (`sessionId` opcional na entrada e presente na saída) e entram duas rotas.
- **Banco:** a coluna `sessions.account_id` e um índice.
- **Dependências:** nenhuma. O componente `sheet` do shadcn usa o `radix-ui`, que já está instalado.
- **ADR:** 0021 (nova), que complementa a 0005.
