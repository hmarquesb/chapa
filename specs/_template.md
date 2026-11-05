# SXX — Nome da funcionalidade

<!--
Como usar este template:
- Copie este arquivo para `specs/SXX-nome-curto.md` e preencha todas as seções.
- A spec precisa se sustentar sozinha. Quem implementa lê apenas `AGENTS.md`,
  `ARCHITECTURE.md` e esta spec. Não aponte para código externo ao repositório:
  descreva o comportamento esperado por completo.
- Escreva requisitos verificáveis. Se não der para provar com um teste ou com
  um comando, o requisito ainda está vago.
- Apague estes comentários quando a spec estiver pronta.
-->

| Campo | Valor |
|---|---|
| **ID** | SXX |
| **Status** | 🟡 Aguardando aprovação |
| **Depende de** | SYY, SZZ (ou —) |
| **Chamadas reais de API** | Não · Só com autorização (descrever quais) |

## Escopo

<!-- O que esta spec entrega, em 2 a 4 frases. Depois, as fronteiras. -->

**Entrega:**
- ...

**Fora do escopo** (fica para outra spec ou não será feito):
- ...

**Arquivos que podem ser criados ou alterados:**
- `caminho/arquivo.ts` (+ `caminho/arquivo.test.ts`)

**Não tocar:**
- `caminho/de/outra-spec/`

## Contexto

<!--
Por que esta funcionalidade existe e onde ela se encaixa na arquitetura.
Cite a seção do ARCHITECTURE.md que ela implementa e as decisões já tomadas
que a pessoa implementadora precisa respeitar. Inclua aqui os contratos
(tipos, assinaturas, formato de API, schema) que esta spec cria ou consome,
escritos por extenso.
-->

- Seção do `ARCHITECTURE.md`: ...
- Problema que resolve: ...
- Decisões já tomadas: ...

### Contratos

```ts
// Tipos e assinaturas que esta spec cria (dona) ou consome (usa).
```

## Requisitos funcionais

<!--
Numere como RF1, RF2... Cada requisito descreve um comportamento observável
e termina com o critério de aceite no formato Dado / Quando / Então.
-->

### RF1. Título curto do comportamento

Descrição do comportamento esperado.

- **Critério de aceite:** Dado ..., quando ..., então ....

### RF2. ...

## Requisitos não funcionais

<!--
Numere como RNF1, RNF2... Desempenho, segurança, privacidade, custo de API,
acessibilidade, observabilidade, compatibilidade. Cada um com uma forma
objetiva de verificação.
-->

- **RNF1. Testes:** `npm test`, `npm run typecheck` e `npm run lint` passam sem rede e sem chave de API.
- **RNF2. ...:** ... *Verificação:* ...

## Você deve

<!-- Instruções positivas e específicas para quem implementa. -->

- Seguir as regras do `AGENTS.md` e as camadas descritas no `ARCHITECTURE.md`.
- Escrever o teste antes da implementação nas funções puras.
- Rodar `npm test`, `npm run typecheck` e `npm run lint` antes de entregar.
- Entregar um relatório com: arquivos alterados, cada critério de aceite com a evidência (comando + saída resumida), desvios da spec e pendências humanas.
- ...

## Você não deve

<!-- Proibições explícitas. Seja direto. -->

- Editar arquivos fora da lista de "Arquivos que podem ser criados ou alterados".
- Adicionar dependências que não estão na seção "Tecnologias".
- Fazer chamadas reais de API sem a autorização descrita no cabeçalho.
- Fazer commit ou push.
- ...

## Tecnologias

<!--
Liste só o que esta spec usa, com a versão quando ela importa.
Marque com (nova) as dependências que esta spec instala.
-->

| Tecnologia | Uso nesta spec |
|---|---|
| ... | ... |
