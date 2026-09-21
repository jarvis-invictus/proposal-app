import { parse } from 'node-html-parser'

export type HeadingFontReport = {
  total: number
  compliant: number
  missing: Array<{ tag: string; text: string }>
  /** Whether the .heading-font CSS rule and its --font-heading value actually exist in the
   * document's own <style> blocks and name the expected brand font — a present class token with
   * no matching, correctly-valued CSS rule is exactly as broken as no class at all. */
  cssVariableResolved: boolean
  resolvedFontFamily: string | null
}

const HEADING_CLASS = 'heading-font'

/** Real, code-level confirmation that headings actually render in the brand's font — the same
 * "verify what the AI actually did, don't just trust the prompt" principle as genericVerifyFields
 * for data-proposal-field tags (and sanitizeFontName for brand-kit input).
 *
 * REWRITTEN after a real, live-confirmed bug in its first version: that version did a raw
 * substring search for the font name inside a heading's class attribute *text* — which reported
 * "11/11 compliant" for class="font-['Playfair Display'] text-4xl" even though the browser
 * rendered that heading in the body font. The reason: HTML splits class="..." on whitespace into
 * real, separate tokens — font-['Playfair Display'] became two invalid ones, font-['Playfair and
 * Display'], neither of which the compiled CSS defined anything for. A substring match over the
 * raw attribute text never notices that split; only tokenizing the attribute the same way the
 * browser's own classList does would. Confirmed directly against the live page:
 * document.querySelector('h1').classList returned exactly those two broken tokens.
 *
 * This version checks two independent, real things instead: (1) every h1/h2/h3's class attribute,
 * split on whitespace into actual tokens (not a substring search), contains the exact token
 * `heading-font`; (2) the document's own <style> blocks actually define a `.heading-font` rule
 * that resolves `--font-heading` to the expected brand font — a class name being present in the
 * markup with no matching, correctly-valued CSS rule behind it would be just as broken as this
 * function's own previous blind spot. */
export function verifyHeadingFontUsage(documentHtml: string, expectedHeadingFont: string | undefined | null): HeadingFontReport {
  const root = parse(documentHtml)
  const headings = root.querySelectorAll('h1, h2, h3')

  const missing: Array<{ tag: string; text: string }> = []
  for (const h of headings) {
    const classTokens = (h.getAttribute('class') || '').split(/\s+/).filter(Boolean)
    if (!classTokens.includes(HEADING_CLASS)) {
      missing.push({ tag: h.tagName.toLowerCase(), text: h.textContent.trim().slice(0, 60) })
    }
  }

  const styleText = root.querySelectorAll('style').map((s) => s.textContent).join('\n')
  const varMatch = styleText.match(/--font-heading\s*:\s*([^;]+);/)
  const resolvedFontFamily = varMatch ? varMatch[1].trim() : null
  const hasHeadingFontRule = /\.heading-font\s*\{[^}]*font-family\s*:\s*var\(--font-heading\)/i.test(styleText)
  const cssVariableResolved = Boolean(
    resolvedFontFamily &&
    hasHeadingFontRule &&
    (!expectedHeadingFont || resolvedFontFamily.toLowerCase().includes(expectedHeadingFont.trim().toLowerCase()))
  )

  return {
    total: headings.length,
    compliant: headings.length - missing.length,
    missing,
    cssVariableResolved,
    resolvedFontFamily,
  }
}
