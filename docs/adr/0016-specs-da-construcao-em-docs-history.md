# 0016. Guardar as specs da construção em docs/history/build-specs/

- **Status:** Aceito
- **Data:** 2026-11-10

## Contexto

A raiz do repositório tinha `specs/` (as specs S00 a S10, congeladas, que contam como o projeto foi construído) ao lado de `openspec/specs/` (as specs vivas, que dizem o que o sistema faz agora). Os nomes eram quase iguais e os papéis, opostos. Isso confundia quem chegava ao repositório e qualquer agente que procurasse "as specs".

Com a baseline arquivada, as specs vivas de `openspec/specs/` passaram a ser a referência do comportamento atual. As S00 a S10 são só histórico e podem sair da raiz.

## Decisão

- Mover a pasta `specs/` inteira (o `README.md`, o `_template.md` e as S00 a S10) para `docs/history/build-specs/`, com `git mv`, mantendo os nomes dos arquivos.
- O conteúdo das specs continua congelado. A única exceção são os links relativos que saem da pasta, corrigidos para o novo nível de profundidade, porque um link quebrado atrapalha quem lê o histórico.
- Isso altera só o ponto do [ADR 0015](0015-openspec-para-mudancas-incrementais.md) que diz que as specs "ficam congeladas em `specs/`". O resto do ADR 0015 continua valendo.

## Alternativas consideradas

- **`openspec/changes/archive/`:** mistura dois formatos na pasta que o CLI do OpenSpec controla, e as S00 a S10 não são deltas.
- **Manter `specs/` na raiz:** mantém a ambiguidade com `openspec/specs/`.
- **`docs/specs/`:** perde a indicação de que é histórico e repete o nome `specs`.

## Consequências

- Os links para `specs/...` nas descrições de PRs antigos no GitHub e em lugares fora do repositório deixam de funcionar. Quem segue um link velho acha o arquivo pelo nome, que não mudou.
- Os trailers `Spec: SNN` dos commits continuam válidos, porque citam o ID da spec, não o caminho.
- A movimentação vai num commit próprio, sem edições, e o `git log --follow` e o `blame` continuam mostrando o histórico de cada arquivo.
- A subpasta `docs/history/` fica disponível para outros registros históricos, separados dos documentos vivos de `docs/`.
