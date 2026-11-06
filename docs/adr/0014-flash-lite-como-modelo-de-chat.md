# 0014. Usar o Flash-Lite também como modelo de chat

- **Status:** Aceito
- **Data:** 2026-11-06

## Contexto

A S01 escolheu o Flash estável mais recente (`gemini-3.8-flash`) para gerar as respostas e o Flash-Lite (`gemini-3.5-flash-lite`) para as tarefas auxiliares (reescrita, resumo e juiz). O projeto só usa o plano gratuito do Gemini. No painel de cotas do AI Studio da conta, consultado em 06/11/2026, o `gemini-3.8-flash` tem **20 requisições por dia** e o `gemini-3.5-flash-lite` tem **500**.

Com 20 por dia, uma rodada de avaliação da S08 (60 a 90 chamadas) não cabe, e a demo pública esgotaria a cota em poucas conversas. Além disso, na verificação manual da S05, o `gemini-3.8-flash` devolveu `504 DEADLINE_EXCEEDED` em todas as tentativas, enquanto o Flash-Lite respondeu em menos de 1 s com a mesma chave.

## Decisão

Usar o **`gemini-3.5-flash-lite` para tudo que gera texto**: a resposta (`models.chat`) e as tarefas auxiliares (`models.fast`). Os dois campos continuam separados em `src/config.ts`, e `CHAT_MODEL` ainda troca só o modelo de chat. O nível de "thinking" do Flash-Lite fica em `minimal`.

## Alternativas consideradas

- **Manter o `gemini-3.8-flash` no chat:** a cota de 20 por dia não comporta o eval nem a demo.
- **`gemini-3.8-flash` só na demo e Flash-Lite no eval:** o eval mediria um modelo diferente do que roda em produção, o que contraria o motivo de ter um único `handleMessage`.
- **Plano pago:** fora do escopo de um projeto de estudo sem custo.

## Consequências

- As respostas podem ficar menos elaboradas do que com o Flash. O eval da S08 mede isso, e a S10 registra no README.
- Chat, reescrita, resumo e juiz dividem a mesma cota diária de 500 requisições. Uma mensagem faz até 3 gerações (resumo, reescrita e resposta). Os embeddings têm cota própria.
- O `MODEL_THINKING_LEVEL` passa a listar os modelos pelo nome. O `gemini-3.8-flash` continua na lista, com `low`, para quem o escolher via `CHAT_MODEL`.
- A S09 confere de novo as cotas por modelo antes do deploy (passo 1 do `DEPLOY.md`).
