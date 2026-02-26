'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Message {
  id: string
  mittente_id: string
  destinatario_id: string
  testo: string
  letto: boolean
  created_at: string
}

interface PrivateChatModalProps {
  isOpen: boolean
  onClose: () => void
  currentUserId: string
  otherUser: {
    id: string
    nome: string
    cognome: string
    avatar_url: string | null
  }
  bandoId: string
  bandoTitolo: string
}

export default function PrivateChatModal({
  isOpen,
  onClose,
  currentUserId,
  otherUser,
  bandoId,
  bandoTitolo
}: PrivateChatModalProps) {
  const supabase = createClient()
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(true)

  // Fetch messaggi esistenti
  const fetchMessages = async () => {
    const { data } = await (supabase
      .from('messaggio_privato' as any)
      .select('*')
      .eq('bando_id', bandoId)
      .or(`and(mittente_id.eq.${currentUserId},destinatario_id.eq.${otherUser.id}),and(mittente_id.eq.${otherUser.id},destinatario_id.eq.${currentUserId})`)
      .order('created_at', { ascending: true }) as any)

    if (data) {
      setMessages(data)
      
      // Marca come letti i messaggi ricevuti
      const unreadIds = data
        .filter((m: Message) => m.destinatario_id === currentUserId && !m.letto)
        .map((m: Message) => m.id)
      
      if (unreadIds.length > 0) {
        await (supabase
          .from('messaggio_privato' as any)
          .update({ letto: true })
          .in('id', unreadIds) as any)
      }
    }
    
    setLoading(false)
  }

  // Invia messaggio
  const sendMessage = async () => {
    if (!newMessage.trim() || sending) return
    setSending(true)

    const { error } = await (supabase
      .from('messaggio_privato' as any)
      .insert({
        mittente_id: currentUserId,
        destinatario_id: otherUser.id,
        bando_id: bandoId,
        testo: newMessage.trim()
      }) as any)

    if (!error) {
      setNewMessage('')
      await fetchMessages()
    }

    setSending(false)
  }

  // Scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  // Initial fetch
  useEffect(() => {
    if (isOpen) {
      fetchMessages()
      inputRef.current?.focus()
    }
  }, [isOpen])

  // Scroll quando arrivano nuovi messaggi
  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Realtime subscription
  useEffect(() => {
    if (!isOpen) return

    const channel = supabase
      .channel(`private-chat-${bandoId}-${currentUserId}-${otherUser.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messaggio_privato',
        filter: `bando_id=eq.${bandoId}`
      }, (payload) => {
        const newMsg = payload.new as Message
        // Aggiungi solo se è relativo a questa conversazione
        if (
          (newMsg.mittente_id === currentUserId && newMsg.destinatario_id === otherUser.id) ||
          (newMsg.mittente_id === otherUser.id && newMsg.destinatario_id === currentUserId)
        ) {
          setMessages(prev => [...prev, newMsg])
          
          // Marca come letto se sono il destinatario
          if (newMsg.destinatario_id === currentUserId) {
            (supabase
              .from('messaggio_privato' as any)
              .update({ letto: true })
              .eq('id', newMsg.id) as any)
          }
        }
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [isOpen, bandoId, currentUserId, otherUser.id])

  // Handle keyboard
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  // Close on escape
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleEsc)
    return () => window.removeEventListener('keydown', handleEsc)
  }, [onClose])

  if (!isOpen) return null

  // Format time
  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const isToday = date.toDateString() === now.toDateString()
    
    if (isToday) {
      return date.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
    }
    
    return date.toLocaleDateString('it-IT', { 
      day: 'numeric', 
      month: 'short',
      hour: '2-digit', 
      minute: '2-digit' 
    })
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal Cartoon */}
      <div className="relative w-full max-w-lg bg-white rounded-2xl sm:rounded-[2rem] border-4 border-gray-900 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] flex flex-col h-[85vh] sm:h-auto sm:max-h-[85vh] animate-in fade-in zoom-in-95 duration-200 overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center gap-3 sm:gap-4 p-4 sm:p-5 border-b-4 border-gray-900 bg-yellow-300 z-10 shadow-sm">
          <div className="w-12 h-12 rounded-xl border-2 border-gray-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] overflow-hidden bg-white flex-shrink-0">
            {otherUser.avatar_url ? (
              <img 
                src={otherUser.avatar_url} 
                alt=""
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-blue-300 text-gray-900 font-black text-xl uppercase">
                {otherUser.nome?.[0]}{otherUser.cognome?.[0]}
              </div>
            )}
          </div>
          
          <div className="flex-1 min-w-0">
            <p className="font-black text-gray-900 text-lg uppercase truncate leading-tight">
              {otherUser.nome} {otherUser.cognome}
            </p>
            <p className="text-[10px] sm:text-xs font-bold text-gray-700 truncate uppercase tracking-widest bg-white inline-block px-2 py-0.5 rounded border border-gray-900 mt-1">
              📁 {bandoTitolo}
            </p>
          </div>
          
          <button
            onClick={onClose}
            className="p-2.5 bg-red-400 hover:bg-red-500 border-2 border-gray-900 rounded-xl shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all text-gray-900"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 bg-gray-50 pattern-dots relative">
          {loading ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-4xl animate-bounce">⏳</div>
            </div>
          ) : messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center">
              <div className="w-20 h-20 bg-white border-4 border-gray-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] rounded-3xl flex items-center justify-center mb-4 -rotate-6">
                <span className="text-4xl">💬</span>
              </div>
              <p className="text-gray-900 font-black uppercase text-xl">Inizia la chat!</p>
              <p className="text-gray-600 font-bold text-sm mt-1 max-w-[200px]">
                Scrivi il tuo primo messaggio per presentarti.
              </p>
            </div>
          ) : (
            <>
              {messages.map((msg, idx) => {
                const isMe = msg.mittente_id === currentUserId
                const showAvatar = idx === 0 || messages[idx - 1].mittente_id !== msg.mittente_id
                
                return (
                  <div 
                    key={msg.id} 
                    className={`flex gap-2 sm:gap-3 ${isMe ? 'flex-row-reverse' : ''}`}
                  >
                    {/* Avatar del mittente (solo per i messaggi ricevuti) */}
                    <div className={`w-8 sm:w-10 flex-shrink-0 ${showAvatar ? '' : 'invisible'}`}>
                      {!isMe && (
                        <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl border-2 border-gray-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] overflow-hidden bg-white">
                          {otherUser.avatar_url ? (
                            <img src={otherUser.avatar_url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-blue-300 text-gray-900 text-xs sm:text-sm font-black uppercase">
                              {otherUser.nome?.[0]}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    
                    {/* Fumetto (Message bubble) */}
                    <div className={`max-w-[75%] ${isMe ? 'text-right' : ''}`}>
                      <div className={`px-4 py-2.5 sm:py-3 rounded-2xl border-2 sm:border-3 border-gray-900 inline-block text-left shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] ${
                        isMe 
                          ? 'bg-blue-400 text-gray-900 rounded-br-sm' 
                          : 'bg-white text-gray-900 rounded-bl-sm'
                      }`}>
                        <p className="text-sm sm:text-base font-bold whitespace-pre-wrap break-words leading-snug">
                          {msg.testo}
                        </p>
                      </div>
                      <p className={`text-[9px] sm:text-[10px] font-black text-gray-500 uppercase tracking-widest mt-1.5 px-1 ${isMe ? 'text-right' : ''}`}>
                        {formatTime(msg.created_at)}
                        {isMe && msg.letto && (
                          <span className="ml-1 text-green-600">✓✓</span>
                        )}
                      </p>
                    </div>
                  </div>
                )
              })}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Input Area */}
        <div className="p-3 sm:p-5 border-t-4 border-gray-900 bg-white z-10">
          <div className="flex gap-2 sm:gap-3">
            <input
              ref={inputRef}
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Scrivi qui..."
              className="flex-1 px-3 sm:px-4 py-3 bg-gray-50 border-3 border-gray-900 rounded-xl focus:bg-white focus:outline-none focus:translate-x-[2px] focus:translate-y-[2px] focus:shadow-none shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] text-gray-900 font-bold text-sm sm:text-base placeholder:text-gray-500 placeholder:italic transition-all"
            />
            <button
              onClick={sendMessage}
              disabled={!newMessage.trim() || sending}
              className="px-4 sm:px-6 py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl font-black text-xl sm:text-2xl border-3 border-gray-900 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center"
            >
              {sending ? (
                <span className="animate-spin text-lg">⏳</span>
              ) : (
                <span>🚀</span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}