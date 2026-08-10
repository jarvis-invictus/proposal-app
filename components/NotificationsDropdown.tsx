'use client'

import { useState, useEffect, useRef } from 'react'
import { Bell } from 'lucide-react'
import Link from 'next/link'

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
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <button 
        onClick={toggleDropdown}
        className="relative p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors focus:outline-none"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-indigo-600 text-[10px] font-medium text-white">
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-50">
          <div className="flex justify-between items-center px-4 py-3 border-b border-gray-100">
            <span className="text-sm font-medium text-gray-900">Notifications</span>
            {unreadCount > 0 && (
              <button 
                onClick={(e) => { e.stopPropagation(); markAsRead(); }} 
                className="text-xs text-indigo-600 hover:text-indigo-700 font-medium"
              >
                Mark all as read
              </button>
            )}
          </div>
          
          <div className="max-h-[300px] overflow-y-auto py-1">
            {isLoading && notifications.length === 0 ? (
              <div className="px-4 py-6 text-center text-sm text-gray-500">Loading...</div>
            ) : notifications.length === 0 ? (
              <div className="px-4 py-6 text-center text-sm text-gray-500">No notifications yet.</div>
            ) : (
              notifications.map((notification) => (
                <div 
                  key={notification.id} 
                  className={`flex flex-col items-start px-4 py-3 gap-1 ${!notification.read ? 'bg-indigo-50/40' : 'hover:bg-gray-50'}`}
                >
                  <div className="flex justify-between items-start w-full gap-2">
                    <p className={`text-sm ${!notification.read ? 'font-medium text-gray-900' : 'text-gray-600'}`}>
                      {notification.message}
                    </p>
                    {!notification.read && (
                      <span className="flex-shrink-0 w-2 h-2 rounded-full bg-indigo-600 mt-1.5" />
                    )}
                  </div>
                  
                  <div className="flex items-center justify-between w-full mt-1">
                    <span className="text-xs text-gray-400">
                      {formatTimeAgo(notification.created_at)}
                    </span>
                    
                    <div className="flex items-center gap-3">
                      {notification.proposals?.slug && (
                        <Link 
                          href={`/dashboard/proposals/${notification.proposals.slug}`}
                          className="text-xs font-medium text-indigo-600 hover:text-indigo-800"
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
                          className="text-xs text-gray-500 hover:text-gray-700"
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
