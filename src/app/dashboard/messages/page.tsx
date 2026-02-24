'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/app/context/UserContext'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'

interface PrivateMessage {
  id: string
  mittente_id: string
  destinatario_id: string
  testo: string
  created_at: string
  letto: boolean
}

interface Contact {
  id: string
  nome: string
  cognome: string
  avatar_url: string | null
  ultimo_messaggio?: string
  data_ultimo_messaggio?: string
  non_letti?: number
}

function ChatWorkspace() {
  const { user } = useUser()
  const searchParams = useSearchParams()
  const router = useRouter()
  const supabase = createClient()
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const targetUserId = searchParams.get('userId')

  const [contacts, setContacts] = useState<Contact[]>([])
  const [activeContact, setActiveContact] = useState<Contact | null>(null)
  const [messages, setMessages] = useState<PrivateMessage[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  // Carica i contatti e i messaggi
  useEffect(() => {
    const fetchChatData = async () => {
      if (!user) return
      setLoading(true)

      const { data: allMsgsData } = await (supabase as any)
        .from('messaggio_privato')
        .select('*')
        .or(`mittente_id.eq.${user.id},destinatario_id.eq.${user.id}`)
        .order('created_at', { ascending: false })

      const allMsgs = allMsgsData as PrivateMessage[] | null

      const contactIds = new Set<string>()
      allMsgs?.forEach(msg => {
        contactIds.add(msg.mittente_id === user.id ? msg.destinatario_id : msg.mittente_id)
      })

      if (targetUserId) contactIds.add(targetUserId)

      if (contactIds.size > 0) {
        const { data: usersData } = await supabase
          .from('studente')
          .select('id, nome, cognome, avatar_url')
          .in('id', Array.from(contactIds))

        const formattedContacts = usersData?.map(u => {
          const lastMsg = allMsgs?.find(m =>
            (m.mittente_id === u.id && m.destinatario_id === user.id) ||
            (m.mittente_id === user.id && m.destinatario_id === u.id)
          )

          const unreadCount = allMsgs?.filter(m => 
            m.mittente_id === u.id && m.destinatario_id === user.id && !m.letto
          ).length || 0

          return {
            ...u,
            ultimo_messaggio: lastMsg?.testo,
            data_ultimo_messaggio: lastMsg?.created_at,
            non_letti: unreadCount
          }
        }).sort((a, b) => {
          if (!a.data_ultimo_messaggio) return 1
          if (!b.data_ultimo_messaggio) return -1
          return new Date(b.data_ultimo_messaggio).getTime() - new Date(a.data_ultimo_messaggio).getTime()
        }) || []

        setContacts(formattedContacts)

        if (targetUserId) {
          const target = formattedContacts.find(c => c.id === targetUserId)
          if (target) {
            setActiveContact(target)
            const chatMsgs = allMsgs?.filter(m =>
              (m.mittente_id === targetUserId && m.destinatario_id === user.id) ||
              (m.mittente_id === user.id && m.destinatario_id === targetUserId)
            ).reverse() || []
            setMessages(chatMsgs)
            setTimeout(scrollToBottom, 100)

            // Marca come letti
            const unreadIds = chatMsgs.filter(m => m.destinatario_id === user.id && !m.letto).map(m => m.id)
            if (unreadIds.length > 0) {
              await (supabase as any)
                .from('messaggio_privato')
                .update({ letto: true })
                .in('id', unreadIds)
            }
          }
        }
      }
      setLoading(false)
    }

    fetchChatData()
  }, [user, targetUserId, supabase])

  // Realtime Listener
  useEffect(() => {
    if (!user) return

    const channel = supabase
      .channel('private-messages-page')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messaggio_privato',
        filter: `destinatario_id=eq.${user.id}`
      }, (payload) => {
        const newMsg = payload.new as PrivateMessage

        if (activeContact && newMsg.mittente_id === activeContact.id) {
          setMessages(prev => [...prev, newMsg])
          setTimeout(scrollToBottom, 100)

          ;(supabase as any)
            .from('messaggio_privato')
            .update({ letto: true })
            .eq('id', newMsg.id)
            .then()
        }

        // Aggiorna contatti
        setContacts(prev => {
          const updated = prev.map(c => {
            if (c.id === newMsg.mittente_id) {
              return {
                ...c,
                ultimo_messaggio: newMsg.testo,
                data_ultimo_messaggio: newMsg.created_at,
                non_letti: (c.non_letti || 0) + (activeContact?.id === c.id ? 0 : 1)
              }
            }
            return c
          })
          return updated.sort((a, b) => {
            if (!a.data_ultimo_messaggio) return 1
            if (!b.data_ultimo_messaggio) return -1
            return new Date(b.data_ultimo_messaggio).getTime() - new Date(a.data_ultimo_messaggio).getTime()
          })
        })
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user, activeContact, supabase])

  const selectContact = async (contact: Contact) => {
    router.push(`/dashboard/messages?userId=${contact.id}`, { scroll: false })
    setActiveContact(contact)

    // Fetch messaggi
    const { data } = await (supabase as any)
      .from('messaggio_privato')
      .select('*')
      .or(`and(mittente_id.eq.${user?.id},destinatario_id.eq.${contact.id}),and(mittente_id.eq.${contact.id},destinatario_id.eq.${user?.id})`)
      .order('created_at', { ascending: true })

    if (data) {
      setMessages(data)
      setTimeout(scrollToBottom, 100)

      // Marca come letti
      const unreadIds = data.filter((m: PrivateMessage) => m.destinatario_id === user?.id && !m.letto).map((m: PrivateMessage) => m.id)
      if (unreadIds.length > 0) {
        await (supabase as any)
          .from('messaggio_privato')
          .update({ letto: true })
          .in('id', unreadIds)

        setContacts(prev => prev.map(c => c.id === contact.id ? { ...c, non_letti: 0 } : c))
      }
    }
  }

  const sendMessage = async () => {
    if (!newMessage.trim() || sending || !user || !activeContact) return
    setSending(true)

    const tempMsg: PrivateMessage = {
      id: Math.random().toString(),
      mittente_id: user.id,
      destinatario_id: activeContact.id,
      testo: newMessage.trim(),
      created_at: new Date().toISOString(),
      letto: false
    }

    setMessages(prev => [...prev, tempMsg])
    setNewMessage('')
    setTimeout(scrollToBottom, 100)

    const { error } = await (supabase as any)
      .from('messaggio_privato')
      .insert({
        mittente_id: user.id,
        destinatario_id: activeContact.id,
        testo: tempMsg.testo
      })

    if (error) {
      console.error("Errore invio:", error)
      alert("Errore nell'invio del messaggio.")
    } else {
      // Aggiorna contatto
      setContacts(prev => {
        const updated = prev.map(c => {
          if (c.id === activeContact.id) {
            return { ...c, ultimo_messaggio: tempMsg.testo, data_ultimo_messaggio: tempMsg.created_at }
          }
          return c
        })
        return updated.sort((a, b) => {
          if (!a.data_ultimo_messaggio) return 1
          if (!b.data_ultimo_messaggio) return -1
          return new Date(b.data_ultimo_messaggio).getTime() - new Date(a.data_ultimo_messaggio).getTime()
        })
      })
    }
    setSending(false)
  }

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Ora'
    if (diffMins < 60) return `${diffMins}m fa`
    if (diffHours < 24) return date.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
    if (diffDays < 7) return `${diffDays}g fa`
    return date.toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })
  }

  // Filtro contatti
  const filteredContacts = contacts.filter(c =>
    `${c.nome} ${c.cognome}`.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Statistiche
  const totalUnread = contacts.reduce((sum, c) => sum + (c.non_letti || 0), 0)

  // Stili cartoon
  const cardStyle = "bg-white rounded-2xl border-2 border-gray-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"

  if (loading && !contacts.length) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className={`${cardStyle} p-8 text-center`}>
          <div className="w-12 h-12 border-4 border-gray-300 border-t-gray-900 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="font-bold text-gray-900">Caricamento Chat...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-[1400px] mx-auto pb-20">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl md:text-4xl font-black text-gray-900 flex items-center gap-3">
            <span className="text-4xl">💬</span>
            Messaggi Privati
          </h1>
          <p className="text-gray-500 font-medium mt-1">
            {contacts.length} conversazioni • {totalUnread > 0 && <span className="text-red-600 font-bold">{totalUnread} non letti</span>}
          </p>
        </div>
      </div>

      <div className="grid lg:grid-cols-12 gap-6 h-[700px]">
        
        {/* SIDEBAR CONTATTI */}
        <div className={`lg:col-span-4 ${cardStyle} overflow-hidden flex flex-col`}>
          {/* Header */}
          <div className="p-4 bg-gray-50 border-b-2 border-gray-900">
            <h2 className="font-black text-gray-900 uppercase tracking-wider text-sm mb-3">
              Le tue Conversazioni
            </h2>
            {/* Search */}
            <div className="relative">
              <svg className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cerca contatto..."
                className="w-full pl-10 pr-4 py-2.5 bg-white rounded-xl border-2 border-gray-300 focus:border-gray-900 outline-none text-sm font-medium"
              />
            </div>
          </div>

          {/* Lista contatti */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-gray-100">
            {filteredContacts.length === 0 ? (
              <div className="h-full flex items-center justify-center">
                <div className="text-center p-6">
                  <span className="text-5xl block mb-3">💬</span>
                  <p className="font-bold text-gray-900">Nessuna chat</p>
                  <p className="text-sm text-gray-500 mt-1">
                    Avvia una chat dai team o dai progetti
                  </p>
                </div>
              </div>
            ) : (
              filteredContacts.map(contact => (
                <button
                  key={contact.id}
                  onClick={() => selectContact(contact)}
                  className={`w-full text-left p-4 rounded-xl border-2 transition-all flex items-center gap-3 ${
                    activeContact?.id === contact.id
                      ? 'bg-gray-900 border-gray-700 text-white shadow-none translate-x-1 translate-y-1'
                      : 'bg-white border-gray-300 hover:border-gray-900 text-gray-900 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px]'
                  }`}
                >
                  <div className="relative">
                    <img 
                      src={contact.avatar_url || '/default-avatar.png'} 
                      className={`w-12 h-12 rounded-xl object-cover border-2 ${
                        activeContact?.id === contact.id ? 'border-white/30' : 'border-gray-900'
                      }`} 
                      alt="" 
                    />
                    {contact.non_letti ? (
                      <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-600 text-white text-[10px] font-black rounded-full flex items-center justify-center border-2 border-white">
                        {contact.non_letti}
                      </span>
                    ) : null}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-black truncate">{contact.nome} {contact.cognome}</p>
                      {contact.data_ultimo_messaggio && (
                        <span className={`text-[10px] font-bold flex-shrink-0 ${
                          activeContact?.id === contact.id ? 'text-gray-400' : 'text-gray-500'
                        }`}>
                          {formatTime(contact.data_ultimo_messaggio)}
                        </span>
                      )}
                    </div>
                    <p className={`text-sm truncate font-medium ${
                      activeContact?.id === contact.id ? 'text-gray-400' : 'text-gray-500'
                    }`}>
                      {contact.ultimo_messaggio || 'Inizia a chattare...'}
                    </p>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* AREA CHAT */}
        <div className={`lg:col-span-8 ${cardStyle} overflow-hidden flex flex-col`}>
          {activeContact ? (
            <>
              {/* Header Chat */}
              <div className="p-4 bg-white border-b-2 border-gray-900 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => { setActiveContact(null); router.push('/dashboard/messages') }}
                    className="lg:hidden p-2 hover:bg-gray-100 rounded-xl border-2 border-gray-300"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  <img 
                    src={activeContact.avatar_url || '/default-avatar.png'} 
                    className="w-12 h-12 rounded-xl object-cover border-2 border-gray-900" 
                    alt="" 
                  />
                  <div>
                    <h2 className="font-black text-gray-900 text-lg leading-none">
                      {activeContact.nome} {activeContact.cognome}
                    </h2>
                    <Link 
                      href={`/dashboard/user/${activeContact.id}`} 
                      className="text-xs font-bold text-red-600 hover:underline uppercase tracking-wider"
                    >
                      Vedi Profilo →
                    </Link>
                  </div>
                </div>
              </div>

              {/* Messaggi */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-100">
                {messages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center">
                    <div className={`${cardStyle} p-8 text-center`}>
                      <span className="text-6xl block mb-4">👋</span>
                      <p className="font-black text-gray-900 text-lg">Manda il primo messaggio!</p>
                      <p className="text-gray-500 text-sm mt-1">
                        Inizia la conversazione con {activeContact.nome}
                      </p>
                    </div>
                  </div>
                ) : (
                  messages.map((msg, idx) => {
                    const isMe = msg.mittente_id === user?.id
                    
                    // Raggruppa per data
                    const msgDate = new Date(msg.created_at).toDateString()
                    const prevMsgDate = idx > 0 ? new Date(messages[idx - 1].created_at).toDateString() : null
                    const showDateSeparator = msgDate !== prevMsgDate

                    return (
                      <div key={msg.id || idx}>
                        {showDateSeparator && (
                          <div className="flex items-center gap-3 my-4">
                            <div className="flex-1 h-0.5 bg-gray-300"></div>
                            <span className="text-xs font-bold text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                              {new Date(msg.created_at).toLocaleDateString('it-IT', { 
                                weekday: 'long', 
                                day: 'numeric', 
                                month: 'long' 
                              })}
                            </span>
                            <div className="flex-1 h-0.5 bg-gray-300"></div>
                          </div>
                        )}
                        <div className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-[70%] px-4 py-3 rounded-2xl border-2 font-medium ${
                            isMe
                              ? 'bg-gray-900 text-white border-gray-700 rounded-br-sm shadow-[3px_3px_0px_0px_rgba(107,114,128,1)]'
                              : 'bg-white text-gray-900 border-gray-900 rounded-bl-sm shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]'
                          }`}>
                            <p className="break-words">{msg.testo}</p>
                            <div className={`flex items-center gap-1 mt-1 ${isMe ? 'justify-end' : 'justify-start'}`}>
                              <span className={`text-[10px] font-bold ${isMe ? 'text-gray-400' : 'text-gray-500'}`}>
                                {new Date(msg.created_at).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
                              </span>
                              {isMe && msg.letto && (
                                <span className="text-blue-400 text-xs">✓✓</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div className="p-4 bg-white border-t-2 border-gray-900 flex gap-3">
                <textarea
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      sendMessage()
                    }
                  }}
                  placeholder="Scrivi un messaggio..."
                  className="flex-1 bg-gray-100 border-2 border-gray-300 focus:border-gray-900 rounded-xl px-4 py-3 outline-none resize-none text-sm font-medium text-gray-900 placeholder:text-gray-500"
                  rows={1}
                />
                <button
                  onClick={sendMessage}
                  disabled={!newMessage.trim() || sending}
                  className="px-6 bg-gray-900 hover:bg-gray-800 text-white font-black uppercase tracking-wider rounded-xl text-sm transition-all border-2 border-gray-700 shadow-[3px_3px_0px_0px_rgba(0,0,0,0.3)] hover:shadow-none hover:translate-x-[3px] hover:translate-y-[3px] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Invia →
                </button>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center bg-gray-100">
              <div className={`${cardStyle} p-10 text-center max-w-md`}>
                <span className="text-8xl block mb-6">💬</span>
                <h3 className="text-2xl font-black text-gray-900 mb-2">Seleziona una chat</h3>
                <p className="font-medium text-gray-500">
                  Scegli una conversazione dalla barra laterale per iniziare a chattare.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function MessagesPage() {
  return (
    <Suspense fallback={
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="bg-white rounded-2xl border-2 border-gray-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-8 text-center">
          <div className="w-12 h-12 border-4 border-gray-300 border-t-gray-900 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="font-bold text-gray-900">Caricamento messaggi...</p>
        </div>
      </div>
    }>
      <ChatWorkspace />
    </Suspense>
  )
}