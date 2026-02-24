'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/app/context/UserContext'
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

export default function ChatWidget() {
  const { user } = useUser()
  const supabase = createClient()
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Stati
  const [isOpen, setIsOpen] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false) // Mini vs expanded
  const [contacts, setContacts] = useState<Contact[]>([])
  const [activeContact, setActiveContact] = useState<Contact | null>(null)
  const [messages, setMessages] = useState<PrivateMessage[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [totalUnread, setTotalUnread] = useState(0)
  const [loading, setLoading] = useState(true)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  // Fetch contatti e messaggi non letti
  const fetchChatData = async () => {
    if (!user) return

    const { data: allMsgsData } = await (supabase as any)
      .from('messaggio_privato')
      .select('*')
      .or(`mittente_id.eq.${user.id},destinatario_id.eq.${user.id}`)
      .order('created_at', { ascending: false })

    const allMsgs = allMsgsData as PrivateMessage[] | null

    // Conta non letti totali
    const unreadTotal = allMsgs?.filter(m => m.destinatario_id === user.id && !m.letto).length || 0
    setTotalUnread(unreadTotal)

    // Estrai contatti unici
    const contactIds = new Set<string>()
    allMsgs?.forEach(msg => {
      contactIds.add(msg.mittente_id === user.id ? msg.destinatario_id : msg.mittente_id)
    })

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
    }
    setLoading(false)
  }

  // Fetch messaggi per contatto attivo
  const fetchMessages = async (contactId: string) => {
    if (!user) return

    const { data } = await (supabase as any)
      .from('messaggio_privato')
      .select('*')
      .or(`and(mittente_id.eq.${user.id},destinatario_id.eq.${contactId}),and(mittente_id.eq.${contactId},destinatario_id.eq.${user.id})`)
      .order('created_at', { ascending: true })
      .limit(50)

    if (data) {
      setMessages(data)
      setTimeout(scrollToBottom, 100)

      // Marca come letti
      const unreadIds = data.filter((m: PrivateMessage) => m.destinatario_id === user.id && !m.letto).map((m: PrivateMessage) => m.id)
      if (unreadIds.length > 0) {
        await (supabase as any)
          .from('messaggio_privato')
          .update({ letto: true })
          .in('id', unreadIds)

        // Aggiorna conteggio
        fetchChatData()
      }
    }
  }

  useEffect(() => {
    if (user) {
      fetchChatData()
    }
  }, [user])

  useEffect(() => {
    if (activeContact) {
      fetchMessages(activeContact.id)
    }
  }, [activeContact])

  // Realtime listener
  useEffect(() => {
    if (!user) return

    const channel = supabase
      .channel('chat-widget-messages')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messaggio_privato',
        filter: `destinatario_id=eq.${user.id}`
      }, (payload) => {
        const newMsg = payload.new as PrivateMessage

        // Aggiorna conteggio non letti
        fetchChatData()

        // Se la chat con questo contatto è aperta, aggiungi messaggio
        if (activeContact && newMsg.mittente_id === activeContact.id) {
          setMessages(prev => [...prev, newMsg])
          setTimeout(scrollToBottom, 100)

          // Marca come letto
          ;(supabase as any)
            .from('messaggio_privato')
            .update({ letto: true })
            .eq('id', newMsg.id)
            .then(() => fetchChatData())
        }
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user, activeContact])

  const selectContact = (contact: Contact) => {
    setActiveContact(contact)
    setIsExpanded(true)
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
    } else {
      fetchChatData()
    }
    setSending(false)
  }

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)

    if (diffMins < 1) return 'Ora'
    if (diffMins < 60) return `${diffMins}m`
    if (diffMins < 1440) return date.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
    return date.toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })
  }

  if (!user) return null

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed bottom-6 right-6 z-50 w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-300 border-2 border-gray-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] ${
          isOpen ? 'bg-gray-900 text-white' : 'bg-white text-gray-900'
        }`}
      >
        {isOpen ? (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <>
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            {totalUnread > 0 && (
              <span className="absolute -top-1 -right-1 w-6 h-6 bg-red-600 text-white text-xs font-black rounded-full flex items-center justify-center border-2 border-white">
                {totalUnread > 9 ? '9+' : totalUnread}
              </span>
            )}
          </>
        )}
      </button>

      {/* Chat Panel */}
      {isOpen && (
        <div 
          className={`fixed bottom-24 right-6 z-50 bg-white rounded-2xl border-2 border-gray-900 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] overflow-hidden transition-all duration-300 ${
            isExpanded ? 'w-80 sm:w-96 h-[500px]' : 'w-80 h-[400px]'
          }`}
        >
          {/* Header */}
          <div className="p-3 bg-gray-900 text-white flex items-center justify-between">
            <div className="flex items-center gap-2">
              {activeContact && isExpanded ? (
                <>
                  <button
                    onClick={() => { setActiveContact(null); setIsExpanded(false) }}
                    className="p-1 hover:bg-white/20 rounded-lg transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  <img 
                    src={activeContact.avatar_url || '/default-avatar.png'} 
                    className="w-8 h-8 rounded-lg object-cover border border-white/30" 
                    alt="" 
                  />
                  <div>
                    <p className="font-bold text-sm leading-none">{activeContact.nome} {activeContact.cognome}</p>
                  </div>
                </>
              ) : (
                <>
                  <span className="text-xl">💬</span>
                  <h3 className="font-black text-sm uppercase tracking-wider">Messaggi</h3>
                </>
              )}
            </div>
            <div className="flex items-center gap-1">
              <Link
                href="/dashboard/messages"
                className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
                title="Apri pagina completa"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </Link>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            </div>
          </div>

          {/* Content */}
          {activeContact && isExpanded ? (
            // Chat attiva
            <div className="flex flex-col h-[calc(100%-52px)]">
              {/* Messaggi */}
              <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-gray-100">
                {messages.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-gray-500 text-sm">
                    <div className="text-center">
                      <span className="text-3xl block mb-2">👋</span>
                      <p className="font-bold">Inizia la conversazione!</p>
                    </div>
                  </div>
                ) : (
                  messages.map((msg, idx) => {
                    const isMe = msg.mittente_id === user?.id
                    return (
                      <div key={msg.id || idx} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[80%] px-3 py-2 rounded-xl border-2 text-sm ${
                          isMe
                            ? 'bg-red-600 text-white border-red-700 rounded-br-sm'
                            : 'bg-white text-gray-900 border-gray-300 rounded-bl-sm'
                        }`}>
                          <p className="break-words">{msg.testo}</p>
                          <p className={`text-[9px] mt-1 opacity-70 ${isMe ? 'text-right' : 'text-left'}`}>
                            {formatTime(msg.created_at)}
                          </p>
                        </div>
                      </div>
                    )
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div className="p-2 bg-white border-t-2 border-gray-200 flex gap-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      sendMessage()
                    }
                  }}
                  placeholder="Scrivi..."
                  className="flex-1 px-3 py-2 bg-gray-100 rounded-xl border-2 border-gray-300 focus:border-gray-900 outline-none text-sm font-medium"
                />
                <button
                  onClick={sendMessage}
                  disabled={!newMessage.trim() || sending}
                  className="px-4 py-2 bg-gray-900 text-white rounded-xl font-bold text-sm disabled:opacity-50 border-2 border-gray-700 hover:bg-gray-800 transition-colors"
                >
                  →
                </button>
              </div>
            </div>
          ) : (
            // Lista contatti
            <div className="h-[calc(100%-52px)] overflow-y-auto">
              {loading ? (
                <div className="p-6 text-center">
                  <div className="w-8 h-8 border-3 border-gray-300 border-t-gray-900 rounded-full animate-spin mx-auto"></div>
                </div>
              ) : contacts.length === 0 ? (
                <div className="p-6 text-center text-gray-500">
                  <span className="text-4xl block mb-2">💬</span>
                  <p className="font-bold text-sm">Nessuna chat</p>
                  <p className="text-xs mt-1">Avvia una chat dai team o progetti</p>
                </div>
              ) : (
                <div className="p-2 space-y-1">
                  {contacts.map(contact => (
                    <button
                      key={contact.id}
                      onClick={() => selectContact(contact)}
                      className="w-full text-left p-3 rounded-xl border-2 border-gray-200 hover:border-gray-900 bg-white transition-all flex items-center gap-3 group"
                    >
                      <div className="relative">
                        <img 
                          src={contact.avatar_url || '/default-avatar.png'} 
                          className="w-10 h-10 rounded-xl object-cover border-2 border-gray-300 group-hover:border-gray-900 transition-colors" 
                          alt="" 
                        />
                        {contact.non_letti ? (
                          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-600 text-white text-[10px] font-black rounded-full flex items-center justify-center border-2 border-white">
                            {contact.non_letti}
                          </span>
                        ) : null}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm text-gray-900 truncate">
                          {contact.nome} {contact.cognome}
                        </p>
                        <p className="text-xs text-gray-500 truncate">
                          {contact.ultimo_messaggio || 'Inizia a chattare...'}
                        </p>
                      </div>
                      {contact.data_ultimo_messaggio && (
                        <span className="text-[10px] text-gray-400 font-medium">
                          {formatTime(contact.data_ultimo_messaggio)}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </>
  )
}