'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getMemberColor, BADGE_TYPES } from '@/lib/member-colors'
import Link from 'next/link'

interface TeamMember {
  id: string
  nome: string
  cognome: string
  avatar_url: string | null
  email: string
  bio: string | null
  ruolo_team: 'admin' | 'membro' | 'owner'
  nome_corso?: string
  anno_inizio_corso?: number | null
}

interface TeamMembersProps {
  members: TeamMember[]
  currentUserId: string
  bandoId: string
  isOwner: boolean
  onLeaveTeam: () => void
}

export default function TeamMembers({ 
  members, 
  currentUserId, 
  bandoId, 
  isOwner, 
  onLeaveTeam 
}: TeamMembersProps) {
  const supabase = createClient()
  
  // STATI PRINCIPALI
  const [activeMemberId, setActiveMemberId] = useState<string | null>(null)
  const [hoveredMemberId, setHoveredMemberId] = useState<string | null>(null)
  const [copiedEmail, setCopiedEmail] = useState<string | null>(null)
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set())
  const [memberBadges, setMemberBadges] = useState<Record<string, string[]>>({})
  
  // STATI SOPRANNOMI
  const [nicknames, setNicknames] = useState<Record<string, string>>({})
  const [editingNickFor, setEditingNickFor] = useState<string | null>(null)
  const [tempNick, setTempNick] = useState('')

  // STATI PEEKER
  const [isHoveringCard, setIsHoveringCard] = useState(false)
  const [peekerPos, setPeekerPos] = useState({ edge: 'top', position: '50%' })

  // 1. Caricamento Soprannomi
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(`nicknames_${currentUserId}_${bandoId}`)
      if (stored) {
        try {
          setNicknames(JSON.parse(stored))
        } catch (e) {}
      }
    }
  }, [currentUserId, bandoId])

  // 2. Salvataggio Soprannomi
  const saveNickname = (memberId: string) => {
    const newNicknames = { ...nicknames }
    if (tempNick.trim() === '') {
      delete newNicknames[memberId]
    } else {
      newNicknames[memberId] = tempNick.trim()
    }
    
    setNicknames(newNicknames)
    localStorage.setItem(`nicknames_${currentUserId}_${bandoId}`, JSON.stringify(newNicknames))
    setEditingNickFor(null)
  }

  // 3. Animazione Peeker
  const handleCardMouseEnter = () => {
    setIsHoveringCard(true)
    const edges = ['top', 'bottom', 'right']
    const randomEdge = edges[Math.floor(Math.random() * edges.length)]
    const randomPos = `${Math.floor(Math.random() * 80) + 10}%`
    setPeekerPos({ edge: randomEdge, position: randomPos })
  }

  const handleCardMouseLeave = () => {
    setIsHoveringCard(false)
  }

  // 4. Fetch Presenza e Badge
  useEffect(() => {
    const fetchPresenceAndBadges = async () => {
      const { data: presenceData } = await (supabase as any)
        .from('user_presence')
        .select('studente_id, is_online, last_seen')
        .in('studente_id', members.map(m => m.id))

      if (presenceData) {
        const online = new Set<string>()
        presenceData.forEach((p: any) => {
          const lastSeen = new Date(p.last_seen)
          const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000)
          if (p.is_online || lastSeen > fiveMinutesAgo) {
            online.add(p.studente_id)
          }
        })
        setOnlineUsers(online)
      }

      const { data: badgesData } = await (supabase as any)
        .from('user_badge')
        .select('studente_id, badge_type')
        .eq('bando_id', bandoId)

      if (badgesData) {
        const badges: Record<string, string[]> = {}
        badgesData.forEach((b: any) => {
          if (!badges[b.studente_id]) badges[b.studente_id] = []
          badges[b.studente_id].push(b.badge_type)
        })
        setMemberBadges(badges)
      }
    }

    fetchPresenceAndBadges()

    const channel = supabase
      .channel('presence-updates')
      .on('postgres_changes' as any, {
        event: '*',
        schema: 'public',
        table: 'user_presence'
      }, (payload: any) => {
        const userId = payload.new?.studente_id || payload.old?.studente_id
        if (members.some(m => m.id === userId)) {
          if (payload.new?.is_online) {
            setOnlineUsers(prev => new Set([...prev, userId]))
          } else {
            setOnlineUsers(prev => {
              const next = new Set(prev)
              next.delete(userId)
              return next
            })
          }
        }
      })
      .subscribe()

    const updatePresence = async () => {
      await (supabase as any)
        .from('user_presence')
        .upsert({
          studente_id: currentUserId,
          is_online: true,
          last_seen: new Date().toISOString()
        }, { onConflict: 'studente_id' })
    }

    updatePresence()
    const presenceInterval = setInterval(updatePresence, 30000)

    const handleBeforeUnload = () => {
      navigator.sendBeacon('/api/presence-offline', JSON.stringify({ userId: currentUserId }))
    }
    window.addEventListener('beforeunload', handleBeforeUnload)

    return () => {
      supabase.removeChannel(channel)
      clearInterval(presenceInterval)
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [members, currentUserId, bandoId, supabase])

  const copyEmail = (email: string) => {
    navigator.clipboard.writeText(email)
    setCopiedEmail(email)
    setTimeout(() => setCopiedEmail(null), 2000)
  }

  // Logica per determinare chi visualizzare nel popup
  const displayMemberId = activeMemberId || hoveredMemberId
  const displayMember = members.find(m => m.id === displayMemberId)
  const displayColor = displayMember ? getMemberColor(displayMember.id) : null
  const isDisplayOnline = displayMember ? onlineUsers.has(displayMember.id) : false

  const getPeekerStyles = () => {
    const baseStyle = "absolute text-3xl transition-transform duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] z-0 hidden lg:block"
    switch (peekerPos.edge) {
      case 'top':
        return `${baseStyle} left-[${peekerPos.position}] top-0 -translate-y-full ${isHoveringCard ? 'translate-y-[-70%]' : 'translate-y-0 opacity-0'}`
      case 'bottom':
        return `${baseStyle} left-[${peekerPos.position}] bottom-0 translate-y-full ${isHoveringCard ? 'translate-y-[70%]' : 'translate-y-0 opacity-0'}`
      case 'right':
        return `${baseStyle} top-[${peekerPos.position}] right-0 translate-x-full rotate-90 ${isHoveringCard ? 'translate-x-[70%]' : 'translate-x-0 opacity-0'}`
      default:
        return baseStyle
    }
  }

  return (
    <div className="w-full lg:w-80 flex-shrink-0 relative z-10">
      
      {/* L'osservatore (Solo Desktop) */}
      <div 
        className={getPeekerStyles()}
        style={{
          [peekerPos.edge === 'top' || peekerPos.edge === 'bottom' ? 'left' : 'top']: peekerPos.position
        }}
      >
        👀
      </div>

      {/* LA CARD PRINCIPALE */}
      <div 
        className={`bg-white rounded-2xl border-[3px] border-gray-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-4 sticky top-6 z-50`}
        onMouseEnter={handleCardMouseEnter}
        onMouseLeave={handleCardMouseLeave}
      >
        <h2 className="text-lg font-black text-gray-900 mb-4 flex items-center justify-between">
          <span className="flex items-center gap-2">
            <span>👥</span> Team
          </span>
          <span className="text-xs text-gray-900 font-black bg-white px-2 py-1 rounded-lg border-2 border-gray-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
            {members.length}
          </span>
        </h2>

        <div className="flex items-center gap-2 mb-4 text-xs font-black text-gray-900 uppercase tracking-widest bg-green-100 p-2.5 rounded-xl border-2 border-gray-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
          <span className="w-3 h-3 bg-green-500 border-2 border-gray-900 rounded-full animate-pulse shadow-sm"></span>
          <span>{onlineUsers.size} online</span>
        </div>

        {/* LISTA DEI MEMBRI */}
        <div className="space-y-3 max-h-[300px] lg:max-h-[450px] overflow-y-auto pr-2 custom-scrollbar relative z-50">
          {members.map((member) => {
            const isOnline = onlineUsers.has(member.id)
            const badges = memberBadges[member.id] || []
            const displayName = nicknames[member.id] || `${member.nome} ${member.cognome}`

            return (
              <div
                key={member.id}
                onMouseEnter={() => {
                  if (!activeMemberId) setHoveredMemberId(member.id)
                }}
                onMouseLeave={() => setHoveredMemberId(null)}
                onClick={() => setActiveMemberId(activeMemberId === member.id ? null : member.id)}
                className={`flex items-center gap-3 p-2.5 rounded-xl border-2 border-gray-900 transition-all cursor-pointer select-none ${
                  displayMemberId === member.id 
                    ? 'bg-yellow-300 translate-x-[2px] translate-y-[2px] shadow-none' 
                    : 'bg-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5 hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]'
                }`}
              >
                {/* Avatar */}
                <div className="relative flex-shrink-0">
                  <img 
                    src={member.avatar_url || '/default-avatar.png'} 
                    alt=""
                    className="w-10 h-10 rounded-xl object-cover border-2 border-gray-900 bg-white"
                  />
                  <span className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-gray-900 ${
                    isOnline ? 'bg-green-500' : 'bg-gray-300'
                  }`}></span>
                  
                  {member.ruolo_team === 'owner' && (
                    <span className="absolute -top-2 -right-2 text-[10px] bg-white rounded-md border-2 border-gray-900 shadow-sm px-1 py-0.5">👑</span>
                  )}
                  {member.ruolo_team === 'admin' && (
                    <span className="absolute -top-2 -right-2 text-[10px] bg-white rounded-md border-2 border-gray-900 shadow-sm px-1 py-0.5">🛡️</span>
                  )}
                </div>

                {/* Testo */}
                <div className="flex-1 min-w-0">
                  <p className="font-black text-gray-900 truncate text-sm leading-tight">
                    {displayName}
                  </p>
                  <p className={`text-[9px] font-black uppercase tracking-widest mt-0.5 ${
                    member.ruolo_team === 'owner' ? 'text-amber-600' :
                    member.ruolo_team === 'admin' ? 'text-blue-600' :
                    'text-gray-500'
                  }`}>
                    {member.ruolo_team === 'owner' ? 'Proprietario' :
                     member.ruolo_team === 'admin' ? 'Admin' : 'Membro'}
                  </p>
                </div>

                {/* Badge */}
                {badges.length > 0 && (
                  <div className="flex -space-x-2">
                    {badges.slice(0, 2).map((badge, i) => (
                      <span key={i} className="text-[14px] bg-white rounded-full p-0.5 border-2 border-gray-900 shadow-sm z-10" title={(BADGE_TYPES as any)[badge]?.label}>
                        {(BADGE_TYPES as any)[badge]?.icon || '🏅'}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* MODALE DI DETTAGLIO: Usiamo z-[200] per superare tutte le altre tab e tabelle */}
        {displayMember && displayColor && (
          <>
            {/* Overlay scuro (Solo se bloccato con click o su Mobile) */}
            {(activeMemberId || typeof window !== 'undefined' && window.innerWidth < 1024) && (
              <div 
                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[190] lg:hidden"
                onClick={() => {
                  setActiveMemberId(null);
                  setHoveredMemberId(null);
                }}
              />
            )}

            <div 
              className={`fixed top-1/2 left-4 right-4 -translate-y-1/2 z-[200] lg:absolute lg:right-[105%] lg:top-0 lg:-translate-y-0 lg:left-auto lg:w-72 bg-white rounded-2xl sm:rounded-[1.5rem] border-4 border-gray-900 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-4 sm:p-5 animate-in fade-in zoom-in-95 duration-200 pointer-events-auto`}
              onMouseEnter={() => {
                if (!activeMemberId) setHoveredMemberId(displayMember.id)
              }}
              onMouseLeave={() => {
                if (!activeMemberId) setHoveredMemberId(null)
              }}
            >
              
              {/* Bottone Chiudi (visibile se bloccato col click o su Mobile) */}
              {(activeMemberId || typeof window !== 'undefined' && window.innerWidth < 1024) && (
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveMemberId(null);
                    setHoveredMemberId(null);
                  }}
                  className="absolute -top-3 -right-3 w-8 h-8 bg-red-400 border-2 border-gray-900 rounded-lg font-black flex items-center justify-center shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] z-50 hover:bg-red-500"
                >
                  ✕
                </button>
              )}

              <div className={`-mx-4 sm:-mx-5 -mt-4 sm:-mt-5 mb-4 sm:mb-5 p-4 sm:p-5 rounded-t-[18px] border-b-4 border-gray-900 ${displayColor.bgHex ? '' : displayColor.light}`}
                   style={displayColor.bgHex ? { backgroundColor: displayColor.bgHex } : undefined}>
                <div className="flex items-center gap-3">
                  <img 
                    src={displayMember.avatar_url || '/default-avatar.png'} 
                    alt=""
                    className={`w-14 h-14 sm:w-16 sm:h-16 rounded-xl object-cover border-3 border-gray-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] bg-white`}
                  />
                  <div className="bg-white/95 px-3 py-2 rounded-xl border-2 border-gray-900 shadow-sm flex-1 min-w-0">
                    
                    {/* ZONA GESTIONE SOPRANNOME */}
                    {editingNickFor === displayMember.id ? (
                      <div className="flex gap-1 mb-1">
                        <input 
                          type="text" 
                          value={tempNick}
                          onChange={(e) => setTempNick(e.target.value)}
                          placeholder="Nuovo nome..."
                          className="w-full text-xs font-black text-gray-900 border-2 border-gray-900 rounded-md px-1 py-1 outline-none text-base"
                          autoFocus
                          onKeyDown={(e) => { if(e.key === 'Enter') saveNickname(displayMember.id) }}
                        />
                        <button onClick={() => saveNickname(displayMember.id)} className="bg-green-400 border-2 border-gray-900 rounded-md px-2 text-xs hover:bg-green-500 transition-colors">
                          💾
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-start justify-between gap-1 group">
                        <p className="font-black text-gray-900 text-sm sm:text-base leading-tight uppercase truncate">
                          {nicknames[displayMember.id] || `${displayMember.nome} ${displayMember.cognome}`}
                        </p>
                        <button 
                          onClick={(e) => { 
                            e.stopPropagation();
                            setActiveMemberId(displayMember.id); // Blocca la modale
                            setTempNick(nicknames[displayMember.id] || ''); 
                            setEditingNickFor(displayMember.id); 
                          }}
                          className="text-gray-400 hover:text-gray-900 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity flex-shrink-0"
                          title="Assegna soprannome"
                        >
                          ✏️
                        </button>
                      </div>
                    )}
                    
                    {/* Se c'è un soprannome, mostra il nome vero in piccolo */}
                    {nicknames[displayMember.id] && !editingNickFor && (
                      <p className="text-[9px] font-bold text-gray-500 truncate mt-0.5">
                        ({displayMember.nome} {displayMember.cognome})
                      </p>
                    )}

                    <p className={`text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-gray-700 leading-tight mt-1.5 truncate`}>
                      {displayMember.nome_corso || 'Corso ignoto'}
                    </p>
                    <div className="flex items-center gap-1.5 mt-2">
                      <span className={`w-2.5 h-2.5 rounded-full border border-gray-900 shadow-sm ${isDisplayOnline ? 'bg-green-500' : 'bg-gray-400'}`}></span>
                      <span className="text-[9px] font-black uppercase tracking-widest text-gray-900">
                        {isDisplayOnline ? 'Online' : 'Offline'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {displayMember.bio && (
                <p className="text-[11px] sm:text-xs text-gray-900 mb-3 line-clamp-3 font-bold bg-gray-50 p-3 rounded-xl border-2 border-gray-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                  "{displayMember.bio}"
                </p>
              )}

              {displayMember.anno_inizio_corso && (
                <div className="inline-block bg-yellow-300 px-3 py-1.5 rounded-xl border-2 border-gray-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] mb-4 -rotate-2">
                  <p className="text-[10px] text-gray-900 font-black uppercase tracking-widest">
                    🎓 {new Date().getFullYear() - displayMember.anno_inizio_corso + 1}° Anno
                  </p>
                </div>
              )}

              <div className="flex flex-col gap-2 mt-2 pt-4 border-t-4 border-dashed border-gray-200">
                {displayMember.email && (
                  <button
                    onClick={() => copyEmail(displayMember.email)}
                    className="w-full flex items-center justify-center gap-2 py-3 bg-white hover:bg-yellow-100 text-gray-900 rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-widest transition-all border-2 border-gray-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px]"
                  >
                    {copiedEmail === displayMember.email ? '✅ Copiata!' : '📋 Copia email'}
                  </button>
                )}

                <div className="flex gap-2">
                  {displayMember.id !== currentUserId && (
                    <Link
                      href={`/dashboard/messages?userId=${displayMember.id}`}
                      className="flex-1 flex items-center justify-center gap-1 py-3 bg-blue-300 hover:bg-blue-400 text-gray-900 rounded-xl text-[10px] sm:text-xs uppercase font-black tracking-widest transition-all border-2 border-gray-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px]"
                    >
                      💬 Chat
                    </Link>
                  )}
                  
                  <Link
                    href={`/dashboard/user/${displayMember.id}`}
                    className="flex-1 flex items-center justify-center gap-1 py-3 bg-gray-900 hover:bg-gray-800 text-white rounded-xl text-[10px] sm:text-xs uppercase font-black tracking-widest transition-all border-2 border-gray-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px]"
                  >
                    👤 Profilo
                  </Link>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Bottone Abbandona */}
        {!isOwner && (
          <button
            onClick={onLeaveTeam}
            className="w-full mt-6 py-3 text-[10px] sm:text-xs font-black uppercase tracking-widest text-white bg-red-500 hover:bg-red-600 rounded-xl transition-all border-2 border-gray-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[4px] hover:translate-y-[4px]"
          >
            🚪 Abbandona team
          </button>
        )}
      </div>
    </div>
  )
}