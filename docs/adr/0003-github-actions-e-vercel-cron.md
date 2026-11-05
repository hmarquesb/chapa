# 0003. Automatizar com GitHub Actions e Vercel Cron, não com n8n nem pg_cron

- **Status:** Aceito
- **Data:** 2026-11-05

## Contexto

O projeto precisa de CI em todo push e PR e de uma tarefa diária que apague as sessões sem uso há mais de 7 dias. O plano gratuito do Supabase também pausa projetos sem atividade.

## Decisão

- O **GitHub Actions** roda `lint`, `typecheck`, `test` e `build`, sem segredos e sem chamadas de API ou de banco.
- O **Vercel Cron** chama `/api/cron/cleanup` uma vez por dia, protegido por `CRON_SECRET`.

## Alternativas consideradas

- **n8n:** mais um serviço para hospedar, sem nenhum fluxo que precise dele.
- **`pg_cron` dentro do Supabase:** funciona, mas divide a lógica de limpeza entre a aplicação e o banco, e uma requisição externa é o jeito mais claro de manter o projeto gratuito ativo.

## Consequências

- A tarefa de limpeza também serve para manter o Supabase ativo.
- Os limites de frequência do cron no plano Hobby da Vercel precisam ser conferidos antes do deploy (S09).
