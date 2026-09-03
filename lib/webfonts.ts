/** Builds a Google Fonts CSS2 API URL for whatever distinct, real names are given. A name that
 * isn't actually on Google Fonts (e.g. a paid font like "Söhne") just 404s harmlessly — the
 * browser falls through to the CSS `font-family` stack's next entry, so no validity check or
 * curated list is needed here. */
export function googleFontsHref(names: Array<string | null | undefined>): string | null {
  const unique = Array.from(new Set(names.filter((n): n is string => Boolean(n && n.trim()))))
  if (!unique.length) return null
  const families = unique.map((n) => `family=${encodeURIComponent(n.trim()).replace(/%20/g, '+')}`).join('&')
  return `https://fonts.googleapis.com/css2?${families}&display=swap`
}
