@AGENTS.md

# Instruções específicas do Claude Code

As regras do projeto estão no `AGENTS.md` (importado acima). Este arquivo só acrescenta **como orquestrar uma change do OpenSpec com subagentes**. O fluxo da construção inicial (ondas S00 a S10, commit 0, checkpoints H0 a H6) está no [`specs/README.md`](specs/README.md) e não se aplica mais.

## Papel da sessão principal (orquestrador)

A sessão principal **não implementa changes grandes sozinha**. Ela:

1. Cria a branch e o worktree da change a partir da `main` atualizada (ver "Worktrees").
2. Gera a proposta com `/opsx:propose` (ou `/opsx:explore` antes, para amadurecer a ideia). A pessoa revisa `proposal.md`, `design.md`, `tasks.md` e os deltas. O *apply* só começa depois de ela dizer que aprovou.
3. Despacha **um subagente `spec-implementer` por change**, no worktree dela. Changes independentes rodam em paralelo, numa única mensagem com várias chamadas ao Agent.
4. Revisa a entrega: lê o diff, roda `npm run lint`, `npm run typecheck`, `npm test` (e `npm run build`, quando a change pede) no worktree e confere os critérios de aceite.
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

## Prompt para o subagente

As regras do implementador ficam em [`.claude/agents/spec-implementer.md`](.claude/agents/spec-implementer.md). No prompt, passe só o que muda de change para change:

```
Change: <nome> (openspec/changes/<nome>/)
Worktree: <caminho absoluto de ../chapa-worktrees/<nome>>
Chamadas reais de API e de banco: <PROIBIDAS | AUTORIZADAS: quais e em qual ambiente (dev)>
Observações: <opcional>
```

Para uma revisão independente, use um subagente `general-purpose` que recebe o diff e a change, não a sua conclusão.

## Cuidados

- Changes paralelas **não podem compartilhar arquivos**. Duas changes que alteram a mesma capacidade em `openspec/specs/` podem rodar em paralelo, porque os deltas só se juntam no archive, que é sequencial.
- Só a change que precisa de uma dependência nova (justificada na proposta) mexe no `package.json`, e nunca em paralelo com outra que também mexa.
- Nunca passe o conteúdo de `.env*` ou de `../api-key.md` no prompt de um subagente.

## Autorizações prévias

As autorizações das specs S00 a S10 (H1 a H4) valiam só para aquelas specs e estão registradas no [`specs/README.md`](specs/README.md#autorizações-prévias-histórico). Numa change, chamada real de API ou de banco no `dev` só com autorização da pessoa na tarefa, repassada no campo "Chamadas reais de API e de banco" do prompt do subagente.

Continua valendo, como a autorização explícita que o `AGENTS.md` exige:

| Checkpoint | O que está autorizado | Limites |
|---|---|---|
| H5 (parcial) | `supabase link`, `db push --remote --yes` e `npm run ingest` no projeto **`prod`**, nos passos do [`DEPLOY.md`](DEPLOY.md) | A connection string fica em `.env.prod.local`, na raiz do repositório principal (`chapa/`), não nos worktrees. A partir do worktree, use só `set -a; . ../../chapa/.env.prod.local; set +a` antes do comando. Nunca leia, imprima ou copie o arquivo |

**Continuam com a pessoa:** revisar a base de conhecimento antes da ingestão; o merge dos PRs (exceto via `/merge-change <PR>`, sempre com a CI verde); a visibilidade do repositório, o projeto e as variáveis da Vercel e a autorização do smoke contra a produção.
