/** Shared prompt-block builders used by both /api/chat and /api/generate-proposal, so the
 * framing/safety language for these optional steering inputs can't drift between call sites. */

export function styleReferenceBlock(styleReference: unknown): string {
  if (!styleReference) return ''
  return `\n\nSTYLISTIC REFERENCE — the user picked a past proposal of theirs to match the tone and structure of. Use it only to guide voice, phrasing, and how packages/terms are typically framed — never copy its client name, prices, or specific facts into the new proposal unless the user separately tells you those same facts. Reference:\n${JSON.stringify(styleReference)}`
}

export function briefBlock(brief: unknown): string {
  if (typeof brief !== 'string' || !brief.trim()) return ''
  return `\n\nSTYLE BRIEF — the user described how they want this proposal to sound or feel. Follow this closely for tone and voice, without inventing facts it doesn't mention:\n"${brief.trim()}"`
}
