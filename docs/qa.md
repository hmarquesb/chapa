# QA

> Como verificar uma mudança antes de declarar que ela está pronta. A definição de pronto está no [`AGENTS.md`](../AGENTS.md#fluxo-de-trabalho-com-changes-do-openspec). O deploy e o teste em produção estão no [`DEPLOY.md`](../DEPLOY.md).

## Ordem de verificação

1. **Portões automáticos**, que rodam sem rede, sem banco e sem chave: lint, tipos, testes e, quando a mudança toca rotas, páginas ou configuração do Next, build.
2. **Verificação manual local**: a interface no navegador ou a conversa pela CLI. Usa a API do Gemini e o banco `dev`, então precisa de autorização. Numa change do OpenSpec, quem faz é o orquestrador, depois de revisar o diff, ou a pessoa; o implementador só lista o que conferir.
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
npm run dev                                                          # http://localhost:3000 (pede AUTH_SECRET)
npm run chat -- --nome "Pizzaria Bella" --plano proprio --debug  # ⚠️ chama a API
npm run chat -- --sessao <uuid> --debug                              # retoma uma conversa do CLI
```

- O `--debug` mostra a pergunta reescrita, os trechos com score semântico e textual, as chamadas, os tokens e a latência. É o jeito mais rápido de entender por que uma resposta caiu no fallback.
- **Login:** sem cookie, `/` leva a `/entrar`. "Testar como demo" leva ao chat, com a faixa "Conta de demonstração. Ela e as conversas são apagadas em 7 dias." e o menu da conta. Nas ferramentas do navegador, o cookie `authjs.session-token` é `HttpOnly` e `SameSite=Lax`. "Sair" volta a `/entrar`, e abrir `/` de novo leva a `/entrar`. A 6ª demo do dia no mesmo IP mostra "Muitas contas de demonstração criadas a partir desta rede hoje. Entre com Google para continuar testando." (no local, todos os pedidos dividem o IP). `POST /api/chat` sem cookie responde `401`.
- **Perfil:** a demo cai direto no chat, com o resumo "Marmitaria Boa Panela · Plano Misto". Uma conta Google nova é levada a `/perfil` ("Conte sobre o seu restaurante"), e sem escolher o plano não salva. Em "Editar perfil", troque o plano e pergunte "Qual é a comissão por pedido?": a resposta muda com o plano (a conversa já aberta também). `PUT /api/profile` sem plano responde `400`.
- **Excluir conta e privacidade:** "Excluir minha conta" abre o diálogo de confirmação; ao confirmar, a pessoa sai e a conta e as conversas somem. `/privacidade` abre sem login e tem o aviso, o que a conta guarda e a tabela de retenção; o link aparece em `/entrar`, no rodapé do chat e em `/perfil`.
- **Marca:** `/marca` abre sem login, nos dois temas e a 390 px sem rolagem horizontal; o `ThemeToggle` troca o tema, os componentes aparecem (o campo de mensagem não envia nada: sem `POST /api/chat` no log), e `/opengraph-image`, `/apple-icon` e `/icon.svg` abrem. O link "Marca" aparece no rodapé do chat e de `/entrar`.
- **Google em `localhost`** (pessoa, com o cliente OAuth no `.env.local`): "Entrar com Google" cria a conta só com o `sub` e o e-mail, e o menu mostra o e-mail. Sem as credenciais do Google, a tela mostra só "Testar como demo".
- `npm run chat` e `npm run eval` não passam pelo login: as conversas deles não têm conta, e a web não as enxerga (e o CLI não abre conversas da web).
- **Mudou uma consulta de conversa** (`src/infra/db/session-repository.ts`)? Rode `npm run authz-check` no `dev` (⚠️ grava no banco, só com autorização; recusa hosts que não sejam do Neon). Ele cria duas contas demo e uma conversa, confere o dono em cada consulta e apaga tudo.
- Na interface, confira pelo menos: uma pergunta respondida com fontes, uma fora do escopo (fallback), uma com CPF fictício (bloqueio), a lista de conversas (a conversa aparece ao responder, abre o histórico ao clicar e some depois de apagada) e o botão "Nova conversa". Recarregar a página abre uma conversa nova. Com duas demos em navegadores diferentes, uma não vê a conversa da outra, e `/?sessao=<id>` não abre nada.
- **Screenshots e originalidade:** com o `npm run dev`, rode `npm run screenshots -- --url http://localhost:3000` (⚠️ cria 1 conta demo) e revise as imagens nos dois temas e tamanhos. Checklist de originalidade, a preencher no PR:
  - [ ] A paleta não usa vermelho, laranja vivo, amarelo ou verde-vivo como cor principal.
  - [ ] O logo e o ícone não lembram nenhuma empresa real de delivery.
  - [ ] Nenhum nome, ícone ou ilustração de empresa real.
  - [ ] Revisado lado a lado com as marcas de delivery mais conhecidas no Brasil.
- O `dev` roda no Neon, que suspende a computação depois de 5 min ocioso: a primeira requisição depois disso pode demorar alguns segundos.
- Fora da Vercel não há cabeçalho de IP, então todas as requisições locais caem no mesmo balde do rate limit.

## Avaliação

`npm run eval` passa as 50 perguntas de [`eval/perguntas.json`](../eval/perguntas.json) (36 no escopo e 14 de recusa, com os ids 101 a 150) pelo mesmo `handleMessage` da API, no banco `dev`, e grava um `.json` e um `.md` em [`eval/resultados/`](../eval/resultados/). As métricas e as metas estão em [`business.md`](business.md#metas-de-qualidade).

```bash
npm run ingest -- --preset padrao                                   # ⚠️ antes, se a base, o chunking ou o modelo mudou
npm run eval -- --label <nome> --preset padrao --delay-ms 4000 --append --only 101,102,103,104,105,106,107,108,109,110   # ⚠️ um bloco
npm run eval -- --label <nome> --preset padrao --only 116,121       # só algumas perguntas, sobrescrevendo o arquivo
npm run eval -- --label <nome> --preset padrao --min-score 0.5 --only 116,121
npm run eval -- --label <nome> --preset padrao --no-rewrite --only 135
npm run eval -- --compare eval/resultados/v2.json eval/resultados/<nome>.json
```

**Rodada completa em blocos.** Uma rodada das 50 perguntas faz de 100 a 225 chamadas (a `v3` fez 106, sem juiz) e não deve ir de uma vez na cota gratuita. Rode em blocos de 10 com `--append`, que junta cada bloco ao `eval/resultados/<label>.json` existente e recalcula as métricas:

```bash
npm run eval -- --label v3 --preset padrao --delay-ms 4000 --append --only 101,102,103,104,105,106,107,108,109,110
npm run eval -- --label v3 --preset padrao --delay-ms 4000 --append --only 111,112,113,114,115,116,117,118,119,120
npm run eval -- --label v3 --preset padrao --delay-ms 4000 --append --only 121,122,123,124,125,126,127,128,129,130
npm run eval -- --label v3 --preset padrao --delay-ms 4000 --append --only 131,132,133,134,135,136,137,138,139,140
npm run eval -- --label v3 --preset padrao --delay-ms 4000 --append --only 141,142,143,144,145,146,147,148,149,150
```

- Cada bloco termina com `Pendentes: <ids>`; a rodada está completa com `Pendentes: nenhuma`.
- O `--append` para antes de abrir o banco se o preset, os modelos ou o RAG forem diferentes dos da rodada gravada. Uma pergunta que mudou no `perguntas.json` depois de rodar é descartada e volta para os pendentes.
- Uma pergunta que termina em erro (não em resposta) é repetida uma vez com `--append --only <id>` antes de entrar na conta, e a repetição fica registrada.
- Sem `--append`, o arquivo do rótulo é sobrescrito, como antes.

Regras:

- **Mesmo preset na ingestão e na rodada.** Os trechos de cada preset convivem no `dev`, separados por `embedding_model` e `chunk_config`.
- **Uma variável por vez** na calibração, com `--only` nas perguntas afetadas para economizar cota. Cada tentativa vira uma linha em [`eval/resultados/CALIBRACAO.md`](../eval/resultados/CALIBRACAO.md): data, variável, valor, perguntas e efeito.
- **Uma rodada é ruidosa.** Com 36 perguntas no escopo, cada uma vale 2,8 pontos. Antes de concluir que algo piorou, repita as perguntas que mudaram.
- **Cota.** Use `--delay-ms` para respeitar o limite por minuto. Se a cota estourar, o eval grava o parcial (junto ao que já estava, com `--append`): espere e continue com `--append --only` nos pendentes, sem trocar de modelo. Espere cerca de 90 s entre uma ingestão e uma rodada.
- **Linhas de base.** A `v3` é a linha de base da base da Rango. As rodadas `v1`, `v2` e `cal-*` usaram a base anterior e outras perguntas: não compare com elas ([`COMPARACAO.md`](../eval/resultados/COMPARACAO.md)).
- O juiz (`--judge`) é opcional e gasta uma chamada a mais por pergunta.
- As sessões do eval usam o canal `eval` e são apagadas pelo cron depois de 7 dias.

## Smoke na demo publicada

```bash
npm run smoke -- --url https://<deploy>.vercel.app   # ⚠️ chama a demo publicada
```

Só com autorização: contra a produção, ele gasta a cota do Gemini da demo.

Passos: `GET /api/health`; `POST /api/chat` sem cookie → `401`; `GET /entrar` → `200`; entrar como demo (`GET /api/auth/csrf` e `POST /api/auth/callback/demo`) → cookie de sessão; `GET /api/profile` com o perfil da demo (plano `misto`); as três mensagens (respondida, fallback e CPF bloqueado) com o cookie; o histórico com o cookie e o `sessionId` devolvido no primeiro chat; `GET /api/sessions` com a conversa na lista; `GET /api/cron/cleanup` sem `Authorization` → `401`; `GET /` com o cookie e os cabeçalhos de segurança. O smoke nunca imprime o cookie nem o `csrfToken`.

Depois do deploy, cole o endereço da produção no inspetor de posts do LinkedIn (Post Inspector) para conferir o cartão de compartilhamento (imagem, título e descrição) e forçar uma nova leitura, porque o LinkedIn guarda a pré-visualização em cache. É uma verificação humana.

**Cada rodada cria uma conta demo e gasta 1 das 5 demos do IP no dia (UTC).** Na 6ª rodada do dia, o passo do login falha com a dica do limite: rode de novo no dia seguinte ou de outra rede. Também funciona contra o `npm run dev` (`--url http://localhost:3000`). O passo a passo do teste manual em produção está no [`DEPLOY.md`](../DEPLOY.md#9-teste-manual-no-navegador).

## Regras de portão

- Não declare uma mudança pronta com um portão vermelho. Se um portão falha por causa de trabalho paralelo, registre no relatório e avise o orquestrador.
- Todo critério de aceite é conferido um a um, com o comando e a saída resumida como evidência.
- Uma mudança que pode alterar as respostas não está pronta sem uma rodada de avaliação, ou sem a pendência registrada no PR para a pessoa autorizar.
- Documentação pura (`docs/`, `README.md`, `AGENTS.md`) passa só pelo lint e pela revisão.
- Para economizar contexto, corte a saída dos portões (`npm test 2>&1 | tail -15`). Se algo falhar, rode de novo só o arquivo que falhou.
