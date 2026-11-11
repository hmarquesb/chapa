# Design

## Context

- Esta change parte da `main` com a `add-profile-term-filter` já mergeada: existem `src/lib/moderation/` (`checkProfileText`, `profileTextMessage`), o `field` no `400` do `PUT /api/profile`, o erro por campo no formulário e o bloco delimitado no prompt.
- O perfil é lido do banco em `toProfile` (`src/infra/db/mappers.ts`), uma função síncrona que só guarda strings. O `PUT` valida em `parseProfileUpdate` (`src/app/api/_lib/validate.ts`). O CLI monta o perfil a partir de flags em `scripts/chat.ts`, e o eval valida o perfil à mão em `scripts/eval/questions.ts`.
- `src/components/` e `src/lib/` não importam `src/app/`, `src/core/` nem `src/infra/`. Os scripts importam `src/core/`, `src/infra/` e `src/lib/`. Por isso, o parser, as listas e a conversão ficam em `src/lib/profile/`, onde a interface, a API, o banco, o assistente e os scripts conseguem usá-los.
- Não existem `command` nem `popover` em `src/components/ui/`.

## Goals / Non-Goals

**Goals:** um parser só (`parseProfileInput`) para a API, o CLI e o eval; uma conversão só (`upgradeProfile`) para todo perfil lido do banco; o nome da cidade sempre vindo da lista pelo código.

**Non-Goals:** gravar a conversão no banco; consultar o IBGE em tempo de execução; horário estruturado (change 3).

## Decisions

### 1. Tipos (`src/lib/profile/types.ts`, reexportados por `src/lib/types.ts`)

```ts
export const PROFILE_VERSION = 2
export type CuisineId = (typeof CUISINE_IDS)[number]          // ids da decisão 2, sem "outro"
export type Cuisine = { id: CuisineId } | { id: "outro"; text: string }
export type Uf = (typeof UFS)[number]
export type ProfileLocation = { uf: Uf; cityCode?: number }
export type City = { code: number; name: string; uf: Uf }

export type RestaurantProfile = {
  version: 2
  plan?: PlanId
  name?: string
  cuisine?: Cuisine
  location?: ProfileLocation
  hours?: string                                                 // texto livre até a change 3
}

export type ProfileErrorField = "name" | "cuisine" | "location"  // substitui ProfileTextField no ApiErrorResponse
export type ProfileResponse = { profile: RestaurantProfile; needsReview: boolean }
export type ProfileUpdateRequest = RestaurantProfile & { plan: PlanId }
```

`PROFILE_FIELDS` passa a ser `["name", "plan", "cuisine", "location", "hours"]`. `CUISINE_TEXT_MAX_CHARS = 30`. `PROFILE_FIELD_MAX_CHARS` (60) continua valendo para `name` e `hours`.

### 2. Listas

- `cuisines.ts`: `CUISINES: readonly { id: string; label: string; synonyms: readonly string[] }[]` com as 18 opções do PRD (R2), na ordem da tabela. Os ids são em português, curtos e estáveis: `brasileira`, `marmita`, `lanches`, `pizza`, `japonesa`, `chinesa`, `italiana`, `arabe`, `nordestina`, `churrasco`, `pastel`, `frutos-do-mar`, `saudavel`, `vegetariana`, `doces`, `acai`, `padaria` e `mexicana`. Os sinônimos servem à conversão (por exemplo, `pizzaria` → `pizza`, `hamburgueria` → `lanches`, `sushi` → `japonesa`, `marmitaria` → `marmita`). Funções: `cuisineLabel(c: Cuisine): string` e `matchCuisine(text: string): CuisineId | null`, que compara o texto normalizado com os rótulos e os sinônimos.
- `states.ts`: `STATES: readonly { uf: string; name: string; ibgeCode: number }[]`, as 27 UFs, e `isUf(value): value is Uf`.
- `cities/` (gerado, não editar à mão): um módulo por UF (`cities/rj.ts`, com `export const CITIES: readonly (readonly [code: number, name: string])[]`) e o `cities/index.ts`, com `CITIES_EXTRACTED_AT`, `CITY_COUNT` e `CITY_LOADERS: Record<Uf, () => Promise<{ CITIES: … }>>`, uma lista de `import()` estáticos. O bundler gera um pedaço por UF, e o mesmo código funciona no Next, no `tsx` e no Vitest. **Alternativa descartada:** JSON com `import()` dinâmico, que exige atributos de importação diferentes em cada ambiente.
- `cities.ts`: `loadCities(uf): Promise<readonly City[]>`, `findCity(uf, code): Promise<City | null>` e `findCitiesByName(name): Promise<City[]>`. A última carrega as 27 UFs e só é usada na conversão.
- `search.ts`: `normalizeSearch(text)` (minúsculas, sem acento, espaços reduzidos) e `matchesSearch(label, query)`. O `plans.ts` passa a usar `normalizeSearch` em vez da função privada dele.

### 3. Script do IBGE

- `scripts/ibge/generate-cities.ts` busca `https://servicodados.ibge.gov.br/api/v1/localidades/municipios` e grava os 28 arquivos de `cities/`. A UF de cada município vem dos 2 primeiros dígitos do código, cruzados com o `ibgeCode` de `STATES`. Assim o script não depende da hierarquia de regiões da resposta, que vem `null` em alguns municípios novos.
- A parte pura fica em `scripts/ibge/cities.ts`: `buildCityModules(raw: unknown, extractedAt: string): Map<string, string>` devolve o caminho e o conteúdo de cada arquivo, com os nomes em ordem alfabética (`localeCompare` em `pt-BR`) e o conteúdo já no formato do Biome. Tem teste com uma amostra.

### 4. Parser (`src/lib/profile/parse.ts`)

```ts
export type ProfileParseResult =
  | { ok: true; value: RestaurantProfile }
  | { ok: false; error: string; field?: ProfileErrorField; rejection?: ProfileTextRejection }

export function parseProfileInput(
  body: unknown,
  options: { requirePlan: boolean },
): Promise<ProfileParseResult>
```

- A ordem é: objeto, `version`, campo desconhecido, plano, forma e tamanho de cada campo e, por último, o filtro (`name` e o texto de "Outro") e a cidade na lista. Os textos são aparados, e os vazios descartados.
- O `PUT` chama o parser com `requirePlan: true`. O CLI e o eval chamam com `requirePlan: false`, e o eval continua exigindo o plano nas perguntas `perfil`.
- Os textos de validação passam de `src/app/api/_lib/errors.ts` (`VALIDATION_MESSAGES`) para `src/lib/validation-messages.ts`, e o `errors.ts` só os reexporta. Ganham `profileVersion`, `cuisine`, `cuisineText` e `location`, com os textos das specs. O `cuisineText` ("Descreva o tipo de cozinha em até 30 caracteres.") é o erro da interface para "Outro" sem texto.

### 5. Conversão na leitura (`src/lib/profile/upgrade.ts`)

```ts
export function upgradeProfile(raw: unknown): Promise<{ profile: RestaurantProfile; needsReview: boolean }>
```

- Com `version: 2`, cada campo é conferido de novo, como no parser mas sem erro: o campo inválido é descartado e marca `needsReview`. Sem `version`, valem as regras da spec `answer-generation`, "Perfil salvo no formato antigo". Um perfil vazio (`{}`, o padrão da coluna) vira `{ version: 2 }`, sem revisão.
- Os repositórios de conta e de conversa (`src/infra/db/`) chamam `upgradeProfile` depois da consulta. O `toProfile` sai do `mappers.ts`, e os mapeadores recebem o perfil já convertido. `AccountRecord` ganha `profileNeedsReview: boolean`. A conversa só usa o `profile`.
- **Por quê:** sem migração de dados, não há ordem a seguir entre migração e deploy, nem passo no `prod`. O dado original só muda quando a pessoa salva, e um bug na conversão não destrói nada. **Custo:** a conversão roda a cada leitura de perfil antigo, e a de cidade carrega as 27 UFs. Os módulos ficam em cache no processo, e os perfis antigos somem à medida que são salvos ou que as demos expiram.

### 6. Prompt e assistente

- `buildSystemInstruction(input: { profile: RestaurantProfile; cityName: string | null; summary: string | null })`. O `formatProfile(profile, cityName)` gera as linhas da spec. O assistente resolve `cityName` com `findCity` antes de montar o prompt. O `cleanProfile` da change 1 passa a só reaplicar o filtro em `name` e no texto de "Outro".

### 7. Interface

- `npx shadcn add command popover native-select` (versão do lockfile) cria `src/components/ui/command.tsx`, `popover.tsx` e `native-select.tsx` e acrescenta o `cmdk`. Se a versão do lockfile não tiver o `native-select`, pare e reporte.
- `search-combobox.tsx`: um `Popover` com `Command` (`shouldFilter={false}`, com o filtro feito por `matchesSearch`), um botão de gatilho com `role="combobox"` e o rótulo ligado, e a opção extra opcional `Usar "<busca>" como Outro`. A lista ocupa a largura do gatilho e rola por dentro, o que resolve os 390 px sem `Drawer`.
- `cuisine-field.tsx` (combobox e campo de "Outro") e `location-fields.tsx` (`NativeSelect` para o estado, com as 27 UFs, porque no celular abre a lista do sistema, e combobox para a cidade, com `loadCities` ao escolher o estado e um estado de carregamento). O `profile-form.tsx` monta o corpo v2 e mostra os erros por `field`, como na change 1.
- `profile-review-banner.tsx`, no chat (`src/app/page.tsx`), aparece quando `account.profileNeedsReview` é verdadeiro. O `ProfileSummary` não muda.

### 8. Demo, scripts e eval

- `DEMO_PROFILE` (`src/core/accounts.ts`) no formato v2 da spec `auth`. `checkDemoProfile` (`scripts/smoke-checks.ts`) confere o plano e o local.
- `scripts/chat.ts`: `--perfil <arquivo>` lê o JSON e chama o parser. `--nome` e `--plano` sobrescrevem o arquivo. `--cozinha`, `--cidade` e `--horario` saem e, se usados, dão erro com a dica do `--perfil`.
- `scripts/eval/questions.ts` valida o `perfil` com o parser (a validação fica assíncrona). `eval/perguntas.json`: as perguntas 122 a 126 ganham `version: 2`; a 122 recebe `location { SP, 3509502 }`, a 123 recebe `cuisine { japonesa }` e a 124 recebe `location { MG, 3106200 }`. O `git diff` só pode mostrar essas mudanças.

### 9. Documentação

- `docs/adr/0024-perfil-estruturado-e-municipios-do-ibge.md` (novo), com as alternativas do PRD (R11: texto livre, IBGE em tempo de execução, só capitais) e a migração na leitura em vez da migração de dados. Entra também no `docs/adr/README.md`.
- `AGENTS.md`, "Onde mexer": a linha "Campo novo no perfil" passa a citar `src/lib/profile/` (`types`, `parse`, `upgrade`) e a regra "mudou o formato: `upgradeProfile` converte o antigo".
- `docs/business.md`, "Conceitos": a linha "Perfil do restaurante". `docs/architecture.md`: "Arquitetura do projeto" (o CLI usa `--perfil`), "Front-end" (o `/perfil` e a faixa), "Back-end" (`GET`/`PUT /api/profile`) e "Banco de dados" (o `profile` v2 e a conversão na leitura). `docs/development.md`, "Scripts locais": como regenerar os municípios. `docs/qa.md`, "Verificação manual local" (o item **Perfil**: combobox, estado/cidade, teclado e 390 px) e "Smoke na demo publicada" (o passo do perfil confere o local).
- `README.md`: as frases que listam os campos do perfil (procure "nome, cozinha, cidade e horário") passam a dizer "estado e cidade".

### Arquivos que a change pode criar ou alterar

- Novos: `src/lib/profile/` (`types.ts`, `cuisines.ts`, `states.ts`, `cities.ts`, `cities/*.ts`, `search.ts`, `parse.ts`, `upgrade.ts` e os testes), `src/lib/validation-messages.ts`, `src/components/ui/command.tsx`, `popover.tsx`, `native-select.tsx`, `src/components/chat/search-combobox.tsx`, `cuisine-field.tsx`, `location-fields.tsx`, `profile-review-banner.tsx`, `scripts/ibge/generate-cities.ts`, `cities.ts` e o teste, e `docs/adr/0024-perfil-estruturado-e-municipios-do-ibge.md`.
- Alterados: `package.json`, `package-lock.json` (só `cmdk`), `src/lib/types.ts`, `src/lib/plans.ts`, `src/lib/api-client.ts`, `src/app/api/_lib/validate.ts`, `errors.ts`, `handlers.ts`, `src/infra/db/mappers.ts`, `account-repository.ts`, `session-repository.ts`, `src/core/types.ts`, `prompts.ts`, `assistant.ts`, `accounts.ts`, `src/components/chat/profile-form.tsx`, `src/app/page.tsx`, `src/app/perfil/page.tsx`, `scripts/chat.ts`, `scripts/eval/questions.ts`, `scripts/smoke-checks.ts`, `eval/perguntas.json`, os testes ao lado de cada um e os documentos da decisão 9.

## Risks / Trade-offs

- [O `import()` por UF não gera pedaços separados no build] → conferir no `npm run build` que a página `/perfil` não carrega os 27 módulos de uma vez (o tamanho da rota no resumo do build).
- [A conversão escolhe a cozinha errada por sinônimo] → só há sinônimos inequívocos, com teste; na dúvida, o texto vira "Outro".
- [O IBGE cria ou renomeia um município] → rodar o script de novo; um código antigo que deixar de existir é descartado na leitura e marca revisão.
- [Conflito com a peça 3 no formulário] → só tokens e componentes do shadcn; rebase depois da `apply-rango-brand-to-screens`, se ela entrar antes.

## Migration Plan

Sem passo de banco. O deploy do código já converte os perfis na leitura. Para voltar atrás, basta reverter o deploy: os perfis salvos no v2 durante o período ficam com campos que o código antigo não reconhece, e o `toProfile` antigo descarta esses campos e mantém nome, plano e horário.
