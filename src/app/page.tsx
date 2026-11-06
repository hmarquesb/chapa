import { ChatApp } from "@/components/chat/chat-app"

export default function Home() {
  return (
    <div className="mx-auto flex w-full max-w-[720px] flex-1 flex-col gap-6 px-4 py-6 sm:py-10">
      <header className="flex flex-col gap-1">
        <h1 className="font-heading text-2xl font-semibold tracking-tight">Chapa</h1>
        <p className="text-sm text-muted-foreground">
          Tire dúvidas sobre taxas, repasse, cancelamentos, cardápio e avaliações.
        </p>
      </header>
      <main className="flex flex-1 flex-col">
        <ChatApp />
      </main>
      <footer className="border-t pt-4 text-xs text-muted-foreground">
        Projeto de estudo, não oficial e sem afiliação com nenhuma empresa de delivery. As conversas
        são apagadas depois de 7 dias sem uso. Não envie dados pessoais.
      </footer>
    </div>
  )
}
