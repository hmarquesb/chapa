# Comparação das rodadas

- v1: preset `baseline`, 2026-11-06T14:05:17.512Z, commit `8a91048`
- v2-inicial: preset `padrao`, 2026-11-06T14:08:39.445Z, commit `8a91048`
- v2: preset `padrao`, 2026-11-06T14:17:18.952Z, commit `55e5424`

| Métrica | v1 | v2-inicial | v2 |
|---|---|---|---|
| Perguntas | 20 | 20 | 20 |
| No escopo | 14 | 14 | 14 |
| Hit@K | 71,4% | 100,0% | 100,0% |
| Acerto | 57,1% | 85,7% | 92,9% |
| Recusa correta | 100,0% | 100,0% | 100,0% |
| Falsa recusa | 35,7% | 14,3% | 7,1% |
| Latência p50 | 4644 ms | 5017 ms | 4782 ms |
| Latência p95 | 8156 ms | 10556 ms | 9917 ms |
| Erros | 0 | 0 | 0 |
| Chamadas | 31 | 42 | 40 |
| Tokens de entrada | 10277 | 37292 | 31935 |
| Tokens de saída | 456 | 1093 | 1156 |
| chunkStrategy | fixed | markdown | markdown |
| chunkSize | 500 | 1200 | 1200 |
| minScore | 0.7 | 0.5 | 0.55 |
| rewriteQuery | false | true | true |
