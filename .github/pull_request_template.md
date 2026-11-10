<!-- Title: Conventional Commits, e.g. "feat(rag): add hybrid retrieval" (used as the squash commit). -->

## Spec / Change

Implements [`<change-name>`](openspec/changes/<change-name>/proposal.md).
<!-- For the initial-build specs: Implements [SNN — name](specs/SNN-file.md). -->


## Summary

<!-- What changed and why, in 2–4 bullets. -->

-

## Acceptance criteria

| Criterion | Evidence |
|---|---|
| RF1 — ... | `command` → short output |
| RNF1 — lint, typecheck, test | `npm run lint && npm run typecheck && npm test` → passing |

## Deviations from the spec

<!-- "None", or what changed and why. A contract change needs a spec update first. -->

None.

## Human checkpoints / follow-ups

<!-- H* steps the person must run, or open items. -->

- [ ] ...

## Checklist

- [ ] Only files listed in the spec / the change's `design.md` were touched
- [ ] No new dependencies beyond the spec / change proposal
- [ ] No secrets, `.env*` or real API calls in tests
- [ ] Change: all tasks in `tasks.md` checked; `npx openspec validate <change-name>` passes (archive happens in a separate PR after merge)
- [ ] Spec (S00–S10 only): status updated to 🟢 in its own file
- [ ] New architectural decision? Added an ADR in `docs/adr/`
