# Proposal

## Why

O tipo de cozinha e a cidade são texto livre. Por isso aparecem valores soltos ("pizza", "pizzaria", "Pizzas!!"), cidades sem estado ou com erro de digitação, e nomes ambíguos ("Bom Jesus" existe em mais de um estado). Não dá para usar esses valores como fatos confiáveis, nem nas próximas ondas (memória hard, ferramentas por local). Esta é a change 2 de 3 do PRD `prd-chapa-perfil-estruturado.md`. Ela cria o perfil **versão 2**, troca cozinha, estado e cidade por escolhas em listas fixas (R1, R2, R3) e converte os perfis antigos (R8) (objetivos O2, O3 e O4). Ela **depende da change `add-profile-term-filter` estar mergeada e arquivada**, porque usa o filtro dela no texto de "Outro". Os deltas foram escritos sobre o texto que aquela change deixa.

## What Changes

- **Perfil v2:** `{ version: 2, plan, name?, cuisine?, location?, hours? }`. A cozinha é `{ id }`, um id da lista, ou `{ id: "outro", text }`, com o texto de até 30 caracteres passado pelo filtro. O local é `{ uf, cityCode? }`, com o código IBGE do município. O nome da cidade não é salvo: vem da lista pelo código. O horário continua texto livre até a change 3. Vale para a conta (web) e para a conversa (CLI e eval).
- **BREAKING (API):** o `PUT /api/profile` só aceita o formato v2. Um corpo sem `version: 2` recebe `400` com "O formulário do perfil mudou. Recarregue a página.". Um `id` de cozinha fora da lista, uma UF desconhecida, um `cityCode` inexistente ou de outra UF, ou uma cidade sem estado recebem `400` com `field` (`cuisine` ou `location`). O `GET /api/profile` passa a devolver `{ profile, needsReview }`.
- **Tipo de cozinha:** combobox com busca sem acento e sem diferença de maiúsculas, com as 18 opções do PRD e "Outro". Quando a busca não acha nada, a lista oferece `Usar "<texto>" como Outro`. Ao escolher "Outro", aparece o campo de texto obrigatório.
- **Estado e cidade:** o estado é escolhido entre as 27 UFs. A cidade é um combobox com busca que só habilita depois do estado e só mostra os municípios daquela UF, carregados sob demanda. Trocar o estado limpa a cidade. Estado sem cidade é aceito.
- **Lista do IBGE no repositório:** um script (`scripts/ibge/generate-cities.ts`, rodado à mão) gera um módulo por UF a partir da API de localidades do IBGE e registra a data da extração. O app nunca chama o IBGE em tempo de execução.
- **Migração na leitura (decisão do design):** o PRD pedia uma migração de dados antes do deploy. Em vez disso, um perfil sem `version: 2` é convertido **toda vez que é lido**, pelas regras de R8: o nome que passa no filtro é mantido; a cozinha vira o `id` (por rótulo ou sinônimo) ou "Outro"; a cidade com um único município de mesmo nome no Brasil vira `{ uf, cityCode }`; o que não converte é descartado. Se algo foi descartado, o perfil fica marcado como "precisa revisar" até a pessoa salvar. Assim não há passo de banco, nem ordem a seguir entre migração e deploy, e o dado original só muda quando a pessoa salva. A escolha fica registrada no ADR 0024.
- **Faixa de revisão:** o chat mostra "Atualizamos o formulário do perfil. Revise seus dados." com o link "Revisar perfil", enquanto o perfil precisar de revisão. A faixa some depois de salvar. O PRD punha a faixa na change 3. Ela vem para cá porque é esta change que pode descartar dados. A change 3 só a reaproveita.
- **Prompt:** a linha "Cidade" dá lugar a "Local: Niterói (RJ)" (ou "Local: Rio de Janeiro (estado)", sem cidade), e a cozinha aparece pelo rótulo da lista ou pelo texto de "Outro".
- **Demo:** "Marmitaria Boa Panela", Plano Misto, cozinha "Marmita e comida caseira", local Rio de Janeiro (RJ, 3304557). O horário continua o texto atual até a change 3. O smoke confere o plano e o local.
- **CLI e eval:** o `npm run chat` troca `--cozinha`, `--cidade` e `--horario` por `--perfil <arquivo.json>`, validado pelo mesmo parser do `PUT`. `--nome` e `--plano` continuam como atalhos. As 5 perguntas com perfil em `eval/perguntas.json` passam para o formato v2: são 5, não as 10 que o PRD cita. O resultado do eval não deve mudar.
- **Dependência nova:** `cmdk`, que o componente `Command` do shadcn exige para o combobox com busca e navegação por teclado. A alternativa seria escrever um listbox acessível à mão, com mais código e mais risco de acessibilidade. `Popover` usa o `radix-ui`, que já é dependência.
- **ADR 0024, "Perfil estruturado com listas fixas, municípios do IBGE no repositório e migração na leitura".** O PRD chamava este ADR de 0023, mas esse número ficou com o filtro (change 1).

## Fora do escopo

- Horário estruturado, atalhos de horário e agrupamento de dias no prompt (change 3).
- Duas cozinhas por restaurante (principal e secundária). O PRD deixava a questão em aberto, e esta change adota **uma cozinha só**. Endereço, bairro, CEP, raio de entrega e mapa.
- "Aberto agora", fuso horário por cidade e consulta ao IBGE em tempo de execução.
- Gravar a conversão em massa no banco. O perfil antigo só é regravado quando a pessoa salva.
- Mudanças no RAG, na base de conhecimento e nas perguntas do eval (só o formato do perfil muda).

## Chamadas reais e checkpoints humanos

1. **Subagente (autorização a dar no prompt):** rodar uma vez o `scripts/ibge/generate-cities.ts`, que chama a API pública de localidades do IBGE, sem chave. Não toca no nosso banco nem no Gemini.
2. **Orquestrador (autorização prévia):** verificação manual com `npm run dev` contra o `dev`: o fluxo "Primeiro acesso" do PRD (§6) numa conta demo; uma conta com perfil antigo gravado à mão no `dev` (cidade ambígua), que mostra a faixa e, depois de salvar, não mostra mais; o formulário só no teclado e em 390 px.
3. **Orquestrador (autorização prévia):** `npm run eval -- --label perfil-v2 --only <ids das 5 perguntas com perfil> --delay-ms <n>` contra o `dev` (cerca de 15 chamadas) e um `npm run chat -- --perfil <arquivo>`.
4. Sem `db push` e sem migração: o schema não muda.
5. **Pessoa:** revisar a lista de cozinhas e os sinônimos no PR; depois do merge, rodar o smoke em produção (ou autorizar o orquestrador).

## Capabilities

### New Capabilities

Nenhuma.

### Modified Capabilities

- `chat-api`: contrato v2 do `GET` e do `PUT /api/profile`, com `needsReview` e erros por campo de cozinha e local.
- `chat-ui`: tela de perfil com o combobox de cozinha, o estado e a cidade, e a faixa de revisão no chat.
- `answer-generation`: as linhas de cozinha e de local no prompt e a leitura do perfil antigo.
- `auth`: perfil da demo no formato v2.
- `session-memory`: perfil v2 no CLI e no eval, validado pelo mesmo parser do `PUT`.
- `evaluation`: perfil das perguntas validado pelo parser v2.

## Impact

- **Código:** `src/lib/profile/` (novo: tipos, cozinhas, UFs, municípios, busca, parser, conversão), `src/lib/types.ts`, `src/lib/plans.ts`, `src/app/api/_lib/` (`validate.ts`, `handlers.ts`, `errors.ts`), `src/infra/db/` (`mappers.ts`, repositórios de conta e de conversa), `src/core/` (`prompts.ts`, `assistant.ts`, `accounts.ts`, `types.ts`), `src/components/chat/` (formulário, combobox, faixa) e `src/components/ui/` (`command`, `popover`), `src/app/page.tsx`, `scripts/` (`chat.ts`, `eval/questions.ts`, `smoke-checks.ts`, `ibge/`), `eval/perguntas.json`.
- **Dependências:** `cmdk` (justificada acima).
- **Banco:** nenhuma migração.
- **Docs:** `docs/adr/0024-*.md` (novo), `docs/adr/README.md`, `AGENTS.md`, `docs/business.md`, `docs/architecture.md`, `docs/development.md`, `docs/qa.md` e `README.md`.
