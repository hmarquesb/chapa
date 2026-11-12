# Design

## Context

- Esta change parte da `main` com a `structure-profile-cuisine-and-location` já mergeada. Já existem `src/lib/profile/` (tipos v2, `parseProfileInput`, `upgradeProfile`), `src/lib/validation-messages.ts`, o `field` no `400`, o `NativeSelect` do shadcn, a faixa de revisão e o `formatProfile(profile, cityName)` com a linha "Horário" em texto livre.
- `upgradeProfile` já marca `needsReview` quando descarta um campo, e a faixa já some quando a pessoa salva.
- `src/components/ui/collapsible.tsx` já existe. `switch` ainda não.

## Goals / Non-Goals

**Goals:** as regras da grade e o texto do prompt vivem em funções puras, testadas por tabela e usadas pela interface, pelo parser e pelo prompt.

**Non-Goals:** qualquer cálculo com a hora atual ("aberto agora"); mudar a `version` do perfil.

## Decisions

### 1. Tipos (em `src/lib/profile/types.ts`)

```ts
export const DAY_IDS = ["seg", "ter", "qua", "qui", "sex", "sab", "dom"] as const
export type DayId = (typeof DAY_IDS)[number]
export type Shift = { open: string; close: string }   // "HH:MM", minutos 00 ou 30
export type WeekHours = Record<DayId, Shift[]>          // [] = fechado; no máximo 2 turnos

// RestaurantProfile.hours passa de string para WeekHours
export type ProfileErrorField = "name" | "cuisine" | "location" | "hours" | `hours.${DayId}`
```

`HOUR_STEP_MINUTES = 30` e `MAX_SHIFTS_PER_DAY = 2` ficam em `src/lib/profile/hours.ts`. São regras do formato, não parâmetros de RAG ou de limite, por isso não vão para `src/config.ts`.

### 2. Funções puras (`src/lib/profile/hours.ts`)

```ts
export function parseWeekHours(value: unknown):
  | { ok: true; value: WeekHours | undefined }          // undefined = nenhum turno
  | { ok: false; field: "hours" | `hours.${DayId}`; error: string }

export function formatWeekHours(hours: WeekHours): string // o texto depois de "Horário: "
export function hourOptions(): readonly string[]          // "00:00" … "23:30"
export function crossesMidnight(shift: Shift): boolean
export function firstOpenDay(hours: WeekHours): DayId | null
export function copyShifts(hours: WeekHours, from: DayId, to: readonly DayId[]): WeekHours
export const WEEKDAYS: readonly DayId[]                    // seg a sex
```

- `parseWeekHours` primeiro confere o formato (as 7 chaves, listas de até 2 turnos, `HH:MM` no passo) e devolve `field: "hours"`. Depois aplica as regras de "Regras dos turnos de um dia" (spec `chat-api`) dia a dia, de segunda a domingo, e devolve o primeiro erro com `hours.<dia>`. Os minutos são comparados como número desde a meia-noite. Um turno que passa da meia-noite termina em `close + 1440`.
- As mensagens ficam em `VALIDATION_MESSAGES` (`hoursFormat`, `hoursSameTime`, `hoursOverlap`, `hoursOvernight`), como funções que recebem o nome do dia ("segunda", "terça"…), porque o texto muda com o dia. O nome por extenso vem de um `DAY_LABELS` em `hours.ts`, que a interface também usa.
- `formatWeekHours` monta os grupos de dias seguidos com turnos iguais, de segunda a domingo e sem dar a volta. Os rótulos curtos são "seg", "ter", "qua", "qui", "sex", "sáb" e "dom". A hora é escrita como "11h" ou "11h30", sem zero à esquerda.

### 3. Parser e conversão

- `parseProfileInput` chama `parseWeekHours` para `hours` e devolve o `field` e o erro dele. Uma grade sem turnos vira perfil sem `hours`.
- `upgradeProfile`: `hours` em string (perfil antigo ou v2 da change 2) é descartado e marca `needsReview`. Uma grade inválida também é descartada e marca `needsReview`.

### 4. Prompt

- O `formatProfile` troca o valor aparado de `hours` por `formatWeekHours(profile.hours)`. Nada mais muda no prompt.

### 5. Interface

- `npx shadcn add switch` cria `src/components/ui/switch.tsx`.
- `hours-editor.tsx` recebe `{ value: WeekHours; onChange; errors: Partial<Record<DayId, string>>; defaultOpen: boolean }`. Usa o `Collapsible` com o gatilho "Horário de funcionamento · opcional", uma linha por dia com `Switch` (rótulo com o nome do dia) e um `NativeSelect` por horário, com `aria-label` completo e `hourOptions()`. A indicação "(dia seguinte)" vem de `crossesMidnight`. Os atalhos usam `firstOpenDay` e `copyShifts`. Ao abrir um dia, ele recebe os turnos do primeiro dia aberto ou, sem nenhum, 11:00 às 15:00.
- O `profile-form.tsx` guarda a grade, roda `parseWeekHours` no envio, põe o erro no dia certo (também quando o `field` vem da API) e manda o foco para o primeiro seletor do dia com erro. `defaultOpen` é verdadeiro quando o perfil tem horário ou `needsReview`. Em 390 px, cada turno ocupa uma linha, com os dois seletores lado a lado.

### 6. Demo

- `DEMO_PROFILE.hours` é a grade da spec `auth`. O `checkDemoProfile` não muda.

### 7. Documentação

- `docs/business.md`, "Conceitos": a linha "Perfil do restaurante" passa a dizer que o horário é uma grade semanal com até 2 turnos por dia.
- `docs/architecture.md`, "Front-end": a seção de horário do `/perfil`.
- `docs/qa.md`, "Verificação manual local", o item **Perfil**: o fluxo de horário (atalhos, madrugada, teclado, 390 px).
- `AGENTS.md`, "Onde mexer": na linha "Campo novo no perfil", citar `hours.ts`.

### Arquivos que a change pode criar ou alterar

- Novos: `src/lib/profile/hours.ts`, `hours.test.ts`, `src/components/ui/switch.tsx` e `src/components/chat/hours-editor.tsx`.
- Alterados: `src/lib/profile/types.ts`, `parse.ts`, `upgrade.ts` (e os testes), `src/lib/validation-messages.ts`, `src/core/prompts.ts`, `src/core/accounts.ts` (e os testes), `src/components/chat/profile-form.tsx`, `src/lib/api-client.ts` (só se o tipo pedir), `AGENTS.md`, `docs/business.md`, `docs/architecture.md` e `docs/qa.md`.

## Risks / Trade-offs

- [Formulário de horário cansativo] → seção recolhível, campo opcional e atalhos de cópia; ao abrir um dia, ele já vem preenchido.
- [Regra da madrugada difícil de entender] → mensagem com os dois dias por extenso e "(dia seguinte)" visível no turno.
- [A linha do prompt fica longa em semanas irregulares] → o pior caso são 7 grupos curtos, e o teste de dias alternados fixa o formato.

## Migration Plan

Sem passo de banco. Os perfis com horário em texto são convertidos na leitura e mostram a faixa até a pessoa salvar. Se o deploy for revertido, o código da change 2 encontra um `hours` em objeto: o `upgradeProfile` dela descarta o campo e marca revisão, sem quebrar.
