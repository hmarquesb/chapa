# Avaliação: perfil-v2

Data: 2026-11-11T20:24:04.049Z · Commit: `9ef4ea6`

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

Perguntas: 5 (5 no escopo). Erros: 0.

| Métrica | Valor | Meta | Status |
|---|---|---|---|
| Hit@K | 100,0% | ≥ 85% | ✅ |
| Acerto | 100,0% | ≥ 80% | ✅ |
| Recusa correta | 0,0% | ≥ 92% | ❌ |
| Falsa recusa | 0,0% | ≤ 10% | ✅ |
| Latência p50 | 3920 ms | registrar | — |
| Latência p95 | 5666 ms | registrar | — |
| Chamadas e tokens | 10 chamadas, 7593 de entrada, 311 de saída | registrar | — |

## Por pergunta

Fora do escopo e bloqueio: “Correto” indica recusa correta.

| Id | Tipo | Status | Hit | Correto | Latência | Fontes |
|---|---|---|---|---|---|---|
| 122 | perfil | answered | ✅ | ✅ | 3920 ms | 01-planos-e-taxas.md, 02-repasse-financeiro.md |
| 123 | perfil | answered | ✅ | ✅ | 1776 ms | 01-planos-e-taxas.md, 02-repasse-financeiro.md, 11-pagamentos-e-fiscal.md |
| 124 | perfil | answered | ✅ | ✅ | 4151 ms | 01-planos-e-taxas.md, 11-pagamentos-e-fiscal.md |
| 125 | perfil | answered | ✅ | ✅ | 5666 ms | 01-planos-e-taxas.md |
| 126 | perfil | answered | ✅ | ✅ | 1593 ms | 11-pagamentos-e-fiscal.md, 01-planos-e-taxas.md, 02-repasse-financeiro.md |

## Falhas

Nenhuma falha.
