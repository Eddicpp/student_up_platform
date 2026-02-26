'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'miei_progetti' | 'candidature' | 'sistema'>('miei_progetti')
  
  const supabase = createClient()
  const router = useRouter()

  // Fetch notifiche
  const fetchNotifiche = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      const { data, error } = await supabase
        .from('notifica')
        .select('*')
        .eq('utente_id', user.id)
        .order('created_at', { ascending: false })

      if (error) {
        console.error("Errore dettagliato:", error.message, error.details)
        return
      }

      setNotifications(data || [])
    } catch (err) {
      console.error("Errore imprevisto:", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchNotifiche()
  }, [])

  // Raggruppa le notifiche
  const getGroupedNotifications = () => {
    const grouped = {
      miei_progetti: [] as any[],
      candidature: [] as any[],
      sistema: [] as any[]
    }

    notifications.forEach((n: any) => {
      if (n.bando_id) {
        if (n.tipo === 'candidatura_ricevuta') {
          grouped.miei_progetti.push(n)
        } else if (n.tipo === 'candidatura_accettata' || n.tipo === 'candidatura_rifiutata') {
          grouped.candidature.push(n)
        } else {
          grouped.miei_progetti.push(n)
        }
      } else {
        grouped.sistema.push(n)
      }
    })

    return grouped
  }

  const getFiltered = () => {
    const grouped = getGroupedNotifications()
    return grouped[activeTab]
  }

  // Segna come letta e naviga
  const markAsRead = async (n: any) => {
    if (!n.letto) {
      await supabase.from('notifica').update({ letto: true }).eq('id', n.id)
      setNotifications(prev => prev.map(notif => 
        notif.id === n.id ? { ...notif, letto: true } : notif
      ))
    }
    if (n.link) router.push(n.link)
  }

  // Segna tutte come lette per la tab corrente
  const markAllAsRead = async () => {
    const currentList = getFiltered()
    const unreadIds = currentList.filter(n => !n.letto).map(n => n.id)
    
    if (unreadIds.length > 0) {
      await supabase
        .from('notifica')
        .update({ letto: true })
        .in('id', unreadIds)

      setNotifications(prev => prev.map(n => 
        unreadIds.includes(n.id) ? { ...n, letto: true } : n
      ))
    }
  }

  // Elimina notifica
  const deleteNotification = async (e: React.MouseEvent, notificationId: string) => {
    e.stopPropagation()
    await supabase.from('notifica').delete().eq('id', notificationId)
    setNotifications(prev => prev.filter(n => n.id !== notificationId))
  }

  // Formatta data
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Adesso'
    if (diffMins < 60) return `${diffMins}m fa`
    if (diffHours < 24) return `${diffHours}h fa`
    if (diffDays < 7) return `${diffDays}g fa`
    return date.toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })
  }

  // Icona e stile cartoon per tipo notifica
  const getNotificationStyle = (tipo: string) => {
    switch (tipo) {
      case 'candidatura_ricevuta': 
        return { icon: '📩', bg: 'bg-blue-400', text: 'text-gray-900' }
      case 'candidatura_accettata': 
        return { icon: '✅', bg: 'bg-green-400', text: 'text-gray-900' }
      case 'candidatura_rifiutata': 
        return { icon: '❌', bg: 'bg-red-400', text: 'text-white' }
      case 'nuovo_membro': 
        return { icon: '👋', bg: 'bg-purple-400', text: 'text-gray-900' }
      case 'bando_aggiornato': 
        return { icon: '📝', bg: 'bg-orange-400', text: 'text-gray-900' }
      case 'benvenuto': 
        return { icon: '🎉', bg: 'bg-pink-400', text: 'text-gray-900' }
      default: 
        return { icon: '🔔', bg: 'bg-gray-300', text: 'text-gray-900' }
    }
  }

  // Tabs con emoji
  const tabs = [
    { id: 'miei_progetti' as const, label: 'I Miei Progetti', desc: 'Candidature ricevute', icon: '📁', color: 'bg-amber-400' },
    { id: 'candidature' as const, label: 'Le Mie Candidature', desc: 'Risposte ricevute', icon: '🚀', color: 'bg-blue-400' },
    { id: 'sistema' as const, label: 'Sistema', desc: 'Notifiche generali', icon: '⚙️', color: 'bg-emerald-400' }
  ]

  if (loading) return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="text-center">
        <div className="text-5xl sm:text-6xl animate-bounce mb-4">🔔</div>
        <p className="text-gray-900 font-black uppercase tracking-widest text-sm sm:text-base">Caricamento notifiche...</p>
      </div>
    </div>
  )

  const list = getFiltered()
  const grouped = getGroupedNotifications()
  const unreadCount = list.filter(n => !n.letto).length
  const totalUnread = notifications.filter(n => !n.letto).length

  const counts = {
    miei_progetti: grouped.miei_progetti.filter(n => !n.letto).length,
    candidature: grouped.candidature.filter(n => !n.letto).length,
    sistema: grouped.sistema.filter(n => !n.letto).length
  }

  return (
    <div className="max-w-5xl mx-auto pb-20 px-4 sm:px-6 mt-4 sm:mt-8">
      
      {/* HEADER CARTOON */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6 sm:mb-8">
        <div className="flex items-center gap-3 sm:gap-4">
          <button 
            onClick={() => router.push('/dashboard')}
            className="p-2 sm:p-3 bg-white border-2 sm:border-4 border-gray-900 rounded-xl shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
          >
            <span className="text-xl sm:text-2xl">🔙</span>
          </button>
          <div>
            <h1 className="text-3xl sm:text-5xl font-black text-gray-900 uppercase italic tracking-tighter leading-none">
              Notifiche <span className="text-red-600">🔔</span>
            </h1>
            <div className="inline-block bg-yellow-300 border-2 border-gray-900 px-2 sm:px-3 py-0.5 sm:py-1 rounded-lg shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] mt-2">
              <p className="text-gray-900 font-black text-[10px] sm:text-xs uppercase tracking-widest">
                {totalUnread > 0 ? `${totalUnread} non lette` : 'Tutto letto ✨'}
              </p>
            </div>
          </div>
        </div>

        {unreadCount > 0 && (
          <button
            onClick={markAllAsRead}
            className="self-start sm:self-auto px-4 py-2 sm:px-5 sm:py-3 bg-white border-2 sm:border-4 border-gray-900 rounded-xl font-black text-[10px] sm:text-xs uppercase tracking-widest text-gray-900 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all flex items-center gap-2"
          >
            <span>👀</span> Segna tutte lette
          </button>
        )}
      </div>

      {/* TABS SCROLLABILI SU MOBILE */}
      <div className="flex overflow-x-auto gap-2 sm:gap-3 pb-4 -mx-4 px-4 sm:mx-0 sm:px-0 hide-scrollbar snap-x mb-2 sm:mb-6">
        {tabs.map(tab => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 sm:px-5 sm:py-3 rounded-xl font-black text-[10px] sm:text-sm uppercase tracking-widest transition-all border-2 sm:border-4 border-gray-900 whitespace-nowrap snap-start shrink-0 ${
                isActive
                  ? 'bg-gray-900 text-white shadow-[2px_2px_0px_0px_rgba(220,38,38,1)] translate-x-[2px] translate-y-[2px]'
                  : 'bg-white text-gray-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:bg-gray-50 hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'
              }`}
            >
              <span className="text-base sm:text-xl">{tab.icon}</span>
              <span>{tab.label}</span>
              {counts[tab.id] > 0 && (
                <span className={`px-2 py-0.5 rounded-md text-[9px] sm:text-[10px] border-2 border-gray-900 ${
                  isActive ? 'bg-red-500 text-white border-red-500' : 'bg-red-400 text-white'
                }`}>
                  {counts[tab.id]}
                </span>
              )}
            </button>
          )
        })}
      </div>

      <p className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-gray-500 mb-4 sm:mb-6 pl-1">
        👉 {tabs.find(t => t.id === activeTab)?.desc}
      </p>

      {/* LISTA NOTIFICHE CARTOON */}
      <div className="space-y-3 sm:space-y-4">
        {list.length > 0 ? (
          list.map((n) => {
            const style = getNotificationStyle(n.tipo)
            const isUnread = !n.letto
            
            return (
              <div
                key={n.id}
                onClick={() => markAsRead(n)}
                className={`relative p-4 sm:p-5 border-[3px] sm:border-4 border-gray-900 rounded-xl sm:rounded-2xl flex flex-col sm:flex-row gap-3 sm:gap-4 transition-all cursor-pointer ${
                  isUnread 
                    ? 'bg-yellow-100 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] sm:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] sm:hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]' 
                    : 'bg-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] opacity-80 hover:opacity-100 hover:-translate-y-1 hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]'
                }`}
              >
                {/* Icona */}
                <div className="flex items-center sm:items-start gap-3 sm:gap-0 w-full sm:w-auto">
                  <div className={`w-10 h-10 sm:w-14 sm:h-14 rounded-lg sm:rounded-xl border-2 sm:border-3 border-gray-900 ${style.bg} ${style.text} flex items-center justify-center text-xl sm:text-3xl flex-shrink-0 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]`}>
                    {style.icon}
                  </div>
                  
                  {/* Titolo e data su Mobile (affiancati all'icona) */}
                  <div className="flex-1 sm:hidden">
                    <div className="flex justify-between items-start">
                      <p className="text-xs font-black text-gray-900 uppercase tracking-tight line-clamp-1 pr-2">{n.titolo || 'Notifica'}</p>
                      {isUnread && <span className="w-2 h-2 bg-red-500 border border-gray-900 rounded-full flex-shrink-0 mt-1"></span>}
                    </div>
                    <p className="text-[9px] font-bold text-gray-500 uppercase">{formatDate(n.created_at)}</p>
                  </div>
                </div>

                {/* Contenuto */}
                <div className="flex-1 min-w-0 flex flex-col justify-center">
                  <div className="hidden sm:flex justify-between items-center mb-1">
                    {n.titolo && (
                      <p className="text-sm sm:text-base font-black text-gray-900 uppercase tracking-tight">{n.titolo}</p>
                    )}
                    {isUnread && (
                      <span className="w-3 h-3 bg-red-500 border-2 border-gray-900 rounded-full ml-2"></span>
                    )}
                  </div>
                  <p className={`text-xs sm:text-sm font-bold ${isUnread ? 'text-gray-900' : 'text-gray-700'}`}>
                    {n.messaggio || n.tipo.replace('_', ' ')}
                  </p>
                  <p className="hidden sm:block text-[10px] font-bold text-gray-500 uppercase mt-2">
                    🕒 {formatDate(n.created_at)}
                  </p>
                </div>

                {/* Azioni (Elimina e Naviga) */}
                <div className="flex items-center justify-end sm:justify-center gap-2 border-t-2 border-dashed border-gray-300 pt-2 sm:pt-0 sm:border-t-0 mt-2 sm:mt-0 flex-shrink-0">
                  <button
                    onClick={(e) => deleteNotification(e, n.id)}
                    className="p-2 sm:p-3 bg-red-500 border-2 border-gray-900 rounded-lg text-white font-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all"
                    title="Elimina"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>

                  {n.link && (
                    <div className="p-2 sm:p-3 bg-white border-2 border-gray-900 rounded-lg text-gray-900 font-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] group-hover:bg-yellow-300 transition-colors">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  )}
                </div>
              </div>
            )
          })
        ) : (
          /* EMPTY STATE CARTOON */
          <div className="text-center py-16 sm:py-20 bg-white border-[3px] sm:border-4 border-dashed border-gray-300 rounded-2xl sm:rounded-3xl mt-6">
            <div className="w-20 h-20 sm:w-24 sm:h-24 mx-auto mb-4 sm:mb-6 rounded-2xl sm:rounded-3xl bg-gray-100 border-4 border-gray-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center rotate-3">
              <span className="text-4xl sm:text-5xl">{tabs.find(t => t.id === activeTab)?.icon}</span>
            </div>
            <h3 className="text-xl sm:text-2xl font-black text-gray-900 mb-2 uppercase tracking-tight">
              Nessuna notifica qui
            </h3>
            <p className="text-xs sm:text-sm text-gray-500 font-bold max-w-xs mx-auto">
              {activeTab === 'miei_progetti' && 'Quando qualcuno si candiderà ai tuoi progetti, lo vedrai qui.'}
              {activeTab === 'candidature' && 'Le risposte dei creatori alle tue candidature appariranno qua.'}
              {activeTab === 'sistema' && 'Il sistema non ha nulla da comunicarti per ora.'}
            </p>
          </div>
        )}
      </div>

      {/* STATS CARDS (Retro Counters) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mt-8 sm:mt-12 pt-8 border-t-4 border-gray-900 border-dashed">
        {tabs.map(tab => {
          const tabNotifications = grouped[tab.id]
          const tabUnread = tabNotifications.filter(n => !n.letto).length
          
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`p-4 sm:p-5 rounded-xl sm:rounded-2xl text-left border-4 border-gray-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-all flex items-center justify-between ${
                activeTab === tab.id ? tab.color : 'bg-white'
              }`}
            >
              <div>
                <p className="text-[10px] sm:text-xs font-black text-gray-900 uppercase tracking-widest mb-1">
                  {tab.label}
                </p>
                <div className="flex items-end gap-2">
                  <span className="text-3xl sm:text-4xl font-black text-gray-900 leading-none">
                    {tabNotifications.length}
                  </span>
                  <span className="text-xs font-bold text-gray-700 pb-1">totali</span>
                </div>
              </div>
              
              <div className="flex flex-col items-end gap-2">
                <span className="text-2xl sm:text-3xl opacity-50 grayscale">{tab.icon}</span>
                {tabUnread > 0 && (
                  <span className="bg-red-500 text-white text-[9px] font-black uppercase px-2 py-1 rounded border-2 border-gray-900">
                    {tabUnread} nuove
                  </span>
                )}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}