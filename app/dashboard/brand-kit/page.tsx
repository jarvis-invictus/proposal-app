import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { DashboardShell } from '../DashboardShell'
import { BrandKitClient } from './BrandKitClient'

export default async function BrandKitPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <DashboardShell userEmail={user.email ?? ''}>
      <BrandKitClient />
    </DashboardShell>
  )
}
