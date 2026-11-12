# 0027. Busca por trecho, contexto por documento

- **Status:** Aceito
- **Data:** 2026-11-12

## Contexto

Na `v5-baseline`, com 73 perguntas (45 no escopo), a falsa recusa foi de 26,7% (meta de 10%) e o acerto, de 68,9% (meta de 80%). O Hit@K era de 95,6%: a busca achava o arquivo certo, mas o modelo recebia só os trechos que passavam do `minScore` e, em 11,1% das perguntas, esses trechos não tinham a resposta (contexto suficiente de 88,9%). Mesmo quando a seção certa vinha, o Flash-Lite preferia o fallback se faltava uma linha ao redor. Os documentos da base são curtos (de 11 a 17 mil caracteres para três deles).

## Decisão

- **A busca continua por trecho**, com os mesmos `topK`, `alpha`, `candidateLimit` e chunking. Só muda o que vai ao modelo.
- **`contextMode: "documents"` no preset `padrao`.** Depois da busca, `selectSources` escolhe até `maxContextDocs` arquivos (3, o padrão), na ordem do melhor score, e `buildContext` relê do banco os trechos desses arquivos (`listBySources`, uma consulta, filtrada por `embedding_model` e `chunk_config`) e os remonta, um bloco por documento. O `baseline` e o modo `chunks` mantêm o comportamento antigo.
- **Sem trecho acima do `minScore`, o fallback continua sem chamar o modelo.** O contexto do RAG segue efêmero e as fontes são os arquivos escolhidos.
- **Prompt:** uma instrução sobre linguagem informal e um terceiro exemplo, em `src/core/prompts.ts`.
- **`minScore` do `padrao` de 0.55 para 0.50.**

Cada passo foi medido sozinho: `documents` passou (acerto de 68,9% para 91,1%, falsa recusa de 26,7% para 6,7%); o prompt foi mantido (a mudança entre rodadas ficou no ruído); o `minScore` 0.50 foi aprovado (contexto suficiente de 100%, Hit@K de 97,8%, nenhuma recusa correta perdida). A rodada final (`v5`) tem acerto de 91,1%, falsa recusa de 6,7% e recusa correta de 100% (16 de 16).

## Alternativas consideradas

- **Trechos maiores (`chunkSize`).** Descartada: muda o chunking, exige reingestão e continua sem cobrir a seção vizinha de outro arquivo.
- **Palavras-chave por documento.** Descartada: mais manutenção na base e pouca cobertura de paráfrases.
- **Menu de assuntos para o modelo escolher.** Descartada: uma chamada a mais por pergunta e mais um ponto de falha.
- **A base inteira em toda pergunta** (48,6 mil caracteres). Descartada: tira o sentido da busca e triplica de novo o consumo.
- **Tabela `documents`.** Descartada: exige migração e reingestão sem ganho para 11 arquivos; remontar os trechos já gravados dá o mesmo texto e é o que foi ingerido em cada ambiente.

## Consequências

- **Consumo:** os tokens de entrada da rodada passaram de 120 mil (`v5-baseline`) para 250 mil (`v5-docs`) e 270 mil (`v5`), cerca do dobro. Dentro do limite por minuto com `--delay-ms 4000`; vale acompanhar na cota gratuita.
- **Limite da sobreposição:** `assembleDocuments` une os trechos por linha em branco, então a sobreposição entre janelas de uma seção longa se repete no texto. Hoje nenhuma seção passa do `chunkSize`, e o efeito é nulo.
- **Fontes:** passam a ser os documentos escolhidos (até 3), que podem incluir um arquivo sem trecho acima do `minScore`.
- **Resíduo:** as falsas recusas que sobram (121, 164 e 171) são de geração ou de busca, e a pergunta 129 responde sem o valor esperado.
- **Reversão:** `contextMode: "chunks"` no `padrao` devolve o turno antigo (mesmo prompt, nenhuma consulta a mais), sem migração nem reingestão.
