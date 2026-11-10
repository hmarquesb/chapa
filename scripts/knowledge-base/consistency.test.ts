import { describe, expect, it } from "vitest"
import {
  countWords,
  extractQuantities,
  findMissingValues,
  findUncitedKeys,
  flattenRules,
  type RuleValue,
} from "./consistency"

const HEADER =
  "> Política de parceiros da Rango, vigente desde 01/11/2026. Empresa fictícia, criada para fins de estudo."

function values(markdown: string): Array<[number, string]> {
  return extractQuantities(markdown).map((q) => [q.value, q.unit])
}

describe("extractQuantities", () => {
  it("reads percentages, with and without decimals", () => {
    expect(values("A comissão é de 11% e a antecipação custa 2,49%.")).toEqual([
      [11, "pct"],
      [2.49, "pct"],
    ])
  })

  it("reads reais in the Brazilian format, with thousands and cents", () => {
    const quantities = extractQuantities("Isenção abaixo de R$ 2.000,00 e mínimo de R$ 20,00.")
    expect(quantities).toEqual([
      { value: 2000, unit: "reais", raw: "R$ 2.000,00" },
      { value: 20, unit: "reais", raw: "R$ 20,00" },
    ])
  })

  it("reads reais without a space after the symbol", () => {
    expect(values("Custa R$8,90 por corrida.")).toEqual([[8.9, "reais"]])
  })

  it("reads time units in singular and plural", () => {
    expect(
      values(
        "Aceite em 8 minutos, 1 minuto, 24 horas, 1 hora, 7 dias, 1 dia, 3 dias úteis e 1 dia útil.",
      ),
    ).toEqual([
      [8, "min"],
      [1, "min"],
      [24, "horas"],
      [1, "horas"],
      [7, "dias"],
      [1, "dias"],
      [3, "dias_uteis"],
      [1, "dias_uteis"],
    ])
  })

  it("tells business days apart from calendar days", () => {
    const quantities = extractQuantities("Resposta em 5 dias úteis, prazo de 7 dias.")
    expect(quantities).toEqual([
      { value: 5, unit: "dias_uteis", raw: "5 dias úteis" },
      { value: 7, unit: "dias", raw: "7 dias" },
    ])
  })

  it("reads km, MB and px", () => {
    expect(values("Raio de 7 km, foto de até 5 MB e largura de 1200 px.")).toEqual([
      [7, "km"],
      [5, "mb"],
      [1200, "px"],
    ])
  })

  it("reads thousands with a dot as a single number", () => {
    expect(values("Até 1.300 px.")).toEqual([[1300, "px"]])
  })

  it("ignores times of day and other abbreviations", () => {
    expect(values("Telefone das 8h às 22h, até o dia 25, em 30min e 2d.")).toEqual([])
  })

  it("ignores numbers without a recognized unit", () => {
    expect(values("Até 10 usuários, 500 itens, nota 4,6 e 18 anos, no 3º fechamento.")).toEqual([])
  })

  it("does not take a unit glued to a longer word", () => {
    expect(values("São 5 diárias e 3 horários.")).toEqual([])
  })

  it("applies the unit of the last number to a range with 'a'", () => {
    const quantities = extractQuantities("O preparo vai de 5 a 90 minutos.")
    expect(quantities).toEqual([
      { value: 5, unit: "min", raw: "5 minutos" },
      { value: 90, unit: "min", raw: "90 minutos" },
    ])
  })

  it("applies the unit to pairs with 'e' and 'ou'", () => {
    expect(values("Entre 5 e 90 minutos. Em 5 ou 7 dias.")).toEqual([
      [5, "min"],
      [90, "min"],
      [5, "dias"],
      [7, "dias"],
    ])
  })

  it("applies the unit to dimensions with × and x", () => {
    expect(values("No mínimo 1200 × 900 px ou 1200 x 900 px.")).toEqual([
      [1200, "px"],
      [900, "px"],
      [1200, "px"],
      [900, "px"],
    ])
  })

  it("does not propagate R$ to a bare number before it", () => {
    expect(values("De 3 a R$ 1,99.")).toEqual([[1.99, "reais"]])
  })

  it("reads each side of a range in reais with its own symbol", () => {
    expect(values("De R$ 0,99 a R$ 1,99 por pedido.")).toEqual([
      [0.99, "reais"],
      [1.99, "reais"],
    ])
  })

  it("ignores a paragraph that starts with Exemplo:", () => {
    const markdown = [
      "## Conta",
      "",
      "Exemplo: num pedido de R$ 80,00 no Plano Próprio, a comissão é de R$ 8,80.",
      "Ela entra no repasse de 7 dias depois.",
      "",
      "A comissão é de 11%.",
    ].join("\n")
    expect(values(markdown)).toEqual([[11, "pct"]])
  })

  it("ignores a bold Exemplo: paragraph", () => {
    expect(values("**Exemplo:** um pedido de R$ 50,00 paga R$ 5,50.")).toEqual([])
  })

  it("ignores a list item that starts with Exemplo:, including its continuation lines", () => {
    const markdown = [
      "- Prazo de 7 dias.",
      "- Exemplo: um pedido de R$ 80,00",
      "  paga R$ 8,80 de comissão.",
      "- Resposta em 5 dias úteis.",
    ].join("\n")
    expect(values(markdown)).toEqual([
      [7, "dias"],
      [5, "dias_uteis"],
    ])
  })

  it("ignores the title and the policy header", () => {
    const markdown = [
      "# Planos de 30 dias",
      "",
      HEADER,
      "",
      "## Seção de 24 horas",
      "",
      "Texto com 8 minutos.",
    ].join("\n")
    expect(values(markdown)).toEqual([
      [24, "horas"],
      [8, "min"],
    ])
  })

  it("keeps a blockquote that comes after the first section", () => {
    const markdown = ["# Título", "", HEADER, "", "## Seção", "", "> Atenção: 7 dias."].join("\n")
    expect(values(markdown)).toEqual([[7, "dias"]])
  })
})

describe("flattenRules", () => {
  it("returns numeric leaves with a unit suffix and their dotted path", () => {
    const rules = {
      planos: {
        proprio: { comissao_pct: 11, mensalidade_reais: 99 },
        area_propria_raio_maximo_km: 7,
      },
      cancelamentos: { aceite_automatico_min: 8, contestacao_resposta_dias_uteis: 5 },
      repasse: { antecipacao: { taxa_pct: 2.49 } },
      outros: { a_horas: 24, b_dias: 7, c_mb: 5, d_px: 1200 },
    }
    expect(flattenRules(rules)).toEqual([
      { key: "planos.proprio.comissao_pct", value: 11, unit: "pct" },
      { key: "planos.proprio.mensalidade_reais", value: 99, unit: "reais" },
      { key: "planos.area_propria_raio_maximo_km", value: 7, unit: "km" },
      { key: "cancelamentos.aceite_automatico_min", value: 8, unit: "min" },
      { key: "cancelamentos.contestacao_resposta_dias_uteis", value: 5, unit: "dias_uteis" },
      { key: "repasse.antecipacao.taxa_pct", value: 2.49, unit: "pct" },
      { key: "outros.a_horas", value: 24, unit: "horas" },
      { key: "outros.b_dias", value: 7, unit: "dias" },
      { key: "outros.c_mb", value: 5, unit: "mb" },
      { key: "outros.d_px", value: 1200, unit: "px" },
    ])
  })

  it("leaves out _qtd keys, keys without a known suffix and non-numeric values", () => {
    const rules = {
      cardapio: { itens_qtd: 500, foto_formatos: ["JPG", "PNG"] },
      avaliacoes: { nota_minima: 4.6 },
      suporte: { telefone_horario: "8h às 22h", texto_pct: "11", nulo_reais: null },
      empresa: { nome: "Rango" },
      tempo_de_preparo_minimo_min: 5,
    }
    expect(flattenRules(rules)).toEqual([
      { key: "tempo_de_preparo_minimo_min", value: 5, unit: "min" },
    ])
  })

  it("turns a list of numbers into one value per item", () => {
    expect(flattenRules({ fotos: { larguras_px: [800, 1200] } })).toEqual([
      { key: "fotos.larguras_px[0]", value: 800, unit: "px" },
      { key: "fotos.larguras_px[1]", value: 1200, unit: "px" },
    ])
  })

  it("returns an empty list for a non-object", () => {
    expect(flattenRules(null)).toEqual([])
    expect(flattenRules("texto")).toEqual([])
  })
})

const RULES: RuleValue[] = [
  { key: "planos.proprio.comissao_pct", value: 11, unit: "pct" },
  { key: "planos.isencao_mensalidade_faturamento_abaixo_reais", value: 2000, unit: "reais" },
  { key: "cancelamentos.contestacao_prazo_dias", value: 7, unit: "dias" },
  { key: "suporte.ouvidoria_resposta_dias_uteis", value: 10, unit: "dias_uteis" },
  { key: "suporte.prazos.cardapio_dias_uteis", value: 1, unit: "dias_uteis" },
  { key: "embalagem.tempo_de_preparo_minimo_min", value: 5, unit: "min" },
  { key: "embalagem.tempo_de_preparo_maximo_min", value: 90, unit: "min" },
  { key: "repasse.antecipacao.taxa_pct", value: 2.49, unit: "pct" },
]

describe("findMissingValues", () => {
  it("reports a number that is not in the rules, with the file and the raw text", () => {
    const documents = [{ name: "01-planos-e-taxas.md", content: "A comissão é de 12%." }]
    expect(findMissingValues(documents, RULES)).toEqual([
      "01-planos-e-taxas.md: 12% não encontrado no regras.yaml",
    ])
  })

  it("fails for the same value with a different unit", () => {
    const documents = [{ name: "03-cancelamentos.md", content: "Resposta em 7 dias úteis." }]
    expect(findMissingValues(documents, RULES)).toEqual([
      "03-cancelamentos.md: 7 dias úteis não encontrado no regras.yaml",
    ])
  })

  it("finds reais in the Brazilian format and decimal percentages", () => {
    const documents = [
      { name: "01.md", content: "Isenção abaixo de R$ 2.000,00. Antecipação de 2,49%." },
    ]
    expect(findMissingValues(documents, RULES)).toEqual([])
  })

  it("finds a singular business day", () => {
    const documents = [{ name: "09.md", content: "Cardápio em 1 dia útil." }]
    expect(findMissingValues(documents, RULES)).toEqual([])
  })

  it("checks every number of a range", () => {
    const ok = [{ name: "07.md", content: "De 5 a 90 minutos." }]
    expect(findMissingValues(ok, RULES)).toEqual([])
    const wrong = [{ name: "07.md", content: "De 4 a 90 minutos." }]
    expect(findMissingValues(wrong, RULES)).toEqual([
      "07.md: 4 minutos não encontrado no regras.yaml",
    ])
  })

  it("ignores Exemplo: paragraphs", () => {
    const documents = [
      {
        name: "01.md",
        content:
          "Exemplo: num pedido de R$ 80,00 no Plano Próprio, a comissão é de R$ 8,80.\n\nComissão de 11%.",
      },
    ]
    expect(findMissingValues(documents, RULES)).toEqual([])
  })

  it("lists every missing number in file and text order", () => {
    const documents = [
      { name: "01.md", content: "Comissão de 12% e 11%, mais R$ 3,00." },
      { name: "02.md", content: "Prazo de 8 dias." },
    ]
    expect(findMissingValues(documents, RULES)).toEqual([
      "01.md: 12% não encontrado no regras.yaml",
      "01.md: R$ 3,00 não encontrado no regras.yaml",
      "02.md: 8 dias não encontrado no regras.yaml",
    ])
  })
})

describe("findUncitedKeys", () => {
  it("returns the keys whose value does not appear with the same unit", () => {
    const documents = [
      { name: "01.md", content: "Comissão de 11%, isenção abaixo de R$ 2.000,00." },
      {
        name: "03.md",
        content: "Contestação em 7 dias, cardápio em 1 dia útil, preparo de 5 a 90 minutos.",
      },
      { name: "02.md", content: "Antecipação de 2,49%. Ouvidoria em 10 dias." },
    ]
    expect(findUncitedKeys(documents, RULES)).toEqual(["suporte.ouvidoria_resposta_dias_uteis"])
  })

  it("does not count values cited only in Exemplo: paragraphs", () => {
    const rules: RuleValue[] = [{ key: "planos.proprio.comissao_pct", value: 11, unit: "pct" }]
    const documents = [{ name: "01.md", content: "Exemplo: a comissão de 11% vira R$ 8,80." }]
    expect(findUncitedKeys(documents, rules)).toEqual(["planos.proprio.comissao_pct"])
  })
})

describe("countWords", () => {
  it("counts whitespace-separated sequences, like wc -w", () => {
    expect(countWords("# Título\n\n> Cabeçalho da política.\n\n- item   um\n\tdois")).toBe(10)
  })

  it("returns zero for blank text", () => {
    expect(countWords("  \n\n ")).toBe(0)
  })
})
