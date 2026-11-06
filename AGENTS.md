# AGENTS.md — Chapa

Instruções para qualquer agente de código (Claude Code, Codex, Cursor, subagentes) que trabalhe neste repositório.

## O que é o projeto

Assistente web para restaurantes que **já são parceiros** de um app de delivery. Ele responde dúvidas operacionais (taxas e planos, repasse, cancelamentos, cardápio, horários, avaliações, embalagem) com **RAG híbrido** sobre a base em `knowledge-base/`, cita as fontes, guarda a memória por sessão e recusa o que está fora do escopo ou é sensível. Cadastro de novos restaurantes fica fora do escopo.

- Arquitetura: [`ARCHITECTURE.md`](ARCHITECTURE.md). Leia antes de qualquer tarefa.
- Decisões e seus porquês: [`docs/adr/`](docs/adr/README.md). Uma decisão de arquitetura nova vira um ADR novo; um ADR aceito não é reescrito, e sim substituído por outro (`Substituído por`). Os ADRs são escritos em português.
- Specs de implementação: [`specs/README.md`](specs/README.md). Cada spec traz por extenso os contratos que cria e os que usa.

É um projeto de estudo, **não oficial** e sem afiliação com nenhuma empresa de delivery.

## Stack

- **Next.js (App Router) + React + TypeScript**, num projeto só, com front e API. Deploy na **Vercel** (região `gru1`).
- **Tailwind CSS + shadcn/ui** na interface. **Biome** para lint e formatação.
- **Supabase (Postgres + pgvector + busca textual em português)**, acessado pelo driver `postgres` no pooler em modo transação. Projetos `dev` e `prod`.
- **Gemini** pelo SDK `@google/genai`, para chat e embeddings. Único provedor.
- **Vitest** para testes e **tsx** para os scripts locais (`ingest`, `chat`, `eval`, `smoke`).
- Node 24.

## Comandos

```bash
npm install
npm run dev              # http://localhost:3000
npm run build
npm run lint             # biome check .
npm run format           # biome check --write .
npm run typecheck        # tsc --noEmit
npm test                 # vitest run, sem rede, sem banco e sem chave
npm run ingest           # ⚠️ chama a API de embeddings e grava no banco (padrão: preset padrao)
npm run chat -- --nome "Pizzaria Bella" --debug        # ⚠️ chama a API
npm run eval -- --label v2 --preset padrao             # ⚠️ chama a API (60 a 90 chamadas)
npm run smoke -- --url https://<deploy>                # ⚠️ chama a demo publicada
npm run db -- db push --remote   # Supabase CLI, no projeto linkado (só no checkpoint)
```

As variáveis ficam em `.env.local`, e o `.env.example` lista todas. Os scripts locais usam `--env-file-if-exists=.env.local`, que não sobrescreve variáveis já definidas no shell.

## Camadas e importações

| Pasta | Pode importar | Não pode importar |
|---|---|---|
| `src/components/`, `src/lib/` | `src/lib/`, React, shadcn | `src/core/`, `src/infra/`, `@google/genai`, `postgres` |
| `src/core/` | `src/core/`, `src/lib/types`, `src/config` | `src/infra/`, `next`, `@google/genai`, `postgres` |
| `src/infra/llm/` | `@google/genai`, `src/core/` (tipos e erros), `src/config` | `postgres` |
| `src/infra/db/` | `postgres`, `src/core/` (tipos), `src/lib/types` | `@google/genai` |
| `src/app/api/` | `src/infra/container`, `src/core/` (tipos e erros), `src/lib/` | SDKs direto |
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
- No servidor, **não registre** o conteúdo das mensagens, o perfil, o `sessionId` nem o IP. Logar status, latência, tokens e o nome do erro é permitido.
- O IP só é guardado como HMAC (`IP_HASH_SECRET`). O RLS fica ligado em todas as tabelas, sem nenhuma policy.
- O link `/?sessao=<id>` funciona como credencial: não o logue nem o exponha em referrers.

## Marca e conteúdo

- Sem logo, nome ou cores de empresas reais na interface, no código e nos nomes de recursos. O nome de uma empresa real só pode aparecer nas URLs de fonte da base e no aviso de não afiliação do README.
- Os arquivos de `knowledge-base/` são **reescritos com palavras próprias**, com a URL da fonte e a data de consulta no cabeçalho. Não copie páginas nem parágrafos.
- **Números (comissão, prazos, valores) só entram se estiverem na fonte**, no formato "conforme <página>, consultada em DD/MM/AAAA". Sem fonte, o texto fica genérico. Nunca invente números.
- O plano gratuito do Gemini pode usar o conteúdo enviado. A base só tem texto público, e os testes usam só dados fictícios.

## Custo e cota de API

- **Não rode comandos que chamam API ou banco real** (`ingest`, `chat`, `eval`, `smoke`, fumaças, `supabase db push`) sem autorização explícita da pessoa ou do orquestrador na tarefa.
- Nunca aponte nada para o banco `prod`, exceto nos passos do checkpoint H5, com autorização.
- Os testes automatizados nunca fazem chamadas de rede nem acessam banco. Injete fakes.
- A CI roda só `lint`, `typecheck`, `test` e `build`, sem segredos.

## Fluxo de trabalho com specs

1. Só implemente specs com `Status: ✅ Aprovada`.
2. Leia, nesta ordem: este arquivo, o `ARCHITECTURE.md` e a spec.
3. Toque **apenas** nos arquivos listados em "Arquivos que podem ser criados ou alterados". Outros agentes podem estar trabalhando no resto em paralelo.
4. Os contratos de uma spec são fixos. Se precisar mudar um, pare e reporte.
5. Não amplie o escopo. Se a spec estiver ambígua ou errada, pare e reporte em vez de improvisar.
6. **Definição de pronto:** `npm run lint`, `npm run typecheck` e `npm test` passam (e `npm run build`, quando a spec pede), e todos os critérios de aceite foram checados um a um, com evidência.
7. No relatório final, liste os arquivos alterados, os critérios de aceite com a evidência de cada um, os desvios da spec e as pendências humanas.

## Git

O histórico, as branches e os PRs ficam **em inglês**. Os ADRs e o texto que o usuário final lê ficam em PT-BR.

### Branches e PRs

- A `main` só recebe código por **PR com a CI verde**. A única exceção é o commit 0 (documentação e specs).
- **Uma branch por spec**, criada a partir da `main` atualizada: `<tipo>/sNN-<nome-curto-em-ingles>`, por exemplo `feat/s04-ingestion-and-search`, `docs/s10-readme`.
- Specs da mesma onda rodam em paralelo, cada uma no **seu próprio worktree** (`../chapa-worktrees/sNN`, via `git worktree add`). Nunca duas branches no mesmo diretório.
- O PR segue o [`.github/pull_request_template.md`](.github/pull_request_template.md): link da spec, critérios de aceite com evidência, desvios e pendências humanas. O relatório final do subagente vai para a descrição do PR.
- Merge por **squash**, com título no padrão Conventional Commits. A branch é apagada depois do merge.
- Na branch, a spec só muda o **próprio** status (`🔵` → `🟢`) dentro do arquivo dela. O índice de `specs/README.md` é atualizado num PR pequeno de fechamento da onda, para que PRs paralelos não entrem em conflito.

### Commits

- Pequenos e atômicos, no padrão **Conventional Commits em inglês**: `feat(rag): combine semantic and keyword scores`.
- Tipos: `feat`, `fix`, `refactor`, `test`, `docs`, `chore`, `ci`, `perf`. Escopo pela camada ou área: `config`, `llm`, `db`, `rag`, `assistant`, `api`, `ui`, `kb`, `eval`, `deploy`, `specs`, `adr`.
- O assunto diz **o quê**, no imperativo e com até ~72 caracteres. O corpo, quando existir, diz **por quê**.
- Todo commit de implementação leva o trailer `Spec: SNN`. Commit com código gerado por agente leva também `Co-Authored-By` do agente.

```
feat(rag): combine semantic and keyword scores

Weighted sum keeps keyword hits that embeddings miss on short queries.

Spec: S04
Co-Authored-By: Claude <noreply@anthropic.com>
```

### Quem faz o quê

- Subagentes **não fazem commit nem push**, a menos que a tarefa peça.
- O orquestrador commita na branch da spec depois de revisar, faz push **só da branch da spec** e abre o PR (`gh pr create`). Push direto na `main`, `--force` e criação de repositório remoto só com pedido explícito da pessoa.
- O merge do PR é da pessoa, ou do orquestrador com autorização explícita naquele PR.
- Configurações pessoais de editor (`.vscode/`, `.idea/`) ficam no `.gitignore`. Rascunhos e anotações pessoais não entram no repositório.
