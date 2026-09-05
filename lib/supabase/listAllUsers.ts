import type { SupabaseClient, User } from '@supabase/supabase-js'

// adminSupabase.auth.admin.listUsers() defaults to 50 users per page and silently returns only
// that first page if you don't ask for more — past 50 total signups, any lookup built on it
// (finding a Stripe checkout's account by email, resolving team member emails) starts silently
// missing users instead of erroring. Pages through with a large perPage until a short page comes
// back, so callers get every user regardless of how many pages that takes.
export async function listAllUsers(adminSupabase: SupabaseClient): Promise<User[]> {
  const perPage = 1000
  const users: User[] = []
  let page = 1

  while (true) {
    const { data, error } = await adminSupabase.auth.admin.listUsers({ page, perPage })
    if (error) throw error
    users.push(...data.users)
    if (data.users.length < perPage) break
    page += 1
  }

  return users
}
