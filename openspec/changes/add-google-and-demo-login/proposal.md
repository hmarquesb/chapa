# Proposal

## Why

Hoje o Chapa não tem login: cada conversa é anônima, e o link `/?sessao=<id>` funciona como credencial ([ADR 0010](../../../docs/adr/0010-link-de-continuacao-em-vez-de-login.md)). O Chapa v2 precisa saber **quem** é o restaurante: a onda 3 (chamados com aprovação) e a onda 4 (memória que persiste entre conversas) dependem disso, e "pedir dados de outra loja" só vira um teste de acesso real quando existem contas. Esta é a primeira de três changes do PRD `prd-chapa-login.md` (peça 2 do Chapa v2). Ela cria as contas e o login, e as outras duas se apoiam nelas:

1. **`add-google-and-demo-login`** (esta): contas, login com Google, conta de demonstração, tela de entrada e proteção das rotas.
2. `scope-conversations-to-accounts`: cada conversa passa a pertencer a uma conta, com a lista de conversas.
3. `move-profile-to-account`: o perfil sai da conversa e vai para a conta, com o plano como escolha fechada.

As três rodam **em sequência** (1 → 2 → 3), porque mexem nos mesmos arquivos (`handlers.ts`, `types.ts`, `chat-app.tsx`). Os deltas das changes 2 e 3 já foram escritos sobre o texto que esta change deixa nas specs.

## What Changes

- **BREAKING:** a página do chat e as rotas `POST /api/chat` e `GET /api/sessions/[id]/messages` passam a **exigir login**. Sem sessão válida, as rotas respondem `401` e as páginas levam a `/entrar`. `GET /api/health` e `GET /api/cron/cleanup` continuam sem login.
- **Tela de entrada** `/entrar`, com o nome do Chapa e da Rango, uma frase do que o assistente faz, os botões **"Testar como demo"** (em destaque) e **"Entrar com Google"**, e o aviso de privacidade do PRD (R7).
- **Login com Google** (OAuth, pelo Auth.js). No primeiro login, cria a conta com o `sub` e o e-mail do Google. Nos seguintes, encontra a conta pelo `sub`. O botão só aparece quando as credenciais do Google estão configuradas, para que os previews da Vercel fiquem só com a demo.
- **Conta de demonstração:** cada clique em "Testar como demo" cria uma conta nova, isolada, que expira em 7 dias. São no máximo **5 contas demo por IP por dia**. Acima disso, a tela de entrada mostra uma mensagem fixa e sugere o Google. O perfil de exemplo da demo entra na change 3.
- **Sessão em JWT** num cookie `httpOnly`, `Secure` (em HTTPS) e `SameSite=Lax`, com validade de 30 dias e só o id e o tipo da conta dentro. Toda rota protegida confirma no banco que a conta existe e não expirou. Uma demo vencida deixa de valer no 7º dia, mesmo com o cookie ainda válido.
- **Sair** apaga o cookie e volta para `/entrar`. O chat ganha um **menu da conta** (e-mail ou "Conta de demonstração", e "Sair") e, na demo, a **faixa** "Conta de demonstração. Ela e as conversas são apagadas em 7 dias.", com o botão "Entrar com Google".
- **Tabela `accounts`** (migração nova, com RLS ligado e sem policies). O `rate_limits` aceita os buckets `demo_day` e `account_day`. O `account_day` é usado na change 3 e entra aqui para que a peça tenha uma migração a menos.
- **Limpeza diária:** apaga as contas demo vencidas e as contas Google sem acesso há 180 dias.
- **Logs** podem registrar o `accountId`, mas nunca o e-mail.
- **Dependência nova:** `next-auth@5.0.0-beta.32`, com a versão fixada sem `^`. A justificativa está abaixo e no ADR 0020.
- **Variáveis novas:** `AUTH_SECRET` (obrigatória), `AUTH_GOOGLE_ID` e `AUTH_GOOGLE_SECRET` (opcionais, mas uma não pode vir sem a outra).
- **Smoke:** acrescenta `POST /api/chat` sem cookie → `401` e `GET /entrar` → `200`. O fluxo de chat do smoke passa a entrar como demo antes de enviar as mensagens.
- **ADR 0020** "Login com Google e conta de demonstração isolada", que **substitui a ADR 0010**. A ADR 0010 passa a "Substituído por 0020".
- Documentação: `AGENTS.md`, `docs/architecture.md`, `docs/business.md`, `docs/development.md`, `docs/qa.md`, `README.md`, `DEPLOY.md`, `.env.example` e `docs/adr/README.md`.

### Por que uma dependência nova

O `AGENTS.md` proíbe dependências que a spec não prevê. O `next-auth` (Auth.js) entra porque:

- Implementar o OAuth do Google à mão (`state`, PKCE, troca do código, validação do `id_token`, rotação do cookie) é código de segurança que o projeto teria de manter e testar sozinho. A pessoa escolheu o Auth.js na proposta.
- Ele funciona **sem adapter de banco** e com sessão em JWT. As contas ficam na nossa tabela, acessada com SQL puro em `src/infra/db/` ([ADR 0005](../../../docs/adr/0005-driver-postgres-rls-sem-policies.md)), e o `supabase-js` continua proibido.
- A versão 5 é a feita para o App Router e aceita o Next 16 (`peerDependencies: next ^14 || ^15 || ^16`). Ela ainda sai com a etiqueta `beta`. Por isso fica **fixada em `5.0.0-beta.32`** (de 20/07/2026), sem `^`, e só o `src/infra/auth/` a importa, regra que o teste de arquitetura passa a cobrir. Assim, uma troca futura de biblioteca mexe numa pasta só.

## Fora do escopo

- Conversas ligadas à conta, lista de conversas, remoção do link de continuação e retenção das conversas `web` (change 2). Nesta change, quem está logado ainda abre qualquer conversa pelo UUID, como hoje.
- O perfil na conta, o plano em escolha fechada, o perfil da demo, "Editar perfil", "Excluir minha conta", a página de privacidade e o limite diário por conta (change 3).
- E-mail e senha, link mágico e outros provedores. Papéis (Dono, Gerente, Operador) e várias lojas por conta.
- Migrar as conversas de uma demo para a conta Google quando a pessoa entra com Google pela faixa da demo: a conta Google começa do zero.
- Identidade visual da Rango (peça 3). A interface nova usa o tema atual do shadcn.
- Mudanças no RAG, nos prompts, no eval e no CLI. `npm run chat` e `npm run eval` continuam sem login.

## Chamadas reais e checkpoints humanos

1. **Pessoa:** criar o cliente OAuth do Google (tipo "Aplicativo da Web") no Google Cloud, com os redirecionamentos `http://localhost:3000/api/auth/callback/google` e `https://<produção>/api/auth/callback/google`. Depois, colocar `AUTH_SECRET`, `AUTH_GOOGLE_ID` e `AUTH_GOOGLE_SECRET` no `.env.local` do checkout principal. O passo a passo vai para o `DEPLOY.md`.
2. **Orquestrador (autorização prévia do `CLAUDE.md`):** aplicar a migração no `dev` (Neon) com o `db push --remote="$U"` e fazer a verificação manual com `npm run dev` contra o `dev`: entrar como demo, mandar uma pergunta, sair, e checar o limite de 5 demos e o `401` sem cookie.
3. **Pessoa:** testar o login com Google em `localhost`, porque o consentimento do Google exige uma pessoa.
4. **Orquestrador (H5 parcial, autorizado):** aplicar a migração no `prod` com `db push --remote --yes`, **antes do merge**. A migração só acrescenta (tabela nova e o check do `rate_limits` mais amplo), então o código atual continua funcionando com ela.
5. **Pessoa:** na Vercel, criar `AUTH_SECRET` em Production e Preview, e `AUTH_GOOGLE_ID` e `AUTH_GOOGLE_SECRET` **só em Production**. Depois do merge, testar o login com Google em produção e rodar o smoke, ou autorizar o orquestrador a rodá-lo.

A change não roda `ingest` nem `eval`, porque não mexe no RAG. O `npm run chat` é rodado uma vez no `dev`, para confirmar que o CLI continua funcionando sem login.

## Capabilities

### New Capabilities

- `auth`: entrar com Google, conta de demonstração, limite de demos por IP, sessão em cookie, validação da conta no banco, sair, tela de entrada e expiração das contas.

### Modified Capabilities

- `chat-api`: login obrigatório nas rotas de conversa (`401`), logs com o `accountId` e limpeza diária das contas.
- `chat-ui`: a página do chat exige login, a sessão encerrada leva à tela de entrada, e entram o menu da conta e a faixa da demo.

## Impact

- **Código:** `src/infra/auth/` (novo), `src/infra/db/account-repository.ts` (novo), `src/core/accounts.ts` e `src/core/request-limits.ts` (novos), `src/app/entrar/`, `src/app/auth-actions.ts` e `src/app/api/auth/[...nextauth]/route.ts` (novos), e alterações em `src/core/types.ts`, `src/config.ts`, nos handlers e nas rotas da API, em `src/app/page.tsx`, em `src/components/chat/` e em `scripts/smoke*.ts`. A lista fechada de arquivos está no `design.md`.
- **API:** `401` nas rotas de conversa. A resposta do cron ganha `deletedAccounts`. As rotas novas `/api/auth/*` são do Auth.js.
- **Banco:** a tabela `accounts` e o check do `rate_limits.bucket` mais amplo.
- **Dependências:** `next-auth@5.0.0-beta.32`.
- **ADR:** 0020 (nova), que substitui a 0010.
