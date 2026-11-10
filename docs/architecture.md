# Arquitetura

> Como o Chapa está montado. O domínio e o escopo estão em [`business.md`](business.md), os padrões de código em [`development.md`](development.md) e a verificação em [`qa.md`](qa.md). O comportamento esperado de cada capacidade fica nas specs vivas em [`openspec/specs/`](../openspec/config.yaml), e o porquê das decisões em [`adr/`](adr/README.md).

Assistente web para restaurantes que **já são parceiros** de um app de delivery. Ele responde dúvidas operacionais com RAG sobre a base em `knowledge-base/`, cita as fontes e encaminha ao suporte quando não sabe a resposta. Cadastro de novos parceiros fica fora do escopo. É um projeto de estudo, não oficial.

Não tem login. Cada navegador tem a própria sessão anônima, e o perfil do restaurante (nome, plano, cozinha, cidade, horário) vem de um formulário, no lugar dos dados que viriam de uma conta logada.

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
├── infra/          cliente de LLM e repositórios Postgres
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

`components/` nunca importa `core/` nem `infra/`.

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
- Sem streaming. A resposta só aparece depois do guardrail de saída.
- Datas com `Intl.DateTimeFormat`, sem date-fns.
- Todo texto em PT-BR. Sem logo, nome ou cores de empresas reais.
- O navegador só fala com a nossa API, nunca com o provedor de LLM nem com o Supabase.

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

Regras:
- Nomes de modelo e parâmetros do RAG ficam só em `src/config.ts`.
- Toda chamada de chat ou embedding passa por `src/infra/llm/`, que aplica retry e conta tokens. Nenhum outro módulo importa o SDK.
- O guardrail de entrada bloqueia padrões (CPF, cartão, "minha senha é", pedido de senha), não palavras soltas. "O repasse cai via Pix?" tem que passar.
- Rate limit por IP no Postgres, guardando o HMAC do IP. Corpo máximo de 4 KB.
- Logue status, latência e tokens. Nunca logue o conteúdo das mensagens.
- `core/` e `infra/` importam `server-only`.

Scripts locais (rodam com `tsx`, fora da Vercel): `ingest`, `chat`, `eval` e `smoke`.

## Banco de dados

Supabase: PostgreSQL com `pgvector` e busca textual com o dicionário `portuguese`.

- Tabelas: `sessions` (perfil, resumo, canal), `messages`, `document_chunks` e `rate_limits`.
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

Variáveis: `GEMINI_API_KEY`, `DATABASE_URL`, `IP_HASH_SECRET`, `CRON_SECRET` e `*_MODEL` (opcionais). Nenhuma variável secreta usa o prefixo `NEXT_PUBLIC_`.

## Automação

- **GitHub Actions** em todo push e PR: `lint`, `typecheck`, `test` e `build`. Sem chamadas de API nem de banco.
- **Vercel:** um deploy de preview por PR e produção na `main`.
- **Vercel Cron** diário em `/api/cron/cleanup`: apaga sessões sem atividade há mais de 7 dias e limpa `rate_limits`.
- **Manual, de propósito:** ingestão, rodadas de eval, migrações e o merge dos PRs na `main`.

O passo a passo do deploy está no [`DEPLOY.md`](../DEPLOY.md).
