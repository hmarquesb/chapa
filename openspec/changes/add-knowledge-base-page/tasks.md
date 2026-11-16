# Tasks

## 1. Funções puras

- [x] 1.1 Escrever primeiro `src/lib/knowledge-base.test.ts` (o padrão aceita `02-repasse-financeiro.md` e recusa `README.md`, `regras.yaml`, `02-repasse.txt` e `2-repasse.md`; `documentSlug` com nome e com caminho; `documentHref` devolve `/base/01-planos-e-taxas`), depois criar `src/lib/knowledge-base.ts` com os contratos da decisão 1; verificar com `npx vitest run src/lib/knowledge-base.test.ts`
- [x] 1.2 Em `src/core/rag/ingest.ts`, importar e reexportar `KNOWLEDGE_FILE_PATTERN` de `@/lib/knowledge-base`, sem mudar os importadores; verificar com `npx vitest run src/core/rag scripts src/architecture.test.ts`
- [x] 1.3 Escrever primeiro `src/lib/markdown.test.ts`: título 1 a 3, `####` vira parágrafo, parágrafo de várias linhas, citação, lista `-` e `1.`, negrito no meio e no início do item, `**` sem par como texto, `<script>` como texto, `documentOutline`, e um teste que lê `knowledge-base/01-planos-e-taxas.md` e `08-promocoes-e-cupons.md` e confere que nenhum bloco tem `**` nem começa com `#`, `>`, `- ` ou `1. `; verificar que os testes falham antes do código
- [x] 1.4 Criar `src/lib/markdown.ts` com `parseMarkdown` e `documentOutline` (decisão 2); verificar com `npx vitest run src/lib/markdown.test.ts`

## 2. Páginas da base

- [x] 2.1 Criar `src/app/base/documents.ts` (decisão 3), filtrando com `isKnowledgeDocument`; verificar com `npm run typecheck`
- [x] 2.2 Criar `src/components/knowledge-base/markdown-document.tsx` (decisão 4), sem `"use client"`, sem `dangerouslySetInnerHTML` e sem cor fixa; verificar com `npm run lint` e `grep -n "dangerouslySetInnerHTML\|use client" src/components/knowledge-base/` sem resultado
- [x] 2.3 Criar `src/app/base/page.tsx` (cabeçalho com `RangoLogo` como em `/privacidade`, título, introdução sobre o RAG, um `Card` por documento com título, seções e link, `SiteFooter`) e `src/app/base/[documento]/page.tsx` (`generateStaticParams`, `dynamicParams = false`, `generateMetadata`, link "Voltar para a base de conhecimento", `notFound()`); verificar com `npm run build`, que deve listar `/base` e as rotas `/base/[documento]` como estáticas (SSG)

## 3. Chat e rodapé

- [x] 3.1 Em `src/lib/welcome.test.ts`, acrescentar primeiro os testes do texto novo (o segundo parágrafo cita "técnica de RAG"; `WELCOME_KNOWLEDGE_BASE` tem o texto do cenário "Conteúdo do card"), depois atualizar `src/lib/welcome.ts`; verificar com `npx vitest run src/lib/welcome.test.ts`
- [x] 3.2 Em `src/components/chat/welcome-dialog.tsx`, desenhar o parágrafo `WELCOME_KNOWLEDGE_BASE` depois de `WELCOME_OUT_OF_SCOPE`, com o link para `KNOWLEDGE_BASE_PATH` numa aba nova e o aviso `sr-only`; verificar com `npm run typecheck` e `npm run lint`
- [x] 3.3 Em `src/components/chat/message-item.tsx`, transformar cada selo em link para `documentHref(source)` (decisão 4), mantendo o `title` e o nome legível; verificar com `npm run typecheck` e `npm run lint`
- [x] 3.4 Em `src/components/brand/site-footer.tsx`, acrescentar " · Base de conhecimento" depois de "Marca"; verificar com `npm run lint`

## 4. Documentação

- [x] 4.1 Atualizar `docs/architecture.md` ("Front-end", os dois pontos do design), `AGENTS.md` (linha nova em "Onde mexer"), `docs/qa.md` ("Verificação manual local", item **Base de conhecimento**: `/base` sem login, um documento aberto, `/base/README` dá 404, selo de fonte abre em aba nova, link no card e no rodapé) e `README.md` (linha da **Demo**); verificar relendo cada trecho e conferindo que nenhum deles conta os documentos

## 5. Verificação manual (orquestrador)

- [x] 5.1 Com `npm run dev` no `dev`: `/base` abre numa janela anônima sem login; cada documento abre formatado, sem `**` nem `>` à mostra; `/base/README` e `/base/12-publicidade` dão 404; numa demo, o card mostra o texto novo e o link abre `/base` em aba nova sem fechar o card; uma pergunta respondida tem selos que abrem o documento em aba nova; o rodapé tem o link; a 390 px sem rolagem horizontal; nos dois temas
- [x] 5.2 Rodar `npm run lint`, `npm run typecheck`, `npm test` e `npm run build` no worktree, todos verdes

## Workflow follow-up

- Depois do merge: arquivar a change num PR próprio (`docs(openspec): archive add-knowledge-base-page`) e remover o worktree.
