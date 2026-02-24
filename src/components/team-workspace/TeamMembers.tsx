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

  // ✅ Modificato: Aggiunto margine a sinistra (ml-2 lg:ml-6) e padding ridotto a p-4
  const cardStyle = "bg-white rounded-2xl border-2 border-gray-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] ml-2 lg:ml-6"

  return (
    <div className={`${cardStyle} p-4 sticky top-6 max-w-sm`}>
      <h2 className="text-lg font-black text-gray-900 mb-4 flex items-center justify-between">
        <span className="flex items-center gap-2">
          <span>👥</span> Team
        </span>
        <span className="text-xs text-gray-500 font-bold bg-gray-100 px-2 py-1 rounded-lg border border-gray-300">
          {members.length}
        </span>
      </h2>

      <div className="flex items-center gap-2 mb-4 text-xs text-gray-500">
        <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
        <span className="font-medium">{onlineUsers.size} online</span>
      </div>

      <div className="space-y-2 max-h-[400px] overflow-y-auto pr-3">
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
              <div className={`flex items-center gap-2.5 p-2.5 rounded-xl border-2 transition-all cursor-pointer hover:-translate-x-1 ${
                hoveredMember === member.id 
                  ? `${color.light} ${color.border}` 
                  : 'border-gray-200 hover:border-gray-400'
              }`}>
                <div className="relative">
                  <img 
                    src={member.avatar_url || '/default-avatar.png'} 
                    alt=""
                    className={`w-9 h-9 rounded-xl object-cover border-2 ${color.border}`}
                  />
                  <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${
                    isOnline ? 'bg-green-500' : 'bg-gray-300'
                  }`}></span>
                  {member.ruolo_team === 'owner' && (
                    <span className="absolute -top-1.5 -right-1.5 text-[10px]">👑</span>
                  )}
                  {member.ruolo_team === 'admin' && (
                    <span className="absolute -top-1.5 -right-1.5 text-[10px]">🛡️</span>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="font-bold text-gray-900 truncate text-xs">
                      {member.nome} {member.cognome}
                    </p>
                    <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${color.bg}`}></span>
                  </div>
                  <p className={`text-[10px] font-medium ${
                    member.ruolo_team === 'owner' ? 'text-amber-600' :
                    member.ruolo_team === 'admin' ? 'text-blue-600' :
                    'text-gray-400'
                  }`}>
                    {member.ruolo_team === 'owner' ? 'Owner' :
                     member.ruolo_team === 'admin' ? 'Admin' : 'Membro'}
                  </p>
                </div>

                {badges.length > 0 && (
                  <div className="flex -space-x-1">
                    {badges.slice(0, 2).map((badge, i) => (
                      <span key={i} className="text-[10px]" title={(BADGE_TYPES as any)[badge]?.label}>
                        {(BADGE_TYPES as any)[badge]?.icon || '🏅'}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* ✅ Hover Card Rimpicciolita (w-64) */}
              {hoveredMember === member.id && (
                <div className={`absolute right-full top-0 mr-3 w-64 bg-white rounded-2xl border-2 border-gray-900 shadow-[-4px_4px_0px_0px_rgba(0,0,0,1)] p-3 z-50`}>
                  
                  <div className={`-mx-3 -mt-3 mb-3 p-3 rounded-t-2xl ${color.light} border-b-2 ${color.border}`}>
                    <div className="flex items-center gap-2.5">
                      <img 
                        src={member.avatar_url || '/default-avatar.png'} 
                        alt=""
                        className={`w-12 h-12 rounded-xl object-cover border-2 ${color.border}`}
                      />
                      <div>
                        <p className="font-black text-gray-900 text-sm leading-tight">{member.nome} {member.cognome}</p>
                        <p className={`text-[10px] font-bold ${color.text} leading-tight mt-0.5`}>
                          {member.nome_corso || 'Corso ignoto'}
                        </p>
                        <div className="flex items-center gap-1 mt-1">
                          <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-green-500' : 'bg-gray-400'}`}></span>
                          <span className="text-[9px] font-bold text-gray-600">
                            {isOnline ? 'Online' : 'Offline'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {member.bio && (
                    <p className="text-[10px] text-gray-700 mb-2 line-clamp-2 font-medium bg-gray-50 p-1.5 rounded-lg border border-gray-200">
                      "{member.bio}"
                    </p>
                  )}

                  <div className="flex flex-col gap-2 mt-2 pt-2 border-t-2 border-gray-100">
                    {member.email && (
                      <button
                        onClick={() => copyEmail(member.email)}
                        className="w-full flex items-center justify-center gap-2 py-2 bg-gray-50 hover:bg-gray-100 text-gray-800 rounded-xl text-[10px] font-bold transition-colors border-2 border-gray-300 hover:border-gray-500"
                      >
                        {copiedEmail === member.email ? '✅ Email Copiata!' : '📋 Copia email'}
                      </button>
                    )}

                    <div className="flex gap-2">
                      {member.id !== currentUserId && (
                        <Link
                          href={`/dashboard/messages?userId=${member.id}`}
                          className="flex-1 flex items-center justify-center gap-1 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl text-[10px] uppercase font-black tracking-wider transition-colors border-2 border-blue-200"
                        >
                          💬 Chat
                        </Link>
                      )}
                      
                      <Link
                        href={`/dashboard/user/${member.id}`}
                        className="flex-1 flex items-center justify-center gap-1 py-2 bg-gray-900 hover:bg-gray-800 text-white rounded-xl text-[10px] uppercase font-black tracking-wider transition-colors border-2 border-gray-900"
                      >
                        👤 Profilo
                      </Link>
                    </div>
                  </div>

                  <div className="absolute right-0 top-5 translate-x-full">
                    <div className="w-0 h-0 border-y-6 border-y-transparent border-l-6 border-l-gray-900" />
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {!isOwner && (
        <button
          onClick={onLeaveTeam}
          className="w-full mt-4 py-2.5 text-xs font-bold text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors border-2 border-dashed border-gray-300 hover:border-red-400"
        >
          🚪 Abbandona team
        </button>
      )}
    </div>
  )
}