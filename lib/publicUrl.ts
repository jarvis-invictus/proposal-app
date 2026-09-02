/** RESERVED_SUBDOMAINS blocks anything that would collide with a real route or read as an
 * official Marg address. Kept here (not just in the DB CHECK) so the server action can give a
 * specific "that name is reserved" message instead of a generic constraint-violation error. */
export const RESERVED_SUBDOMAINS = [
  'www', 'app', 'api', 'admin', 'mail', 'dashboard', 'login', 'signup',
  'help', 'support', 'blog', 'docs', 'status', 'static', 'assets', 'cdn', 'marg',
]

const SUBDOMAIN_PATTERN = /^[a-z0-9][a-z0-9-]{1,30}[a-z0-9]$/

export function validateSubdomain(value: string): string | null {
  const v = value.trim().toLowerCase()
  if (!SUBDOMAIN_PATTERN.test(v)) {
    return 'Use 3–32 lowercase letters, numbers, or hyphens — no leading/trailing hyphen.'
  }
  if (RESERVED_SUBDOMAINS.includes(v)) {
    return 'That name is reserved — pick another.'
  }
  return null
}

/** Falls back to the current origin whenever there's no subdomain set or no root domain
 * configured (e.g. every local dev environment today) — a bare NEXT_PUBLIC_ROOT_DOMAIN alone
 * doesn't make a wildcard link resolve; that also needs the DNS record and the Vercel wildcard
 * domain added once this is actually deployed. Until then this always resolves to the origin
 * fallback, which is correct today. */
export function getPublicProposalUrl(slug: string, subdomain: string | null | undefined, origin: string): string {
  const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN
  if (subdomain && rootDomain) {
    const protocol = rootDomain.startsWith('localhost') ? 'http' : 'https'
    return `${protocol}://${subdomain}.${rootDomain}/p/${slug}`
  }
  return `${origin}/p/${slug}`
}
