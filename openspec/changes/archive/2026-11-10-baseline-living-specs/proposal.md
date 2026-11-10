# Proposal

## Why

Desde o [ADR 0015](../../../docs/adr/0015-openspec-para-mudancas-incrementais.md), toda mudança nova é uma change do OpenSpec que escreve deltas sobre as specs vivas em `openspec/specs/`. Essa pasta ainda está vazia: o comportamento atual só existe espalhado nas specs históricas S00 a S10, no código e nos testes. Sem uma linha de base, a primeira change de produto teria que descrever o sistema inteiro antes de descrever a própria mudança, e os deltas não teriam onde se apoiar.

## What Changes

- Registra o comportamento **atual** do Chapa como sete capacidades novas, cada uma com requisitos e cenários tirados do código e dos testes da `main`.
- Nenhum comportamento muda. Onde o código e as specs históricas divergem, vale o código (é ele que está em produção), e a divergência fica anotada no `design.md`.
- Depois do merge, o `/opsx:archive` copia os deltas para `openspec/specs/`, que passa a ser a fonte do comportamento atual.

Fora do escopo:

- Qualquer mudança de código, prompt, parâmetro do RAG, base de conhecimento ou interface. Se a escrita das specs revelar um defeito, ele vira uma change própria depois desta.
- O script de smoke e o runbook de deploy (`scripts/smoke.ts`, `DEPLOY.md`): verificam o deploy, não descrevem comportamento do produto.
- A CLI de desenvolvimento (`npm run chat`): é ferramenta de depuração. O canal `cli` aparece só onde afeta o comportamento das sessões.
- O conteúdo da base de conhecimento (`knowledge-base/`) e as regras de redação dela, que continuam no `AGENTS.md` e no `docs/business.md`.
- O arquivamento das specs históricas `specs/S00` a `S10`, que continuam como estão.

Chamadas reais: **nenhuma**. A change não roda `ingest`, `eval`, `smoke` nem `db push`, e não precisa de checkpoint humano além da revisão desta proposta e do merge.

Não há decisão de arquitetura nova, então não há ADR novo.

## Capabilities

### New Capabilities

- `guardrails`: bloqueio de entrada (vazia, longa demais, CPF, cartão, senha informada, pedido de senha) e de saída (dado sensível, sinais proibidos), com as mensagens fixas de cada caso.
- `retrieval`: ingestão da base (seleção dos arquivos, fatiamento por preset, embeddings, substituição atômica por conjunto) e busca híbrida (filtro por `embedding_model` e `chunk_config`, combinação com `alpha`, `minScore`, `topK`).
- `answer-generation`: o turno do assistente, do prompt à resposta: instrução de sistema, perfil, contexto com rótulos de fonte, fallback sem chamar o LLM, detecção de fallback na resposta, lista de fontes, status, retry e erros do provedor.
- `session-memory`: sessão anônima, perfil por sessão, gravação só da pergunta e da resposta finais, histórico recente, resumo das mensagens antigas, reescrita da pergunta e expiração depois de 7 dias.
- `chat-api`: as quatro rotas (`POST /api/chat`, `GET /api/sessions/[id]/messages`, `GET /api/health`, `GET /api/cron/cleanup`), validação do corpo, limite de tamanho, rate limit por IP com HMAC, mapeamento de erros para textos fixos em PT-BR, cabeçalhos e logs sem conteúdo.
- `chat-ui`: a página única: conversa, fontes, perguntas de exemplo, perfil opcional, estados de envio e erro, sessão no `localStorage`, link de continuação e "Nova conversa".
- `evaluation`: o conjunto de perguntas e a validação dele, a execução no mesmo `handleMessage`, as métricas, o juiz opcional, a parada por cota, os arquivos de resultado e a comparação entre rodadas.

### Modified Capabilities

Nenhuma: `openspec/specs/` está vazia.

## Impact

- Arquivos novos só em `openspec/changes/baseline-living-specs/`. Depois do archive, em `openspec/specs/<capacidade>/spec.md`.
- Nenhum arquivo de `src/`, `scripts/`, `supabase/`, `knowledge-base/` ou `eval/` muda.
- As próximas changes passam a escrever deltas (`MODIFIED`, `ADDED`, `REMOVED`) sobre estas sete capacidades.
