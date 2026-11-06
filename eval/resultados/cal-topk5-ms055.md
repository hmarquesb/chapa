# Avaliação: cal-topk5-ms055

Data: 2026-11-06T14:11:56.323Z · Commit: `8a91048`

## Configuração

- Preset: `padrao`
- Modelo de chat: `gemini-3.5-flash-lite`
- Modelo rápido (reescrita, resumo e juiz): `gemini-3.5-flash-lite`
- Modelo de embedding: `gemini-embedding-001` (768 dimensões)

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

## Métricas

Perguntas: 3 (3 no escopo). Erros: 0.

| Métrica | Valor | Meta | Status |
|---|---|---|---|
| Hit@K | 100,0% | ≥ 85% | ✅ |
| Acerto | 66,7% | ≥ 80% | ❌ |
| Recusa correta | 0,0% | 100% | ❌ |
| Falsa recusa | 33,3% | ≤ 10% | ❌ |
| Latência p50 | 5035 ms | registrar | — |
| Latência p95 | 8247 ms | registrar | — |
| Chamadas e tokens | 6 chamadas, 5717 de entrada, 289 de saída | registrar | — |

## Por pergunta

Fora do escopo e bloqueio: “Correto” indica recusa correta.

| Id | Tipo | Status | Hit | Correto | Latência | Fontes |
|---|---|---|---|---|---|---|
| 9 | parafrase | answered | ✅ | ✅ | 8247 ms | 03-cancelamentos-e-contestacoes.md |
| 13 | multi_doc | fallback | ✅ | ❌ | 5024 ms | — |
| 14 | multi_doc | answered | ✅ | ✅ | 5035 ms | 01-planos-e-taxas.md, 02-repasse-financeiro.md |

## Falhas

### Pergunta 13 (multi_doc)

- Pergunta: Se eu pausar muito a loja, minha nota cai?
- Esperado: resposta com visibilidade de 05-horarios-pausas-e-disponibilidade.md, 06-avaliacoes-e-reputacao.md
- Motivo: falsa recusa (status fallback)
- Resposta: Não encontrei essa informação na base do parceiro. Fale com o suporte pelo Portal do Parceiro.
- Busca: Se eu pausar muito a loja, minha nota cai?
- Trechos recuperados (5) [score | sem | kw]:
  - 06-avaliacoes-e-reputacao.md › Como melhorar [0.71 | 0.69 | 0.75]
  - 05-horarios-pausas-e-disponibilidade.md › Impacto da indisponibilidade na visibilidade [0.68 | 0.76 | 0.50]
  - 05-horarios-pausas-e-disponibilidade.md › Por que a loja fecha sozinha [0.66 | 0.73 | 0.50]
  - 05-horarios-pausas-e-disponibilidade.md › Pausas programadas [0.66 | 0.73 | 0.50]
  - 06-avaliacoes-e-reputacao.md › Como a nota é calculada [0.65 | 0.71 | 0.50]
