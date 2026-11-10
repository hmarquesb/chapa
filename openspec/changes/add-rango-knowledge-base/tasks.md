# Tasks

As tarefas marcadas **(autorização)** chamam o banco `dev` ou a API do Gemini. Elas já estão autorizadas no `CLAUDE.md`, mas só rodam **depois que a pessoa revisar o texto dos 11 documentos no PR** (tarefa 6.1). Nenhuma tarefa toca o `prod`. As decisões citadas são as do `design.md`.

## 1. Dependência e histórico

- [x] 1.1 Rodar `npm install --save-dev yaml@^2.9.1` (decisão 4). Verificar com `git diff package.json package-lock.json` que só entrou a declaração de `yaml` em `devDependencies` e que a versão resolvida continua 2.9.1.
- [x] 1.2 Mover a base antiga com `git mv` para `docs/history/knowledge-base-v1/` e criar o `README.md` dela (decisão 8). Verificar com `git status` que os 8 arquivos aparecem como renomeados e que `knowledge-base/` ficou vazia.

## 2. Módulo de consistência (teste antes do código)

- [x] 2.1 Escrever `scripts/knowledge-base/consistency.test.ts` com fixtures inline para cada regra do extrator da decisão 3 e para cada cenário da spec `knowledge-base` (número no formato brasileiro, `R$`, `%`, singular e plural, dia útil × dia, horário do dia ignorado, intervalo "de 5 a 90 minutos", "1200 × 900 px", parágrafo e item de lista `Exemplo:`, título e cabeçalho ignorados, mesmo valor com unidade diferente, aviso de chave não citada, chaves `_qtd` e sem sufixo fora, listas de números, contagem de palavras). Verificar que `npx vitest run scripts/knowledge-base/consistency.test.ts` falha porque o módulo não existe.
- [x] 2.2 Implementar `scripts/knowledge-base/consistency.ts` com as assinaturas exatas da decisão 3. Verificar que o teste da tarefa 2.1 passa e que `npm run typecheck` passa.

## 3. Regras e teste da base

- [x] 3.1 Criar `knowledge-base/regras.yaml` com o conteúdo exato da decisão 2. Verificar com um teste rápido (`flattenRules` sobre o arquivo lido) que nenhuma chave com sufixo de unidade tem valor não numérico.
- [x] 3.2 Escrever `scripts/knowledge-base/knowledge-base.test.ts` com as 6 verificações da decisão 5. Verificar que ele falha agora, apontando os 11 documentos como ausentes e o `README.md` da base como ausente.
- [x] 3.3 Em `src/core/rag/ingest.test.ts`, acrescentar `regras.yaml` aos casos negativos do `KNOWLEDGE_FILE_PATTERN` e trocar a fixture `FONTES.md` por `README.md` e `regras.yaml`; ajustar o comentário da linha 8 de `src/core/rag/ingest.ts`. Verificar que `npx vitest run src/core/rag/ingest.test.ts` passa sem mudar o código da ingestão.
- [x] 3.4 Em `scripts/eval/questions.test.ts`, ajustar os testes com o `eval/perguntas.json` real aos 11 documentos (decisão 1): contagem 11 e fontes factuais cobrindo de `01` a `07`. Verificar que `npx vitest run scripts/eval/questions.test.ts` passa.

## 4. Documentos da base

Para cada documento: seguir as regras de redação e a linha da tabela da decisão 6, com o cabeçalho de política. Verificar com `npx vitest run scripts/knowledge-base/` que o documento não gera erro de cabeçalho, tamanho ou valor.

- [x] 4.1 `01-planos-e-taxas.md`, com o `Exemplo:` de conta conferido à mão (comissão sobre os itens, taxa de pagamento, taxa de serviço fora do repasse).
- [x] 4.2 `02-repasse-financeiro.md`, com o `Exemplo:` de repasse coerente com o do `01`.
- [x] 4.3 `03-cancelamentos-e-contestacoes.md`.
- [x] 4.4 `04-cardapio-e-fotos.md`.
- [x] 4.5 `05-horarios-pausas-e-disponibilidade.md`.
- [x] 4.6 `06-avaliacoes-e-reputacao.md`.
- [x] 4.7 `07-embalagem-e-entrega.md`.
- [x] 4.8 `08-promocoes-e-cupons.md`, com o `Exemplo:` de cupom coparticipado coerente com a base da comissão.
- [x] 4.9 `09-suporte-e-chamados.md`.
- [x] 4.10 `10-conta-acessos-e-seguranca.md`.
- [x] 4.11 `11-pagamentos-e-fiscal.md`.
- [x] 4.12 `knowledge-base/README.md` (decisão 7). Verificar que `npx vitest run scripts/knowledge-base/` passa por inteiro e anotar no relatório os avisos de chaves não citadas, cada um com a justificativa (ou corrigir o texto para citar o valor).
- [x] 4.13 Revisão de coerência entre documentos: conferir que cada "regra derivada" da decisão 6 aparece igual em todos os documentos que tocam o assunto, que os menus do Painel Rango têm sempre o mesmo nome e que nenhum número está escrito por extenso. Verificar com `git grep -nE "\b(um|dois|três|quatro|cinco|seis|sete|oito|nove|dez) (minutos|horas|dias|por cento)" knowledge-base/` sem resultados e listar no relatório as chaves acrescentadas ao `regras.yaml` (seção "Valores acrescentados"), se houver.

## 5. ADRs e documentação

- [x] 5.1 Criar os ADRs 0018 e 0019 e as duas linhas do índice (decisão 9). Verificar que cada um tem Contexto, Decisão, Alternativas consideradas e Consequências, e que os links do índice apontam para arquivos que existem.
- [x] 5.2 Atualizar `docs/business.md`, `docs/architecture.md`, `AGENTS.md`, `openspec/config.yaml` e `README.md` como na tabela da decisão 10. Verificar com `git grep -n "FONTES.md" -- . ':!docs/history' ':!openspec/changes' ':!eval'` sem resultados fora do histórico, e com `git diff README.md` que o bloco de métricas e os exemplos de conversa do topo não mudaram.
- [x] 5.3 Varredura de empresas reais. Rodar `git grep -niE "ifood|rappi|uber ?eats|99 ?food|keeta|aiqfome|portal do parceiro|gestor de pedidos" -- knowledge-base/ docs/business.md docs/architecture.md AGENTS.md` e verificar que não há resultado. (`src/` fica com a change `rebrand-app-texts-to-rango`.)

## 6. Ingestão no `dev` e verificação manual

- [ ] 6.1 **(pessoa)** Revisar o texto dos 11 documentos, o `README.md` da base e os "Valores acrescentados" no PR. O orquestrador marca esta tarefa quando a pessoa aprovar.
- [ ] 6.2 **(autorização)** Rodar `npm run ingest` (preset `padrao`). Verificar: a linha `Banco:` mostra um host `*.neon.tech`, os 11 arquivos aparecem na contagem por arquivo, nenhum `regras.yaml` nem `README.md`, e o total gravado é igual ao `count` impresso.
- [ ] 6.3 **(autorização)** Rodar `npm run chat -- --nome "Pizzaria Bella" --plano "Plano Próprio" --debug` com três perguntas: a comissão do plano (espera 11%), quanto custa o Rango Chama (espera R$ 8,90 e R$ 1,50) e qual o prazo de um chamado financeiro (espera 3 dias úteis, fonte `09-suporte-e-chamados.md`). Verificar e registrar no relatório o status, as fontes e os termos de cada resposta. Uma resposta errada não bloqueia a change (a medição é a `v3`), mas vai para o relatório.

## 7. Verificação final

- [x] 7.1 Rodar `npx openspec validate add-rango-knowledge-base --strict` e verificar que a change é válida.
- [x] 7.2 Rodar `npm run lint`, `npm run typecheck` e `npm test` e verificar que os três passam.

## Workflow follow-up

- Depois do merge, arquivar a change num PR próprio (`docs(openspec): archive add-rango-knowledge-base`); o archive cria `openspec/specs/knowledge-base/spec.md`.
- Depois do merge desta change e da `rebrand-app-texts-to-rango`: reingerir o `prod` e rodar o smoke na demo (H5; a pessoa autoriza o smoke).
- A `expand-eval-to-50-questions` começa o *apply* depois deste merge, com a branch dela rebaseada na `main`.
- Remover o worktree `../chapa-worktrees/add-rango-knowledge-base` e a branch `feat/add-rango-knowledge-base`.
