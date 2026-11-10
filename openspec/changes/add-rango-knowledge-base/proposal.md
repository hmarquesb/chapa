# Proposal

## Why

A base atual (`knowledge-base/01` a `07`) é uma reescrita do blog público de parceiros de uma empresa real, e a regra "todo número vem de uma página citada" deixou dezenas de lacunas registradas no `FONTES.md`: taxa do repasse semanal, prazo de aceite, preço do entregador avulso, quem paga a entrega grátis, entre outras. O Chapa v2 precisa de regras fechadas e coerentes (tabela de taxas completa para `simular_repasse`, processo de suporte para `abrir_chamado`), que uma reescrita de blog não oferece. Esta change é a peça 1 do PRD do Chapa v2: troca a base pela da **Rango**, uma empresa de delivery fictícia com regras próprias, e cria uma fonte única para os números.

## What Changes

- **BREAKING (conteúdo):** os 7 documentos atuais são reescritos para a Rango e entram 4 novos (`08-promocoes-e-cupons.md`, `09-suporte-e-chamados.md`, `10-conta-acessos-e-seguranca.md`, `11-pagamentos-e-fiscal.md`). Todos os números mudam. A base antiga e o `FONTES.md` saem de `knowledge-base/` e vão para `docs/history/knowledge-base-v1/`.
- Novo `knowledge-base/regras.yaml`, não ingerido: a fonte única de todos os números da Rango, com a unidade no nome da chave (`_pct`, `_reais`, `_min`…). Os valores de partida são os do §6 do PRD, transcritos por inteiro no `design.md`. **Revisar e aprovar esta proposta vale como a aprovação desses valores.**
- Novo `knowledge-base/README.md`, não ingerido: diz que a Rango é fictícia, "inspirada no mercado brasileiro de delivery", e lista os temas que a base não cobre de propósito.
- Novo teste de consistência (Vitest, sem rede): todo número com unidade nos documentos ingeridos existe no `regras.yaml`; cada documento tem o cabeçalho da Rango e de 600 a 1.300 palavras; os 11 arquivos existem. Chaves do YAML que nenhum documento cita geram só um aviso.
- Nova dependência de desenvolvimento **`yaml`** (`^2.9.1`), para o teste ler o `regras.yaml`. Ela já está no `package-lock.json` como dependência transitiva do Vitest e do OpenSpec, na mesma versão, então nada novo é baixado. O Node não lê YAML sozinho, e escrever um parser à mão seria mais código para manter do que o ganho justifica.
- ADRs novos: **0018** (empresa fictícia Rango no lugar de fontes públicas) e **0019** (`regras.yaml` como fonte única dos números).
- Documentação: `docs/business.md` (visão, conceitos, temas, regras de conteúdo), `docs/architecture.md`, `AGENTS.md` (descrição, "Onde mexer" e "Marca e conteúdo"), `openspec/config.yaml` (contexto) e o `README.md` do projeto (o que é a Rango, as limitações e os links para o `FONTES.md`).

Fora do escopo:

- Prompts, mensagens fixas, rótulo do perfil e perguntas de exemplo da interface: change `rebrand-app-texts-to-rango`.
- Eval de 50 perguntas, tipos novos, metas da `v3`, `docs/qa.md` e a tabela de resultados do `README.md`: change `expand-eval-to-50-questions`. Até ela entrar, o `eval/perguntas.json` atual fica desatualizado em relação à base; ninguém roda o eval entre as duas changes.
- Chunking, embeddings, busca e presets do RAG (a base segue o formato atual para que a `v3` meça a base, e não a busca).
- Ferramentas do agente que lerão o `regras.yaml` (onda 2), login e perfil salvo (peça 2) e identidade visual (peça 3).

Chamadas reais e checkpoints humanos:

- **Revisão humana do texto da base** antes de qualquer ingestão (regra do `CLAUDE.md`). A revisão acontece no PR.
- Depois dessa revisão: `npm run ingest` no `dev` (preset `padrao`) e algumas perguntas com `npm run chat`, ambos já autorizados para o `dev`.
- Nada no `prod`. A reingestão do `prod` acontece depois do merge desta change **e** da `rebrand-app-texts-to-rango`, para que a base e os textos do app mudem juntos (ver o `design.md`).

## Capabilities

### New Capabilities

- `knowledge-base`: conteúdo e formato da base que o RAG ingere: os 11 documentos, o cabeçalho de política, o tamanho de cada documento, o `regras.yaml` como fonte única dos números (convenção de unidade, consistência com os documentos, exemplos de conta ignorados) e o `README.md` com o que não é coberto.

### Modified Capabilities

Nenhuma. A seleção de arquivos da ingestão (`retrieval`) já deixa de fora qualquer arquivo sem dois dígitos e hífen no início ou sem a extensão `.md`, então o `regras.yaml` e o `README.md` ficam de fora sem mudar o requisito. A change só acrescenta esses dois nomes aos testes da ingestão.

## Impact

- `knowledge-base/`: 11 documentos, `regras.yaml`, `README.md`; sai o `FONTES.md`.
- `docs/history/knowledge-base-v1/`: a base antiga e o `FONTES.md`, como histórico das rodadas `v1`, `v2` e `cal-*`.
- `scripts/knowledge-base/`: módulo puro de consistência e os testes dele.
- `src/core/rag/ingest.test.ts` e o comentário do `KNOWLEDGE_FILE_PATTERN` em `src/core/rag/ingest.ts` (sem mudança de comportamento).
- `package.json` e `package-lock.json`: `yaml` em `devDependencies`.
- ADRs 0018 e 0019 e o índice `docs/adr/README.md`; `docs/business.md`, `docs/architecture.md`, `AGENTS.md`, `openspec/config.yaml`, `README.md`.
- Banco `dev`: o conjunto de trechos do preset `padrao` é substituído na ingestão. As respostas do assistente mudam assim que a ingestão roda.
