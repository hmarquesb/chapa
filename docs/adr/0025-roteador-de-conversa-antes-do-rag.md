# 0025. Roteador de conversa antes do RAG

- **Status:** Aceito
- **Data:** 2026-11-12

## Contexto

Depois da resposta fixa ao cumprimento, restam as conversas curtas que não são dúvida: agradecimento, despedida, elogio, "quem é você?" e "o que você faz?". Hoje elas passam pela reescrita, pelo embedding e pela busca, e acabam no fallback ou numa resposta sem sentido, gastando cota à toa. Só regras não cobrem a variedade dessas frases, e uma regra larga demais engoliria uma dúvida de verdade ("e no Plano Entrega?").

## Decisão

- **Um roteador de conversa em `src/core/router/conversation.ts`**, que roda no `handleMessage` depois da memória e antes da reescrita, só para mensagens com até `config.router.maxWords` palavras e com `config.router.enabled` ligado.
- **Uma chamada que classifica e responde.** O modelo rápido (`config.models.fast`) recebe a mensagem, a última resposta do Chapa e o nome do restaurante, e ou responde em até 2 frases ou devolve só a sentinela `DUVIDA`. A temperatura é 0 e a saída tem no máximo 120 tokens.
- **O padrão é o RAG.** `acceptConversationReply` rejeita a resposta (e o turno segue para o RAG) quando ela é vazia, contém a sentinela, tem qualquer dígito, contém o `FALLBACK_MESSAGE` ou é barrada pelo `validateOutput`. Qualquer erro da chamada, inclusive de cota, também segue para o RAG. O roteador nunca lança erro para o `handleMessage`.
- **Turno de conversa** é gravado com o status `small_talk`, sem fontes, e tem a rota `conversa`. O interruptor `router.enabled` desliga o roteador sem mudar mais nada.

## Alternativas consideradas

- **Só regras.** Descartada: não cobre a variedade das frases, e cada exceção nova vira mais uma regra frágil.
- **Classificador externo pago (JEV, da TypeSafe).** Descartada: serviço pago e mais um provedor, contra o [ADR 0009](0009-somente-gemini.md).
- **Classificador separado, em JSON, e depois a resposta.** Descartada: duas chamadas por conversa, em vez de uma.
- **Conversa no caminho do fallback.** Descartada: o turno ainda gasta o embedding e a busca, e fica difícil medir o que é conversa e o que é dúvida sem resposta.

## Consequências

- Uma conversa curta gasta uma chamada do modelo rápido em vez de um embedding. Uma pergunta curta gasta uma chamada a mais. Mensagens com mais palavras que `maxWords` não pagam nada.
- O risco é o falso small talk: uma dúvida respondida como conversa. O padrão seguro (`DUVIDA`, dígito, fallback e guardrail descartam a resposta) e a avaliação, que exige zero `small_talk` nos grupos de risco, o limitam. Mudou o prompt do roteador: rode a avaliação.
- O turno de conversa não tem trechos nem fontes, e o log ganha `routerMs`.
- Para voltar atrás basta `router.enabled: false` num commit, ou reverter o PR. Os turnos `small_talk` já gravados continuam legíveis.
