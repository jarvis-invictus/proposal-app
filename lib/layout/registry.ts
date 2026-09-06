import { z } from 'zod'

/**
 * Free-form layout primitives — a generic, semantically-neutral vocabulary the AI composes
 * freely (order, nesting, count, which primitives), the way a developer writes JSX, rather than
 * picking from a fixed catalogue of business-meaning section types. Every primitive renders as a
 * real, already-styled React component (see components/layout/primitives.tsx) — the model only
 * ever chooses a `type` and its typed fields, never markup.
 *
 * Fixed 3-tier tree (Section -> Card/Columns -> Leaf), no self-reference. True unbounded
 * recursion (z.lazy()) inflates the generateObject JSON schema, and .deepPartial() does not
 * deep-partialify a z.discriminatedUnion anyway — the revise flow needs this tree to bottom out
 * predictably regardless, so depth is fixed rather than modeled as recursive.
 */

const Heading = z.object({
  type: z.literal('heading'),
  text: z.string(),
  level: z.enum(['1', '2', '3']).default('2'),
})

const Paragraph = z.object({
  type: z.literal('paragraph'),
  text: z.string(),
})

const ListPrimitive = z.object({
  type: z.literal('list'),
  items: z.array(z.string()).min(2).max(8),
  style: z.enum(['bullet', 'check', 'numbered']).default('check'),
})

const Divider = z.object({ type: z.literal('divider') })

const Spacer = z.object({
  type: z.literal('spacer'),
  size: z.enum(['sm', 'md', 'lg']).default('md'),
})

const Quote = z.object({
  type: z.literal('quote'),
  quote: z.string(),
  attribution: z.string(),
})

const StatRow = z.object({
  type: z.literal('statRow'),
  stats: z.array(
    z.object({ value: z.string(), label: z.string(), caption: z.string().optional() })
  ).min(2).max(4),
})

const Table = z.object({
  type: z.literal('table'),
  headers: z.array(z.string()).min(1).max(6),
  rows: z.array(z.array(z.string())).min(1).max(12),
})

// Deliberately not a free href — the model never invents a destination URL. v1 supports exactly
// the one action the product already has (open the accept-and-sign flow).
const ButtonLink = z.object({
  type: z.literal('buttonLink'),
  label: z.string(),
  action: z.literal('accept-proposal'),
})

// Never an arbitrary URL the model invents. 'logo' resolves brand_kits.logo_url server-side at
// render time; 'attachment' references an index into content.attachments, which the user
// actually uploaded.
const ImageBlock = z.object({
  type: z.literal('image'),
  source: z.discriminatedUnion('kind', [
    z.object({ kind: z.literal('logo') }),
    z.object({ kind: z.literal('attachment'), attachmentIndex: z.number().int().min(0) }),
  ]),
  caption: z.string().optional(),
})

// DataRef primitives — render structured content.* fields verbatim by reference, so free-form
// layout never has to hand-type a price, date, or contract term. Four concrete leaf types (not
// one generic wrapper) keep the discriminated union exhaustive and each renderer trivial.
const PricingTable = z.object({
  type: z.literal('pricingTable'),
  heading: z.string(),
  intro: z.string().optional(),
  packageRefs: z.array(z.number().int()), // indexes into content.packages
  emphasis: z.enum(['cards', 'table']),
})

const TimelineList = z.object({
  type: z.literal('timelineList'),
  heading: z.string(),
  intro: z.string().optional(),
  usesStructuredTimeline: z.literal(true), // always renders content.timeline in full, in order
})

const PaymentInfo = z.object({
  type: z.literal('paymentInfo'),
  heading: z.string().optional(), // renders content.paymentSection + UPI/link/QR verbatim
})

const TermsList = z.object({
  type: z.literal('termsList'),
  heading: z.string().optional(), // renders content.terms verbatim, never restated as prose
})

const Leaf = z.discriminatedUnion('type', [
  Heading, Paragraph, ListPrimitive, Divider, Spacer, Quote, StatRow, Table, ButtonLink, ImageBlock,
  PricingTable, TimelineList, PaymentInfo, TermsList,
])

// Tier 2 — a Card can hold leaves (a bordered box of heading+paragraph+list, etc).
const Card = z.object({
  type: z.literal('card'),
  tone: z.enum(['plain', 'sunken']).default('plain'),
  children: z.array(Leaf).min(1).max(6),
})

const ColumnChild = z.discriminatedUnion('type', [...Leaf.options, Card])

// Columns hold an explicit array of column contents — the model picks which primitives go in
// which column, not just a count.
const Columns = z.object({
  type: z.literal('columns'),
  columns: z.array(z.array(ColumnChild).min(1).max(4)).min(2).max(3),
})

// Tier 1 — Section is the only top-level wrapper. Sections stack vertically down the page.
const SectionChild = z.discriminatedUnion('type', [...Leaf.options, Card, Columns])

const Section = z.object({
  type: z.literal('section'),
  tone: z.enum(['plain', 'sunken']).default('plain'),
  children: z.array(SectionChild).min(1).max(8),
})

export const LayoutSchema = z.object({ layout: z.array(Section).min(2).max(8) })

export type LayoutSection = z.infer<typeof Section>
export type LayoutPrimitive = z.infer<typeof SectionChild>
export type LayoutType = LayoutPrimitive['type']

// One-line description of every primitive, for the prompt builder's catalogue — mirrors the
// rejected block-catalogue prototype's pattern, just for a presentational vocabulary instead of
// a business-semantic one.
export const PRIMITIVE_CATALOGUE: Record<LayoutType, string> = {
  heading: 'A heading at level 1-3. Use level 1 sparingly — usually one per document.',
  paragraph: 'A block of prose text.',
  list: 'A short list of 2-8 items, bullet/check/numbered style.',
  divider: 'A plain horizontal rule, for separating dense content within a section.',
  spacer: 'Vertical whitespace (sm/md/lg) — use sparingly, sections already have their own padding.',
  quote: 'A pull-quote with attribution. Only use this if a real quote or testimonial exists in the deal facts — never invent one.',
  statRow: '2-4 side-by-side stat tiles (value/label/caption). Only use this if real figures exist in the deal facts — never invent statistics.',
  table: 'A simple headers+rows table for comparing options or listing structured facts not covered by pricingTable/timelineList.',
  buttonLink: 'A call-to-action button that opens the accept-and-sign flow. Always the last thing in the last section.',
  image: "Either the account's logo, or a reference to an already-uploaded attachment by index. Never invent an image source.",
  pricingTable: "Renders one or more packages (by index into content.packages) verbatim — never restate prices as prose. Every document needs at least one of these.",
  timelineList: 'Renders the full structured timeline verbatim, in order. Optional — omit for a short, fixed-scope engagement.',
  paymentInfo: 'Renders the payment schedule and any UPI/link/QR payment details verbatim. Every document needs one of these.',
  termsList: 'Renders the structured terms list verbatim. Optional.',
  card: 'A bordered box grouping 1-6 leaves together — use where content genuinely belongs as one visual unit.',
  columns: '2-3 columns side by side, each holding its own leaves/cards — use for comparing things, not as a default layout.',
}
