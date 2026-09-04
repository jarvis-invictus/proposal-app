/** Turns a proposal title into a URL slug with a random suffix to avoid collisions between two
 * proposals with the same title. The suffix uses crypto.randomUUID() (a CSPRNG), not
 * Math.random() — this slug is the entire access control for a public proposal link, so it needs
 * to be unguessable, not just unlikely to collide. The first 8 hex characters of a UUID (before
 * its first hyphen) is a convenient, already-random slice — no need for the rest of the UUID. */
export function slugify(title: string): string {
  const base = (title || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 60) || 'proposal'
  return `${base}-${crypto.randomUUID().slice(0, 8)}`
}
