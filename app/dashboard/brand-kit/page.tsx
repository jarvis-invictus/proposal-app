import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AppShell } from '@/components/app/AppShell'
import { planLabelFor } from '@/lib/accountShellInfo'
import { BrandKitPageClient, type BrandKitRow } from './BrandKitPageClient'

export default async function BrandKitPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // `brand_kits` has no `.eq('account_id', ...)` filter (relies on RLS, same as before this
  // fix) — it never actually depended on `account_id` being resolved first, so it runs in
  // parallel with the joined user/account lookup instead of after it.
  const [{ data: userRecord }, { data: kitRows }] = await Promise.all([
    supabase.from('users').select('account_id, accounts(id, name, plan_tier)').eq('id', user!.id).single(),
    supabase.from('brand_kits').select('id, name, colors, fonts, logo_url').order('updated_at', { ascending: false }),
  ])

  // Supabase's JS client can return an embedded resource as an object or a single-element
  // array depending on inferred cardinality — same defensive unwrap as lib/accountContext.ts.
  const accountRaw = userRecord?.accounts as { id: string; name: string; plan_tier: string } | { id: string; name: string; plan_tier: string }[] | null
  const account = Array.isArray(accountRaw) ? accountRaw[0] : accountRaw

  const kits: BrandKitRow[] = (kitRows ?? []).map((row) => ({
    id: row.id,
    name: row.name || 'Untitled brand kit',
    colors: (row.colors as any) || null,
    headingFont: (row.fonts as any)?.heading || null,
    logoUrl: row.logo_url || null,
  }))

  return (
    <AppShell screen="brand" title="Your brand kits" accountName={account?.name || 'Marg Studio'} planLabel={planLabelFor(account?.plan_tier)}>
      <BrandKitPageClient accountId={account?.id ?? ''} accountName={account?.name || 'Marg Studio'} kits={kits} />
    </AppShell>
  )
}
