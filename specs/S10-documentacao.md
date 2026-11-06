# S10 — Documentação final

| Campo | Valor |
|---|---|
| **ID** | S10 |
| **Status** | ✅ Aprovada |
| **Depende de** | S08 (resultados das rodadas) e S09 (link da demo) |
| **Chamadas reais de API** | Não |

## Escopo

Expande o `README.md` do commit 0 para que ele seja ao mesmo tempo o documento do projeto (arquitetura, memória, RAG, avaliação, decisão de customização e resumo executivo) e a vitrine de portfólio.

**Entrega:**
- `README.md` com a estrutura do RF1.
- `LICENSE` (MIT).
- `ARTIGO.md` (opcional): rascunho de post técnico.

**Fora do escopo:**
- Mudanças de código, de base ou de eval.
- Reescrever o `ARCHITECTURE.md` (ele continua como referência para agentes).

**Arquivos que podem ser criados ou alterados:**
- `README.md`
- `LICENSE`
- `ARTIGO.md` (opcional)
- `docs/assets/` (GIF ou capturas da demo, se a pessoa fornecer)

**Não tocar:**
- `src/`, `scripts/`, `eval/`, `knowledge-base/`, `supabase/`, `specs/`, `ARCHITECTURE.md`, `AGENTS.md`, `CLAUDE.md`

## Contexto

- Seções do `ARCHITECTURE.md`: todas. O README explica para humanos o que o `ARCHITECTURE.md` define para agentes.
- Problema que resolve: o projeto precisa de um documento com contexto, escopo, stack e justificativas, diagrama de arquitetura, fluxo de uma requisição, memória, pipeline RAG, relatório de avaliação, decisão de customização e resumo executivo. O README também é lido por recrutadores, que dão cerca de 60 segundos para o topo da página.
- Decisões já tomadas:
  - A customização é **RAG + prompt engineering**, sem fine-tuning. O README justifica essa escolha.
  - Só Gemini. Sem comparação entre provedores.
  - Público: restaurantes que já são parceiros. Cadastro fica fora do escopo.
  - Projeto pessoal de estudo, não oficial. Nome de empresa real só no aviso de não afiliação.
  - O README do commit 0 já explica o propósito do projeto e as decisões tomadas para simplificar o desenvolvimento. Esse conteúdo continua no README final, atualizado com o que o código entregou.

### Contratos

**Usa** (fontes dos números, só leitura):
- `eval/resultados/v1.json`, `v2.json`, `COMPARACAO.md` e `CALIBRACAO.md` (S08)
- `DEPLOY.md` (URL de produção, S09)
- `src/config.ts` (modelos e parâmetros finais)
- `knowledge-base/FONTES.md` (lacunas da base)

## Requisitos funcionais

### RF1. Estrutura do `README.md`

1. **Topo (cabe numa tela):** nome, uma frase sobre o problema, link da **demo**, um GIF ou transcrição curta mostrando uma resposta com fontes e uma recusa, e a **tabela de métricas v1 × v2** (de `COMPARACAO.md`).
2. **Aviso e propósito:** "Projeto de estudo, não oficial e sem afiliação com nenhuma empresa de delivery.", seguido do propósito do projeto e da tabela de decisões tomadas para simplificar, que vêm do README do commit 0.
3. **Resumo executivo** (meia página): problema, solução, resultados em números, limitações e próximos passos.
4. **Como rodar localmente**, em até 6 comandos: `npm install` → `.env.local` a partir do `.env.example` → `npx supabase link` + `npx supabase db push --remote` → `npm run ingest` → `npm run dev`. Menciona `npm run chat -- --debug`.
5. **Arquitetura:** diagrama Mermaid com navegador, Route Handlers, `core/` (assistente, RAG, memória, guardrails), `infra/` (Gemini, Postgres), Supabase e Vercel Cron. Tabela da stack com a justificativa de cada escolha (Next.js na Vercel, Supabase com pgvector e busca textual, Gemini com `@google/genai`, sem frameworks de agente).
6. **Fluxo de uma requisição**, passo a passo, conferido no código final: guardrail de entrada → histórico + resumo → reescrita → embedding → busca híbrida → geração → guardrail de saída → salvar.
7. **Memória e contexto:** tabela com sessão anônima, mensagens recentes, resumo persistido por sessão, perfil do restaurante, link de continuação e expiração em 7 dias. Explica por que os trechos recuperados não são salvos.
8. **Pipeline RAG:** chunking por seção com cabeçalho, embeddings com tarefa de consulta e de documento, busca híbrida (semântico + palavras-chave em português), `minScore` e fallback sem chamar o LLM.
9. **Guardrails:** padrões bloqueados, exemplos de perguntas que passam ("O repasse cai via Pix?") e o guardrail de saída.
10. **Avaliação:** metodologia, composição das 20 perguntas, métricas × meta, tabela v1 × v2 e links para os relatórios.
11. **Decisão de customização: RAG × fine-tuning.** Tabela de critérios (conhecimento que muda, rastreabilidade das fontes, custo e tempo de iteração, necessidade de GPU, volume de dados) e a decisão justificada. Quando o fine-tuning faria sentido (tarefa estreita, estável e de alto volume) como próximo passo.
12. **Experimentos e aprendizados:** o que mudou de v1 para v2 e por quê, a partir do `CALIBRACAO.md`.
13. **Falhas encontradas:** de 2 a 3 respostas ruins reais da avaliação, com a causa de cada uma.
14. **Segurança, privacidade e custos:** chave só no servidor, RLS sem policies, IP guardado como HMAC, logs sem conteúdo, link de continuação como credencial, planos gratuitos e o fato de o plano gratuito do Gemini poder usar o conteúdo enviado.
15. **Limitações e próximos passos.**
16. **Licença.**

- **Critério de aceite:** Dado o README, quando o revisor confere a lista, então as 16 seções estão presentes e na ordem.

### RF2. Números rastreáveis

Todo número do README (métricas, latência, tokens, quantidade de trechos) sai de um arquivo de `eval/resultados/`, do `config.ts` ou da saída da ingestão. Nada arredondado para cima.

- **Critério de aceite:** Dado o README, quando o revisor confere por amostragem 5 números, então todos batem com a fonte.

### RF3. Mermaid válido

- **Critério de aceite:** Dado o bloco Mermaid, quando o revisor cola o diagrama no editor do Mermaid (ou ele renderiza no preview do GitHub), então não há erro de sintaxe.

### RF4. Como rodar funciona

- **Critério de aceite:** *(Orquestrador, com a chave da pessoa)* Num clone limpo apontando para o `dev`, os comandos de "Como rodar localmente" sobem a aplicação e uma pergunta no escopo é respondida.

### RF5. `LICENSE`

MIT, com o nome e o ano que a pessoa informar.

- **Critério de aceite:** Dado o arquivo, então ele tem o texto MIT com o nome informado.

## Requisitos não funcionais

- **RNF1. Público e tom:** escrito para avaliadores técnicos e recrutadores de vagas de AI Engineer, em PT-BR, com frases curtas, números antes de adjetivos e nada de marketing. *Verificação:* leitura.
- **RNF2. Marca:** nome de empresa real só no aviso de não afiliação, se for necessário. *Verificação:* `grep -ni` pelo nome no README.
- **RNF3. Tamanho:** o README fica abaixo de ~450 linhas. Se passar, as seções 6 a 9 vão para `docs/arquitetura.md` e o README fica com um resumo e o link. *Verificação:* `wc -l README.md`.
- **RNF4. Links:** todos os links relativos apontam para arquivos que existem. *Verificação:* conferir cada link relativo com `ls`.

## Você deve

- Seguir as regras do `AGENTS.md`, em especial as de marca.
- Ler o código final antes de descrever o fluxo, e não o que as specs previam.
- Tirar os números dos arquivos de resultado.
- Entregar um relatório com: arquivos alterados, cada critério de aceite com a evidência, desvios da spec e pendências humanas (GIF, nome para a licença).

## Você não deve

- Editar arquivos fora da lista de "Arquivos que podem ser criados ou alterados".
- Inventar ou arredondar números.
- Usar logo, nome ou cores de empresas reais fora do aviso.
- Fazer commit ou push.

## Tecnologias

| Tecnologia | Uso nesta spec |
|---|---|
| Markdown | README, licença e artigo |
| Mermaid | Diagrama de arquitetura |
