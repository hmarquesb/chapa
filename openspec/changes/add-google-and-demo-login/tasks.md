# Tasks

As tarefas **(pessoa)** dependem de conta, de segredo ou do painel da Vercel. O orquestrador as marca quando a pessoa confirmar. As **(autorização)** usam o banco `dev` ou a API, com a autorização prévia do `CLAUDE.md`. Nenhuma tarefa toca o `prod`, exceto a 9.2, que o orquestrador roda no H5 parcial.

## 1. Dependência e configuração

- [x] 1.1 Instalar `next-auth@5.0.0-beta.32` com a versão exata (`npm install --save-exact next-auth@5.0.0-beta.32`). Verificar com `git diff package.json` que só essa linha mudou em `dependencies`, e com `npm ls next-auth` que a versão instalada é a `5.0.0-beta.32`.
- [x] 1.2 Escrever primeiro o teste e depois acrescentar o bloco `accounts` em `AppConfig` e em `loadConfig` (`src/config.ts`, decisão 7). Verificar que um teste de `loadConfig` confere 30, 7, 5 e 180.
- [x] 1.3 Acrescentar `AUTH_SECRET`, `AUTH_GOOGLE_ID` e `AUTH_GOOGLE_SECRET` ao `.env.example` (decisão 12). Verificar com `git diff .env.example` que nenhum valor foi preenchido.

## 2. Banco

- [x] 2.1 Criar a migração com `npm run db -- migration new accounts` e o SQL da decisão 6. Verificar que o arquivo novo é o único em `supabase/migrations/` que aparece no `git status`, e que a migração inicial não mudou.
- [x] 2.2 **(autorização)** Aplicar no `dev` com o `db push --remote="$U"` da seção "Banco `dev` no Neon" do `DEPLOY.md`. Antes, conferir com um `db query --read-only` que o nome do check atual é `rate_limits_bucket_check`. Verificar: a migração aplica sem erro, `accounts` tem `relrowsecurity = true` e 0 policies, e o `--dry-run` seguinte não lista nada pendente.
- [x] 2.3 Escrever os testes de `toAccountRecord` em `mappers.test.ts` (Google com e-mail e sem `expires_at`; demo sem e-mail e com `expires_at`; perfil inválido vira `{}`) e depois implementar `AccountRow` e `toAccountRecord`. Verificar com `npm test -- mappers`.
- [x] 2.4 Implementar `src/infra/db/account-repository.ts` com os cinco métodos da decisão 7 e exportá-lo em `src/infra/db/index.ts`. Trocar `ipHash` por `key` em `rate-limit-repository.ts`. Verificar com `npm run typecheck`.

## 3. Núcleo

- [x] 3.1 Mover `getClientIp`, `hashIp` e `windowStarts` para `src/core/request-limits.ts`, junto com os testes (`request-limits.test.ts`), e ajustar os imports de `rate-limit.ts` e `handlers.ts`. Verificar que `npm test -- request-limits rate-limit` passa sem mudar nenhuma asserção.
- [x] 3.2 Acrescentar a `src/core/types.ts` os tipos e portas da decisão 7 (`AccountKind`, `AccountRecord`, `AccountRepository`, buckets novos, `hit({ key })`) e ajustar os fakes dos testes existentes. Verificar com `npm run typecheck`.
- [x] 3.3 Escrever os testes de `createDemoAccount` (até a 5ª tentativa cria a conta, a 6ª recusa com `demo_limit` e não chama `createDemo`, o `expiresAt` é now + 7 dias, a janela é o dia UTC, o bucket é `demo_day`) e depois implementar `src/core/accounts.ts`. Verificar com `npm test -- accounts`.

## 4. Autenticação

- [x] 4.1 Escrever os testes de `readGoogleCredentials` (nenhuma → `null`, as duas → credenciais, só uma → `MissingEnvError`, string vazia conta como ausente) e depois implementar `src/infra/auth/env.ts`. Verificar com `npm test -- auth/env`.
- [x] 4.2 Escrever os testes de `googleIdentity`, `sessionToken` e `readClaims` (e-mail não verificado → `null`; token sem `name`, `email` nem `picture`; `sub` igual ao `accountId`; `kind` inválido → `null`; `accountId` que não é UUID → `null`) e depois implementar `src/infra/auth/callbacks.ts`. Verificar com `npm test -- callbacks`.
- [x] 4.3 Implementar `config.ts`, `index.ts` e `next-auth.d.ts` em `src/infra/auth/` (decisões 1 a 5) e criar `src/app/api/auth/[...nextauth]/route.ts`, que reexporta `GET` e `POST` dos `handlers`, com `runtime = "nodejs"` e `dynamic = "force-dynamic"`. Ligar `accounts` no `container.ts`. Verificar, no `npm run dev` com o `dev`, que um `console.debug` temporário no `authorize` mostra o `x-forwarded-for` enviado por `curl -H "x-forwarded-for: 203.0.113.7"`. Depois, apagar o `console.debug`. Se o cabeçalho não chegar, parar e reportar (decisão 3).
- [x] 4.4 Acrescentar a regra 7 ao `src/architecture.test.ts`, com os casos de teste (decisão 10). Verificar que `npm test -- architecture` passa e que um import de teste do `next-auth` em `src/core/` faz a regra falhar.

## 5. API

- [x] 5.1 Escrever os testes dos handlers com um `authenticate` falso: chat e histórico sem conta → `401` com o texto fixo, sem ler o corpo e sem chamar `rateLimits.hit`; chat com conta → `touchLastSeen` chamado uma vez, depois do rate limit; o log traz o `accountId`. Depois, implementar a decisão 8 em `handlers.ts`, `errors.ts` e `log.ts`. Verificar com `npm test -- handlers`.
- [x] 5.2 Escrever o teste do cron (`deleteExpired` recebe `now` e `now - 180 dias`, e a resposta traz `deletedAccounts`) e depois implementar. Verificar com `npm test -- handlers`.
- [x] 5.3 Ligar `authenticate: () => getAuthenticatedAccount()` e `accounts` nos três `route.ts`. Verificar com `npm run build`, sem nenhuma variável de ambiente, que o build termina.

## 6. Interface

- [x] 6.1 Escrever os testes de `signInErrorMessage` (`erro=limite-demo`, `code=demo_limit`, `erro=falha`, `error=AccessDenied` e nenhum parâmetro) e depois implementar `src/lib/sign-in.ts` (decisão 9). Verificar com `npm test -- sign-in`.
- [x] 6.2 Gerar `src/components/ui/dropdown-menu.tsx` com `npx shadcn@<versão do lockfile> add dropdown-menu`. Verificar com `git diff package.json` que nada mudou.
- [x] 6.3 Criar `src/app/auth-actions.ts`, `src/app/entrar/page.tsx` e `src/components/auth/sign-in-panel.tsx` (decisões 3 e 9). Verificar no `npm run dev` que `/entrar` mostra os textos da spec `auth` ("Tela de entrada"), que sem o Google configurado só aparece "Testar como demo", e que o clique leva ao chat.
- [x] 6.4 Criar `account-menu.tsx` e `demo-banner.tsx`, alterar `src/app/page.tsx` (redirecionamento, menu e faixa) e tratar o `401` no `chat-app.tsx`. Verificar no `npm run dev`: sem cookie, `/` leva a `/entrar`; na demo, a faixa e "Conta de demonstração" aparecem; "Sair" leva a `/entrar`.
- [x] 6.5 Revisar a interface nova com a skill `web-design-guidelines` (foco nos botões, rótulos, contraste e menu acessível pelo teclado). Verificar que cada apontamento foi corrigido ou justificado no relatório.

## 7. Smoke

- [x] 7.1 Escrever os testes de `mergeCookies`, `checkUnauthenticatedChat`, `checkSignInPage` e `checkDemoSignIn` (inclusive o caso `code=demo_limit`) e depois implementá-los em `smoke-checks.ts`. Verificar com `npm test -- smoke-checks`.
- [x] 7.2 Reescrever o fluxo do `scripts/smoke.ts` com os 8 passos da decisão 11. Verificar com `npm run typecheck` e, **(autorização)**, rodando `npm run smoke -- --url http://localhost:3000` contra o `npm run dev` no `dev`: todos os passos ✅, e nenhum cookie nem token aparece na saída.

## 8. Verificação manual e documentação

- [x] 8.1 **(autorização)** Verificação manual no `npm run dev` com o `dev`, seguindo o `docs/qa.md`: entrar como demo, mandar uma pergunta coberta pela base (resposta `answered` com fontes), conferir os atributos do cookie (`HttpOnly`, `SameSite=Lax`) nas ferramentas do navegador, sair, entrar de novo como demo até a 6ª vez no dia e ver a mensagem do limite, e confirmar que `npm run chat -- --nome "Pizzaria Bella"` continua respondendo sem login. Registrar os resultados no relatório.
- [x] 8.2 **(pessoa)** Criar o cliente OAuth do Google e colocar as três variáveis no `.env.local` do checkout principal. Depois, entrar com Google em `localhost`: a conta é criada só com o `sub` e o e-mail (conferido com um `db query --read-only` que não imprime o e-mail, só `count(*)` e `email is not null`), e o menu mostra o e-mail.
- [x] 8.3 Escrever a ADR 0020, trocar o status da 0010 e atualizar o `docs/adr/README.md` (decisão 12). Verificar que os links da tabela apontam para arquivos que existem.
- [x] 8.4 Atualizar `AGENTS.md`, `docs/architecture.md`, `docs/business.md`, `docs/development.md`, `docs/qa.md`, `README.md` e `DEPLOY.md` como na tabela da decisão 12. Verificar com `git grep -n "sem login" -- AGENTS.md docs/ README.md` que nenhuma frase diz que o chat web é sem login, e que o `DEPLOY.md` tem o passo do cliente OAuth com os dois redirecionamentos.

## 9. Produção

- [x] 9.1 **(pessoa)** Criar na Vercel o `AUTH_SECRET` (Production e Preview) e o `AUTH_GOOGLE_ID` e o `AUTH_GOOGLE_SECRET` (só Production), e cadastrar o redirecionamento de produção no cliente OAuth.
- [x] 9.2 **(autorização, H5 parcial)** Antes do merge, aplicar a migração no `prod` com `db push --remote --yes`, nos passos do `DEPLOY.md`. Verificar com um `db query --read-only` o RLS ligado e 0 policies em `accounts`.
- [ ] 9.3 **(pessoa)** Depois do merge, entrar com Google em produção e rodar o smoke contra a produção (ou autorizar o orquestrador a rodar).

## 10. Verificação final

- [x] 10.1 Rodar `npm run lint`, `npm run typecheck`, `npm test` e `npm run build`. Verificar que os quatro passam e registrar no relatório os critérios de aceite da change, com a evidência de cada um.
