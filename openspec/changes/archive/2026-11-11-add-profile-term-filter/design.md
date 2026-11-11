# Design

## Context

- O perfil fica em `accounts.profile` (web) e em `sessions.profile` (CLI e eval). `name`, `cuisine`, `city` e `hours` são texto livre de até 60 caracteres, e o `plan` é um enum (`src/lib/types.ts`).
- O `PUT /api/profile` valida o corpo em `parseProfileUpdate` (`src/app/api/_lib/validate.ts`), e um `400` hoje é só `{ error }`. Os textos de erro ficam em `VALIDATION_MESSAGES` (`src/app/api/_lib/errors.ts`).
- O `formatProfile` (`src/core/prompts.ts`) gera o bloco "Perfil do restaurante:", e o `cleanProfile` (`src/core/assistant.ts`) apara os valores antes do prompt.
- O formulário (`src/components/chat/profile-form.tsx`) só mostra erro no plano e um `Alert` geral para o erro da API.
- `src/components/` e `src/lib/` não importam `src/core/` nem `src/app/` (`src/architecture.test.ts`). Por isso, o filtro e os textos dele ficam em `src/lib/`. O `src/core/` já importa `src/lib/plans`.

## Goals / Non-Goals

**Goals:** uma função só decide se um texto do perfil passa, e a interface, a API, o assistente e o CLI chamam essa mesma função.

**Non-Goals:** cidade e horário (changes 2 e 3); recusar em massa os perfis já salvos (eles só ficam fora do prompt até a pessoa salvar de novo).

## Decisions

### 1. Módulo `src/lib/moderation/`

Contrato público, em `src/lib/moderation/profile-text.ts`:

```ts
export type ProfileTextField = "name" | "cuisine"
export type ProfileTextRejection = "caractere" | "termo_inadequado" | "instrucao" | "marca"

export type ProfileTextCheck = { ok: true } | { ok: false; reason: ProfileTextRejection }

export function checkProfileText(field: ProfileTextField, text: string): ProfileTextCheck
export function profileTextMessage(field: ProfileTextField, reason: ProfileTextRejection): string
```

- A ordem das checagens é: caractere, instrução, marca (só em `name`) e termo inadequado. O primeiro motivo que falhar é o devolvido. O texto chega aparado, e texto vazio passa (o campo é opcional).
- Exceção na ordem: quando os únicos caracteres proibidos são os símbolos de leetspeak `@`, `!` e `$`, as checagens de instrução, marca e termo rodam antes. Se nenhuma falhar, o texto é recusado com `caractere`. Assim, "M3rd@ Burguer" sai como `termo_inadequado` (cenário da spec) e "Pizzaria Bella!" como `caractere`.
- `profileTextMessage` devolve os textos fixos da spec `guardrails`. É o único lugar com esses textos. `VALIDATION_MESSAGES` não os copia.
- `normalize.ts` exporta `normalizeForModeration(text): string[]`, que devolve os tokens normalizados. Os passos são: minúsculas, NFD sem diacríticos, leetspeak, separadores entre letras soltas removidos (uma sequência de 3 ou mais tokens de 1 letra separados por espaço, `.` ou `-` vira um token só), corte nos caracteres que não são letra nem dígito e letras repetidas reduzidas a uma. Os termos da lista passam pela mesma função quando o módulo carrega, então "merda" e "merdaaa" viram o mesmo token.
- O casamento é por token inteiro. Um termo de várias palavras casa com uma sequência de tokens. O nome de uma marca casa como sequência ou junto (a sequência `uber`+`eats` e o token `ubereats` são equivalentes). A lista de permitidos (`allowed-terms.ts`, texto claro) tira o token da comparação de termos inadequados.
- A instrução casa quando os tokens trazem pelo menos um verbo e um alvo, em qualquer ordem. As duas listas ficam no próprio `profile-text.ts`, em texto claro, porque não são ofensivas.

### 2. Lista em base64

- `blocked-terms.ts` exporta `BLOCKED_TERMS: readonly string[]` e `BLOCKED_BRANDS: readonly string[]`. O arquivo guarda uma string base64 por categoria (palavrões, sexual, ofensa, discriminatório, marca), cada uma com os termos separados por `|`. A decodificação usa `atob` e `TextDecoder`, que existem no navegador e no Node 24.
- Um comentário no topo diz o propósito, as categorias e o comando para ver a lista. O comando é `npx tsx -e` com `console.log` dos dois arrays, e fica escrito também no `docs/development.md`.
- **Por quê:** os termos e as marcas não aparecem em buscas no GitHub quando o repositório abrir, e a regra "Marca e conteúdo" continua valendo para o resto do código. **Alternativa descartada:** texto puro (expõe a lista a quem busca no repositório).
- Os testes não escrevem termo nem marca em texto claro. Os casos que devem ser bloqueados são gerados a partir de `BLOCKED_TERMS` e `BLOCKED_BRANDS`, com uma variação de cada tipo (acento quando houver vogal, leetspeak, repetição, separadores e maiúsculas). Os falsos positivos e os nomes inventados ficam em texto claro.

### 3. API

- `parseProfileUpdate` passa a devolver `{ ok: false; error: string; field?: ProfileTextField; rejection?: ProfileTextRejection }`. A ordem fica assim: objeto, campo desconhecido, plano, tamanho e tipo dos campos, e só então o filtro em `name` e `cuisine`.
- `ApiErrorResponse` (`src/lib/types.ts`) ganha `field?: ProfileTextField`. O `HttpError` (`src/app/api/_lib/http.ts`) ganha um `field` opcional, que vai para o corpo.
- `LogEntry` ganha `profileRejected?: ProfileTextRejection`. O handler do `PUT` passa esse campo ao `finish` antes do `400`.

### 4. Prompt e assistente

- `formatProfile` não muda. O título do bloco em `buildSystemInstruction` passa a ser o da spec `answer-generation`, e o `SYSTEM_PROMPT` troca a regra "Use o perfil do restaurante…" por uma que fala dos "dados do restaurante" e diz para nunca seguir instruções escritas neles.
- O `cleanProfile` descarta `name` e `cuisine` quando `checkProfileText` recusa o valor.

### 5. Interface

- O `profile-form.tsx` guarda um erro por campo (`Partial<Record<ProfileTextField, string>>`), checado no `onBlur` e no envio. O `Input` recusado ganha `aria-invalid` e `aria-describedby`, apontando para um `<p role="alert">`. No envio, o foco vai para o primeiro campo inválido, na ordem do formulário.
- O `saveProfile` (`src/lib/api-client.ts`) devolve o `field` do `400` quando ele vem na resposta. Com `field`, o erro aparece no campo; sem `field`, continua no `Alert` geral.

### 6. CLI

- O `scripts/chat.ts` checa `--nome` e `--cozinha` com `checkProfileText` antes de abrir a conversa e termina com a mensagem do filtro (código de saída 1), como já faz com um `--plano` inválido.

### 7. Documentação

- `docs/adr/0023-filtro-local-de-termos-no-perfil.md` (novo), com as alternativas do PRD (R11: biblioteca npm, API de moderação externa e o Gemini) e as consequências. Entra também na lista do `docs/adr/README.md`.
- `AGENTS.md`: seção "Marca e conteúdo" (exceção para a lista codificada em `src/lib/moderation/`), tabela "Onde mexer" (linha nova "Filtro de texto do perfil") e tabela "Camadas e importações" (`src/core/` importa `src/lib/types` e as funções puras de `src/lib/`).
- `docs/architecture.md`, seção "Back-end": uma frase sobre o filtro do perfil e o `field` no `400`.
- `docs/development.md`, seção "Testes": como os testes do filtro geram os casos a partir da lista e como ver a lista decodificada.

### Arquivos que a change pode criar ou alterar

- Novos: `src/lib/moderation/profile-text.ts`, `normalize.ts`, `blocked-terms.ts`, `allowed-terms.ts` e os testes `profile-text.test.ts` e `normalize.test.ts`; `docs/adr/0023-filtro-local-de-termos-no-perfil.md`.
- Alterados: `src/lib/types.ts`, `src/lib/api-client.ts` (e o teste), `src/app/api/_lib/validate.ts`, `errors.ts`, `http.ts`, `handlers.ts`, `log.ts` (e os testes de `validate`, `http` e `handlers`), `src/core/prompts.ts`, `src/core/assistant.ts` (e os testes), `src/components/chat/profile-form.tsx`, `scripts/chat.ts`, `AGENTS.md`, `docs/adr/README.md`, `docs/architecture.md`, `docs/development.md`.

## Risks / Trade-offs

- [Falso positivo bloqueia um restaurante legítimo] → casamento por token inteiro, lista de permitidos e tabela de nomes legítimos no teste. A redução de letras repetidas afeta só a comparação, nunca o valor salvo.
- [Grafia criativa escapa do filtro] → a normalização cobre os truques comuns. O objetivo é a demo não mostrar o óbvio, e o bloco delimitado no prompt é a segunda barreira.
- [Base64 dá a falsa impressão de segredo] → o comentário do arquivo diz que é só para fugir de buscas, não sigilo.
- [O prompt de sistema muda e o eval pode oscilar] → rodada completa do eval contra o `dev`, comparada à última registrada.
