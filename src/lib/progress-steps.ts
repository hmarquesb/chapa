import type { ProgressEvent } from "@/lib/types"

// Texto de cada etapa do turno, como aparece no indicador enquanto a resposta não chega.
export function progressLabel(event: ProgressEvent): string {
  switch (event.step) {
    case "history":
      return "Lendo a conversa"
    case "understanding":
      return "Entendendo a pergunta"
    case "searching":
      return "Buscando na base de conhecimento"
    case "writing":
      return `Escrevendo a resposta com base em ${event.documents} ${
        event.documents === 1 ? "documento" : "documentos"
      }`
  }
}
