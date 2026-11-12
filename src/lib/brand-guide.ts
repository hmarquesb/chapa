// Content of the /marca page (data only, no logic). Colors are never written here: the page reads
// them from PALETTE by token, so a tone changes in globals.css and palette.ts only.
import type { ColorToken } from "@/lib/palette"

export type BrandPrinciple = { name: string; summary: string; inPractice: string }

export const BRAND_PRINCIPLES: readonly BrandPrinciple[] = [
  {
    name: "Caseira",
    summary: "Tom de cozinha de bairro, não de central de atendimento.",
    inPractice: "Linho e ameixa no lugar de branco e preto puros; texto direto, sem jargão.",
  },
  {
    name: "Arredondada",
    summary: "Cantos generosos, como a borda de um prato.",
    inPractice: "Raios grandes em cartões, botões e balões; nada de quina viva.",
  },
  {
    name: "Clara",
    summary: "Cada tela diz uma coisa e deixa claro o próximo passo.",
    inPractice: "Contraste AA em todo texto, hierarquia de títulos e foco sempre visível.",
  },
  {
    name: "Original",
    summary: "Nada herdado de outra marca de delivery.",
    inPractice:
      "Vinho e canela, Bricolage Grotesque, uma espátula e uma ilustração própria de formas chapadas: nenhum símbolo ou mascote emprestado.",
  },
]

export type Swatch = { token: ColorToken; name: string; usage: string }

export const SWATCHES: readonly Swatch[] = [
  { token: "background", name: "Linho", usage: "Fundo das telas" },
  { token: "card", name: "Creme", usage: "Cartões, balões e campos" },
  { token: "foreground", name: "Ameixa", usage: "Texto principal" },
  { token: "muted-foreground", name: "Ameixa suave", usage: "Texto de apoio e avisos" },
  { token: "primary", name: "Vinho", usage: "Ação principal, links e o logo" },
  {
    token: "cinnamon",
    name: "Canela",
    usage: "O ponto do logo e o avatar do Chapa; nunca texto no claro",
  },
  { token: "accent", name: "Canela clara", usage: "Realces suaves e item selecionado" },
  { token: "cinnamon-text", name: "Canela escura", usage: "Texto em canela, quando precisa ler" },
  { token: "destructive", name: "Tijolo", usage: "Erro e ações que apagam" },
  { token: "border", name: "Borda", usage: "Divisões e contornos" },
]

export type TypeSample = { label: string; className: string; sample: string }

export const TYPE_SCALE: readonly TypeSample[] = [
  {
    label: "Título da página",
    className: "font-heading text-3xl font-extrabold",
    sample: "Taxas e repasse sem mistério",
  },
  {
    label: "Título de seção",
    className: "font-heading text-xl font-semibold",
    sample: "Quando o repasse cai na conta",
  },
  {
    label: "Corpo",
    className: "text-base",
    sample: "O repasse acontece em ciclos semanais, conforme o plano do restaurante.",
  },
  { label: "Apoio", className: "text-sm", sample: "Fonte: 03-repasse.md" },
  { label: "Legenda", className: "text-xs", sample: "Projeto de estudo · empresa fictícia" },
]

export type TokenSample = { label: string; className: string; note: string }

export const RADII: readonly TokenSample[] = [
  { label: "Campos e botões", className: "rounded-lg", note: "Raio base, 1 rem" },
  { label: "Cartões", className: "rounded-2xl", note: "1,8 vez o raio base" },
  {
    label: "Balões do chat",
    className: "rounded-3xl rounded-tl-md",
    note: "2,2 vezes, com um canto menor",
  },
  { label: "Avatar", className: "rounded-full", note: "Totalmente redondo" },
]

export const SHADOWS: readonly TokenSample[] = [
  { label: "Suave", className: "shadow-soft", note: "Cartões e campos, em repouso" },
  { label: "Elevada", className: "shadow-raised", note: "Menus, diálogos e campo em foco" },
]

export const MOTION: readonly string[] = [
  "Transições de 200 ms, só em cor, sombra e opacidade; a mensagem nova entra com um fade curto.",
  'O indicador de "pensando" são três pontos em canela que pulsam a cada 1,2 s.',
  'Quem pede menos movimento recebe o estado parado, com o texto "Chapa está pensando…".',
]

export const AVOIDED: readonly string[] = [
  "Vermelho, laranja vivo, amarelo ou verde-vivo como cor principal.",
  "Símbolo ou mascote.",
  "Nome, ícone ou ilustração de empresa real.",
  "Ícones de entrega, como moto ou sacola.",
]

export const ART_SWATCHES: readonly Swatch[] = [
  { token: "art-plum", name: "Ameixa-funda", usage: "Formas grandes e o fundo da arte." },
  { token: "art-clay", name: "Terracota", usage: "Folhas, tigelas e meias-luas." },
  { token: "art-tangerine", name: "Tangerina", usage: "Destaques quentes e sementes." },
  { token: "art-mustard", name: "Mostarda", usage: "Ramos, espirais e pontos de luz." },
  { token: "art-cream", name: "Creme", usage: "Vapor e contornos claros." },
]

export const ART_RULE = "Só desenho: nunca texto, borda, foco ou botão."
