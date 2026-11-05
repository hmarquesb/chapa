# 0006. Usar dois projetos Supabase, dev e prod

- **Status:** Aceito
- **Data:** 2026-11-05

## Contexto

Testes, previews e rodadas de avaliação gravam dados. A demo pública precisa ficar limpa.

## Decisão

Dois projetos Supabase: **`dev`** (local, Preview da Vercel e avaliação) e **`prod`** (só produção).

## Alternativas consideradas

- **Um projeto só:** os dados de teste vazam para a demo.
- **Supabase local com Docker:** configuração mais pesada para um projeto de estudo.

## Consequências

- As migrações são aplicadas duas vezes; no `prod`, só no checkpoint H5.
- Os agentes nunca apontam nada para o `prod` fora do H5.
