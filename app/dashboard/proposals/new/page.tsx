import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { NewProposalClient, type PastProposalRef, type BrandKitPreview, type TemplateSeed } from './NewProposalClient'

export default async function NewProposalPage({
  searchParams,
}: {
  searchParams: Promise<{ starter?: string; template?: string }>
}) {
  const { starter, template: templateId } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const firstName = (user.user_metadata?.full_name as string | undefined)?.split(' ')[0] || user.email?.split('@')[0] || 'there'

  const [{ data: proposalRows }, { data: brandKitRow }, templateResult] = await Promise.all([
    // Only published proposals are meaningful as a stylistic reference — a draft is unfinished
    // and may be heavily rewritten or deleted before it ever represents real, sent work.
    supabase.from('proposals').select('id, content, updated_at').eq('status', 'PUBLISHED').order('updated_at', { ascending: false }).limit(6),
    supabase.from('brand_kits').select('name, colors, fonts').order('updated_at', { ascending: false }).limit(1).maybeSingle(),
    templateId
      ? supabase.from('templates').select('id, name, category').eq('id', templateId).maybeSingle()
      : Promise.resolve({ data: null }),
  ])

  const pastProposals: PastProposalRef[] = (proposalRows ?? [])
    .filter((p) => p.content?.title)
    .map((p) => ({ id: p.id, title: p.content.title, client: p.content?.clientName || 'Unknown client', content: p.content }))

  const brandKit: BrandKitPreview | null = brandKitRow
    ? {
        name: brandKitRow.name || 'Your brand kit',
        colors: (brandKitRow.colors as any) || null,
        headingFont: (brandKitRow.fonts as any)?.heading || null,
      }
    : null

  const template: TemplateSeed = templateResult.data ? { id: templateResult.data.id, name: templateResult.data.name, category: templateResult.data.category } : null

  return (
    <NewProposalClient firstName={firstName} pastProposals={pastProposals} brandKit={brandKit} starter={starter || null} template={template} />
  )
}
