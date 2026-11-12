import Image from "next/image"
import { cn } from "@/lib/utils"

// Decorative illustration of the sign-in screen: no text, no information.
export function LoginArt({ className }: { className?: string }) {
  return (
    <div className={cn("relative overflow-hidden", className)}>
      <Image
        src="/art/login-art.jpg"
        alt=""
        fill
        priority
        sizes="(min-width: 1024px) 50vw, 100vw"
        className="object-cover object-[50%_20%] lg:object-center"
      />
    </div>
  )
}
