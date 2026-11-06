// Fumaça manual do cliente de LLM (S01, RF10). Faz 1 generate e 1 embed de verdade.
// ⚠️ Chama a API do Gemini: rode só com autorização.
// node --conditions=react-server --env-file-if-exists=.env.local --import tsx scripts/smoke-llm.ts
import { config } from "@/config"
import { getLlmClient } from "@/infra/llm"

async function main(): Promise<void> {
  const llm = getLlmClient()

  const reply = await llm.generate({
    model: config.models.fast,
    // Sem maxOutputTokens: o "thinking" também consome tokens de saída e poderia cortar a resposta.
    messages: [{ role: "user", content: "Responda só: ok" }],
  })
  console.log(`generate (${config.models.fast}): ${JSON.stringify(reply.text)}`)
  console.log("generate usage:", reply.usage)

  const embedded = await llm.embed({
    model: config.models.embedding,
    texts: ["Teste de fumaça do Chapa."],
    task: "query",
    dimensions: config.models.embeddingDimensions,
  })
  console.log(`embed (${config.models.embedding}): dimensão ${embedded.vectors[0]?.length ?? 0}`)
  console.log("embed usage:", embedded.usage)

  if (reply.text.trim() === "" || embedded.vectors[0]?.length !== config.models.embeddingDimensions)
    process.exitCode = 1
}

main().catch((error: unknown) => {
  // Só o nome e a mensagem genérica do erro, nunca o prompt.
  console.error(error instanceof Error ? `${error.name}: ${error.message}` : "Erro desconhecido")
  process.exitCode = 1
})
