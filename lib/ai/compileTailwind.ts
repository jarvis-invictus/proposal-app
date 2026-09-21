import { compile } from '@tailwindcss/node'

/** CORRECTION (Phase 2 sub-piece 1, dated after the original Phase 1 sub-piece 3 introduction of
 * this function — see docs/DECISION_LOG.md for both entries) — the original pattern excluded `'`
 * and `"` entirely, which broke any arbitrary-value class containing an internal quote, e.g.
 * `font-['Fraunces']`: the scan split at the internal `'` characters, so the utility was never
 * seen as one token and silently never compiled. Confirmed directly against the installed
 * Tailwind compiler that `font-['Fraunces']` compiles correctly when passed as one candidate —
 * the compiler was never the problem, only this extraction regex. Widened to a two-alternative
 * pattern: a bracketed alternative first (`[^\s"'`<>=]*\[[^\]]*\][^\s"'`<>=]*`) that treats an
 * entire `[...]` group as opaque — anything except `]` is allowed inside, quotes included — so a
 * bracketed arbitrary value is captured as one token regardless of what's inside it; the original
 * plain-token pattern remains as the fallback for everything without brackets, unchanged. Broad
 * text scan across the entire document — not attribute-specific parsing — remains deliberate: a
 * class referenced only from inside a <script> block (e.g. `element.classList.add('opacity-100')`
 * in a scroll-triggered effect) never appears in any class="..." attribute, so attribute-only
 * extraction would silently fail to compile it. Over-matching (HTML tag names, JS keywords, prose
 * words) stays harmless — compile()'s .build() only emits rules for tokens that are genuinely
 * valid Tailwind utilities and silently drops everything else. Only under-matching a real class
 * is a bug, which is exactly what both the original attribute-only risk and this quote-splitting
 * gap were. */
function extractCandidates(html: string): string[] {
  const tokens = html.match(/[^\s"'`<>=]*\[[^\]]*\][^\s"'`<>=]*|[^\s"'`<>=]+/g) ?? []
  return [...new Set(tokens)]
}

/** Compiles real, finished CSS for exactly the Tailwind classes present anywhere in the given
 * HTML (docs/CORE_ENGINE_V2_SPEC.md §7) — server-side, once, after generation. Never the Play CDN
 * / browser-JIT script (dev-only per Tailwind's own docs). Uses @tailwindcss/node's real
 * programmatic compile API — confirmed via its own type declarations and a live empirical test
 * against the actually-installed v4 package, not assumed from v3 familiarity: compile() takes a
 * minimal Tailwind entry string and returns a .build(candidates) function that emits CSS for
 * exactly the given class list — no project-wide file globs needed. */
export async function compileTailwindForHtml(html: string): Promise<string> {
  const candidates = extractCandidates(html)
  const compiled = await compile('@import "tailwindcss";', {
    base: process.cwd(),
    onDependency: () => {},
  })
  return compiled.build(candidates)
}

function cssStringEscape(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/'/g, "\\'")
}

/** Real CSS custom properties + utility classes for the brand's heading/body fonts — the
 * structural fix for a real, confirmed-live bug: the codegen prompt previously told the AI to
 * hand-construct a Tailwind arbitrary-value class directly in an HTML class="..." attribute, e.g.
 * class="font-['Playfair Display'] text-4xl". HTML splits class attribute values on whitespace —
 * that's not a Tailwind quirk, it's how the DOM's own classList works — so a multi-word font name
 * silently split into two invalid tokens (font-['Playfair and Display'], confirmed directly via
 * document.querySelector('h1').classList on the live page) that matched nothing in the compiled
 * CSS. getComputedStyle(...).fontFamily fell straight through to whatever the body font (or the
 * browser default) happened to be — this file's own `verifyHeadingFontUsage`-adjacent check
 * (lib/ai/verifyHeadingFont.ts) reported "compliant" the whole time because it only substring-
 * searched the class attribute text, never checked it split into a real, matching token.
 *
 * A CSS custom property's value is a plain quoted string, not an HTML attribute — a space inside
 * 'Playfair Display' here has no special meaning at all. Moving the font name out of the HTML
 * class attribute and into a CSS declaration is what actually closes the failure mode, not a
 * workaround for one instance of it. */
function fontVariablesBlock(fonts?: { heading?: string | null; body?: string | null }): string {
  const heading = fonts?.heading?.trim() || 'Georgia'
  const body = fonts?.body?.trim() || 'Georgia'
  return `:root{--font-heading:'${cssStringEscape(heading)}';--font-body:'${cssStringEscape(body)}';}.heading-font{font-family:var(--font-heading);}.body-font{font-family:var(--font-body);}`
}

/** Combines the generated HTML and its compiled CSS into one self-contained artifact — a single
 * string, not two correlated files. This fits §8's versioned-storage model (one blob per
 * generation) better than a separate CSS file that could drift or get stored inconsistently.
 * Strips the Play CDN script if present — leaving it in would be sloppy now that real compiled
 * CSS exists, and §5 already rejected relying on it.
 *
 * `fontLinkHref`, when given (from `googleFontsHref()`, lib/webfonts.ts — the same helper
 * `<BrandFontLink>` already uses elsewhere in this app), is injected as a real `<link>` so the
 * brand's actual heading/body font is fetched — without this, the compiled CSS's `font-family`
 * declarations silently fall back to whatever font the visitor's own device happens to have.
 *
 * `fonts` defines --font-heading/--font-body and the .heading-font/.body-font classes the codegen
 * prompt now instructs the AI to apply directly, instead of constructing its own arbitrary-value
 * class (see fontVariablesBlock above for why). Always injected, even with no brand kit — falls
 * back to Georgia, same default genericCodegenPrompt.ts uses, so the classes always resolve to
 * something real rather than an undefined CSS variable. */
export function buildFinalArtifact(html: string, css: string, fontLinkHref?: string | null, fonts?: { heading?: string | null; body?: string | null }): string {
  const withoutPlayCdn = html.replace(/<script[^>]*\ssrc=["']https:\/\/cdn\.tailwindcss\.com["'][^>]*>\s*<\/script>\s*/i, '')
  const fontLinkTag = fontLinkHref ? `<link rel="stylesheet" href="${fontLinkHref}">` : ''
  const styleTag = `${fontLinkTag}<style>${fontVariablesBlock(fonts)}</style><style>${css}</style>`

  if (/<\/head>/i.test(withoutPlayCdn)) {
    return withoutPlayCdn.replace(/<\/head>/i, `${styleTag}</head>`)
  }
  return withoutPlayCdn.replace(/<head[^>]*>/i, (match) => `${match}${styleTag}`)
}
