# Proposal

## Why

Com a change `add-rango-knowledge-base`, a base passa a ser a política de parceiros da Rango, empresa de delivery fictícia, com telas e planos próprios (Painel Rango, Plano Próprio…). Os textos do app ainda falam de "um app de delivery" genérico e mandam o parceiro para o "Portal do Parceiro", uma tela que não existe na base nova. O assistente, a interface e a base têm que falar a mesma língua. Esta change é o requisito R5 do PRD da peça 1 do Chapa v2.

## What Changes

- Prompts (`SYSTEM_PROMPT`, `REWRITE_PROMPT`, `SUMMARY_PROMPT` e o exemplo fictício do prompt do RAG) passam a apresentar o Chapa como **o assistente de parceiros da Rango** e a listar os 11 temas da base nova. As regras do prompt (tom, 150 palavras, só o contexto, fallback exato…) não mudam.
- **BREAKING (texto):** "Portal do Parceiro" vira **"Painel Rango"** nas três mensagens fixas: o fallback, o bloqueio de pedido de senha e o bloqueio de saída.
- O rótulo do campo de plano do perfil passa de "Plano no app de delivery" para **"Plano na Rango"**, com o exemplo "Ex.: Plano Próprio ou Plano Entrega". O campo continua texto livre.
- As 3 perguntas de exemplo da interface são revistas para a base nova: "Quando o repasse cai na minha conta?", "Quem paga o desconto quando eu crio um cupom?" e "Me passa uma receita de lasanha?" (a última continua mostrando o fallback).
- Teste novo que impede "Portal do Parceiro" e "app de delivery" de voltarem aos prompts e às mensagens.

Fora do escopo:

- Conteúdo da base, `regras.yaml`, ADRs e `docs/`: change `add-rango-knowledge-base`.
- Prompt do juiz do eval (`scripts/eval/judge.ts`) e o exemplo de CLI no `docs/qa.md`: change `expand-eval-to-50-questions`.
- Título, subtítulo e rodapé da interface ("sem afiliação com nenhuma empresa de delivery" continua verdadeiro), logo e cores (peça 3) e o select de plano (peça 2).
- Qualquer mudança de comportamento: guardrails, fluxo do turno, RAG e memória continuam iguais. Só mudam textos.

Chamadas reais e checkpoints humanos:

- Verificação manual com `npm run dev` e `npm run chat` no `dev`, já autorizada, de preferência depois que a base da Rango estiver ingerida no `dev` (a change `add-rango-knowledge-base`).
- Nada no `prod` dentro da change. Depois do merge desta change **e** da `add-rango-knowledge-base`, o `prod` é reingerido e a demo passa pelo smoke (H5; a pessoa autoriza o smoke). O deploy desta change sem a base nova no `prod` mostraria "Painel Rango" sobre a base antiga, por isso a ordem importa.
- Não há decisão de arquitetura nova, então não há ADR (a decisão é o ADR 0018, da outra change).

## Capabilities

### New Capabilities

Nenhuma.

### Modified Capabilities

- `answer-generation`: novo texto do fallback ("…pelo Painel Rango.") e instrução de sistema que apresenta o Chapa como o assistente de parceiros da Rango, com os 11 temas.
- `guardrails`: novos textos das mensagens de pedido de senha e de bloqueio de saída ("Painel Rango").
- `chat-ui`: as três perguntas de exemplo novas.

## Impact

- `src/core/prompts.ts`, `src/core/messages.ts` e os testes `src/core/prompts.test.ts` e `src/core/messages.test.ts` (novo).
- `src/components/chat/profile-form.tsx` e `src/components/chat/example-questions.tsx`.
- `scripts/chat.ts`: só o comentário de uso (`--plano "Plano Próprio"`).
- Respostas do assistente: o texto do fallback muda em todos os canais (web, CLI, eval). O histórico gravado no banco guarda o texto antigo nas mensagens antigas; nada é migrado.
- Sem dependências novas e sem mudança de API, banco ou rotas.
