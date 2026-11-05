# 0013. Uma branch, um worktree e um PR por spec

- **Status:** Aceito
- **Data:** 2026-11-05

## Contexto

As specs são implementadas por subagentes em paralelo. Sem um repositório remoto, o histórico seria uma lista linear de commits na `main`, e a CI e os previews da Vercel nunca rodariam durante o desenvolvimento.

## Decisão

- O repositório no GitHub é criado logo depois do commit 0 (checkpoint H0b).
- Cada spec ganha a sua branch e o seu `git worktree`; a `main` só recebe código por PRs com squash merge e CI verde.
- Commits, branches e PRs ficam em inglês (Conventional Commits, trailer `Spec: SNN`). Os ADRs ficam em português.
- O índice das specs é atualizado num PR de fechamento da onda, para evitar conflitos entre PRs paralelos.

## Alternativas consideradas

- **Commitar tudo direto na `main` e fazer push no deploy:** mais simples, mas perde o histórico de revisão, a CI por mudança e os previews.

## Consequências

- Cada PR leva a evidência dos critérios de aceite, então o histórico se documenta sozinho.
- Cada worktree precisa do seu próprio `npm ci`.
