"use client"

import { ChevronDownIcon, LogOutIcon } from "lucide-react"
import { useRef } from "react"
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

  return (
    <>
      <form ref={formRef} action={signOutAction} hidden />
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
          <DropdownMenuItem onSelect={() => formRef.current?.requestSubmit()}>
            <LogOutIcon aria-hidden="true" />
            Sair
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  )
}
