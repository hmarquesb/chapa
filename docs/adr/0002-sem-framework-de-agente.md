# 0002. Construir RAG, memória e guardrails à mão, sem framework de agente

- **Status:** Aceito
- **Data:** 2026-11-05

## Contexto

O assistente sempre executa os mesmos passos (guardrail de entrada → busca → resposta → guardrail de saída → persistência). Ele nunca escolhe ferramentas. O projeto existe para mostrar e medir RAG, memória e guardrails.

## Decisão

Nenhum framework de agente (por exemplo, Mastra.ai) e nenhuma biblioteca de orquestração. O pipeline é TypeScript puro em `src/core/`, com portas injetadas para os testes.

## Alternativas consideradas

- **Mastra.ai ou similar:** útil para agentes que escolhem ferramentas, mas esconderia justamente as partes que o projeto quer mostrar e avaliar.

## Consequências

- Cada passo fica visível, testável com fakes e mensurável na avaliação.
- Mais código para escrever; aceitável para um pipeline fixo.
- O `AGENTS.md` proíbe adicionar frameworks de agente.
