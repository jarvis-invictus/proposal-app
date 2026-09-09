import { NextResponse, type NextRequest } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { updateSession } from '@/lib/supabase/middleware'
import { env } from '@/env'

// docs/CORE_ENGINE_V2_SPEC.md §6/§9 proof (Phase 1 sub-piece 5) — a request to this host has no
// relationship to dashboard auth, so it's handled before updateSession() runs at all, not after.
const PREVIEW_TEST_HOST = process.env.PREVIEW_TEST_HOST || 'preview.localtest.me:3000'

/** `slug`, when given, resolves a REAL proposal's most-recently-published page — first real
 * integration point (feature-flagged, own-account-only for now). No slug falls back to the
 * original no-filter behavior unchanged, since every dev-proof route built through Phase 1+2
 * still relies on exactly that (a single dedicated test proposal, no path segment). */
async function servePreviewHost(slug: string | null): Promise<Response> {
  const supabase = createAdminClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

  if (slug) {
    const { data: proposal } = await supabase.from('proposals').select('id').eq('slug', slug).maybeSingle()
    if (!proposal) return new Response('No published page found.', { status: 404 })

    const { data } = await supabase
      .from('generated_pages')
      .select('html')
      .eq('proposal_id', proposal.id)
      .not('published_at', 'is', null)
      .order('published_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (!data) return new Response('No published page found.', { status: 404 })
    return new Response(data.html, { headers: { 'content-type': 'text/html; charset=utf-8' } })
  }

  const { data } = await supabase
    .from('generated_pages')
    .select('html')
    .not('published_at', 'is', null)
    .order('published_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!data) return new Response('No published page found.', { status: 404 })
  return new Response(data.html, { headers: { 'content-type': 'text/html; charset=utf-8' } })
}

export async function proxy(request: NextRequest) {
  const host = request.headers.get('host') || ''
  if (host === PREVIEW_TEST_HOST) {
    const slug = request.nextUrl.pathname.replace(/^\/+/, '') || null
    return servePreviewHost(slug)
  }

  // Isolation-proof-only: OFF unless explicitly enabled, so this has zero effect on real
  // request-handling by default (including production) — only sets one purpose-built, host-only
  // marker cookie used by sub-piece 5's cross-origin cookie-isolation check.
  if (process.env.ENABLE_PREVIEW_ISOLATION_TEST === 'true') {
    const response = await updateSession(request)
    response.cookies.set('subpiece5_isolation_marker', 'main-app-only', { path: '/' })
    return response
  }

  return await updateSession(request)
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
