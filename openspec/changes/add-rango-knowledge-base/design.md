# Design

## Context

- A ingestão (`scripts/ingest.ts` → `ingestDocuments` em `src/core/rag/ingest.ts`) lê `knowledge-base/` e só aceita nomes que casam com `KNOWLEDGE_FILE_PATTERN = /^\d{2}-.*\.md$/`. O `regras.yaml` e o `README.md` já ficam de fora sem mudar código.
- O chunking do preset `padrao` é `markdown`, com `chunkSize` 1.200 caracteres e `chunkOverlap` 150: cada seção `##` curta vira um ou poucos trechos. A base nova mantém esse formato (seções `##` curtas, uma ideia por seção).
- O `scripts/eval.ts` também filtra os arquivos com o `KNOWLEDGE_FILE_PATTERN` para validar a `fonte_esperada`. Os nomes `01` a `07` não mudam, então o `eval/perguntas.json` atual continua válido (só desatualizado) até a change `expand-eval-to-50-questions`. Duas asserções do `scripts/eval/questions.test.ts` (exatamente 7 documentos e uma pergunta factual por documento) quebram com os 11 arquivos, e por isso esta change as ajusta (decisão 1).
- O Vitest roda `src/**/*.test.ts` e `scripts/**/*.test.ts`, sem rede. O pacote `yaml@2.9.1` já está no lockfile como dependência transitiva.
- Os valores e nomes da Rango vêm do §6 do PRD (peça 1 do Chapa v2). Motivação: ver `proposal.md`.

## Goals / Non-Goals

**Goals:**

- Uma base sem lacunas acidentais, em que cada número tem uma origem verificável (`regras.yaml`) e um teste que pega divergências.
- Documentos com o mesmo formato dos atuais, para que a `v3` meça a base e não o chunking.
- Preservar a base antiga como histórico das rodadas `v1`, `v2` e `cal-*`.

**Non-Goals:**

- Código de produção novo. O módulo de consistência é usado só pelos testes; as ferramentas da onda 2 decidem depois onde ler o YAML em tempo de execução.
- Verificar números sem unidade reconhecida (quantidades, dias do mês, horários do dia, notas). Eles ficam no YAML, mas fora do teste.

## Decisions

### 1. Arquivos que o implementador pode criar ou alterar

Nenhum outro arquivo é tocado.

| Arquivo | Ação |
|---|---|
| `knowledge-base/01-planos-e-taxas.md` … `07-embalagem-e-entrega.md` | Reescrever do zero (decisão 6) |
| `knowledge-base/08-promocoes-e-cupons.md`, `09-suporte-e-chamados.md`, `10-conta-acessos-e-seguranca.md`, `11-pagamentos-e-fiscal.md` | Criar (decisão 6) |
| `knowledge-base/regras.yaml` | Criar (decisão 2) |
| `knowledge-base/README.md` | Criar (decisão 7) |
| `knowledge-base/FONTES.md` | Mover para o histórico (decisão 8) |
| `docs/history/knowledge-base-v1/` (`README.md`, `FONTES.md`, `01` a `07`) | Criar com `git mv` e um `README.md` curto (decisão 8) |
| `scripts/knowledge-base/consistency.ts` | Criar (decisão 3) |
| `scripts/knowledge-base/consistency.test.ts` | Criar: testes unitários com fixtures inline |
| `scripts/knowledge-base/knowledge-base.test.ts` | Criar: testes sobre os arquivos reais (decisão 5) |
| `src/core/rag/ingest.test.ts` | Acrescentar `regras.yaml` aos casos do `KNOWLEDGE_FILE_PATTERN` e trocar a fixture `FONTES.md` por `README.md` e `regras.yaml` |
| `src/core/rag/ingest.ts` | Só o comentário da linha 8 ("`README.md` e `regras.yaml` ficam de fora") |
| `scripts/eval/questions.test.ts` | Só os testes com o `eval/perguntas.json` real: a contagem passa de 7 para 11 documentos, e "uma pergunta factual por documento" passa a exigir que as fontes factuais sejam documentos da base, cobrindo de `01` a `07`, até a change `expand-eval-to-50-questions` voltar a exigir os 11 |
| `package.json`, `package-lock.json` | `yaml` em `devDependencies` (decisão 4) |
| `docs/adr/0018-empresa-ficticia-rango.md`, `docs/adr/0019-regras-yaml-fonte-unica.md`, `docs/adr/README.md` | Criar e indexar (decisão 9) |
| `docs/business.md`, `docs/architecture.md`, `AGENTS.md`, `openspec/config.yaml`, `README.md` | Atualizar (decisão 10) |
| `openspec/changes/add-rango-knowledge-base/tasks.md` | Marcar as tarefas |

### 2. Conteúdo do `regras.yaml`

O arquivo abaixo é o contrato. Os valores vêm do §6 do PRD e **não mudam** sem uma nova aprovação. O implementador pode **acrescentar** chaves se um documento precisar de um número que não está aqui, desde que siga a convenção de sufixos e liste cada chave nova no relatório, na seção "Valores acrescentados", para a revisão humana. Ele não altera nem remove chaves.

Convenção: o sufixo final diz a unidade (`_pct`, `_reais`, `_min`, `_horas`, `_dias`, `_dias_uteis`, `_km`, `_mb`, `_px`, `_qtd`). Por isso nenhuma chave termina em `_min` querendo dizer "mínimo": use `_minimo_<unidade>` (por exemplo `valor_minimo_reais`). Números com casas decimais usam ponto no YAML (`2.49`) e vírgula no texto ("2,49%").

```yaml
# Regras da Rango, empresa de delivery fictícia criada para fins de estudo.
# Fonte única de todos os números citados em knowledge-base/. Não é ingerido pelo RAG.
# O sufixo de cada chave diz a unidade: _pct, _reais, _min, _horas, _dias, _dias_uteis,
# _km, _mb, _px, _qtd. O teste scripts/knowledge-base/knowledge-base.test.ts confere
# os documentos contra este arquivo.

empresa:
  nome: Rango
  vigencia: "01/11/2026"

nomes:
  painel: Painel Rango
  app_da_loja: Rango Loja
  plano_proprio: Plano Próprio
  plano_entrega: Plano Entrega
  plano_misto: Plano Misto
  entregador_avulso: Rango Chama
  selo: Rango Recomenda
  publicidade: Rango Ads

planos:
  proprio:
    comissao_pct: 11
    mensalidade_reais: 99
  entrega:
    comissao_pct: 22
    mensalidade_reais: 139
  misto:
    comissao_area_propria_pct: 11
    comissao_area_rango_pct: 22
    mensalidade_reais: 139
  area_propria_raio_maximo_km: 7
  comissao_retirada_pct: 6
  base_da_comissao: valor dos itens, sem a taxa de entrega
  isencao_mensalidade_faturamento_abaixo_reais: 2000
  taxa_pagamento_online:
    cartao_e_carteira_digital_pct: 3.5
    pix_pct: 1.5
    vale_refeicao_pct: 4.5
    base: valor dos itens, antes de qualquer cupom
  dinheiro_na_entrega: sem taxa; só no Plano Próprio e na área própria do Plano Misto
  taxa_servico_cliente:
    menor_valor_reais: 0.99
    maior_valor_reais: 1.99
  taxa_entrega_proprio:
    teto_reais: 30
    faixas_de_distancia_qtd: 5
  taxa_entrega_plano_entrega: definida pela Rango pela distância; fica com a Rango
  rango_chama:
    preco_base_reais: 8.90
    distancia_incluida_km: 4
    km_extra_reais: 1.50
  troca_de_plano:
    dia_limite_do_pedido_qtd: 25
    vale_a_partir_do_dia_qtd: 1
    intervalo_entre_trocas_dias: 90

repasse:
  periodo_de_vendas: segunda-feira a domingo
  dia_do_pagamento: quarta-feira seguinte
  custo_do_repasse_semanal: sem custo
  feriado_na_quarta: pago no próximo dia útil
  valor_minimo_reais: 20
  antecipacao:
    prazo_dias_uteis: 2
    taxa_pct: 2.49
    valor_minimo_reais: 100
  mensalidade_descontada: primeiro repasse do mês
  retido_por_dado_bancario_liberacao_dias_uteis: 5

cancelamentos:
  aceite_automatico_min: 8
  contestacao_prazo_dias: 7
  contestacao_resposta_dias_uteis: 5
  janela_de_calculo_dias: 30
  perda_de_destaque_acima_de_pct: 3
  revisao_da_conta_acima_de_pct: 6

cardapio:
  itens_qtd: 500
  categorias_qtd: 40
  grupos_de_complementos_por_item_qtd: 30
  foto_formatos: [JPG, PNG]
  foto_largura_minima_px: 1200
  foto_altura_minima_px: 900
  foto_tamanho_maximo_mb: 5
  moderacao_de_foto_horas: 24
  preco_diferente_do_salao: permitido; a loja decide

horarios:
  pedidos_ignorados_para_fechamento_qtd: 3
  fechamento_preventivo_duracao_min: 30
  fechamentos_no_dia_para_reabrir_a_mao_qtd: 3
  pausa_programada_maxima_horas: 8
  disponibilidade_minima_pct: 90
  janela_de_calculo_dias: 30

avaliacoes:
  janela_da_nota_dias: 90
  avaliacoes_para_mostrar_nota_qtd: 10
  prazo_para_responder_dias: 5
  moderacao:
    prazo_para_pedir_dias: 7
    resposta_dias_uteis: 3
  selo_rango_recomenda:
    janela_dias: 60
    nota_minima: 4.6
    cancelamento_maximo_pct: 2
    disponibilidade_minima_pct: 95

embalagem:
  lacre: obrigatório em todos os pedidos entregues pela Rango
  tempo_de_preparo_minimo_min: 5
  tempo_de_preparo_maximo_min: 90
  idade_minima_alcool_qtd: 18

promocoes:
  cupom_da_loja_pago_pela_loja_pct: 100
  cupom_rango_pago_pela_rango_pct: 100
  cupom_coparticipado_loja_pct: 50
  cupom_coparticipado_rango_pct: 50
  base_da_comissao_com_cupom_da_loja: valor dos itens antes do desconto
  desconto_maximo_pct: 50
  campanha_duracao_maxima_dias: 30
  entrega_gratis_plano_entrega: a loja paga a taxa de entrega até o limite que definir na campanha

suporte:
  chat_no_painel_disponibilidade_horas: 24
  telefone_horario: "8h às 22h"
  email_resposta_dias_uteis: 2
  prazos:
    urgente_horas: 2
    conta_e_acesso_horas: 24
    cardapio_dias_uteis: 1
    financeiro_dias_uteis: 3
    cancelamento_e_contestacao_dias_uteis: 5
  reaberturas_para_ouvidoria_qtd: 2
  ouvidoria_resposta_dias_uteis: 10
  protocolo_formato: RG-AAAA-NNNNNN

conta:
  perfis:
    dono: tudo
    gerente: tudo, menos financeiro e plano
    operador: pedidos e cardápio
  usuarios_por_loja_qtd: 10
  senha_minimo_de_caracteres_qtd: 10
  verificacao_em_2_etapas: obrigatória para o perfil Dono
  sessao_no_painel_horas: 12
  troca_de_conta_bancaria_carencia_horas: 48
  troca_de_conta_bancaria_quem_pode: Dono

pagamentos:
  formas: [cartão de crédito, cartão de débito, Pix, carteira digital, vale-refeição online, dinheiro]
  nota_ao_cliente: emitida pela loja, sobre o valor dos itens
  nfs_e_da_rango_ate_o_dia_qtd: 5
  retencao_de_tributos_na_fonte: não
  informe_anual: até o fim de fevereiro
```

### 3. Contrato do módulo de consistência

`scripts/knowledge-base/consistency.ts`, só funções puras, sem leitura de arquivo e sem `server-only` (é um módulo de `scripts/`):

```ts
export type Unit = "pct" | "reais" | "min" | "horas" | "dias" | "dias_uteis" | "km" | "mb" | "px"

export type Quantity = {
  value: number // 2.000,00 → 2000; 2,49 → 2.49
  unit: Unit
  raw: string // trecho como aparece no texto, por exemplo "R$ 2.000,00" ou "7 dias úteis"
}

export type RuleValue = {
  key: string // caminho com pontos, por exemplo "planos.proprio.comissao_pct"
  value: number
  unit: Unit
}

export type DocumentFile = { name: string; content: string }

// Números com unidade reconhecida, na ordem em que aparecem, sem os parágrafos e itens de
// lista que começam com "Exemplo:" e sem o título e o cabeçalho de política.
export function extractQuantities(markdown: string): Quantity[]

// Folhas numéricas do YAML já lido (objeto qualquer) cuja chave termina num sufixo de Unit.
// Listas de números viram uma RuleValue por item. Chaves _qtd, sem sufixo ou não numéricas
// ficam de fora.
export function flattenRules(rules: unknown): RuleValue[]

// Uma linha "<arquivo>: <raw> não encontrado no regras.yaml" por número sem par (mesmo valor,
// tolerância 1e-9, e mesma unidade), na ordem dos arquivos e do texto.
export function findMissingValues(documents: DocumentFile[], rules: RuleValue[]): string[]

// Chaves de RuleValue cujo valor não aparece com a mesma unidade em nenhum documento.
export function findUncitedKeys(documents: DocumentFile[], rules: RuleValue[]): string[]

// Palavras do arquivo inteiro: sequências separadas por espaço em branco (como o wc -w).
export function countWords(markdown: string): number
```

Regras do extrator, todas cobertas por testes unitários antes do código:

- Número em PT-BR: milhar com ponto e decimal com vírgula (`1.300`, `2,49`, `R$ 8,90`).
- Unidades: `R$` antes do número; depois do número, `%`, `minuto(s)`, `hora(s)`, `dia(s) útil/úteis`, `dia(s)`, `km`, `MB`, `px`. "Dia útil" é verificado antes de "dia". Abreviações como `h`, `min` e `d` não são reconhecidas, então "8h às 22h" e "dia 25" ficam de fora.
- Intervalo: em `<n> a <m> <unidade>`, `<n> e <m> <unidade>`, `<n> ou <m> <unidade>` e `<n> × <m> <unidade>` (também com `x`), a unidade vale para os dois números. O `R$` não se propaga: num intervalo em reais, cada número traz o próprio `R$` ("de R$ 0,99 a R$ 1,99").
- Um parágrafo (bloco separado por linha em branco) ou um item de lista que começa com `Exemplo:` é ignorado por inteiro.
- O título `#` e a linha de cabeçalho `>` são ignorados (a data de vigência não tem unidade, mas fica explícito).

### 4. Dependência `yaml`

`npm install --save-dev yaml@^2.9.1`. A versão já está no `package-lock.json` (transitiva de `vitest` e `@fission-ai/openspec`), então a mudança no lockfile é só a declaração na raiz. Fica em `devDependencies` porque nesta change só os testes a usam; a onda 2 move para `dependencies` se as ferramentas lerem o YAML em tempo de execução. Alternativa descartada: guardar as regras em JSON, que o Node lê sozinho, mas que não aceita comentários e é pior para a pessoa revisar e editar à mão.

### 5. Testes sobre os arquivos reais

`scripts/knowledge-base/knowledge-base.test.ts` lê `knowledge-base/` com `node:fs` (leitura local é permitida; o teste continua sem rede, sem banco e sem chave) e verifica:

1. Os arquivos que casam com `KNOWLEDGE_FILE_PATTERN` são exatamente os 11 da spec, com a mensagem `ausente: <arquivo>` ou `inesperado: <arquivo>`.
2. A linha logo depois do título é o cabeçalho de política exato.
3. Cada documento tem de 600 a 1.300 palavras (`<arquivo>: <n> palavras`).
4. `findMissingValues` devolve lista vazia; se não, o `expect` mostra todas as linhas de uma vez.
5. `findUncitedKeys` vira `console.warn` com as chaves, sem falhar.
6. O `README.md` da base cita os 6 temas não cobertos da spec.

O teste importa o `KNOWLEDGE_FILE_PATTERN` de `@/core/rag/ingest`, como o `scripts/eval.ts` já faz.

### 6. Conteúdo de cada documento

Regras de redação, para todos:

- Estrutura: `# Título`, linha em branco, o cabeçalho de política, e seções `##` curtas, uma ideia por seção. PT-BR simples, segunda pessoa ("a sua loja") ou terceira ("a loja"), no mesmo tom da base atual. De 600 a 1.300 palavras.
- **Todo número em algarismos** e com a unidade por extenso quando ela existe ("8 minutos", "5 dias úteis", "R$ 20,00"), para que o teste o veja. Valores em reais sempre com centavos.
- Nenhum número fora do `regras.yaml`, exceto em parágrafos `Exemplo:`. As contas dos exemplos têm que estar certas.
- Telas do Painel Rango, sempre com estes nomes de menu: **Pedidos**, **Cardápio**, **Horários**, **Financeiro**, **Avaliações**, **Promoções**, **Ajuda** (chamados) e **Configurações** (usuários, conta bancária, plano, segurança). Pedidos são aceitos no **Rango Loja** ou na tela Pedidos do Painel. Submenus podem ser criados, mas o mesmo caminho tem o mesmo nome em todos os documentos.
- Cada documento fecha com uma seção curta "Quando abrir um chamado", que aponta para o `09` só quando fizer sentido. Isso dá à busca um caminho para as dúvidas operacionais que não têm resposta direta.

Seções mínimas e regras derivadas (decididas aqui, sem números novos, para manter a coerência):

| Documento | Seções mínimas | Regras derivadas |
|---|---|---|
| `01-planos-e-taxas.md` | Os três planos; comissão por plano; área própria e raio; retirada no balcão; base da comissão; mensalidade e isenção; taxas de pagamento online; dinheiro na entrega; taxa de serviço; taxa de entrega por plano; Rango Chama; troca de plano; um `Exemplo:` de conta de um pedido | A taxa de pagamento online incide sobre o valor dos itens antes de qualquer cupom (mesma base da comissão). A taxa de serviço não entra no repasse. O custo do Rango Chama é descontado do repasse. Retirada não tem taxa de entrega |
| `02-repasse-financeiro.md` | Ciclo semanal; feriado na quarta; valor mínimo; antecipação; descontos do repasse (comissão, taxas, mensalidade, Rango Chama, cupons da loja); extrato no Financeiro; repasse retido e dados bancários; `Exemplo:` de repasse da semana | O repasse semanal não tem custo. A antecipação é pedida no Financeiro, por valor |
| `03-cancelamentos-e-contestacoes.md` | Aceite e cancelamento automático; quem cancela e quem arca (loja, cliente depois do aceite, falha da Rango); contestação (prazo, como abrir, resposta); taxa de cancelamento e visibilidade; revisão da conta | Cancelamento pelo cliente antes do aceite não gera cobrança nem repasse |
| `04-cardapio-e-fotos.md` | Estrutura (categorias, itens, complementos) e limites; fotos (formato, tamanho, resolução); moderação de foto; preços e preço diferente do salão; item esgotado | Item esgotado é pausado na tela Cardápio ou no Rango Loja |
| `05-horarios-pausas-e-disponibilidade.md` | Horário de funcionamento; pausa programada; fechar o dia; fechamento preventivo e reabertura; disponibilidade e visibilidade | Depois do 3º fechamento preventivo do dia, a loja só reabre à mão |
| `06-avaliacoes-e-reputacao.md` | Como a nota é calculada; quando a nota aparece; responder avaliações; moderação manual; selo Rango Recomenda; como melhorar | — |
| `07-embalagem-e-entrega.md` | Embalagem adequada; lacre; tempo de preparo; bebida alcoólica; itens frágeis; entrega própria × entrega Rango | O lacre é recomendado, mas não obrigatório, na entrega própria |
| `08-promocoes-e-cupons.md` | Tipos de cupom e quem paga; base da comissão com cupom; desconto máximo; duração da campanha; entrega grátis por plano; como criar uma campanha em Promoções; `Exemplo:` de cupom coparticipado | No Plano Próprio, a entrega grátis é a loja abrindo mão da própria taxa de entrega. O cupom da loja é descontado no repasse |
| `09-suporte-e-chamados.md` | Canais e horários; tipos de chamado e prazos; como abrir um chamado em Ajuda; protocolo; escalonamento e ouvidoria; o que ter em mãos | O chamado urgente é só para loja fechada indevidamente |
| `10-conta-acessos-e-seguranca.md` | Perfis e permissões; limite de usuários; senha e verificação em 2 etapas; sessão do Painel; troca de conta bancária; golpes comuns e como a Rango fala com a loja | A Rango nunca pede senha ou código por telefone ou WhatsApp e nunca cobra para "liberar repasse" |
| `11-pagamentos-e-fiscal.md` | Formas de pagamento e restrições; nota fiscal ao cliente; nota da Rango (NFS-e); tributos; informe anual | — |

### 7. `knowledge-base/README.md`

Curto (sem limite de palavras, porque não é ingerido): o que é a pasta; que a Rango é uma empresa fictícia, "inspirada no mercado brasileiro de delivery", criada para fins de estudo, sem vínculo com nenhuma empresa real; a tabela dos 11 documentos com uma linha de tema cada; que os números vêm do `regras.yaml` e o teste que confere; a lista dos 6 temas não cobertos de propósito (spec); e um link para `docs/history/knowledge-base-v1/`, que guarda a base anterior.

### 8. Histórico da base antiga

`git mv knowledge-base/0N-*.md knowledge-base/FONTES.md docs/history/knowledge-base-v1/` **antes** de criar os documentos novos, para que o git registre o histórico como movido. Depois, um `docs/history/knowledge-base-v1/README.md` de poucas linhas: base usada nas rodadas `v1`, `v2` e `cal-*` (até 10/11/2026), reescrita de fontes públicas, substituída pela base da Rango ([ADR 0018](../../adr/0018-empresa-ficticia-rango.md)); não é ingerida nem editada. Os links internos do `FONTES.md` antigo não são corrigidos (é histórico).

### 9. ADRs

Os dois no modelo do `docs/adr/README.md`, com status **Aceito** e data 2026-11-10, e duas linhas novas no índice.

- **0018. Usar a empresa fictícia Rango no lugar de fontes públicas.** Contexto: lacunas do `FONTES.md`, regras fechadas exigidas pela onda 2, exposição a uma marca real. Decisão: base reescrita como política de parceiros da Rango, vigente desde 01/11/2026, com os nomes da decisão 2; o assistente passa a ser "o assistente de parceiros da Rango". Alternativas: manter a reescrita das fontes públicas (lacunas continuam, sem base para as ferramentas); completar as lacunas com suposições sobre a empresa real (números inventados atribuídos a uma marca real). Consequências: sem vínculo com empresa real; os resultados `v1`, `v2` e `cal-*` viram histórico, não comparáveis com a `v3`; a regra "conforme <página>, consultada em…" deixa de valer; o [ADR 0011](0011-somente-parceiros-atuais.md) continua valendo.
- **0019. Usar o `regras.yaml` como fonte única dos números.** Decisão: todos os números da Rango num YAML não ingerido, com a unidade no sufixo da chave, conferido por teste contra os documentos. Alternativas: números só nos `.md` (sem verificação, fácil de ficar incoerente entre documentos; as ferramentas teriam que extrair números de texto); um documento-tabela ingerido (concorre na busca com os documentos de tema e duplica conteúdo no contexto). Consequências: mudar um número exige mudar o YAML e os documentos no mesmo PR; números sem unidade reconhecida não são conferidos; as ferramentas da onda 2 leem o YAML; nova dependência de desenvolvimento `yaml`.

### 10. Documentação

| Arquivo | O que muda |
|---|---|
| `docs/business.md` | Visão: o Chapa é o assistente de parceiros da Rango, empresa fictícia. Conceito "Base de conhecimento": políticas da Rango, números no `regras.yaml`. Tabela "O que o assistente cobre" com os 11 documentos. A frase sobre o `FONTES.md` vira um link para o `knowledge-base/README.md` (temas não cobertos). "Regras de conteúdo" substituídas pelas do R4 do PRD (cabeçalho, números só do `regras.yaml`, nada de empresa real, formato e tamanho, nomes da Rango). As "Metas de qualidade" **não** mudam aqui |
| `docs/architecture.md` | Linha 5: "parceiros da Rango, uma empresa de delivery fictícia" no lugar de "parceiros de um app de delivery" |
| `AGENTS.md` | Linha 7, igual à anterior. "Onde mexer", linha da base: arquivos `knowledge-base/NN-*.md` e `knowledge-base/regras.yaml`; cuidados "número novo entra primeiro no `regras.yaml`; rode `npm test`; depois do merge, reingerir no `dev` e no `prod`". "Marca e conteúdo": os itens de reescrita com fonte e data e de números "conforme <página>" viram "a base é a política da Rango, empresa fictícia ([ADR 0018](docs/adr/0018-empresa-ficticia-rango.md)); todo número vem do `regras.yaml` ([ADR 0019](docs/adr/0019-regras-yaml-fonte-unica.md))". A regra de não usar nome de empresa real continua |
| `openspec/config.yaml` | Só o `context`: "parceiros da Rango, uma empresa de delivery fictícia" |
| `README.md` | Linhas 3 e 75 (descrição do problema) passam a citar a Rango; o "Aviso e propósito" explica que a Rango é fictícia, "inspirada no mercado brasileiro de delivery", e que a base anterior está em `docs/history/knowledge-base-v1/`; a limitação "Base pequena e com lacunas" (linha 355) é substituída por uma sobre a base ser fictícia; nenhum link para `knowledge-base/FONTES.md` sobra. O bloco de resultados do topo, os exemplos de conversa e a tabela de métricas **não** mudam (são da `v2` e ficam para a change do eval) |

### 11. Ingestão e sequência com as outras changes

- A ingestão no `dev` só roda depois que a pessoa revisar o texto dos 11 documentos no PR. Até lá, as tarefas que chamam o banco ficam abertas e o PR pode ser aberto em rascunho.
- O `prod` não é tocado aqui. Depois do merge desta change e da `rebrand-app-texts-to-rango`, a pessoa (ou o orquestrador, com a autorização do H5) reingere o `prod` e roda o smoke, para que a demo nunca mostre a base da Rango com os textos antigos do app, nem o contrário.
- A `expand-eval-to-50-questions` começa o *apply* depois do merge desta change, porque as perguntas novas citam os documentos `08` a `11` e o teste delas usa o módulo da decisão 3.

## Risks / Trade-offs

- [Base inventada demais, com regras incoerentes entre documentos] → `regras.yaml` + teste + revisão humana dos valores (nesta proposta) e do texto (no PR). As "regras derivadas" da decisão 6 fecham os pontos em que dois documentos tocam o mesmo assunto.
- [O teste só confere valor e unidade, não o sentido: "30 dias" pode aparecer no lugar errado e passar, porque várias chaves valem 30 dias] → A revisão humana do texto continua obrigatória; o teste pega número inventado, não número trocado.
- [Números escritos por extenso ("três pedidos") escapam do teste] → Regra de redação: todo número em algarismos. A revisão confere.
- [Documentos maiores e em maior número aumentam a concorrência na busca e podem baixar o acerto] → Esperado e medido na `v3`; mudar o RAG fica para a onda 1.
- [O `eval/perguntas.json` atual fica errado entre o merge desta change e o da `expand-eval-to-50-questions`] → Ninguém roda o eval nesse intervalo; a proposta registra isso.

## Migration Plan

1. Merge desta change → reingestão no `dev` já feita no PR.
2. Merge da `rebrand-app-texts-to-rango` → reingestão no `prod` e smoke (H5, pessoa autoriza).
3. Rollback: reverter o merge e reingerir o `dev` (e o `prod`, se já tiver sido reingerido). A ingestão substitui o conjunto do preset de uma vez, então a base antiga volta inteira.
