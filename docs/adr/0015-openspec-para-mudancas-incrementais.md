# 0015. Usar o OpenSpec para as mudanças depois da construção inicial

- **Status:** Aceito (a pasta das specs S00 a S10 foi alterada pelo [ADR 0016](0016-specs-da-construcao-em-docs-history.md))
- **Data:** 2026-11-10

## Contexto

As specs S00 a S10 foram escritas para construir o projeto do zero, em ondas. Cada uma diz quais arquivos criar e com quais contratos. Com todas concluídas, elas descrevem o que foi feito, não o que o sistema faz hoje: correções posteriores (como os PRs #17 e #18) já mudaram comportamento sem atualizar nenhuma delas.

As próximas melhorias mexem num sistema que já existe. Elas precisam dizer o que muda em relação ao comportamento atual, e esse comportamento precisa continuar documentado depois de cada merge.

## Decisão

- Usar o [OpenSpec](https://github.com/Fission-AI/OpenSpec) (`@fission-ai/openspec`) como **devDependency**, com a versão fixada no lockfile. Ele é chamado com `npx openspec` ou `npm run spec --`.
- O comportamento atual fica em `openspec/specs/<capacidade>/spec.md`, em requisitos com cenários. Toda mudança nova é uma *change* em `openspec/changes/<nome>/` (`proposal.md`, `design.md`, `tasks.md` e os deltas das specs).
- As specs S00 a S10 ficam congeladas em `specs/` como histórico da construção. Ninguém as edita nem cria uma S11.
- O fluxo de branches do [ADR 0013](0013-fluxo-de-branch-por-spec.md) continua: **uma change, uma branch, um worktree e um PR**. A branch se chama `<tipo>/<nome-da-change>`, e os commits levam o trailer `Change: <nome-da-change>` em vez de `Spec: SNN`.
- A pessoa aprova a proposta antes do *apply*, como fazia com o `✅ Aprovada`.
- O *archive* (que aplica os deltas em `openspec/specs/`) roda **depois do merge**, num PR próprio, pelo mesmo motivo do PR de fechamento de onda: duas changes paralelas arquivando na mesma spec viva entrariam em conflito.
- O `openspec/config.yaml` repete as regras do projeto que importam para propor e implementar (arquivos permitidos e contratos no `design.md`, nada de API real sem autorização, sem commit pelo implementador).

## Alternativas consideradas

- **Continuar com S11, S12… no `_template.md`:** não exige ferramenta nova, mas as specs seguiriam sendo tickets de construção, e nada documentaria o comportamento atual.
- **Instalar o OpenSpec globalmente ou via `npx` com versão:** não mexe no `package.json`, mas a versão não fica registrada no repositório, e o formato dos arquivos muda entre versões.

## Consequências

- O `package.json` ganha uma devDependency, que a CI também instala no `npm ci`, mesmo sem usar.
- Antes da primeira change ser arquivada, é preciso escrever as specs vivas das capacidades atuais (o *baseline*) a partir do código e do `ARCHITECTURE.md`.
- O `openspec init` gerou comandos `/opsx:*` e skills em `.claude/`. Eles são regenerados por `openspec update` quando a versão sobe, então não devem ser editados à mão.
- O CLI coleta estatísticas anônimas de uso. Cada pessoa pode desligar com `openspec config set telemetry.enabled false` ou `OPENSPEC_TELEMETRY=0`.
