# Deploy do Chapa

Roteiro para publicar a demo: Vercel (preview por PR e produção na `main`), Supabase `prod` com a migração e a base ingerida, variáveis de ambiente e cron. Segue a spec [S09](docs/history/build-specs/S09-deploy.md) e as decisões dos ADRs [0003](docs/adr/0003-github-actions-e-vercel-cron.md), [0017](docs/adr/0017-neon-como-banco-dev.md) e [0014](docs/adr/0014-flash-lite-como-modelo-de-chat.md).

**Quem faz o quê.** "Pessoa" é a dona do projeto: só ela mexe em conta, segredo, visibilidade do repositório e Vercel. "Orquestrador" é o agente, e só executa um passo com a autorização registrada no `CLAUDE.md` (checkpoint H5).

**Regras que valem para todos os passos:**

- Nenhum valor de segredo entra em arquivo versionado, log, print ou mensagem. As variáveis ficam no `.env.local` (`dev`), no `.env.prod.local` (`prod`, só na raiz do checkout principal) e na Vercel.
- Local e preview usam o `dev` no Neon (ver "Banco `dev` no Neon"). Só a produção da Vercel e os passos 3 e 4 tocam o `prod`.
- Os comandos `npx supabase ...` e `npm run ...` rodam na raiz do repositório (ou no worktree da S09).

## Resumo

| # | Passo | Quem | Como verificar |
|---|---|---|---|
| 1 | Limites dos planos gratuitos | Orquestrador | Tabelas abaixo, com fonte e data; nenhuma condição de parada |
| 2 | GitHub: CI verde e visibilidade | Pessoa | `gh run list --branch main --limit 1` → `success`; varredura de segredos vazia |
| 3 | Supabase `prod`: link e migração | Orquestrador (H5) | `db push` sem erro; RLS ligado nas 4 tabelas e 0 policies |
| 4 | Ingestão no `prod` | Orquestrador (H5) | Total impresso igual ao `count` e ao `/api/health` do passo 6 |
| 5 | Projeto e variáveis na Vercel | Pessoa | 4 variáveis em Production e 4 em Preview, nenhuma `NEXT_PUBLIC_` |
| 6 | Primeiro deploy de produção + smoke | Pessoa (smoke com autorização) | `npm run smoke -- --url <produção>` → 7 ✅ |
| 7 | Preview + smoke | Pessoa (smoke com autorização) | `npm run smoke -- --url <preview>` → 7 ✅, contra o `dev` |
| 8 | Cron | Pessoa | Cron listado; log da primeira execução com status 200 |
| 9 | Teste manual no navegador | Pessoa | Checklist do passo 9 inteiro marcado |
| 10 | Registrar a URL de produção | Pessoa ou orquestrador | Seção "Links da demo" preenchida |

---

## 1. Verificar os limites dos planos gratuitos

**Quem:** orquestrador. **Conferido em:** 06/11/2026. Os limites mudam: confira de novo se este passo tiver mais de um mês.

**Condições de parada da spec:** (a) duração máxima de função menor que o `maxDuration` da rota de chat (60 s, em `src/app/api/chat/route.ts`); (b) cron diário não permitido. **Nenhuma das duas acontece** (300 s ≥ 60 s; o plano Hobby permite cron uma vez por dia). O `vercel.json` não precisou mudar.

### Vercel Hobby

| Limite | Valor | Impacto no Chapa | Fonte (consultada em 06/11/2026) |
|---|---|---|---|
| Duração máxima de função (Fluid compute, Node.js) | 300 s, padrão e máximo | A rota de chat pede 60 s: cabe | [Functions Limits](https://vercel.com/docs/functions/limitations) (página atualizada em 24/08/2026) |
| Cron jobs | 100 por projeto; intervalo mínimo de **uma vez por dia**; precisão por hora (±59 min). Expressão mais frequente falha no deploy | `0 6 * * *` é diário: roda entre 06:00 e 06:59 UTC (03:00 a 03:59 em Brasília) | [Usage & Pricing for Cron Jobs](https://vercel.com/docs/cron-jobs/usage-and-pricing) (15/07/2026) |
| Cron: ambiente e retentativa | Roda só no deploy de produção; não tenta de novo se falhar; pode pular ou repetir uma execução | A limpeza é idempotente (apaga por data); preview nunca roda o cron | [Managing Cron Jobs](https://vercel.com/docs/cron-jobs/manage-cron-jobs) (11/08/2026) |
| Cron Jobs como recurso | Marcado como "legado", com migração futura para Schedules | Continua funcionando pelo `vercel.json`; migrar fica para outra tarefa se a Vercel exigir | Mesma página |
| Uso mensal incluído | 1.000.000 de invocações; 4 h de Active CPU; 360 GB-h de memória provisionada; 100 GB de Fast Data Transfer; 10 GB de Fast Origin Transfer | Muito acima do uso de uma demo | [Fair Use Guidelines](https://vercel.com/docs/limits/fair-use-guidelines) (14/09/2026) |
| Uso comercial | Hobby é só para uso pessoal e não comercial | Projeto de estudo, sem anúncio nem cobrança: ok | Mesma página |
| Logs de runtime | Guardados por **1 hora** no Hobby | No passo 8, leia o log do cron logo depois da execução | [Limits](https://vercel.com/docs/limits) (16/09/2026) |
| Repositório Git | Projeto Hobby não conecta a repositório de **organização** do GitHub | O repositório precisa estar na conta pessoal | Mesma página |
| Deploys | 100 por dia; 1 build por vez; 45 min por build | Suficiente | Mesma página |
| Corpo da requisição | 4,5 MB | A API já limita a 4 KB | [Functions Limits](https://vercel.com/docs/functions/limitations) |
| Deployment Protection | "Standard Protection" com Vercel Authentication protege tudo menos os domínios de produção; "Protection Bypass for Automation" existe em todos os planos (header `x-vercel-protection-bypass`) | O preview responde 401/redirect para quem não está logado. O smoke usa `VERCEL_AUTOMATION_BYPASS_SECRET` (passo 7) | [Deployment Protection](https://vercel.com/docs/deployment-protection) e [Protection Bypass for Automation](https://vercel.com/docs/deployment-protection/methods-to-bypass-deployment-protection/protection-bypass-automation) (15 e 16/09/2026) |
| Instant Rollback | No Hobby, só para o deploy de produção **imediatamente anterior** | Ver "Como desfazer" | [Instant Rollback](https://vercel.com/docs/instant-rollback) (07/07/2026) |

### Supabase Free

| Limite | Valor | Impacto no Chapa | Fonte (consultada em 06/11/2026) |
|---|---|---|---|
| Projetos | 2 projetos ativos grátis (projetos pausados não contam) | Só o `prod`: sobra uma vaga (o `dev` está no Neon, ADR 0017) | [Pricing](https://supabase.com/pricing) e [Billing on Supabase](https://supabase.com/docs/guides/platform/billing-on-supabase) |
| Banco | 500 MB por projeto; 5 GB de egress (mais 5 GB em cache) | A base tem 35 trechos de 768 dimensões (passo 4): bem abaixo | [Pricing](https://supabase.com/pricing) |
| Pausa por inatividade | Projeto com pouca atividade no banco num período de **7 dias** é pausado. "Algumas requisições ao banco por dia" na última semana evitam a pausa. Pausado, volta pelo painel (**Resume project**) em até 1 ano, com os dados | `prod`: o cron diário faz consultas no banco e mantém o projeto ativo (ADR 0003) | [Free plan pausing](https://supabase.com/docs/guides/platform/free-plan-pausing) (página sem data) |

### Neon Free

| Limite | Valor | Impacto no Chapa | Fonte (consultada em 10/11/2026) |
|---|---|---|---|
| Projetos | 100 projetos | O Chapa usa 1 (`chapa-dev`) | [Pricing](https://neon.com/pricing) e [Neon plans](https://neon.com/docs/introduction/plans) (página atualizada em 04/11/2026) |
| Armazenamento | 1 GB de Postgres por projeto, 20 GB no total da conta | A base tem 37 trechos de 768 dimensões (ver "Banco `dev` no Neon"): bem abaixo | Mesmas páginas |
| Computação | 100 CU-hora por projeto por mês, com autoscaling até 2 CU (8 GB de RAM). Ao esgotar as horas, a computação fica suspensa até o próximo ciclo | Um banco de desenvolvimento ocioso quase todo o tempo: suficiente | Mesmas páginas |
| Scale-to-zero | A computação suspende depois de **5 min** sem atividade e acorda na próxima conexão. No Free, não dá para desligar | A primeira requisição depois de 5 min ocioso demora alguns segundos a mais. O `dev` não é pausado por inatividade como no Supabase | Mesmas páginas |

### Gemini (Google AI Studio, plano gratuito)

Modelos configurados em `src/config.ts` hoje: **`gemini-3.5-flash-lite`** (chat e tarefas auxiliares, ADR 0014) e **`gemini-embedding-001`** (embeddings, 768 dimensões).

| Item | Valor | Fonte |
|---|---|---|
| Preço no plano gratuito | Os dois modelos são "Free of charge". No plano gratuito, o conteúdo enviado **pode ser usado** para melhorar os produtos do Google (a base só tem texto público e o smoke só usa dados fictícios) | [Pricing](https://aistudio.google.com/docs/pricing), consultada em 06/11/2026 |
| Onde ficam os limites por modelo | A página oficial não publica mais os números do plano gratuito: "Rate limits ... can be viewed in Google AI Studio" | [Rate limits](https://aistudio.google.com/docs/rate-limits) (antiga `ai.google.dev/gemini-api/docs/rate-limits`), consultada em 06/11/2026 |
| Escopo | Os limites valem **por projeto do Google Cloud, não por chave**. Se a chave da Vercel for do mesmo projeto que a do `.env.local`, a demo, o eval e a CLI dividem a mesma cota | Mesma página |
| Renovação diária | O RPD zera à meia-noite do horário do Pacífico (05:00 ou 06:00 em Brasília, conforme o horário de verão dos EUA) | Mesma página |
| Erro ao estourar | 429 `RESOURCE_EXHAUSTED`. A API do Chapa devolve 429 com "A demo atingiu o limite de uso do provedor de IA. Tente mais tarde." | Mesma página e `src/app/api/_lib/errors.ts` |

Cotas por modelo no painel de cotas do AI Studio, informadas pela pessoa em 06/11/2026:

| Modelo | RPM | RPD | Fonte |
|---|---|---|---|
| `gemini-3.5-flash-lite` | 15 | 500 | Painel de cotas do AI Studio da conta, consultado em 06/11/2026 ([ADR 0014](docs/adr/0014-flash-lite-como-modelo-de-chat.md)) |
| `gemini-embedding-001` | 100 | 1.000 | Painel de cotas do AI Studio da conta, consultado em 06/11/2026 |
| `gemini-3.8-flash` (só se usado via `CHAT_MODEL`) | 5 | 20 | Painel de cotas do AI Studio da conta, consultado em 06/11/2026 (ADR 0014) |

**Capacidade estimada da demo:** uma mensagem faz até 3 gerações (resumo, reescrita e resposta) e 1 embedding. Com 500 gerações por dia, a demo aguenta perto de **160 mensagens por dia**, menos o que o eval e a CLI gastarem no mesmo projeto do Google. Por minuto, as 15 gerações dão cerca de **5 mensagens por minuto** somando todos os usuários. Os embeddings (100 por minuto e 1.000 por dia) não são o gargalo. Além disso, a API limita cada IP a 10 mensagens por minuto e 100 por dia (`src/config.ts`).

---

## 2. GitHub: CI verde e visibilidade

**Quem:** pessoa.

1. Conferir que a CI da `main` está verde:
   ```bash
   gh run list --branch main --limit 1
   ```
   **Verificação:** a última execução está `completed` com `success`.
2. Antes de tornar o repositório público, rodar a varredura de segredos da spec (RF3):
   ```bash
   git grep -nE "AIza[0-9A-Za-z_-]{20,}|postgres(ql)?://[^ ]*:[^ @]+@|CRON_SECRET[=].+|IP_HASH_SECRET[=].+" -- ':!docs/history/build-specs/S09-deploy.md'
   git log --all --name-only --format= | grep -E '(^|/)\.env' | sort -u
   ```
   **Verificação:** o primeiro comando não imprime nada; o segundo imprime só `.env.example`. O `[=]` é o mesmo `=` da regex da spec, escrito de um jeito que não casa com o próprio texto do comando; a spec S09 fica de fora porque traz a regex original, que casa consigo mesma.
3. Decidir se o repositório fica público a partir de agora (GitHub → Settings → General → Danger Zone → Change visibility). Lembrete: o plano Hobby da Vercel só importa repositório da conta pessoal, não de organização.

## 3. Supabase `prod`: link e migração

**Quem:** orquestrador, com a autorização do H5. Se a CLI pedir senha ou outra entrada interativa, parar e chamar a pessoa.

```bash
npx supabase projects list                    # o REFERENCE ID do projeto prod
npx supabase link --project-ref <ref-do-prod>
npx supabase db push --remote --yes           # --yes só em modo agente
```

**Verificação:** o `db push` aplica a migração sem erro, e as consultas abaixo (somente leitura) mostram o RLS ligado nas 4 tabelas e nenhuma policy:

```bash
npx supabase db query --remote --read-only "select relname, relrowsecurity from pg_class where relnamespace = 'public'::regnamespace and relkind = 'r' and relname in ('sessions','messages','document_chunks','rate_limits') order by relname"
npx supabase db query --remote --read-only "select count(*) as policies from pg_policies where schemaname = 'public'"
```

Esperado: 4 linhas com `relrowsecurity = true` e `policies = 0`.

**Atenção:** o link fica gravado em `supabase/.temp/` do diretório onde o comando rodou. Enquanto ele existir, qualquer `db push --remote` sem URL naquele diretório vai para o `prod`. Ao final deste passo, desfaça o link:

```bash
npx supabase unlink
```

O `dev` não usa link: os comandos dele sempre passam a URL com `--remote="$U"` (ver "Banco `dev` no Neon").

**Resultado:** ver "Registro da execução", no fim deste arquivo.

## 4. Ingestão no `prod`

**Quem:** orquestrador, com a autorização do H5.

A connection string do `prod` (pooler em modo transação, porta 6543) fica em `.env.prod.local`, na raiz do checkout principal, coberto pelo `.gitignore`. Carregue o arquivo **só dentro de um subshell**, para o `DATABASE_URL` do `prod` não ficar no seu terminal:

```bash
# na raiz do checkout principal
( set -a; . ./.env.prod.local; set +a; npm run ingest )
# a partir do worktree da S09
( set -a; . ../../chapa/.env.prod.local; set +a; npm run ingest )
```

Os scripts usam `--env-file-if-exists=.env.local`, que não sobrescreve variáveis do shell: o `DATABASE_URL` vem do `.env.prod.local`, e a `GEMINI_API_KEY`, do `.env.local`. Nunca rode `cat`, `echo` ou `grep` nesses arquivos.

**Verificação:** a saída lista cada arquivo da base, o `Total gravado`, o `Preset: padrao`, o modelo `gemini-embedding-001`, o `chunkConfig: markdown:1200:150` e a linha `Trechos no banco para este conjunto (count)`, que precisa ser igual ao total. A linha `Banco:` mostra só o host: no `prod`, o pooler do Supabase; no `dev`, um host que termina em `neon.tech`. Se aparecer `neon.tech` aqui, o `.env.prod.local` não foi carregado. A confirmação final de que o dado foi para o `prod` é o `chunks` do `/api/health` da produção no passo 6.

A ingestão é idempotente: ela substitui os trechos do mesmo modelo e `chunkConfig`. Rodar de novo não duplica nada.

## 5. Vercel: projeto e variáveis

**Quem:** pessoa.

1. Vercel → **Add New → Project** → importar o repositório do GitHub. O framework (Next.js) é detectado sozinho. Não altere os comandos de build.
2. **Settings → Build and Deployment → Node.js Version:** 24.x (o `package.json` já pede `>=24 <25`).
3. **Settings → Functions:** conferir que a região é `gru1` (São Paulo), que vem do `vercel.json`, e que o Fluid compute está ligado (padrão em projeto novo; é ele que dá os 300 s).
4. **Settings → Environment Variables.** Marque todas como **Sensitive**. Não crie nada em **Development** (o local usa o `.env.local`).

   | Variável | Production | Preview |
   |---|---|---|
   | `GEMINI_API_KEY` | chave do AI Studio | chave do AI Studio (a mesma ou outra; ver "Escopo" no passo 1) |
   | `DATABASE_URL` | pooler do **`prod`** (Supabase), porta 6543 | string com pooler do **`dev`** (Neon, host com `-pooler`) |
   | `IP_HASH_SECRET` | `openssl rand -hex 32` | outro `openssl rand -hex 32` |
   | `CRON_SECRET` | `openssl rand -hex 32` | outro `openssl rand -hex 32` |
   | `CHAT_MODEL`, `FAST_MODEL`, `EMBEDDING_MODEL` | não criar (valem os padrões de `src/config.ts`) | não criar |

   Nenhuma variável com prefixo `NEXT_PUBLIC_`. Gere os segredos direto no terminal e cole no painel; não os salve em arquivo do repositório. O `CRON_SECRET` só pode ter letras e números (vai num header HTTP); o `openssl rand -hex` já garante isso.
5. **Settings → Deployment Protection:** manter a **Standard Protection** (Vercel Authentication nos previews, produção pública). Em **Protection Bypass for Automation**, gerar um segredo para o smoke do passo 7.

**Verificação (RNF2):** a lista de variáveis mostra 4 em Production e 4 em Preview, nenhuma `NEXT_PUBLIC_`; abrindo o valor do `DATABASE_URL` de Preview no painel, o host é o do Neon (termina em `neon.tech`), nunca o pooler do Supabase com o usuário `postgres.<ref>` do `prod`. Mudança de variável só vale para deploys novos: depois de editar, faça **Redeploy**.

## 6. Primeiro deploy de produção

**Quem:** pessoa (o smoke também pode ser rodado pelo orquestrador, com autorização explícita).

1. O import do passo 5 dispara o primeiro deploy da `main`. Esperar o status **Ready**.
2. Rodar o smoke contra a URL de produção (`https://<projeto>.vercel.app`):
   ```bash
   npm run smoke -- --url https://<projeto>.vercel.app
   ```

**Verificação:** os 7 passos aparecem com ✅ e o comando sai com código 0. O passo 1 mostra o mesmo número de trechos do passo 4.

O smoke faz 3 chamadas ao chat, com 2 s entre elas: a pergunta no escopo e a fora do escopo gastam cota do Gemini; a do CPF é barrada antes. Ele grava uma sessão fictícia no banco, que o cron apaga depois de 7 dias sem uso.

Se falhar:

| Sintoma | Causa provável |
|---|---|
| Passo 1 com **500** | Variável de ambiente faltando na Vercel (o container nem é montado). Confira as 4 variáveis de Production e faça Redeploy |
| Passo 1 com **503** | Banco inacessível: `DATABASE_URL` errado ou projeto Supabase pausado |
| Passo 1 com `chunks = 0` | Ingestão não rodou no `prod` (passo 4) ou rodou com outro modelo/preset |
| Passo 2 com 429 | Cota do Gemini ou rate limit por IP. Espere e rode de novo |
| Passos 2 e 3 com **500** e o log da Vercel com `"error":"LlmRequestError"` | O Gemini recusou a chave (erro 4xx). Aconteceu em 06/11/2026: a `GEMINI_API_KEY` tinha sido colada com um espaço antes. Cole o valor de novo, sem aspas nem espaços, confira se a chave não tem restrição de IP ou referrer no Google Cloud e faça Redeploy |
| Passo 7 sem os headers | `next.config.ts` não está no deploy (confira o commit) |

## 7. Preview

**Quem:** pessoa.

1. Abrir um PR de teste (por exemplo, a branch `chore/preview-check` com uma mudança trivial num comentário). A Vercel comenta no PR com a URL de preview.
2. Como o preview fica atrás da Vercel Authentication, o smoke precisa do segredo de bypass do passo 5. Digite o segredo sem deixá-lo no histórico do shell:
   ```bash
   read -rs VERCEL_AUTOMATION_BYPASS_SECRET && export VERCEL_AUTOMATION_BYPASS_SECRET
   npm run smoke -- --url https://<preview>.vercel.app
   unset VERCEL_AUTOMATION_BYPASS_SECRET
   ```
3. Fechar o PR **sem merge** e apagar a branch.

**Verificação:** 7 ✅. O passo 1 mostra o total de trechos do `dev` no Neon (não do `prod`), e a sessão fictícia aparece no `dev`. Se só a primeira chamada falhar por timeout, repita uma vez: é o scale-to-zero do Neon acordando. Um 401 em todos os passos indica que o bypass não foi enviado ou está errado.

## 8. Cron

**Quem:** pessoa.

1. **Settings → Cron Jobs:** conferir que `/api/cron/cleanup` aparece com `0 6 * * *` e que os cron jobs não estão desabilitados.
2. A primeira execução acontece entre 06:00 e 06:59 UTC (03:00 a 03:59 em Brasília). Como o Hobby guarda os logs por só 1 hora, leia logo depois: **Cron Jobs → View Log**, ou **Logs** filtrando `requestPath:/api/cron/cleanup`. Para não esperar, a CLI da Vercel dispara o cron do deploy de produção na hora: `npx vercel crons run /api/cron/cleanup` (comando em beta; precisa de `npx vercel login` e `npx vercel link` antes).

**Verificação:** o log mostra status **200** e a linha `{"route":"/api/cron/cleanup","method":"GET","status":200,...}`. Esta é a primeira vez que o caminho de sucesso roda com o `CRON_SECRET` real.

- **401** em toda execução: o `CRON_SECRET` não está em Production, ou o deploy de produção é anterior à variável. Configure e faça Redeploy. O smoke não pega esse caso, porque testa justamente a chamada sem header.
- **500:** outra variável faltando (`DATABASE_URL`, por exemplo).

## 9. Teste manual no navegador

**Quem:** pessoa, na URL de produção, com o DevTools aberto na aba Network. Cobre também as checagens manuais da S07 que ficaram pendentes.

- [ ] Preencher o perfil do restaurante com dados fictícios.
- [ ] 3 perguntas no escopo (pode usar as 3 perguntas de exemplo): cada uma responde com fontes em badges.
- [ ] 1 pergunta fora do escopo ("Me passa uma receita de lasanha?"): mostra o aviso de fallback, **sem** badges de fonte.
- [ ] 1 mensagem bloqueada ("Meu CPF é 123.456.789-09"): aviso de bloqueio, e a mensagem não volta no histórico.
- [ ] Recarregar a página: o histórico volta igual (sem a mensagem bloqueada).
- [ ] **"Continuar depois":** copiar o link, abrir numa janela anônima e ver a mesma conversa; o `?sessao=` some da barra de endereço.
- [ ] Abrir `/?sessao=` com um UUID que não existe: aviso de que a conversa não existe mais e começo de uma nova.
- [ ] **"Nova conversa":** a tela limpa e a próxima mensagem abre outra sessão.
- [ ] **Teclado:** só com Tab, Shift+Tab e Enter, dá para enviar uma mensagem, abrir o perfil e copiar o link; o foco fica visível.
- [ ] **Modo escuro:** com o sistema em modo escuro, a página fica escura e legível.
- [ ] Largura de celular (DevTools, ~375 px): sem rolagem horizontal.
- [ ] Rodapé com o aviso de projeto não oficial.
- [ ] Na aba Network, o navegador só chama o próprio domínio (`/api/*`), nunca `generativelanguage.googleapis.com` nem `*.supabase.co`.

**Verificação:** todos os itens marcados. Um item que falhar vira tarefa separada (a S09 não muda código da aplicação).

## 10. Registrar a URL de produção

**Quem:** pessoa ou orquestrador. Preencher a seção "Links da demo" no fim deste arquivo, num PR. A S10 leva a URL para o README.

---

## Como desfazer

**Voltar a um deploy anterior (Vercel Instant Rollback).** No Hobby, só para o deploy de produção imediatamente anterior. Na página do projeto, no card **Production Deployment**, clique em **Instant Rollback**, confira e confirme. A troca é imediata. Depois do rollback, a Vercel **para de promover sozinha** os pushes na `main`; para voltar ao normal, use **Undo Rollback** no mesmo card (ou promova outro deploy). O rollback restaura também a definição do cron e o `CRON_SECRET` daquele deploy. Variáveis de ambiente editadas depois não entram no deploy restaurado.

**Corrigir pra frente.** Para qualquer outra coisa, abra um PR com o `git revert` do commit problemático; o merge na `main` gera um deploy novo.

**Reingerir a base no `prod`.** Rode de novo o passo 4. A ingestão substitui os trechos do mesmo modelo e `chunkConfig`, então serve tanto para atualizar a base quanto para recuperar de uma ingestão incompleta. Confira depois com o `/api/health` da produção (ou `npm run smoke`).

**Migração.** Não há migração de volta. Uma correção de schema vira uma migração nova, por PR, aplicada primeiro no `dev` (ver "Banco `dev` no Neon") e depois no `prod` (passo 3).

**Cron.** Para parar a limpeza sem deploy: **Settings → Cron Jobs → Disable Cron Jobs** (o ajuste persiste entre deploys e rollbacks). Lembre que sem o cron o `prod` pode ser pausado depois de 7 dias sem uso.

**Segredo vazado.** Gere outro (AI Studio para a `GEMINI_API_KEY`; Supabase → Database → Reset password para o `DATABASE_URL` do `prod`; Neon → Roles → Reset password para o `DATABASE_URL` e o `DATABASE_URL_UNPOOLED` do `dev`; `openssl rand -hex 32` para os outros), atualize na Vercel e no `.env*.local`, e faça Redeploy.

---

## Banco `dev` no Neon

Desde o [ADR 0017](docs/adr/0017-neon-como-banco-dev.md), o `dev` (local, `chat`, `eval`, `ingest` e Preview da Vercel) é um projeto Postgres do Neon Free. O Supabase fica só com o `prod`.

**Quem faz o quê.** A pessoa cria o projeto, grava as strings e mexe na Vercel e no painel do Supabase. O orquestrador roda o bootstrap, a migração, as consultas e a ingestão, com a autorização do `CLAUDE.md`.

1. **Projeto (pessoa).** No Neon, criar o projeto com **Postgres 17** (igual ao `prod`), na região `aws-sa-east-1` (São Paulo), no branch padrão `main`. Sem a integração da Vercel pelo Marketplace: ela cria variáveis sozinha, inclusive em Production.
2. **Strings de conexão (pessoa).** Gravar no `.env.local` do checkout principal, sem colar na conversa nem no terminal:
   - `DATABASE_URL`: a string **com pooler** (host com `-pooler`), que o app usa;
   - `DATABASE_URL_UNPOOLED`: a string **direta** (sem `-pooler`), só para a Supabase CLI.

   O `neon env pull --project-id <id> --branch main --file .env.local -e DATABASE_URL,DATABASE_URL_UNPOOLED` grava as duas e preserva as outras linhas.
3. **Bootstrap e migração (orquestrador).** Os comandos carregam o `.env.local` num subshell e passam a URL pela variável `U`, sem escrevê-la. O `U` é a string direta sem o parâmetro `channel_binding`, que o driver da CLI repassa ao servidor e o Neon recusa. O bootstrap cria o schema `extensions` e os papéis `anon` e `authenticated`, que a migração espera e só o Supabase traz prontos. Ele é idempotente e recusa rodar num projeto Supabase.

   ```bash
   # na raiz do checkout principal (ou no worktree com o link .env.local)
   ( set -a; . ./.env.local; set +a; U="${DATABASE_URL_UNPOOLED/channel_binding=require&/}"; U="${U/&channel_binding=require/}"; npx supabase db query --remote="$U" --yes -f supabase/dev-bootstrap.sql )
   ( set -a; . ./.env.local; set +a; U="${DATABASE_URL_UNPOOLED/channel_binding=require&/}"; U="${U/&channel_binding=require/}"; npx supabase db push --remote="$U" --dry-run )
   ( set -a; . ./.env.local; set +a; U="${DATABASE_URL_UNPOOLED/channel_binding=require&/}"; U="${U/&channel_binding=require/}"; npx supabase db push --remote="$U" --yes )
   ```

   Nunca rode `db push` no `dev` sem `--remote=` explícito: sem URL, ele vai para o projeto linkado. Nunca rode estes comandos com o `.env.prod.local` carregado.
4. **Verificação (orquestrador).** As mesmas consultas do passo 3, somente leitura, no `dev`:

   ```bash
   ( set -a; . ./.env.local; set +a; U="${DATABASE_URL_UNPOOLED/channel_binding=require&/}"; U="${U/&channel_binding=require/}"; npx supabase db query --remote="$U" --read-only "select relname, relrowsecurity from pg_class where relnamespace = 'public'::regnamespace and relkind = 'r' and relname in ('sessions','messages','document_chunks','rate_limits') order by relname" )
   ( set -a; . ./.env.local; set +a; U="${DATABASE_URL_UNPOOLED/channel_binding=require&/}"; U="${U/&channel_binding=require/}"; npx supabase db query --remote="$U" --read-only "select count(*) as policies from pg_policies where schemaname = 'public'" )
   ```

   Esperado: 4 linhas com `relrowsecurity = true` e `policies = 0`. O `--dry-run` de novo responde `Remote database is up to date`.
5. **Ingestão (orquestrador).**

   ```bash
   npm run ingest   # lê o DATABASE_URL do .env.local, que agora é o Neon
   ```

   Verificação: a linha `Banco:` mostra um host que termina em `neon.tech`, e o `Total gravado` é igual ao `count`.
6. **Preview (pessoa).** Na Vercel, trocar só o `DATABASE_URL` de **Preview** pela string com pooler do Neon (passo 5) e fazer Redeploy. Depois, o smoke do passo 7.
7. **Supabase `dev` antigo (pessoa).** Depois do smoke verde no preview, pausar o projeto no painel do Supabase, o que já libera a vaga. Só excluir depois de alguns dias sem problema no Neon, porque a exclusão não tem volta. Enquanto ele estiver só pausado, voltar é restaurá-lo e recolocar a string antiga no `.env.local` e no Preview.

---

## Registro da execução

### Passos 3 e 4 (H5 parcial, orquestrador, 06/11/2026)

Executados no worktree da S09 com a Supabase CLI 3.0.0, no projeto `chapa-prod` (`sa-east-1`). Nenhum comando pediu senha ou entrada interativa.

| Verificação | Resultado |
|---|---|
| `npx supabase db push --remote --dry-run` | 1 migração pendente: `20261106003144_schema_inicial.sql`, alvo `chapa-prod` |
| `npx supabase db push --remote --yes` | Aplicou `20261106003144_schema_inicial.sql` sem erro |
| RLS (`pg_class.relrowsecurity`) | `true` em `document_chunks`, `messages`, `rate_limits` e `sessions` |
| Policies em `public` (`pg_policies`) | 0 |
| `npm run ingest` (preset `padrao`) | 7 arquivos; `Total gravado: 35 trechos`; `gemini-embedding-001`; `markdown:1200:150`; `count` = 35; 1 chamada de embedding |
| Conferência direta no `chapa-prod` | 35 trechos de 7 arquivos, todos com `gemini-embedding-001` e `markdown:1200:150` |

Depois da conferência, o worktree voltou a ser linkado ao `dev`. O passo 6 confirma o mesmo total pelo `/api/health` da produção.

### Banco `dev` no Neon (orquestrador, 10/11/2026)

Executado no worktree da change `move-dev-database-to-neon`, com a Supabase CLI 3.0.0 e os comandos da seção "Banco `dev` no Neon", no projeto `chapa-dev` (`aws-sa-east-1`, Postgres 17.11). Host direto: `ep-wispy-forest-b6iqox05.c-2.sa-east-1.aws.neon.tech`; host com pooler: `ep-wispy-forest-b6iqox05-pooler.c-2.sa-east-1.aws.neon.tech`. Nenhum comando pediu senha ou entrada interativa.

| Verificação | Resultado |
|---|---|
| `db query --yes -f supabase/dev-bootstrap.sql`, duas vezes seguidas | `DO` e saída 0 nas duas: o script é idempotente |
| `db push --dry-run` | 1 migração pendente: `20261106003144_schema_inicial.sql` |
| `db push --yes` | Aplicou `20261106003144_schema_inicial.sql` sem erro |
| RLS (`pg_class.relrowsecurity`) | `true` em `document_chunks`, `messages`, `rate_limits` e `sessions` |
| Policies em `public` (`pg_policies`) | 0 |
| `db push --dry-run` depois da migração | `Remote database is up to date` |
| `npm run ingest` (preset `padrao`) | 7 arquivos; `Total gravado: 37 trechos`; `gemini-embedding-001`; `markdown:1200:150`; `Banco:` com o host do pooler do Neon; `count` = 37; 1 chamada de embedding |
| `npm run chat -- --nome "Pizzaria Bella" --debug`, pergunta sobre o prazo do repasse | Resposta com fontes (`02-repasse-financeiro.md`, `03-cancelamentos-e-contestacoes.md`); debug com 5 trechos e scores semântico e textual; 2 chamadas |

Na primeira tentativa, os comandos falharam por dois motivos, já corrigidos na seção: o `db query` pedia confirmação (`--yes`) e a string direta do `neon env pull` traz `channel_binding=require`, que o Neon recusa quando vem da CLI. O bootstrap também precisou virar um único comando `do`, porque o `db query -f` não aceita vários comandos num arquivo.

## Links da demo

- **Produção:** https://chapa-mu.vercel.app
- **Data do primeiro deploy:** 06/11/2026
- **Último smoke verde:** 06/11/2026, 7 de 7 passos e 37 trechos, com a `main` em `d383ad5` (#18)
