"use client"

import { ChevronDownIcon, InfoIcon, LogOutIcon, Trash2Icon, UserPenIcon } from "lucide-react"
import Link from "next/link"
import { useRef, useState } from "react"
import { ThemeMenuGroup } from "@/components/brand/theme-toggle"
import { DeleteAccountDialog } from "@/components/chat/delete-account-dialog"
import { WelcomeDialog } from "@/components/chat/welcome-dialog"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { markWelcomeSeen } from "@/lib/api-client"

type AccountMenuProps = {
  label: string
  signOutAction: () => Promise<void>
  welcome: { openOnLoad: boolean; persist: boolean }
}

export function AccountMenu({ label, signOutAction, welcome }: AccountMenuProps) {
  // The form lives outside the menu: the menu content unmounts when an item is selected, which
  // would cancel a submit started from inside it.
  const formRef = useRef<HTMLFormElement>(null)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [welcomeOpen, setWelcomeOpen] = useState(welcome.openOnLoad)
  const welcomeRecorded = useRef(false)

  function changeWelcomeOpen(next: boolean): void {
    setWelcomeOpen(next)
    if (next || !welcome.persist || welcomeRecorded.current) return
    welcomeRecorded.current = true
    // Fire and forget: a failure only means the card opens again on the next load.
    void markWelcomeSeen()
  }

  return (
    <>
      <form ref={formRef} action={signOutAction} hidden />
      <DeleteAccountDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        signOutAction={signOutAction}
      />
      <WelcomeDialog open={welcomeOpen} onOpenChange={changeWelcomeOpen} />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="rounded-full"
            aria-label={`Menu da conta: ${label}`}
          >
            <span translate="no" className="max-w-[16ch] truncate sm:max-w-[28ch]">
              {label}
            </span>
            <ChevronDownIcon aria-hidden="true" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-48 rounded-2xl shadow-raised">
          <DropdownMenuLabel className="truncate font-normal text-muted-foreground">
            {label}
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => setWelcomeOpen(true)}>
            <InfoIcon aria-hidden="true" />
            Sobre o Chapa
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/perfil">
              <UserPenIcon aria-hidden="true" />
              Editar perfil
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => formRef.current?.requestSubmit()}>
            <LogOutIcon aria-hidden="true" />
            Sair
          </DropdownMenuItem>
          <DropdownMenuItem variant="destructive" onSelect={() => setDeleteOpen(true)}>
            <Trash2Icon aria-hidden="true" />
            Excluir minha conta
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <ThemeMenuGroup />
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  )
}
