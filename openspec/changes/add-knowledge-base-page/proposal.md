# Proposal

## Why

O Chapa é um projeto de estudo de RAG, mas a interface não diz isso em lugar nenhum: o card de boas-vindas fala que ele "mostra de onde tirou cada resposta" sem dizer como, e quem quer conferir a fonte não tem onde ler os documentos. Os selos de fonte mostram só o nome do arquivo. Mostrar a técnica e abrir a base para consulta deixa o projeto explicável para quem o visita e permite conferir uma resposta contra o texto original.

## What Changes

- **Boas-vindas citam o RAG:** o segundo parágrafo do card passa a dizer que o Chapa usa a técnica de RAG (busca os trechos da base de conhecimento antes de responder). O card ganha uma linha final com o link "Base de conhecimento", que abre a página nova numa aba nova, sem fechar o card nem perder a conversa.
- **Página `/base`, pública:** lista os documentos numerados de `knowledge-base/` (o título de cada um e os títulos das seções), com uma introdução curta que explica, em linguagem simples, como o Chapa usa esses documentos. Aberta sem login, como `/privacidade` e `/marca`.
- **Página `/base/<arquivo>`**, por exemplo `/base/01-planos-e-taxas`: mostra o documento inteiro, formatado (títulos, parágrafos, listas, negrito e o aviso de política), com o link de volta para `/base`. Um nome que não é de documento dá a página 404 padrão.
- **Fontes clicáveis:** cada selo de "Fontes:" embaixo da resposta vira um link para a página do documento, aberto numa aba nova, para a conversa continuar onde estava.
- **Rodapé:** o `SiteFooter` ganha o link "Base de conhecimento", ao lado de "Privacidade" e "Marca".
- As páginas são geradas no build a partir dos arquivos da pasta, sem banco, sem API e sem biblioteca de markdown: um conversor próprio e pequeno cobre só os elementos que a base usa.

## Capabilities

### New Capabilities
- `knowledge-base-page`: as páginas públicas que mostram a base de conhecimento para consulta (lista, documento, formatação e o que fica de fora).

### Modified Capabilities
- `chat-ui`: o conteúdo do card de boas-vindas (menção ao RAG e link para a base) e os selos de fonte, que passam a ser links para o documento.

## Impact

- **Código:** páginas novas em `src/app/base/`, um conversor de markdown puro em `src/lib/`, um componente que o desenha em `src/components/`, `src/lib/welcome.ts`, `src/components/chat/welcome-dialog.tsx`, `src/components/chat/message-item.tsx` e `src/components/brand/site-footer.tsx`. O padrão que separa os documentos numerados sai de `src/core/rag/ingest.ts` para `src/lib/`, para a ingestão e a página usarem a mesma regra.
- **Build:** as páginas da base viram estáticas. Uma mudança em `knowledge-base/` passa a aparecer no site no deploy seguinte, sem reingerir (a reingestão continua necessária para o RAG).
- **Chamadas reais e checkpoints humanos:** nenhuma. Sem `ingest`, `eval`, `smoke` nem `db push`. A verificação manual usa `npm run dev` no `dev`, autorizada para o orquestrador.
- **Dependências:** nenhuma nova.
- **ADR:** nenhum. A página só lê arquivos que já estão no repositório, e o conversor próprio segue a regra do `AGENTS.md` de não usar biblioteca de markdown.

### Fora do escopo

- Mostrar o `regras.yaml`, o `README.md` da base ou a base antiga de `docs/history/`.
- Busca dentro da página, índice lateral ou âncoras por seção.
- Levar o selo de fonte direto ao trecho ou à seção usada na resposta (a conversa guarda só o nome do arquivo).
- Formatar em markdown as respostas do chat.
- Mostrar a pergunta reescrita, os trechos recuperados ou as notas da busca (fica para a change `add-progress-steps`, que mostra as etapas sem expor o conteúdo).
- Memória entre conversas: a memória dentro de uma conversa já existe e não muda.
