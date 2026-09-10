import type { ProposalType } from '@/lib/schema/proposal'
import { currencySymbol, formatAmount } from '@/lib/formatCurrency'

export type FlatFact = {
  path: string
  value: string | number
  displayValue: string
}

function moneyDisplay(amount: number, currency: string): string {
  return `${currencySymbol(currency)}${formatAmount(amount, currency)}`
}

/** Walks only the confirmed addressable field list (docs/PROJECT_ROADMAP.md §6) — not a blind
 * recursive walk over the whole object. Deliberately excluded, not just filtered out later:
 * `packages[i].popular` (a selection flag, never rendered as text), `attachments[i].url`/`type`
 * (asset references, not editable prose), and all of `layout` (the old renderer's presentation
 * tree, and its array indices are documented elsewhere — app/api/proposals/[id]/revise/route.ts —
 * as unstable identity, unlike packages/addOns/timeline). Skips fields/items absent on a given
 * real record (no synthesized placeholders — that's a separate future sub-piece). */
export function flattenProposalFacts(content: ProposalType, currency: string): FlatFact[] {
  const facts: FlatFact[] = []

  const pushString = (path: string, value: string | undefined | null) => {
    if (!value) return
    facts.push({ path, value, displayValue: value.trim() })
  }
  const pushMoney = (path: string, value: number | undefined | null) => {
    if (value == null) return
    facts.push({ path, value, displayValue: moneyDisplay(value, currency) })
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

  if (content.paymentSection) {
    pushString('paymentSection.schedule', content.paymentSection.schedule)
    pushString('paymentSection.terms', content.paymentSection.terms)
  }

  content.attachments?.forEach((att, i) => pushString(`attachments[${i}].caption`, att.caption))

  return facts
}
