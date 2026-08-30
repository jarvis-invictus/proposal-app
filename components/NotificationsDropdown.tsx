'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { Icon } from './ui/Icon'
import { IconButton } from './ui/IconButton'

type Notification = {
  id: string
  message: string
  read: boolean
  created_at: string
  proposals: { slug: string } | null
}

function formatTimeAgo(dateString: string) {
  const date = new Date(dateString)
  const now = new Date()
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000)

  if (seconds < 60) return 'just now'

  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`

  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`

  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`

  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(date)
}

export function NotificationsDropdown() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const unreadCount = notifications.filter(n => !n.read).length

  useEffect(() => {
    fetchNotifications()
  }, [])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const fetchNotifications = async () => {
    setIsLoading(true)
    try {
      const res = await fetch('/api/notifications')
      if (res.ok) {
        const data = await res.json()
        setNotifications(data.notifications || [])
      }
    } catch (error) {
      console.error('Failed to fetch notifications', error)
    } finally {
      setIsLoading(false)
    }
  }

  const markAsRead = async (id?: string) => {
    try {
      await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      })
      // Optimistic update
      setNotifications(prev => prev.map(n =>
        (id ? n.id === id : true) ? { ...n, read: true } : n
      ))
    } catch (error) {
      console.error('Failed to mark as read', error)
    }
  }

  const toggleDropdown = () => {
    setIsOpen(!isOpen)
    if (!isOpen) {
      fetchNotifications()
    }
  }

  return (
    <div style={{ position: 'relative', display: 'inline-block' }} ref={dropdownRef}>
      <span style={{ position: 'relative', display: 'inline-flex' }}>
        <IconButton icon="bell" variant="ghost" label="Notifications" onClick={toggleDropdown} />
        {unreadCount > 0 && (
          <span style={{
            position: 'absolute', top: -2, right: -2, display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: 16, height: 16, borderRadius: 'var(--radius-pill)', background: 'var(--brand-deep)',
            color: 'var(--text-inverse)', fontSize: 10, fontWeight: 'var(--weight-medium)',
          }}>
            {unreadCount}
          </span>
        )}
      </span>

      {isOpen && (
        <div className="liquid liquid-strong" style={{
          position: 'absolute', right: 0, top: 'calc(100% + 8px)', width: 320, zIndex: 50,
          borderRadius: 'var(--radius-card)', boxShadow: 'var(--shadow-raised)', overflow: 'hidden',
          animation: 'fade-up var(--duration-base) var(--ease-out-soft) both',
        }}>
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px',
            borderBottom: '1px solid var(--border-hairline)', fontFamily: 'var(--font-sans)',
          }}>
            <span style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-medium)', color: 'var(--text-primary)' }}>Notifications</span>
            {unreadCount > 0 && (
              <button
                onClick={(e) => { e.stopPropagation(); markAsRead(); }}
                style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: 'var(--text-xs)', color: 'var(--brand-deep)', fontWeight: 'var(--weight-medium)' }}
              >
                Mark all as read
              </button>
            )}
          </div>

          <div style={{ maxHeight: 300, overflowY: 'auto', padding: '4px 0' }}>
            {isLoading && notifications.length === 0 ? (
              <div style={{ padding: '24px 16px', textAlign: 'center', fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>Loading...</div>
            ) : notifications.length === 0 ? (
              <div style={{ padding: '24px 16px', textAlign: 'center', fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>No notifications yet.</div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 4, padding: '12px 16px',
                    background: !notification.read ? 'var(--brand-12)' : 'transparent',
                    fontFamily: 'var(--font-sans)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', width: '100%', gap: 8 }}>
                    <p style={{
                      margin: 0, fontSize: 'var(--text-sm)',
                      fontWeight: !notification.read ? 'var(--weight-medium)' : 'var(--weight-regular)',
                      color: !notification.read ? 'var(--text-primary)' : 'var(--text-secondary)',
                    }}>
                      {notification.message}
                    </p>
                    {!notification.read && (
                      <span style={{ flex: 'none', width: 6, height: 6, marginTop: 6, borderRadius: 'var(--radius-pill)', background: 'var(--brand-deep)' }} />
                    )}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginTop: 4 }}>
                    <span style={{ fontSize: 'var(--text-micro)', color: 'var(--text-muted)' }}>
                      {formatTimeAgo(notification.created_at)}
                    </span>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      {notification.proposals?.slug && (
                        <Link
                          href={`/dashboard/proposals/${notification.proposals.slug}`}
                          style={{ fontSize: 'var(--text-micro)', fontWeight: 'var(--weight-medium)', color: 'var(--brand-deep)' }}
                          onClick={() => {
                            if (!notification.read) markAsRead(notification.id)
                            setIsOpen(false)
                          }}
                        >
                          View
                        </Link>
                      )}
                      {!notification.read && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            markAsRead(notification.id)
                          }}
                          style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: 'var(--text-micro)', color: 'var(--text-muted)' }}
                        >
                          Dismiss
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
