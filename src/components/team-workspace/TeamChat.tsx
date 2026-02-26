'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getMemberColor, REACTION_EMOJIS } from '@/lib/member-colors'

interface Message {
  id: string
  testo: string
  created_at: string
  file_url?: string
  file_nome?: string
  file_tipo?: string
  menzioni?: string[]
  studente: {
    id: string
    nome: string
    cognome: string
    avatar_url: string | null
  }
  reazioni?: { emoji: string; count: number; users: string[] }[]
  is_pinned?: boolean
}

interface TeamMember {
  id: string
  nome: string
  cognome: string
  avatar_url: string | null
}

interface TeamChatProps {
  bandoId: string
  currentUserId: string
  members: TeamMember[]
  projectTitle: string
  isAdmin: boolean
}

// Opzioni per lo sfondo della chat
const BG_OPTIONS = [
  { id: 'gray', class: 'bg-gray-100' },
  { id: 'blue', class: 'bg-blue-50' },
  { id: 'yellow', class: 'bg-yellow-50' },
  { id: 'pink', class: 'bg-pink-50' },
  { id: 'green', class: 'bg-green-50' },
  { id: 'purple', class: 'bg-purple-50' }
]

export default function TeamChat({ 
  bandoId, 
  currentUserId, 
  members,
  projectTitle,
  isAdmin 
}: TeamChatProps) {
  const supabase = createClient()
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [messages, setMessages] = useState<Message[]>([])
  const [pinnedMessages, setPinnedMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [sendingMessage, setSendingMessage] = useState(false)
  const [typingUsers, setTypingUsers] = useState<string[]>([])
  const [showEmojiPicker, setShowEmojiPicker] = useState<string | null>(null)
  const [showMentions, setShowMentions] = useState(false)
  const [mentionSearch, setMentionSearch] = useState('')
  const [uploadingFile, setUploadingFile] = useState(false)
  const [showPinned, setShowPinned] = useState(false) // Meglio default false per non occupare spazio su mobile
  
  // Stato per personalizzare lo sfondo
  const [chatBg, setChatBg] = useState(BG_OPTIONS[0].class)
  const [showBgPicker, setShowBgPicker] = useState(false)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const scrollToMessage = (msgId: string) => {
    const el = document.getElementById(`message-${msgId}`)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      el.animate([
        { backgroundColor: 'rgba(251, 191, 36, 0.4)' },
        { backgroundColor: 'transparent' }
      ], { duration: 1500 })
    }
  }

  const fetchMessages = useCallback(async () => {
    if (!bandoId) return

    const { data: messagesData } = await (supabase as any)
      .from('messaggio_team')
      .select(`
        id, testo, created_at, file_url, file_nome, file_tipo, menzioni,
        studente:studente_id (id, nome, cognome, avatar_url)
      `)
      .eq('bando_id', bandoId)
      .order('created_at', { ascending: true })
      .limit(100)

    if (messagesData) {
      const messagesWithReactions = await Promise.all(
        messagesData.map(async (msg: any) => {
          const { data: reactions } = await (supabase as any)
            .from('messaggio_team_reazione')
            .select('emoji, studente_id')
            .eq('messaggio_id', msg.id)

          const reactionMap: Record<string, { count: number; users: string[] }> = {}
          reactions?.forEach((r: any) => {
            if (!reactionMap[r.emoji]) {
              reactionMap[r.emoji] = { count: 0, users: [] }
            }
            reactionMap[r.emoji].count++
            reactionMap[r.emoji].users.push(r.studente_id)
          })

          return {
            ...msg,
            reazioni: Object.entries(reactionMap).map(([emoji, data]) => ({
              emoji,
              ...data
            }))
          }
        })
      )

      setMessages(messagesWithReactions)
      setTimeout(scrollToBottom, 100)
    }

    const { data: pinnedData } = await (supabase as any)
      .from('messaggio_team_pin')
      .select(`
        messaggio:messaggio_id (
          id, testo, created_at,
          studente:studente_id (id, nome, cognome, avatar_url)
        )
      `)
      .eq('bando_id', bandoId)

    if (pinnedData) {
      setPinnedMessages(pinnedData.map((p: any) => ({ ...p.messaggio, is_pinned: true })))
    }
  }, [bandoId, supabase])

  useEffect(() => {
    fetchMessages()
  }, [fetchMessages])

  useEffect(() => {
    if (!bandoId || !currentUserId) return

    const channel = supabase
      .channel(`team-chat-${bandoId}`)
      .on('postgres_changes' as any, {
        event: 'INSERT',
        schema: 'public',
        table: 'messaggio_team',
        filter: `bando_id=eq.${bandoId}`
      }, async (payload: any) => {
        if (payload.new.studente_id === currentUserId) return

        const { data: studenteData } = await supabase
          .from('studente')
          .select('id, nome, cognome, avatar_url')
          .eq('id', payload.new.studente_id)
          .single()

        if (studenteData) {
          const newMsg: Message = {
            id: payload.new.id,
            testo: payload.new.testo,
            created_at: payload.new.created_at,
            file_url: payload.new.file_url,
            file_nome: payload.new.file_nome,
            file_tipo: payload.new.file_tipo,
            menzioni: payload.new.menzioni,
            studente: studenteData,
            reazioni: []
          }
          setMessages(prev => [...prev, newMsg])
          setTimeout(scrollToBottom, 100)
        }
      })
      .on('postgres_changes' as any, {
        event: '*',
        schema: 'public',
        table: 'messaggio_team_reazione'
      }, () => {
        fetchMessages()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [bandoId, currentUserId, fetchMessages])

  useEffect(() => {
    if (!bandoId || !currentUserId) return

    const channel = supabase
      .channel(`typing-${bandoId}`)
      .on('postgres_changes' as any, {
        event: '*',
        schema: 'public',
        table: 'team_typing',
        filter: `bando_id=eq.${bandoId}`
      }, async () => {
        const { data } = await (supabase as any)
          .from('team_typing')
          .select('studente_id')
          .eq('bando_id', bandoId)
          .neq('studente_id', currentUserId)
          .gte('updated_at', new Date(Date.now() - 3000).toISOString())

        setTypingUsers(data?.map((t: any) => t.studente_id) || [])
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [bandoId, currentUserId])

  const updateTyping = useCallback(async () => {
    if (!bandoId || !currentUserId) return
    
    await (supabase as any)
      .from('team_typing')
      .upsert({
        bando_id: bandoId,
        studente_id: currentUserId,
        updated_at: new Date().toISOString()
      }, { onConflict: 'bando_id,studente_id' })
  }, [bandoId, currentUserId, supabase])

  const clearTyping = useCallback(async () => {
    if (!bandoId || !currentUserId) return
    
    await (supabase as any)
      .from('team_typing')
      .delete()
      .eq('bando_id', bandoId)
      .eq('studente_id', currentUserId)
  }, [bandoId, currentUserId, supabase])

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value
    setNewMessage(value)
    updateTyping()

    const lastAtIndex = value.lastIndexOf('@')
    if (lastAtIndex !== -1) {
      const afterAt = value.slice(lastAtIndex + 1)
      if (!afterAt.includes(' ')) {
        setShowMentions(true)
        setMentionSearch(afterAt.toLowerCase())
      } else {
        setShowMentions(false)
      }
    } else {
      setShowMentions(false)
    }
  }

  const insertMention = (member: TeamMember) => {
    const lastAtIndex = newMessage.lastIndexOf('@')
    const newText = newMessage.slice(0, lastAtIndex) + `@${member.nome} `
    setNewMessage(newText)
    setShowMentions(false)
    inputRef.current?.focus()
  }

  const sendMessage = async () => {
    if (!newMessage.trim() || sendingMessage || !currentUserId || !bandoId) return

    setSendingMessage(true)
    clearTyping()

    const mentionRegex = /@(\w+)/g
    const mentionedNames = [...newMessage.matchAll(mentionRegex)].map(m => m[1].toLowerCase())
    const mentionedIds = members
      .filter(m => mentionedNames.includes(m.nome.toLowerCase()))
      .map(m => m.id)

    const { data, error } = await (supabase as any)
      .from('messaggio_team')
      .insert({
        bando_id: bandoId,
        studente_id: currentUserId,
        testo: newMessage.trim(),
        menzioni: mentionedIds.length > 0 ? mentionedIds : null
      })
      .select(`
        id, testo, created_at, menzioni,
        studente:studente_id (id, nome, cognome, avatar_url)
      `)
      .single()

    if (!error && data) {
      setMessages(prev => [...prev, { ...data, reazioni: [] }])
      setNewMessage('')
      setTimeout(scrollToBottom, 100)

      await (supabase as any)
        .from('user_team_stats')
        .upsert({
          studente_id: currentUserId,
          bando_id: bandoId,
          messaggi_count: 1,
          ultimo_giorno_attivo: new Date().toISOString().split('T')[0]
        }, { 
          onConflict: 'studente_id,bando_id',
          count: 'exact'
        })
    }

    setSendingMessage(false)
  }

  const toggleReaction = async (messageId: string, emoji: string) => {
    try {
      const message = messages.find(m => m.id === messageId)
      const existingReaction = message?.reazioni?.find(r => r.emoji === emoji && r.users.includes(currentUserId))

      if (existingReaction) {
        const { error } = await (supabase as any)
          .from('messaggio_team_reazione')
          .delete()
          .eq('messaggio_id', messageId)
          .eq('studente_id', currentUserId)
          .eq('emoji', emoji)
        if (error) throw error
      } else {
        const { error } = await (supabase as any)
          .from('messaggio_team_reazione')
          .insert({
            messaggio_id: messageId,
            studente_id: currentUserId,
            emoji
          })
        if (error) throw error
      }

      setShowEmojiPicker(null)
      fetchMessages()
    } catch (err: any) {
      alert("Errore durante l'aggiunta della reazione: " + err.message)
    }
  }

  const togglePin = async (messageId: string, isPinned: boolean) => {
    try {
      if (isPinned) {
        const { error } = await (supabase as any)
          .from('messaggio_team_pin')
          .delete()
          .eq('messaggio_id', messageId)
        if (error) throw error
      } else {
        const { error } = await (supabase as any)
          .from('messaggio_team_pin')
          .insert({
            messaggio_id: messageId,
            bando_id: bandoId,
            pinned_by: currentUserId 
          })
        if (error) throw error
      }
      fetchMessages()
    } catch (err: any) {
      console.error("Errore Pin dettagliato:", err)
      alert("Errore durante il pin: " + err.message)
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadingFile(true)

    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`

      const { error: uploadError } = await supabase.storage
        .from('team-files')
        .upload(`${bandoId}/${fileName}`, file)

      if (uploadError) throw uploadError

      const { data: urlData } = supabase.storage
        .from('team-files')
        .getPublicUrl(`${bandoId}/${fileName}`)

      const fileType = file.type.startsWith('image/') ? 'image' : 'document'

      const { error: msgError } = await (supabase as any)
        .from('messaggio_team')
        .insert({
          bando_id: bandoId,
          studente_id: currentUserId,
          testo: `📎 ${file.name}`,
          file_url: urlData.publicUrl,
          file_nome: file.name,
          file_tipo: fileType
        })
      
      if (msgError) throw msgError

      fetchMessages()
    } catch (err: any) {
      console.error('Upload error:', err)
      alert('Errore caricamento. Dettaglio: ' + err.message)
    }

    setUploadingFile(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleEmailTeam = () => {
    const teamEmails = members
      .filter(m => m.id !== currentUserId)
      .map(m => (m as any).email)
      .filter(Boolean)
      .join(',')
    
    if (teamEmails) {
      const subject = encodeURIComponent(`[${projectTitle}] Aggiornamento dal team`)
      window.open(`https://mail.google.com/mail/?view=cm&fs=1&to=${teamEmails}&su=${subject}`, '_blank')
    }
  }

  const renderMessageText = (text: string, menzioni?: string[]) => {
    if (!menzioni || menzioni.length === 0) return text

    const parts = text.split(/(@\w+)/g)
    return parts.map((part, i) => {
      if (part.startsWith('@')) {
        const name = part.slice(1).toLowerCase()
        const member = members.find(m => m.nome.toLowerCase() === name)
        if (member && menzioni.includes(member.id)) {
          const color = getMemberColor(member.id)
          return (
            <span key={i} className={`${color.light} ${color.text} px-1 rounded font-black border-b-2 ${color.border}`}>
              {part}
            </span>
          )
        }
      }
      return part
    })
  }

  const getTypingNames = () => {
    const names = typingUsers
      .map(id => members.find(m => m.id === id))
      .filter(Boolean)
      .map(m => m!.nome)
    
    if (names.length === 0) return null
    if (names.length === 1) return `${names[0]} sta scrivendo...`
    if (names.length === 2) return `${names[0]} e ${names[1]} stanno scrivendo...`
    return `${names.length} persone stanno scrivendo...`
  }

  const filteredMembers = members.filter(m => 
    m.id !== currentUserId && 
    (m.nome.toLowerCase().includes(mentionSearch) || m.cognome.toLowerCase().includes(mentionSearch))
  )

  const cardStyle = "bg-white rounded-2xl border-2 border-gray-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"

  return (
    <div className={`${cardStyle} overflow-hidden flex flex-col h-[75vh] min-h-[500px] max-h-[800px]`}>
      
      {/* HEADER */}
      <div className="p-3 sm:p-4 border-b-2 border-gray-900 flex items-center justify-between bg-gray-50 z-20 relative">
        <div className="flex items-center gap-2 sm:gap-3">
          <h2 className="text-base sm:text-lg font-black text-gray-900 flex items-center gap-1 sm:gap-2">
            <span>💬</span> <span className="hidden sm:inline">Chat Team</span>
          </h2>
          <span className="text-[10px] sm:text-xs text-gray-900 font-black bg-white px-2 py-1 rounded-lg border-2 border-gray-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
            {messages.length} msg
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Selettore Sfondo Chat */}
          <div className="relative">
            <button 
              onClick={() => setShowBgPicker(!showBgPicker)}
              className="p-1.5 sm:p-2 bg-white rounded-xl text-xs sm:text-sm border-2 border-gray-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none transition-all"
              title="Cambia sfondo"
            >
              🎨
            </button>
            {showBgPicker && (
              <div className="absolute top-full right-0 mt-2 bg-white border-2 border-gray-900 rounded-xl p-2 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex gap-1 z-50">
                {BG_OPTIONS.map((bg) => (
                  <button 
                    key={bg.id}
                    onClick={() => { setChatBg(bg.class); setShowBgPicker(false) }}
                    className={`w-6 h-6 rounded-md border border-gray-900 ${bg.class} ${chatBg === bg.class ? 'ring-2 ring-gray-900 ring-offset-1' : ''}`}
                  />
                ))}
              </div>
            )}
          </div>

          {pinnedMessages.length > 0 && (
            <button
              onClick={() => setShowPinned(!showPinned)}
              className={`px-2 sm:px-4 py-1.5 sm:py-2 rounded-xl text-[10px] sm:text-xs font-black transition-all border-2 border-gray-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none ${
                showPinned 
                  ? 'bg-amber-400 text-gray-900' 
                  : 'bg-white text-gray-900 hover:bg-amber-100'
              }`}
            >
              📌 {pinnedMessages.length} <span className="hidden xs:inline">Fissati</span>
            </button>
          )}
        </div>
      </div>

      {/* MESSAGGI FISSATI */}
      {showPinned && pinnedMessages.length > 0 && (
        <div className="p-2 sm:p-3 bg-amber-50 border-b-2 border-gray-900 max-h-32 overflow-y-auto z-10 relative">
          <p className="text-[10px] font-black text-gray-900 mb-1 sm:mb-2 uppercase tracking-widest">📌 Messaggi Fissati</p>
          {pinnedMessages.map(msg => (
            <div 
              key={msg.id} 
              onClick={() => scrollToMessage(msg.id)}
              className="flex items-center gap-2 text-xs bg-white p-2 rounded-xl border-2 border-gray-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] mb-2 cursor-pointer hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all"
            >
              <img src={msg.studente?.avatar_url || '/default-avatar.png'} className="w-5 h-5 sm:w-6 sm:h-6 rounded-full border border-gray-900 flex-shrink-0" alt="" />
              <span className="font-black text-gray-900 flex-shrink-0">{msg.studente?.nome}:</span>
              <span className="text-gray-900 font-bold truncate flex-1">{msg.testo}</span>
              {isAdmin && (
                <button 
                  onClick={(e) => { 
                    e.stopPropagation() 
                    togglePin(msg.id, true) 
                  }} 
                  className="text-red-600 hover:text-red-800 p-1 font-black text-sm rounded-md flex-shrink-0"
                >
                  ✕
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* AREA MESSAGGI CHAT */}
      <div className={`flex-1 overflow-y-auto p-3 sm:p-4 space-y-4 ${chatBg} pattern-dots transition-colors duration-300`}>
        {messages.length === 0 ? (
          <div className="h-full flex items-center justify-center text-center">
            <div className={`${cardStyle} p-6 sm:p-8 bg-white`}>
              <span className="text-4xl sm:text-5xl block mb-3">💬</span>
              <p className="text-gray-900 font-black text-base sm:text-lg">Nessun messaggio ancora</p>
              <p className="text-gray-700 text-xs sm:text-sm font-bold mt-1">Rompi il ghiaccio, inizia la conversazione!</p>
            </div>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.studente?.id === currentUserId
            const color = getMemberColor(msg.studente?.id || '')
            const isPinned = pinnedMessages.some(p => p.id === msg.id)

            return (
              <div id={`message-${msg.id}`} key={msg.id} className={`flex gap-2 sm:gap-3 ${isMe ? 'flex-row-reverse' : ''} group`}>
                <img 
                  src={msg.studente?.avatar_url || '/default-avatar.png'} 
                  alt=""
                  className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl object-cover flex-shrink-0 border-2 border-gray-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                />
                <div className={`max-w-[85%] sm:max-w-[75%] ${isMe ? 'text-right' : ''}`}>
                  <div className={`flex items-center gap-2 mb-1 ${isMe ? 'justify-end' : ''}`}>
                    <p className="text-[10px] sm:text-xs font-black text-gray-900">
                      {msg.studente?.nome} {msg.studente?.cognome}
                    </p>
                    <p className="text-[9px] sm:text-[10px] text-gray-600 font-bold">
                      {new Date(msg.created_at).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                    {isPinned && <span className="text-[10px]">📌</span>}
                  </div>

                  <div 
                    className={`px-3 py-2 sm:px-4 sm:py-3 rounded-2xl border-2 border-gray-900 text-left relative text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] sm:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] ${color.bg} ${
                      isMe ? 'rounded-br-sm' : 'rounded-bl-sm'
                    }`}
                    style={color.bgHex ? { backgroundColor: color.bgHex } : undefined}
                  >
                    {msg.file_url && (
                      <div className="mb-2">
                        {msg.file_tipo === 'image' ? (
                          <img 
                            src={msg.file_url} 
                            alt={msg.file_nome} 
                            className="max-w-full rounded-xl border-2 border-gray-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] cursor-pointer hover:scale-[1.02] transition-transform"
                            onClick={() => window.open(msg.file_url, '_blank')}
                          />
                        ) : (
                          <a 
                            href={msg.file_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 px-2 sm:px-3 py-1.5 sm:py-2 rounded-xl bg-white text-gray-900 font-bold border-2 border-gray-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all"
                          >
                            <span className="text-lg sm:text-xl">📄</span>
                            <span className="text-xs sm:text-sm truncate">{msg.file_nome}</span>
                          </a>
                        )}
                      </div>
                    )}

                    <p className="text-sm sm:text-base font-medium break-words leading-snug">
                      {renderMessageText(msg.testo, msg.menzioni)}
                    </p>

                    {msg.reazioni && msg.reazioni.length > 0 && (
                      <div className={`flex flex-wrap gap-1.5 mt-2 sm:mt-3 ${isMe ? 'justify-end' : ''}`}>
                        {msg.reazioni.map((r, i) => (
                          <button
                            key={i}
                            onClick={() => toggleReaction(msg.id, r.emoji)}
                            className={`px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-lg text-[10px] sm:text-xs font-black flex items-center gap-1 transition-all border-2 border-gray-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none ${
                              r.users.includes(currentUserId)
                                ? 'bg-yellow-300 text-gray-900'
                                : 'bg-white text-gray-900'
                            }`}
                          >
                            <span className="text-xs sm:text-sm">{r.emoji}</span>
                            <span>{r.count}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Pulsanti Azione Messaggio */}
                  <div className={`flex gap-1 sm:gap-2 mt-1.5 sm:mt-2 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity relative ${isMe ? 'justify-end' : ''}`}>
                    <button
                      onClick={() => setShowEmojiPicker(showEmojiPicker === msg.id ? null : msg.id)}
                      className="p-1 sm:p-1.5 text-xs sm:text-sm bg-white border-2 border-gray-900 rounded-lg shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-yellow-300 hover:shadow-none transition-all"
                      title="Reagisci"
                    >
                      😊
                    </button>
                    {isAdmin && (
                      <button
                        onClick={() => togglePin(msg.id, isPinned)}
                        className={`p-1 sm:p-1.5 text-xs sm:text-sm bg-white border-2 border-gray-900 rounded-lg shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-amber-300 hover:shadow-none transition-all ${isPinned ? 'bg-amber-300' : ''}`}
                        title={isPinned ? 'Rimuovi pin' : 'Fissa messaggio'}
                      >
                        📌
                      </button>
                    )}

                    {showEmojiPicker === msg.id && (
                      <div className={`absolute bottom-full mb-2 ${isMe ? 'right-0' : 'left-0'} bg-white rounded-xl sm:rounded-2xl border-[3px] border-gray-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-1.5 sm:p-2 flex gap-1 z-50`}>
                        {REACTION_EMOJIS.map(emoji => (
                          <button
                            key={emoji}
                            onClick={() => toggleReaction(msg.id, emoji)}
                            className="p-1.5 sm:p-2 hover:bg-gray-100 rounded-lg sm:rounded-xl text-lg sm:text-xl transition-transform hover:scale-125"
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {typingUsers.length > 0 && (
        <div className="px-3 py-1.5 bg-yellow-50 border-t-2 border-gray-900">
          <div className="flex items-center gap-2 text-[10px] sm:text-xs text-gray-900 font-black uppercase tracking-widest">
            <div className="flex space-x-1">
              <span className="w-1.5 h-1.5 bg-gray-900 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
              <span className="w-1.5 h-1.5 bg-gray-900 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
              <span className="w-1.5 h-1.5 bg-gray-900 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
            </div>
            <span>{getTypingNames()}</span>
          </div>
        </div>
      )}

      {/* ZONA INPUT MESSAGGIO */}
      <div className="p-3 sm:p-4 border-t-2 border-gray-900 bg-white relative">
        {showMentions && filteredMembers.length > 0 && (
          <div className="absolute bottom-full left-3 right-3 sm:left-4 sm:right-4 mb-2 bg-white rounded-xl border-[3px] border-gray-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] max-h-40 overflow-y-auto z-50">
            {filteredMembers.map(member => (
              <button
                key={member.id}
                onClick={() => insertMention(member)}
                className="w-full flex items-center gap-2 sm:gap-3 p-2 sm:p-3 hover:bg-yellow-100 transition-colors text-left border-b-2 border-gray-200 last:border-b-0"
              >
                <img 
                  src={member.avatar_url || '/default-avatar.png'} 
                  className="w-6 h-6 sm:w-8 sm:h-8 rounded-lg border-2 border-gray-900 object-cover"
                  alt=""
                />
                <div>
                  <p className="font-black text-xs sm:text-sm text-gray-900">{member.nome} {member.cognome}</p>
                </div>
              </button>
            ))}
          </div>
        )}

        <div className="flex gap-2">
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={handleFileUpload}
            accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt"
          />
          {/* BOTTONE ALLEGATI - Grandezza fissa su mobile */}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadingFile}
            className="w-12 h-12 sm:w-14 sm:h-[52px] flex-shrink-0 flex items-center justify-center bg-blue-300 hover:bg-blue-400 rounded-xl border-2 border-gray-900 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] sm:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all disabled:opacity-50"
            title="Allega file"
          >
            <span className="text-xl">{uploadingFile ? '⏳' : '📎'}</span>
          </button>

          {/* TEXTAREA OTTIMIZZATA PER LA LETTURA */}
          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              value={newMessage}
              onChange={handleInputChange}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  sendMessage()
                }
              }}
              onBlur={clearTyping}
              placeholder="Scrivi qui... (@ tagga)"
              // text-base previene lo zoom su iOS. font-bold invece di font-black per renderlo leggibile
              className="w-full h-12 sm:h-[52px] px-3 sm:px-4 py-3 bg-white text-gray-900 placeholder:text-gray-500 rounded-xl border-2 border-gray-900 focus:outline-none shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] sm:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] focus:translate-x-[2px] focus:translate-y-[2px] focus:shadow-none text-base sm:text-sm font-bold resize-none transition-all leading-tight"
            />
          </div>

          {/* BOTTONE INVIA - Grandezza fissa su mobile */}
          <button
            onClick={sendMessage}
            disabled={!newMessage.trim() || sendingMessage}
            className="w-12 h-12 sm:w-16 sm:h-[52px] flex-shrink-0 flex items-center justify-center bg-red-500 hover:bg-red-600 text-white rounded-xl font-black text-xl disabled:opacity-50 border-2 border-gray-900 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] sm:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all"
            title="Invia messaggio"
          >
            {sendingMessage ? '...' : '↗'}
          </button>
        </div>

        {/* BOTTONE EMAIL TEAM CARTOON */}
        {isAdmin && (
          <button
            onClick={handleEmailTeam}
            className="mt-3 w-full py-2.5 sm:py-3 text-[10px] sm:text-xs font-black uppercase tracking-widest text-gray-900 bg-yellow-300 hover:bg-yellow-400 rounded-xl transition-all flex items-center justify-center gap-2 border-2 border-gray-900 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none"
          >
            <svg className="w-4 h-4 sm:w-5 sm:h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20 18h-2V9.25L12 13 6 9.25V18H4V6h1.2l6.8 4.25L18.8 6H20m0-2H4c-1.11 0-2 .89-2 2v12a2 2 0 002 2h16a2 2 0 002-2V6a2 2 0 00-2-2z"/>
            </svg>
            Invia Email al Team
          </button>
        )}
      </div>
    </div>
  )
}