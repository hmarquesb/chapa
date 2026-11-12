# Proposal

## Why

"Como falo com o financeiro?" cai no fallback, e "Como falo com o Financeiro?" é respondida. O diagnóstico no `dev` (12/11/2026, `npm run chat --debug`) mostra que a busca devolve os mesmos trechos para as duas grafias (os scores variam no máximo 0,02, e a busca textual já ignora a caixa). Quem trata as duas de forma diferente é o modelo de resposta: com o perfil preenchido, a grafia com maiúscula foi respondida em 3 de 3 repetições, e a em minúsculas caiu no fallback em 3 de 3.

Maiúsculas e minúsculas não podem mudar a resposta. Hoje o prompt do RAG não diz isso ao modelo, e o eval só tem a grafia com maiúscula (pergunta 164).

## What Changes

- **Prompt do RAG (só acréscimo):** uma instrução nova dizendo que maiúsculas e minúsculas não mudam o sentido da pergunta e que nomes de área, de tela e de tipo de chamado podem vir em minúsculas ("financeiro" e "Financeiro" são a mesma coisa). E um quarto exemplo fictício, em que a pergunta cita uma área em minúsculas ("o pessoal do cardápio") e a resposta vem do contexto, que cita o tipo de chamado com maiúscula. Nada é removido: a regra do fallback exato e os três exemplos atuais ficam como estão.
- **Avaliação:** o conjunto vai de 73 para 74 perguntas, com 1 `parafrase` nova (id 174): "como falo com o financeiro?". A 164 fica como está, com maiúscula.
- **Docs:** `docs/qa.md`, `docs/business.md` e `README.md` com a contagem nova do conjunto. Os resultados da `v5` (73 perguntas) ficam como estão.

## Critério de aceite

1. Depois da mudança, `npm run eval -- --only 174` no `dev` termina com a pergunta 174 respondida e com os termos esperados. Se falhar, ela é repetida uma vez antes de contar.
2. `npm run lint`, `npm run typecheck` e `npm test` passam.

## Fora do escopo

- Seção nova ou qualquer outra mudança na base de conhecimento.
- Normalizar a caixa da pergunta antes de mandá-la ao modelo ou à busca: apagaria nomes próprios ("Plano Entrega", "Painel Rango").
- Mudar a busca, o `minScore`, o `maxContextDocs`, a reescrita ou a temperatura.
- Rodada completa do eval. A mudança no prompt só acrescenta uma instrução e não é medida nas outras 73 perguntas: o efeito nelas fica para a próxima rodada completa.
- As outras falsas recusas da `v5` (121 e 171).
- Interface, API e banco.

## Capabilities

### New Capabilities
(nenhuma)

### Modified Capabilities
- `answer-generation`: as instruções de resposta dizem que a caixa das letras não muda o sentido da pergunta.
- `evaluation`: o conjunto fixo passa de 73 para 74 perguntas (11 `parafrase`, 46 no escopo).

## Impact

- **Código:** `src/core/prompts.ts` (+ teste), `scripts/eval/questions.ts` (+ teste), `eval/perguntas.json`.
- **Sem reingestão, sem migração, sem dependência nova, sem ADR.**

## Chamadas reais e checkpoints humanos

Nenhum subagente faz chamada real. O orquestrador roda, contra o `dev` e com a autorização prévia do `CLAUDE.md`, só `npm run eval -- --label v6-174 --only 174` (uma ou duas vezes, poucas chamadas). Depois do merge, nada precisa ser feito no `prod`: o prompt vai junto com o deploy.
