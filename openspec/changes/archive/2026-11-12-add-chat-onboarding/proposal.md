# Proposal

## Why

Num teste com uma pessoa de fora do projeto, ela não entendeu para que o Chapa serve nem que tipo de pergunta podia fazer. A pergunta de exemplo "Me passa uma receita de lasanha?" piorou a confusão, porque parece um pedido que o assistente deveria atender. Além disso, quem entra com Google pela primeira vez cai em `/perfil` sem saída: `/` devolve para `/perfil` (sem plano salvo) e `/entrar` devolve para `/` (já logado), então não dá para voltar e escolher outra forma de entrar.

## What Changes

- **Voltar para o login no primeiro acesso:** a tela `/perfil`, quando a conta ainda não tem plano salvo, ganha o botão "Voltar para o login", que encerra a sessão e leva a `/entrar`. A conta continua no banco, como no "Sair". Na edição do perfil (conta com plano) nada muda: continua o link "Voltar ao chat".
- **Card de boas-vindas no chat:** ao abrir o chat, um card sobre o fundo borrado explica o que é a Rango (empresa de delivery fictícia), o que é o Chapa (assistente dos parceiros, que responde com base nas regras da Rango e mostra as fontes) e os temas que ele cobre, com o que fica fora. O botão "Entendi" fecha o card.
  - Conta Google: aparece só na primeira vez da conta. Fechar o card marca a conta no banco, e ele não volta em nenhum navegador.
  - Conta demo: aparece toda vez que o chat é aberto.
  - Qualquer conta pode reabrir o card pela opção nova "Sobre o Chapa" do menu da conta.
- **Perguntas de exemplo:** sai "Me passa uma receita de lasanha?". Ficam "Quando o repasse cai na minha conta?" e "Quem paga o desconto quando eu crio um cupom?".
- **Banco:** a tabela `accounts` ganha a coluna `welcome_seen_at` (nula até a conta fechar o card), numa migração nova.
- **API:** rota nova `POST /api/account/welcome`, que marca a conta logada como já tendo visto o card e responde `204`. Exige sessão, como as outras rotas da conta.

## Capabilities

### New Capabilities
<!-- Nenhuma. -->

### Modified Capabilities
- `chat-ui`: o card de boas-vindas (quando aparece, conteúdo e reabertura), a opção "Sobre o Chapa" no menu da conta, o botão "Voltar para o login" no primeiro acesso e as perguntas de exemplo, que passam de três para duas.
- `chat-api`: a rota `POST /api/account/welcome` e a inclusão dela na lista de rotas que exigem login.

## Impact

- **Código:** `src/app/page.tsx`, `src/app/perfil/page.tsx`, `src/components/chat/` (`account-menu`, `example-questions` e um componente novo do card), `src/lib/` (texto do card e cliente da API), `src/core/types.ts`, `src/infra/db/` (mapper e repositório de contas), `src/app/api/_lib/handlers.ts` e a rota nova em `src/app/api/account/welcome/`.
- **Banco:** migração nova em `supabase/migrations/`. Ela precisa estar aplicada no `dev` antes da verificação manual e no `prod` **antes** do deploy, porque a leitura da conta passa a pedir a coluna nova: sem ela, toda rota protegida quebra.
- **Scripts:** o `npm run screenshots` usa uma demo, que agora abre com o card: o script precisa fechá-lo e ganha a captura do card. O smoke e a fixture da pergunta fora do escopo continuam com a lasanha, porque testam o fallback e não a lista de exemplos.
- **Chamadas reais e checkpoints humanos:** `db push` da migração no `dev` (autorizado para o orquestrador) e no `prod` (checkpoint H5, autorizado, mas antes do merge e do deploy). `npm run dev` e `npm run screenshots` no `dev` na verificação manual. O login com Google em `localhost` (primeiro acesso, "Voltar para o login" e o card que não volta) fica com a pessoa. Sem `ingest`, `eval` nem `smoke`.
- **Dependências:** nenhuma nova. O card usa o `Dialog` do shadcn que já existe, cujo fundo já é borrado.
- **ADR:** nenhum. Guardar uma marca de tempo na conta segue o modelo das colunas que já existem.

### Fora do escopo

- Tour guiado, passo a passo ou destaque de elementos da tela.
- Mudar o texto da tela `/entrar` ou o subtítulo do chat.
- Trocar a lasanha no smoke, no eval ou nas specs de `answer-generation`.
- Guardar no banco que uma demo viu o card (a demo vê sempre).
- Apagar a conta Google criada quando a pessoa usa "Voltar para o login": ela segue as regras de expiração de sempre.
