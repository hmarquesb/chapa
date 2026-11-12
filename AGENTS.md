# AGENTS.md — Chapa

Instruções para qualquer agente de código (Claude Code, Codex, Cursor, subagentes) que trabalhe neste repositório.

## O que é o projeto

Assistente web para restaurantes que **já são parceiros** da Rango, uma empresa de delivery fictícia. O chat na web exige login (Google ou uma conta demo por clique, [ADR 0020](docs/adr/0020-login-google-e-conta-demo.md)). Ele responde dúvidas operacionais (taxas e planos, repasse, cancelamentos, cardápio, horários, avaliações, embalagem) com **RAG híbrido** sobre a base em `knowledge-base/`, cita as fontes, guarda a memória por sessão e recusa o que está fora do escopo ou é sensível. Cadastro de novos restaurantes fica fora do escopo.

- Documentação do projeto, em [`docs/`](docs/):

  | Documento | O que cobre | Quando ler |
  |---|---|---|
  | [`architecture.md`](docs/architecture.md) | Stack, fluxo de uma mensagem, rotas, banco e infraestrutura | Ao mudar o fluxo da mensagem, uma rota, o banco ou a infraestrutura |
  | [`business.md`](docs/business.md) | Público, conceitos, temas cobertos, fora do escopo e metas | Ao propor ou avaliar uma mudança de produto |
  | [`development.md`](docs/development.md) | Princípios, testes, front-end e scripts | Ao criar um módulo, um teste novo ou um componente |
  | [`qa.md`](docs/qa.md) | Portões, verificação manual, avaliação e smoke | Antes de declarar uma mudança pronta |
  | [`DEPLOY.md`](DEPLOY.md) | Vercel, comandos de banco (`dev` e `prod`), cliente OAuth e limites dos planos | Ao mudar variável, migração ou passo de deploy |
  | [`.env.example`](.env.example) | A lista de variáveis de ambiente, com comentários | Ao criar ou remover uma variável |
  | [`README.md`](README.md) | Vitrine do projeto: resultados do eval, decisões e aprendizados | Só quando a mudança altera o que ele descreve |

  Para um ajuste localizado, este arquivo e a tabela "Onde mexer" bastam: não abra os outros documentos sem necessidade.

  **Cada assunto tem um documento dono**, o da tabela acima. Os outros apontam para ele em vez de repetir o fato. Nomes de modelo e parâmetros (RAG, limites, prazos) ficam em `src/config.ts`. Fora do README, cite um número só no documento dono do assunto, e não conte passos ou itens que mudam (escreva "todos os passos com ✅", não "10 ✅").

- Decisões e seus porquês: [`docs/adr/`](docs/adr/README.md). Uma decisão de arquitetura nova vira um ADR novo; um ADR aceito não é reescrito, e sim substituído por outro (`Substituído por`). Os ADRs são escritos em português.
- Comportamento atual e mudanças novas: [`openspec/`](openspec/config.yaml), pelo OpenSpec. Leia só a spec da capacidade que a tarefa toca (`openspec/specs/<capacidade>/spec.md`).
- Specs da construção inicial (S00 a S10, todas concluídas): [`docs/history/build-specs/`](docs/history/build-specs/README.md), movidas para lá pelo [ADR 0016](docs/adr/0016-specs-da-construcao-em-docs-history.md). São histórico: não leia nem edite, a menos que a tarefa peça.

É um projeto de estudo, **não oficial** e sem afiliação com nenhuma empresa de delivery.

## Stack

- **Next.js (App Router) + React + TypeScript**, num projeto só, com front e API. Deploy na **Vercel** (região `gru1`).
- **Tailwind CSS + shadcn/ui** na interface. **Biome** para lint e formatação.
- **Supabase (Postgres + pgvector + busca textual em português)**, acessado pelo driver `postgres` no pooler em modo transação. `prod` no Supabase; `dev` num Postgres do Neon ([ADR 0017](docs/adr/0017-neon-como-banco-dev.md)).
- **Gemini** pelo SDK `@google/genai`, para chat e embeddings. Único provedor.
- **Auth.js v5** (`next-auth@5.0.0-beta.32`, versão fixada) para o login com Google e a conta demo, com sessão em JWT e sem adapter. As contas ficam na tabela `accounts`, com SQL puro.
- **Vitest** para testes e **tsx** para os scripts locais (`ingest`, `chat`, `eval`, `smoke`).
- Node 24.

## Comandos

```bash
npm install
npm run dev              # http://localhost:3000 (pede AUTH_SECRET; sem AUTH_GOOGLE_*, só a demo)
npm run build
npm run lint             # biome check .
npm run format           # biome check --write .
npm run typecheck        # tsc --noEmit
npm test                 # vitest run, sem rede, sem banco e sem chave
npm run ingest           # ⚠️ chama a API de embeddings e grava no banco (padrão: preset padrao)
npm run chat -- --nome "Pizzaria Bella" --debug        # ⚠️ chama a API
npm run eval -- --label v2 --preset padrao             # ⚠️ chama a API (60 a 90 chamadas)
npm run brand:export                                  # gera public/brand/ e src/app/icon.svg (sem rede nem banco); commite o resultado
npm run screenshots -- --url http://localhost:3000   # ⚠️ usa o `dev` e cria 1 conta demo (precisa de `npx playwright install chromium`)
npm run smoke -- --url https://<deploy>                # ⚠️ chama a demo publicada e cria 1 conta demo (5 por IP por dia)
npm run authz-check                                    # ⚠️ grava no banco `dev` (Neon): verifica o dono das conversas
npm run db -- db push --remote   # Supabase CLI, no `prod` (único projeto linkado, só no checkpoint)
# dev (Neon): bootstrap e db push sempre com --remote="$U" num subshell; comandos no DEPLOY.md, "Banco `dev` no Neon"
npm run spec -- list             # OpenSpec CLI: list, show, validate, status, archive
npm run changes          # changes ativas do OpenSpec em todos os worktrees (o `spec -- list` só vê o checkout atual)
```

As variáveis ficam em `.env.local`, e o `.env.example` lista todas: `GEMINI_API_KEY`, `DATABASE_URL`, `IP_HASH_SECRET`, `CRON_SECRET`, `AUTH_SECRET` e as opcionais `AUTH_GOOGLE_ID` e `AUTH_GOOGLE_SECRET` (sempre juntas). Os scripts locais usam `--env-file-if-exists=.env.local`, que não sobrescreve variáveis já definidas no shell.

## Onde mexer

| Mudança | Arquivos | Cuidados |
|---|---|---|
| Fluxo de uma mensagem (`handleMessage`) | `src/core/assistant.ts` | API, CLI e eval chamam a mesma função: a mudança vale nos três |
| Busca, ranking, chunking, ingestão | `src/core/rag/` (`retrieve`, `rank`, `chunking`, `ingest`) e `scripts/ingest.ts` | Mudou o chunking: reingerir |
| Parâmetro do RAG (`minScore`, `topK`, `alpha`, chunking) | `src/config.ts` (`RAG_PRESETS`) | Mudou qualquer parâmetro: rodar a avaliação ([`qa.md`](docs/qa.md#avaliação)) |
| Modelo de chat ou de embedding | `src/config.ts` | Modelo de embedding novo exige reingerir. Decisão de modelo vira ADR |
| Chamada ao Gemini (retry, tokens) | `src/infra/llm/` (`gemini-client.ts`, `retry.ts`) | Único lugar que importa `@google/genai` |
| Consulta ao banco | `src/infra/db/` (`*-repository.ts`, `mappers.ts`) | Toda busca filtra por `embedding_model` e `chunk_config` |
| Ligação das portas às implementações | `src/infra/container.ts` | — |
| Texto fixo (fallback, bloqueio, avisos) | `src/core/messages.ts` | Nunca duplique o texto em outro arquivo |
| Prompt de sistema ou do RAG | `src/core/prompts.ts` | O fallback no prompt vem de `FALLBACK_MESSAGE`. Rodar a avaliação |
| Guardrail de entrada ou de saída | `src/core/guardrails.ts`, `src/core/messages.ts` | Bloqueie padrões, nunca palavras soltas. "O repasse cai via Pix?" tem que passar: acrescente o caso nos testes |
| Cumprimento e roteador de conversa | `src/core/router/`, `src/core/messages.ts`, `src/core/prompts.ts` (`CONVERSATION_PROMPT`) | A regra só reconhece a mensagem inteira; acrescente o caso que deve seguir para o RAG nos testes. Mudou o prompt do roteador: rode a avaliação e confira o falso small talk |
| Memória, resumo ou reescrita | `src/core/memory.ts`, `src/core/rewrite-query.ts` | O contexto do RAG não vai para `messages` |
| Login e sessão | `src/infra/auth/` (`config.ts`, `callbacks.ts`, `env.ts`, `index.ts`), `src/app/auth-actions.ts`, `src/app/entrar/`, `src/core/accounts.ts`, `src/infra/db/account-repository.ts` | Só `src/infra/auth/` importa `next-auth`. Toda rota protegida confirma a conta no banco (`getAuthenticatedAccount`). Limites em `src/config.ts` (`accounts`) |
| Conversas da conta | `src/core/conversations.ts`, `src/infra/db/session-repository.ts`, `src/app/api/sessions/`, `src/components/chat/conversation-list.tsx` | Toda porta de conversa recebe o dono (`SessionOwner`): nunca escreva uma consulta sem dono ([ADR 0021](docs/adr/0021-autorizacao-por-conta-no-repositorio.md)). Mudou uma consulta: rode `npm run authz-check` |
| Rota de API | `src/app/api/<rota>/route.ts` e o handler em `src/app/api/_lib/handlers.ts` | O `route.ts` só liga o handler ao container. A lógica fica no handler, testado com fakes |
| Validação, rate limit, logs da API | `src/app/api/_lib/` (`validate.ts`, `rate-limit.ts`, `log.ts`) | Corpo máximo de 4 KB. Mensagens de erro em PT-BR |
| Filtro de texto do perfil | `src/lib/moderation/` (`profile-text.ts`, `normalize.ts`, `blocked-terms.ts`, `allowed-terms.ts`), `src/app/api/_lib/validate.ts`, `src/core/assistant.ts`, `scripts/chat.ts`, `src/components/chat/profile-form.tsx` | Uma função só (`checkProfileText`) decide, e os quatro pontos a chamam ([ADR 0023](docs/adr/0023-filtro-local-de-termos-no-perfil.md)). Termo novo vai codificado na lista; falso positivo vai em `allowed-terms.ts`. Nunca logue o texto recusado |
| Campo novo no perfil | `src/lib/profile/` (`types`, `parse`, `upgrade`, `hours`, listas), `src/lib/types.ts` (`PROFILE_FIELDS`, `PLAN_IDS`), `src/lib/plans.ts`, `src/app/api/_lib/validate.ts`, `src/core/prompts.ts`, `src/components/chat/profile-form.tsx`, `src/components/chat/hours-editor.tsx` | O perfil é dado do usuário: não logue. As regras da grade de horário e o texto do prompt vivem em `hours.ts` (funções puras, usadas pela tela, pelo parser e pelo prompt). O plano é uma escolha fechada e o nome oficial vem do `regras.yaml` (`src/lib/plans.test.ts` confere). Mudou o formato: suba o `version` e faça o `upgradeProfile` converter o antigo ([ADR 0024](docs/adr/0024-perfil-estruturado-e-municipios-do-ibge.md)) |
| Cores, fontes, raio, sombra, movimento e tema | `src/app/globals.css`, `src/lib/palette.ts`, `src/lib/theme.ts` | Mudou um tom: o mesmo valor nos dois arquivos; `npm test` diz se passa no AA. Sem cor fixa em componentes. Mudou um tom: rode `npm run brand:export` e commite `public/brand/` e `src/app/icon.svg` |
| Interface | `src/components/chat/` (entrada em `chat-app.tsx`), `src/components/brand/`, `src/app/page.tsx`, `src/lib/` (`chat-state`, `api-client`, `format`) | Componentes só importam `src/lib/` |
| Schema do banco | Nova migração em `supabase/migrations/` (`npm run db -- migration new <nome>`) | Nunca edite uma migração já aplicada. RLS ligado e sem policies. Aplicar no banco é checkpoint humano |
| Base de conhecimento | `knowledge-base/NN-*.md` e `knowledge-base/regras.yaml` | Número novo entra primeiro no `regras.yaml`; rode `npm test`. Depois do merge, reingerir no `dev` e no `prod` |
| Avaliação | `scripts/eval.ts`, `scripts/eval/`, `eval/perguntas.json` | Ids estáveis: não renumere as perguntas existentes |

## Camadas e importações

| Pasta | Pode importar | Não pode importar |
|---|---|---|
| `src/components/`, `src/lib/` | `src/lib/`, React, shadcn | `src/core/`, `src/infra/`, `@google/genai`, `postgres` |
| `src/core/` | `src/core/`, `src/lib/types`, funções puras de `src/lib/` (`plans`, `moderation`), `src/config` | `src/infra/`, `next`, `@google/genai`, `postgres` |
| `src/infra/llm/` | `@google/genai`, `src/core/` (tipos e erros), `src/config` | `postgres` |
| `src/infra/db/` | `postgres`, `src/core/` (tipos), `src/lib/types` | `@google/genai` |
| `src/infra/auth/` | `next-auth`, `src/core/`, `src/infra/` (container, env), `src/lib/`, `src/config` | `@google/genai`, `postgres` |
| `src/app/` (páginas e Server Actions) | `src/infra/auth`, `src/components/`, `src/lib/` | `next-auth` e `@auth/*` direto |
| `src/app/api/` | `src/infra/container`, `src/infra/auth`, `src/core/` (tipos e erros), `src/lib/` | SDKs direto, `next-auth` |
| `scripts/` | `src/core/`, `src/infra/`, `src/config` | — |

- `src/core/` define as portas (`LlmClient`, `ChunkRepository`, `SessionRepository`, `RateLimitRepository`) e recebe as implementações por parâmetro. Os testes passam fakes.
- Todo arquivo de `src/core/` e `src/infra/` (exceto testes) começa com `import "server-only"`. Por isso os scripts rodam com `--conditions=react-server`, e o Vitest troca o pacote por um stub.
- O teste `src/architecture.test.ts` falha se alguma dessas regras for quebrada.

## Convenções de código

- Identificadores em inglês. **Todo texto que o usuário final lê fica em PT-BR.**
- Arquivos em `kebab-case`. Imports com o alias `@/`.
- Funções puras sempre que der, porque são fáceis de testar. Toda função com lógica não trivial ganha um `*.test.ts` ao lado.
- TypeScript estrito (`strict` e `noUncheckedIndexedAccess`). Sem `any` sem justificativa num comentário.
- Route Handlers exportam `runtime = "nodejs"` e `dynamic = "force-dynamic"`.
- Componentes React só levam `"use client"` quando precisam de estado, eventos ou APIs do navegador.
- Não reformate arquivos que você não precisa mudar.
- **Não adicione dependências** que a spec não prevê. Se uma for mesmo necessária, pare e reporte. Em especial: nada de `supabase-js`, `openai`, `zod`, `date-fns`, frameworks de agente ou bibliotecas de markdown.

## Regras de IA e RAG (não negociáveis)

1. **Nenhum nome de modelo nem parâmetro de RAG escrito fora de `src/config.ts`.**
2. **Toda chamada de chat ou embedding passa por `src/infra/llm/`**, que aplica retry e devolve o uso de tokens por chamada. Nenhum outro módulo importa `@google/genai`.
3. **Toda busca filtra por `embedding_model` e `chunk_config`.** Vetores de modelos ou de chunkings diferentes nunca se comparam.
4. **O contexto do RAG é efêmero.** Só a pergunta original, a resposta final, o status e os nomes de arquivo das fontes vão para `messages`. Nunca os trechos nem o prompt.
5. A mensagem de fallback é a constante `FALLBACK_MESSAGE` de `src/core/messages.ts`. Não duplique o texto.
6. Se nenhum trecho passar do `minScore`, o assistente responde com o fallback **sem chamar o LLM de resposta**.
7. O guardrail de entrada bloqueia **padrões** (CPF, cartão, "minha senha é", pedido de senha), nunca palavras soltas. "O repasse cai via Pix?" tem que passar.
8. Sem streaming: a resposta só sai depois do guardrail de saída.
9. Sem estado em memória entre requisições. Histórico e resumo vêm do banco a cada mensagem.

## Segurança e privacidade

- **Nunca leia, imprima nem copie** `../api-key.md`, `.env` ou `.env.*` (exceto `.env.example`). As chaves vêm só de `process.env`.
- Nunca escreva chaves em código, logs, testes ou commits. Nenhuma variável secreta usa o prefixo `NEXT_PUBLIC_`.
- O navegador só fala com a nossa API, nunca com o Gemini nem com o Supabase.
- No servidor, **não registre** o conteúdo das mensagens, o perfil, o `sessionId`, o IP nem o e-mail da conta. Logar status, latência, tokens, o `accountId` e o nome do erro é permitido.
- O IP só é guardado como HMAC (`IP_HASH_SECRET`). O RLS fica ligado em todas as tabelas, sem nenhuma policy.
- Toda consulta de conversa filtra pelo dono ([ADR 0021](docs/adr/0021-autorizacao-por-conta-no-repositorio.md)): a conversa alheia e a inexistente dão o mesmo `404`. O id da conversa não é credencial, mas continua fora dos logs.
- O cookie de sessão (`authjs.session-token`) é credencial: `HttpOnly`, `SameSite=Lax`, `Secure` em HTTPS, só com o id e o tipo da conta. Nunca o imprima, nem em scripts como o smoke. Das contas Google, só o `sub` e o e-mail são guardados.

## Marca e conteúdo

- Sem logo, nome ou cores de empresas reais na interface, no código e nos nomes de recursos. O nome de uma empresa real só pode aparecer no aviso de não afiliação do README e no histórico em `docs/history/`.
- A base é a política de parceiros da Rango, empresa fictícia ([ADR 0018](docs/adr/0018-empresa-ficticia-rango.md)); todo número vem do `regras.yaml` ([ADR 0019](docs/adr/0019-regras-yaml-fonte-unica.md)).
- O plano gratuito do Gemini pode usar o conteúdo enviado. A base só tem texto fictício, e os testes usam só dados fictícios.
- Exceção: a lista de termos e marcas recusados em `src/lib/moderation/blocked-terms.ts` fica codificada em base64 e traz nomes de empresas reais, só para o filtro funcionar ([ADR 0023](docs/adr/0023-filtro-local-de-termos-no-perfil.md)). Nenhum outro arquivo escreve esses termos em texto claro.

## Custo e cota de API

- **Não rode comandos que chamam API ou banco real** (`ingest`, `chat`, `eval`, `smoke`, fumaças, `supabase db push`) sem autorização explícita da pessoa ou do orquestrador na tarefa.
- Nunca aponte nada para o banco `prod`, exceto nos passos do checkpoint H5, com autorização.
- Os testes automatizados nunca fazem chamadas de rede nem acessam banco. Injete fakes.
- A CI roda só `lint`, `typecheck`, `test` e `build`, sem segredos.

## Fluxo de trabalho com changes do OpenSpec

Desde o [ADR 0015](docs/adr/0015-openspec-para-mudancas-incrementais.md), toda mudança nova é uma *change* do OpenSpec.

1. O comportamento atual fica em `openspec/specs/<capacidade>/spec.md`. Uma mudança fica em `openspec/changes/<nome>/`: `proposal.md`, `design.md`, `tasks.md` e os deltas das specs.
2. Use os comandos `/opsx:explore`, `/opsx:propose`, `/opsx:apply` e `/opsx:archive`, ou o CLI (`npx openspec list`, `show`, `validate`, `status`).
3. Só faça o *apply* de uma change cuja proposta a pessoa aprovou.
4. Leia, nesta ordem: este arquivo, os artefatos da change, os ADRs que ela cita e os documentos de `docs/` que a tabela do início indica para o tipo de mudança.
5. Toque **apenas** nos arquivos listados no `design.md` da change. Os contratos escritos nele são fixos: se precisar mudar um, pare e reporte. Se a change estiver ambígua ou errada, pare e reporte em vez de improvisar.
6. Marque as tarefas do `tasks.md` à medida que terminar cada uma.
7. O *archive* só roda depois do merge do PR da change, num PR próprio (`docs(openspec): archive <nome>`).
8. **Definição de pronto:** `npm run lint`, `npm run typecheck` e `npm test` passam (e `npm run build`, quando a change pede), e cada critério de aceite foi checado com evidência (ver o [`docs/qa.md`](docs/qa.md)). O relatório final lista os arquivos alterados, os critérios com a evidência, os desvios e as pendências humanas.
9. Não edite à mão os arquivos que o OpenSpec gerou em `.claude/commands/opsx/` e `.claude/skills/openspec-*/`. Eles são regenerados por `npx openspec update`.

## Skills do projeto

As skills ficam em `.claude/skills/`. Carregue a mais específica para cada etapa:

| Etapa | Skill |
|---|---|
| Amadurecer uma ideia vaga, uma pergunta por vez | `feature-concept` (ou `/opsx:explore`, para uma conversa mais livre) |
| Criar, revisar, implementar e arquivar uma change | `/opsx:propose`, `/opsx:update`, `/opsx:apply`, `/opsx:archive` |
| Fazer o merge do PR de uma change e arquivá-la (só quando a pessoa pede) | `/merge-change <PR>` |
| Escrever ou revisar código Next.js (rotas, RSC, metadata, erros) | `next-best-practices` |
| Escrever ou revisar componentes React com foco em performance | `vercel-react-best-practices` |
| Adicionar ou compor componentes de interface | `shadcn` (sempre `npx shadcn`, na versão do lockfile) |
| Revisar a interface (acessibilidade, UX) | `web-design-guidelines` |

As skills são guias gerais e **não sobrepõem as regras deste arquivo**. Se uma delas sugerir uma dependência nova (SWR, `lru-cache`, bibliotecas de formulário), streaming, estado em memória entre requisições ou qualquer coisa que contrarie as regras de IA e RAG ou um ADR aceito, as regras daqui valem.

## Git

O histórico, as branches e os PRs ficam **em inglês**. Os ADRs e o texto que o usuário final lê ficam em PT-BR.

### Branches e PRs

- A `main` só recebe código por **PR com a CI verde**.
- **Uma branch por change** do OpenSpec, criada a partir da `main` atualizada, com o nome da change em inglês e `kebab-case`: `<tipo>/<nome-da-change>`, por exemplo `feat/add-faq-shortcuts`. O worktree fica em `../chapa-worktrees/<nome-da-change>`. Nunca duas branches no mesmo diretório.
- O PR segue o [`.github/pull_request_template.md`](.github/pull_request_template.md): link da change, critérios de aceite com evidência, desvios e pendências humanas. O relatório final do subagente vai para a descrição do PR.
- Merge por **squash**, com título no padrão Conventional Commits. A branch é apagada depois do merge.

### Commits

- Pequenos e atômicos, no padrão **Conventional Commits em inglês**: `feat(rag): combine semantic and keyword scores`.
- Tipos: `feat`, `fix`, `refactor`, `test`, `docs`, `chore`, `ci`, `perf`. Escopo pela camada ou área: `config`, `llm`, `db`, `rag`, `assistant`, `api`, `ui`, `kb`, `eval`, `deploy`, `specs`, `adr`.
- O assunto diz **o quê**, no imperativo e com até ~72 caracteres. O corpo, quando existir, diz **por quê**.
- Todo commit de implementação leva o trailer `Change: <nome-da-change>`. Commit com código gerado por agente leva também `Co-Authored-By` do agente.

```
feat(rag): combine semantic and keyword scores

Weighted sum keeps keyword hits that embeddings miss on short queries.

Change: tune-hybrid-ranking
Co-Authored-By: Claude <noreply@anthropic.com>
```

### Quem faz o quê

- Subagentes **não fazem commit nem push**, a menos que a tarefa peça.
- O orquestrador commita na branch da change depois de revisar, faz push **só dessa branch** e abre o PR (`gh pr create`). Push direto na `main`, `--force` e criação de repositório remoto só com pedido explícito da pessoa.
- O merge do PR é da pessoa, ou do orquestrador com autorização explícita naquele PR. Rodar `/merge-change <PR>` é essa autorização para o PR da change e para o PR de archive que a skill abre.
- Configurações pessoais de editor (`.vscode/`, `.idea/`) ficam no `.gitignore`. Rascunhos e anotações pessoais não entram no repositório.
