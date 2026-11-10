# Design

## Context

- Os textos fixos ficam em dois lugares: `src/core/messages.ts` (fallback, bloqueios) e `src/core/prompts.ts` (prompts). A regra 5 de IA e RAG do `AGENTS.md` exige que o fallback exista só em `FALLBACK_MESSAGE`; o prompt de sistema e o do RAG o interpolam.
- `src/core/prompts.test.ts` confere partes do `SYSTEM_PROMPT` (`já são parceiros`, `150 palavras`, `CPF`, o fallback). Não há teste das mensagens fixas: o `assistant.test.ts` e o `guardrails.test.ts` comparam com as constantes, não com o texto.
- As fixtures de teste com "portal" (`handlers.test.ts`, `assistant.test.ts`, `guardrails.test.ts`) são respostas e perguntas fictícias, não textos do app, e ficam como estão.
- A interface lê `EXAMPLE_QUESTIONS` de `src/components/chat/example-questions.tsx` e o rótulo do plano de `FIELDS` em `src/components/chat/profile-form.tsx`.
- A decisão de usar a Rango é o ADR 0018, criado pela change `add-rango-knowledge-base`. Esta change não depende do código daquela e pode rodar em paralelo, porque não compartilha arquivos com ela.

## Goals / Non-Goals

**Goals:**

- Trocar os textos sem mudar nenhum comportamento: mesmo fluxo, mesmos status, mesmos guardrails.
- Um teste que impeça os termos antigos de voltar.

**Non-Goals:**

- Reescrever as regras do prompt ou os exemplos few-shot além da troca do nome da tela. Qualquer mudança de instrução mexeria no acerto e confundiria a leitura da `v3`.

## Decisions

### 1. Arquivos que o implementador pode alterar

| Arquivo | Ação |
|---|---|
| `src/core/messages.ts` | Trocar os três textos (decisão 2) |
| `src/core/messages.test.ts` | Criar (decisão 5) |
| `src/core/prompts.ts` | Trocar os textos da decisão 3 |
| `src/core/prompts.test.ts` | Acrescentar os casos da decisão 5 |
| `src/components/chat/profile-form.tsx` | Rótulo, exemplo e comentário (decisão 4) |
| `src/components/chat/example-questions.tsx` | As três perguntas (decisão 4) |
| `scripts/chat.ts` | Só o comentário da linha 3: `--plano "Plano Próprio"` |
| `openspec/changes/rebrand-app-texts-to-rango/tasks.md` | Marcar as tarefas |

Nenhum outro arquivo é tocado. Em especial, `docs/`, `README.md`, `AGENTS.md` e `scripts/eval/` ficam com as outras duas changes.

### 2. Mensagens fixas (`src/core/messages.ts`)

Textos exatos:

```ts
export const FALLBACK_MESSAGE =
  "Não encontrei essa informação na base do parceiro. Fale com o suporte pelo Painel Rango."

// em BLOCKED_INPUT_MESSAGES
credential_request:
  "Não tenho acesso a senhas e nunca peço senha. Para recuperar o acesso, use a opção de recuperação de senha do Painel Rango.",

export const BLOCKED_OUTPUT_MESSAGE =
  "Não consegui montar uma resposta segura para essa pergunta. Tente reformular ou fale com o suporte pelo Painel Rango."
```

`empty`, `too_long`, `sensitive_data` e `OUTPUT_BLOCK_SIGNALS` não mudam. O fallback continua começando por "Não encontrei essa informação na base do parceiro", então a detecção de resposta equivalente ao fallback (comparação normalizada com a constante) segue funcionando sem mudança.

### 3. Prompts (`src/core/prompts.ts`)

Só estes trechos mudam; o resto dos prompts fica idêntico, caractere por caractere.

- `SYSTEM_PROMPT`, primeiro parágrafo:

  > Você é o Chapa, o assistente de parceiros da Rango, uma empresa de delivery. Você ajuda donos e gerentes de restaurantes que já são parceiros da Rango a tirar dúvidas operacionais: planos e taxas, repasse, cancelamentos e contestações, cardápio e fotos, horários e pausas, avaliações, embalagem e entrega, promoções e cupons, suporte e chamados, conta e segurança, pagamentos e notas fiscais.

  A lista "Regras:" continua igual.
- `FEW_SHOT_EXAMPLES`, exemplo 1: "na área de horários no portal" vira "na área de horários do Painel Rango", no contexto e no passo 1 da resposta.
- `REWRITE_PROMPT`, primeira frase: "Você reescreve perguntas para uma busca na base de conhecimento do assistente de parceiros da Rango, uma empresa de delivery."
- `SUMMARY_PROMPT`, primeira frase: "Você resume conversas entre um restaurante parceiro da Rango, uma empresa de delivery, e o assistente Chapa."

Alternativa descartada: dizer no prompt que a Rango é fictícia. O modelo não precisa disso para responder, e a frase poderia aparecer nas respostas. O aviso de que a Rango é fictícia fica na base (cabeçalho de cada documento) e na documentação.

### 4. Interface

- `profile-form.tsx`, campo `plan`: `label: "Plano na Rango"`, `placeholder: "Ex.: Plano Próprio ou Plano Entrega"`. Comentário acima de `FIELDS`: `// "Plano" stays free text (no fixed list). The example names come from knowledge-base/regras.yaml (nomes).`
- `example-questions.tsx`:

  ```ts
  export const EXAMPLE_QUESTIONS = [
    "Quando o repasse cai na minha conta?",
    "Quem paga o desconto quando eu crio um cupom?",
    "Me passa uma receita de lasanha?",
  ] as const
  ```

  A primeira é a dúvida mais comum e continua com resposta (`02`); a segunda mostra um tema novo da base (`08`); a terceira mantém a demonstração do fallback. Alternativa descartada: trocar a pergunta de cancelamento por outra de cancelamento; ela sai para dar lugar a um tema novo, e cancelamento continua no eval.

### 5. Testes

- `src/core/messages.test.ts` (novo): o `FALLBACK_MESSAGE`, o `credential_request` e o `BLOCKED_OUTPUT_MESSAGE` terminam em "Painel Rango."; nenhum texto de `BLOCKED_INPUT_MESSAGES`, `FALLBACK_MESSAGE` e `BLOCKED_OUTPUT_MESSAGE` contém "Portal do Parceiro".
- `src/core/prompts.test.ts`: o `SYSTEM_PROMPT` contém "assistente de parceiros da Rango" e cada um dos 11 temas da decisão 3; nenhum de `SYSTEM_PROMPT`, `REWRITE_PROMPT`, `SUMMARY_PROMPT` e `buildRagPrompt("x", [])` contém "app de delivery" nem "Portal do Parceiro" (sem diferenciar maiúsculas).
- Os casos atuais continuam passando sem alteração (`já são parceiros`, `150 palavras`, `CPF`, fallback no prompt).

## Risks / Trade-offs

- [Deploy desta change no `prod` antes da base da Rango: o fallback manda para o "Painel Rango" enquanto a base fala do "Portal do Parceiro"] → A reingestão do `prod` e o smoke acontecem logo depois do merge das duas changes (ver `tasks.md`, "Workflow follow-up"). Se esta change entrar primeiro, a pessoa pode segurar o deploy de produção até a outra entrar.
- [Mudar o primeiro parágrafo do prompt de sistema pode alterar levemente as respostas] → A mudança é só de identidade e lista de temas; a `v3` mede o conjunto (base + textos) depois do merge das duas.
- [Conversas antigas guardam o fallback antigo no histórico] → Aceito: as sessões expiram em 7 dias e o texto antigo não quebra nada.
