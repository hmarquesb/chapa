# Tasks

## 1. Banco e núcleo

- [x] 1.1 Criar a migração com `npm run db -- migration new accounts_welcome_seen` e escrever o `alter table` e o `comment` do design (decisão 1); verificar que é o único arquivo novo em `supabase/migrations/` e que nenhuma migração antiga mudou (`git diff --stat supabase/`)
- [x] 1.2 Acrescentar `welcomeSeenAt` ao `AccountRecord` e `markWelcomeSeen` ao `AccountRepository` em `src/core/types.ts`, e ajustar os objetos de conta dos fakes em `src/core/accounts.test.ts`; verificar com `npm run typecheck` apontando só os pontos que ainda faltam (mapper, repositório, handlers)
- [x] 1.3 Escrever primeiro, em `src/infra/db/mappers.test.ts`, o caso de `welcome_seen_at` nulo e preenchido, e depois atualizar `AccountRow` e `toAccountRecord`; verificar com `npx vitest run src/infra/db/mappers.test.ts`
- [x] 1.4 Em `src/infra/db/account-repository.ts`, incluir `welcome_seen_at` nos `returning`/`select` de `upsertGoogle`, `createDemo` e `findActive` e implementar `markWelcomeSeen` com `coalesce(welcome_seen_at, now())`; verificar com `npm run typecheck`

## 2. API

- [x] 2.1 Em `src/app/api/_lib/handlers.test.ts`, escrever primeiro os testes de `createWelcomeSeenHandler` com fakes: `401` sem sessão sem chamar o repositório, `204` sem corpo e com `Cache-Control: no-store` chamando `markWelcomeSeen` com o id da conta, corpo enviado ignorado, e erro de banco mapeado como nas outras rotas; ajustar os fakes de conta do arquivo com `welcomeSeenAt`
- [x] 2.2 Implementar `ROUTES.welcome` e `createWelcomeSeenHandler` em `src/app/api/_lib/handlers.ts`; verificar com `npx vitest run src/app/api/_lib/handlers.test.ts`
- [x] 2.3 Criar `src/app/api/account/welcome/route.ts` (só `POST`, `runtime`, `dynamic`, `createLazyHandler`), igual ao `route.ts` vizinho; verificar com `npx vitest run src/architecture.test.ts`
- [x] 2.4 Em `src/lib/api-client.test.ts`, escrever primeiro os testes de `markWelcomeSeen` (`POST` sem corpo em `/api/account/welcome`, `204` → `ok`, erro de rede, `401` com o `error` do corpo), depois implementá-la em `src/lib/api-client.ts` reaproveitando o tratamento de `204` do `deleteRequest`; verificar com `npx vitest run src/lib/api-client.test.ts`

## 3. Interface

- [x] 3.1 Escrever primeiro `src/lib/welcome.test.ts` (`shouldOpenWelcome`: demo sempre abre, Google sem registro abre, Google com registro não abre; a lista de temas tem os seis itens do delta), depois criar `src/lib/welcome.ts` com o texto exato do cenário "Conteúdo do card"; verificar com `npx vitest run src/lib/welcome.test.ts`
- [x] 3.2 Criar `src/components/chat/welcome-dialog.tsx` conforme a decisão 4 (Dialog controlado, título, parágrafos, lista, "Entendi", sem botão de fechar, rolagem interna); verificar com `npm run typecheck` e `npm run lint`
- [x] 3.3 Em `src/components/chat/account-menu.tsx`, acrescentar a prop `welcome`, o estado do card, a opção "Sobre o Chapa" como primeiro item e a chamada a `markWelcomeSeen` ao fechar quando `persist`, uma vez por montagem e sem tratar o resultado; verificar com `npm run typecheck`
- [x] 3.4 Em `src/app/page.tsx`, passar `welcome={{ openOnLoad: shouldOpenWelcome(...), persist: !isDemo }}` ao `AccountMenu`; verificar com `npm run typecheck`
- [x] 3.5 Em `src/app/perfil/page.tsx`, com `firstAccess`, pôr no `header`, acima do logo, o `<form action={signOutOfAccount}>` com o botão "Voltar para o login" (decisão 5); verificar com `npm run typecheck` e `npm run lint`
- [x] 3.6 Em `src/components/chat/example-questions.tsx`, tirar "Me passa uma receita de lasanha?" de `EXAMPLE_QUESTIONS`; verificar com `grep -rn "lasanha" src/components` sem resultado

## 4. Screenshots

- [x] 4.1 Em `scripts/screenshots.ts`, fechar o card com "Entendi" depois de cada `goto(baseUrl)` das capturas do chat, e acrescentar a captura `boas-vindas` (o card aberto) em `SHOT_IDS` de `scripts/screenshots/shots.ts`, ajustando `shots.test.ts` se ele listar os ids; verificar com `npx vitest run scripts/screenshots`

## 5. Documentação

- [x] 5.1 Atualizar `docs/architecture.md` nas seções listadas no design ("Front-end", "Back-end" e "Banco de dados"), sem copiar o texto do card; verificar relendo as três seções
- [x] 5.2 Atualizar `docs/qa.md`, "Verificação manual local", itens **Login** (o card numa demo nova, "Sobre o Chapa" no menu) e **Perfil** ("Voltar para o login" no primeiro acesso com Google, o card que não volta em outro navegador); verificar relendo a seção

## 6. Verificação manual (orquestrador)

- [x] 6.1 Aplicar a migração no `dev` com os comandos do `DEPLOY.md`, "Banco `dev` no Neon" (`--remote="$U"` no subshell), e conferir que `\d public.accounts` mostra `welcome_seen_at`
- [x] 6.2 Com `npm run dev`: "Testar como demo" abre o chat com o card sobre o fundo borrado; "Entendi" e Esc fecham; o foco volta à página; a 390 px o card cabe ou rola por dentro, sem rolagem horizontal; "Sobre o Chapa" reabre o card sem perder a conversa nem o texto da caixa; depois de "Editar perfil" e salvar, o card abre de novo; os exemplos são só os dois; nos dois temas
- [x] 6.3 Com `npm run screenshots -- --url http://localhost:3000` (cria 1 demo), revisar as capturas, inclusive `boas-vindas`, nos dois temas e tamanhos
- [x] 6.4 Pendência da pessoa (Google em `localhost`): conta Google nova cai em `/perfil` com "Voltar para o login", que leva a `/entrar`; entrar de novo, salvar o plano, ver o card, fechar e abrir o chat em outro navegador sem o card
- [x] 6.5 Rodar `npm run lint`, `npm run typecheck`, `npm test` e `npm run build` no worktree, todos verdes

## Workflow follow-up

- Antes do merge: `db push` da migração no `prod` (checkpoint H5, passos do `DEPLOY.md`), registrado no PR como pendência bloqueante.
- Depois do merge: arquivar a change num PR próprio (`docs(openspec): archive add-chat-onboarding`) e remover o worktree.
