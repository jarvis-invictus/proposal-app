import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { redeemInviteForOAuthUser } from '@/lib/auth/redeemInviteForOAuthUser'
import { logError } from '@/lib/logging'

// The landing point Supabase's OAuth PKCE flow redirects back to after the provider (Google)
// hands off a `code` — GoogleSignInButton is the only place that sends a user here, via
// signInWithOAuth's redirectTo. `invite` rides along as a plain query param since it survives
// the round trip untouched (Supabase only ever appends its own `code`/`error` params).
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const inviteId = searchParams.get('invite')

  if (code) {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error && data.user) {
      if (inviteId) {
        await redeemInviteForOAuthUser(data.user, inviteId)
      }

      // Google-provided profile photo — only fill it in if the user hasn't already set one
      // (e.g. via a prior password-account avatar upload), same column updateAvatarUrl() writes.
      const avatarUrl = data.user.user_metadata?.avatar_url as string | undefined
      if (avatarUrl) {
        const { data: userRow } = await supabase.from('users').select('avatar_url').eq('id', data.user.id).single()
        if (userRow && !userRow.avatar_url) {
          await supabase.from('users').update({ avatar_url: avatarUrl }).eq('id', data.user.id)
        }
      }

      return NextResponse.redirect(`${origin}/dashboard`)
    }

    if (error) logError('OAuth callback failed to exchange code for session', error)
  }

  return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent('Could not authenticate with Google')}`)
}
