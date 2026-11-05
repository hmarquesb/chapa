# 0007. Chamar a pasta de fontes do RAG de knowledge-base/

- **Status:** Aceito
- **Data:** 2026-11-05

## Contexto

Os documentos que o RAG ingere precisam de uma pasta própria. A pasta `docs/` é o lugar habitual da documentação do projeto, como estes ADRs.

## Decisão

As fontes do RAG ficam em **`knowledge-base/`**; `docs/` guarda a documentação do projeto.

## Alternativas consideradas

- **Usar `docs/` para os documentos do RAG:** ambíguo para pessoas e agentes, porque mistura o que é ingerido com o que documenta o projeto.

## Consequências

- Não há confusão entre o que é ingerido e o que documenta o projeto.
