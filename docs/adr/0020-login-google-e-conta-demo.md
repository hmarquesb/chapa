# 0020. Login com Google e conta de demonstração isolada

- **Status:** Aceito
- **Data:** 2026-11-10

## Contexto

O Chapa v2 precisa saber qual restaurante está do outro lado. Os chamados com aprovação (onda 3) e a memória que persiste entre conversas (onda 4) dependem de uma identidade, e "pedir dados de outra loja" só vira um teste de acesso real quando existem contas. Até aqui, a conversa era anônima, e o link `/?sessao=<id>` funcionava como credencial ([ADR 0010](0010-link-de-continuacao-em-vez-de-login.md)).

A demo pública tem que continuar a um clique: quem avalia o projeto não deve precisar criar conta para testar.

## Decisão

- **Login obrigatório na web.** A página do chat e as rotas `POST /api/chat` e `GET /api/sessions/[id]/messages` exigem uma sessão válida. Sem ela, as páginas levam a `/entrar` e as rotas respondem `401`. O CLI e a avaliação continuam sem login.
- **Entrar com Google**, pelo Auth.js v5 (`next-auth@5.0.0-beta.32`, versão fixada sem `^`), com sessão em JWT e sem adapter de banco. As contas ficam na tabela `accounts`, acessada com SQL puro em `src/infra/db/` ([ADR 0005](0005-driver-postgres-rls-sem-policies.md)). Só o `sub` e o e-mail verificado do Google são guardados.
- **Conta demo isolada por clique.** Cada "Testar como demo" cria uma conta nova, sem e-mail, que expira em 7 dias. São no máximo 5 contas demo por IP por dia UTC, contadas no `rate_limits` com o IP em HMAC.
- **Cookie de sessão** `httpOnly`, `SameSite=Lax` e `Secure` em HTTPS, válido por 30 dias, só com o id e o tipo da conta. Toda rota protegida confirma no banco que a conta existe e não venceu.
- **Google só onde as URLs são fixas** (`localhost` e produção). Sem as duas credenciais do Google, a tela mostra só a demo, como nos previews da Vercel.
- O Auth.js só é importado em `src/infra/auth/`, e o teste de arquitetura garante isso (regra 7).

## Alternativas consideradas

- **Manter o link de continuação:** não dá identidade às ondas 3 e 4, e quem tem o UUID lê a conversa.
- **E-mail e senha:** obriga a guardar senhas, a recuperar acesso e a mandar e-mail.
- **Link mágico:** exige um provedor de e-mail e atrasa a demo.
- **Supabase Auth:** exige o `supabase-js` (proibido) e prende a autenticação ao banco de produção, com o `dev` no Neon ([ADR 0017](0017-neon-como-banco-dev.md)).
- **OAuth próprio com `node:crypto`:** dispensa a dependência, mas obriga o projeto a manter código de segurança (PKCE, `state`, validação do `id_token`).
- **Uma conta demo compartilhada:** uma pessoa veria as conversas de outra.

## Consequências

- O chat na web passa a exigir login. O botão "Testar como demo" mantém a demo a um clique.
- O banco guarda e-mails das contas Google (só o `sub` e o e-mail). Os logs podem ter o `accountId`, nunca o e-mail. Contas Google sem acesso há 180 dias e demos vencidas são apagadas pela limpeza diária.
- Uma consulta a mais por pedido (`findActive`, por chave primária).
- Dependência `beta` fixada e confinada a `src/infra/auth/`. Trocar de biblioteca mexe numa pasta só.
- Cada rodada do smoke cria uma conta demo e gasta 1 das 5 demos do IP no dia.
- Variáveis novas: `AUTH_SECRET` (obrigatória) e `AUTH_GOOGLE_ID` e `AUTH_GOOGLE_SECRET` (opcionais, sempre juntas).
- Substitui o [ADR 0010](0010-link-de-continuacao-em-vez-de-login.md).
