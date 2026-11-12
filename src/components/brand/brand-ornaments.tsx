import { cn } from "@/lib/utils"

// Decorative illustration: flat shapes in the art-* tones. Drawing only, never text, border or
// focus (the tests forbid text-art-*). Colors come from classes, so the dark theme swaps them.

export type OrnamentCluster = "top-right" | "bottom-left" | "bottom-right"

function TopRight({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 220 260" className={className} aria-hidden="true" focusable="false">
      {/* steam */}
      <path
        d="M52 6c-14 18 14 28-2 46s-6 24 2 30c-12-12-8-22 4-34S40 26 52 6z"
        className="fill-art-cream"
      />
      <path
        d="M76 2c-10 12 8 22-2 34s-2 18 6 22c-8-8-4-16 4-26S70 16 76 2z"
        className="fill-art-cream"
      />
      {/* leaves and seeds */}
      <path d="M118 96c10-16 34-22 44-14-4 22-22 36-38 30z" className="fill-art-plum" />
      <path d="M96 82c-8-6-8-16 0-20 8 4 12 14 8 22z" className="fill-art-clay" />
      <path d="M170 38c14 6 18 20 10 30-10-4-14-14-10-30z" className="fill-art-mustard" />
      <ellipse
        cx="146"
        cy="64"
        rx="14"
        ry="6"
        transform="rotate(-8 146 64)"
        className="fill-art-cream"
      />
      <ellipse
        cx="98"
        cy="104"
        rx="9"
        ry="12"
        transform="rotate(30 98 104)"
        className="fill-art-clay"
      />
      <ellipse cx="148" cy="96" rx="7" ry="9" className="fill-art-plum" />
      <path
        d="M184 58c24-26 30-52 32-46 6 12 0 44-16 66-10 14-30 24-40 16 6-14 16-24 24-36z"
        className="fill-art-plum"
      />
      <path
        d="M196 40c-10 22-22 32-34 52"
        className="fill-none stroke-art-clay"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path d="M200 142c18 2 20 14 10 20-12 0-16-10-10-20z" className="fill-art-tangerine" />
      <circle cx="214" cy="190" r="5" className="fill-art-tangerine" />
      <path
        d="M206 214c-14-6-16 18 0 30 4 4 12 4 12 4-6-12-4-24-12-34z"
        className="fill-art-clay"
      />
    </svg>
  )
}

function BottomLeft({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 300 300" className={className} aria-hidden="true" focusable="false">
      {/* big shapes */}
      <path d="M0 40c40-6 70 20 70 52 0 24-16 34-34 40L0 132z" className="fill-art-mustard" />
      <path d="M0 150c24 6 38 30 30 60L0 240z" className="fill-art-plum" />
      <path d="M0 108c26-4 28 28 8 36-6 2-8-2-8-4z" className="fill-art-tangerine" />
      <path d="M30 28a38 38 0 0 1 76 0z" className="fill-art-cream" />
      <circle cx="108" cy="228" r="56" className="fill-art-cream" />
      <path
        d="M130 196c30-24 62-14 66 6-14 8-26 22-30 40-22-6-44-20-36-46z"
        className="fill-art-mustard"
      />
      <path
        d="M28 292C0 230 20 168 74 148c30-10 60-4 76 10"
        className="fill-none stroke-art-clay"
        strokeWidth="10"
        strokeLinecap="round"
      />
      <path d="M0 232c10 40 40 60 70 62L30 300H0z" className="fill-art-clay" />
      {/* leaves */}
      <path d="M108 292c-14-44-4-84 22-112 14 30 12 76-22 112z" className="fill-art-clay" />
      <path d="M118 296c20-30 52-44 72-40-4 24-30 44-72 40z" className="fill-art-tangerine" />
      {/* seeds */}
      <ellipse
        cx="118"
        cy="128"
        rx="5"
        ry="10"
        transform="rotate(-8 118 128)"
        className="fill-art-plum"
      />
      <ellipse
        cx="130"
        cy="152"
        rx="5"
        ry="9"
        transform="rotate(-20 130 152)"
        className="fill-art-plum"
      />
      <ellipse
        cx="144"
        cy="170"
        rx="5"
        ry="9"
        transform="rotate(-40 144 170)"
        className="fill-art-plum"
      />
      <ellipse
        cx="122"
        cy="176"
        rx="4"
        ry="8"
        transform="rotate(-60 122 176)"
        className="fill-art-plum"
      />
      <ellipse
        cx="150"
        cy="192"
        rx="4"
        ry="8"
        transform="rotate(-50 150 192)"
        className="fill-art-plum"
      />
      {/* spiral and scraps */}
      <path
        d="M232 296c-20-4-30-24-16-34 14-8 30 2 28 16-2 12-16 14-22 6-4-8 4-14 10-10"
        className="fill-none stroke-art-plum"
        strokeWidth="6"
        strokeLinecap="round"
      />
      <circle cx="178" cy="276" r="9" className="fill-art-clay" />
      <path d="M262 288c14-4 24 2 24 12-12 2-22-2-24-12z" className="fill-art-cream" />
      <circle cx="94" cy="104" r="3" className="fill-art-tangerine" />
    </svg>
  )
}

function BottomRight({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 300 340" className={className} aria-hidden="true" focusable="false">
      {/* big shapes */}
      <path
        d="M300 150c-34-10-66 12-64 44-30-6-60 18-62 52-14 34 6 70 44 94h82z"
        className="fill-art-clay"
      />
      <path d="M300 50c-30 34-42 68-30 104 10-30 34-52 30-104z" className="fill-art-cream" />
      <path d="M300 78c-40 8-72 44-54 90-14-30 8-60 54-72z" className="fill-art-plum" />
      <path d="M258 120c14-34 30-60 42-68v90c-14-6-30-14-42-22z" className="fill-art-mustard" />
      <path d="M122 340c-6-28 12-46 44-52 40-6 78-16 94-34v86z" className="fill-art-mustard" />
      {/* bowl */}
      <path
        d="M142 262c10 30 60 34 98 8-2-20-22-32-48-28-26 0-44 8-50 20z"
        className="fill-art-plum"
      />
      {/* sprig */}
      <path d="M170 238c-6-40-4-76 8-112 10 36 8 76-8 112z" className="fill-art-clay" />
      <path d="M170 220c-24-8-40-26-46-52 24 6 42 24 46 52z" className="fill-art-clay" />
      <path d="M176 196c20-6 36-22 40-44-22 6-36 22-40 44z" className="fill-art-plum" />
      <path d="M174 160c-12-14-14-34-6-50 12 14 14 34 6 50z" className="fill-art-tangerine" />
      {/* seeds and dots */}
      <circle cx="118" cy="204" r="16" className="fill-art-mustard" />
      <circle cx="136" cy="238" r="5" className="fill-art-clay" />
      <circle cx="96" cy="326" r="6" className="fill-art-plum" />
      <path d="M52 306c20-14 36-14 46-4-8 16-30 22-46 4z" className="fill-art-tangerine" />
      <circle cx="70" cy="284" r="3" className="fill-art-plum" />
      <circle cx="82" cy="276" r="3" className="fill-art-plum" />
      <circle cx="62" cy="270" r="2.5" className="fill-art-plum" />
      <circle cx="268" cy="316" r="30" className="fill-art-plum" />
      <circle cx="268" cy="316" r="14" className="fill-art-mustard" />
      <circle cx="268" cy="316" r="5" className="fill-art-plum" />
      <ellipse
        cx="156"
        cy="150"
        rx="8"
        ry="5"
        transform="rotate(-30 156 150)"
        className="fill-art-clay"
      />
    </svg>
  )
}

const CLUSTERS: Record<OrnamentCluster, (props: { className?: string }) => React.JSX.Element> = {
  "top-right": TopRight,
  "bottom-left": BottomLeft,
  "bottom-right": BottomRight,
}

export function OrnamentClusterArt({
  cluster,
  className,
}: {
  cluster: OrnamentCluster
  className?: string
}) {
  const Cluster = CLUSTERS[cluster]
  return <Cluster className={cn("h-auto", className)} />
}

export function BrandOrnaments() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-10 hidden overflow-hidden opacity-[var(--art-opacity)] xl:block"
    >
      <OrnamentClusterArt
        cluster="top-right"
        className="absolute top-0 right-0 w-[min(calc(50vw-31.25rem),12rem)]"
      />
      <OrnamentClusterArt
        cluster="bottom-left"
        className="absolute bottom-0 left-0 w-[min(calc(50vw-31.25rem),20rem)]"
      />
      <OrnamentClusterArt
        cluster="bottom-right"
        className="absolute right-0 bottom-0 w-[min(calc(50vw-31.25rem),20rem)]"
      />
    </div>
  )
}
