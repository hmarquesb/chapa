# Proposal

## Why

Hoje a raiz do repositório tem `specs/` (as specs S00 a S10, congeladas, que contam como o projeto foi construído) ao lado de `openspec/specs/` (as specs vivas, que dizem o que o sistema faz agora). Os nomes são quase iguais e os papéis são opostos. Isso confunde quem chega ao repositório e qualquer agente que procure "as specs". Com a baseline arquivada, as specs vivas já são a referência, e o histórico pode sair da raiz e ir para junto da documentação.

## What Changes

- Mover `specs/` inteira (o `README.md`, o `_template.md` e as S00 a S10) para `docs/history/build-specs/` com `git mv`, para que o `git log --follow` continue mostrando o histórico de cada arquivo.
- Corrigir os links relativos dentro dos arquivos movidos, que passam a ficar dois níveis mais fundo. Fora isso, as specs continuam congeladas: nenhum texto delas muda.
- Criar o **ADR 0016**, que registra a nova localização e substitui só o ponto do [ADR 0015](../../../docs/adr/0015-openspec-para-mudancas-incrementais.md) que diz que as specs "ficam congeladas em `specs/`". O resto do ADR 0015 continua valendo. O ADR 0015 ganha a nota no status, e o índice `docs/adr/README.md` ganha a linha do 0016.
- Atualizar as referências ao caminho antigo em `AGENTS.md`, `CLAUDE.md`, `README.md`, `DEPLOY.md` (o link para a S09 e o pathspec `':!specs/S09-deploy.md'` da verificação de segredos), `.github/pull_request_template.md`, `docs/architecture.md` (a árvore de pastas) e `openspec/config.yaml` (o `context`).
- **BREAKING (só para links externos):** os links para `specs/...` nas descrições de PRs antigos no GitHub deixam de funcionar. Os trailers `Spec: SNN` dos commits continuam válidos, porque citam o ID da spec, não o caminho.

## Capabilities

### New Capabilities

Nenhuma.

### Modified Capabilities

Nenhuma. A mudança só reorganiza documentação e não altera nenhum requisito em `openspec/specs/`. Por isso o `.openspec.yaml` declara `skip_specs: true`.

## Fora do escopo

- Reescrever, resumir ou atualizar o conteúdo das specs S00 a S10. Isso inclui as menções em texto corrido a `ARCHITECTURE.md` ou a `specs/README.md`. O aviso que já existe no topo do `README.md` delas explica essas menções.
- Simplificar ou remover do `CLAUDE.md` e do `AGENTS.md` as seções do fluxo de ondas. Elas só têm o caminho atualizado e continuam marcadas como histórico.
- Editar a change arquivada `openspec/changes/archive/2026-11-10-baseline-living-specs/`. O archive é histórico e fica como foi aprovado.
- Editar os arquivos gerados pelo OpenSpec em `.claude/commands/opsx/` e `.claude/skills/openspec-*/`. As menções a `specs/` neles se referem aos deltas de uma change, não a esta pasta.
- Qualquer mudança de código em `src/`, `scripts/`, testes ou configuração de build.

## Impact

- **Arquivos:** só documentação e configuração do OpenSpec. A lista fechada fica no `design.md`.
- **Código, API e dependências:** nenhuma mudança e nenhuma dependência nova.
- **API ou banco real:** não chama nada (sem `ingest`, `eval`, `smoke` nem `db push`) e não precisa de checkpoint humano além da aprovação desta proposta e do merge do PR.
- **Decisão de arquitetura:** ADR 0016, em `docs/adr/0016-specs-da-construcao-em-docs-history.md`.
- **Archive:** como não há deltas, o archive desta change só move a pasta dela para `openspec/changes/archive/` e não mexe em `openspec/specs/`.
