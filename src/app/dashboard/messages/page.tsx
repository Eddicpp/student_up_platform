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

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  // 1. Carica i contatti e i messaggi
  useEffect(() => {
    const fetchChatData = async () => {
      if (!user) return
      setLoading(true)

      // ✅ FIX: Aggiunto (supabase as any) e casting ad array di PrivateMessage
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
          
          const unreadCount = allMsgs?.filter(m => m.mittente_id === u.id && m.destinatario_id === user.id && !m.letto).length || 0

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
            // ✅ Ora TypeScript sa che allMsgs è un array di PrivateMessage
            const chatMsgs = allMsgs?.filter(m => 
              (m.mittente_id === targetUserId && m.destinatario_id === user.id) ||
              (m.mittente_id === user.id && m.destinatario_id === targetUserId)
            ).reverse() || []
            setMessages(chatMsgs)
            setTimeout(scrollToBottom, 100)
          }
        }
      }
      setLoading(false)
    }

    fetchChatData()
  }, [user, targetUserId, supabase])

  // 2. Realtime Listener
  useEffect(() => {
    if (!user) return

    const channel = supabase
      .channel('private-messages')
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
          
          // ✅ FIX: Aggiunto (supabase as any) anche qui
          ;(supabase as any).from('messaggio_privato').update({ letto: true }).eq('id', newMsg.id).then()
        }
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user, activeContact, supabase])

  const selectContact = (contact: Contact) => {
    router.push(`/dashboard/messages?userId=${contact.id}`)
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

    // ✅ FIX: Aggiunto (supabase as any) all'invio
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
    }
    setSending(false)
  }

  const cardStyle = "bg-white rounded-2xl border-2 border-gray-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"

  if (loading && !contacts.length) {
    return <div className="p-10 text-center font-black animate-pulse">Caricamento Chat...</div>
  }

  return (
    <div className="max-w-[1400px] mx-auto pb-20 pt-6 px-4">
      <div className="flex items-center gap-3 mb-8">
        <h1 className="text-4xl md:text-5xl font-black text-gray-900 uppercase italic tracking-tighter leading-none">
          Messaggi <span className="text-red-600">Privati</span>
        </h1>
      </div>

      <div className="grid lg:grid-cols-12 gap-6 h-[700px]">
        
        {/* SIDEBAR CONTATTI */}
        <div className={`lg:col-span-4 ${cardStyle} overflow-hidden flex flex-col`}>
          <div className="p-4 bg-gray-50 border-b-2 border-gray-900">
            <h2 className="font-black text-gray-900 uppercase tracking-widest text-sm">Le tue Conversazioni</h2>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-2 bg-gray-100">
            {contacts.length === 0 ? (
              <div className="p-6 text-center text-gray-500 font-bold text-sm">
                Non hai ancora nessuna chat attiva. <br/>Puoi avviare una chat dai team o dai progetti.
              </div>
            ) : (
              contacts.map(contact => (
                <button
                  key={contact.id}
                  onClick={() => selectContact(contact)}
                  className={`w-full text-left p-3 rounded-xl border-2 transition-all flex items-center gap-3 ${
                    activeContact?.id === contact.id 
                      ? 'bg-red-800 border-red-900 text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] translate-x-1' 
                      : 'bg-white border-gray-200 hover:border-gray-900 text-gray-900'
                  }`}
                >
                  <img src={contact.avatar_url || '/default-avatar.png'} className="w-12 h-12 rounded-xl object-cover border-2 border-gray-900" alt="" />
                  <div className="flex-1 overflow-hidden">
                    <p className="font-black truncate text-sm">{contact.nome} {contact.cognome}</p>
                    <p className={`text-xs truncate font-medium ${activeContact?.id === contact.id ? 'text-red-200' : 'text-gray-500'}`}>
                      {contact.ultimo_messaggio || 'Inizia a chattare...'}
                    </p>
                  </div>
                  {contact.non_letti ? (
                    <span className="w-6 h-6 rounded-full bg-red-600 text-white text-[10px] font-black flex items-center justify-center">
                      {contact.non_letti}
                    </span>
                  ) : null}
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
              <div className="p-4 bg-white border-b-2 border-gray-900 flex justify-between items-center z-10">
                <div className="flex items-center gap-3">
                  <img src={activeContact.avatar_url || '/default-avatar.png'} className="w-10 h-10 rounded-xl object-cover border-2 border-gray-900" alt="" />
                  <div>
                    <h2 className="font-black text-gray-900 leading-none">{activeContact.nome} {activeContact.cognome}</h2>
                    <Link href={`/dashboard/user/${activeContact.id}`} className="text-[10px] font-bold text-red-600 hover:underline uppercase tracking-widest">
                      Vedi Profilo →
                    </Link>
                  </div>
                </div>
              </div>

              {/* Messaggi */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50">
                {messages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center opacity-50">
                    <span className="text-6xl mb-4">👋</span>
                    <p className="font-black text-gray-500">Manda il primo messaggio a {activeContact.nome}!</p>
                  </div>
                ) : (
                  messages.map((msg, idx) => {
                    const isMe = msg.mittente_id === user?.id
                    return (
                      <div key={msg.id || idx} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[70%] px-4 py-3 rounded-2xl border-2 font-medium text-sm ${
                          isMe 
                            ? 'bg-red-800 text-white border-red-900 rounded-br-sm shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]' 
                            : 'bg-white text-gray-900 border-gray-900 rounded-bl-sm shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'
                        }`}>
                          {msg.testo}
                          <div className={`text-[9px] mt-1 font-bold opacity-60 ${isMe ? 'text-right' : 'text-left'}`}>
                            {new Date(msg.created_at).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                      </div>
                    )
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div className="p-4 bg-white border-t-2 border-gray-900 flex gap-2">
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
                  className="px-6 bg-gray-900 hover:bg-gray-800 text-white font-black uppercase tracking-widest rounded-xl text-sm transition-all shadow-[3px_3px_0px_0px_rgba(0,0,0,0.3)] hover:shadow-none hover:translate-x-[3px] hover:translate-y-[3px] border-2 border-gray-700 disabled:opacity-50"
                >
                  Invia
                </button>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center bg-gray-50 opacity-50">
              <span className="text-8xl mb-6">💬</span>
              <h3 className="text-2xl font-black text-gray-900 uppercase italic">Seleziona una chat</h3>
              <p className="font-bold text-gray-500 text-sm">Scegli una conversazione dalla barra laterale.</p>
            </div>
          )}
        </div>

      </div>
    </div>
  )
}

export default function MessagesPage() {
  return (
    <Suspense fallback={<div className="p-20 text-center font-black animate-pulse text-red-800">Caricamento messaggi...</div>}>
      <ChatWorkspace />
    </Suspense>
  )
}