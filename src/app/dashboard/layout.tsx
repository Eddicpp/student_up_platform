'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/app/context/UserContext'
import ChatWidget from '@/components/ChatWidget'

// Targhetta Staff SVG (copiata da SuperAvatar)
const TarghettaStaffSVG = () => (
  <svg viewBox="0 0 210 100" className="w-full h-full text-black drop-shadow-md" xmlns="http://www.w3.org/2000/svg">
    <g>
      <path fill="currentColor" d="M 114.46137,35.894326 C 108.28212,42.084165 10.536159,33.4773 7.3691545,42.280406 0.41073692,61.622245 1.4753603,96.742849 2.2329128,117.28433 c 0.6389365,17.32514 160.5200172,0.23549 198.3695572,4.60906 3.72556,0.43049 5.57969,-85.145946 3.26632,-89.180287 -1.5456,-2.695416 -85.99538,-0.236669 -89.40742,3.181223 z m 3.8454,2.091701 c 18.29016,1.716012 78.85265,-7.765867 78.93169,-0.507031 0.17022,15.633844 7.93646,85.173064 -0.29839,82.629744 -22.02369,-6.80196 -150.279352,7.52444 -185.391769,-4.04721 -16.1430729,-5.32011 0.465712,-55.428094 2.360938,-73.479723 0.618496,-5.891047 89.079381,-0.766256 104.397481,-4.59578 9.23723,-2.309306 3e-5,-2e-6 5e-5,0 z" transform="translate(1.152652,-29.200517)" />
      <path fill="#ffffff" d="m 85.872573,22.668822 c -6.852793,-1.451627 -13.526402,-2.71632 -20.555627,-3.073738 -3.49127,-0.177522 -8.177448,-0.295359 -11.52652,0.960543 -0.164859,0.06182 -2.334379,1.047768 -2.497413,1.536869 -0.284223,0.852669 -0.151296,1.791658 -0.192108,2.689522 -0.200422,4.409289 0.735785,9.98344 4.22639,13.063389 0.519383,0.458277 1.083945,0.900247 1.728978,1.152652 0.853819,0.334102 1.79337,0.382564 2.689522,0.576326 1.473192,0.318529 2.93943,0.670531 4.418499,0.960543 5.994387,1.175369 12.222501,1.764681 18.058214,3.650065 4.884232,1.577983 7.11173,1.598284 7.876456,6.339586 0.15295,0.948288 0.150915,1.933016 0,2.88163 -0.300149,1.886659 -0.664673,3.78592 -1.344761,5.571151 -0.360445,0.946171 -1.098955,1.704803 -1.728978,2.497413 -1.876661,2.360961 -4.389517,5.512091 -6.915912,7.492237 -1.412102,1.106784 -2.918497,2.089365 -4.418499,3.073739 -0.551201,0.361725 -1.078095,0.855562 -1.728978,0.960543 -1.023745,0.165122 -5.699459,0.07261 -7.108021,-0.384217 -1.472022,-0.477411 -2.813505,-1.289796 -4.22639,-1.921087 -1.596872,-0.713496 -3.238344,-1.331007 -4.802717,-2.113195 -3.170957,-1.585478 -4.736719,-2.658782 -7.492238,-4.610608 -0.826225,-0.585242 -1.706782,-1.096473 -2.497413,-1.728978 -0.158125,-0.1265 -0.101547,-0.395203 -0.192108,-0.576326" />
      <path d="m 60.706338,30.737387 c -1.327492,-1.352329 -3.18448,-2.121835 -4.802717,-3.073739 -2.897182,-1.704225 -5.791033,-3.055329 -9.029107,-4.034282 -1.65045,-0.498973 -3.308125,-0.986976 -4.994825,-1.344761 -1.070219,-0.227016 -2.547152,0 -3.650065,0 -2.032177,0 -5.775439,0.03266 -7.492238,0.768435 -1.53004,0.655732 -2.659867,1.638404 -4.034282,2.497413 -0.242848,0.15178 -0.551,0.197844 -0.768435,0.384217 -0.486198,0.416742 -0.768434,1.02458 -1.152652,1.536869 -0.958768,1.27836 -1.634688,2.811709 -1.152652,4.4185 0.49647,1.6549 3.846058,4.347599 5.186934,5.379042 3.48074,2.677491 7.653436,4.238813 11.718629,5.76326 3.531751,1.324406 6.905728,2.740046 10.373868,4.226391 2.883291,1.235697 5.586148,2.240457 8.068564,4.22639 0.710689,0.568553 1.446262,1.109681 2.113195,1.728978 1.431092,1.328873 1.978877,4.26701 2.113195,6.147478 0.21625,3.027486 -1.408615,5.881928 -3.073738,8.260672 -0.214125,0.305896 -0.330446,0.679537 -0.576326,0.960544 -0.104273,0.11917 -1.518198,1.396349 -1.728978,1.536869 -0.238281,0.158856 -0.551,0.197845 -0.768435,0.384217 -0.243099,0.208373 -0.349925,0.542033 -0.576326,0.768435 -0.609185,0.609187 -1.248352,1.190791 -1.921087,1.728978 -0.61373,0.490984 -1.976334,1.404802 -2.689521,1.728978 -0.368699,0.167589 -0.790408,0.203097 -1.152652,0.384217 -0.286377,0.14319 -0.488545,0.420833 -0.768435,0.576326 -0.62585,0.347694 -1.269312,0.664284 -1.921086,0.960543 -0.3687,0.16759 -0.790409,0.203097 -1.152652,0.384218 -2.229448,1.114724 0.0049,0.526473 -2.689521,1.536869 -0.494435,0.185412 -1.032849,0.226711 -1.53687,0.384217 -3.736334,1.167607 0.153903,0.07677 -2.497412,0.960544 -0.717831,0.394062 -1.546625,0.348723 -2.305304,0.576326 -0.330304,0.09909 -0.623909,0.309409 -0.960544,0.384217 -0.250044,0.05557 -0.514863,-0.03622 -0.768434,0 -0.200465,0.02864 -0.375862,0.16347 -0.576326,0.192109 -1.987325,0.283903 -4.204468,-0.06038 -6.147478,-0.384218 -0.868688,-0.14478 -5.799034,-0.6121 -6.339586,-1.152652 -0.10125,-0.10125 -0.09086,-0.282966 -0.192108,-0.384217 -0.04528,-0.04528 -0.138827,0.03552 -0.192109,0 -0.197474,-0.131649 -1.217895,-1.475245 -1.344761,-1.728978 -0.05727,-0.114551 0.03518,-0.261072 0,-0.384217 -0.306099,-1.071346 -1.373518,-2.411135 -0.960543,-3.650065 0.22501,-0.675026 1.607365,-1.39728 2.305304,-1.536869 0.556649,-0.111329 2.933499,-0.454337 3.457956,-0.192109 0.66529,0.332645 1.538219,1.538219 2.113195,2.113195 0.232275,0.232276 0.80191,0.338379 0.960544,0.576326 0.07104,0.106564 -0.09056,0.293656 0,0.384218 0.286379,0.286379 0.751721,0.326943 1.152652,0.384217 1.566904,0.223843 4.248962,0.06027 5.76326,-0.192109 0.833606,-0.138932 1.689536,-0.548105 2.497412,-0.768434 2.756969,-0.751901 5.417381,-1.127001 8.068564,-2.305304 0.684924,-0.304411 1.455193,-0.409522 2.113195,-0.768435 1.039763,-0.567142 2.128626,-1.630225 3.073739,-2.305304 0.654172,-0.467265 1.379215,-0.694515 1.921087,-1.34476 0.630317,-0.756378 1.563925,-2.46764 1.728978,-3.457956 0.301405,-1.808433 -0.460836,0.940543 0.192108,-1.344761 0.138973,-0.486402 0.495811,-1.053777 0.576326,-1.536869 0.09267,-0.556028 -0.110603,-1.175957 0,-1.728978 0.145873,-0.729364 0.319884,-1.538664 0.192109,-2.305304 -0.209762,-1.258565 -0.08436,0.02339 -0.576326,-0.960544 -0.30435,-0.6087 0.39755,-0.178776 -0.192109,-0.768434 -0.10125,-0.101251 -0.282966,-0.09086 -0.384217,-0.192109 -0.202499,-0.202499 -0.181716,-0.565933 -0.384217,-0.768435 -0.101251,-0.10125 -0.282967,-0.09086 -0.384218,-0.192108 -0.10125,-0.101251 -0.09086,-0.282967 -0.192108,-0.384218 -0.466617,-0.466616 -0.280461,-0.117803 -0.768435,-0.768434 -0.764572,-1.019432 0.0019,7.93e-4 -0.768435,-0.384218 -0.380219,-0.190108 -0.496964,-0.689073 -0.768434,-0.960543 -0.273958,-0.273957 -0.660451,-0.159147 -0.960544,-0.384217 -0.114551,-0.08591 -0.07756,-0.298305 -0.192108,-0.384218 -0.424524,-0.318391 -1.103188,-0.22938 -1.53687,-0.576326 -0.353581,-0.282863 -0.540125,-0.792376 -0.960543,-0.960543 -0.178369,-0.07135 -0.397957,0.07135 -0.576326,0 -0.168166,-0.06727 -0.239318,-0.275545 -0.384217,-0.384217 -0.114552,-0.08591 -0.282967,-0.09086 -0.384218,-0.192109 -0.10125,-0.101251 -0.07756,-0.298304 -0.192108,-0.384217 -0.161999,-0.1215 -0.402683,-0.08792 -0.576326,-0.192109 -0.310621,-0.186372 -0.478639,-0.551087 -0.768435,-0.768435 -0.64448,-0.483359 -1.294392,-0.874739 -1.921086,-1.34476 -0.522306,-0.391732 -1.251085,-0.48265 -1.728978,-0.960544 -0.101251,-0.10125 -0.07756,-0.298304 -0.192109,-0.384217 -0.467109,-0.350329 -1.236414,-0.39901 -1.728978,-0.768435 -0.295,-0.221249 -0.63295,-0.604639 -0.960543,-0.768434 -0.114552,-0.05728 -0.277654,0.07104 -0.384218,0 -0.119139,-0.07943 -0.07297,-0.30479 -0.192108,-0.384218 -0.106564,-0.07104 -0.259969,0.03106 -0.384218,0 -0.776636,-0.194159 -1.560047,-0.662439 -2.305304,-0.960543 -0.499144,0.134644 -0.333324,-0.454827 -0.576326,-0.576326 -0.171825,-0.08591 -0.394075,0.06075 -0.576326,0 -0.631417,-0.210473 -1.505691,-0.8489 -2.113195,-1.152652 -0.565616,-0.282808 -1.175202,-0.436171 -1.728978,-0.768434 -1.022077,-0.613246 -0.154548,-0.128789 -1.152652,-0.960544 -1.089004,-0.907502 -0.02947,0.171061 -1.344761,-0.768434 -1.54709,-1.105064 -2.641801,-2.401727 -3.842173,-3.842174 -0.746911,-0.896292 -1.524995,-1.66017 -2.113195,-2.689521 -0.460947,-0.806656 -0.384218,-3.956424 -0.384218,-4.994825 0,-1.059451 0.593474,-2.130344 1.344761,-2.88163 1.778611,-1.778611 -0.735663,1.242491 1.152652,-0.960544 0.414234,-0.483272 0.625782,-0.968425 1.152652,-1.34476 1.057587,-0.75542 2.273006,-1.235249 3.457956,-1.728978 0.396526,-0.165218 0.745128,-0.440485 1.152652,-0.576326 0.560089,-0.186696 1.156221,-0.241028 1.728978,-0.384218 1.556806,-0.389201 3.202784,-0.792129 4.802717,-0.960543 1.082635,-0.113961 2.177232,0 3.265847,0 1.524725,0 3.089434,-0.101411 4.610608,0 0.515133,0.03434 1.021485,0.161792 1.536869,0.192109 0.575331,0.03384 1.158444,-0.0815 1.728978,0 0.341381,0.04877 0.630243,0.285126 0.960543,0.384217 1.37368,0.412104 2.987723,0.748627 4.226391,1.536869 0.42195,0.268513 0.730705,0.692032 1.152652,0.960544 0.532085,0.338598 1.17766,0.462147 1.728978,0.768434 2.938248,1.632361 -0.572968,-0.354375 1.536869,1.152652 0.233037,0.166455 0.526828,0.230468 0.768435,0.384218 2.143003,1.363729 3.650065,3.177043 3.650065,5.76326 0,0.320181 0.164732,0.68599 0,0.960543 -0.30375,0.506251 -0.768435,0.896506 -1.152652,1.344761 z" />
    </g>
  </svg>
);

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

            {/* Avatar - Solo foto con bordo */}
            <Link 
              href="/dashboard/profile" 
              className="w-10 h-10 rounded-xl overflow-hidden border-2 border-gray-900 flex-shrink-0 hover:scale-105 transition-transform"
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

          {/* Staff Badge - Solo se è staff */}
          {user?.is_system_admin && (
            <div className="px-6 py-3 flex justify-center">
              <div className="w-24">
                <TarghettaStaffSVG />
              </div>
            </div>
          )}

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