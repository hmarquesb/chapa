# Arquitetura

Assistente web para restaurantes que **já são parceiros** de um app de delivery. Ele responde dúvidas operacionais com RAG sobre a base em `knowledge-base/`, cita as fontes e encaminha ao suporte quando não sabe a resposta. Cadastro de novos parceiros fica fora do escopo. É um projeto de estudo, não oficial.

Não tem login. Cada navegador tem a própria sessão anônima, e o perfil do restaurante (nome, plano, cozinha, cidade, horário) vem de um formulário, no lugar dos dados que viriam de uma conta logada.

## Arquitetura do projeto

- Um projeto Next.js só, com front e API juntos, publicado na Vercel.
- A lógica do assistente fica em `src/core/` e não importa nada do Next. A API, o eval e a CLI chamam o mesmo `handleMessage`.
- O `core/` recebe o cliente de LLM e os repositórios por parâmetro. Os testes usam fakes e nunca acessam a rede.
- Fluxo de uma mensagem: guardrail de entrada → histórico + resumo da sessão → reescrita da pergunta → embedding → busca híbrida → geração → guardrail de saída → salvar.
- Se nenhum trecho passar do `minScore`, responda com a mensagem de fallback e não chame o LLM.
- Salve só a pergunta original e a resposta final. Os trechos recuperados nunca vão para o banco.

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
docs/adr/           decisões de arquitetura
specs/
```

`components/` nunca importa `core/` nem `infra/`.

## Front-end

Vamos utilizar:
- TypeScript
- Next.js (App Router)
- React
- Tailwind CSS
- shadcn/ui
- Biome

Regras:
- Uma página só, com o chat, as fontes em `Badge` embaixo de cada resposta, 3 perguntas de exemplo, o formulário de perfil do restaurante e um rodapé com o aviso de projeto não oficial.
- Gere o `sessionId` com `crypto.randomUUID()` e salve no `localStorage`. Ao recarregar a página, busque o histórico na API.
- Botão "Continuar depois": mostra e copia o link `/?sessao=<sessionId>`. Ao abrir a página com `?sessao=`, adote esse id no `localStorage`, carregue o histórico e limpe o parâmetro da URL. Se a sessão não existir mais, avise e comece uma conversa nova.
- Botão "Nova conversa": gera outro `sessionId` e limpa a tela.
- Sem streaming. A resposta só aparece depois do guardrail de saída.
- Formate datas com `Intl.DateTimeFormat`. Não instale date-fns.
- Todo texto em PT-BR. Sem logo, nome ou cores de empresas reais.
- O navegador só fala com a nossa API, nunca com o provedor de LLM nem com o Supabase.

## Back-end

Vamos utilizar:
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
- Ordene as mensagens por `id`, não por `created_at`.
- Acesse o banco com o driver `postgres` pelo pooler do Supabase (modo transação, sem prepared statements). Não use `supabase-js` nem a chave `anon`.
- Ligue o RLS em todas as tabelas, sem nenhuma policy.
- O schema fica em `supabase/migrations/` e é aplicado com a Supabase CLI.

## Infraestrutura

- **Vercel:** hospeda o front e a API, na região `gru1`.
- **Supabase:** dois projetos, `dev` e `prod`, na região `sa-east-1`. Local e preview usam o `dev`.
- **Gemini (Google AI Studio, sem cartão):** único provedor, para chat e embeddings.

Variáveis: `GEMINI_API_KEY`, `DATABASE_URL`, `IP_HASH_SECRET`, `CRON_SECRET` e `*_MODEL` (opcionais). Nenhuma variável secreta usa o prefixo `NEXT_PUBLIC_`.

## Automação

- **GitHub Actions** em todo push e PR: `lint`, `typecheck`, `test` e `build`. Sem chamadas de API nem de banco.
- **Vercel:** um deploy de preview por PR e produção na `main`.
- **Vercel Cron** diário em `/api/cron/cleanup`: apaga sessões sem atividade há mais de 7 dias e limpa `rate_limits`.
- **Manual, de propósito:** ingestão, rodadas de eval, migrações e o merge dos PRs na `main`.
