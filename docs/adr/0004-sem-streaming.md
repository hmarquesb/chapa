# 0004. Devolver respostas completas em vez de streaming

- **Status:** Aceito
- **Data:** 2026-11-05

## Contexto

O guardrail de saída precisa inspecionar a resposta inteira antes que o usuário veja qualquer parte dela.

## Decisão

**Sem streaming.** A API só responde depois que o guardrail de saída aprova.

## Alternativas consideradas

- **Streaming, recolhendo o texto que falhar no guardrail:** o usuário talvez já tenha lido o texto inseguro.

## Consequências

- Latência percebida maior; a interface mostra um estado de carregamento.
- Texto inseguro nunca é exibido.
