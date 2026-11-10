# Comparação das rodadas

## Base da Rango (`v3` em diante)

A `v3` é uma **nova linha de base**: outra base de conhecimento (os 11 documentos da Rango) e outras perguntas (as 50 de ids 101 a 150). Ela não é comparável com `v1`, `v2` e `cal-*`, que estão em "Base anterior (histórico)", abaixo.

- v3: preset `padrao`, 2026-11-10T23:26:31.751Z, commit `9abc09b`, sem juiz. Rodada em 5 blocos de 10 perguntas com `--delay-ms 4000 --append`, entre 23:19 e 23:26 (UTC), sem estouro de cota e sem erros. Relatório: [`v3.md`](v3.md).

| Métrica | Meta | v3 |
|---|---|---|
| Perguntas | — | 50 |
| No escopo | — | 36 |
| Hit@K | ≥ 85% | 100,0% ✅ |
| Acerto | ≥ 80% | 83,3% ✅ (30 de 36) |
| Recusa correta | ≥ 92% | 100,0% ✅ (14 de 14) |
| Falsa recusa | ≤ 10% | 13,9% ❌ (5 de 36) |
| Latência p50 | registrar | 2693 ms |
| Latência p95 | registrar | 12369 ms |
| Erros | — | 0 |
| Chamadas | registrar | 106 |
| Tokens de entrada | registrar | 72179 |
| Tokens de saída | registrar | 2479 |
| chunkStrategy / chunkSize | — | markdown / 1200 |
| minScore / topK / alpha | — | 0.55 / 5 / 0.7 |
| rewriteQuery | — | true |

### Por que a falsa recusa ficou acima da meta

Cinco perguntas do escopo terminaram no fallback (a meta permite no máximo 3 de 36). O Hit@K de 100% esconde parte do problema, porque ele mede o **arquivo** recuperado, não a **seção**:

| Pergunta | Tipo | O que aconteceu | Causa provável |
|---|---|---|---|
| 116 "quanto a Rango morde de comissão quando o cliente passa aqui e leva o pedido?" | parafrase | Recuperou `01-planos-e-taxas.md` (Os três planos, Comissão por plano, Exemplo), mas não a seção Retirada no balcão | Busca: a gíria ("passa aqui e leva") não puxa a seção de retirada, e a reescrita repetiu a pergunta como veio |
| 121 "consigo fazer um cupom de 60% pra bombar a segunda-feira?" | parafrase | Só 2 trechos passaram do `minScore` (0.58 e 0.56), nenhum da seção Desconto máximo | Busca: pergunta curta e informal, com score baixo; a seção certa ficou abaixo de 0.55 |
| 126 "Posso aceitar pagamento em dinheiro na entrega?" (perfil Plano Entrega) | perfil | Recuperou as seções certas (Restrições de cada forma e Dinheiro na entrega, 0.72 e 0.71) e mesmo assim devolveu o fallback | Modelo de resposta: precisava cruzar o plano do perfil com a regra ("não, no seu plano é sempre online") e preferiu o fallback |
| 134 "Como peço a remoção de uma avaliação…" → "E quanto tempo vocês levam para responder?" | multi_turno | A reescrita acertou o assunto e recuperou Moderação manual (0.73), que tem os 3 dias úteis, mas a resposta foi o fallback | Modelo de resposta: mesma oscilação já vista na pergunta 9 da `v2` |
| 135 "Um pedido venceu sem aceite…" → "E se eu não concordar com isso?" | multi_turno | A reescrita virou "como proceder se eu não concordar com o cancelamento automático"; veio Aceite do pedido, mas não a seção Contestação | Busca depois da reescrita: a palavra "contestar" não entrou na pergunta reescrita |

A pergunta 129 (multi_doc) também falhou, mas sem recusa: respondeu que o custo do Rango Chama é descontado do repasse, sem citar o valor (R$ 8,90). A pergunta pedia "como eu pago", então o termo esperado pede mais do que a pergunta; é um caso para rever na redação da pergunta, não no assistente.

Pela proposta da change, nada no RAG, nos prompts ou na base foi mudado para subir a métrica. Os candidatos para a onda 1 são a recuperação por seção nas paráfrases (116 e 121), a reescrita nas perguntas de continuação (135) e a decisão entre responder e devolver o fallback quando os trechos certos estão no contexto (126 e 134).

## Base anterior (histórico)

As rodadas abaixo usaram a base anterior (7 documentos, em [`docs/history/knowledge-base-v1/`](../../docs/history/knowledge-base-v1/README.md)) e as 20 perguntas antigas (ids 1 a 20).

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
