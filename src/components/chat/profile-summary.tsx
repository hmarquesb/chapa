import Link from "next/link"
import { profileSummary } from "@/lib/plans"
import type { RestaurantProfile } from "@/lib/types"

export function ProfileSummary({ profile }: { profile: RestaurantProfile }) {
  return (
    <p className="flex flex-wrap items-center gap-x-3 text-sm">
      <span translate="no" className="font-heading font-semibold">
        {profileSummary(profile)}
      </span>
      <Link href="/perfil" className="text-muted-foreground underline underline-offset-4">
        Editar perfil
      </Link>
    </p>
  )
}
