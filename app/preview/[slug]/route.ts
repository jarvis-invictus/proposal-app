import { NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { env } from '@/env'

/** TEMPORARY, TEST-ONLY route — explicitly NOT the real production architecture for viewing a
 * generated page (docs/DECISION_LOG.md, 2026-09-11). Exists only because no real subdomain-based
 * preview origin was ever set up for production: proxy.ts's host-based servePreviewHost() only
 * ever matches PREVIEW_TEST_HOST, which defaults to a local-only host (`preview.localtest.me:3000`)
 * with no real production equivalent configured — confirmed via a real check of production's env
 * vars and this Vercel project's domains/aliases, neither of which has anything resembling a
 * dedicated preview host. This route mirrors proxy.ts's servePreviewHost() query exactly (same
 * "most recently published version for this slug" lookup, same admin/service-role client, same
 * unauthenticated access — matching that path's own existing behavior, not adding new exposure).
 *
 * This intentionally provides ZERO origin isolation: the generated HTML renders under the main
 * app's own domain, at a path under it — any script/style embedded in a generated page runs with
 * the same-origin privileges as the dashboard itself (cookies, DOM, storage). That is acceptable
 * ONLY while `BETA_AI_ENGINE_ACCOUNT_IDS` contains exactly one, fully-trusted account. This route
 * MUST be replaced with real subdomain-based isolation (tied to the still-undecided real
 * domain/brand-name question) before a second account is ever added to that allowlist — do not
 * treat this route as a permanent or safe-to-keep answer once that happens. */
export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const supabase = createAdminClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

  const { data: proposal } = await supabase.from('proposals').select('id').eq('slug', slug).maybeSingle()
  if (!proposal) return new NextResponse('No published page found.', { status: 404 })

  const { data } = await supabase
    .from('generated_pages')
    .select('html')
    .eq('proposal_id', proposal.id)
    .not('published_at', 'is', null)
    .order('published_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!data) return new NextResponse('No published page found.', { status: 404 })
  return new NextResponse(data.html, { headers: { 'content-type': 'text/html; charset=utf-8' } })
}
