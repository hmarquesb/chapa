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

A tabela "Onde mexer", com o arquivo e os cuidados de cada tipo de mudança, fica no [`AGENTS.md`](../AGENTS.md#onde-mexer), que todo agente já carrega.

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
