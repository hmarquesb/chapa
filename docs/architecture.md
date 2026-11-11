# Arquitetura

> Como o Chapa está montado. O domínio e o escopo estão em [`business.md`](business.md), os padrões de código em [`development.md`](development.md) e a verificação em [`qa.md`](qa.md). O comportamento esperado de cada capacidade fica nas specs vivas em [`openspec/specs/`](../openspec/config.yaml), e o porquê das decisões em [`adr/`](adr/README.md).

Assistente web para restaurantes que **já são parceiros** da Rango, uma empresa de delivery fictícia. Ele responde dúvidas operacionais com RAG sobre a base em `knowledge-base/`, cita as fontes e encaminha ao suporte quando não sabe a resposta. Cadastro de novos parceiros fica fora do escopo. É um projeto de estudo, não oficial.

O chat na web exige login: com Google ou numa conta de demonstração criada a cada clique ([ADR 0020](adr/0020-login-google-e-conta-demo.md)). O perfil do restaurante (plano, e opcionalmente nome, cozinha, estado, cidade e horário) fica na conta e é preenchido no primeiro acesso. O CLI e a avaliação não passam pelo login.

## Arquitetura do projeto

- Um projeto Next.js só, com front e API juntos, publicado na Vercel.
- A lógica do assistente fica em `src/core/` e não importa nada do Next. A API, o eval e a CLI chamam o mesmo `handleMessage`.
- O `core/` recebe o cliente de LLM e os repositórios por parâmetro. Os testes usam fakes e nunca acessam a rede.
- O perfil vem da conta na web: `createChatHandler` lê a conta a cada pedido e passa `accountProfile` ao assistente, que o usa só no prompt e nunca o grava na conversa. No CLI e no eval, o perfil vem de `--perfil <arquivo.json>` (o formato v2, validado pelo mesmo parser da API), com `--nome` e `--plano` por cima, e é guardado na conversa.
- Fluxo de uma mensagem: dono da conversa (a conta logada; o servidor gera o id da conversa nova) → guardrail de entrada → histórico + resumo da sessão → reescrita da pergunta → embedding → busca híbrida → geração → guardrail de saída → salvar.
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
- A página `/` tem o chat, as fontes em `Badge` embaixo de cada resposta, 3 perguntas de exemplo, o resumo do perfil com o link "Editar perfil" e um rodapé (`SiteFooter`) com o aviso de que a Rango é fictícia e o link "Privacidade".
- **Marca:** Rango é a marca (o logo "rango." no cabeçalho de todas as telas) e Chapa é o assistente (o `<h1>`, o avatar nas respostas e o indicador "Chapa está pensando…"). Os componentes de marca ficam em `src/components/brand/` (`RangoLogo`, `ChapaAvatar`, `ThinkingIndicator`, `SiteFooter`, `ThemeToggle`), e a geometria do ícone do Chapa, em `src/lib/chapa-icon.ts`.
- `/perfil` tem o formulário do perfil (o plano é um `RadioGroup` obrigatório; a cozinha é um combobox com busca e "Outro", e o local, um seletor de estado e um combobox de cidade; o horário é uma seção recolhível, "Horário de funcionamento · opcional", com um interruptor Aberto/Fechado por dia, até 2 turnos com seletores de hora de 30 em 30 minutos, "(dia seguinte)" nos turnos da madrugada e os atalhos "Copiar para os dias úteis" e "Copiar para todos os dias". As regras dos turnos rodam na tela e na API pela mesma função, `parseWeekHours` em `src/lib/profile/hours.ts`, e o prompt recebe a grade agrupada por `formatWeekHours`). Quando o perfil salvo precisa de revisão, o chat mostra uma faixa com o link para `/perfil`. Quem entra sem plano salvo é levado para lá antes do chat. `/privacidade` é pública e mostra o que a conta guarda, a retenção e como excluir a conta. O menu da conta tem "Editar perfil" e "Excluir minha conta".
- O id da conversa é gerado no servidor: o primeiro `POST /api/chat` vai sem `sessionId` e a resposta o devolve. O navegador o guarda só em memória, não no `localStorage` nem na URL. Recarregar a página abre uma conversa nova.
- A lista de conversas da conta (um painel lateral em telas pequenas) vem de `GET /api/sessions`, com o título cortado da primeira pergunta, e é atualizada depois de cada resposta. Clicar numa conversa carrega o histórico por `GET /api/sessions/[id]/messages`; apagar pede confirmação e usa `DELETE /api/sessions/[id]`.
- Botão "Nova conversa": limpa a tela e esquece o id, e o servidor gera outro no próximo chat.
- Datas com `Intl.DateTimeFormat`.
- Cores, fontes, raio, sombras e movimento são tokens em `src/app/globals.css`; `src/lib/palette.ts` espelha as cores em JS e o `palette.test.ts` mantém os dois iguais e confere o contraste ([ADR 0022](adr/0022-identidade-visual-sobre-tokens-do-shadcn.md)).
- O tema é a classe `dark` no `<html>`, escolhida entre Claro, Escuro e Sistema e guardada no `localStorage`. Um script no `<head>` (`THEME_INIT_SCRIPT`, em `src/lib/theme.ts`) a aplica antes da primeira pintura. O botão fica no menu da conta e em `/entrar`.

- `/marca` é pública (sem login) e é o guia visual da identidade: princípios, paleta com o contraste de cada par, tipografia, os componentes reais (`BrandShowcase`) e o logo. O texto dela fica em `src/lib/brand-guide.ts`, e as cores vêm de `PALETTE`.
- A imagem de compartilhamento (`src/app/opengraph-image.tsx` e `twitter-image.tsx`) e o `apple-icon.tsx` são rotas estáticas do `next/og`, geradas no build com as fontes de `assets/fonts/`. O favicon é o `src/app/icon.svg`. O `metadata` do `layout.tsx` define o título (`template`), a descrição e o Open Graph; o `metadataBase` não é fixado, e o Next usa o endereço da Vercel.
- `public/brand/` guarda os logos em SVG (claro, escuro e uma cor), o avatar do Chapa, a `og.png` e um `README.md`. Todos são gerados pelo `npm run brand:export` (menos a `og.png`) e commitados.

Streaming, idioma, marca e o que o navegador pode chamar seguem as regras do [`AGENTS.md`](../AGENTS.md).

## Back-end

Stack:
- TypeScript
- Next.js Route Handlers no runtime Node.js
- SDK `@google/genai` para chat e embeddings com o Gemini
- `node:crypto` para UUID e para o HMAC do IP no rate limit

Rotas:
- `POST /api/chat`
- `GET /api/profile` (devolve `{ profile, needsReview }`) e `PUT /api/profile`, o perfil da conta no formato v2 (o `PUT` exige o plano)
- `DELETE /api/account`, que exclui a conta logada e as conversas dela (`204`)
- `GET /api/sessions`, com as conversas da conta, da mais recente para a mais antiga
- `GET /api/sessions/[id]/messages`
- `DELETE /api/sessions/[id]`
- `GET /api/health`
- `GET /api/cron/cleanup`, protegida por `CRON_SECRET`
- `GET|POST /api/auth/*`, do Auth.js (csrf, callbacks do Google e da demo, sessão, saída)

O `PUT /api/profile` passa o nome e a cozinha pelo filtro local de termos (`checkProfileText`, em `src/lib/moderation/`, o mesmo do formulário, do assistente e do CLI): o texto recusado devolve `400` com `{ error, field }`, e o log guarda só o motivo ([ADR 0023](adr/0023-filtro-local-de-termos-no-perfil.md)). O corpo é validado por `parseProfileInput` (`src/lib/profile/`), o mesmo parser do CLI e do eval, e erros de forma, de cozinha e de local também trazem `field` ([ADR 0024](adr/0024-perfil-estruturado-e-municipios-do-ibge.md)).

As rotas de chat e de conversas exigem sessão (`401` sem ela, antes de ler o corpo e de contar o rate limit). `GET /api/health` e o cron não exigem. Toda consulta de conversa filtra pela conta logada, e a conversa alheia responde `404`, como a inexistente ([ADR 0021](adr/0021-autorizacao-por-conta-no-repositorio.md)).

O rate limit por IP fica no Postgres, com o HMAC do IP. As regras de IA e RAG, de logs, de camadas e de `server-only` estão no [`AGENTS.md`](../AGENTS.md).

Scripts locais (rodam com `tsx`, fora da Vercel): `ingest`, `chat`, `eval` e `smoke`.

## Banco de dados

Supabase: PostgreSQL com `pgvector` e busca textual com o dicionário `portuguese`.

- Tabelas: `accounts` (tipo `google` ou `demo`, `google_sub`, e-mail, `profile` (JSON com `version: 2`; a cidade é só o código IBGE, e o nome vem da lista), `last_seen_at`, `expires_at`), `sessions` (perfil só nas conversas do CLI e do eval, resumo, canal e `account_id`, que uma restrição do banco exige na web e proíbe no CLI e no eval), `messages`, `document_chunks` e `rate_limits` (buckets `minute`, `day`, `demo_day` e `account_day`). O `account_day` limita as mensagens por conta e por dia, com o limite de cada tipo de conta em `src/config.ts`.
- O `profile` salvo no formato antigo não é migrado no banco: `upgradeProfile` o converte a cada leitura (nas contas e nas conversas) e marca `needsReview` quando algo não tem conversão segura. O dado só é reescrito quando a pessoa salva o perfil.
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
- **Vercel Cron** diário em `/api/cron/cleanup`: apaga as conversas web sem atividade há mais de 30 dias (e as web sem conta) e as do CLI e do eval após 7 dias, limpa `rate_limits` e apaga as contas demo vencidas e as contas Google sem acesso há 180 dias.
- **Manual, de propósito:** ingestão, rodadas de eval, migrações e o merge dos PRs na `main`.

O passo a passo do deploy está no [`DEPLOY.md`](../DEPLOY.md).
