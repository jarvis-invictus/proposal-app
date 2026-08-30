'use client'

import * as React from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { SidebarNav } from '@/components/app/SidebarNav'
import { NotificationsDropdown } from '@/components/NotificationsDropdown'
import { logout } from '../(auth)/actions'

const NAV_ITEMS = [
  { id: 'proposals', href: '/dashboard', label: 'Proposals', icon: 'file-text' },
  { id: 'templates', href: '/dashboard/templates', label: 'Templates', icon: 'layout-template' },
  { id: 'brand', href: '/dashboard/brand-kit', label: 'Brand kits', icon: 'palette' },
]

export function DashboardShell({ userEmail, children }: { userEmail: string; children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const active = [...NAV_ITEMS].reverse().find(i => pathname === i.href || pathname.startsWith(i.href + '/'))?.id ?? 'proposals'

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--surface-page)' }}>
      <SidebarNav
        active={active}
        items={NAV_ITEMS.map(({ id, label, icon }) => ({ id, label, icon }))}
        onSelect={(id) => {
          const item = NAV_ITEMS.find(i => i.id === id)
          if (item) router.push(item.href)
        }}
      />
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        <div style={{
          display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 16, padding: '14px 32px',
          borderBottom: '1px solid var(--border-hairline)', background: 'var(--glass-quiet)',
          backdropFilter: 'var(--blur-glass)', WebkitBackdropFilter: 'var(--blur-glass)', fontFamily: 'var(--font-sans)',
        }}>
          <NotificationsDropdown />
          <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>{userEmail}</span>
          <form action={logout}>
            <button type="submit" style={{
              border: 'none', background: 'none', cursor: 'pointer', fontSize: 'var(--text-sm)',
              color: 'var(--text-secondary)', fontWeight: 'var(--weight-medium)', fontFamily: 'var(--font-sans)',
            }}>
              Log out
            </button>
          </form>
        </div>
        <div style={{ flex: 1, padding: 32 }}>{children}</div>
      </div>
    </div>
  )
}
