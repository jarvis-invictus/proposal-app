/** Shown by every dashboard route's loading.tsx while its Server Component data fetch is
 * pending. There's no app/dashboard/layout.tsx — AppShell only renders after each page's own
 * awaits resolve — so this necessarily replaces the whole screen rather than just the content
 * area. Mirrors AppShell's real proportions (sidebar width, header padding) so the swap to the
 * real page doesn't jump. */

function Bar({ width, height = 14 }: { width: number | string; height?: number }) {
  return (
    <span
      style={{
        display: 'block',
        width,
        height,
        borderRadius: 6,
        background: 'linear-gradient(90deg,var(--skeleton-base) 0%,var(--skeleton-sheen) 50%,var(--skeleton-base) 100%)',
        backgroundSize: '760px 100%',
        animation: 'shimmer 1.4s linear infinite',
      }}
    />
  )
}

export function DashboardLoadingSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: 'var(--gradient-app)' }}>
      <div style={{ width: 'var(--sidebar-w)', flex: 'none', padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <Bar width={90} height={20} />
        <div style={{ marginTop: 22, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <Bar key={i} width="80%" height={14} />
          ))}
        </div>
      </div>
      <div style={{ flex: 1, minWidth: 0, padding: '26px 34px' }}>
        <Bar width={220} height={26} />
        <div style={{ marginTop: 10 }}>
          <Bar width={320} height={14} />
        </div>
        <div style={{ marginTop: 32, display: 'flex', flexDirection: 'column', gap: 14 }}>
          {Array.from({ length: rows }).map((_, i) => (
            <Bar key={i} width="100%" height={64} />
          ))}
        </div>
      </div>
    </div>
  )
}
