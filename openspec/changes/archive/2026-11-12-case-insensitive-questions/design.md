# Design

## Context

O motivo e o diagnóstico estão na proposta ("Why"). Pontos do código que importam aqui:

- A busca textual (`match_chunks`, config `public.pt_unaccent`) já ignora caixa e acento. **Nada na busca muda.**
- O prompt do RAG (`buildRagPrompt`, em `src/core/prompts.ts`) já diz que "a pergunta pode usar palavras diferentes das do contexto", mas não fala de maiúsculas e minúsculas.
- O `deve_conter` do eval já não diferencia caixa (`includesNormalized`).

## Goals / Non-Goals

**Goals:**
- Deixar explícito ao modelo de resposta que a caixa das letras não muda o sentido da pergunta.
- Ter no eval a grafia em minúsculas da pergunta 164.

**Non-Goals:**
- Garantir determinismo do modelo de resposta: a temperatura fica em 0,2.
- Medir o efeito da instrução nas outras perguntas (proposta, "Fora do escopo").

## Decisions

### 1. Uma linha a mais no prompt do RAG

Acréscimo na lista de instruções de `buildRagPrompt`, logo depois da instrução de palavras diferentes:

> - Maiúsculas e minúsculas não mudam o sentido da pergunta. Nomes de área, de tela e de tipo de chamado podem vir em minúsculas: "financeiro" e "Financeiro" são a mesma coisa.

Não vira constante exportada nem parâmetro: é texto do prompt, como as outras instruções. O `SYSTEM_PROMPT` não muda.

Alternativa descartada: baixar a pergunta para minúsculas antes de mandá-la ao modelo. Apaga os nomes próprios, e o modelo continuaria lendo "financeiro" e "Financeiro" como coisas diferentes no contexto.

### 2. Um quarto exemplo fictício no prompt do RAG

Só a instrução da decisão 1 não bastou: na verificação, a pergunta 174 caiu no fallback nas 2 tentativas (`v6-174` e `v6-174-r2`), e a 164 foi respondida. O modelo aprende mais com um exemplo do que com uma regra solta. Entra depois do Exemplo 3, nos `FEW_SHOT_EXAMPLES`:

```
Exemplo 4
Contexto: Problemas com o cardápio são tratados por um chamado do tipo Cardápio, aberto na área de ajuda do Painel Rango.
Pergunta: como falo com o pessoal do cardápio?
Resposta: Para falar com o time de cardápio, abra um chamado do tipo Cardápio na área de ajuda do Painel Rango.
```

O exemplo é genérico e fictício, sem números. Ele usa outra área (cardápio) para o modelo não decorar a resposta do financeiro. Com ele, a 174 foi respondida em 4 de 5 tentativas (`v6-174-ex4-r1` a `r5`).

### 3. Uma paráfrase nova no eval

Entra no fim de `eval/perguntas.json`:

| Campo | Valor |
|---|---|
| `id` | 174 |
| `tipo` | `parafrase` |
| `pergunta` | `como falo com o financeiro?` |
| `fonte_esperada` | `["09-suporte-e-chamados.md"]` |
| `deve_conter` | `["chamado", "Ajuda"]` (os mesmos da 164) |
| `esperado` / `rota_esperada` | `resposta` / `rag` |
| `nota` | Variante da 164 em minúsculas: a caixa das letras não pode mudar a resposta. |

A 164 não muda (ids estáveis).

Contrato alterado em `scripts/eval/questions.ts`:

```ts
// Distribuição exigida (74 perguntas: 46 no escopo, 16 de recusa e 12 de conversa).
export const QUESTION_DISTRIBUTION = { ..., parafrase: 11, ... }
```

O resto da validação não muda.

## Arquivos

Só estes podem ser criados ou alterados:

| Arquivo | Mudança |
|---|---|
| `src/core/prompts.ts` | Uma instrução nova em `buildRagPrompt` (decisão 1) e o Exemplo 4 em `FEW_SHOT_EXAMPLES` (decisão 2) |
| `src/core/prompts.test.ts` | Testes da instrução nova, do Exemplo 4 e de que a regra do fallback continua |
| `scripts/eval/questions.ts` | `parafrase: 11` e o comentário da distribuição |
| `scripts/eval/questions.test.ts` | Fixtures e mensagens com 11 paráfrases |
| `eval/perguntas.json` | Pergunta 174 |
| `eval/resultados/v6-174*.*` | Gerados pelo orquestrador na verificação |
| `docs/qa.md` | "Avaliação": 74 perguntas, 46 no escopo, ids 101 a 174 |
| `docs/business.md` | "Metas de qualidade": 74 perguntas, 46 no escopo |
| `README.md` | "Avaliação": o parágrafo "As 73 perguntas" vira 74 (ids 101 a 174) e a linha Paráfrase vira 11; a linha "Avaliação" das decisões e a tabela de abordagens passam a dizer 74. A tabela de resultados, as rodadas e as falhas da `v5` ficam com 73, porque descrevem rodadas já feitas |

## Risks / Trade-offs

- [A instrução nova deixa o modelo mais permissivo em alguma pergunta de recusa] → Só acrescenta uma frase sobre caixa, sem afrouxar a regra do fallback; o efeito nas outras perguntas aparece na próxima rodada completa, que a proposta deixa fora desta change.
- [A 174 continua variando: 4 de 5 com o Exemplo 4] → Fica registrado no PR. Se a próxima rodada completa mostrar a 174 em fallback, a causa (o 09 fora do contexto) vira uma change própria.
- [A instrução não bastar, porque o documento 09 não chega ao modelo] → A 174 mede isso; se continuar no fallback, a causa vira uma change própria.
