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
  const [showPinned, setShowPinned] = useState(false)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  // Fetch messages con reazioni
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
      // Fetch reazioni per ogni messaggio
      const messagesWithReactions = await Promise.all(
        messagesData.map(async (msg: any) => {
          const { data: reactions } = await (supabase as any)
            .from('messaggio_team_reazione')
            .select('emoji, studente_id')
            .eq('messaggio_id', msg.id)

          // Raggruppa reazioni
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

    // Fetch pinned messages
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

  // Realtime messages
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

  // Typing indicator
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

  // Update typing status
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

  // Clear typing when done
  const clearTyping = useCallback(async () => {
    if (!bandoId || !currentUserId) return
    
    await (supabase as any)
      .from('team_typing')
      .delete()
      .eq('bando_id', bandoId)
      .eq('studente_id', currentUserId)
  }, [bandoId, currentUserId, supabase])

  // Handle input change with typing and mentions
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value
    setNewMessage(value)
    updateTyping()

    // Check for @ mentions
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

  // Insert mention
  const insertMention = (member: TeamMember) => {
    const lastAtIndex = newMessage.lastIndexOf('@')
    const newText = newMessage.slice(0, lastAtIndex) + `@${member.nome} `
    setNewMessage(newText)
    setShowMentions(false)
    inputRef.current?.focus()
  }

  // Send message
  const sendMessage = async () => {
    if (!newMessage.trim() || sendingMessage || !currentUserId || !bandoId) return

    setSendingMessage(true)
    clearTyping()

    // Extract mentions
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

      // Update stats
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

  // Toggle reaction
  const toggleReaction = async (messageId: string, emoji: string) => {
    const message = messages.find(m => m.id === messageId)
    const existingReaction = message?.reazioni?.find(r => r.emoji === emoji && r.users.includes(currentUserId))

    if (existingReaction) {
      await (supabase as any)
        .from('messaggio_team_reazione')
        .delete()
        .eq('messaggio_id', messageId)
        .eq('studente_id', currentUserId)
        .eq('emoji', emoji)
    } else {
      await (supabase as any)
        .from('messaggio_team_reazione')
        .insert({
          messaggio_id: messageId,
          studente_id: currentUserId,
          emoji
        })
    }

    setShowEmojiPicker(null)
    fetchMessages()
  }

  // Pin/Unpin message
  const togglePin = async (messageId: string, isPinned: boolean) => {
    if (isPinned) {
      await (supabase as any)
        .from('messaggio_team_pin')
        .delete()
        .eq('messaggio_id', messageId)
    } else {
      await (supabase as any)
        .from('messaggio_team_pin')
        .insert({
          messaggio_id: messageId,
          bando_id: bandoId,
          pinned_by: currentUserId
        })
    }
    fetchMessages()
  }

  // Upload file
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

      // Send message with file
      const fileType = file.type.startsWith('image/') ? 'image' : 'document'

      await (supabase as any)
        .from('messaggio_team')
        .insert({
          bando_id: bandoId,
          studente_id: currentUserId,
          testo: `📎 ${file.name}`,
          file_url: urlData.publicUrl,
          file_nome: file.name,
          file_tipo: fileType
        })

      fetchMessages()
    } catch (err) {
      console.error('Upload error:', err)
      alert('Errore durante il caricamento del file')
    }

    setUploadingFile(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  // Open Gmail for email
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

  // Render message text with mentions highlighted
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
            <span key={i} className={`${color.light} ${color.text} px-1 rounded font-bold`}>
              {part}
            </span>
          )
        }
      }
      return part
    })
  }

  // Get typing users names
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

  // Filter members for mentions
  const filteredMembers = members.filter(m => 
    m.id !== currentUserId && 
    (m.nome.toLowerCase().includes(mentionSearch) || m.cognome.toLowerCase().includes(mentionSearch))
  )

  // Stile cartoon
  const cardStyle = "bg-white rounded-2xl border-2 border-gray-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"

  return (
    <div className={`${cardStyle} overflow-hidden flex flex-col h-[600px]`}>
      {/* Header */}
      <div className="p-4 border-b-2 border-gray-900 flex items-center justify-between bg-gray-50">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-black text-gray-900 flex items-center gap-2">
            <span>💬</span> Chat Team
          </h2>
          <span className="text-xs text-gray-500 font-bold bg-white px-2 py-1 rounded-lg border border-gray-300">
            {messages.length} messaggi
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Pinned messages toggle */}
          {pinnedMessages.length > 0 && (
            <button
              onClick={() => setShowPinned(!showPinned)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border-2 ${
                showPinned 
                  ? 'bg-amber-500 text-white border-amber-600' 
                  : 'bg-amber-100 text-amber-700 border-amber-300 hover:bg-amber-200'
              }`}
            >
              📌 {pinnedMessages.length}
            </button>
          )}
        </div>
      </div>

      {/* Pinned messages panel */}
      {showPinned && pinnedMessages.length > 0 && (
        <div className="p-3 bg-amber-50 border-b-2 border-amber-300 max-h-32 overflow-y-auto">
          <p className="text-xs font-bold text-amber-600 mb-2">📌 Messaggi Fissati</p>
          {pinnedMessages.map(msg => (
            <div key={msg.id} className="flex items-center gap-2 text-xs bg-white p-2 rounded-lg border border-amber-200 mb-1">
              <img src={msg.studente?.avatar_url || '/default-avatar.png'} className="w-5 h-5 rounded-full" alt="" />
              <span className="font-medium">{msg.studente?.nome}:</span>
              <span className="text-gray-600 truncate flex-1">{msg.testo}</span>
              {isAdmin && (
                <button onClick={() => togglePin(msg.id, true)} className="text-red-500 hover:text-red-700">✕</button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-100">
        {messages.length === 0 ? (
          <div className="h-full flex items-center justify-center text-center">
            <div className={`${cardStyle} p-8`}>
              <span className="text-5xl block mb-3">💬</span>
              <p className="text-gray-900 font-bold">Nessun messaggio ancora</p>
              <p className="text-gray-500 text-sm">Inizia la conversazione!</p>
            </div>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.studente?.id === currentUserId
            const color = getMemberColor(msg.studente?.id || '')
            const isPinned = pinnedMessages.some(p => p.id === msg.id)

            return (
              <div key={msg.id} className={`flex gap-3 ${isMe ? 'flex-row-reverse' : ''} group`}>
                <img 
                  src={msg.studente?.avatar_url || '/default-avatar.png'} 
                  alt=""
                  className={`w-9 h-9 rounded-xl object-cover flex-shrink-0 border-2 ${color.border}`}
                />
                <div className={`max-w-[70%] ${isMe ? 'text-right' : ''}`}>
                  {/* Name and time */}
                  <div className={`flex items-center gap-2 mb-1 ${isMe ? 'justify-end' : ''}`}>
                    <span className={`w-2 h-2 rounded-full ${color.bg}`}></span>
                    <p className="text-xs font-bold text-gray-600">
                      {msg.studente?.nome} {msg.studente?.cognome}
                    </p>
                    <p className="text-[10px] text-gray-400">
                      {new Date(msg.created_at).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                    {isPinned && <span className="text-xs">📌</span>}
                  </div>

                  {/* Message bubble */}
                  <div 
                    className={`px-4 py-2.5 rounded-2xl border-2 text-left relative ${
                      isMe 
                        ? `${color.bg} text-white ${color.border} rounded-br-md` 
                        : 'bg-white text-gray-900 border-gray-300 rounded-bl-md'
                    }`}
                    style={isMe ? { backgroundColor: color.bgHex } : undefined}
                  >
                    {/* File preview */}
                    {msg.file_url && (
                      <div className="mb-2">
                        {msg.file_tipo === 'image' ? (
                          <img 
                            src={msg.file_url} 
                            alt={msg.file_nome} 
                            className="max-w-full rounded-lg border border-white/30 cursor-pointer"
                            onClick={() => window.open(msg.file_url, '_blank')}
                          />
                        ) : (
                          <a 
                            href={msg.file_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className={`flex items-center gap-2 px-3 py-2 rounded-lg ${isMe ? 'bg-white/20' : 'bg-gray-100'}`}
                          >
                            <span>📄</span>
                            <span className="text-sm underline">{msg.file_nome}</span>
                          </a>
                        )}
                      </div>
                    )}

                    <p className="text-sm break-words">
                      {renderMessageText(msg.testo, msg.menzioni)}
                    </p>

                    {/* Reactions */}
                    {msg.reazioni && msg.reazioni.length > 0 && (
                      <div className={`flex flex-wrap gap-1 mt-2 ${isMe ? 'justify-end' : ''}`}>
                        {msg.reazioni.map((r, i) => (
                          <button
                            key={i}
                            onClick={() => toggleReaction(msg.id, r.emoji)}
                            className={`px-2 py-0.5 rounded-full text-xs font-bold flex items-center gap-1 transition-all ${
                              r.users.includes(currentUserId)
                                ? 'bg-blue-500 text-white border-2 border-blue-600'
                                : 'bg-white/80 text-gray-700 border border-gray-300 hover:bg-gray-100'
                            }`}
                          >
                            <span>{r.emoji}</span>
                            <span>{r.count}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Action buttons (show on hover) */}
                  <div className={`flex gap-1 mt-1 opacity-0 group-hover:opacity-100 transition-opacity ${isMe ? 'justify-end' : ''}`}>
                    <button
                      onClick={() => setShowEmojiPicker(showEmojiPicker === msg.id ? null : msg.id)}
                      className="p-1 text-xs hover:bg-gray-200 rounded-lg"
                      title="Reagisci"
                    >
                      😊
                    </button>
                    {isAdmin && (
                      <button
                        onClick={() => togglePin(msg.id, isPinned)}
                        className={`p-1 text-xs hover:bg-gray-200 rounded-lg ${isPinned ? 'text-amber-500' : ''}`}
                        title={isPinned ? 'Rimuovi pin' : 'Fissa messaggio'}
                      >
                        📌
                      </button>
                    )}
                  </div>

                  {/* Emoji picker */}
                  {showEmojiPicker === msg.id && (
                    <div className={`absolute mt-1 bg-white rounded-xl border-2 border-gray-900 shadow-lg p-2 flex gap-1 z-50`}>
                      {REACTION_EMOJIS.map(emoji => (
                        <button
                          key={emoji}
                          onClick={() => toggleReaction(msg.id, emoji)}
                          className="p-1.5 hover:bg-gray-100 rounded-lg text-lg transition-transform hover:scale-125"
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Typing indicator */}
      {typingUsers.length > 0 && (
        <div className="px-4 py-2 bg-gray-50 border-t border-gray-200">
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <div className="flex space-x-1">
              <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
              <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
              <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
            </div>
            <span className="font-medium italic">{getTypingNames()}</span>
          </div>
        </div>
      )}

      {/* Input area */}
      <div className="p-4 border-t-2 border-gray-900 bg-white relative">
        {/* Mentions dropdown */}
        {showMentions && filteredMembers.length > 0 && (
          <div className="absolute bottom-full left-4 right-4 mb-2 bg-white rounded-xl border-2 border-gray-900 shadow-lg max-h-40 overflow-y-auto">
            {filteredMembers.map(member => {
              const color = getMemberColor(member.id)
              return (
                <button
                  key={member.id}
                  onClick={() => insertMention(member)}
                  className="w-full flex items-center gap-3 p-3 hover:bg-gray-100 transition-colors text-left"
                >
                  <img 
                    src={member.avatar_url || '/default-avatar.png'} 
                    className={`w-8 h-8 rounded-lg border-2 ${color.border}`}
                    alt=""
                  />
                  <div>
                    <p className="font-bold text-sm text-gray-900">{member.nome} {member.cognome}</p>
                  </div>
                </button>
              )
            })}
          </div>
        )}

        <div className="flex gap-2">
          {/* File upload */}
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={handleFileUpload}
            accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadingFile}
            className="p-3 bg-gray-100 hover:bg-gray-200 rounded-xl border-2 border-gray-300 transition-colors disabled:opacity-50"
            title="Allega file"
          >
            {uploadingFile ? '⏳' : '📎'}
          </button>

          {/* Text input */}
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
              placeholder="Scrivi un messaggio... (@nome per menzionare)"
              className="w-full px-4 py-3 bg-gray-100 rounded-xl border-2 border-gray-300 focus:border-gray-900 outline-none text-sm resize-none font-medium"
              rows={1}
            />
          </div>

          {/* Send button */}
          <button
            onClick={sendMessage}
            disabled={!newMessage.trim() || sendingMessage}
            className="px-5 py-3 bg-gray-900 hover:bg-gray-800 text-white rounded-xl font-bold text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all border-2 border-gray-700 shadow-[3px_3px_0px_0px_rgba(0,0,0,0.3)] hover:shadow-none hover:translate-x-[3px] hover:translate-y-[3px]"
          >
            {sendingMessage ? '...' : '→'}
          </button>
        </div>

        {/* Admin email button */}
        {isAdmin && (
          <button
            onClick={handleEmailTeam}
            className="mt-3 w-full py-2.5 text-xs font-bold text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors flex items-center justify-center gap-2 border-2 border-dashed border-gray-300 hover:border-red-400"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20 18h-2V9.25L12 13 6 9.25V18H4V6h1.2l6.8 4.25L18.8 6H20m0-2H4c-1.11 0-2 .89-2 2v12a2 2 0 002 2h16a2 2 0 002-2V6a2 2 0 00-2-2z"/>
            </svg>
            Apri Gmail per il team
          </button>
        )}
      </div>
    </div>
  )
}