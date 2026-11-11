# Registros de decisão de arquitetura (ADRs)

Cada arquivo registra uma decisão: contexto, decisão, alternativas e consequências. Um ADR aceito não é reescrito; um ADR novo o substitui.

Status: `Proposto` → `Aceito` (ou `Rejeitado`) → `Substituído por NNNN`.

| ADR | Decisão | Status |
|---|---|---|
| [0001](0001-supabase-postgres-pgvector.md) | Usar Supabase Postgres com pgvector em vez de SQLite | Aceito (o `dev` passou para o Neon pelo 0017) |
| [0002](0002-sem-framework-de-agente.md) | Construir RAG, memória e guardrails à mão, sem framework de agente | Aceito |
| [0003](0003-github-actions-e-vercel-cron.md) | Automatizar com GitHub Actions e Vercel Cron, não com n8n nem pg_cron | Aceito |
| [0004](0004-sem-streaming.md) | Devolver respostas completas em vez de streaming | Aceito |
| [0005](0005-driver-postgres-rls-sem-policies.md) | Acessar o banco só pelo servidor, com o driver postgres | Aceito |
| [0006](0006-bancos-dev-e-prod-separados.md) | Usar dois projetos Supabase, dev e prod | Substituído por 0017 |
| [0007](0007-pasta-knowledge-base.md) | Chamar a pasta de fontes do RAG de knowledge-base/ | Aceito |
| [0008](0008-vitest-e-tsx.md) | Usar Vitest e tsx nos testes e nos scripts locais | Aceito |
| [0009](0009-somente-gemini.md) | Usar o Gemini como único provedor de LLM, pelo @google/genai | Aceito |
| [0010](0010-link-de-continuacao-em-vez-de-login.md) | Usar um link de continuação da sessão em vez de login | Substituído por 0020 |
| [0011](0011-somente-parceiros-atuais.md) | Restringir o assistente a restaurantes que já são parceiros | Aceito |
| [0012](0012-rag-e-prompt-em-vez-de-fine-tuning.md) | Personalizar com RAG e engenharia de prompt, não com fine-tuning | Aceito |
| [0013](0013-fluxo-de-branch-por-spec.md) | Uma branch, um worktree e um PR por spec | Aceito |
| [0014](0014-flash-lite-como-modelo-de-chat.md) | Usar o Flash-Lite também como modelo de chat | Aceito |
| [0015](0015-openspec-para-mudancas-incrementais.md) | Usar o OpenSpec para as mudanças depois da construção inicial | Aceito |
| [0016](0016-specs-da-construcao-em-docs-history.md) | Guardar as specs da construção em docs/history/build-specs/ | Aceito |
| [0017](0017-neon-como-banco-dev.md) | Usar o Neon como banco dev e o Supabase só no prod | Aceito |
| [0018](0018-empresa-ficticia-rango.md) | Usar a empresa fictícia Rango no lugar de fontes públicas | Aceito |
| [0019](0019-regras-yaml-fonte-unica.md) | Usar o regras.yaml como fonte única dos números | Aceito |
| [0020](0020-login-google-e-conta-demo.md) | Exigir login com Google, com uma conta demo isolada por clique | Aceito |
| [0021](0021-autorizacao-por-conta-no-repositorio.md) | Autorizar o acesso às conversas por conta, no repositório | Aceito |
| [0022](0022-identidade-visual-sobre-tokens-do-shadcn.md) | Aplicar a identidade visual da Rango sobre os tokens do shadcn | Aceito |
| [0023](0023-filtro-local-de-termos-no-perfil.md) | Filtrar localmente os termos do nome e da cozinha do perfil | Aceito |
| [0024](0024-perfil-estruturado-e-municipios-do-ibge.md) | Estruturar a cozinha e o local do perfil e guardar os municípios do IBGE no repositório | Aceito |

## Modelo

```markdown
# NNNN. Título

- **Status:** Proposto
- **Data:** AAAA-MM-DD

## Contexto
## Decisão
## Alternativas consideradas
## Consequências
```
