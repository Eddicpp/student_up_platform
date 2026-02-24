'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/app/context/UserContext'
import ChatWidget from '@/components/ChatWidget'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false)
  const [notifications, setNotifications] = useState<any[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  
  const notificationRef = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const pathname = usePathname() 
  const supabase = createClient()
  
  const { user, loading: userLoading } = useUser()

  // Chiudi menu con ESC
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsMenuOpen(false)
        setIsNotificationsOpen(false)
      }
    }
    window.addEventListener('keydown', handleEsc)
    return () => window.removeEventListener('keydown', handleEsc)
  }, [])

  // Chiudi notifiche cliccando fuori
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setIsNotificationsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Fetch notifiche
  useEffect(() => {
    const fetchNotifications = async () => {
      if (!user) return
      
      const { data: notifiche, error } = await supabase
        .from('notifica')
        .select('*')
        .eq('utente_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10)

      if (error) {
        console.error('Errore fetch notifiche:', error)
        return
      }

      if (notifiche) {
        setNotifications(notifiche)
        setUnreadCount(notifiche.filter((n: any) => !n.letto).length)
      }
    }

    fetchNotifications()
    const interval = setInterval(fetchNotifications, 30000)
    return () => clearInterval(interval)
  }, [supabase, pathname, user])

  const handleNotificationClick = async (notification: any) => {
    if (!notification.letto) {
      await supabase
        .from('notifica')
        .update({ letto: true })
        .eq('id', notification.id)

      setNotifications(prev => 
        prev.map(n => n.id === notification.id ? { ...n, letto: true } : n)
      )
      setUnreadCount(prev => Math.max(0, prev - 1))
    }

    setIsNotificationsOpen(false)
    if (notification.link) {
      router.push(notification.link)
    }
  }

  const markAllAsRead = async () => {
    if (!user) return
    
    await supabase
      .from('notifica')
      .update({ letto: true })
      .eq('utente_id', user.id)
      .eq('letto', false)

    setNotifications(prev => prev.map(n => ({ ...n, letto: true })))
    setUnreadCount(0)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Ora'
    if (diffMins < 60) return `${diffMins}m fa`
    if (diffHours < 24) return `${diffHours}h fa`
    if (diffDays < 7) return `${diffDays}g fa`
    return date.toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })
  }

  const getNotificationIcon = (tipo: string) => {
    switch (tipo) {
      case 'candidatura_ricevuta': return '📩'
      case 'candidatura_accettata': return '✅'
      case 'candidatura_rifiutata': return '❌'
      case 'nuovo_membro': return '👋'
      case 'bando_aggiornato': return '📝'
      case 'benvenuto': return '🎉'
      case 'messaggio_privato': return '💬'
      default: return '🔔'
    }
  }

  // Menu items con icone SVG
  const menuItems = [
    {
      href: '/dashboard',
      label: 'Home',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      )
    },
    {
      href: '/dashboard/my-projects',
      label: 'I Miei Progetti',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
        </svg>
      )
    },
    {
      href: '/dashboard/my_applications',
      label: 'Candidature',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      )
    },
    {
      href: '/dashboard/create-project',
      label: 'Crea Progetto',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
        </svg>
      ),
      highlight: true
    },
  ]

  const secondaryItems = [
    {
      href: '/dashboard/messages',
      label: 'Messaggi',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      )
    },
    {
      href: '/dashboard/notifications',
      label: 'Notifiche',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
      ),
      badge: unreadCount
    },
    {
      href: '/dashboard/profile',
      label: 'Profilo',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      )
    },
  ]

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard'
    return pathname?.startsWith(href)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* NAVBAR */}
      <nav className="fixed top-0 w-full h-16 z-50 bg-white/90 backdrop-blur-xl border-b-2 border-gray-900">
        <div className="h-full px-4 lg:px-6 flex items-center justify-between">
          
          {/* Left: Menu + Logo */}
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="p-2 hover:bg-gray-100 rounded-xl text-gray-600 hover:text-gray-900 transition-colors border-2 border-transparent hover:border-gray-300"
              aria-label="Menu"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>

            <Link href="/dashboard" className="flex items-center gap-2 group">
              <div className="w-9 h-9 bg-gray-900 rounded-xl flex items-center justify-center border-2 border-gray-700 shadow-[2px_2px_0px_0px_rgba(0,0,0,0.3)] group-hover:shadow-none group-hover:translate-x-[2px] group-hover:translate-y-[2px] transition-all">
                <span className="text-white font-black text-sm italic">S</span>
              </div>
              <span className="font-black text-gray-900 hidden sm:block">StudentUP</span>
            </Link>
          </div>

          {/* Right: Actions - allineamento pulito */}
          <div className="flex items-center gap-2">
            
            {/* Notifications */}
            <div className="relative" ref={notificationRef}>
              <button 
                onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                className={`relative w-10 h-10 rounded-xl flex items-center justify-center transition-all border-2 ${
                  isNotificationsOpen 
                    ? 'bg-gray-900 text-white border-gray-700' 
                    : 'hover:bg-gray-100 text-gray-600 hover:text-gray-900 border-transparent hover:border-gray-300'
                }`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-600 text-white text-[10px] font-black rounded-full flex items-center justify-center border-2 border-white">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {/* Notifications Dropdown */}
              {isNotificationsOpen && (
                <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-white rounded-2xl border-2 border-gray-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] overflow-hidden">
                  <div className="p-4 border-b-2 border-gray-200 flex items-center justify-between bg-gray-50">
                    <h3 className="font-black text-gray-900">🔔 Notifiche</h3>
                    {unreadCount > 0 && (
                      <button 
                        onClick={markAllAsRead}
                        className="text-xs text-red-600 hover:text-red-700 font-bold transition-colors"
                      >
                        Segna tutte lette
                      </button>
                    )}
                  </div>

                  <div className="max-h-[400px] overflow-y-auto">
                    {notifications.length > 0 ? (
                      notifications.map((notifica) => (
                        <button
                          key={notifica.id}
                          onClick={() => handleNotificationClick(notifica)}
                          className={`w-full p-4 text-left border-b border-gray-100 hover:bg-gray-50 transition-colors flex gap-3 ${
                            !notifica.letto ? 'bg-red-50/50' : ''
                          }`}
                        >
                          <span className="text-xl flex-shrink-0 mt-0.5">
                            {getNotificationIcon(notifica.tipo)}
                          </span>
                          
                          <div className="flex-1 min-w-0">
                            {notifica.titolo && (
                              <p className="text-sm font-bold text-gray-900 mb-0.5">{notifica.titolo}</p>
                            )}
                            <p className={`text-sm leading-relaxed ${!notifica.letto ? 'text-gray-900 font-medium' : 'text-gray-600'}`}>
                              {notifica.messaggio || notifica.tipo}
                            </p>
                            <p className="text-xs text-gray-400 mt-1 font-medium">
                              {formatTimeAgo(notifica.created_at)}
                            </p>
                          </div>

                          {!notifica.letto && (
                            <span className="w-2 h-2 bg-red-500 rounded-full flex-shrink-0 mt-2" />
                          )}
                        </button>
                      ))
                    ) : (
                      <div className="p-8 text-center">
                        <span className="text-4xl block mb-2">🔔</span>
                        <p className="text-gray-500 font-bold">Nessuna notifica</p>
                      </div>
                    )}
                  </div>

                  {notifications.length > 0 && (
                    <div className="p-3 border-t-2 border-gray-200 bg-gray-50">
                      <Link 
                        href="/dashboard/notifications"
                        onClick={() => setIsNotificationsOpen(false)}
                        className="block text-center text-sm text-gray-600 hover:text-gray-900 font-bold transition-colors"
                      >
                        Vedi tutte →
                      </Link>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Avatar - Solo foto profilo */}
            <Link 
              href="/dashboard/profile" 
              className="w-10 h-10 rounded-xl overflow-hidden border-2 border-gray-900 hover:border-gray-700 transition-all hover:scale-105 flex-shrink-0"
            >
              {user ? (
                <img 
                  src={user.avatar_url || '/default-avatar.png'} 
                  alt="Profilo"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gray-200 animate-pulse" />
              )}
            </Link>
          </div>
        </div>
      </nav>

      {/* SIDEBAR */}
      <div className={`fixed inset-0 z-40 transition-all duration-300 ${isMenuOpen ? 'visible' : 'invisible'}`}>
        {/* Overlay */}
        <div 
          className={`absolute inset-0 bg-black/30 backdrop-blur-sm transition-opacity duration-300 ${
            isMenuOpen ? 'opacity-100' : 'opacity-0'
          }`}
          onClick={() => setIsMenuOpen(false)}
        />
        
        {/* Panel */}
        <div className={`
          absolute left-0 top-0 h-full w-72 bg-white border-r-2 border-gray-900 shadow-[4px_0px_0px_0px_rgba(0,0,0,1)] flex flex-col
          transition-transform duration-300 ease-out
          ${isMenuOpen ? 'translate-x-0' : '-translate-x-full'}
        `}>
          {/* Header */}
          <div className="p-4 border-b-2 border-gray-900 bg-gray-50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-gray-900 rounded-xl flex items-center justify-center">
                  <span className="text-white font-black text-sm italic">S</span>
                </div>
                <span className="font-black text-gray-900">StudentUP</span>
              </div>
              <button 
                onClick={() => setIsMenuOpen(false)}
                className="p-2 hover:bg-gray-200 rounded-xl text-gray-600 hover:text-gray-900 transition-colors border-2 border-transparent hover:border-gray-300"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* User Card */}
          <div className="px-4 py-3">
            {user ? (
              <Link 
                href="/dashboard/profile" 
                onClick={() => setIsMenuOpen(false)}
                className="flex items-center gap-3 p-3 rounded-xl border-2 border-gray-200 hover:border-gray-900 bg-white transition-all"
              >
                <img 
                  src={user.avatar_url || '/default-avatar.png'} 
                  alt=""
                  className="w-10 h-10 rounded-xl object-cover border-2 border-gray-900"
                />
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-gray-900 text-sm truncate">
                    {user.nome} {user.cognome}
                  </p>
                  <p className="text-xs text-gray-500 font-medium">
                    Vedi profilo →
                  </p>
                </div>
              </Link>
            ) : (
              <div className="flex items-center gap-3 p-3">
                <div className="w-10 h-10 rounded-xl bg-gray-200 animate-pulse" />
                <div className="flex-1">
                  <div className="w-24 h-4 bg-gray-200 rounded animate-pulse mb-1" />
                  <div className="w-16 h-3 bg-gray-200 rounded animate-pulse" />
                </div>
              </div>
            )}
          </div>

          <div className="h-0.5 bg-gray-200 mx-4" />

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto p-3 space-y-1">
            {menuItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsMenuOpen(false)}
                className={`
                  flex items-center gap-3 px-3 py-3 rounded-xl font-bold text-sm transition-all border-2
                  ${isActive(item.href)
                    ? 'bg-gray-900 text-white border-gray-700'
                    : item.highlight
                      ? 'bg-red-600 text-white border-red-700 hover:bg-red-700'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 border-transparent hover:border-gray-300'
                  }
                `}
              >
                {item.icon}
                {item.label}
              </Link>
            ))}

            <div className="h-0.5 bg-gray-200 my-3" />

            {secondaryItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsMenuOpen(false)}
                className={`
                  flex items-center gap-3 px-3 py-3 rounded-xl font-bold text-sm transition-all border-2
                  ${isActive(item.href)
                    ? 'bg-gray-900 text-white border-gray-700'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 border-transparent hover:border-gray-300'
                  }
                `}
              >
                {item.icon}
                {item.label}
                {item.badge && item.badge > 0 && (
                  <span className="ml-auto bg-red-600 text-white text-xs px-2 py-0.5 rounded-full font-black">
                    {item.badge}
                  </span>
                )}
              </Link>
            ))}

            {/* Admin Link */}
            {user?.is_system_admin && (
              <>
                <div className="h-0.5 bg-gray-200 my-3" />
                <Link
                  href="/dashboard/admin"
                  onClick={() => setIsMenuOpen(false)}
                  className="flex items-center gap-3 px-3 py-3 rounded-xl font-bold text-sm text-amber-700 bg-amber-100 hover:bg-amber-200 transition-all border-2 border-amber-300"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Pannello Admin
                </Link>
              </>
            )}

            <div className="h-0.5 bg-gray-200 my-3" />

            {/* Credits */}
            <Link
              href="/dashboard/credits"
              onClick={() => setIsMenuOpen(false)}
              className={`
                flex items-center gap-3 px-3 py-3 rounded-xl font-bold text-sm transition-all border-2
                ${isActive('/dashboard/credits')
                  ? 'bg-gray-900 text-white border-gray-700'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 border-transparent hover:border-gray-300'
                }
              `}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
              Ringraziamenti
            </Link>

            {/* Logout */}
            <button 
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-3 py-3 rounded-xl font-bold text-sm text-gray-600 hover:bg-red-50 hover:text-red-600 transition-all border-2 border-transparent hover:border-red-300"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Esci
            </button>
          </nav>

          {/* Footer */}
          <div className="p-4 border-t-2 border-gray-200 bg-gray-50">
            <p className="text-[11px] text-gray-500 text-center font-bold">
              StudentUP v1.0 • Made with ❤️ in Italy
            </p>
          </div>
        </div>
      </div>

      {/* MAIN CONTENT */}
      <main className="pt-16 min-h-screen">
        <div className="max-w-7xl mx-auto p-4 lg:p-8">
          {children}
        </div>
      </main>

      {/* CHAT WIDGET - Sempre visibile */}
      <ChatWidget />
    </div>
  )
}