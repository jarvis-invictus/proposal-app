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

/** Combines the generated HTML and its compiled CSS into one self-contained artifact — a single
 * string, not two correlated files. This fits §8's versioned-storage model (one blob per
 * generation) better than a separate CSS file that could drift or get stored inconsistently.
 * Strips the Play CDN script if present — leaving it in would be sloppy now that real compiled
 * CSS exists, and §5 already rejected relying on it. */
export function buildFinalArtifact(html: string, css: string): string {
  const withoutPlayCdn = html.replace(/<script[^>]*\ssrc=["']https:\/\/cdn\.tailwindcss\.com["'][^>]*>\s*<\/script>\s*/i, '')
  const styleTag = `<style>${css}</style>`

  if (/<\/head>/i.test(withoutPlayCdn)) {
    return withoutPlayCdn.replace(/<\/head>/i, `${styleTag}</head>`)
  }
  return withoutPlayCdn.replace(/<head[^>]*>/i, (match) => `${match}${styleTag}`)
}
