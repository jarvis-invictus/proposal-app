'use client'

import * as React from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { SidebarNav, type NavItem } from './SidebarNav'
import { Icon } from '../ui/Icon'

const NAV: NavItem[] = [
  { id: 'proposals', label: 'Proposals', icon: 'file-text' },
  { id: 'templates', label: 'Templates', icon: 'layout-template' },
  { id: 'brand', label: 'Brand kits', icon: 'palette' },
]
// "Help & guides" stays omitted — there's no help/docs system anywhere in this app to link it
// to. Activity now has a real destination (Notifications, Correction 6.8) and is wired in.
const UTIL: NavItem[] = [
  { id: 'notifications', label: 'Activity', icon: 'bell' },
  { id: 'settings', label: 'Settings', icon: 'settings' },
]

const ROUTES: Record<string, string> = {
  proposals: '/dashboard',
  templates: '/dashboard/templates',
  brand: '/dashboard/brand-kit',
  notifications: '/dashboard/notifications',
  settings: '/dashboard/settings',
}

/** Slow sky bloom that drifts behind every signed-in screen. */
export function SkyBackdrop() {
  return (
    <div aria-hidden="true" style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 0 }}>
      <span style={{
        position: 'absolute', top: '-28%', left: '8%', width: '60%', height: '85%', borderRadius: '50%',
        background: 'radial-gradient(circle,var(--bloom-1) 0%,rgba(124,188,220,0) 68%)', animation: 'sky-drift 26s var(--ease-standard) infinite',
      }} />
      <span style={{
        position: 'absolute', top: '12%', right: '-14%', width: '52%', height: '78%', borderRadius: '50%',
        background: 'radial-gradient(circle,var(--bloom-2) 0%,rgba(207,228,242,0) 70%)', animation: 'sky-drift 34s var(--ease-standard) infinite reverse',
      }} />
    </div>
  )
}

/** Sky burst used on Accept and Publish. */
export function SuccessBurst({ show }: { show: boolean }) {
  if (!show) return null
  return (
    <span aria-hidden="true" style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none', zIndex: 90 }}>
      {[0, 1, 2].map((i) => (
        <span key={i} style={{
          position: 'absolute', width: 90, height: 90, borderRadius: '50%', border: '2px solid var(--brand)',
          animation: 'ripple-out 1.1s ' + (i * 180) + 'ms var(--ease-out-soft) forwards',
        }} />
      ))}
      <span style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center', width: 70, height: 70, borderRadius: '50%',
        background: 'var(--brand-deep)', color: 'var(--text-inverse)', boxShadow: 'var(--shadow-brand-lg)',
        animation: 'pop-in 520ms var(--ease-spring) both',
      }}>
        <Icon name="check" size={30} color="#fff" />
      </span>
    </span>
  )
}

function AccountRow({ onClick, collapsed, name, planLabel }: { onClick: () => void; collapsed: boolean; name: string; planLabel: string }) {
  const [hover, setHover] = React.useState(false)
  const initials = name.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join('') || '?'
  return (
    <button type="button" onClick={onClick} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      title={collapsed ? `${name} · ${planLabel}` : undefined}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: collapsed ? 'center' : 'flex-start',
        gap: 10, width: '100%', marginTop: 10, padding: '9px 10px', border: 'none',
        borderRadius: 'var(--radius-sm)', background: hover ? 'var(--glass-nav-hover)' : 'transparent', cursor: 'pointer', textAlign: 'left',
        transition: 'background var(--duration-fast) var(--ease-standard)',
      }}>
      <span style={{
        width: 26, height: 26, borderRadius: 'var(--radius-pill)', background: 'var(--brand-deep)', color: 'var(--text-inverse)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 600, flex: 'none',
      }}>{initials}</span>
      {!collapsed && (
        <span style={{ flex: 1, minWidth: 0 }}>
          <span style={{ display: 'block', fontSize: 'var(--text-sm)', fontWeight: 500, color: 'var(--brand-ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{name}</span>
          <span style={{ display: 'block', fontSize: 'var(--text-xs)', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{planLabel}</span>
        </span>
      )}
    </button>
  )
}

export interface AppShellProps {
  screen: string
  title: React.ReactNode
  subtitle?: React.ReactNode
  actions?: React.ReactNode
  search?: React.ReactNode
  scroll?: boolean
  accountName: string
  planLabel: string
  children: React.ReactNode
}

export function AppShell({ screen, title, subtitle, actions, search, scroll = true, accountName, planLabel, children }: AppShellProps) {
  const router = useRouter()
  const [shrunk, setShrunk] = React.useState(false)
  const [collapsed, setCollapsed] = React.useState(false)

  const go = (id: string) => {
    const route = ROUTES[id]
    if (route) router.push(route)
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--gradient-app)' }}>
      <SidebarNav brand="Marg" active={screen} onSelect={go} items={NAV} utility={UTIL}
        collapsed={collapsed} onToggleCollapse={() => setCollapsed((c) => !c)}
        footer={<AccountRow collapsed={collapsed} name={accountName} planLabel={planLabel} onClick={() => go('settings')} />} />
      <main style={{ position: 'relative', flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        <SkyBackdrop />
        <div style={{
          position: 'relative', zIndex: 2, display: 'flex', alignItems: 'center', flexWrap: 'wrap', rowGap: 10, gap: 16,
          padding: shrunk ? '12px 34px 12px' : '26px 34px 18px',
          background: shrunk ? 'var(--surface-glass-sky)' : 'transparent',
          backdropFilter: shrunk ? 'var(--blur-glass)' : 'none', WebkitBackdropFilter: shrunk ? 'var(--blur-glass)' : 'none',
          borderBottom: '1px solid ' + (shrunk ? 'var(--brand-38)' : 'transparent'),
          transition: 'padding var(--duration-slow) var(--ease-out-soft),background var(--duration-slow) var(--ease-standard),border-color var(--duration-slow) var(--ease-standard)',
        }}>
          <div style={{ flex: '1 1 260px', minWidth: 220 }}>
            <h1 style={{ fontSize: shrunk ? 'var(--text-h3)' : 'var(--text-h2)', letterSpacing: 'var(--tracking-tight)', transition: 'font-size var(--duration-slow) var(--ease-out-soft)' }}>{title}</h1>
            {subtitle && !shrunk && <p style={{ marginTop: 5, fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>{subtitle}</p>}
          </div>
          <div style={{ flex: '0 1 auto', display: 'flex', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end', gap: 8 }}>{search}{actions}</div>
        </div>
        <div onScroll={(e) => setShrunk(e.currentTarget.scrollTop > 12)}
          style={{ position: 'relative', zIndex: 1, flex: 1, minHeight: 0, overflowY: scroll ? 'auto' : 'hidden', padding: '0 34px 56px' }}>{children}</div>
      </main>
    </div>
  )
}
