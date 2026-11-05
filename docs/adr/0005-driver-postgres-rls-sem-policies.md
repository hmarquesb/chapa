# 0005. Acessar o banco só pelo servidor, com o driver postgres

- **Status:** Aceito
- **Data:** 2026-11-05

## Contexto

Só o servidor precisa acessar os dados; o navegador fala apenas com a nossa API.

## Decisão

Usar o **driver `postgres`** pelo pooler do Supabase em modo transação (porta 6543, sem prepared statements). **O RLS fica ligado em todas as tabelas, sem nenhuma policy**, de modo que a chave `anon` não consegue ler nada.

## Alternativas consideradas

- **`supabase-js` com a chave service role:** uma dependência a mais e uma chave mais ampla, sem ganho nenhum.

## Consequências

- SQL puro em `src/infra/db/`, fácil de testar por trás das portas de repositório.
- O `supabase-js` aparece como dependência proibida no `AGENTS.md`.
