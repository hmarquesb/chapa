# Design

## Context

A motivação está no `proposal.md` ("Why"). A mudança é só de documentação: nenhum arquivo de `src/`, `scripts/` ou de configuração de build menciona `specs/`. O Biome não verifica Markdown, e a CI roda só `lint`, `typecheck`, `test` e `build`, então nenhum portão automático pega um link quebrado. A conferência dos links fica numa tarefa manual com `git grep`.

Referências ao caminho antigo fora da pasta, levantadas com `git grep` na `main` (`06b1bff`):

| Arquivo | Linha | O que cita |
|---|---|---|
| `AGENTS.md` | 20, 116, 166 | link para `specs/README.md`, menção a `specs/` e ao índice `specs/README.md` |
| `CLAUDE.md` | 11, 17, 39 | `specs/README.md` (duas vezes) e o modelo de prompt `specs/<arquivo-da-spec>.md` |
| `README.md` | 65 | link `specs/` → `specs/README.md` |
| `DEPLOY.md` | 3, 96 | link para `specs/S09-deploy.md` e o pathspec `':!specs/S09-deploy.md'` |
| `.github/pull_request_template.md` | 6 | comentário com `specs/SNN-file.md` |
| `docs/architecture.md` | 32 | linha `specs/` na árvore de pastas |
| `openspec/config.yaml` | 15 | `context`: "As specs S00 a S10 em specs/ ..." |

As menções a `specs/` em `.claude/commands/opsx/`, `.claude/skills/openspec-*/` e `.claude/skills/merge-change/` são aos deltas de uma change ou à flag `--specs` do CLI. Elas não mudam.

## Goals / Non-Goals

**Goals:**

- Depois da mudança, nenhum arquivo versionado, exceto o histórico listado abaixo, aponta para o caminho antigo.
- Todo link relativo dos arquivos movidos resolve para um arquivo que existe.
- `git log --follow docs/history/build-specs/S04-ingestao-e-busca.md` mostra os commits de quando o arquivo estava em `specs/`.

**Non-Goals:**

- Mudar o texto das specs, além dos links. As menções em texto corrido (`ARCHITECTURE.md`, `specs/README.md` dentro do `_template.md` e das próprias specs) ficam como estão, cobertas pelo aviso no topo do `README.md` delas.
- Atualizar arquivos que já são histórico: a change arquivada `openspec/changes/archive/2026-11-10-baseline-living-specs/` e os ADRs 0001 a 0014.

## Decisions

### 1. Destino `docs/history/build-specs/`

`docs/` já reúne a documentação, e `history/` deixa claro que o conteúdo não é a referência atual. O `build-specs` diferencia essas specs das specs vivas do OpenSpec. A subpasta `history/` deixa espaço para outros registros históricos no futuro, sem misturá-los com os documentos vivos de `docs/`.

Alternativas consideradas:

- `openspec/changes/archive/`: mistura dois formatos na pasta que o CLI controla, e as S00 a S10 não são deltas.
- Manter `specs/` na raiz: é a ambiguidade que motiva a change.
- `docs/specs/`: perde a indicação de que é histórico e repete o nome `specs`.

### 2. `git mv` da pasta inteira, num commit só de movimentação

O `git mv specs docs/history/build-specs` entra num commit que só move os arquivos. A correção dos links vai num commit seguinte. Assim o Git detecta 100% de similaridade na renomeação, e o `--follow` e o `blame` continuam funcionando.

### 3. Só os links mudam dentro dos arquivos movidos

O ADR 0015 congela o conteúdo das specs. Mudar o caminho de um link não muda o conteúdo, e um link quebrado é pior para quem lê o histórico. O ADR 0016 registra essa exceção.

Links que mudam (o arquivo passa de 1 para 3 níveis abaixo da raiz):

| Arquivo | Antes | Depois |
|---|---|---|
| `README.md` (das specs) | `../docs/adr/0015-openspec-para-mudancas-incrementais.md` | `../../adr/0015-openspec-para-mudancas-incrementais.md` |
| `README.md` (das specs) | `../openspec/config.yaml` | `../../../openspec/config.yaml` |
| `README.md` (das specs) | `../docs/architecture.md` | `../../architecture.md` |
| `README.md` (das specs) | `../docs/adr/0014-flash-lite-como-modelo-de-chat.md` | `../../adr/0014-flash-lite-como-modelo-de-chat.md` |
| `README.md` (das specs) | `../CLAUDE.md` | `../../../CLAUDE.md` |
| `S01-config-e-cliente-llm.md` | `../docs/adr/0014-flash-lite-como-modelo-de-chat.md` | `../../adr/0014-flash-lite-como-modelo-de-chat.md` |
| `S08-avaliacao.md` | `../docs/adr/0014-flash-lite-como-modelo-de-chat.md` | `../../adr/0014-flash-lite-como-modelo-de-chat.md` |

Os links entre arquivos da própria pasta (`S00-bootstrap.md`, `_template.md` etc.) continuam iguais. Se a implementação achar outro link relativo que sai da pasta, ele segue a mesma regra e entra no relatório.

### 4. ADR 0016 substitui só um ponto do ADR 0015

O ADR 0015 continua valendo inteiro, menos a frase sobre a pasta. Em vez de marcá-lo como `Substituído por 0016`, o que sugeriria que o OpenSpec deixou de valer, o status dele vira:

```markdown
- **Status:** Aceito (a pasta das specs S00 a S10 foi alterada pelo [ADR 0016](0016-specs-da-construcao-em-docs-history.md))
```

O corpo do 0015 não muda. No índice `docs/adr/README.md`, a linha do 0015 fica igual e entra a linha do 0016 com status `Aceito`.

Conteúdo do ADR 0016, no modelo do `docs/adr/README.md`:

- **Título:** `0016. Guardar as specs da construção em docs/history/build-specs/`
- **Status:** `Aceito`. **Data:** a data do commit.
- **Contexto:** a confusão entre `specs/` e `openspec/specs/`. A baseline arquivada fez das specs vivas a referência.
- **Decisão:** mover para `docs/history/build-specs/`. O conteúdo continua congelado, e só os links relativos são corrigidos. Altera o ponto do ADR 0015 sobre a pasta.
- **Alternativas consideradas:** as três da decisão 1.
- **Consequências:** os links de PRs antigos no GitHub quebram; os trailers `Spec: SNN` continuam valendo; o `git log --follow` preserva o histórico.

### 5. `CLAUDE.md` e `AGENTS.md`: só os caminhos

As seções do fluxo de ondas continuam como estão, com o caminho novo. Enxugá-las é outra decisão, fora do escopo (ver `proposal.md`). No modelo de prompt do `CLAUDE.md`, a linha passa a ser `Spec: <ID> (docs/history/build-specs/<arquivo-da-spec>.md)`.

## Arquivos que podem ser criados ou alterados

O implementador não toca em mais nada.

- `specs/**` → `docs/history/build-specs/**` (movidos com `git mv`; dentro deles, só os links da decisão 3)
- `docs/adr/0016-specs-da-construcao-em-docs-history.md` (novo)
- `docs/adr/0015-openspec-para-mudancas-incrementais.md` (só a linha de status)
- `docs/adr/README.md` (linha nova do 0016)
- `docs/architecture.md` (árvore de pastas: troca a linha `specs/` por uma linha `docs/history/` ou ajusta a linha `docs/`)
- `AGENTS.md`
- `CLAUDE.md`
- `README.md`
- `DEPLOY.md`
- `.github/pull_request_template.md`
- `openspec/config.yaml` (só o `context`)
- `openspec/changes/move-build-specs-to-history/tasks.md` (marcar as tarefas)

## Contratos

A change não cria nem altera tipos, assinaturas, rotas ou esquema de banco. O único "contrato" é o caminho: `docs/history/build-specs/<arquivo>.md`, com os mesmos nomes de arquivo de hoje.

## Risks / Trade-offs

- [Links de PRs antigos e de fora do repositório quebram] → Aceito. O ADR 0016 registra isso. Quem segue um link velho acha o arquivo pelo nome, que não muda.
- [Um link relativo esquecido quebra em silêncio, porque nenhuma ferramenta da CI verifica Markdown] → A tarefa de conferência lista todos os `](...)` relativos dos arquivos movidos e confere que cada alvo existe.
- [O pathspec do `DEPLOY.md` deixa de excluir a S09, e a verificação de segredos passa a acusar os exemplos da spec] → A tarefa atualiza o pathspec e roda o comando para confirmar que a saída continua vazia.
- [Um agente ou skill que leia `specs/README.md` pelo caminho antigo] → O `git grep` final cobre `.claude/`. Só os arquivos gerados pelo OpenSpec mencionam `specs/`, e no sentido dos deltas.

## Migration Plan

Sem deploy nem dado para migrar. Para desfazer, basta reverter o commit do PR (squash), que devolve a pasta e as referências de uma vez.
