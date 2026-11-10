# 0019. Usar o `regras.yaml` como fonte única dos números

- **Status:** Aceito
- **Data:** 2026-11-10

## Contexto

Com a base da Rango ([ADR 0018](0018-empresa-ficticia-rango.md)), os números deixam de vir de páginas citadas e passam a ser definidos pelo projeto. Os mesmos valores aparecem em vários documentos (a comissão no de planos, no de repasse e no de promoções; o prazo de contestação no de cancelamentos e no de suporte), e as ferramentas da onda 2 vão precisar ler esses valores para fazer contas. Sem uma origem única, é fácil um documento ficar com um número diferente do outro.

## Decisão

- Todos os números da Rango ficam em `knowledge-base/regras.yaml`, que **não é ingerido** pelo RAG.
- A unidade fica no sufixo da chave: `_pct`, `_reais`, `_min`, `_horas`, `_dias`, `_dias_uteis`, `_km`, `_mb`, `_px` e `_qtd`.
- Um teste do Vitest (`scripts/knowledge-base/knowledge-base.test.ts`, com o módulo puro `scripts/knowledge-base/consistency.ts`) confere que todo número com unidade reconhecida nos documentos existe no YAML, com a mesma unidade. Parágrafos `Exemplo:` ficam de fora. Chaves que nenhum documento cita geram só um aviso.
- O teste lê o YAML com o pacote `yaml`, como dependência de desenvolvimento.

## Alternativas consideradas

- **Números só nos `.md`:** sem verificação, os documentos ficam incoerentes com facilidade, e as ferramentas teriam que extrair números de texto livre.
- **Um documento-tabela ingerido:** concorre na busca com os documentos de tema e duplica conteúdo no contexto do modelo.
- **Guardar as regras em JSON, que o Node lê sem dependência:** não aceita comentários e é pior para revisar e editar à mão.

## Consequências

- Mudar um número exige mudar o YAML e os documentos no mesmo PR; o `npm test` falha se só um dos dois mudar.
- Números sem unidade reconhecida (quantidades, dias do mês, horários do dia, notas) ficam no YAML, mas não são conferidos. O teste pega número inventado, não número trocado: a revisão humana do texto continua obrigatória.
- As ferramentas da onda 2 leem os valores do YAML.
- Nova dependência de desenvolvimento: `yaml`, que já estava no lockfile como dependência transitiva.
