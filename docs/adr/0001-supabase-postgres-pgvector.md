# 0001. Usar Supabase Postgres com pgvector em vez de SQLite

- **Status:** Aceito (o banco dev passou para o Neon pelo [ADR 0017](0017-neon-como-banco-dev.md))
- **Data:** 2026-11-05

## Contexto

O assistente precisa guardar sessões, mensagens, limites de uso e os trechos da base. As funções da Vercel não têm sistema de arquivos persistente entre requisições, então um banco em arquivo local se perderia. O assistente também precisa de busca vetorial sobre embeddings e de busca textual em português para a metade por palavra-chave da busca híbrida.

## Decisão

Usar o **Supabase (Postgres + pgvector + busca textual em português)** como único armazenamento de dados, na região `sa-east-1`.

## Alternativas consideradas

- **SQLite na Vercel:** não persiste entre requisições.
- **Banco vetorial dedicado (Pinecone, Qdrant):** mais um serviço para manter, e a busca por palavra-chave ainda precisaria de outro armazenamento.

## Consequências

- Um só banco cobre sessões, mensagens, limites de uso, trechos e as duas metades da busca híbrida.
- O plano gratuito pausa por inatividade; o cron diário resolve isso ([ADR 0003](0003-github-actions-e-vercel-cron.md)).
- A busca vetorial exata (sem índice) basta abaixo de ~500 trechos; um índice HNSW é o próximo passo se a base crescer.
