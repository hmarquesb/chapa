---
name: merge-change
description: Faz o merge (squash) do PR de uma change do OpenSpec com a CI verde, arquiva a change num PR próprio e faz o merge desse PR também, limpando branches e worktrees. Use só quando a pessoa rodar /merge-change <número-do-PR>. Invocar a skill é a autorização explícita de merge daquele PR e do PR de archive que ela abrir; não use para nenhum outro PR nem por iniciativa própria.
disable-model-invocation: true
argument-hint: <número-do-PR>
metadata:
  version: "1.0.0"
---

# Merge Change

Fecha o ciclo de uma change do OpenSpec: merge do PR da change → archive → merge do PR de archive. Rodar `/merge-change <N>` é a autorização explícita que o `AGENTS.md` ("Quem faz o quê") exige para o orquestrador fazer o merge, **valendo só para o PR `<N>` e para o PR de archive que esta skill abrir**.

## Regras

- Um PR por invocação. Sem número de PR, pergunte qual é; não adivinhe.
- **Nunca** use `--admin`, `--force`, `--no-verify`, `--no-validate` nem pule a CI. Nunca faça push direto na `main`.
- Pare no primeiro problema, diga qual passo falhou com a saída resumida e não tente contornar: CI vermelha, conflito, PR que não é de change, tarefa aberta, worktree sujo, archive ou validação com erro.
- Rode os comandos a partir do repositório principal (`chapa/`), não de um worktree, e use caminhos absolutos ou `git -C`.
- Nenhum comando desta skill chama a API do Gemini nem o banco.

## 1. Conferir o PR da change

```bash
gh pr view <N> --json number,state,isDraft,baseRefName,headRefName,title,body,mergeable,url
gh pr diff <N> --name-only
```

Siga só se **tudo** valer:

- `state` é `OPEN`, `isDraft` é `false`, `baseRefName` é `main`.
- O título segue Conventional Commits (`tipo(escopo): assunto`).
- O nome da change (`<change>`) sai do link `Implements [\`<change>\`]` da descrição ou do trailer `Change: <change>` dos commits, e o diff tem arquivos em `openspec/changes/<change>/`.
- O PR **não** é um PR de archive (título `docs(openspec): archive …`). Para ele, vá direto ao passo 5.
- Todas as tarefas da change estão marcadas:
  ```bash
  git fetch origin
  git show origin/<headRefName>:openspec/changes/<change>/tasks.md | grep -c '^\s*- \[ \]'   # tem que dar 0
  ```

## 2. Esperar a CI e fazer o merge

```bash
gh pr checks <N> --watch --fail-fast
```

- Se algum check falhar, pare. Se o PR não tiver nenhum check, pare: a `main` só recebe PR com CI verde.
- `mergeable` precisa ser `MERGEABLE`. Se for `UNKNOWN`, consulte de novo algumas vezes. Se for `CONFLICTING`, pare.
- Se existir o worktree da branch (`git worktree list`), ele precisa estar limpo (`git -C <worktree> status --porcelain` vazio). Se não estiver, pare.

```bash
gh pr merge <N> --squash
git push origin --delete <headRefName> 2>/dev/null || true   # o GitHub pode já ter apagado
```

## 3. Limpar

```bash
git switch main && git pull --ff-only
git worktree remove ../chapa-worktrees/<change>      # se existir
git branch -D <headRefName>                           # -D porque o squash não deixa o -d reconhecer o merge
```

## 4. Arquivar a change

```bash
git worktree add ../chapa-worktrees/archive-<change> -b docs/archive-<change> origin/main
cd ../chapa-worktrees/archive-<change> && npm ci
npx openspec archive <change> --yes
npx openspec validate --specs --strict
```

Confira antes de commitar:

- O archive e a validação passaram.
- `openspec/changes/<change>/` sumiu e existe `openspec/changes/archive/<data>-<change>/`.
- Cada capacidade dos deltas existe em `openspec/specs/<capacidade>/spec.md`, sem o texto `TBD` no `## Purpose` (`grep -rn TBD openspec/specs`).
- `git status --porcelain` só mostra arquivos em `openspec/`.

```bash
git add openspec
git commit -m "docs(openspec): archive <change>" -m "Change: <change>" -m "Co-Authored-By: <a linha de atribuição desta sessão>"
git push -u origin docs/archive-<change>
gh pr create --base main --title "docs(openspec): archive <change>" --body "<corpo abaixo>"
```

Corpo do PR (com a linha de atribuição de PR desta sessão no final):

```
## Spec / Change

Archives [`<change>`](openspec/changes/archive/<data>-<change>/proposal.md), merged in #<N>.

## Summary

- Moves the change to `openspec/changes/archive/`.
- Applies its deltas to `openspec/specs/`: <lista das capacidades criadas ou alteradas>.

## Acceptance criteria

| Criterion | Evidence |
|---|---|
| Archive | `npx openspec archive <change> --yes` → <saída resumida> |
| Specs valid | `npx openspec validate --specs --strict` → <saída resumida> |
| Only openspec/ touched | `git diff --name-only origin/main...HEAD` → only `openspec/**` |
```

## 5. Merge do PR de archive

Com o número `<A>` do PR de archive:

```bash
gh pr checks <A> --watch --fail-fast
gh pr merge <A> --squash
git push origin --delete docs/archive-<change> 2>/dev/null || true
cd <repositório principal> && git switch main && git pull --ff-only
git worktree remove ../chapa-worktrees/archive-<change>
git branch -D docs/archive-<change>
npx openspec list --specs
```

As mesmas condições do passo 2 valem: CI verde, sem conflito, sem atalhos.

## 6. Relatório

Diga à pessoa, em poucas linhas:

- os dois PRs mergeados, com os links;
- as capacidades criadas ou alteradas em `openspec/specs/`;
- os worktrees e branches removidos;
- qualquer passo pulado e o motivo.
