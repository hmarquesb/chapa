# Tasks

## 1. Mover a pasta

- [x] 1.1 Rodar `mkdir -p docs/history && git mv specs docs/history/build-specs` e verificar com `git status --short` que só aparecem renomeações (`R`) de `specs/...` para `docs/history/build-specs/...`, sem `D` nem `A`, e que `specs/` não existe mais
- [x] 1.2 Avisar no relatório que a movimentação deve ir num commit próprio, antes das edições, para o Git registrar 100% de similaridade (decisão 2 do `design.md`). O implementador não commita.

## 2. Corrigir os links dos arquivos movidos

- [x] 2.1 Em `docs/history/build-specs/README.md`, trocar os cinco links da tabela da decisão 3 do `design.md` (ADR 0015, `openspec/config.yaml`, `docs/architecture.md`, ADR 0014 e `CLAUDE.md`) e verificar que nada mais mudou no arquivo, com `git diff -M docs/history/build-specs/README.md`
- [x] 2.2 Em `S01-config-e-cliente-llm.md` e `S08-avaliacao.md`, trocar o link do ADR 0014 por `../../adr/0014-flash-lite-como-modelo-de-chat.md` e verificar com `git diff -M` que é a única linha alterada em cada um
- [x] 2.3 Conferir que todo link relativo da pasta resolve: para cada alvo listado por `git grep -hoE "\]\((\.\./|\./)?[^)#: ]+\.(md|yaml)" -- docs/history/build-specs`, verificar que o arquivo existe a partir de `docs/history/build-specs/`. Nenhum alvo pode estar faltando.

## 3. ADR 0016

- [x] 3.1 Criar `docs/adr/0016-specs-da-construcao-em-docs-history.md` no modelo do `docs/adr/README.md`, com o conteúdo da decisão 4 do `design.md`, e verificar que ele tem as seções Contexto, Decisão, Alternativas consideradas e Consequências
- [x] 3.2 Trocar só a linha de status do ADR 0015 pelo texto da decisão 4 e verificar com `git diff docs/adr/0015-openspec-para-mudancas-incrementais.md` que é a única linha alterada
- [x] 3.3 Acrescentar a linha `| [0016](0016-specs-da-construcao-em-docs-history.md) | Guardar as specs da construção em docs/history/build-specs/ | Aceito |` ao índice de `docs/adr/README.md` e verificar que a linha do 0015 continua igual

## 4. Atualizar as referências

- [x] 4.1 `AGENTS.md`: atualizar as linhas 20, 116 e 166 para `docs/history/build-specs/` (o link da linha 20 aponta para `docs/history/build-specs/README.md`) e citar o ADR 0016 na linha 116, ao lado do ADR 0015
- [x] 4.2 `CLAUDE.md`: atualizar as linhas 11, 17 e 39 para `docs/history/build-specs/` (decisão 5 do `design.md`), sem mexer no resto das seções
- [x] 4.3 `README.md`: trocar o link da linha 65 para `docs/history/build-specs/README.md`
- [x] 4.4 `DEPLOY.md`: trocar o link da S09 (linha 3) para `docs/history/build-specs/S09-deploy.md` e o pathspec da linha 96 para `':!docs/history/build-specs/S09-deploy.md'`. Rodar o primeiro comando da varredura de segredos exatamente como ficou no arquivo e verificar que ele não imprime nada.
- [x] 4.5 `.github/pull_request_template.md`: trocar `specs/SNN-file.md` por `docs/history/build-specs/SNN-file.md` no comentário da linha 6
- [x] 4.6 `docs/architecture.md`: tirar a linha `specs/` da árvore de pastas e mostrar `docs/history/build-specs/` como specs da construção inicial (histórico), e verificar que a árvore continua alinhada dentro do bloco de código
- [x] 4.7 `openspec/config.yaml`: no `context`, trocar "em specs/" por "em docs/history/build-specs/" e verificar com `npx openspec context --json` que o arquivo continua válido

## 5. Verificação final

- [x] 5.1 Rodar `git grep -nE "(^|[^a-z/])specs/(README|S[0-9]{2}|_template|SNN|<arquivo)|\]\(specs|':!specs" -- ':!docs/history/build-specs' ':!openspec/changes/archive' ':!openspec/changes/move-build-specs-to-history'` e verificar que a saída é vazia
- [x] 5.2 Rodar `npx openspec validate move-build-specs-to-history --strict` e verificar que a change é válida
- [x] 5.3 Rodar `git log --follow --oneline docs/history/build-specs/S04-ingestao-e-busca.md` e verificar que aparecem os commits de antes da movimentação. Se o arquivo ainda não foi commitado, registrar no relatório para o orquestrador conferir depois do commit da tarefa 1.2.
- [x] 5.4 Rodar `npm run lint`, `npm run typecheck` e `npm test` e verificar que os três passam

## Workflow follow-up

- Depois do merge do PR, arquivar a change num PR próprio (`docs(openspec): archive move-build-specs-to-history`). Como a change declara `skip_specs`, o archive não altera `openspec/specs/`.
