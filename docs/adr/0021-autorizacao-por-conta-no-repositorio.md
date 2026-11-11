# 0021. Autorização por conta no repositório

- **Status:** Aceito
- **Data:** 2026-11-10

## Contexto

Com as contas do [ADR 0020](0020-login-google-e-conta-demo.md), "só o dono acessa a conversa" precisa valer em toda consulta. Até aqui, o id da conversa funcionava como credencial: quem estava logado e o tinha lia a conversa. Só o servidor fala com o banco ([ADR 0005](0005-driver-postgres-rls-sem-policies.md)), então a regra cabe no código que monta as consultas.

## Decisão

- **O dono é parâmetro obrigatório das portas de conversa** (`SessionOwner`) e entra no `where` de toda consulta. Na web, o dono é a conta logada; no CLI e no eval, é "sem conta".
- **A conversa alheia e a inexistente dão o mesmo `404`**, para a resposta não revelar que o id existe.
- **O servidor gera o id da conversa.** O navegador não guarda o id (nem no `localStorage`, nem num link): a lista de conversas da conta, por `GET /api/sessions`, é o caminho para retomar uma conversa. O link `/?sessao=<id>` deixa de existir.
- **O RLS continua ligado e sem policies.**
- **A regra é coberta por testes** com o repositório falso e pelo `npm run authz-check` contra o `dev`.

## Alternativas consideradas

- **Policies de RLS com o id da conta numa variável de sessão do Postgres (`set_config`).** Adiada: o navegador não fala com o banco. Reavaliar se isso mudar.
- **Filtro só na rota.** Descartada: uma consulta nova sem o filtro vazaria dados. Com o dono no tipo da porta, esquecê-lo é erro de compilação.

## Consequências

- Complementa o [ADR 0005](0005-driver-postgres-rls-sem-policies.md), que continua aceito, e encerra o que restava do [ADR 0010](0010-link-de-continuacao-em-vez-de-login.md).
- Toda consulta nova de conversa recebe o dono por tipo, e o `authz-check` ganha o caso correspondente.
- Recarregar a página abre uma conversa nova; a mais recente fica a um clique, na lista.
