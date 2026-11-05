@AGENTS.md

# Instruções específicas do Claude Code

As regras do projeto estão no `AGENTS.md` (importado acima) e a arquitetura no `ARCHITECTURE.md`. Este arquivo só acrescenta **como orquestrar a implementação com subagentes**.

## Papel da sessão principal (orquestrador)

A sessão principal **não implementa specs grandes sozinha**. Ela:

1. Lê `specs/README.md` e confere quais specs estão `✅ Aprovada` e com as dependências concluídas.
2. Confere que o **commit 0** (só documentação e specs) e o **H0b** já foram feitos pela pessoa: a `main` tem esse commit e está no GitHub (`git log --oneline origin/main`). Se não estiverem, para e pede. O orquestrador não faz o commit 0.
3. Para cada spec da onda, cria a branch e o worktree a partir da `main` atualizada (ver "Worktrees" abaixo) e muda o status da spec para `🔵 Em andamento`.
4. Despacha **um subagente `spec-implementer` por spec**, cada um no seu worktree. Specs da mesma onda rodam em paralelo, numa única mensagem com várias chamadas ao Agent.
5. Revisa cada entrega: lê o diff, roda `npm run lint`, `npm run typecheck`, `npm test` (e `npm run build` quando a spec pede) dentro do worktree e confere os critérios de aceite.
6. Commita na branch (um ou mais commits atômicos, em inglês, com o trailer `Spec: SNN`), muda o status da spec para `🟢 Concluída` no próprio arquivo, faz push da branch e abre o PR com `gh pr create`, usando o relatório do subagente na descrição.
7. Espera a CI verde e o merge (squash) pela pessoa. Quando todos os PRs da onda entram, abre o PR `docs(specs): close wave N`, que atualiza o índice do `specs/README.md`, e remove os worktrees.
8. Para em todo **checkpoint humano (H*)** e pede a ação à pessoa.

Skills úteis: `superpowers:using-git-worktrees` (criar os worktrees), `superpowers:subagent-driven-development` (fluxo despacho → revisão), `superpowers:test-driven-development` (implementação), `superpowers:verification-before-completion` (antes de marcar como concluída), `superpowers:finishing-a-development-branch` (abrir o PR e limpar).

## Worktrees

```bash
git switch main && git pull
git worktree add ../chapa-worktrees/s04 -b feat/s04-ingestion-and-search
cd ../chapa-worktrees/s04
ln -s ../../chapa/.env.local .env.local   # só se a spec usa API; nunca leia o arquivo
npm ci                                    # na S00 não existe lockfile ainda: pule
```

Depois do merge: `git worktree remove ../chapa-worktrees/s04` e `git branch -d feat/s04-ingestion-and-search`.

## Prompt para o subagente

As regras do implementador ficam em [`.claude/agents/spec-implementer.md`](.claude/agents/spec-implementer.md). No prompt, passe só o que muda de spec para spec:

```
Spec: <ID> (specs/<arquivo-da-spec>.md)
Worktree: <caminho absoluto de ../chapa-worktrees/<id>>
Chamadas reais de API e de banco: <PROIBIDAS | AUTORIZADAS: quais e em qual ambiente (dev)>
Observações: <opcional>
```

## Escolha do tipo de subagente

| Tarefa | `subagent_type` |
|---|---|
| Implementação de qualquer spec (S00 a S10) | `spec-implementer` |
| Pesquisa e redação da base de conhecimento (S02) | `spec-implementer` (herda WebSearch/WebFetch) |
| Revisão independente de uma entrega | `general-purpose`, recebendo o diff e a spec, não a sua conclusão |

## Cuidados

- Subagentes paralelos **não podem compartilhar arquivos**. Se duas specs da mesma onda precisarem do mesmo arquivo, rode-as em sequência. O `package.json` só muda na S00 e na S07.
- A S00 roda sozinha porque cria a estrutura, instala as dependências e escreve os contratos que todas as outras usam. Revise-a com atenção antes de abrir a onda 1.
- Para specs que tocam o banco, diga no prompt se o subagente pode usar o Supabase `dev` (só depois do H2). Nunca autorize o `prod` fora do H5.
- Nunca passe o conteúdo de `.env*` ou de `../api-key.md` no prompt de um subagente.

## Autorizações prévias

A pessoa já autorizou as ações abaixo (registrado em 05/11/2026). Elas valem como o "pedido explícito" e a "autorização" que as specs exigem. O orquestrador **não precisa parar** para pedi-las de novo e deve repassá-las no campo "Chamadas reais de API e de banco" do prompt do subagente.

| Checkpoint | O que está autorizado | Limites |
|---|---|---|
| H1 | Teste de fumaça da S01 (1 `generate` e 1 `embed`) com a `GEMINI_API_KEY` do `.env.local` | Só esse teste |
| H2 | Depois que a S03 estiver no worktree: `npx supabase link --project-ref <dev>` e `npx supabase db push` no projeto **`dev`**, e as verificações manuais da S03 contra o `dev` | Só o `dev`. Se o comando pedir senha ou outra entrada interativa, pare e peça à pessoa |
| — | Usar o `dev` nas verificações manuais da S04, S05 e S06, e rodar `npm run ingest` no `dev` depois do H3 | Só o `dev` |
| H4 | As rodadas de avaliação da S08 (v1, v2-inicial, calibração e v2) contra o `dev`, seguindo o protocolo do RF7 | Use `--delay-ms` e `--only` para respeitar a cota gratuita. Se a cota estourar, espere e retome, sem trocar de modelo |
| H5 (parcial) | Na S09: `supabase link` e `db push` no projeto **`prod`** e `npm run ingest` no `prod` | A connection string do `prod` fica em `.env.prod.local`, na raiz do repositório principal (`chapa/`, coberto pelo `.gitignore`), não nos worktrees. A partir do worktree, use só com `set -a; . ../../chapa/.env.prod.local; set +a` antes do comando. Nunca leia, imprima ou copie o arquivo |

**Continuam com a pessoa:**

- Commit 0 e H0b: commitar a documentação, criar o repositório no GitHub e fazer o push da `main`.
- H3: revisar a base de conhecimento. A ingestão só roda depois de "H3 aprovado".
- Merge dos PRs.
- H5: tornar o repositório público, criar ou alterar o projeto na Vercel e as variáveis de ambiente dela, e autorizar o smoke contra a produção.
- H6.
