import type { ProposalType } from '@/lib/schema/proposal'
import { currencySymbol, formatAmount } from '@/lib/formatCurrency'

export type FlatFact = {
  path: string
  provided: boolean
  value: string | number | null
  displayValue: string
}

const TEXT_NOT_PROVIDED = 'Not yet specified'
const PRICE_NOT_PROVIDED = 'Pricing to be confirmed'

function moneyDisplay(amount: number, currency: string): string {
  return `${currencySymbol(currency)}${formatAmount(amount, currency)}`
}

/** Walks only the confirmed addressable field list (docs/PROJECT_ROADMAP.md §6) — not a blind
 * recursive walk over the whole object. Deliberately excluded, not just filtered out later:
 * `packages[i].popular` (a selection flag, never rendered as text), `attachments[i].url`/`type`
 * (asset references, not editable prose), and all of `layout` (the old renderer's presentation
 * tree, and its array indices are documented elsewhere — app/api/proposals/[id]/revise/route.ts —
 * as unstable identity, unlike packages/addOns/timeline).
 *
 * A leaf that IS in scope but genuinely blank (missing key, empty string, or — for a price field
 * only — null/undefined, never a literal 0) is still pushed, with `provided: false` and an honest
 * placeholder as `displayValue` — never skipped invisibly, and never left for the AI to invent a
 * plausible-looking value for. `genericInjectFields`/`genericVerifyFields` need no awareness of
 * this: they already operate purely on `displayValue`, so a not-provided leaf's placeholder gets
 * force-injected the exact same way a wrong real value would be corrected. A literal `0` on any
 * price field (`originalPrice` included) is always a real, provided value, never treated as
 * "blank" — confirmed decision: a genuinely free package/add-on misreading as "Pricing to be
 * confirmed" is a worse, client-facing inaccuracy than a visible $0 a human would catch. */
export function flattenProposalFacts(content: ProposalType, currency: string): FlatFact[] {
  const facts: FlatFact[] = []

  const pushString = (path: string, value: string | undefined | null) => {
    const trimmed = value?.trim()
    if (trimmed) {
      facts.push({ path, provided: true, value: trimmed, displayValue: trimmed })
    } else {
      facts.push({ path, provided: false, value: null, displayValue: TEXT_NOT_PROVIDED })
    }
  }
  const pushMoney = (path: string, value: number | undefined | null) => {
    if (value == null) {
      facts.push({ path, provided: false, value: null, displayValue: PRICE_NOT_PROVIDED })
    } else {
      facts.push({ path, provided: true, value, displayValue: moneyDisplay(value, currency) })
    }
  }

  pushString('title', content.title)
  pushString('clientName', content.clientName)
  pushString('preparedFor', content.preparedFor)
  pushString('preparedBy', content.preparedBy)
  pushString('dateIssued', content.dateIssued)
  pushString('validUntil', content.validUntil)

  content.packages?.forEach((pkg, i) => {
    pushString(`packages[${i}].name`, pkg.name)
    pushString(`packages[${i}].description`, pkg.description)
    pushMoney(`packages[${i}].originalPrice`, pkg.originalPrice)
    pushMoney(`packages[${i}].discountedPrice`, pkg.discountedPrice)
    pkg.deliverables?.forEach((d, j) => pushString(`packages[${i}].deliverables[${j}]`, d))
  })

  content.addOns?.forEach((addOn, i) => {
    pushString(`addOns[${i}].name`, addOn.name)
    pushString(`addOns[${i}].description`, addOn.description)
    pushMoney(`addOns[${i}].price`, addOn.price)
    addOn.deliverables?.forEach((d, j) => pushString(`addOns[${i}].deliverables[${j}]`, d))
  })

  content.timeline?.forEach((phase, i) => {
    pushString(`timeline[${i}].phase`, phase.phase)
    pushString(`timeline[${i}].duration`, phase.duration)
    pushString(`timeline[${i}].description`, phase.description)
  })

  content.terms?.forEach((term, i) => pushString(`terms[${i}]`, term))

  pushString('paymentSection.schedule', content.paymentSection?.schedule)
  pushString('paymentSection.terms', content.paymentSection?.terms)

  content.attachments?.forEach((att, i) => pushString(`attachments[${i}].caption`, att.caption))

  return facts
}
