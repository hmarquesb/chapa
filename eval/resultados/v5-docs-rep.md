# Avaliação: v5-docs-rep

Data: 2026-11-12T19:26:32.467Z · Commit: `fcb5d51`

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

Perguntas: 10 (10 no escopo). Erros: 0.

| Métrica | Valor | Meta | Status |
|---|---|---|---|
| Hit@K | 100,0% | ≥ 85% | ✅ |
| Acerto | 100,0% | ≥ 80% | ✅ |
| Recusa correta | 0,0% | ≥ 92% | ❌ |
| Falsa recusa | 0,0% | ≤ 10% | ✅ |
| Latência p50 | 4111 ms | registrar | — |
| Latência p95 | 24300 ms | registrar | — |
| Chamadas e tokens | 35 chamadas, 49137 de entrada, 804 de saída | registrar | — |
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
| Latência média das curtas no RAG | 11096 ms | registrar | — |

## Por pergunta

Fora do escopo e bloqueio: “Correto” indica recusa correta.

| Id | Tipo | Status | Rota | Hit | Correto | Latência | Fontes | Causa |
|---|---|---|---|---|---|---|---|---|
| 116 | parafrase | answered | rag → rag | ✅ | ✅ | 10237 ms | 01-planos-e-taxas.md, 02-repasse-financeiro.md | — |
| 119 | parafrase | answered | rag → rag | ✅ | ✅ | 24300 ms | 04-cardapio-e-fotos.md | — |
| 124 | perfil | answered | rag → rag | ✅ | ✅ | 2837 ms | 01-planos-e-taxas.md, 11-pagamentos-e-fiscal.md | — |
| 126 | perfil | answered | rag → rag | ✅ | ✅ | 4043 ms | 11-pagamentos-e-fiscal.md, 01-planos-e-taxas.md, 02-repasse-financeiro.md | — |
| 132 | multi_turno | answered | rag → rag | ✅ | ✅ | 22352 ms | 01-planos-e-taxas.md, 07-embalagem-e-entrega.md | — |
| 134 | multi_turno | answered | rag → rag | ✅ | ✅ | 24059 ms | 06-avaliacoes-e-reputacao.md, 09-suporte-e-chamados.md, 05-horarios-pausas-e-disponibilidade.md | — |
| 163 | parafrase | answered | rag → rag | ✅ | ✅ | 3827 ms | 10-conta-acessos-e-seguranca.md, 09-suporte-e-chamados.md | — |
| 165 | parafrase | answered | rag → rag | ✅ | ✅ | 2957 ms | 01-planos-e-taxas.md, 11-pagamentos-e-fiscal.md, 02-repasse-financeiro.md | — |
| 168 | aberta | answered | rag → rag | ✅ | ✅ | 4111 ms | 02-repasse-financeiro.md, 11-pagamentos-e-fiscal.md, 10-conta-acessos-e-seguranca.md | — |
| 170 | aberta | answered | rag → rag | ✅ | ✅ | 16321 ms | 10-conta-acessos-e-seguranca.md | — |

## Falhas

Nenhuma falha.
