import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

import { createClient as createAdminClient } from '@supabase/supabase-js'
import { logError } from '@/lib/logging'
import { env } from '@/env'

// GET /api/notifications
// Fetch recent notifications for the authenticated user's account
export async function GET(request: Request) {
  let supabase: any = await createClient()

  // Authenticate
  let user = null
  const authHeader = request.headers.get('Authorization')
  
  if (authHeader) {
    const authClient = createAdminClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
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

  // Fetch notifications
  const { data: notifications, error } = await supabase
    .from('notifications')
    .select('*, proposals(slug)')
    .order('created_at', { ascending: false })
    .limit(20)

  if (error) {
    logError('Error fetching notifications:', error, { userId: user.id })
    return NextResponse.json({ error: 'Failed to fetch notifications' }, { status: 500 })
  }

  return NextResponse.json({ notifications })
}

// POST /api/notifications
// Mark a notification as read (or all as read)
export async function POST(request: Request) {
  const supabase = await createClient()

  // Authenticate
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { id } = await request.json()

    let query = supabase.from('notifications').update({ read: true })
    
    if (id) {
      query = query.eq('id', id)
    } else {
      // If no ID is provided, mark all as read for this account
      // Note: RLS ensures users can only update their own account's notifications
      query = query.eq('read', false)
    }

    const { error } = await query

    if (error) {
      throw error
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    logError('Error updating notifications:', error, { userId: user.id })
    return NextResponse.json({ error: 'Failed to update notifications' }, { status: 500 })
  }
}
