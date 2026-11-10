# QA

> Como verificar uma mudança antes de declarar que ela está pronta. A definição de pronto está no [`AGENTS.md`](../AGENTS.md#fluxo-de-trabalho-com-changes-do-openspec). O deploy e o teste em produção estão no [`DEPLOY.md`](../DEPLOY.md).

## Ordem de verificação

1. **Portões automáticos**, que rodam sem rede, sem banco e sem chave: lint, tipos, testes e, quando a mudança toca rotas, páginas ou configuração do Next, build.
2. **Verificação manual local**: a interface no navegador ou a conversa pela CLI. Usa a API do Gemini e o banco `dev`, então precisa de autorização.
3. **Avaliação**, quando a mudança pode alterar as respostas (prompt, RAG, memória, guardrails, base, modelo).
4. **Smoke na demo publicada**, depois do deploy.

Os passos 2 a 4 chamam API ou banco real. Nenhum agente roda esses passos sem autorização explícita na tarefa ([`AGENTS.md`](../AGENTS.md#custo-e-cota-de-api)).

## Portões automáticos

```bash
npm run lint        # biome check .
npm run typecheck   # tsc --noEmit
npm test            # vitest run
npm run build       # next build
```

- A CI (GitHub Actions) roda os quatro em todo push e PR, sem segredos. Um PR só entra na `main` com a CI verde.
- Para conferir que os testes não dependem de rede nem de variáveis de ambiente: `env -i PATH="$PATH" HOME="$HOME" npm test`.
- `npm run format` corrige a formatação. Rode antes do lint quando ele reclamar só de formato.
- As changes do OpenSpec também passam por `npx openspec validate <change>`.

## Verificação manual local

```bash
npm run dev                                                          # http://localhost:3000
npm run chat -- --nome "Pizzaria Bella" --plano "Plano Básico" --debug   # ⚠️ chama a API
npm run chat -- --sessao <uuid> --debug                              # retoma uma sessão
```

- O `--debug` mostra a pergunta reescrita, os trechos com score semântico e textual, as chamadas, os tokens e a latência. É o jeito mais rápido de entender por que uma resposta caiu no fallback.
- Na interface, confira pelo menos: uma pergunta respondida com fontes, uma fora do escopo (fallback), uma com CPF fictício (bloqueio), o recarregar da página (histórico volta), o link de continuação e o botão "Nova conversa".
- Fora da Vercel não há cabeçalho de IP, então todas as requisições locais caem no mesmo balde do rate limit.

## Avaliação

`npm run eval` passa as perguntas de [`eval/perguntas.json`](../eval/perguntas.json) pelo mesmo `handleMessage` da API, no banco `dev`, e grava um `.json` e um `.md` em [`eval/resultados/`](../eval/resultados/). As métricas e as metas estão em [`business.md`](business.md#metas-de-qualidade).

```bash
npm run ingest -- --preset padrao                                   # ⚠️ antes, se o chunking ou o modelo mudou
npm run eval -- --label <nome> --preset padrao --delay-ms 4000      # ⚠️ 60 a 90 chamadas
npm run eval -- --label <nome> --preset padrao --only 3,9           # só algumas perguntas
npm run eval -- --label <nome> --preset padrao --min-score 0.5 --only 3,9
npm run eval -- --label <nome> --preset padrao --no-rewrite --only 11
npm run eval -- --compare eval/resultados/v1.json eval/resultados/<nome>.json
```

Regras:

- **Mesmo preset na ingestão e na rodada.** Os trechos de cada preset convivem no `dev`, separados por `embedding_model` e `chunk_config`.
- **Uma variável por vez** na calibração, com `--only` nas perguntas afetadas para economizar cota. Cada tentativa vira uma linha em [`eval/resultados/CALIBRACAO.md`](../eval/resultados/CALIBRACAO.md): data, variável, valor, perguntas e efeito.
- **Uma rodada é ruidosa.** Com 14 perguntas no escopo, cada uma vale 7,1 pontos. Antes de concluir que algo piorou, repita as perguntas que mudaram.
- **Cota.** Use `--delay-ms` para respeitar o limite por minuto. Se a cota estourar, o eval grava o parcial: espere e continue com `--only`, sem trocar de modelo. Espere cerca de 90 s entre uma ingestão e uma rodada.
- O juiz (`--judge`) é opcional e gasta uma chamada a mais por pergunta.
- As sessões do eval usam o canal `eval` e são apagadas pelo cron depois de 7 dias.

## Smoke na demo publicada

```bash
npm run smoke -- --url https://<deploy>.vercel.app   # ⚠️ chama a demo publicada
```

Só com autorização: contra a produção, ele gasta a cota do Gemini da demo. O passo a passo do teste manual em produção está no [`DEPLOY.md`](../DEPLOY.md#9-teste-manual-no-navegador).

## Regras de portão

- Não declare uma mudança pronta com um portão vermelho. Se um portão falha por causa de trabalho paralelo, registre no relatório e avise o orquestrador.
- Todo critério de aceite é conferido um a um, com o comando e a saída resumida como evidência.
- Uma mudança que pode alterar as respostas não está pronta sem uma rodada de avaliação, ou sem a pendência registrada no PR para a pessoa autorizar.
- Documentação pura (`docs/`, `README.md`, `AGENTS.md`) passa só pelo lint e pela revisão.
