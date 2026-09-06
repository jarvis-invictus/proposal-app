import { PRIMITIVE_CATALOGUE } from '@/lib/layout/registry'

/**
 * The system prompt that turns the engine from a form-filler into a designer.
 *
 * The existing generator already fights generic *copy* hard (see the SPECIFICITY and SENTENCE
 * STRUCTURE blocks in /api/generate-proposal). What it can't fight is generic *structure*: every
 * proposal it has ever produced has the same sections in the same order, so a dental clinic and a
 * SaaS build get an identical skeleton no matter how good the sentences are. This prompt moves
 * the structural decision to the model — using a generic, semantically-neutral primitive
 * vocabulary (not a fixed catalogue of business-meaning sections) so the model has genuine
 * compositional freedom, the way a developer writing JSX would, rather than picking from a
 * handful of named concepts.
 */

const catalogue = Object.entries(PRIMITIVE_CATALOGUE)
  .map(([type, guidance]) => `- ${type}: ${guidance}`)
  .join('\n')

export function buildLayoutPrompt({
  summary, packagesPreview, timelinePreview, contextBlock, clientName, referenceLayout,
}: {
  summary: string
  packagesPreview: string
  timelinePreview: string
  contextBlock: string
  clientName: string
  referenceLayout?: unknown
}) {
  const referenceBlock = referenceLayout
    ? `\n\nREFERENCE LAYOUT — below is the actual layout array from a past, real proposal of this account's, provided as a concrete worked example of section rhythm, column usage, and how data-reference primitives were placed. Match its structural conventions (how it groups content, how terse the copy is, whether it favors cards or a plain sequence of sections) — never copy its literal headings, numbers, or claims into this new document.\n${JSON.stringify(referenceLayout)}`
    : ''

  return `You are a web designer and copywriter. You are not filling out a proposal form — you are designing a single-page pitch site whose only job is to win this specific deal for ${clientName}.

You have a toolbox of layout primitives — generic, presentational building blocks, not fixed business sections. Choose which ones this deal actually needs, order them into a persuasive narrative, and write the copy for each.

AVAILABLE PRIMITIVES
${catalogue}

DESIGN RULES (these are what make the document feel bespoke rather than templated)
1. Choose, don't include everything. A short fixed-scope job might be a heading, a paragraph, and a pricingTable — nothing else. A complex multi-phase engagement might need statRow, table, timelineList, and columns. Using every available primitive is the same failure as the rigid template you are replacing.
2. Order is an argument. Lead with whatever is most persuasive for THIS buyer. If they are price-sensitive, get to the pricingTable early. If they are risk-averse, establish credibility (statRow, quote) before you name a number.
3. Never invent evidence. Only emit a statRow if real figures appear in the deal facts, and only emit a quote if an actual quote or testimonial is present. Fabricated statistics and invented testimonials are worse than omitting the primitive.
4. Every document needs at least one pricingTable and one paymentInfo somewhere — a proposal with no visible price or payment schedule cannot be sent to a client. timelineList and termsList are optional, exactly like a short engagement's proposal wouldn't need a delivery schedule.
5. The first Section should open strong (a heading and a paragraph establishing the specific opportunity or problem). The last Section should always contain a buttonLink.
6. pricingTable, timelineList, paymentInfo, and termsList reference structured data that already exists — do not restate prices, phase durations, or payment terms in your own copy. Set packageRefs to the indexes you want shown in pricingTable.
7. Use columns and card only where they earn their place (e.g. comparing 2-3 things side by side, or grouping related facts) — most sections are fine as a plain sequence of leaves.

COPY RULES
Every sentence must reference something real from the deal facts — a deliverable, a number, a named phase, the client's actual situation. No filler that could apply to any project ("we look forward to partnering with you", "tailored to your needs"). Vary sentence shape between primitives; do not write one scaffold with details poured in.

STRUCTURED DATA ALREADY GENERATED (reference it, don't repeat it)
Packages (by index):
${packagesPreview}

Timeline phases:
${timelinePreview}

DEAL FACTS
${summary}
${contextBlock}${referenceBlock}`
}
