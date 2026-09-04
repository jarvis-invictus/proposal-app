/** Extraction prompts (lib/brand-extraction/{vision,text}.ts) explicitly allow a compound CSS
 * stack like "Inter, sans-serif" as a valid answer — but everywhere that value is actually used
 * (a Google Fonts URL param below, or a quoted CSS font-family value at each render site) treats
 * it as one atomic name. A compound value either 404s on Google Fonts or fails as a single
 * quoted CSS token, so the brand font silently never renders. This extracts just the first, real
 * family name — the only part either consumer can actually use. */
export function firstFontFamily(value: string | null | undefined): string | null {
  if (!value) return null
  const first = value.split(',')[0].trim()
  return first || null
}

/** Builds a Google Fonts CSS2 API URL for whatever distinct, real names are given. A name that
 * isn't actually on Google Fonts (e.g. a paid font like "Söhne") just 404s harmlessly — the
 * browser falls through to the CSS `font-family` stack's next entry, so no validity check or
 * curated list is needed here. */
export function googleFontsHref(names: Array<string | null | undefined>): string | null {
  const unique = Array.from(new Set(names.map(firstFontFamily).filter((n): n is string => Boolean(n))))
  if (!unique.length) return null
  const families = unique.map((n) => `family=${encodeURIComponent(n).replace(/%20/g, '+')}`).join('&')
  return `https://fonts.googleapis.com/css2?${families}&display=swap`
}
