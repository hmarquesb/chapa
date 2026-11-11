# Arquitetura

> Como o Chapa está montado. O domínio e o escopo estão em [`business.md`](business.md), os padrões de código em [`development.md`](development.md) e a verificação em [`qa.md`](qa.md). O comportamento esperado de cada capacidade fica nas specs vivas em [`openspec/specs/`](../openspec/config.yaml), e o porquê das decisões em [`adr/`](adr/README.md).

Assistente web para restaurantes que **já são parceiros** da Rango, uma empresa de delivery fictícia. Ele responde dúvidas operacionais com RAG sobre a base em `knowledge-base/`, cita as fontes e encaminha ao suporte quando não sabe a resposta. Cadastro de novos parceiros fica fora do escopo. É um projeto de estudo, não oficial.

O chat na web exige login: com Google ou numa conta de demonstração criada a cada clique ([ADR 0020](adr/0020-login-google-e-conta-demo.md)). O perfil do restaurante (nome, plano, cozinha, cidade, horário) ainda vem de um formulário. O CLI e a avaliação não passam pelo login.

## Arquitetura do projeto

- Um projeto Next.js só, com front e API juntos, publicado na Vercel.
- A lógica do assistente fica em `src/core/` e não importa nada do Next. A API, o eval e a CLI chamam o mesmo `handleMessage`.
- O `core/` recebe o cliente de LLM e os repositórios por parâmetro. Os testes usam fakes e nunca acessam a rede.
- Fluxo de uma mensagem: guardrail de entrada → histórico + resumo da sessão → reescrita da pergunta → embedding → busca híbrida → geração → guardrail de saída → salvar.
- Se nenhum trecho passa do `minScore`, a resposta é a mensagem de fallback, sem chamar o LLM.
- Só a pergunta original e a resposta final são salvas. Os trechos recuperados nunca vão para o banco.

```
src/
├── app/            páginas e Route Handlers
├── components/     ui/ (shadcn) e chat/
├── core/           assistente, RAG, memória, guardrails, prompts
├── infra/          cliente de LLM, repositórios Postgres e auth/ (Auth.js)
├── lib/            utilitários e tipos usados pelo cliente
└── config.ts       modelos e parâmetros do RAG
scripts/            ingest.ts, chat.ts, eval.ts, smoke.ts
knowledge-base/     base de conhecimento em .md
eval/               perguntas.json e resultados/
supabase/migrations/
docs/               arquitetura, negócio, desenvolvimento, QA e adr/ (decisões)
└── history/        specs da construção inicial em build-specs/ (histórico)
openspec/           specs vivas (specs/) e mudanças (changes/) do OpenSpec
```

`components/` nunca importa `core/` nem `infra/`. Só `src/infra/auth/` importa o `next-auth`; as páginas e as Server Actions de `src/app/` usam `@/infra/auth`.

## Autenticação

- **Entrada:** `/entrar` mostra "Testar como demo" e, quando as duas credenciais do Google estão configuradas, "Entrar com Google". Os botões chamam as Server Actions de `src/app/auth-actions.ts`, que chamam o `signIn` do Auth.js v5 (`next-auth@5.0.0-beta.32`, JWT, sem adapter).
- **Demo:** o provedor `Credentials` (`id: "demo"`) chama `createDemoAccount` (`src/core/accounts.ts`), que conta a tentativa no bucket `demo_day` do `rate_limits` (HMAC do IP, dia UTC) e cria a conta só até a 5ª do dia. A conta expira em 7 dias.
- **Google:** no primeiro login, cria a conta com o `sub` e o e-mail verificado; nos seguintes, encontra a conta pelo `sub` e atualiza o e-mail e o `last_seen_at`. Nome e foto não são guardados.
- **Cookie:** `authjs.session-token` (com o prefixo `__Secure-` em HTTPS), `HttpOnly`, `SameSite=Lax`, válido por 30 dias, com só o id e o tipo da conta.
- **Cada pedido protegido:** `getAuthenticatedAccount()` (`src/infra/auth/index.ts`) lê o cookie com `auth()` e confirma no banco (`accounts.findActive`) que a conta existe e não venceu. A página `/` leva a `/entrar` sem conta; as rotas de conversa respondem `401`, e a interface vai para `/entrar`.
- **Sair:** o `signOut` apaga o cookie e leva a `/entrar`.

## Front-end

Stack:
- TypeScript
- Next.js (App Router)
- React
- Tailwind CSS
- shadcn/ui
- Biome

Regras:
- Uma página só, com o chat, as fontes em `Badge` embaixo de cada resposta, 3 perguntas de exemplo, o formulário de perfil do restaurante e um rodapé com o aviso de projeto não oficial.
- O `sessionId` é gerado com `crypto.randomUUID()` e salvo no `localStorage`. Ao recarregar a página, o histórico vem da API.
- Botão "Continuar depois": mostra e copia o link `/?sessao=<sessionId>`. Ao abrir a página com `?sessao=`, a página adota esse id no `localStorage`, carrega o histórico e limpa o parâmetro da URL. Se a sessão não existe mais, avisa e começa uma conversa nova.
- Botão "Nova conversa": gera outro `sessionId` e limpa a tela.
- Datas com `Intl.DateTimeFormat`.

Streaming, idioma, marca e o que o navegador pode chamar seguem as regras do [`AGENTS.md`](../AGENTS.md).

## Back-end

Stack:
- TypeScript
- Next.js Route Handlers no runtime Node.js
- SDK `@google/genai` para chat e embeddings com o Gemini
- `node:crypto` para UUID e para o HMAC do IP no rate limit

Rotas:
- `POST /api/chat`
- `GET /api/sessions/[id]/messages`
- `GET /api/health`
- `GET /api/cron/cleanup`, protegida por `CRON_SECRET`
- `GET|POST /api/auth/*`, do Auth.js (csrf, callbacks do Google e da demo, sessão, saída)

`POST /api/chat` e `GET /api/sessions/[id]/messages` exigem sessão (`401` sem ela, antes de ler o corpo e de contar o rate limit). `GET /api/health` e o cron não exigem.

O rate limit por IP fica no Postgres, com o HMAC do IP. As regras de IA e RAG, de logs, de camadas e de `server-only` estão no [`AGENTS.md`](../AGENTS.md).

Scripts locais (rodam com `tsx`, fora da Vercel): `ingest`, `chat`, `eval` e `smoke`.

## Banco de dados

Supabase: PostgreSQL com `pgvector` e busca textual com o dicionário `portuguese`.

- Tabelas: `accounts` (tipo `google` ou `demo`, `google_sub`, e-mail, `last_seen_at`, `expires_at`), `sessions` (perfil, resumo, canal), `messages`, `document_chunks` e `rate_limits` (buckets `minute`, `day`, `demo_day` e `account_day`).
- `document_chunks` tem `embedding_model` e `chunk_config`, e toda busca filtra pelos dois. Nunca compare vetores de modelos ou de fatiamentos diferentes.
- Busca híbrida: o SQL devolve `semantic` e `keyword` por trecho, e uma função pura em TS combina os dois com `alpha`, filtra por `minScore` e corta em `topK`.
- As mensagens são ordenadas por `id`, não por `created_at`.
- O banco é acessado com o driver `postgres` pelo pooler em modo transação (Supabase no `prod`, Neon no `dev`), sem prepared statements, sem `supabase-js` e sem a chave `anon`.
- RLS ligado em todas as tabelas, sem nenhuma policy.
- O schema fica em `supabase/migrations/` e é aplicado com a Supabase CLI. No `dev`, a migração roda depois do `supabase/dev-bootstrap.sql`.

## Infraestrutura

- **Vercel:** hospeda o front e a API, na região `gru1`.
- **Supabase:** só o `prod`, em `sa-east-1`.
- **Neon:** o `dev`, usado no local e no preview, em `aws-sa-east-1` ([ADR 0017](adr/0017-neon-como-banco-dev.md)).
- **Gemini (Google AI Studio, sem cartão):** único provedor, para chat e embeddings.

As variáveis de ambiente estão no [`.env.example`](../.env.example), e os valores de cada ambiente, no [`DEPLOY.md`](../DEPLOY.md).

## Automação

- **GitHub Actions** em todo push e PR: `lint`, `typecheck`, `test` e `build`. Sem chamadas de API nem de banco.
- **Vercel:** um deploy de preview por PR e produção na `main`.
- **Vercel Cron** diário em `/api/cron/cleanup`: apaga sessões sem atividade há mais de 7 dias, limpa `rate_limits` e apaga as contas demo vencidas e as contas Google sem acesso há 180 dias.
- **Manual, de propósito:** ingestão, rodadas de eval, migrações e o merge dos PRs na `main`.

O passo a passo do deploy está no [`DEPLOY.md`](../DEPLOY.md).
