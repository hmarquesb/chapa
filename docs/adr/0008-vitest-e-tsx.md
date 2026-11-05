# 0008. Usar Vitest e tsx nos testes e nos scripts locais

- **Status:** Aceito
- **Data:** 2026-11-05

## Contexto

O Node puro não resolve o alias `@/` do Next, e o `server-only` precisa ser trocado por um stub nos testes.

## Decisão

**Vitest** nos testes e **tsx** nos scripts locais (`ingest`, `chat`, `eval`, `smoke`), ambos como dependências de desenvolvimento.

## Alternativas consideradas

- **`node:test` com imports relativos e extensão `.ts`:** nenhuma dependência nova, mas um estilo de import diferente do da aplicação.

## Consequências

- O mesmo estilo de import em todo lugar.
- Os scripts rodam com `--conditions=react-server`; o Vitest troca o `server-only` por um stub.
