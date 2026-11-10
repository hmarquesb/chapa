# knowledge-base Specification

## Purpose
Define o conteúdo e o formato da base de conhecimento que o RAG ingere: as políticas de parceiros da Rango, empresa de delivery fictícia, com todos os números concentrados numa fonte única e verificados por teste.

## Requirements

### Requirement: Documentos ingeridos da base
A pasta `knowledge-base/` SHALL ter exatamente estes 11 documentos ingeridos: `01-planos-e-taxas.md`, `02-repasse-financeiro.md`, `03-cancelamentos-e-contestacoes.md`, `04-cardapio-e-fotos.md`, `05-horarios-pausas-e-disponibilidade.md`, `06-avaliacoes-e-reputacao.md`, `07-embalagem-e-entrega.md`, `08-promocoes-e-cupons.md`, `09-suporte-e-chamados.md`, `10-conta-acessos-e-seguranca.md` e `11-pagamentos-e-fiscal.md`.

#### Scenario: Documento faltando
- **WHEN** o arquivo `09-suporte-e-chamados.md` não existe
- **THEN** o teste da base falha e aponta `09-suporte-e-chamados.md` como ausente

#### Scenario: Documento numerado a mais
- **WHEN** existe um `12-publicidade.md` em `knowledge-base/`
- **THEN** o teste da base falha e aponta `12-publicidade.md` como inesperado

### Requirement: Arquivos de apoio fora da ingestão
A pasta `knowledge-base/` SHALL ter também o `regras.yaml` e o `README.md`, e nenhum dos dois MUST ser ingerido.

#### Scenario: Ingestão com os arquivos de apoio
- **WHEN** a ingestão lê uma pasta com `01-planos-e-taxas.md`, `regras.yaml` e `README.md`
- **THEN** só `01-planos-e-taxas.md` vira trechos

### Requirement: Cabeçalho de política
Cada documento ingerido SHALL ter, logo depois do título `#`, a linha `> Política de parceiros da Rango, vigente desde 01/11/2026. Empresa fictícia, criada para fins de estudo.`

#### Scenario: Cabeçalho ausente
- **WHEN** um documento começa pelo título e vai direto para a primeira seção `##`
- **THEN** o teste da base falha e aponta o arquivo sem o cabeçalho

### Requirement: Tamanho de cada documento
Cada documento ingerido SHALL ter de 600 a 1.300 palavras, contadas como sequências separadas por espaço em branco no arquivo inteiro.

#### Scenario: Documento curto demais
- **WHEN** um documento tem 540 palavras
- **THEN** o teste da base falha e informa o arquivo e as 540 palavras

### Requirement: Fonte única dos números
Todo número seguido de uma unidade reconhecida num documento ingerido SHALL existir no `regras.yaml`, com o mesmo valor, numa chave cujo sufixo corresponde à unidade. Caso contrário, o teste MUST falhar com uma linha `<arquivo>: <valor> não encontrado no regras.yaml` para cada número.

#### Scenario: Número que não está no YAML
- **WHEN** `01-planos-e-taxas.md` diz "comissão de 12%" e nenhuma chave `_pct` do `regras.yaml` vale 12
- **THEN** o teste falha com `01-planos-e-taxas.md: 12% não encontrado no regras.yaml`

#### Scenario: Mesmo valor, unidade diferente
- **WHEN** um documento diz "7 dias úteis" e o `regras.yaml` só tem o valor 7 em chaves `_dias`
- **THEN** o teste falha para "7 dias úteis"

#### Scenario: Valor em reais no formato brasileiro
- **WHEN** um documento diz "R$ 2.000,00" e o `regras.yaml` tem `isencao_mensalidade_faturamento_abaixo_reais: 2000`
- **THEN** o número é encontrado

### Requirement: Unidades reconhecidas
O teste SHALL reconhecer estas unidades no texto e casá-las com estes sufixos de chave: `%` com `_pct`, `R$` com `_reais`, minutos com `_min`, horas com `_horas`, dias com `_dias`, dias úteis com `_dias_uteis`, `km` com `_km`, `MB` com `_mb` e `px` com `_px`. Chaves com `_qtd` ou sem sufixo conhecido MUST ficar fora da verificação.

#### Scenario: Singular e plural
- **WHEN** um documento diz "1 dia útil" e o `regras.yaml` tem uma chave `_dias_uteis` que vale 1
- **THEN** o número é encontrado

#### Scenario: Horário do dia não é duração
- **WHEN** um documento diz "das 8h às 22h"
- **THEN** nenhum dos dois números é verificado

### Requirement: Unidade compartilhada em intervalos
Num intervalo ou par de números em que só o último traz a unidade ("de 5 a 90 minutos", "5 ou 7 dias", "1200 × 900 px"), o teste SHALL aplicar essa unidade a todos os números do intervalo.

#### Scenario: Intervalo de minutos
- **WHEN** um documento diz "de 5 a 90 minutos"
- **THEN** o teste procura 5 e 90 em chaves `_min`

### Requirement: Exemplos de conta ignorados
O teste SHALL ignorar os números de um parágrafo ou item de lista que começa com `Exemplo:`, para que contas ilustrativas ("num pedido de R$ 80,00") não precisem estar no `regras.yaml`.

#### Scenario: Conta ilustrativa
- **WHEN** um parágrafo diz "Exemplo: num pedido de R$ 80,00 no Plano Próprio, a comissão é de R$ 8,80."
- **THEN** nenhum dos números desse parágrafo é verificado

### Requirement: Aviso para valores não citados
O teste SHALL emitir um aviso, sem falhar, para cada chave numérica com sufixo de unidade do `regras.yaml` cujo valor não aparece com essa unidade em nenhum documento ingerido.

#### Scenario: Chave sem citação
- **WHEN** o `regras.yaml` tem `suporte.ouvidoria_resposta_dias_uteis: 10` e nenhum documento diz "10 dias úteis"
- **THEN** o teste passa e mostra um aviso com `suporte.ouvidoria_resposta_dias_uteis`

### Requirement: Temas fora da base
O `README.md` da base SHALL dizer que a Rango é uma empresa fictícia, inspirada no mercado brasileiro de delivery, e listar os temas que a base não cobre de propósito: cadastro de novas lojas, integração por API ou PDV, regras para entregadores, preços de publicidade (Rango Ads), legislação municipal específica e operação fora do Brasil.

#### Scenario: Pergunta sobre um tema não coberto
- **WHEN** alguém quer saber se a base responde sobre regras para entregadores
- **THEN** o `README.md` da base lista esse tema como não coberto de propósito

### Requirement: Sem empresa real na base
Os arquivos de `knowledge-base/` MUST NOT citar o nome de uma empresa real de delivery. Os nomes de telas, planos e produtos SHALL ser os da Rango: Painel Rango, Rango Loja, Plano Próprio, Plano Entrega, Plano Misto, Rango Chama, Rango Recomenda e Rango Ads.

#### Scenario: Nome de tela
- **WHEN** um documento explica onde a loja vê o extrato
- **THEN** ele cita o Painel Rango, e não o portal de outra empresa
