# 0012. Personalizar com RAG e engenharia de prompt, não com fine-tuning

- **Status:** Aceito
- **Data:** 2026-11-05

## Contexto

O conhecimento muda com o tempo, as respostas precisam citar as fontes, e não há orçamento de GPU nem um grande conjunto de dados rotulados.

## Decisão

Personalizar o assistente com **RAG híbrido e engenharia de prompt**. Sem fine-tuning.

## Alternativas consideradas

- **Fine-tuning:** faz sentido para uma tarefa estreita, estável e de alto volume; aqui, fixaria fatos desatualizados e perderia a rastreabilidade.

## Consequências

- Atualizar o conhecimento é reingerir, não retreinar.
- O README (S10) traz a tabela completa de critérios e quando o fine-tuning passaria a ser o próximo passo.
