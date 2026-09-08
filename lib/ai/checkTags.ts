import { parse } from 'node-html-parser'

export type TagCheckResult = {
  passed: boolean
  priceTotal: { present: boolean; containsExpected: boolean }
  dueDate: { present: boolean; containsExpected: boolean }
  acceptAction: { present: boolean; exactlyOne: boolean; count: number }
}

/** Plain-code, no-model-call check that the tagging contract (docs/CORE_ENGINE_V2_SPEC.md §4)
 * actually landed on the right content — a first, minimal proof of stage 6's mechanism, not the
 * real deterministic-verification module (which will need this same shape later, hence its own
 * file rather than inlined in the proof route). */
export function checkTags(html: string, expected: { totalPrice: string; dueDate: string }): TagCheckResult {
  const root = parse(html)

  const priceEl = root.querySelector('[data-proposal-field="price_total"]')
  const dueDateEl = root.querySelector('[data-proposal-field="due_date"]')
  const acceptEls = root.querySelectorAll('[data-proposal-action="accept"]')

  const priceTotal = {
    present: !!priceEl,
    containsExpected: !!priceEl && priceEl.textContent.includes(expected.totalPrice),
  }
  const dueDate = {
    present: !!dueDateEl,
    containsExpected: !!dueDateEl && dueDateEl.textContent.includes(expected.dueDate),
  }
  const acceptAction = {
    present: acceptEls.length > 0,
    exactlyOne: acceptEls.length === 1,
    count: acceptEls.length,
  }

  return {
    passed: priceTotal.present && priceTotal.containsExpected && dueDate.present && dueDate.containsExpected && acceptAction.exactlyOne,
    priceTotal,
    dueDate,
    acceptAction,
  }
}
