// Confere os termos de deve_conter do eval/perguntas.json contra o knowledge-base/regras.yaml
// (ADR 0019): todo número com unidade num termo esperado tem que existir nas regras.
// Os termos de nao_deve_conter não são conferidos, porque costumam ser valores errados de propósito.
// Só leitura local: sem rede, sem banco e sem chave.
import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, it } from "vitest"
import { parse } from "yaml"
import { extractQuantities, flattenRules, type RuleValue } from "../knowledge-base/consistency"

const ROOT = resolve(__dirname, "../..")
const TOLERANCE = 1e-9

type QuestionTerms = { id: number; deve_conter?: string[] }

// Uma linha por termo com um número que não tem par (mesmo valor e unidade) no regras.yaml.
function findUnknownTerms(questions: QuestionTerms[], rules: RuleValue[]): string[] {
  const lines: string[] = []
  for (const question of questions) {
    for (const term of question.deve_conter ?? []) {
      const missing = extractQuantities(term).some(
        (quantity) =>
          !rules.some(
            (rule) =>
              rule.unit === quantity.unit && Math.abs(rule.value - quantity.value) < TOLERANCE,
          ),
      )
      if (missing) lines.push(`Pergunta ${question.id}: "${term}" não está no regras.yaml`)
    }
  }
  return lines
}

const RULES = flattenRules(parse(readFileSync(resolve(ROOT, "knowledge-base/regras.yaml"), "utf8")))
const QUESTIONS = JSON.parse(
  readFileSync(resolve(ROOT, "eval/perguntas.json"), "utf8"),
) as QuestionTerms[]

describe("deve_conter terms against regras.yaml", () => {
  it("finds every number with a unit of eval/perguntas.json in regras.yaml", () => {
    expect(findUnknownTerms(QUESTIONS, RULES)).toEqual([])
  })

  it("checks at least one term with a unit in the real file", () => {
    const withUnit = QUESTIONS.flatMap((question) => question.deve_conter ?? []).filter(
      (term) => extractQuantities(term).length > 0,
    )
    expect(withUnit.length).toBeGreaterThan(0)
  })

  it("points the question and the term with an invented number", () => {
    const questions: QuestionTerms[] = [
      { id: 7, deve_conter: ["12%", "quarta"] },
      { id: 8, deve_conter: ["22%", "R$ 8,90", "3 dias úteis"] },
    ]
    expect(findUnknownTerms(questions, RULES)).toEqual([
      'Pergunta 7: "12%" não está no regras.yaml',
    ])
  })

  it("compares the unit too, not only the value", () => {
    // 22 existe como %, mas não como dias.
    expect(findUnknownTerms([{ id: 9, deve_conter: ["22 dias"] }], RULES)).toEqual([
      'Pergunta 9: "22 dias" não está no regras.yaml',
    ])
  })

  it("ignores terms without a number with a recognized unit", () => {
    expect(findUnknownTerms([{ id: 10, deve_conter: ["quarta", "2.000", "139"] }], RULES)).toEqual(
      [],
    )
  })
})
