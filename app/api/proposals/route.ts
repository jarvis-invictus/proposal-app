import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'
import { NextRequest, NextResponse } from 'next/server'

function slugify(title: string) {
  const base = (title || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 60) || 'proposal'
  return `${base}-${Math.random().toString(36).slice(2, 8)}`
}

export async function POST(request: NextRequest) {
  try {
    let supabase: any = await createClient()

    // 1. Check Auth (same pattern as /api/proposals/[id])
    let user = null
    const authHeader = request.headers.get('Authorization')

    if (authHeader) {
      const authClient = createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
        global: { headers: { Authorization: authHeader } }
      })
      const { data } = await authClient.auth.getUser()
      user = data.user
      supabase = authClient as any
    } else {
      const { data } = await supabase.auth.getUser()
      user = data.user
    }

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const content = body.content
    if (!content) {
      return NextResponse.json({ error: 'Missing content' }, { status: 400 })
    }

    // 2. Resolve the user's account
    const { data: userRow, error: userError } = await supabase
      .from('users')
      .select('account_id')
      .eq('id', user.id)
      .single()

    if (userError || !userRow) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 })
    }

    // 3. Pick a default template (no template-selection UI exists yet)
    const { data: template, error: templateError } = await supabase
      .from('templates')
      .select('id')
      .eq('is_system_default', true)
      .order('name')
      .limit(1)
      .single()

    if (templateError || !template) {
      return NextResponse.json({ error: 'No default template available' }, { status: 500 })
    }

    // 4. Resolve the account's brand kit (no kit-selection UI exists yet — most recent wins)
    // and seed the new proposal's theme color from it so "set your brand once" actually
    // does something on the very first proposal, instead of always defaulting to indigo.
    const { data: brandKit } = await supabase
      .from('brand_kits')
      .select('id, colors')
      .eq('account_id', userRow.account_id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    const seededContent = brandKit?.colors?.primary
      ? { ...content, themeColor: content.themeColor || brandKit.colors.primary }
      : content

    // 5. Create the proposal
    const { data: proposal, error } = await supabase
      .from('proposals')
      .insert({
        account_id: userRow.account_id,
        template_id: template.id,
        brand_kit_id: brandKit?.id ?? null,
        status: 'DRAFT',
        content: seededContent,
        slug: slugify(content.title),
      })
      .select('id')
      .single()

    if (error) {
      console.error('Error creating proposal:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    revalidatePath('/dashboard')

    return NextResponse.json({ id: proposal.id })
  } catch (err) {
    console.error('Unexpected error creating proposal:', err)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
