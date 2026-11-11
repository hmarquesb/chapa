import type { Metadata } from "next"
import Link from "next/link"
import { BrandShowcase } from "@/components/brand/brand-showcase"
import { RangoLogo } from "@/components/brand/rango-logo"
import { SiteFooter } from "@/components/brand/site-footer"
import { ThemeToggle } from "@/components/brand/theme-toggle"
import {
  AVOIDED,
  BRAND_PRINCIPLES,
  MOTION,
  RADII,
  SHADOWS,
  SWATCHES,
  TYPE_SCALE,
} from "@/lib/brand-guide"
import { contrastRatio } from "@/lib/contrast"
import { CONTRAST_PAIRS, PALETTE, type ThemeName } from "@/lib/palette"
import { cn } from "@/lib/utils"

// Public page: no account needed, so it can be linked from the README and the portfolio.
export const metadata: Metadata = {
  title: "Marca",
  description:
    "Guia da marca Rango e do Chapa: princípios, paleta, tipografia, componentes e logo.",
}

const THEMES: readonly { id: ThemeName; label: string }[] = [
  { id: "light", label: "Tema claro" },
  { id: "dark", label: "Tema escuro" },
]

const LOGOS = [
  { file: "rango-logo.svg", label: "Logo", background: PALETTE.light.background },
  { file: "rango-logo-dark.svg", label: "Logo, tema escuro", background: PALETTE.dark.background },
  { file: "rango-logo-mono.svg", label: "Logo, uma cor", background: PALETTE.light.card },
] as const

const FOCUS_RING = "rounded-md outline-none focus-visible:ring-3 focus-visible:ring-ring/50"

function Section({
  id,
  title,
  children,
}: {
  id: string
  title: string
  children: React.ReactNode
}) {
  return (
    <section aria-labelledby={id} className="flex flex-col gap-4">
      <h2 id={id} className="font-heading text-xl font-semibold tracking-tight">
        {title}
      </h2>
      {children}
    </section>
  )
}

function ratioMark(ratio: number, min: 4.5 | 3): string {
  const passes = ratio >= min
  const label = min === 4.5 ? "AA" : "3 : 1"
  return passes ? label : `abaixo de ${label}`
}

function PaletteCard({ theme, label }: { theme: ThemeName; label: string }) {
  const colors = PALETTE[theme]
  return (
    <div
      className="flex flex-col gap-3 rounded-2xl border p-4"
      style={{
        backgroundColor: colors.background,
        color: colors.foreground,
        borderColor: colors.border,
      }}
    >
      <h3 className="font-heading text-base font-semibold">{label}</h3>
      <ul className="flex flex-col gap-2">
        {SWATCHES.map((swatch) => (
          <li key={swatch.token} className="flex items-center gap-3 text-sm">
            <span
              aria-hidden="true"
              className="size-10 shrink-0 rounded-lg border"
              style={{ backgroundColor: colors[swatch.token], borderColor: colors.border }}
            />
            <span className="flex min-w-0 flex-col">
              <span className="font-medium">
                {swatch.name} <span className="font-normal">{colors[swatch.token]}</span>
              </span>
              <span className="text-xs" style={{ color: colors["muted-foreground"] }}>
                {swatch.usage}
              </span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function ImageFrame({
  src,
  alt,
  background,
  className,
  imgClassName,
}: {
  src: string
  alt: string
  background?: string
  className?: string
  imgClassName?: string
}) {
  return (
    <div
      className={cn("flex items-center justify-center rounded-2xl border p-6", className)}
      style={background === undefined ? undefined : { backgroundColor: background }}
    >
      {/* biome-ignore lint/performance/noImgElement: static SVG and PNG from the app itself, no optimization needed. */}
      <img src={src} alt={alt} className={imgClassName} />
    </div>
  )
}

export default function BrandPage() {
  return (
    <main className="mx-auto flex w-full max-w-[56rem] flex-1 flex-col gap-12 px-4 py-10">
      <header className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <Link href="/" className={cn("self-start", FOCUS_RING)}>
            <RangoLogo size="sm" />
          </Link>
          <ThemeToggle />
        </div>
        <h1 className="font-heading text-3xl font-extrabold tracking-tight">Marca</h1>
        <p className="max-w-[42rem] text-sm text-muted-foreground">
          A Rango é uma empresa de delivery fictícia, e o Chapa é o assistente dos restaurantes
          parceiros dela. Esta página reúne o que define a identidade visual: os componentes abaixo
          são os reais do app, e as cores vêm dos mesmos tokens do tema. Projeto de estudo, sem
          afiliação com nenhuma empresa real.
        </p>
      </header>

      <Section id="principios" title="Princípios">
        <ul className="grid gap-3 sm:grid-cols-2">
          {BRAND_PRINCIPLES.map((principle) => (
            <li key={principle.name} className="rounded-2xl border bg-card p-4 shadow-soft">
              <h3 className="font-heading text-base font-semibold">{principle.name}</h3>
              <p className="mt-1 text-sm">{principle.summary}</p>
              <p className="mt-2 text-sm text-muted-foreground">
                <span className="font-medium text-foreground">Na prática: </span>
                {principle.inPractice}
              </p>
            </li>
          ))}
        </ul>
      </Section>

      <Section id="paleta" title="Paleta">
        <p className="text-sm text-muted-foreground">
          Os dois temas aparecem lado a lado, qualquer que seja o tema atual. A canela nunca é texto
          no claro: para texto em canela, use a canela escura.
        </p>
        <div className="grid gap-4 md:grid-cols-2">
          {THEMES.map((theme) => (
            <PaletteCard key={theme.id} theme={theme.id} label={theme.label} />
          ))}
        </div>
        <h3 className="font-heading text-base font-semibold">Contraste</h3>
        <div className="overflow-x-auto rounded-2xl border">
          <table className="w-full min-w-[34rem] text-left text-sm">
            <caption className="sr-only">
              Razão de contraste de cada par de cores, nos dois temas
            </caption>
            <thead>
              <tr className="border-b">
                <th scope="col" className="px-3 py-2 font-medium">
                  Texto sobre fundo
                </th>
                <th scope="col" className="px-3 py-2 font-medium">
                  Claro
                </th>
                <th scope="col" className="px-3 py-2 font-medium">
                  Escuro
                </th>
              </tr>
            </thead>
            <tbody>
              {CONTRAST_PAIRS.map((pair) => (
                <tr
                  key={`${pair.foreground}-${pair.background}`}
                  className="border-b last:border-b-0"
                >
                  <th scope="row" className="px-3 py-2 font-normal">
                    <code>{pair.foreground}</code> sobre <code>{pair.background}</code>
                  </th>
                  {THEMES.map((theme) => {
                    const colors = PALETTE[theme.id]
                    const ratio = contrastRatio(colors[pair.foreground], colors[pair.background])
                    return (
                      <td key={theme.id} className="px-3 py-2">
                        {ratio.toFixed(1)} : 1 · {ratioMark(ratio, pair.min)}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section id="tipografia" title="Tipografia">
        <p className="text-sm text-muted-foreground">
          Bricolage Grotesque (800 e 600) nos títulos e no logo; Figtree (400, 500 e 600) no resto.
        </p>
        <ul className="flex flex-col divide-y rounded-2xl border bg-card px-4">
          {TYPE_SCALE.map((sample) => (
            <li key={sample.label} className="flex flex-col gap-1 py-3">
              <span className="text-xs text-muted-foreground">
                {sample.label} · <code>{sample.className}</code>
              </span>
              <span className={sample.className}>{sample.sample}</span>
            </li>
          ))}
        </ul>
      </Section>

      <Section id="forma" title="Forma, sombra e movimento">
        <div className="grid gap-3 sm:grid-cols-2">
          {RADII.map((radius) => (
            <div key={radius.label} className="flex items-center gap-3">
              <span
                aria-hidden="true"
                className={cn("h-12 w-20 shrink-0 bg-primary", radius.className)}
              />
              <span className="text-sm">
                {radius.label}
                <span className="block text-xs text-muted-foreground">{radius.note}</span>
              </span>
            </div>
          ))}
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {SHADOWS.map((shadow) => (
            <div
              key={shadow.label}
              className={cn("rounded-2xl bg-card p-4 text-sm", shadow.className)}
            >
              {shadow.label}
              <span className="block text-xs text-muted-foreground">{shadow.note}</span>
            </div>
          ))}
        </div>
        <ul className="list-disc space-y-1 pl-5 text-sm">
          {MOTION.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </Section>

      <Section id="componentes" title="Componentes">
        <p className="text-sm text-muted-foreground">
          Os componentes reais do app, com dados fixos. O campo de mensagem não envia nada.
        </p>
        <BrandShowcase />
      </Section>

      <Section id="logo" title="Logo">
        <p className="text-sm text-muted-foreground">
          O logo nunca é redesenhado: use os arquivos, que são contornos sem texto. O ponto é sempre
          canela.
        </p>
        <div className="flex items-center gap-4 rounded-2xl border bg-card p-6">
          <RangoLogo size="lg" />
          <span className="text-sm text-muted-foreground">O componente do app, em texto.</span>
        </div>
        <ul className="grid gap-3 sm:grid-cols-3">
          {LOGOS.map((logo) => (
            <li key={logo.file} className="flex flex-col gap-2">
              <ImageFrame
                src={`/brand/${logo.file}`}
                alt={`${logo.label} da Rango`}
                background={logo.background}
                imgClassName="h-10 w-auto max-w-full"
              />
              <a
                href={`/brand/${logo.file}`}
                download
                className={cn("text-sm underline underline-offset-4", FOCUS_RING)}
              >
                Baixar {logo.file}
              </a>
            </li>
          ))}
        </ul>
      </Section>

      <Section id="avatar" title="Avatar do Chapa">
        <div className="flex items-center gap-4">
          <ImageFrame
            src="/brand/chapa-avatar.svg"
            alt="Avatar do Chapa: uma espátula branca-creme sobre um círculo canela"
            className="p-3"
            imgClassName="size-20"
          />
          <a
            href="/brand/chapa-avatar.svg"
            download
            className={cn("text-sm underline underline-offset-4", FOCUS_RING)}
          >
            Baixar chapa-avatar.svg
          </a>
        </div>
      </Section>

      <Section id="compartilhamento" title="Favicon e imagem de compartilhamento">
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-4">
            <ImageFrame
              src="/icon.svg"
              alt="Favicon: a letra r e o ponto canela sobre fundo linho"
              className="p-3"
              imgClassName="size-16"
            />
            <p className="text-sm text-muted-foreground">
              O favicon é o “r.” do logo, gerado pelo <code>brand:export</code>.
            </p>
          </div>
          <ImageFrame
            src="/opengraph-image"
            alt="Imagem de compartilhamento: o logo rango., o avatar do Chapa e a frase “Chapa, o assistente de parceiros da Rango”"
            className="p-2"
            imgClassName="h-auto w-full max-w-[36rem] rounded-lg"
          />
        </div>
      </Section>

      <Section id="evitamos" title="O que evitamos">
        <ul className="list-disc space-y-1 pl-5 text-sm">
          {AVOIDED.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </Section>

      <p className="text-sm">
        <Link href="/" className="underline underline-offset-4">
          Voltar ao chat
        </Link>
      </p>
      <SiteFooter />
    </main>
  )
}
