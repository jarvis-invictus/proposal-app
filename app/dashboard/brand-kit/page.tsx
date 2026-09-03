import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AppShell } from '@/components/app/AppShell'
import { getAccountShellInfo } from '@/lib/accountShellInfo'
import { BrandKitPageClient, type BrandKitRow } from './BrandKitPageClient'

export default async function BrandKitPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: userRecord } = await supabase.from('users').select('account_id').eq('id', user.id).single()
  const { data: account } = await supabase.from('accounts').select('id, name').eq('id', userRecord?.account_id).single()
  const { data: kitRows } = await supabase
    .from('brand_kits')
    .select('id, name, colors, fonts, logo_url')
    .order('updated_at', { ascending: false })
  const shellInfo = await getAccountShellInfo(supabase)

  const kits: BrandKitRow[] = (kitRows ?? []).map((row) => ({
    id: row.id,
    name: row.name || 'Untitled brand kit',
    colors: (row.colors as any) || null,
    headingFont: (row.fonts as any)?.heading || null,
    logoUrl: row.logo_url || null,
  }))

  return (
    <AppShell screen="brand" title="Your brand kits" accountName={shellInfo.accountName} planLabel={shellInfo.planLabel}>
      <BrandKitPageClient accountId={account?.id ?? ''} accountName={account?.name || 'Marg Studio'} kits={kits} />
    </AppShell>
  )
}
