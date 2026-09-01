'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function login(formData: FormData) {
  const supabase = await createClient()

  const data = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  }

  const { error } = await supabase.auth.signInWithPassword(data)

  if (error) {
    redirect('/login?error=Could not authenticate user')
  }

  revalidatePath('/dashboard')
  redirect('/dashboard')
}

export async function signup(formData: FormData) {
  const supabase = await createClient()

  const inviteId = (formData.get('invite_id') as string) || ''

  const data = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
    options: {
      data: {
        full_name: formData.get('full_name') as string,
        // Read by the on_auth_user_created trigger to join the inviting account (at the role
        // the invite specifies) instead of creating a new standalone one — see
        // supabase/migrations/20260901160000_invite_redemption_on_signup.sql. Only ever a hint:
        // the trigger independently re-verifies the invite is still pending and matches this
        // exact email before honoring it.
        ...(inviteId ? { invite_id: inviteId } : {}),
      }
    }
  }

  const { error } = await supabase.auth.signUp(data)

  if (error) {
    redirect(`/signup?error=Could not sign up${inviteId ? `&invite=${inviteId}` : ''}`)
  }

  revalidatePath('/dashboard')
  redirect('/dashboard')
}

export async function logout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}
