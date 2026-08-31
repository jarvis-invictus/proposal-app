import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AppShell } from '@/components/app/AppShell'
import { getAccountShellInfo } from '@/lib/accountShellInfo'
import { Pill } from '@/components/ui/Pill'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/app/EmptyState'

export default async function TemplatesPage() {
  const supabase = await createClient()

  const { data: userData, error: userError } = await supabase.auth.getUser()
  if (userError || !userData.user) {
    redirect('/login')
  }

  const shellInfo = await getAccountShellInfo(supabase)

  // Fetch system templates
  const { data: templates, error } = await supabase
    .from('templates')
    .select('*')
    .eq('is_system_default', true)
    .order('name')

  if (error) {
    console.error("Error fetching templates", error)
  }

  return (
    <AppShell screen="templates" title="Template Library" subtitle="Select a template to start building your proposal."
      accountName={shellInfo.accountName} planLabel={shellInfo.planLabel}
      actions={<a href="/dashboard/brand-kit" style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-medium)', color: 'var(--brand-deep)' }}>Edit Brand Kit</a>}>
      {(!templates || templates.length === 0) ? (
        <EmptyState title="No templates" description="No templates available yet." />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 24 }}>
          {templates.map((template) => (
            <div key={template.id} style={{
              borderRadius: 'var(--radius-card-lg)', overflow: 'hidden', background: 'var(--surface-card)',
              border: '1px solid var(--border-hairline)', transition: 'box-shadow var(--duration-base) var(--ease-standard)',
            }}>
              <div style={{
                height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
                background: 'var(--surface-sunken)', borderBottom: '1px solid var(--border-hairline)',
              }}>
                {/* Visual placeholder for the template */}
                <div style={{
                  width: '100%', height: '100%', background: 'var(--surface-card)', borderRadius: 'var(--radius-xs)',
                  border: '1px solid var(--border-hairline)', padding: 14, display: 'flex', flexDirection: 'column', gap: 8,
                }}>
                  <div style={{ width: '33%', height: 6, borderRadius: 3, background: 'var(--ink-08)' }} />
                  <div style={{ width: '50%', height: 12, borderRadius: 3, background: 'var(--ink-16)' }} />
                  <div style={{ flex: 1, borderRadius: 3, background: 'var(--ink-04)', marginTop: 4 }} />
                </div>
              </div>
              <div style={{ padding: 20 }}>
                <Pill size="sm" tone="glass" style={{ marginBottom: 12 }}>{template.category}</Pill>
                <h3 style={{ fontSize: 'var(--text-body-lg)', fontWeight: 'var(--weight-semibold)', color: 'var(--text-primary)', margin: '0 0 20px' }}>
                  {template.name}
                </h3>
                {/* In Sprint 3, this will link to proposal creation with this template */}
                <Button variant="secondary" fullWidth>Use Template</Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </AppShell>
  )
}
