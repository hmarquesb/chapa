# S09 — Deploy na Vercel e banco de produção

| Campo | Valor |
|---|---|
| **ID** | S09 |
| **Status** | ✅ Aprovada |
| **Depende de** | S06, S07 (e S08 com a v2 calibrada, para o preset `padrao` final) |
| **Chamadas reais de API** | Só com autorização (H5): ingestão no `prod` e o teste de fumaça contra o preview e a produção |

## Escopo

Publica a demo: projeto na Vercel com preview por PR e produção na `main`, banco `prod` com a migração e a base ingerida, variáveis de ambiente e cron. O agente escreve o script de fumaça e o roteiro. A pessoa executa os passos que exigem conta, segredo ou publicação.

**Entrega:**
- `scripts/smoke.ts`, que testa um ambiente publicado pela API.
- `DEPLOY.md` com o roteiro passo a passo, incluindo a verificação dos limites dos planos gratuitos.
- Depois do H5: demo no ar, com os links registrados.

**Fora do escopo:**
- Mudanças de código da aplicação. Problema encontrado no deploy vira tarefa separada.
- README final (S10).

**Arquivos que podem ser criados ou alterados:**
- `scripts/smoke.ts`
- `scripts/smoke-checks.ts` (+ `.test.ts`): asserções puras sobre as respostas
- `DEPLOY.md`
- `vercel.json`, só se a verificação de limites exigir (por exemplo, a frequência do cron)

**Não tocar:**
- `src/`, `supabase/migrations/`, `knowledge-base/`, `eval/`

## Contexto

- Seções do `ARCHITECTURE.md`: "Infraestrutura" e "Automação".
- Problema que resolve: a demo pública é o que quem avalia o projeto vai abrir primeiro. O deploy precisa manter a chave só no servidor, não misturar dados de teste com os da demo e não custar nada.
- Decisões já tomadas:
  - Vercel na região `gru1`. Preview por PR (usa o Supabase `dev`) e produção na `main` (usa o `prod`).
  - Supabase `dev` e `prod` em `sa-east-1`.
  - Gemini no plano gratuito, sem cartão.
  - Ingestão, migrações, rodadas de eval e merge na `main` são manuais, de propósito.
  - O repositório no GitHub já existe desde o H0b, e a `main` só recebe código por PR.
  - Variáveis: `GEMINI_API_KEY`, `DATABASE_URL`, `IP_HASH_SECRET`, `CRON_SECRET` e, opcionalmente, `CHAT_MODEL`, `FAST_MODEL` e `EMBEDDING_MODEL`. Nenhuma com prefixo `NEXT_PUBLIC_`.
  - Os limites dos planos gratuitos mudam. Antes do deploy, confira: tempo máximo das funções e frequência do cron na Vercel Hobby, pausa por inatividade no Supabase Free e cotas por modelo do Gemini.
- Herdado da onda 4 (PRs #13 e #14):
  - O Vercel Cron manda `Authorization: Bearer $CRON_SECRET` quando a variável existe no ambiente. Sem ela, o cron recebe 401. O caminho de sucesso do cron ainda não foi testado com o segredo real, então o passo 8 do `DEPLOY.md` é a primeira verificação dele.
  - A rota de saúde responde 500 (não 503) quando falta variável de ambiente, porque o container não chega a ser montado. Um 500 no passo 1 do smoke costuma ser variável faltando no ambiente da Vercel.
  - `getClientIp` confia em `x-forwarded-for` e `x-real-ip`, que a Vercel preenche.
  - As respostas da API levam `Cache-Control: no-store`.
  - Checagens da S07 que pedem navegador continuam pendentes (fluxo "Continuar depois", teclado, modo escuro e o fallback sem fontes). O passo 9 do `DEPLOY.md` cobre todas elas.
  - Os JSONs de `eval/resultados/` ficam fora do Biome (fechamento da onda 4), então novas rodadas não quebram o `npm run lint`.

### Contratos

**Usa** (contrato HTTP da S06):

```
GET  /api/health                    → 200 { ok: true, chunks: number, embeddingModel: string }
POST /api/chat                      → 200 { status, answer, sources }
GET  /api/sessions/{id}/messages    → 200 { sessionId, profile, messages }
GET  /api/cron/cleanup              → 401 sem Authorization
```

**Dona:** `scripts/smoke.ts`.

```bash
npm run smoke -- --url https://<deploy>.vercel.app
```

## Requisitos funcionais

### RF1. Script de fumaça

Contra a URL informada, em sequência e com 2 s de intervalo entre as chamadas de chat:
1. `GET /api/health` → 200, `ok: true` e `chunks > 0`.
2. `POST /api/chat` com uma pergunta no escopo ("Quando o repasse cai na minha conta?") → 200, `status: "answered"` e `sources` não vazio.
3. Mesma sessão, uma pergunta fora do escopo ("Me passa uma receita de lasanha?") → 200 e `status: "fallback"`.
4. Mesma sessão, "Meu CPF é 123.456.789-09" → 200 e `status: "blocked_input"`.
5. `GET /api/sessions/{id}/messages` → 200 com 4 mensagens (o turno bloqueado não é salvo).
6. `GET /api/cron/cleanup` sem header → 401.
7. Página `/` → 200, com os headers `Referrer-Policy: no-referrer` e `X-Content-Type-Options: nosniff`.

Imprime ✅ ou ❌ por passo e sai com código 1 se algum falhar. Não imprime as respostas inteiras. As checagens ficam em funções puras em `smoke-checks.ts`.

- **Critério de aceite:** Dado o `smoke-checks.test.ts` com respostas montadas à mão, então cada checagem aprova o caso certo e reprova o errado. *(H5)* Contra a produção, os 7 passos passam.

### RF2. `DEPLOY.md`

Roteiro em PT-BR, na ordem abaixo. Cada passo diz quem faz (pessoa ou orquestrador) e como verificar.

1. **Verificar limites dos planos gratuitos** e registrar no próprio `DEPLOY.md`, com data e URL da fonte: duração máxima de função e frequência mínima de cron na Vercel Hobby; pausa por inatividade e limites do Supabase Free; RPM e RPD dos modelos configurados no Gemini. Se a duração máxima for menor que o `maxDuration` da rota de chat, ou se o cron diário não for permitido, pare e reporte.
2. **GitHub:** conferir que a CI da `main` está verde e decidir se o repositório fica público a partir de agora.
3. **Supabase `prod`:** `npx supabase link --project-ref <prod>` e `npx supabase db push --remote` (`--yes` quando roda em modo agente). Conferir o RLS das 4 tabelas.
4. **Ingestão no `prod`:** `DATABASE_URL="<pooler do prod>" npm run ingest`. Conferir o total impresso.
5. **Vercel:** importar o repositório, região `gru1` (já no `vercel.json`), Node 24. Variáveis em **Production** (banco `prod`) e em **Preview** (banco `dev`), com `IP_HASH_SECRET` e `CRON_SECRET` diferentes em cada ambiente. Nenhuma variável `NEXT_PUBLIC_`.
6. **Primeiro deploy de produção:** rodar `npm run smoke -- --url <produção>`.
7. **Preview:** abrir um PR de teste e rodar o smoke contra a URL de preview.
8. **Cron:** conferir em Settings → Cron Jobs que `/api/cron/cleanup` aparece e, depois da primeira execução, que o log mostra status 200.
9. **Teste manual no navegador:** 3 perguntas no escopo, 1 fora do escopo e 1 bloqueada; recarregar a página e conferir o histórico; "Continuar depois" numa janela anônima; "Nova conversa".
10. **Registrar** a URL de produção no fim do `DEPLOY.md` (a S10 leva para o README).

Também traz uma seção "Como desfazer": voltar a um deploy anterior na Vercel (Instant Rollback) e reingerir a base no `prod`.

- **Critério de aceite:** Dado o `DEPLOY.md`, quando o revisor o lê, então os 10 passos estão lá com responsável e verificação, e a seção de limites tem fonte e data.

### RF3. Segredos

- **Critério de aceite:** Dado o repositório, quando o revisor roda `git grep -nE "AIza[0-9A-Za-z_-]{20,}|postgres(ql)?://[^ ]*:[^ @]+@|CRON_SECRET=.+|IP_HASH_SECRET=.+"`, então não há resultado. O `git log` não tem nenhum arquivo `.env*` além do `.env.example`.

## Requisitos não funcionais

- **RNF1. Testes:** `npm test`, `npm run typecheck` e `npm run lint` passam sem rede. *Verificação:* rodar com `env -i PATH="$PATH" HOME="$HOME"`.
- **RNF2. Isolamento de dados:** preview e local nunca apontam para o `prod`. *Verificação:* a pessoa confere as variáveis de Preview na Vercel.
- **RNF3. Custo zero:** nenhum serviço com cartão vinculado. *Verificação:* a pessoa confirma no H5.
- **RNF4. Privacidade:** o script de fumaça usa só textos fictícios. *Verificação:* leitura do script.

## Você deve

- Seguir as regras do `AGENTS.md` e as camadas descritas no `ARCHITECTURE.md`.
- Escrever o teste antes da implementação em `smoke-checks.ts`.
- Conferir os limites dos planos gratuitos em fontes oficiais e registrar data e URL.
- Rodar `npm test`, `npm run typecheck` e `npm run lint` antes de entregar.
- Parar em cada passo do H5 e pedir a ação à pessoa.
- Entregar um relatório com: arquivos alterados, cada critério de aceite com a evidência (comando + saída resumida), desvios da spec e pendências humanas.

## Você não deve

- Editar arquivos fora da lista de "Arquivos que podem ser criados ou alterados".
- Adicionar dependências.
- Mudar a visibilidade do repositório, criar projeto na Vercel ou rodar `supabase db push` sem pedido explícito da pessoa.
- Ler, imprimir ou pedir os valores das variáveis de ambiente.
- Rodar o smoke contra produção sem autorização.
- Fazer commit.

## Tecnologias

| Tecnologia | Uso nesta spec |
|---|---|
| Vercel | Hospedagem, preview por PR, cron |
| Supabase CLI | `link` e `db push` no `prod` |
| GitHub | Repositório e CI |
| tsx e `fetch` nativo | Script de fumaça |
| Vitest | Testes das checagens |
