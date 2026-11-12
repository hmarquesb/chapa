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

## Roteador de conversa (`v4`)

A `v4` é a nova linha de base: as mesmas 50 perguntas da `v3` e 12 novas (ids 151 a 162) para o roteador ([ADR 0025](../../docs/adr/0025-roteador-de-conversa-antes-do-rag.md)). Os tipos `cumprimento`, `conversa` e `misto` não entram no Hit@K, no acerto nem na recusa, então a `v4` continua comparável com a `v3` nessas linhas. Todas as rodadas rodaram em 6 blocos com `--delay-ms 4000 --append`, no mesmo commit (`a0d1cd8`), sem erros e sem estouro de cota. Relatórios: [`v4.md`](v4.md), [`v4-regras.md`](v4-regras.md) e [`v4-baseline.md`](v4-baseline.md).

| Rodada | Configuração | O que mede |
|---|---|---|
| `v4` | `padrao`, roteador ligado | A linha de base |
| `v4-regras` | `padrao`, `--router off` | Só a regra local de cumprimento: o que o roteador acrescenta |
| `v4-baseline` | `baseline`, roteador desligado | O preset antigo nas mesmas 62 perguntas |

| Métrica | Meta | v3 | v4 | v4-regras | v4-baseline |
|---|---|---|---|---|---|
| Acerto | registrar | 83,3% | 83,3% | 80,6% | 41,7% |
| Falsa recusa | ≤ 3 de 36 | 13,9% | 13,9% | 16,7% | 58,3% |
| Acerto de rota | ≥ 95% | — | 100,0% | 93,2% | 93,2% |
| Falso small talk | 0 | — | 0 | 0 | 0 |
| Chamadas evitadas | registrar | — | 8 | 4 | 4 |
| Acerto conversa / mistas | registrar | — | 100,0% / 100,0% | 0,0% / 100,0% | 0,0% / 50,0% |
| Latência curtas → RAG | registrar | — | 4279 ms | 3525 ms | 2787 ms |

**Leitura.**

- **O roteador cumpre as duas metas.** Na `v4`, o acerto de rota é 100% e o falso small talk é 0. As quatro perguntas `conversa` (155 a 158) recebem a resposta de conversa e as quatro `misto` (159 a 162) seguem para o RAG com a saudação e o dado pedido, sem nenhum falso small talk.
- **O que o roteador acrescenta (`v4` × `v4-regras`).** Com a regra local só, os quatro cumprimentos (151 a 154) passam, mas as quatro `conversa` caem no RAG e terminam em fallback: o acerto de conversa vai a 0%. São 4 chamadas evitadas a menos (8 contra 4).
- **Acerto de rota abaixo de 95% na `v4-regras` e na `v4-baseline` (93,2%).** É o resultado esperado de desligar o roteador, não uma regressão: as 4 perguntas `conversa` esperam a rota `conversa` e, sem o roteador, seguem para `rag`. A conta é 55 de 59 perguntas com rota definida (as de bloqueio não têm rota escolhida). Falso small talk continua 0 nas três, porque a regra de cumprimento só reconhece a mensagem inteira.
- **`v4-baseline`.** O acerto de `misto` cai para 50%: as perguntas 160 e 162 devolvem o fallback, porque o preset antigo (`minScore` 0.7, trechos de 500 caracteres e sem reescrita) não recupera a seção certa. Isso repete a leitura da `v3` sobre o `baseline` (acerto de 41,7% e falsa recusa de 58,3%).
- **Acerto e falsa recusa da `v4` são os da `v3`, mas não as mesmas perguntas.** Na `v4` falharam 116, 119, 121, 124, 129 e 134; na `v3` foram 116, 121, 126, 129, 134 e 135. A 119 e a 124 entraram e a 126 e a 135 saíram, sem mudança no RAG, nos prompts ou na base: é a oscilação de uma rodada com 36 perguntas, em que cada uma vale 2,8 pontos. A falsa recusa continua acima da meta pelos motivos da seção "Por que a falsa recusa ficou acima da meta", acima.
- **Latência e custo.** A `v4` fez 144 chamadas e 99 mil tokens de entrada, contra 106 chamadas e 72 mil da `v3`, porque tem 12 perguntas a mais. Os percentis de latência da `v4` (p50 de 1942 ms, p95 de 5865 ms) ficaram abaixo dos da `v3`, mas a diferença do p95 vem principalmente de variação da API em rodadas diferentes e não deve ser atribuída ao roteador. Nas perguntas de conversa, os cumprimentos levam cerca de 0,2 s (resposta local) e as quatro `conversa` cerca de 1 a 1,5 s, sem passar pela busca.

## Contexto por documento (`v5`)

A `v5` é a nova linha de base: 73 perguntas (45 no escopo, 16 de recusa e 12 de conversa; ids 101 a 173). Entraram 11 perguntas novas (163 a 173), entre elas as 4 `aberta`. Como o conjunto mudou, a `v5` não se compara com a `v4` ou a `v3` nas métricas absolutas; o que se compara é a `v5-baseline` (o código novo com `contextMode: "chunks"`, o comportamento antigo) com as rodadas seguintes, que mudam uma variável por vez. Todas rodaram em blocos com `--delay-ms 4000 --append`, sem erros ([ADR 0027](../../docs/adr/0027-busca-por-trecho-contexto-por-documento.md)). A trilha de cada passo, com a decisão, está no [`CALIBRACAO.md`](CALIBRACAO.md).

| Métrica | Meta | v5-baseline | v5-docs | v5-prompt | v5 |
|---|---|---|---|---|---|
| Contexto enviado | — | `chunks` | `documents` | `documents` | `documents` |
| `minScore` | — | 0.55 | 0.55 | 0.55 | 0.50 |
| Hit@K | ≥ 85% | 95,6% | 95,6% | 95,6% | 97,8% |
| Acerto | ≥ 80% | 68,9% | 91,1% | 91,1% | 91,1% |
| Recusa correta | ≥ 92% | 100,0% | 100,0% | 100,0% | 100,0% |
| Falsa recusa | ≤ 10% | 26,7% | 6,7% | 4,4% | 6,7% |
| Contexto suficiente | sem meta | 88,9% | 97,8% | 97,8% | 100,0% |
| Latência p50 / p95 | registrar | 3941 / 26589 ms | 3356 / 18672 ms | 2598 / 12803 ms | 2850 / 7918 ms |
| Chamadas | registrar | 175 | 173 | 175 | 177 |
| Tokens de entrada / saída | registrar | 120255 / 3331 | 250446 / 3107 | 261186 / 3008 | 270023 / 3222 |
| Erros | — | 0 | 0 | 0 | 0 |

**Leitura.**

- **O contexto por documento resolve a maior parte da falsa recusa.** Da `v5-baseline` para a `v5-docs`, o acerto foi de 68,9% para 91,1% e a falsa recusa, de 26,7% para 6,7%. Dez perguntas passaram de erro a acerto (116, 119, 124, 126, 132, 134, 163, 165, 168 e 170) e nenhuma piorou; repetidas ([`v5-docs-rep`](v5-docs-rep.md)), as dez acertaram de novo. O Hit@K não mudou, porque o arquivo certo já vinha: o que faltava era o resto do documento.
- **O preço é o consumo.** Os tokens de entrada foram de 120 mil para 250 mil (cerca do dobro). As latências p95 não são uma medida limpa do modo: a `v5-docs` esbarrou na cota no meio da rodada e parte das perguntas foi refeita com `--append`.
- **Recusa correta não se mexe.** As 16 perguntas de recusa terminam em fallback ou bloqueio nas quatro rodadas, e a `v5` não tem falso small talk.
- **O prompt fica, mas sem ganho mensurável.** Na `v5-prompt` o acerto é o mesmo e a falsa recusa cai para 4,4%. Duas perguntas mudaram: a 135 piorou e a 164 melhorou; repetidas duas vezes, a 135 acertou numa e errou na outra e a 164 errou nas duas. É ruído, não efeito do prompt.
- **O `minScore` 0.50 melhora a cobertura.** O contexto suficiente vai a 100% e o Hit@K a 97,8%. A falsa recusa volta a 6,7% (3 de 45, contra 2 de 45 na `v5-prompt`), uma pergunta de diferença, dentro do ruído.
- **O que sobra na `v5`.** Três falsas recusas: 121 e 171 (geração: os trechos certos vieram e o modelo devolveu o fallback) e 164 (busca: o arquivo esperado não veio). A pergunta 129 responde sem o valor esperado, o caso de redação já registrado na `v3`.

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
