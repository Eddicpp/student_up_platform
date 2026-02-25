'use client'

import { useState, useEffect, useRef } from 'react'
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
  
  const [hoveredMember, setHoveredMember] = useState<string | null>(null)
  const [copiedEmail, setCopiedEmail] = useState<string | null>(null)
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set())
  const [memberBadges, setMemberBadges] = useState<Record<string, string[]>>({})
  
  // ✅ STATI PER IL PERSONAGGIO CHE SBUCA
  const [isHoveringCard, setIsHoveringCard] = useState(false)
  const [peekerPos, setPeekerPos] = useState({ edge: 'top', position: '50%' })

  // Timer per mantenere aperta la card durante l'hover
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  const handleMouseEnter = (id: string) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    setHoveredMember(id)
  }

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => {
      setHoveredMember(null)
    }, 300) 
  }

  // ✅ LOGICA PERSONAGGIO: Calcola una posizione casuale sui bordi
  const handleCardMouseEnter = () => {
    setIsHoveringCard(true)
    const edges = ['top', 'bottom', 'left', 'right']
    const randomEdge = edges[Math.floor(Math.random() * edges.length)]
    // Posizione percentuale tra 10% e 90% per evitare gli angoli stretti
    const randomPos = `${Math.floor(Math.random() * 80) + 10}%`
    setPeekerPos({ edge: randomEdge, position: randomPos })
  }

  const handleCardMouseLeave = () => {
    setIsHoveringCard(false)
  }

  // Fetch presenza e badge
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
  }, [members, currentUserId, bandoId])

  const copyEmail = (email: string) => {
    navigator.clipboard.writeText(email)
    setCopiedEmail(email)
    setTimeout(() => setCopiedEmail(null), 2000)
  }

  const cardStyle = "bg-white rounded-2xl border-2 border-gray-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"

  const activeMember = members.find(m => m.id === hoveredMember)
  const activeColor = activeMember ? getMemberColor(activeMember.id) : null
  const isActiveOnline = activeMember ? onlineUsers.has(activeMember.id) : false

  // Stili calcolati per il personaggio che sbuca
  const getPeekerStyles = () => {
    const baseStyle = "absolute text-3xl transition-transform duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] z-0"
    
    // Le posizioni determinano da dove esce e quanto sta nascosto
    switch (peekerPos.edge) {
      case 'top':
        return `${baseStyle} left-[${peekerPos.position}] top-0 -translate-y-full ${isHoveringCard ? 'translate-y-[-70%]' : 'translate-y-0 opacity-0'}`
      case 'bottom':
        return `${baseStyle} left-[${peekerPos.position}] bottom-0 translate-y-full ${isHoveringCard ? 'translate-y-[70%]' : 'translate-y-0 opacity-0'}`
      case 'left':
        return `${baseStyle} top-[${peekerPos.position}] left-0 -translate-x-full ${isHoveringCard ? 'translate-x-[-70%]' : 'translate-x-0 opacity-0'}`
      case 'right':
        return `${baseStyle} top-[${peekerPos.position}] right-0 translate-x-full ${isHoveringCard ? 'translate-x-[70%]' : 'translate-x-0 opacity-0'}`
      default:
        return baseStyle
    }
  }

  return (
    // Contenitore esterno relativo per far funzionare l'overflow dell'omino
    <div className="relative">
      
      {/* L'osservatore (The Peeker) */}
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
        className={`${cardStyle} p-4 pb-6 sticky top-6 ml-2 lg:ml-6 max-w-sm relative z-10`}
        onMouseEnter={handleCardMouseEnter}
        onMouseLeave={handleCardMouseLeave}
      >
        <h2 className="text-lg font-black text-gray-900 mb-4 flex items-center justify-between">
          <span className="flex items-center gap-2">
            <span>👥</span> Team
          </span>
          <span className="text-xs text-gray-900 font-black bg-white px-2 py-1 rounded-lg border-2 border-gray-900 shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]">
            {members.length}
          </span>
        </h2>

        <div className="flex items-center gap-2 mb-4 text-xs font-black text-gray-900 uppercase tracking-widest bg-green-100 p-2 rounded-xl border-2 border-gray-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
          <span className="w-3 h-3 bg-green-500 border border-gray-900 rounded-full animate-pulse shadow-sm"></span>
          <span>{onlineUsers.size} online</span>
        </div>

        <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 px-1 pb-1 pt-1">
          {members.map((member) => {
            const color = getMemberColor(member.id)
            const isOnline = onlineUsers.has(member.id)
            const badges = memberBadges[member.id] || []

            return (
              <div
                key={member.id}
                className="relative"
                onMouseEnter={() => handleMouseEnter(member.id)}
                onMouseLeave={handleMouseLeave}
              >
                <div className={`flex items-center gap-2.5 p-2.5 rounded-xl border-2 border-gray-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-transform cursor-pointer hover:-translate-y-1 hover:translate-x-1 hover:shadow-none ${
                  hoveredMember === member.id 
                    ? 'bg-yellow-100' 
                    : 'bg-white'
                }`}>
                  <div className="relative flex-shrink-0">
                    <img 
                      src={member.avatar_url || '/default-avatar.png'} 
                      alt=""
                      className={`w-10 h-10 rounded-xl object-cover border-2 border-gray-900`}
                    />
                    <span className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-gray-900 ${
                      isOnline ? 'bg-green-500' : 'bg-gray-300'
                    }`}></span>
                    
                    {member.ruolo_team === 'owner' && (
                      <span className="absolute -top-2 -right-2 text-[12px] bg-white rounded-full border border-gray-900 shadow-sm leading-none p-0.5">👑</span>
                    )}
                    {member.ruolo_team === 'admin' && (
                      <span className="absolute -top-2 -right-2 text-[12px] bg-white rounded-full border border-gray-900 shadow-sm leading-none p-0.5">🛡️</span>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="font-black text-gray-900 truncate text-xs">
                        {member.nome} {member.cognome}
                      </p>
                    </div>
                    <p className={`text-[10px] font-black uppercase tracking-widest mt-0.5 ${
                      member.ruolo_team === 'owner' ? 'text-amber-600' :
                      member.ruolo_team === 'admin' ? 'text-blue-600' :
                      'text-gray-500'
                    }`}>
                      {member.ruolo_team === 'owner' ? 'Owner' :
                      member.ruolo_team === 'admin' ? 'Admin' : 'Membro'}
                    </p>
                  </div>

                  {badges.length > 0 && (
                    <div className="flex -space-x-1.5">
                      {badges.slice(0, 2).map((badge, i) => (
                        <span key={i} className="text-[12px] drop-shadow-sm bg-white rounded-full p-0.5 border border-gray-300" title={(BADGE_TYPES as any)[badge]?.label}>
                          {(BADGE_TYPES as any)[badge]?.icon || '🏅'}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* Hover Card (Popup a sinistra) */}
        {activeMember && activeColor && (
          <div 
            className={`absolute right-[105%] top-0 mr-4 w-64 bg-white rounded-2xl border-4 border-gray-900 shadow-[-8px_8px_0px_0px_rgba(0,0,0,1)] p-4 z-50 animate-in fade-in zoom-in-95 duration-200`}
            onMouseEnter={() => { if (timeoutRef.current) clearTimeout(timeoutRef.current) }}
            onMouseLeave={handleMouseLeave}
          >
            <div className={`-mx-4 -mt-4 mb-4 p-4 rounded-t-[14px] border-b-4 border-gray-900 ${activeColor.bgHex ? '' : activeColor.light}`}
                style={activeColor.bgHex ? { backgroundColor: activeColor.bgHex } : undefined}>
              <div className="flex items-center gap-3">
                <img 
                  src={activeMember.avatar_url || '/default-avatar.png'} 
                  alt=""
                  className={`w-14 h-14 rounded-xl object-cover border-2 border-gray-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]`}
                />
                <div className="bg-white/90 px-2 py-1 rounded-lg border border-gray-900 shadow-sm backdrop-blur-sm">
                  <p className="font-black text-gray-900 text-sm leading-tight uppercase">{activeMember.nome} {activeMember.cognome}</p>
                  <p className={`text-[10px] font-black uppercase tracking-widest text-gray-700 leading-tight mt-1`}>
                    {activeMember.nome_corso || 'Corso ignoto'}
                  </p>
                  <div className="flex items-center gap-1 mt-1.5">
                    <span className={`w-2 h-2 rounded-full border border-gray-900 ${isActiveOnline ? 'bg-green-500' : 'bg-gray-400'}`}></span>
                    <span className="text-[9px] font-black uppercase tracking-widest text-gray-900">
                      {isActiveOnline ? 'Online' : 'Offline'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {activeMember.bio && (
              <p className="text-[11px] text-gray-900 mb-3 line-clamp-3 font-bold bg-gray-100 p-2.5 rounded-xl border-2 border-gray-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                "{activeMember.bio}"
              </p>
            )}

            {activeMember.anno_inizio_corso && (
              <div className="inline-block bg-yellow-300 px-3 py-1.5 rounded-xl border-2 border-gray-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] mb-4 -rotate-1">
                <p className="text-[10px] text-gray-900 font-black uppercase tracking-widest">
                  🎓 {new Date().getFullYear() - activeMember.anno_inizio_corso + 1}° Anno
                </p>
              </div>
            )}

            <div className="flex flex-col gap-2 mt-2 pt-4 border-t-4 border-dashed border-gray-200">
              {activeMember.email && (
                <button
                  onClick={() => copyEmail(activeMember.email)}
                  className="w-full flex items-center justify-center gap-2 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-900 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border-2 border-gray-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px]"
                >
                  {copiedEmail === activeMember.email ? '✅ Copiata!' : '📋 Copia email'}
                </button>
              )}

              <div className="flex gap-2">
                {activeMember.id !== currentUserId && (
                  <Link
                    href={`/dashboard/messages?userId=${activeMember.id}`}
                    className="flex-1 flex items-center justify-center gap-1 py-2.5 bg-blue-300 hover:bg-blue-400 text-gray-900 rounded-xl text-[10px] uppercase font-black tracking-widest transition-all border-2 border-gray-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px]"
                  >
                    💬 Chat
                  </Link>
                )}
                
                <Link
                  href={`/dashboard/user/${activeMember.id}`}
                  className="flex-1 flex items-center justify-center gap-1 py-2.5 bg-gray-900 hover:bg-gray-800 text-white rounded-xl text-[10px] uppercase font-black tracking-widest transition-all border-2 border-gray-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px]"
                >
                  👤 Profilo
                </Link>
              </div>
            </div>
          </div>
        )}

        {!isOwner && (
          <button
            onClick={onLeaveTeam}
            className="w-full mt-6 py-3 text-xs font-black uppercase tracking-widest text-red-600 bg-white hover:bg-red-50 rounded-xl transition-all border-2 border-gray-900 shadow-[4px_4px_0px_0px_rgba(220,38,38,1)] hover:shadow-none hover:translate-x-[4px] hover:translate-y-[4px]"
          >
            🚪 Abbandona team
          </button>
        )}
      </div>
    </div>
  )
}