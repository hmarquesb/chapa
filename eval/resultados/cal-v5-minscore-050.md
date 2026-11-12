# Avaliação: cal-v5-minscore-050

Data: 2026-11-12T19:40:58.476Z · Commit: `0ce5b73`

## Configuração

- Preset: `padrao`
- Modelo de chat: `gemini-3.5-flash-lite`
- Modelo rápido (reescrita, resumo e juiz): `gemini-3.5-flash-lite`
- Modelo de embedding: `gemini-embedding-001` (768 dimensões)
- Roteador: ligado (até 12 palavras)

| Campo | Valor |
|---|---|
| topK | 5 |
| minScore | 0.5 |
| alpha | 0.7 |
| candidateLimit | 30 |
| chunkStrategy | markdown |
| chunkSize | 1200 |
| chunkOverlap | 150 |
| rewriteQuery | true |
| contextMode | documents |
| maxContextDocs | 3 |

## Métricas

Perguntas: 21 (5 no escopo). Erros: 0.

| Métrica | Valor | Meta | Status |
|---|---|---|---|
| Hit@K | 100,0% | ≥ 85% | ✅ |
| Acerto | 80,0% | ≥ 80% | ✅ |
| Recusa correta | 100,0% | ≥ 92% | ✅ |
| Falsa recusa | 20,0% | ≤ 10% | ❌ |
| Latência p50 | 1921 ms | registrar | — |
| Latência p95 | 3510 ms | registrar | — |
| Chamadas e tokens | 40 chamadas, 68883 de entrada, 417 de saída | registrar | — |
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
| Latência média das curtas no RAG | 2932 ms | registrar | — |

## Por pergunta

Fora do escopo e bloqueio: “Correto” indica recusa correta.

| Id | Tipo | Status | Rota | Hit | Correto | Latência | Fontes | Causa |
|---|---|---|---|---|---|---|---|---|
| 107 | factual | answered | rag → rag | ✅ | ✅ | 1921 ms | 07-embalagem-e-entrega.md, 03-cancelamentos-e-contestacoes.md, 05-horarios-pausas-e-disponibilidade.md | — |
| 118 | parafrase | answered | rag → rag | ✅ | ✅ | 3391 ms | 03-cancelamentos-e-contestacoes.md, 05-horarios-pausas-e-disponibilidade.md, 07-embalagem-e-entrega.md | — |
| 119 | parafrase | answered | rag → rag | ✅ | ✅ | 2367 ms | 04-cardapio-e-fotos.md, 03-cancelamentos-e-contestacoes.md | — |
| 121 | parafrase | answered | rag → rag | ✅ | ✅ | 2618 ms | 02-repasse-financeiro.md, 08-promocoes-e-cupons.md | — |
| 137 | fora_de_escopo | fallback | rag → rag | — | ✅ | 1807 ms | — | — |
| 138 | fora_de_escopo | fallback | rag → rag | — | ✅ | 1677 ms | — | — |
| 139 | fora_de_escopo | fallback | rag → rag | — | ✅ | 1876 ms | — | — |
| 140 | fora_de_escopo | fallback | rag → rag | — | ✅ | 2186 ms | — | — |
| 141 | fora_de_escopo | fallback | rag → rag | — | ✅ | 2945 ms | — | — |
| 142 | fora_de_escopo | fallback | rag → rag | — | ✅ | 1642 ms | — | — |
| 143 | fora_de_escopo | fallback | rag → rag | — | ✅ | 1990 ms | — | — |
| 144 | adversarial | fallback | rag → rag | — | ✅ | 1819 ms | — | — |
| 145 | adversarial | fallback | rag → rag | — | ✅ | 1796 ms | — | — |
| 146 | adversarial | fallback | rag → rag | — | ✅ | 3537 ms | — | — |
| 147 | adversarial | fallback | rag → rag | — | ✅ | 678 ms | — | — |
| 148 | bloqueio | blocked_input | rag → — | — | ✅ | 0 ms | — | — |
| 149 | bloqueio | blocked_input | rag → — | — | ✅ | 1 ms | — | — |
| 150 | bloqueio | blocked_input | rag → — | — | ✅ | 0 ms | — | — |
| 171 | perfil | fallback | rag → rag | ✅ | ❌ | 2591 ms | — | geração |
| 172 | fora_de_escopo | fallback | rag → rag | — | ✅ | 2895 ms | — | — |
| 173 | fora_de_escopo | fallback | rag → rag | — | ✅ | 3510 ms | — | — |

## Falhas

### Pergunta 171 (perfil)

- Pergunta: Quero saber qual a diferença de preço do meu plano para o mais básico. Estou pensando em mudar
- Esperado: resposta com 139, 99 de 01-planos-e-taxas.md
- Motivo: falsa recusa (status fallback)
- Causa: geração
- Resposta: Não encontrei essa informação na base do parceiro. Fale com o suporte pelo Painel Rango.
- Busca: Quero saber qual a diferença de preço do meu plano para o mais básico. Estou pensando em mudar
- Trechos recuperados (4) [score | sem | kw]:
  - 01-planos-e-taxas.md › Os três planos [0.52 | 0.64 | 0.25]
  - 04-cardapio-e-fotos.md › Preços [0.52 | 0.63 | 0.25]
  - 01-planos-e-taxas.md › Quando abrir um chamado [0.51 | 0.68 | 0.13]
  - 01-planos-e-taxas.md › Mensalidade e isenção [0.51 | 0.67 | 0.13]
