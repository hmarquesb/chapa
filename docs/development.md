# Desenvolvimento

> Como escrever código no Chapa. As regras que não se negociam (camadas, IA e RAG, segurança, dependências) ficam no [`AGENTS.md`](../AGENTS.md). Este documento explica como aplicá-las no dia a dia.

## Princípios

- **Funções puras sempre que der.** Ranking, chunking, guardrails, montagem de prompt e métricas são funções puras, testadas sem rede.
- **Portas e injeção.** `src/core/` define as portas (`LlmClient`, `ChunkRepository`, `SessionRepository`, `RateLimitRepository`) e recebe as implementações por parâmetro. Quem monta tudo é o `src/infra/container.ts`.
- **Um fluxo só.** A API, a CLI (`npm run chat`) e o eval chamam o mesmo `handleMessage`. Uma mudança de comportamento vale nos três.
- **Sem estado em memória entre requisições.** Histórico, resumo e rate limit vêm do banco a cada mensagem.
- **Configuração num lugar só.** Nomes de modelo e parâmetros do RAG ficam em `src/config.ts`. Textos fixos para o usuário ficam em `src/core/messages.ts`.
- **Simples antes de genérico.** Não crie abstração para um caso só. Duplicar duas linhas é melhor que uma abstração prematura.

## Onde mexer

| Mudança | Arquivos | Cuidados |
|---|---|---|
| Parâmetro do RAG (`minScore`, `topK`, `alpha`, chunking) | `src/config.ts` (`RAG_PRESETS`) | Mudou o chunking: reingerir. Mudou qualquer parâmetro: rodar a avaliação ([`qa.md`](qa.md#avaliação)) |
| Modelo de chat ou de embedding | `src/config.ts` | Modelo de embedding novo exige reingerir, porque a busca filtra por `embedding_model`. Decisão de modelo vira ADR |
| Texto fixo (fallback, bloqueio, avisos) | `src/core/messages.ts` | Nunca duplique o texto em outro arquivo |
| Prompt de sistema ou do RAG | `src/core/prompts.ts` | O fallback no prompt vem de `FALLBACK_MESSAGE`. Rodar a avaliação |
| Guardrail de entrada ou de saída | `src/core/guardrails.ts`, `src/core/messages.ts` | Bloqueie padrões, nunca palavras soltas. "O repasse cai via Pix?" tem que passar: acrescente o caso nos testes |
| Memória, resumo ou reescrita | `src/core/memory.ts`, `src/core/rewrite-query.ts` | O contexto do RAG não vai para `messages` |
| Rota de API | `src/app/api/<rota>/route.ts` e o handler em `src/app/api/_lib/handlers.ts` | O `route.ts` só liga o handler ao container. A lógica fica no handler, testado com fakes. Exporte `runtime = "nodejs"` e `dynamic = "force-dynamic"` |
| Validação do corpo da requisição | `src/app/api/_lib/validate.ts` | Corpo máximo de 4 KB. Mensagens de erro em PT-BR |
| Campo novo no perfil | `src/lib/types.ts` (`PROFILE_FIELDS`), `src/core/prompts.ts`, `src/components/chat/profile-form.tsx` | O perfil é dado do usuário: não logue |
| Interface | `src/components/chat/`, `src/app/page.tsx`, `src/lib/` | Componentes só importam `src/lib/`. `"use client"` só quando precisa de estado ou eventos |
| Schema do banco | Nova migração em `supabase/migrations/` (`npm run db -- migration new <nome>`) | Nunca edite uma migração já aplicada. RLS ligado e sem policies. Aplicar no banco é checkpoint humano |
| Base de conhecimento | `knowledge-base/0N-*.md` e `knowledge-base/FONTES.md` | Reescreva com palavras próprias, com fonte e data. Depois do merge, reingerir no `dev` e no `prod` |
| Pergunta de avaliação | `eval/perguntas.json` | Ids estáveis: não renumere as perguntas existentes |

## Testes

- **Vitest**, com o teste ao lado do arquivo (`rank.ts` → `rank.test.ts`). O `vitest.config.ts` inclui `src/**/*.test.ts` e `scripts/**/*.test.ts`.
- **Sem rede, sem banco e sem chave.** Passe fakes das portas. Nada de mock de módulo para o SDK do Gemini ou para o driver `postgres`: se um teste precisa deles, a lógica está na camada errada.
- **TDD nas funções puras:** escreva o teste antes do código.
- O pacote `server-only` é trocado por um stub (`test/stubs/server-only.ts`) no Vitest. Nos scripts, o `--conditions=react-server` faz o mesmo papel.
- **`src/architecture.test.ts`** falha se uma camada importar o que não pode, se um arquivo de `src/core/` ou `src/infra/` não começar com `import "server-only"` ou se uma variável `NEXT_PUBLIC_` tiver nome de segredo. Regra nova de camada entra nesse teste.
- Dados de teste são sempre fictícios: nomes de restaurante inventados, CPFs e cartões de exemplo.

## Front-end

- Uma página só (`src/app/page.tsx`), com os componentes do chat em `src/components/chat/` e os do shadcn em `src/components/ui/`.
- Para adicionar um componente, use `npx shadcn add <componente>` (skill `shadcn`). Prefira as variantes prontas e as cores semânticas (`bg-primary`, `text-muted-foreground`).
- Estado do chat em `src/lib/chat-state.ts`, chamadas à API em `src/lib/api-client.ts` e o `sessionId` em `src/lib/session-id.ts`. O navegador só fala com a nossa API.
- Acessibilidade e responsividade fazem parte do pronto. Revise com a skill `web-design-guidelines`.

## Scripts locais

`scripts/` roda fora da Vercel, com `tsx`, e pode importar `src/core/`, `src/infra/` e `src/config`. As flags são lidas por `scripts/lib/args.ts`. Mensagens de erro e de uso ficam em PT-BR. Todo script que chama API ou banco leva o aviso ⚠️ no `AGENTS.md`.

## Idioma

- Identificadores, commits, branches e PRs em inglês.
- Todo texto que o usuário final lê, os ADRs, a documentação e as specs do OpenSpec em PT-BR.
- Comentários no código curtos, explicando o porquê, no idioma que o arquivo já usa.

## Formatação

Biome (`npm run format`), com 2 espaços e linhas de até 100 caracteres. Não reformate arquivos que você não precisa mudar.
