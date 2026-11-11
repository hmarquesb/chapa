import type { SVGProps } from "react"
import { CHAPA_ICON } from "@/lib/chapa-icon"
import { cn } from "@/lib/utils"

export function ChapaIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox={CHAPA_ICON.viewBox}
      fill="none"
      stroke="currentColor"
      strokeWidth={CHAPA_ICON.strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <g transform={CHAPA_ICON.transform}>
        {CHAPA_ICON.paths.map((d) => (
          <path key={d} d={d} />
        ))}
      </g>
    </svg>
  )
}

type ChapaAvatarProps = { size?: "sm" | "md"; decorative?: boolean; className?: string }

export function ChapaAvatar({ size = "sm", decorative = false, className }: ChapaAvatarProps) {
  const a11y = decorative ? { "aria-hidden": true } : { role: "img", "aria-label": "Chapa" }
  return (
    <span
      {...a11y}
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full bg-cinnamon text-cinnamon-foreground",
        size === "sm" ? "size-7" : "size-9",
        className,
      )}
    >
      <ChapaIcon className={size === "sm" ? "size-4" : "size-5"} />
    </span>
  )
}
