import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getAccountShellInfo } from '@/lib/accountShellInfo'
import { logError } from '@/lib/logging'
import { TemplatesClient, type TemplateRow } from './TemplatesClient'

export default async function TemplatesPage() {
  const supabase = await createClient()

  const { data: userData, error: userError } = await supabase.auth.getUser()
  if (userError || !userData.user) {
    redirect('/login')
  }

  // Neither query depends on the other's result — both are RLS-scoped with no explicit filter
  // needing input from the other side, so they run in parallel instead of sequentially.
  const [shellInfo, { data: rows, error }] = await Promise.all([
    getAccountShellInfo(supabase),
    // RLS unions system defaults (is_system_default = true, publicly readable) with the
    // account's own saved templates (account_id = get_account_id()) — no explicit filter needed.
    supabase.from('templates').select('id, name, category, structure').order('name'),
  ])

  if (error) {
    logError('Error fetching templates', error, { userId: userData.user.id })
  }

  const templates: TemplateRow[] = (rows ?? []).map((t) => {
    const sections = Array.isArray((t.structure as any)?.sections) ? (t.structure as any).sections : []
    const hero = sections.find((s: any) => s?.type === 'hero')
    return {
      id: t.id,
      name: t.name,
      category: t.category,
      sectionCount: sections.length || 6,
      tagline: hero?.title ?? null,
    }
  })

  return <TemplatesClient accountName={shellInfo.accountName} planLabel={shellInfo.planLabel} templates={templates} />
}
