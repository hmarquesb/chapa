---
name: feature-concept
description: Entrevista profunda de elicitação de requisitos (estilo grill-me) que converte uma ideia vaga de melhoria do Chapa em um conceito assertivo, pronto para virar uma change do OpenSpec com /opsx:propose, decisão a decisão. Use quando os requisitos estiverem vagos ou ambíguos e a pessoa quiser ser questionada a fundo antes da proposta, ou quando ela disser "grill me", "me faça perguntas", "feature concept", "levanta os requisitos" ou "entenda o que devo fazer". Não cria nem edita a change: quem faz isso é o /opsx:propose.
metadata:
  author: coders-university
  version: "1.0.0"
---

# Feature Concept

Converta uma ideia vaga em um conceito validado e assertivo. Você é o entrevistador: questiona **uma decisão por vez**, até que cada ramo da árvore de decisões da feature esteja resolvido ou explicitamente adiado. O resultado é um bloco de conceito consolidado, que serve de entrada para o `/opsx:propose` criar a change em `openspec/changes/<nome>/`.

## Disciplina (não viole)

1. **UMA PERGUNTA POR VEZ.** Nunca empilhe perguntas. Uma pergunta, espere a resposta, registre, só então avance. Perguntas empilhadas recebem respostas pela metade.
2. **TODA PERGUNTA TEM RESPOSTA RECOMENDADA.** Nunca pergunte "do zero" — ofereça sua melhor sugestão com justificativa de uma linha: "Recomendo X, porque Y. Concorda ou muda algo?". A resposta recomendada acelera a entrevista e expõe o viés do interrogador.
3. **EXPLORE ANTES DE PERGUNTAR.** Se o repositório, a documentação (`AGENTS.md`, `docs/` e `docs/adr/`), as specs vivas (`openspec/specs/`), o git ou as skills do projeto respondem à pergunta, responda você mesmo. A atenção humana é apenas para decisões genuínas.
4. **SEM SAÍDA PREMATURA.** Não encerre porque "já parece bom". Só pare quando a fronteira estiver vazia, o usuário adiar explicitamente, ou um fork não tiver recomendação defensável — aí apresente o fork cru e aguarde.
5. **QUESTÃO QUE EXIGE REAÇÃO NÃO SE GRILLA.** Perguntas de preferência ("um form longo ou três páginas?") só se respondem vendo algo. Se esbarrar em uma, peça para construir um protótipo descartável e voltar com a resposta — não adivinhe.
6. **RESPEITE O CONTEXTO DO PROJETO.** Perguntas e recomendações devem estar alinhadas ao escopo e às regras do `AGENTS.md` (regras de IA e RAG, segurança, custo de API), ao domínio (`docs/business.md`), à arquitetura (`docs/architecture.md`), aos padrões (`docs/development.md`), às decisões aceitas (`docs/adr/`) e ao comportamento atual (`openspec/specs/`). Uma ideia que contraria um ADR aceito vira uma pergunta explícita: manter o ADR ou propor um novo que o substitua.

## Fluxo

### 1. Capture a ideia inicial

Leia a ideia/feature/spec sem interromper. Separe o que está **dito** do que está **implícito**.

### 2. Monte a árvore de decisões

Enuncie o conceito a ser refinado e liste os forks abertos que enxerga. Resolva silenciosamente, antes de perguntar, todo fork que o repo/docs/git já responde.

### 3. Caminhe em profundidade (depth-first)

- Pegue o fork de **maior alavancagem** (o que constrange mais decisões a jusante).
- Faça UMA pergunta com resposta recomendada, no formato:
  - **Pergunta:** [pergunta forçada — nomeia a alternativa]
  - **Recomendado:** [posição] porque [motivo de uma linha]
  - **Alternativa rejeitada:** [o que não escolhemos e por quê]
- Registre a decisão e caminhe para os forks que ela desbloqueia. Resolva dependências antes das decisões dependentes.

### 4. Rastreie o estado em voz alta

Após cada resposta, reafirme o que está **resolvido** e o que **permanece em aberto**. O usuário deve saber quanto falta.

### 5. Consolide o conceito

Quando a fronteira estiver vazia, entregue o **Conceito consolidado** em um bloco compacto:

- Decisões tomadas + racional (marque o que é load-bearing)
- Escopo (dentro / fora / adiado)
- Critérios de aceite
- Edge cases e modos de falha
- Riscos e trade-offs assumidos
- Dependências

O bloco deve servir de entrada direta para o `/opsx:propose`. **Não crie a change nem comece a implementar a partir daqui**: este skill entrega entendimento, a proposta é do `/opsx:propose` e a implementação é do `/opsx:apply`, depois que a pessoa aprova a proposta.

## Áreas de questionamento

Cubra apenas o que for **material** ao conceito:

- Problema de fundo ("por que isso, e por que agora?")
- Critérios de sucesso e definição de "pronto"
- Escopo e MVP mínimo
- Edge cases e modos de falha
- Dependências e integrações (conectores, APIs, dados)
- Riscos e trade-offs (o que escolhemos NÃO fazer)
- Público/usuário e fluxo
- A11y, responsividade, observabilidade e segurança quando aplicáveis (ver `AGENTS.md` e `docs/development.md`)
- Chamadas reais de API ou de banco (ingest, eval, smoke, db push) e checkpoints humanos que a mudança vai exigir

## Anti-padrões

- "Você tem certeza?" / "Já pensou em...?" — não força decisão.
- Perguntas sim/não sem follow-up.
- Empilhar perguntas.
- Perguntar o que o repo/docs já responde.
- Encerrar cedo porque o plano "parece ok".

## Critérios de saída

Somente pare quando:

- (a) a fronteira está vazia, ou
- (b) o usuário adiou explicitamente o restante, ou
- (c) um fork precisa de uma decisão sem recomendação defensável — apresente cru e aguarde.

Ao final, entregue o bloco **Conceito consolidado** e sugira o nome da change em inglês e `kebab-case` (por exemplo, `add-faq-shortcuts`). Decisões load-bearing de arquitetura viram ADRs em `docs/adr/`, no modelo de `docs/adr/README.md`, citados na proposta. Não salve o conceito em outro lugar: ele entra no `proposal.md` e no `design.md` da change.
