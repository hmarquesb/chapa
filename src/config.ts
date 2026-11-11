// Único lugar com nomes de modelo e parâmetros do RAG (AGENTS.md, regra 1 de IA e RAG).
// Não tem segredo e não importa "server-only": os scripts locais também o usam.

export type ChunkStrategy = "markdown" | "fixed"

export type RagConfig = {
  topK: number // quantos trechos vão para o prompt
  minScore: number // score híbrido mínimo para um trecho contar
  alpha: number // peso do semântico no score híbrido (0 a 1)
  candidateLimit: number // quantos candidatos o SQL devolve antes do ranking em TS
  chunkStrategy: ChunkStrategy
  chunkSize: number // em caracteres
  chunkOverlap: number // em caracteres
  rewriteQuery: boolean // reescrever a pergunta com o histórico antes da busca
}

export type AppConfig = {
  models: {
    chat: string // gera a resposta
    fast: string // reescrita, resumo da sessão e juiz do eval
    embedding: string
    embeddingDimensions: number
  }
  rag: RagConfig
  memory: {
    recentMessages: number // mensagens recentes enviadas inteiras ao modelo
    summarizeAbove: number // acima disso, as mais antigas viram resumo
  }
  limits: {
    maxInputChars: number
    maxBodyBytes: number
    rateLimitPerMinute: number
    rateLimitPerDay: number
  }
  sessionTtlDays: number
  accounts: {
    sessionMaxAgeDays: number // validade do cookie de sessão
    demoTtlDays: number // vida da conta demo
    demoAccountsPerIpPerDay: number
    googleInactiveDays: number // conta Google sem acesso é apagada
  }
  llm: {
    retries: number // tentativas no total, incluindo a primeira
    baseDelayMs: number
    timeoutMs: number
    embedBatchSize: number
    // Pausa entre lotes de embedding: o plano gratuito conta cada texto do lote no limite por minuto.
    embedBatchDelayMs: number
  }
}

// conferido em 05/11/2026 em https://aistudio.google.com/docs/models (antiga
// ai.google.dev/gemini-api/docs/models), https://aistudio.google.com/docs/pricing (plano
// gratuito) e https://aistudio.google.com/docs/embeddings.
// - gemini-3.5-flash-lite: Flash-Lite estável mais recente, com plano gratuito. Faz o chat e
//   as tarefas auxiliares (ADR 0014): no plano gratuito da conta, o gemini-3.8-flash tem só
//   20 requisições por dia, contra 500 do Flash-Lite (painel de cotas do AI Studio,
//   consultado em 06/11/2026). Para testar outro modelo de chat, use CHAT_MODEL.
// - gemini-embedding-001: o gemini-embedding-2 não aceita taskType (RETRIEVAL_QUERY e
//   RETRIEVAL_DOCUMENT), que a busca usa. Por isso fica o 001.
const DEFAULT_MODELS = {
  chat: "gemini-3.5-flash-lite",
  fast: "gemini-3.5-flash-lite",
  embedding: "gemini-embedding-001",
  embeddingDimensions: 768,
} as const

export type ThinkingLevel = "minimal" | "low"

// Menor nível de "thinking" que cada modelo aceita, para economizar cota e latência.
// conferido em 05/11/2026 em https://aistudio.google.com/docs/thinking: o gemini-3.8-flash
// aceita low, medium e high (padrão medium; minimal dá erro), e o gemini-3.5-flash-lite
// aceita minimal (padrão minimal). Um modelo fora da lista usa o padrão dele. O
// gemini-3.8-flash continua na lista para quem o escolher via CHAT_MODEL.
export const MODEL_THINKING_LEVEL: Readonly<Record<string, ThinkingLevel>> = Object.freeze({
  "gemini-3.5-flash-lite": "minimal",
  "gemini-3.8-flash": "low",
})

export const RAG_PRESETS: { padrao: RagConfig; baseline: RagConfig } = Object.freeze({
  // Calibrado na S08: minScore 0.5 → 0.55 (ver eval/resultados/CALIBRACAO.md).
  padrao: Object.freeze({
    topK: 5,
    minScore: 0.55,
    alpha: 0.7,
    candidateLimit: 30,
    chunkStrategy: "markdown",
    chunkSize: 1200,
    chunkOverlap: 150,
    rewriteQuery: true,
  }),
  // Configuração ingênua, ponto de partida da avaliação.
  baseline: Object.freeze({
    topK: 5,
    minScore: 0.7,
    alpha: 0.7,
    candidateLimit: 30,
    chunkStrategy: "fixed",
    chunkSize: 500,
    chunkOverlap: 100,
    rewriteQuery: false,
  }),
})

function envOverride(value: string | undefined, fallback: string): string {
  return value !== undefined && value !== "" ? value : fallback
}

// Só CHAT_MODEL, FAST_MODEL e EMBEDDING_MODEL mudam o config. Parâmetros de RAG mudam por
// código (withRag) ou por argumento dos scripts.
export function loadConfig(env: Record<string, string | undefined>): AppConfig {
  return {
    models: {
      chat: envOverride(env.CHAT_MODEL, DEFAULT_MODELS.chat),
      fast: envOverride(env.FAST_MODEL, DEFAULT_MODELS.fast),
      embedding: envOverride(env.EMBEDDING_MODEL, DEFAULT_MODELS.embedding),
      embeddingDimensions: DEFAULT_MODELS.embeddingDimensions,
    },
    rag: { ...RAG_PRESETS.padrao },
    memory: {
      recentMessages: 10,
      summarizeAbove: 16,
    },
    limits: {
      maxInputChars: 1000,
      maxBodyBytes: 4096,
      rateLimitPerMinute: 10,
      rateLimitPerDay: 100,
    },
    sessionTtlDays: 7,
    accounts: {
      sessionMaxAgeDays: 30,
      demoTtlDays: 7,
      demoAccountsPerIpPerDay: 5,
      googleInactiveDays: 180,
    },
    llm: {
      retries: 3,
      baseDelayMs: 1000,
      timeoutMs: 25000,
      embedBatchSize: 50,
      embedBatchDelayMs: 60000,
    },
  }
}

export const config: AppConfig = loadConfig(process.env)

function invalid(detail: string): Error {
  return new Error(`Configuração de RAG inválida: ${detail}`)
}

function validateRag(rag: RagConfig): RagConfig {
  if (!Number.isInteger(rag.topK) || rag.topK < 1) {
    throw invalid(`topK precisa ser um inteiro maior ou igual a 1 (recebido: ${rag.topK}).`)
  }
  if (!(rag.minScore >= 0 && rag.minScore <= 1)) {
    throw invalid(`minScore precisa estar entre 0 e 1 (recebido: ${rag.minScore}).`)
  }
  if (!(rag.alpha >= 0 && rag.alpha <= 1)) {
    throw invalid(`alpha precisa estar entre 0 e 1 (recebido: ${rag.alpha}).`)
  }
  if (!Number.isInteger(rag.chunkSize) || rag.chunkSize < 100) {
    throw invalid(
      `chunkSize precisa ser um inteiro maior ou igual a 100 (recebido: ${rag.chunkSize}).`,
    )
  }
  if (!(rag.chunkOverlap >= 0 && rag.chunkOverlap < rag.chunkSize)) {
    throw invalid(
      `chunkOverlap precisa ser maior ou igual a 0 e menor que chunkSize (recebido: ` +
        `chunkOverlap ${rag.chunkOverlap}, chunkSize ${rag.chunkSize}).`,
    )
  }
  if (rag.chunkStrategy !== "markdown" && rag.chunkStrategy !== "fixed") {
    throw invalid(
      `chunkStrategy precisa ser "markdown" ou "fixed" (recebido: ${String(rag.chunkStrategy)}).`,
    )
  }
  return rag
}

// Devolve um novo AppConfig com o rag mesclado e validado. O original não muda.
export function withRag(base: AppConfig, overrides: Partial<RagConfig>): AppConfig {
  return { ...base, rag: validateRag({ ...base.rag, ...overrides }) }
}

// Identifica a forma de fatiar na coluna chunk_config, ex.: "markdown:1200:150".
export function chunkConfigKey(rag: RagConfig): string {
  return `${rag.chunkStrategy}:${rag.chunkSize}:${rag.chunkOverlap}`
}
