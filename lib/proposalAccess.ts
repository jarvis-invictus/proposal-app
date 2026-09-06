import { scryptSync, randomBytes, timingSafeEqual, createHmac } from 'crypto'

/** Optional per-proposal password/PIN gate for the public /p/[slug] link. No new dependency —
 * Node's built-in crypto (scrypt) is the only hashing primitive available anywhere in this
 * codebase, and it's sufficient for a short-lived visitor gate rather than a login system. */

const KEYLEN = 64
export const PROPOSAL_ACCESS_TTL_SECONDS = 60 * 60 * 24 // 24h — one visit's worth, not a persistent login

export function hashProposalPassword(password: string): string {
  const salt = randomBytes(16)
  const derived = scryptSync(password, salt, KEYLEN)
  return `scrypt$${salt.toString('hex')}$${derived.toString('hex')}`
}

export function verifyProposalPassword(password: string, stored: string): boolean {
  const [scheme, saltHex, hashHex] = stored.split('$')
  if (scheme !== 'scrypt' || !saltHex || !hashHex) return false
  const salt = Buffer.from(saltHex, 'hex')
  const expected = Buffer.from(hashHex, 'hex')
  const actual = scryptSync(password, salt, expected.length)
  return actual.length === expected.length && timingSafeEqual(actual, expected)
}

function requireSecret(): string {
  const secret = process.env.PROPOSAL_LINK_SECRET
  if (!secret) throw new Error('PROPOSAL_LINK_SECRET is not configured — proposal password protection is unavailable on this deployment.')
  return secret
}

// Fingerprinting the CURRENT password_hash into the signed payload means a token self-invalidates
// the moment the owner changes or clears the password — no revocation list needed, verification
// just recomputes this against whatever password_hash is on the row right now.
function fingerprint(passwordHash: string): string {
  return createHmac('sha256', requireSecret()).update(passwordHash).digest('hex').slice(0, 16)
}

export function signProposalAccessToken(proposalId: string, passwordHash: string): string {
  const expires = Date.now() + PROPOSAL_ACCESS_TTL_SECONDS * 1000
  const payload = `${proposalId}.${fingerprint(passwordHash)}.${expires}`
  const sig = createHmac('sha256', requireSecret()).update(payload).digest('hex')
  return `${payload}.${sig}`
}

export function verifyProposalAccessToken(token: string | undefined, proposalId: string, passwordHash: string): boolean {
  if (!token || !process.env.PROPOSAL_LINK_SECRET) return false
  const parts = token.split('.')
  if (parts.length !== 4) return false
  const [tokenProposalId, fp, expiresStr, sig] = parts
  const payload = `${tokenProposalId}.${fp}.${expiresStr}`
  const expectedSig = createHmac('sha256', requireSecret()).update(payload).digest('hex')
  const a = Buffer.from(sig, 'hex')
  const b = Buffer.from(expectedSig, 'hex')
  if (a.length !== b.length || !timingSafeEqual(a, b)) return false
  if (tokenProposalId !== proposalId) return false
  if (fp !== fingerprint(passwordHash)) return false
  if (Date.now() > Number(expiresStr)) return false
  return true
}

/** Cookie name embeds the proposal id (not the slug) so it's readable both by the /p/[slug] page
 * and by the accept/view API routes (different path prefixes) — it can't be path-scoped to
 * /p/[slug] alone. Per-proposal naming also lets a visitor stay unlocked on several different
 * password-protected proposals at once instead of one shared cookie overwriting the last. */
export function proposalAccessCookieName(proposalId: string): string {
  return `mprop_pw_${proposalId}`
}
