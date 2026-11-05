<!-- Title: Conventional Commits, e.g. "feat(rag): add hybrid retrieval" (used as the squash commit). -->

## Spec

Implements [SNN — name](specs/SNN-file.md).

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

- [ ] Only files listed in the spec were touched
- [ ] No new dependencies beyond the spec
- [ ] No secrets, `.env*` or real API calls in tests
- [ ] Spec status updated to 🟢 in its own file (index is updated in the wave-closing PR)
- [ ] New architectural decision? Added an ADR in `docs/adr/`
