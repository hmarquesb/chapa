@AGENTS.md

# Instruções específicas do Claude Code

As regras do projeto estão no `AGENTS.md` (importado acima). Este arquivo só acrescenta **como orquestrar uma change do OpenSpec com subagentes**. O fluxo da construção inicial (ondas S00 a S10, commit 0, checkpoints H0 a H6) está no [`docs/history/build-specs/README.md`](docs/history/build-specs/README.md) e não se aplica mais.

## Papel da sessão principal (orquestrador)

A sessão principal **não implementa changes grandes sozinha**. Ela:

1. Cria a branch e o worktree da change a partir da `main` atualizada (ver "Worktrees").
2. Gera a proposta com `/opsx:propose` (ou `/opsx:explore` antes, para amadurecer a ideia). A pessoa revisa `proposal.md`, `design.md`, `tasks.md` e os deltas. O *apply* só começa depois de ela dizer que aprovou.
3. Despacha o subagente `spec-implementer` no worktree da change (ver "Tamanho da change"). Changes independentes rodam em paralelo, numa única mensagem com várias chamadas ao Agent.
4. Revisa a entrega: lê o diff, roda `npm run lint`, `npm run typecheck`, `npm test` (e `npm run build`, quando a change pede) no worktree e confere os critérios de aceite. Depois, faz a verificação manual que o relatório lista como pendente (`db push` no `dev`, `npm run dev`, `npm run chat`), dentro das autorizações abaixo, ou a deixa para a pessoa no PR.
5. Commita na branch (commits atômicos, em inglês, com o trailer `Change: <nome>`), faz push e abre o PR com `gh pr create`, usando o relatório do subagente na descrição.
6. Depois do merge, roda `/opsx:archive` numa branch `docs/archive-<change>` e abre o PR `docs(openspec): archive <change>`. Várias changes da mesma leva podem ser arquivadas no mesmo PR. Remove o worktree.
7. Atalho: quando a pessoa roda `/merge-change <PR>`, a skill [`merge-change`](.claude/skills/merge-change/SKILL.md) faz o merge e o passo 6 de uma vez.

Skills úteis: `superpowers:using-git-worktrees`, `superpowers:subagent-driven-development`, `superpowers:verification-before-completion` e `superpowers:finishing-a-development-branch`.

## Worktrees

```bash
git switch main && git pull
git worktree add ../chapa-worktrees/<change> -b <tipo>/<change>
cd ../chapa-worktrees/<change>
ln -s ../../chapa/.env.local .env.local   # só se a change usa API; nunca leia o arquivo
npm ci
```

Depois do merge: `git worktree remove ../chapa-worktrees/<change>` e `git branch -d <tipo>/<change>`.

## Tamanho da change

Cada chamada do subagente relê todo o contexto acumulado, então o custo cresce mais rápido que o número de passos. Uma change de 32 tarefas, feita por um subagente só, chegou a 113 chamadas com até 264 mil tokens de contexto cada.

- **Até ~15 tarefas no `tasks.md`:** um subagente para a change inteira.
- **Mais de ~15 tarefas:** um subagente novo por bloco de grupos do `tasks.md` (`## 1. …`, `## 2. …`), **em sequência**, no mesmo worktree. Junte grupos pequenos até cerca de 10 tarefas por subagente. O grupo de documentação vai sempre num subagente próprio, no fim. Cada um começa com o contexto limpo e lê o diff dos anteriores só onde precisar.
- O orquestrador roda os portões entre um bloco e outro só se o relatório apontar um problema. A revisão completa fica para o fim.

## Prompt para o subagente

As regras do implementador ficam em [`.claude/agents/spec-implementer.md`](.claude/agents/spec-implementer.md). Ele roda no Sonnet; a proposta e a revisão ficam na sessão principal. No prompt, passe só o que muda de change para change:

```
Change: <nome> (openspec/changes/<nome>/)
Worktree: <caminho absoluto de ../chapa-worktrees/<nome>>
Grupos de tarefas: <todos | 1 a 3 (os grupos anteriores já estão feitos)>
Chamadas reais de API e de banco: <PROIBIDAS | AUTORIZADAS: quais e em qual ambiente (dev)>
Observações: <opcional>
```

Por padrão, as chamadas reais ficam **PROIBIDAS** para o subagente: a verificação manual e o `db push` no `dev` são do orquestrador, no passo 4. Autorize só o que a tarefa não consegue fazer sem banco ou API.

Para uma revisão independente, use um subagente `general-purpose` que recebe o diff e a change, não a sua conclusão.

## Cuidados

- Changes paralelas **não podem compartilhar arquivos**. Duas changes que alteram a mesma capacidade em `openspec/specs/` podem rodar em paralelo, porque os deltas só se juntam no archive, que é sequencial.
- Só a change que precisa de uma dependência nova (justificada na proposta) mexe no `package.json`, e nunca em paralelo com outra que também mexa.
- Nunca passe o conteúdo de `.env*` ou de `../api-key.md` no prompt de um subagente.

## Autorizações prévias

As autorizações das specs S00 a S10 (H1 a H4) estão registradas no [`docs/history/build-specs/README.md`](docs/history/build-specs/README.md#autorizações-prévias-histórico).

A pessoa autorizou as ações abaixo (registrado em 10/11/2026). Elas valem como a autorização explícita que o `AGENTS.md` exige: o orquestrador não precisa pedi-las de novo e pode repassá-las no campo "Chamadas reais de API e de banco" do prompt do subagente, quando a tarefa exigir. O que não está aqui continua precisando de autorização na tarefa.

| Checkpoint | O que está autorizado | Limites |
|---|---|---|
| — | Usar o banco `dev` (Neon) e a `GEMINI_API_KEY` do `.env.local` nas verificações manuais de uma change (`npm run chat`, `npm run dev`) | Só o `dev` |
| — | `npm run ingest` no `dev` | Só o `dev`. Se a change altera `knowledge-base/`, a ingestão só roda depois que a pessoa revisar o texto |
| — | `npm run eval` contra o `dev`, seguindo o [`docs/qa.md`](docs/qa.md#avaliação) | Use `--delay-ms` e `--only` para respeitar a cota gratuita. Se a cota estourar, espere e retome, sem trocar de modelo |
| — | Rodar o `supabase/dev-bootstrap.sql` e o `db push` no `dev`, com os comandos da seção "Banco `dev` no Neon" do [`DEPLOY.md`](DEPLOY.md) (`--remote="$U"`, com o `U` tirado do `DATABASE_URL_UNPOOLED` no subshell) | Só o `dev` (Neon). Nunca com o `.env.prod.local` carregado e nunca `db push` sem `--remote=` explícito |
| H5 (parcial) | `supabase link`, `db push --remote --yes` e `npm run ingest` no projeto **`prod`**, nos passos do [`DEPLOY.md`](DEPLOY.md) | A connection string fica em `.env.prod.local`, na raiz do repositório principal (`chapa/`), não nos worktrees. A partir do worktree, use só `set -a; . ../../chapa/.env.prod.local; set +a` antes do comando. Nunca leia, imprima ou copie o arquivo |

**Continuam com a pessoa:** revisar a base de conhecimento antes da ingestão; o merge dos PRs (exceto via `/merge-change <PR>`, sempre com a CI verde); a visibilidade do repositório, o projeto e as variáveis da Vercel e a autorização do smoke contra a produção.
