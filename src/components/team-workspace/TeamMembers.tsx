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
  const [hoveredMember, setHoveredMember] = useState<string | null>(null)
  const [copiedEmail, setCopiedEmail] = useState<string | null>(null)
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set())
  const [memberBadges, setMemberBadges] = useState<Record<string, string[]>>({})

  // Fetch presenza e badge
  useEffect(() => {
    const fetchPresenceAndBadges = async () => {
      // Presenza online
      const { data: presenceData } = await (supabase as any)
        .from('user_presence')
        .select('studente_id, is_online, last_seen')
        .in('studente_id', members.map(m => m.id))

      if (presenceData) {
        const online = new Set<string>()
        presenceData.forEach((p: any) => {
          // Online se is_online o last_seen < 5 minuti
          const lastSeen = new Date(p.last_seen)
          const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000)
          if (p.is_online || lastSeen > fiveMinutesAgo) {
            online.add(p.studente_id)
          }
        })
        setOnlineUsers(online)
      }

      // Badge membri
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

    // Realtime presence
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

    // Update own presence
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
    const presenceInterval = setInterval(updatePresence, 30000) // ogni 30 sec

    // Cleanup: set offline quando si esce
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

  // Stile cartoon
  const cardStyle = "bg-white rounded-2xl border-2 border-gray-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"

  return (
    <div className={`${cardStyle} p-5 sticky top-6`}>
      <h2 className="text-lg font-black text-gray-900 mb-4 flex items-center justify-between">
        <span className="flex items-center gap-2">
          <span>👥</span> Team
        </span>
        <span className="text-xs text-gray-500 font-bold bg-gray-100 px-2 py-1 rounded-lg border border-gray-300">
          {members.length} membri
        </span>
      </h2>

      {/* Online count */}
      <div className="flex items-center gap-2 mb-4 text-xs text-gray-500">
        <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
        <span className="font-medium">{onlineUsers.size} online</span>
      </div>

      <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
        {members.map((member) => {
          const color = getMemberColor(member.id)
          const isOnline = onlineUsers.has(member.id)
          const badges = memberBadges[member.id] || []

          return (
            <div
              key={member.id}
              className="relative"
              onMouseEnter={() => setHoveredMember(member.id)}
              onMouseLeave={() => setHoveredMember(null)}
            >
              <div className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all cursor-pointer hover:translate-x-1 ${
                hoveredMember === member.id 
                  ? `${color.light} ${color.border}` 
                  : 'border-gray-200 hover:border-gray-400'
              }`}>
                <div className="relative">
                  <img 
                    src={member.avatar_url || '/default-avatar.png'} 
                    alt=""
                    className={`w-10 h-10 rounded-xl object-cover border-2 ${color.border}`}
                  />
                  {/* Online indicator */}
                  <span className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white ${
                    isOnline ? 'bg-green-500' : 'bg-gray-300'
                  }`}></span>
                  {/* Role badge */}
                  {member.ruolo_team === 'owner' && (
                    <span className="absolute -top-1 -right-1 text-xs">👑</span>
                  )}
                  {member.ruolo_team === 'admin' && (
                    <span className="absolute -top-1 -right-1 text-xs">🛡️</span>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-gray-900 truncate text-sm">
                      {member.nome} {member.cognome}
                    </p>
                    {/* Color indicator */}
                    <span className={`w-2 h-2 rounded-full ${color.bg}`}></span>
                  </div>
                  <p className={`text-xs font-medium ${
                    member.ruolo_team === 'owner' ? 'text-amber-600' :
                    member.ruolo_team === 'admin' ? 'text-blue-600' :
                    'text-gray-400'
                  }`}>
                    {member.ruolo_team === 'owner' ? 'Owner' :
                     member.ruolo_team === 'admin' ? 'Admin' : 'Membro'}
                  </p>
                </div>

                {/* Mini badges */}
                {badges.length > 0 && (
                  <div className="flex -space-x-1">
                    {badges.slice(0, 3).map((badge, i) => (
                      <span key={i} className="text-xs" title={(BADGE_TYPES as any)[badge]?.label}>
                        {(BADGE_TYPES as any)[badge]?.icon || '🏅'}
                      </span>
                    ))}
                    {badges.length > 3 && (
                      <span className="text-[10px] text-gray-400 ml-1">+{badges.length - 3}</span>
                    )}
                  </div>
                )}
              </div>

              {/* Hover Card */}
              {hoveredMember === member.id && (
                <div className={`absolute left-full top-0 ml-3 w-72 bg-white rounded-2xl border-2 border-gray-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-4 z-50`}>
                  {/* Header con colore */}
                  <div className={`-mx-4 -mt-4 mb-4 p-4 rounded-t-2xl ${color.light} border-b-2 ${color.border}`}>
                    <div className="flex items-center gap-3">
                      <img 
                        src={member.avatar_url || '/default-avatar.png'} 
                        alt=""
                        className={`w-14 h-14 rounded-xl object-cover border-2 ${color.border}`}
                      />
                      <div>
                        <p className="font-black text-gray-900">{member.nome} {member.cognome}</p>
                        <p className={`text-xs font-bold ${color.text}`}>
                          {member.nome_corso || 'Corso non specificato'}
                        </p>
                        <div className="flex items-center gap-1 mt-1">
                          <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500' : 'bg-gray-300'}`}></span>
                          <span className="text-[10px] text-gray-500">
                            {isOnline ? 'Online' : 'Offline'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {member.bio && (
                    <p className="text-xs text-gray-600 mb-3 line-clamp-3 italic bg-gray-50 p-2 rounded-lg border border-gray-200">
                      "{member.bio}"
                    </p>
                  )}

                  {member.anno_inizio_corso && (
                    <p className="text-xs text-gray-500 mb-3 font-medium">
                      🎓 {new Date().getFullYear() - member.anno_inizio_corso + 1}° Anno
                    </p>
                  )}

                  {/* Badges */}
                  {badges.length > 0 && (
                    <div className="mb-3">
                      <p className="text-[10px] font-bold text-gray-400 uppercase mb-2">Badge</p>
                      <div className="flex flex-wrap gap-1">
                        {badges.map((badge, i) => (
                          <span 
                            key={i} 
                            className={`px-2 py-1 rounded-lg text-xs font-medium ${color.light} ${color.text} border ${color.border}`}
                            title={(BADGE_TYPES as any)[badge]?.description}
                          >
                            {(BADGE_TYPES as any)[badge]?.icon} {(BADGE_TYPES as any)[badge]?.label}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2">
                    {member.email && member.id !== currentUserId && (
                      <button
                        onClick={() => copyEmail(member.email)}
                        className="flex-1 flex items-center justify-center gap-2 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold transition-colors border-2 border-gray-300"
                      >
                        {copiedEmail === member.email ? (
                          <>✅ Copiata!</>
                        ) : (
                          <>📋 Copia email</>
                        )}
                      </button>
                    )}
                    <Link
                      href={`/dashboard/user/${member.id}`}
                      className="flex-1 flex items-center justify-center gap-2 py-2 bg-gray-900 hover:bg-gray-800 text-white rounded-xl text-xs font-bold transition-colors border-2 border-gray-700"
                    >
                      👤 Profilo
                    </Link>
                  </div>

                  {/* Arrow */}
                  <div className="absolute left-0 top-6 -translate-x-full">
                    <div className="w-0 h-0 border-y-8 border-y-transparent border-r-8 border-r-gray-900" />
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Leave team */}
      {!isOwner && (
        <button
          onClick={onLeaveTeam}
          className="w-full mt-6 py-3 text-sm font-bold text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors border-2 border-dashed border-gray-300 hover:border-red-400"
        >
          🚪 Abbandona team
        </button>
      )}
    </div>
  )
}