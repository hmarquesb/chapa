# 0009. Usar o Gemini como único provedor de LLM, pelo @google/genai

- **Status:** Aceito
- **Data:** 2026-11-05

## Contexto

O assistente precisa de um modelo de chat e de um modelo de embeddings que funcionem sem custo e sem cartão de crédito. O foco do projeto é RAG, memória e guardrails, não a comparação entre provedores.

## Decisão

Usar **só o Gemini**, pelo SDK nativo **`@google/genai`**, para chat e embeddings. Sem chave `LLM_PROVIDER`.

## Alternativas consideradas

- **Comparar Gemini e OpenAI:** dobra o custo e o trabalho de avaliação, sem relação com o foco do projeto.
- **SDK `openai` no endpoint compatível do Gemini:** só compensa com mais de um provedor e perde recursos nativos.

## Consequências

- O SDK nativo aceita `taskType` nos embeddings (pergunta ≠ documento), o que melhora a busca.
- Todas as chamadas ficam isoladas em `src/infra/llm/`, então trocar de provedor no futuro mexe numa pasta só.
- O plano gratuito pode usar o conteúdo enviado: a base só tem texto público e reescrito.
