# Avaliação: v5-prompt-rep1

Data: 2026-11-12T19:38:25.224Z · Commit: `0ce5b73`

## Configuração

- Preset: `padrao`
- Modelo de chat: `gemini-3.5-flash-lite`
- Modelo rápido (reescrita, resumo e juiz): `gemini-3.5-flash-lite`
- Modelo de embedding: `gemini-embedding-001` (768 dimensões)
- Roteador: ligado (até 12 palavras)

| Campo | Valor |
|---|---|
| topK | 5 |
| minScore | 0.55 |
| alpha | 0.7 |
| candidateLimit | 30 |
| chunkStrategy | markdown |
| chunkSize | 1200 |
| chunkOverlap | 150 |
| rewriteQuery | true |
| contextMode | documents |
| maxContextDocs | 3 |

## Métricas

Perguntas: 2 (2 no escopo). Erros: 0.

| Métrica | Valor | Meta | Status |
|---|---|---|---|
| Hit@K | 50,0% | ≥ 85% | ❌ |
| Acerto | 50,0% | ≥ 80% | ❌ |
| Recusa correta | 0,0% | ≥ 92% | ❌ |
| Falsa recusa | 50,0% | ≤ 10% | ❌ |
| Latência p50 | 3265 ms | registrar | — |
| Latência p95 | 8615 ms | registrar | — |
| Chamadas e tokens | 9 chamadas, 11803 de entrada, 218 de saída | registrar | — |
| Contexto suficiente | 100,0% | sem meta | — |

## Rotas

| Métrica | Valor | Meta | Status |
|---|---|---|---|
| Acerto de rota | 100,0% | ≥ 95% | ✅ |
| Falso small talk | 0 | 0 | ✅ |
| Chamadas evitadas | 0 | registrar | — |
| Acerto cumprimento | 0,0% | registrar | — |
| Acerto conversa | 0,0% | registrar | — |
| Acerto mistas | 0,0% | registrar | — |
| Latência média das curtas no RAG | 5940 ms | registrar | — |

## Por pergunta

Fora do escopo e bloqueio: “Correto” indica recusa correta.

| Id | Tipo | Status | Rota | Hit | Correto | Latência | Fontes | Causa |
|---|---|---|---|---|---|---|---|---|
| 135 | multi_turno | answered | rag → rag | ✅ | ✅ | 8615 ms | 03-cancelamentos-e-contestacoes.md, 05-horarios-pausas-e-disponibilidade.md | — |
| 164 | parafrase | fallback | rag → rag | ❌ | ❌ | 3265 ms | — | geração |

## Falhas

### Pergunta 164 (parafrase)

- Pergunta: Como falo com o Financeiro?
- Esperado: resposta com chamado, Ajuda de 09-suporte-e-chamados.md
- Motivo: falsa recusa (status fallback)
- Causa: geração
- Resposta: Não encontrei essa informação na base do parceiro. Fale com o suporte pelo Painel Rango.
- Busca: Como falo com o Financeiro?
- Trechos recuperados (5) [score | sem | kw]:
  - 11-pagamentos-e-fiscal.md › Quando abrir um chamado [0.66 | 0.72 | 0.50]
  - 02-repasse-financeiro.md › Quando abrir um chamado [0.64 | 0.70 | 0.50]
  - 01-planos-e-taxas.md › Quando abrir um chamado [0.64 | 0.69 | 0.50]
  - 11-pagamentos-e-fiscal.md › Conferir os valores do mês [0.63 | 0.69 | 0.50]
  - 08-promocoes-e-cupons.md › Quando abrir um chamado [0.63 | 0.69 | 0.50]
