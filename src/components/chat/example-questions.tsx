import { Button } from "@/components/ui/button"

export const EXAMPLE_QUESTIONS = [
  "Quando o repasse cai na minha conta?",
  "O cliente cancelou e eu perdi a comida, e agora?",
  "Me passa uma receita de lasanha?",
] as const

type ExampleQuestionsProps = {
  disabled: boolean
  onPick: (question: string) => void
}

export function ExampleQuestions({ disabled, onPick }: ExampleQuestionsProps) {
  return (
    <section aria-labelledby="exemplos-titulo" className="flex flex-col gap-2">
      <h2 id="exemplos-titulo" className="text-sm font-medium text-muted-foreground">
        Experimente perguntar
      </h2>
      <ul className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        {EXAMPLE_QUESTIONS.map((question) => (
          <li key={question}>
            <Button
              variant="outline"
              className="h-auto w-full justify-start py-2 text-left whitespace-normal sm:w-auto"
              disabled={disabled}
              onClick={() => onPick(question)}
            >
              {question}
            </Button>
          </li>
        ))}
      </ul>
    </section>
  )
}
