import "server-only"
import { FALLBACK_MESSAGE } from "@/core/messages"
import type { ChatMessage, RetrievedChunk } from "@/core/types"
import { PROFILE_FIELDS, type RestaurantProfile } from "@/lib/types"

export const SYSTEM_PROMPT = `Você é o Chapa, o assistente de parceiros da Rango, uma empresa de delivery. Você ajuda donos e gerentes de restaurantes que já são parceiros da Rango a tirar dúvidas operacionais: planos e taxas, repasse, cancelamentos e contestações, cardápio e fotos, horários e pausas, avaliações, embalagem e entrega, promoções e cupons, suporte e chamados, conta e segurança, pagamentos e notas fiscais.

Regras:
- Use um tom simples, cordial e direto, em português do Brasil. Responda em no máximo 150 palavras.
- Para procedimentos, use um passo a passo numerado.
- Responda apenas com base no contexto da base de conhecimento enviado na mensagem. Não invente números, prazos, valores, nomes de plano ou nomes de tela.
- Use o perfil do restaurante, quando houver, para personalizar a resposta (por exemplo, "no seu plano…"), sem inventar dados que o perfil não traz.
- Não peça nem aceite dados sensíveis, como CPF, número de cartão ou senha.
- Você não executa ações (não altera cardápio, não pausa a loja, não abre chamado). Explique como a pessoa faz.
- Não liste as fontes no texto: a interface já mostra os arquivos usados.
- Se a resposta não estiver no contexto, ou se a pergunta fugir do escopo (inclusive cadastro de novos restaurantes), responda exatamente: ${FALLBACK_MESSAGE}`

const PROFILE_LABELS: Record<(typeof PROFILE_FIELDS)[number], string> = {
  name: "Nome",
  plan: "Plano",
  cuisine: "Cozinha",
  city: "Cidade",
  hours: "Horário",
}

// Uma linha "Rótulo: valor" por campo preenchido, na ordem de PROFILE_FIELDS. "" se vazio.
export function formatProfile(profile: RestaurantProfile): string {
  const lines: string[] = []
  for (const field of PROFILE_FIELDS) {
    const value = profile[field]?.trim()
    if (value) lines.push(`${PROFILE_LABELS[field]}: ${value}`)
  }
  return lines.join("\n")
}

export function buildSystemInstruction(input: {
  profile: RestaurantProfile
  summary: string | null
}): string {
  const parts = [SYSTEM_PROMPT]
  const profile = formatProfile(input.profile)
  if (profile !== "") parts.push(`Perfil do restaurante:\n${profile}`)
  const summary = input.summary?.trim()
  if (summary) parts.push(`Resumo da conversa até aqui:\n${summary}`)
  return parts.join("\n\n")
}

function sourceLabel(chunk: RetrievedChunk): string {
  return chunk.section === ""
    ? `[Fonte: ${chunk.source}]`
    : `[Fonte: ${chunk.source} › ${chunk.section}]`
}

// Exemplos fictícios e genéricos (few-shot): um respondido pelo contexto e um que cai no fallback.
const FEW_SHOT_EXAMPLES = `Exemplos (fictícios, só para mostrar o formato; não use o conteúdo deles na resposta):

Exemplo 1
Contexto: Para pausar a loja temporariamente, acesse a área de horários do Painel Rango e escolha a opção de pausa. A pausa pode ser desfeita a qualquer momento.
Pergunta: Como pauso a loja por um tempo?
Resposta:
1. Acesse a área de horários do Painel Rango.
2. Escolha a opção de pausa.
Você pode desfazer a pausa quando quiser.

Exemplo 2
Contexto: Fotos do cardápio devem mostrar o prato real, com boa iluminação.
Pergunta: Qual é o prazo para receber o repasse?
Resposta: ${FALLBACK_MESSAGE}`

export function buildRagPrompt(question: string, results: RetrievedChunk[]): string {
  const context =
    results.length === 0
      ? "(nenhum trecho encontrado)"
      : results.map((chunk) => `${sourceLabel(chunk)}\n${chunk.content}`).join("\n---\n")

  return `Instruções:
- Responda só com base no contexto da base de conhecimento abaixo.
- Se a resposta não estiver no contexto, responda exatamente: ${FALLBACK_MESSAGE}
- Não mostre seu raciocínio. Escreva só a resposta final.
- Não invente números, prazos ou valores que não estejam no contexto.

${FEW_SHOT_EXAMPLES}

Contexto da base de conhecimento:
${context}

Pergunta: ${question}`
}

export const REWRITE_PROMPT = `Você reescreve perguntas para uma busca na base de conhecimento do assistente de parceiros da Rango, uma empresa de delivery.
Use o resumo e o histórico da conversa para transformar a última pergunta do parceiro numa pergunta autossuficiente, em português do Brasil, que faça sentido sem o histórico.
Não responda à pergunta e não acrescente informações que não estejam na conversa. Se a última pergunta já for autossuficiente, repita-a.
Devolva só a pergunta, numa única linha, sem aspas nem explicações.`

export const SUMMARY_PROMPT = `Você resume conversas entre um restaurante parceiro da Rango, uma empresa de delivery, e o assistente Chapa.
Escreva um único parágrafo, em português do Brasil, com até 120 palavras, que junte o resumo anterior (se houver) e as mensagens novas.
Mantenha os fatos sobre o restaurante, as dúvidas já respondidas e o que ficou em aberto.
Não copie dados sensíveis (CPF, número de cartão, senha, telefone ou e-mail).
Devolva só o parágrafo.`

const ROLE_LABELS: Record<ChatMessage["role"], string> = {
  user: "Parceiro",
  assistant: "Assistente",
}

// "Parceiro: ..." / "Assistente: ...", uma mensagem por linha. Usado na reescrita e no resumo.
export function formatTranscript(messages: ChatMessage[]): string {
  return messages.map((message) => `${ROLE_LABELS[message.role]}: ${message.content}`).join("\n")
}
