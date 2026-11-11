"use client"

import { ChevronDownIcon, LogOutIcon, Trash2Icon, UserPenIcon } from "lucide-react"
import Link from "next/link"
import { useRef, useState } from "react"
import { DeleteAccountDialog } from "@/components/chat/delete-account-dialog"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

type AccountMenuProps = { label: string; signOutAction: () => Promise<void> }

export function AccountMenu({ label, signOutAction }: AccountMenuProps) {
  // The form lives outside the menu: the menu content unmounts when an item is selected, which
  // would cancel a submit started from inside it.
  const formRef = useRef<HTMLFormElement>(null)
  const [deleteOpen, setDeleteOpen] = useState(false)

  return (
    <>
      <form ref={formRef} action={signOutAction} hidden />
      <DeleteAccountDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        signOutAction={signOutAction}
      />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" aria-label={`Menu da conta: ${label}`}>
            <span translate="no" className="max-w-[16ch] truncate sm:max-w-[28ch]">
              {label}
            </span>
            <ChevronDownIcon aria-hidden="true" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-48">
          <DropdownMenuLabel className="truncate font-normal text-muted-foreground">
            {label}
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
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
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  )
}
