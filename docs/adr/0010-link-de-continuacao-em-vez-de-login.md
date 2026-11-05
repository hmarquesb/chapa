# 0010. Usar um link de continuação da sessão em vez de login

- **Status:** Aceito
- **Data:** 2026-11-05

## Contexto

O usuário deve poder retomar uma conversa, mas a demo precisa ser testável sem conta.

## Decisão

Um **link de continuação** (`/?sessao=<id>`). Quem tem o link pode ler aquela conversa. Ele expira junto com a sessão, depois de 7 dias sem uso.

## Alternativas consideradas

- **Login com Supabase Auth:** de meio dia a um dia de trabalho, exige conta para testar a demo e guarda e-mails.

## Consequências

- O link funciona como credencial: nunca é logado nem exposto em referrers (`Referrer-Policy: no-referrer`).
- Aceitável para uma demo sem dados pessoais.
