# Proposal

## Why

Hoje o perfil do restaurante é um formulário opcional, com o plano em texto livre ("o de entrega", "misto?"), salvo por conversa e no `localStorage`. As respostas que dependem do plano ficam menos confiáveis, e o perfil se perde a cada conversa nova. Esta é a change 3 de 3 do PRD (`prd-chapa-login.md`). Com as contas (change 1) e as conversas por conta (change 2), o perfil passa a morar **na conta**, com o plano como **escolha fechada**, e vale para todas as conversas (objetivo O3). A change também fecha o que falta do PRD: o perfil de exemplo da demo (O2), "Excluir minha conta", a página de privacidade (O4) e o limite diário de mensagens por conta. Ela **depende das changes 1 e 2 estarem aplicadas e arquivadas**, e os deltas foram escritos sobre o texto que elas deixam.

## What Changes

- **Plano em escolha fechada:** `proprio`, `entrega` ou `misto`, mostrados como "Plano Próprio", "Plano Entrega" e "Plano Misto", os nomes do `knowledge-base/regras.yaml`. Na instrução de sistema, o plano aparece pelo nome oficial ("Plano: Plano Misto"). Vale para a web, o CLI (`--plano`) e o eval.
- **Perfil na conta:** os campos nome, **plano (obrigatório)**, cozinha, cidade e horário, cada um com até 60 caracteres, salvos em `accounts.profile`. No canal `web`, o perfil que entra no prompt vem **sempre da conta**, lido do banco a cada mensagem. Por isso, uma edição vale a partir da próxima mensagem de qualquer conversa.
- **BREAKING:** um `profile` no corpo de `POST /api/chat` é **rejeitado com `400`** ("O perfil agora fica salvo na conta. Recarregue a página."), por decisão da pessoa. O histórico (`GET /api/sessions/[id]/messages`) deixa de trazer `profile`.
- **Rotas novas:** `GET` e `PUT /api/profile` (ler e salvar o perfil da conta) e `DELETE /api/account` (apaga a conta e todas as conversas na hora). O PRD sugeria `/api/perfil` e `/api/conta`. Os nomes seguem o padrão em inglês das outras rotas, e o comportamento é o do PRD.
- **Primeiro acesso com Google:** antes do chat, a página `/perfil` pede o perfil, e só o plano é obrigatório. A mesma página serve para "Editar perfil".
- **Perfil da demo:** cada conta demo nasce com **Marmitaria Boa Panela · Plano Misto** (cozinha brasileira caseira, Rio de Janeiro, 11h às 15h e 18h às 23h). O visitante pode editar o perfil, por exemplo para trocar o plano e ver a resposta mudar.
- **Chat:** o formulário de perfil sai do chat e dá lugar a um resumo ("Marmitaria Boa Panela · Plano Misto") com o link "Editar perfil". O menu da conta ganha "Editar perfil" e "Excluir minha conta", com confirmação. O perfil deixa de ser salvo no `localStorage`.
- **Privacidade:** a página pública `/privacidade` mostra o aviso, o que é guardado e o que não é, e a tabela de retenção. O link "Privacidade" entra na tela de entrada, no chat e no perfil. O aviso também aparece no formulário de perfil.
- **Limite diário de mensagens por conta:** 60 para contas Google e 30 para contas demo, por dia UTC, somado ao limite por IP que já existe. As mensagens são fixas e em PT-BR. Na demo, a mensagem sugere entrar com Google.
- **Restrição no banco:** uma conversa `web` sempre tem conta, e as de `cli` e `eval` nunca têm. A change 2 adiou essa restrição para que nenhum deploy recusasse gravações do código antigo.
- **Eval:** as 5 perguntas do tipo `perfil` passam a usar o plano no formato do enum (`"plan": "proprio"`). O texto que chega ao modelo não muda ("Plano: Plano Próprio"), então o resultado também não deve mudar. A validação do eval passa a recusar um plano fora da lista.
- Smoke, `AGENTS.md`, `docs/architecture.md`, `docs/business.md`, `docs/qa.md` e `README.md` atualizados.

## Fora do escopo

- Novos campos no perfil (CNPJ, endereço, telefone e qualquer dado pessoal ficam fora de propósito).
- Mover o perfil e as conversas de uma demo para uma conta Google.
- Exportar os dados da conta.
- Mudanças no RAG, no texto base dos prompts e nas perguntas do eval (além do formato do plano).
- Identidade visual da Rango (peça 3).
- ADR nova. O plano em escolha fechada e o perfil na conta são consequências da ADR 0020 (contas) e da ADR 0019 (nomes no `regras.yaml`), e não uma decisão de arquitetura nova.

## Chamadas reais e checkpoints humanos

1. **Orquestrador (autorização prévia):** aplicar a migração no `dev` e fazer a verificação manual com `npm run dev` contra o `dev`. Nela, entrar como demo e ver o perfil de exemplo, trocar o plano e ver a resposta de uma pergunta `perfil` mudar, passar pelo primeiro acesso, e excluir a conta. O limite diário por conta é coberto por testes unitários, para não gastar 30 a 60 chamadas de API só para atingi-lo.
2. **Orquestrador (autorização prévia):** `npm run eval -- --label perfil-enum --only <ids das 5 perguntas perfil> --delay-ms <n>` contra o `dev`, para mostrar que o resultado das perguntas `perfil` não mudou. São cerca de 15 chamadas. O `npm run chat -- --plano misto` também roda uma vez.
3. **Orquestrador (H5 parcial, autorizado):** aplicar a migração no `prod` **antes do merge**. Ela só apaga conversas `web` sem conta (que a limpeza da change 2 já apagou) e acrescenta um check que o código da change 2 já respeita.
4. **Pessoa:** testar o primeiro acesso com Google em `localhost` e em produção e rodar o smoke em produção (ou autorizar o orquestrador).

## Capabilities

### New Capabilities

Nenhuma.

### Modified Capabilities

- `auth`: a página de privacidade é pública, a tela de entrada ganha o link "Privacidade", a conta demo nasce com o perfil de exemplo, e entra "Excluir a conta".
- `chat-api`: o perfil sai do `POST /api/chat` (`400`) e do histórico, entram `GET`/`PUT /api/profile`, `DELETE /api/account` e o limite diário por conta, e o login passa a valer nas rotas novas.
- `chat-ui`: o resumo do perfil no lugar do formulário, a tela de perfil, o primeiro acesso, "Editar perfil" e "Excluir minha conta" no menu, e a página de privacidade. Sai o perfil no navegador.
- `session-memory`: o perfil por conversa vale só para `cli` e `eval`. Na web, o perfil vem da conta e nunca é gravado na conversa.
- `answer-generation`: o plano entra na instrução de sistema pelo nome oficial.
- `evaluation`: o plano das perguntas `perfil` precisa ser um dos três do enum.

## Impact

- **Código:** `src/lib/types.ts` e `src/lib/plans.ts` (novo), `src/core/` (`assistant`, `prompts`, `accounts`, `types`), `src/infra/db/` (`account-repository`, `mappers`), os handlers, a validação e as rotas da API (`/api/profile` e `/api/account`), `src/app/perfil/` e `src/app/privacidade/` (novos), `src/components/` (formulário de perfil reescrito, resumo e diálogo de exclusão), `scripts/chat.ts`, `scripts/eval/questions.ts`, `eval/perguntas.json` e `scripts/smoke*.ts`. A lista fechada está no `design.md`.
- **API:** quebra o contrato do `POST /api/chat` (sem `profile`) e do histórico (sem `profile`), e entram três rotas.
- **Banco:** o check `sessions_account_by_channel`. O `accounts.profile` já existe desde a change 1.
- **Dependências:** nenhuma. O `radio-group` do shadcn usa o `radix-ui`, que já está instalado.
