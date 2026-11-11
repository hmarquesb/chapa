import type { Metadata } from "next"
import Link from "next/link"
import { config } from "@/config"
import { PRIVACY_NOTICE } from "@/lib/sign-in"

export const metadata: Metadata = { title: "Privacidade · Chapa" }

const STORED = [
  "O identificador e o e-mail da conta Google (a conta demo não tem e-mail).",
  "O perfil do restaurante: plano, e o nome, a cozinha, a cidade e o horário, se você preencher.",
  "As conversas: as suas perguntas, as respostas e os nomes dos arquivos citados.",
]

const NOT_STORED = [
  "O nome e a foto da sua conta Google.",
  "CNPJ, CPF, endereço, telefone, dados bancários e faturamento.",
  "O seu IP em claro: só uma versão codificada, usada para limitar abusos.",
]

export default function PrivacyPage() {
  const { accounts, conversations } = config
  const retention = [
    {
      what: "Conta demo e as conversas dela",
      when: `somem em ${accounts.demoTtlDays} dias`,
    },
    {
      what: "Conversa de uma conta Google",
      when: `some em ${conversations.webTtlDays} dias sem mensagem nova`,
    },
    {
      what: "Conta Google",
      when: `some em ${accounts.googleInactiveDays} dias sem acesso`,
    },
    {
      what: "Qualquer conta",
      when: "some na hora, por “Excluir minha conta”",
    },
    {
      what: "Conversas feitas pelo terminal",
      when: `somem em ${config.sessionTtlDays} dias`,
    },
  ]

  return (
    <main className="mx-auto flex w-full max-w-[45rem] flex-1 flex-col gap-8 px-4 py-10">
      <header className="flex flex-col gap-2">
        <h1 className="font-heading text-2xl font-semibold tracking-tight">Privacidade</h1>
        <p className="text-sm">{PRIVACY_NOTICE}</p>
      </header>
      <section aria-labelledby="guardamos" className="flex flex-col gap-2">
        <h2 id="guardamos" className="text-lg font-semibold">
          O que guardamos
        </h2>
        <ul className="list-disc space-y-1 pl-5 text-sm">
          {STORED.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>
      <section aria-labelledby="nao-guardamos" className="flex flex-col gap-2">
        <h2 id="nao-guardamos" className="text-lg font-semibold">
          O que não guardamos
        </h2>
        <ul className="list-disc space-y-1 pl-5 text-sm">
          {NOT_STORED.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>
      <section aria-labelledby="retencao" className="flex flex-col gap-2">
        <h2 id="retencao" className="text-lg font-semibold">
          Por quanto tempo guardamos
        </h2>
        <table className="w-full text-left text-sm">
          <caption className="sr-only">Prazos de retenção dos dados</caption>
          <thead>
            <tr className="border-b">
              <th scope="col" className="py-2 pr-4 font-medium">
                Dado
              </th>
              <th scope="col" className="py-2 font-medium">
                Prazo
              </th>
            </tr>
          </thead>
          <tbody>
            {retention.map((row) => (
              <tr key={row.what} className="border-b">
                <td className="py-2 pr-4">{row.what}</td>
                <td className="py-2">{row.when}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      <section aria-labelledby="excluir" className="flex flex-col gap-2">
        <h2 id="excluir" className="text-lg font-semibold">
          Como excluir a conta
        </h2>
        <p className="text-sm">
          No chat, abra o menu da conta e escolha “Excluir minha conta”. A conta, o perfil e todas
          as conversas são apagados na hora e não podem ser recuperados.
        </p>
      </section>
      <p className="text-sm">
        <Link href="/" className="underline underline-offset-4">
          Voltar ao chat
        </Link>
      </p>
    </main>
  )
}
