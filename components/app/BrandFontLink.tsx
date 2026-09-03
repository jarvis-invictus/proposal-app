import { googleFontsHref } from '@/lib/webfonts'

/** Loads a brand kit's fonts by name at runtime. React 19 hoists a `<link>` rendered anywhere
 * in the tree up to `<head>`, deduplicated — no `next/head` needed even from a client component. */
export function BrandFontLink({ heading, body }: { heading?: string | null; body?: string | null }) {
  const href = googleFontsHref([heading, body])
  if (!href) return null
  return <link rel="stylesheet" href={href} />
}
