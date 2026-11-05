# S02 — Base de conhecimento

| Campo | Valor |
|---|---|
| **ID** | S02 |
| **Status** | ✅ Aprovada |
| **Depende de** | S00 |
| **Chamadas reais de API** | Não usa LLM. Usa busca e leitura de páginas públicas na web (WebSearch/WebFetch) |

## Escopo

Escreve os 7 documentos em Markdown que o RAG usa como fonte de verdade. Eles reescrevem, com palavras próprias, o conteúdo público de ajuda para restaurantes que **já são parceiros** de um app de delivery.

**Entrega:**
- `knowledge-base/01-*.md` a `knowledge-base/07-*.md`, no formato do RF3.
- `knowledge-base/FONTES.md`, com as fontes consultadas e as lacunas conhecidas.

**Fora do escopo:**
- Cadastro de novos restaurantes, requisitos para entrar na plataforma e qualquer conteúdo para quem ainda não é parceiro. Perguntas sobre isso são fora de escopo no eval (S08).
- Ingestão e chunking (S04).
- Conteúdo para entregadores ou clientes finais.

**Arquivos que podem ser criados ou alterados:**
- `knowledge-base/01-planos-e-taxas.md`
- `knowledge-base/02-repasse-financeiro.md`
- `knowledge-base/03-cancelamentos-e-contestacoes.md`
- `knowledge-base/04-cardapio-e-fotos.md`
- `knowledge-base/05-horarios-pausas-e-disponibilidade.md`
- `knowledge-base/06-avaliacoes-e-reputacao.md`
- `knowledge-base/07-embalagem-e-entrega.md`
- `knowledge-base/FONTES.md`
- Remover `knowledge-base/.gitkeep`

**Não tocar:**
- Nada fora de `knowledge-base/`.

## Contexto

- Seções do `ARCHITECTURE.md`: abertura (público e escopo) e "Arquitetura do projeto" (`knowledge-base/`).
- Problema que resolve: a qualidade do assistente depende da base. Documentos com seções curtas, autossuficientes e no vocabulário do parceiro melhoram a recuperação.
- Decisões já tomadas:
  - O público é só quem já é parceiro. Não há documento de cadastro.
  - O plano gratuito do Gemini pode usar o conteúdo enviado. Por isso a base só tem texto público reescrito, sem dado pessoal nem conteúdo restrito.
  - É um projeto de estudo, não oficial. O texto não usa logo, marca nem se apresenta como canal oficial.
  - A ingestão (S04) só lê arquivos que casam com `/^\d{2}-.*\.md$/`. O `FONTES.md` nunca é ingerido.

### Contratos

Formato consumido pela S04 (chunking por seção):

- A primeira linha é o título do documento: `# Título`.
- Logo abaixo vem uma única linha de fonte, que começa com `> Fonte:`. A S04 descarta essa linha do conteúdo indexado.
- O corpo é dividido em seções `## Nome da seção`. Não use `#` para outras coisas e evite `###`.

## Requisitos funcionais

### RF1. Pesquisa

Use WebSearch e WebFetch para encontrar páginas **públicas** de ajuda a restaurantes parceiros (central de ajuda do parceiro, portal do parceiro, blog para parceiros). Fontes de terceiros (notícias, blogs de consultoria) servem só para orientar a busca. Números só entram se vierem de uma fonte oficial. Para cada documento, registre de 1 a 3 URLs consultadas.

- **Critério de aceite:** Dado o `FONTES.md`, quando o revisor abre as URLs, então cada documento tem pelo menos 1 URL oficial e pública.

### RF2. Arquivos e conteúdo mínimo

| Arquivo | Seções mínimas (uma `##` para cada) |
|---|---|
| `01-planos-e-taxas.md` | O que diferencia os planos (restaurante entrega × app entrega) · Comissão · Mensalidade · Taxa de pagamento online · Como mudar de plano |
| `02-repasse-financeiro.md` | Ciclo de repasse · Prazos · Antecipação · Como ler o extrato · Descontos no repasse |
| `03-cancelamentos-e-contestacoes.md` | Quem cancela e por quê · Quem arca com o custo · Como contestar · Prazos para contestar |
| `04-cardapio-e-fotos.md` | Estrutura do cardápio · Fotos · Complementos e adicionais · Itens esgotados · Preços |
| `05-horarios-pausas-e-disponibilidade.md` | Abrir e fechar a loja · Pausas programadas · Impacto da indisponibilidade na visibilidade |
| `06-avaliacoes-e-reputacao.md` | Como a nota é calculada · Como responder avaliações · O que derruba a nota · Como melhorar |
| `07-embalagem-e-entrega.md` | Boas práticas de embalagem · Lacre · Tempo de preparo · Itens que exigem cuidado |

- **Critério de aceite:** Dado cada arquivo, quando o revisor roda `grep -c '^## ' knowledge-base/0*.md`, então cada um tem de 3 a 6 seções e cobre os temas da tabela.

### RF3. Formato de cada arquivo

```md
# Repasse financeiro

> Fonte: <URL 1>; <URL 2>. Consultadas em DD/MM/AAAA. Texto reescrito para fins de estudo, sem afiliação com a empresa.

## Ciclo de repasse

...
```

- Entre 300 e 900 palavras por arquivo.
- Seções `##` com 60 a 250 palavras. É o tamanho que a S04 transforma em um trecho.
- **Cada seção se sustenta sozinha.** Repita o assunto ("O repasse do plano em que o app entrega...") em vez de "Ele...". Isso melhora a recuperação.
- Use o vocabulário do parceiro ("repasse", "contestação", "loja fechada", "pausa") e inclua uma vez sinônimos informais ("o dinheiro das vendas", "quando cai na conta").
- Linguagem simples, para o dono ou a dona de restaurante sem conhecimento técnico.
- No corpo, diga "o app" ou "a plataforma", nunca o nome da empresa. Sem imagens.

- **Critério de aceite:** Dado cada arquivo, quando o revisor roda `wc -w` e `head -3`, então o arquivo tem de 300 a 900 palavras, começa com `# ` e a terceira linha começa com `> Fonte:`.

### RF4. Regras sobre números

- Todo número (percentual, prazo, valor) aparece com a atribuição *"conforme <nome da página>, consultada em DD/MM/AAAA"*.
- Se a fonte oficial não trouxer o número, o texto fica genérico ("a comissão varia conforme o plano; confira o valor atualizado no Portal do Parceiro"). Isso é proposital: essas lacunas viram perguntas de fallback no eval.
- Nunca invente números, nomes de plano, nomes de tela ou procedimentos.

- **Critério de aceite:** Dado `grep -nE '[0-9]+ ?(%|dias?|horas?|minutos?|R\$)' knowledge-base/0*.md`, quando o revisor confere cada linha, então todas têm a atribuição de fonte.

### RF5. `FONTES.md`

Tabela com: arquivo, URLs, data de consulta e o que **não** foi encontrado nas fontes oficiais (lacunas). Depois da tabela, uma lista "Perguntas que a base não responde", com pelo menos 3 perguntas plausíveis de parceiro que caem nessas lacunas. A S08 usa essa lista para montar perguntas de fallback.

- **Critério de aceite:** Dado o `FONTES.md`, então ele tem uma linha por documento e pelo menos 3 perguntas na lista de lacunas.

### RF6. Revisão humana (checkpoint H3)

A pessoa revisa os 7 documentos (números, procedimentos e tom) antes da primeira ingestão.

- **Critério de aceite:** Dado o relatório da spec, quando a pessoa termina a revisão, então registra "H3 aprovado" (ou as correções pedidas) e o orquestrador só libera a ingestão depois disso.

## Requisitos não funcionais

- **RNF1. Direitos autorais:** nenhum trecho com mais de 25 palavras é idêntico à fonte. *Verificação:* o revisor compara por amostragem pelo menos 2 seções de cada documento com a página original.
- **RNF2. Marca:** o nome da empresa não aparece no corpo dos documentos, só nas URLs da linha de fonte. *Verificação:* `grep -n` pelo nome no corpo (fora da linha `> Fonte:`) volta vazio.
- **RNF3. Privacidade:** nenhum dado pessoal, telefone, e-mail ou exemplo com CPF/CNPJ real. *Verificação:* `grep -nE '[0-9]{3}\.?[0-9]{3}\.?[0-9]{3}-?[0-9]{2}|@' knowledge-base/0*.md` volta vazio.

## Você deve

- Seguir as regras do `AGENTS.md`, em especial as de marca e de números.
- Priorizar fontes oficiais e registrar a data de consulta.
- Escrever cada seção para ser entendida sem as outras.
- Entregar um relatório com: arquivos criados, cada critério de aceite com a evidência (comando + saída resumida), as lacunas encontradas e a pendência H3.

## Você não deve

- Editar arquivos fora de `knowledge-base/`.
- Escrever conteúdo sobre cadastro de novos restaurantes.
- Inventar números, nomes de plano ou procedimentos.
- Copiar páginas inteiras ou parágrafos literais.
- Usar logo, marca ou imagens.
- Fazer commit ou push.

## Tecnologias

| Tecnologia | Uso nesta spec |
|---|---|
| Markdown | Formato dos documentos |
| WebSearch / WebFetch | Pesquisa das fontes públicas |
