import { compile } from '@tailwindcss/node'

/** Broad text scan across the entire document — not attribute-specific parsing. A class
 * referenced only from inside a <script> block (e.g. `element.classList.add('opacity-100')` in a
 * scroll-triggered effect) never appears in any class="..." attribute, so attribute-only
 * extraction would silently fail to compile it. Over-matching (HTML tag names, JS keywords, prose
 * words) is harmless — compile()'s .build() only emits rules for tokens that are genuinely valid
 * Tailwind utilities and silently drops everything else. Only under-matching a real class would
 * be a bug, and attribute-only parsing is exactly how that happens. */
function extractCandidates(html: string): string[] {
  const tokens = html.match(/[^\s"'`<>=]+/g) ?? []
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
