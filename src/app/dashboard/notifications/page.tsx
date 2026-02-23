'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

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

  // Icona per tipo notifica
  const getNotificationStyle = (tipo: string) => {
    switch (tipo) {
      case 'candidatura_ricevuta': 
        return { icon: '📩', bg: 'bg-blue-100', color: 'text-blue-600' }
      case 'candidatura_accettata': 
        return { icon: '✅', bg: 'bg-green-100', color: 'text-green-600' }
      case 'candidatura_rifiutata': 
        return { icon: '❌', bg: 'bg-red-100', color: 'text-red-600' }
      case 'nuovo_membro': 
        return { icon: '👋', bg: 'bg-purple-100', color: 'text-purple-600' }
      case 'bando_aggiornato': 
        return { icon: '📝', bg: 'bg-amber-100', color: 'text-amber-600' }
      case 'benvenuto': 
        return { icon: '🎉', bg: 'bg-pink-100', color: 'text-pink-600' }
      default: 
        return { icon: '🔔', bg: 'bg-gray-100', color: 'text-gray-600' }
    }
  }

  if (loading) return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-gray-300 border-t-red-600 rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-gray-500 font-medium">Caricamento notifiche...</p>
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

  const tabs = [
    { 
      id: 'miei_progetti' as const, 
      label: 'I Miei Progetti', 
      desc: 'Candidature ricevute',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
        </svg>
      )
    },
    { 
      id: 'candidature' as const, 
      label: 'Le Mie Candidature', 
      desc: 'Risposte ricevute',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      )
    },
    { 
      id: 'sistema' as const, 
      label: 'Sistema', 
      desc: 'Notifiche generali',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      )
    }
  ]

  return (
    <div className="max-w-4xl mx-auto pb-20">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => router.push('/dashboard')}
            className="p-2 hover:bg-gray-100 rounded-xl text-gray-500 hover:text-gray-900 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Notifiche</h1>
            <p className="text-sm text-gray-500">
              {totalUnread > 0 ? `${totalUnread} non lette` : 'Tutto letto ✓'}
            </p>
          </div>
        </div>

        {unreadCount > 0 && (
          <button
            onClick={markAllAsRead}
            className="text-sm text-red-600 hover:text-red-700 font-medium transition-colors"
          >
            Segna tutte lette
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 p-1 bg-gray-100 rounded-2xl mb-6">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-medium text-sm transition-all ${
              activeTab === tab.id 
                ? 'bg-white text-gray-900 shadow-sm' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <span className={activeTab === tab.id ? 'text-red-600' : ''}>{tab.icon}</span>
            <span className="hidden sm:inline">{tab.label}</span>
            {counts[tab.id] > 0 && (
              <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                activeTab === tab.id 
                  ? 'bg-red-100 text-red-600' 
                  : 'bg-gray-200 text-gray-600'
              }`}>
                {counts[tab.id]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Descrizione tab */}
      <p className="text-sm text-gray-400 mb-4 px-1">
        {tabs.find(t => t.id === activeTab)?.desc}
      </p>

      {/* Lista Notifiche */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        {list.length > 0 ? (
          <div className="divide-y divide-gray-100">
            {list.map((n) => {
              const style = getNotificationStyle(n.tipo)
              
              return (
                <div
                  key={n.id}
                  onClick={() => markAsRead(n)}
                  className={`p-4 cursor-pointer hover:bg-gray-50 transition-all flex gap-4 ${
                    !n.letto ? 'bg-red-50/50' : ''
                  }`}
                >
                  {/* Icona */}
                  <div className={`w-10 h-10 rounded-xl ${style.bg} flex items-center justify-center text-lg flex-shrink-0`}>
                    {style.icon}
                  </div>

                  {/* Contenuto */}
                  <div className="flex-1 min-w-0">
                    {n.titolo && (
                      <p className="text-sm font-semibold text-gray-900 mb-0.5">{n.titolo}</p>
                    )}
                    <p className={`text-sm leading-relaxed ${!n.letto ? 'text-gray-900' : 'text-gray-600'}`}>
                      {n.messaggio || n.tipo}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      {formatDate(n.created_at)}
                    </p>
                  </div>

                  {/* Azioni */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {!n.letto && (
                      <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                    )}
                    
                    <button
                      onClick={(e) => deleteNotification(e, n.id)}
                      className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                      title="Elimina"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>

                    {n.link && (
                      <svg className="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="p-12 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gray-100 flex items-center justify-center text-gray-400">
              {tabs.find(t => t.id === activeTab)?.icon}
            </div>
            <p className="text-gray-900 font-medium mb-1">
              Nessuna notifica
            </p>
            <p className="text-gray-500 text-sm">
              {activeTab === 'miei_progetti' && 'Le candidature ai tuoi progetti appariranno qui'}
              {activeTab === 'candidature' && 'Le risposte alle tue candidature appariranno qui'}
              {activeTab === 'sistema' && 'Le notifiche di sistema appariranno qui'}
            </p>
          </div>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-4 mt-6">
        {tabs.map(tab => {
          const tabNotifications = grouped[tab.id]
          const tabUnread = tabNotifications.filter(n => !n.letto).length
          
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`p-4 rounded-2xl text-center transition-all ${
                activeTab === tab.id
                  ? 'bg-red-50 border-2 border-red-200'
                  : 'bg-white border border-gray-200 hover:border-gray-300'
              }`}
            >
              <p className={`text-2xl font-bold ${activeTab === tab.id ? 'text-red-600' : 'text-gray-900'}`}>
                {tabNotifications.length}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {tab.label}
              </p>
              {tabUnread > 0 && (
                <p className="text-xs text-red-600 font-medium mt-1">
                  {tabUnread} nuove
                </p>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}