# Avaliação: cal-norewrite-ms055

Data: 2026-11-06T14:13:41.195Z · Commit: `8a91048`

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
| rewriteQuery | false |

## Métricas

Perguntas: 2 (2 no escopo). Erros: 0.

| Métrica | Valor | Meta | Status |
|---|---|---|---|
| Hit@K | 100,0% | ≥ 85% | ✅ |
| Acerto | 50,0% | ≥ 80% | ❌ |
| Recusa correta | 0,0% | 100% | ❌ |
| Falsa recusa | 50,0% | ≤ 10% | ❌ |
| Latência p50 | 10318 ms | registrar | — |
| Latência p95 | 11546 ms | registrar | — |
| Chamadas e tokens | 8 chamadas, 6964 de entrada, 259 de saída | registrar | — |

## Por pergunta

Fora do escopo e bloqueio: “Correto” indica recusa correta.

| Id | Tipo | Status | Hit | Correto | Latência | Fontes |
|---|---|---|---|---|---|---|
| 11 | multi_turno | fallback | ✅ | ❌ | 11546 ms | — |
| 12 | multi_turno | answered | ✅ | ✅ | 10318 ms | 03-cancelamentos-e-contestacoes.md |

## Falhas

### Pergunta 11 (multi_turno)

- Pergunta: Meu restaurante faz a própria entrega. → Como funciona a comissão nesse caso?
- Esperado: resposta com 12% de 01-planos-e-taxas.md
- Motivo: falsa recusa (status fallback)
- Resposta: Não encontrei essa informação na base do parceiro. Fale com o suporte pelo Portal do Parceiro.
- Busca: Como funciona a comissão nesse caso?
- Trechos recuperados (4) [score | sem | kw]:
  - 01-planos-e-taxas.md › Comissão [0.60 | 0.75 | 0.25]
  - 02-repasse-financeiro.md › Descontos no repasse [0.58 | 0.73 | 0.25]
  - 01-planos-e-taxas.md › Taxa de pagamento online [0.58 | 0.72 | 0.25]
  - 05-horarios-pausas-e-disponibilidade.md › Abrir e fechar a loja [0.57 | 0.60 | 0.50]
