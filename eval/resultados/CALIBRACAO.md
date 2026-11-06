# Calibração do preset `padrao`

Registro das rodadas do protocolo RF7 da S08, todas contra o banco `dev` em 06/11/2026, com `gemini-3.5-flash-lite` (resposta e reescrita) e `gemini-embedding-001`, sem juiz e com `--delay-ms 4000`. Cada linha muda **uma variável** em relação ao candidato da linha anterior. Os números saem dos arquivos `.json` de mesmo nome, nesta pasta.

## Ponto de partida

| Rodada | Preset | Hit@K | Acerto | Recusa correta | Falsa recusa | Chamadas |
|---|---|---|---|---|---|---|
| [`v1`](v1.md) | `baseline` (fixed 500/100, minScore 0.7, sem reescrita) | 71,4% | 57,1% | 100% | 35,7% | 31 |
| [`v2-inicial`](v2-inicial.md) | `padrao` (markdown 1200/150, minScore 0.5, topK 5, alpha 0.7, com reescrita) | 100% | 85,7% | 100% | 14,3% | 42 |

Na `v2-inicial`, só a falsa recusa ficou fora da meta (≤ 10%), por causa das perguntas 9 e 13. Nas duas, os trechos certos vieram com score entre 0.61 e 0.71, e o modelo de resposta mesmo assim devolveu o fallback. As 4 perguntas fora do escopo passaram do `minScore` 0.5 (score máximo entre 0.50 e 0.61) e gastaram uma chamada de resposta para chegar ao fallback.

## Tentativas

| Data | Variável | Valor | Perguntas | Efeito | Rodada |
|---|---|---|---|---|---|
| 06/11/2026 | `minScore` | 0.55 | 4, 7, 10, 14, 15, 16, 17, 18 | 8/8 certas. As perguntas 15 e 17 caíram no fallback **sem** chamar o LLM de resposta (1 chamada em vez de 2). Nenhuma pergunta no escopo perdeu a resposta: o menor score máximo no escopo é 0.67 (pergunta 4) | [`cal-minscore-055`](cal-minscore-055.md) |
| 06/11/2026 | `minScore` | 0.6 | 4, 7, 10, 14, 15, 16, 17, 18 | A pergunta 14 (multi_doc) ficou com 1 trecho só, de `01-planos-e-taxas.md`: acertou o valor (R$ 42,40), mas perdeu o trecho do repasse e não soube o dia. A 18 também deixou de chamar o LLM. Pior que 0.55 | [`cal-minscore-060`](cal-minscore-060.md) |
| 06/11/2026 | `topK` | 5 (repetição, com minScore 0.55) | 9, 13, 14 | Controle de ruído: a 9 passou (falhou na `v2-inicial` com os mesmos trechos), então a falha dela varia entre execuções. A 13 continuou em fallback | [`cal-topk5-ms055`](cal-topk5-ms055.md) |
| 06/11/2026 | `topK` | 3 | 9, 13, 14 | A 14 voltou a errar: acertou o valor, mas a resposta não citou a quarta-feira. A 13 continuou em fallback. Pior que 5 | [`cal-topk3-ms055`](cal-topk3-ms055.md) |
| 06/11/2026 | `alpha` | 0.5 | 9, 13, 14 | As 3 erraram. A ordem dos trechos quase não mudou, mas os scores caíram (a parte textual é mais baixa), e com `minScore` 0.55 a 14 ficou com 1 trecho só. A 9 e a 13 caíram no fallback com os mesmos trechos de antes. Pior que 0.7 | [`cal-alpha05-ms055`](cal-alpha05-ms055.md) |
| 06/11/2026 | `rewriteQuery` | false | 11, 12 | A 11 ("Como funciona a comissão nesse caso?") caiu no fallback sem a reescrita, que traz o contexto do turno anterior. Manter `true` | [`cal-norewrite-ms055`](cal-norewrite-ms055.md) |

`chunkSize` não foi testado: o Hit@K já estava em 100% com o chunking por seção, e trocar o chunking exige reingerir.

Nas rodadas com `--only` sem nenhuma pergunta fora do escopo ou de bloqueio, o relatório mostra "Recusa correta 0,0%", porque a métrica é um número e o denominador é zero. Esse valor não tem significado nessas rodadas.

## Resultado

Valor gravado em `RAG_PRESETS.padrao`: **`minScore` 0.55**. `topK` 5, `alpha` 0.7, `rewriteQuery` true e o chunking (markdown 1200/150) ficaram como estavam. Como o chunking não mudou, não foi preciso reingerir.

| Rodada | Hit@K | Acerto | Recusa correta | Falsa recusa | Chamadas |
|---|---|---|---|---|---|
| [`v2`](v2.md) | 100% | 92,9% | 100% | 7,1% | 40 |

Todas as metas do RF2 foram atingidas na `v2`. A comparação completa está em [`COMPARACAO.md`](COMPARACAO.md).

## O que a calibração não resolve

- **Pergunta 13** ("Se eu pausar muito a loja, minha nota cai?") ficou em fallback nas 4 execuções, com os trechos dos dois documentos esperados entre os recuperados. A base diz que pausas frequentes reduzem a visibilidade e que as causas dos fechamentos pioram as métricas de desempenho, mas não diz que a pausa derruba a nota. O modelo de resposta trata isso como informação ausente. Não é um problema de parâmetro de busca: fica como ponto de análise para o prompt ou para a redação da pergunta, numa tarefa separada.
- **Pergunta 9** oscila entre resposta e fallback com os mesmos trechos. A variação vem do modelo de resposta, não da busca.
