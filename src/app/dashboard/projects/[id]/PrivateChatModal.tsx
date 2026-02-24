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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh] animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center gap-4 p-4 border-b border-gray-100 bg-white">
          <div className="w-10 h-10 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0">
            {otherUser.avatar_url ? (
              <img 
                src={otherUser.avatar_url} 
                alt=""
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-400 font-bold">
                {otherUser.nome?.[0]}{otherUser.cognome?.[0]}
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-gray-900 truncate">
              {otherUser.nome} {otherUser.cognome}
            </p>
            <p className="text-xs text-gray-500 truncate">
              📁 {bandoTitolo}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-xl text-gray-500 hover:text-gray-700 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50 min-h-[300px]">
          {loading ? (
            <div className="h-full flex items-center justify-center">
              <div className="w-8 h-8 border-3 border-gray-300 border-t-blue-600 rounded-full animate-spin" />
            </div>
          ) : messages.length === 0 ? (
            <div className="h-full flex items-center justify-center text-center">
              <div>
                <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                  <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
                <p className="text-gray-600 font-medium">Inizia la conversazione!</p>
                <p className="text-gray-400 text-sm mt-1">
                  Chiedi informazioni sul progetto
                </p>
              </div>
            </div>
          ) : (
            <>
              {messages.map((msg, idx) => {
                const isMe = msg.mittente_id === currentUserId
                const showAvatar = idx === 0 || messages[idx - 1].mittente_id !== msg.mittente_id
                
                return (
                  <div 
                    key={msg.id} 
                    className={`flex gap-2 ${isMe ? 'flex-row-reverse' : ''}`}
                  >
                    {/* Avatar */}
                    <div className={`w-8 flex-shrink-0 ${showAvatar ? '' : 'invisible'}`}>
                      {!isMe && (
                        <div className="w-8 h-8 rounded-lg overflow-hidden bg-gray-200">
                          {otherUser.avatar_url ? (
                            <img src={otherUser.avatar_url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs font-bold">
                              {otherUser.nome?.[0]}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    
                    {/* Message bubble */}
                    <div className={`max-w-[75%] ${isMe ? 'text-right' : ''}`}>
                      <div className={`px-4 py-2.5 rounded-2xl inline-block text-left ${
                        isMe 
                          ? 'bg-blue-600 text-white rounded-br-md' 
                          : 'bg-white border border-gray-200 text-gray-900 rounded-bl-md'
                      }`}>
                        <p className="text-sm whitespace-pre-wrap break-words">{msg.testo}</p>
                      </div>
                      <p className={`text-[10px] text-gray-400 mt-1 px-1 ${isMe ? 'text-right' : ''}`}>
                        {formatTime(msg.created_at)}
                        {isMe && msg.letto && (
                          <span className="ml-1 text-blue-500">✓✓</span>
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

        {/* Input */}
        <div className="p-4 border-t border-gray-100 bg-white">
          <div className="flex gap-2">
            <input
              ref={inputRef}
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Scrivi un messaggio..."
              className="flex-1 px-4 py-2.5 bg-gray-100 rounded-xl border-0 focus:ring-2 focus:ring-blue-500 outline-none text-sm"
            />
            <button
              onClick={sendMessage}
              disabled={!newMessage.trim() || sending}
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              {sending ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}