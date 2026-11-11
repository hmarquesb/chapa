import { cn } from "@/lib/utils"

const SIZES = { sm: "text-2xl", md: "text-4xl", lg: "text-5xl" } as const

type RangoLogoProps = { size?: keyof typeof SIZES; className?: string }

// The dot is decorative: the accessible name is "Rango".
export function RangoLogo({ size = "sm", className }: RangoLogoProps) {
  return (
    <span
      role="img"
      aria-label="Rango"
      translate="no"
      className={cn(
        "inline-block font-heading font-extrabold tracking-tight text-primary",
        SIZES[size],
        className,
      )}
    >
      rango<span className="text-cinnamon">.</span>
    </span>
  )
}
