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
- **`src/architecture.test.ts`** confere as regras de camadas e importações do [`AGENTS.md`](../AGENTS.md#camadas-e-importações); a lista completa está no próprio teste. Regra nova de camada entra nesse teste.
- **`src/lib/palette.test.ts`** confere que o `palette.ts` e o `globals.css` têm os mesmos valores e que os pares texto/fundo passam no AA. **`src/design-tokens.test.ts`** falha se houver cor fixa (hex, `rgb(`, classe da paleta padrão do Tailwind) em `src/components` ou `src/app`.
- **`src/lib/moderation/profile-text.test.ts`** gera os casos bloqueados a partir de `BLOCKED_TERMS` e `BLOCKED_BRANDS` (acento, leetspeak, repetição, separadores e maiúsculas), sem escrever termo em texto claro. Os falsos positivos e os nomes legítimos ficam em texto claro. Para ver a lista decodificada: `npx tsx -e 'import("./src/lib/moderation/blocked-terms.ts").then((m) => console.log(m.BLOCKED_TERMS, m.BLOCKED_BRANDS))'`.
- Dados de teste são sempre fictícios: nomes de restaurante inventados, CPFs e cartões de exemplo.

## Front-end

- A página do chat (`src/app/page.tsx`) e a tela de entrada (`src/app/entrar/page.tsx`), com os componentes do chat em `src/components/chat/`, os da entrada em `src/components/auth/` e os do shadcn em `src/components/ui/`. As Server Actions de login ficam em `src/app/auth-actions.ts` e chegam aos componentes por props.
- Para adicionar um componente, use `npx shadcn add <componente>` (skill `shadcn`). Prefira as variantes prontas e as cores semânticas (`bg-primary`, `text-muted-foreground`). **Nenhuma cor fixa:** só tokens. Um tom novo entra no `src/app/globals.css` e no `src/lib/palette.ts` (o `npm test` diz se passa no AA).
- O tema (Claro, Escuro, Sistema) é a classe `dark` no `<html>`. Para pôr o botão numa tela, use o `ThemeToggle` (ou o `ThemeMenuGroup`, dentro de um menu), de `src/components/brand/theme-toggle.tsx`.
- Componentes de marca (`src/components/brand/`): `RangoLogo` no topo de cada tela (como link para `/` no `/perfil` e na `/privacidade`), `SiteFooter` no fim de cada tela (aviso de empresa fictícia, `note` opcional e o link "Privacidade"), `ChapaAvatar` ao lado de cada resposta do assistente (`decorative` quando o nome já vem no texto) e `ThinkingIndicator` enquanto a resposta não chega. O desenho do ícone fica só em `src/lib/chapa-icon.ts`.
- A `/marca` (`src/app/marca/page.tsx`, com os dados em `src/lib/brand-guide.ts`) é a referência visual: um componente novo de marca ou um tom novo deve aparecer lá. Fica no rodapé de todas as telas, como "Marca".
- Estado do chat em `src/lib/chat-state.ts`, chamadas à API em `src/lib/api-client.ts` e a lista de conversas em `src/lib/` (`format.ts` formata as datas). O navegador não guarda o id da conversa: ele vem da API. O navegador só fala com a nossa API.
- Acessibilidade e responsividade fazem parte do pronto. Revise com a skill `web-design-guidelines`.

## Login no ambiente local

- As variáveis estão no [`.env.example`](../.env.example), e o cliente OAuth do Google, no [`DEPLOY.md`](../DEPLOY.md#login-com-google). Sem as credenciais do Google, "Testar como demo" basta para testar o chat.
- A lógica testável fica fora do Auth.js: `src/core/accounts.ts`, `src/infra/auth/callbacks.ts`, `src/infra/auth/env.ts` e os handlers, que recebem uma função `authenticate` e são testados com fakes. O Vitest nunca carrega o `next-auth`.

## Scripts locais

`scripts/` roda fora da Vercel, com `tsx`, e pode importar `src/core/`, `src/infra/` e `src/config`. As flags são lidas por `scripts/lib/args.ts`. Mensagens de erro e de uso ficam em PT-BR. Todo script que chama API ou banco leva o aviso ⚠️ no `AGENTS.md`. O `npm run authz-check` confere, no banco `dev`, que toda consulta de conversa respeita o dono ([ADR 0021](adr/0021-autorizacao-por-conta-no-repositorio.md)): rode-o quando mexer em `src/infra/db/session-repository.ts` e acrescente um caso a cada consulta nova de conversa.

O `npm run brand:export` gera os logos, o avatar e o `README.md` de `public/brand/` e o `src/app/icon.svg`, a partir de `PALETTE`, de `CHAPA_ICON` e dos contornos da fonte (`opentype.js`, só em `devDependencies`; sem rede nem banco). Rode-o sempre que mudar um tom ou o ícone e **commite o resultado**: o `scripts/brand/svg.test.ts` falha com "rode `npm run brand:export`" se os arquivos ficarem velhos. O `public/brand/og.png` é uma cópia da rota `/opengraph-image`, salva à mão.

O `npm run screenshots -- --url http://localhost:3000 [--out .screenshots] [--only entrada,chat]` (ids: `entrada`, `chat`, `demo`, `menu`, `perfil`, `avisos`, `marca`) tira as fotos das telas nos dois temas e em dois tamanhos (desktop e 390 px), em `.screenshots/` (fora do git). Entra como demo uma vez (⚠️ cria 1 conta demo: 5 por IP por dia) e responde `POST /api/chat` e `GET /api/sessions` com dados fixos, sem chamar o LLM. Na primeira vez, rode `npx playwright install chromium`.

## Idioma

- Identificadores, commits, branches e PRs em inglês.
- Todo texto que o usuário final lê, os ADRs, a documentação e as specs do OpenSpec em PT-BR.
- Comentários no código curtos, explicando o porquê, no idioma que o arquivo já usa.

## Formatação

Biome (`npm run format`), com 2 espaços e linhas de até 100 caracteres. Não reformate arquivos que você não precisa mudar.
