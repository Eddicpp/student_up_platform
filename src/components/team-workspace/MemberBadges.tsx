'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getMemberColor, BADGE_TYPES } from '@/lib/member-colors'

interface Badge {
  id: string
  studente_id: string
  badge_type: string
  bando_id: string
  earned_at: string
}

interface UserStats {
  studente_id: string
  bando_id: string
  messaggi_count: number
  reazioni_date: number
  reazioni_ricevute: number
  todo_completati: number
  giorni_streak: number
  ultimo_giorno_attivo: string
}

interface TeamMember {
  id: string
  nome: string
  cognome: string
  avatar_url: string | null
}

interface MemberBadgesProps {
  bandoId: string
  currentUserId: string
  members: TeamMember[]
}

export default function MemberBadges({ bandoId, currentUserId, members }: MemberBadgesProps) {
  const supabase = createClient()
  const [badges, setBadges] = useState<Badge[]>([])
  const [stats, setStats] = useState<Record<string, UserStats>>({})
  const [loading, setLoading] = useState(true)
  const [selectedMember, setSelectedMember] = useState<string | null>(null)
  const [showAllBadges, setShowAllBadges] = useState(false)

  const fetchBadgesAndStats = useCallback(async () => {
    // Fetch all badges for this team
    const { data: badgesData } = await (supabase as any)
      .from('user_badge')
      .select('*')
      .eq('bando_id', bandoId)

    if (badgesData) {
      setBadges(badgesData)
    }

    // Fetch stats for all members
    const { data: statsData } = await (supabase as any)
      .from('user_team_stats')
      .select('*')
      .eq('bando_id', bandoId)

    if (statsData) {
      const statsMap: Record<string, UserStats> = {}
      statsData.forEach((s: UserStats) => {
        statsMap[s.studente_id] = s
      })
      setStats(statsMap)
    }

    setLoading(false)
  }, [bandoId, supabase])

  useEffect(() => {
    fetchBadgesAndStats()
  }, [fetchBadgesAndStats])

  // Check and award new badges
  const checkAndAwardBadges = useCallback(async (userId: string) => {
    const userStats = stats[userId]
    if (!userStats) return

    const userBadges = badges.filter(b => b.studente_id === userId).map(b => b.badge_type)
    const newBadges: string[] = []

    // Message badges
    if (userStats.messaggi_count >= 1 && !userBadges.includes('first_message')) {
      newBadges.push('first_message')
    }
    if (userStats.messaggi_count >= 10 && !userBadges.includes('messages_10')) {
      newBadges.push('messages_10')
    }
    if (userStats.messaggi_count >= 50 && !userBadges.includes('messages_50')) {
      newBadges.push('messages_50')
    }
    if (userStats.messaggi_count >= 100 && !userBadges.includes('messages_100')) {
      newBadges.push('messages_100')
    }

    // Streak badges
    if (userStats.giorni_streak >= 3 && !userBadges.includes('streak_3')) {
      newBadges.push('streak_3')
    }
    if (userStats.giorni_streak >= 7 && !userBadges.includes('streak_7')) {
      newBadges.push('streak_7')
    }
    if (userStats.giorni_streak >= 30 && !userBadges.includes('streak_30')) {
      newBadges.push('streak_30')
    }

    // Helper badge
    if (userStats.todo_completati >= 10 && !userBadges.includes('helper')) {
      newBadges.push('helper')
    }

    // Reactor badge
    if (userStats.reazioni_date >= 50 && !userBadges.includes('reactor')) {
      newBadges.push('reactor')
    }

    // Popular badge
    if (userStats.reazioni_ricevute >= 50 && !userBadges.includes('popular')) {
      newBadges.push('popular')
    }

    // Award new badges
    for (const badgeType of newBadges) {
      await (supabase as any)
        .from('user_badge')
        .insert({
          studente_id: userId,
          badge_type: badgeType,
          bando_id: bandoId
        })
    }

    if (newBadges.length > 0) {
      fetchBadgesAndStats()
    }
  }, [badges, stats, bandoId, supabase, fetchBadgesAndStats])

  // Check badges for current user periodically
  useEffect(() => {
    if (currentUserId && stats[currentUserId]) {
      checkAndAwardBadges(currentUserId)
    }
  }, [currentUserId, stats, checkAndAwardBadges])

  // Get badges for a specific user
  const getUserBadges = (userId: string) => {
    return badges.filter(b => b.studente_id === userId)
  }

  // Get leaderboard
  const getLeaderboard = () => {
    return members
      .map(m => ({
        ...m,
        stats: stats[m.id],
        badgeCount: getUserBadges(m.id).length
      }))
      .sort((a, b) => (b.badgeCount || 0) - (a.badgeCount || 0))
  }

  // All possible badges
  const allBadgeTypes = Object.entries(BADGE_TYPES)

  const cardStyle = "bg-white rounded-2xl border-2 border-gray-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"

  if (loading) {
    return (
      <div className={cardStyle + " p-6"}>
        <div className="animate-pulse space-y-3">
          <div className="h-6 bg-gray-200 rounded w-1/3"></div>
          <div className="h-20 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  const leaderboard = getLeaderboard()
  const myBadges = getUserBadges(currentUserId)
  const myStats = stats[currentUserId]

  return (
    <div className={cardStyle + " overflow-hidden"}>
      {/* Header */}
      <div className="p-4 border-b-2 border-gray-900 bg-gradient-to-r from-amber-100 to-orange-100">
        <h2 className="text-lg font-black text-gray-900 flex items-center gap-2">
          <span>🏆</span> Badge & Achievements
        </h2>
        <p className="text-xs text-gray-600 mt-1">Guadagna badge partecipando al team!</p>
      </div>

      {/* My Stats */}
      {myStats && (
        <div className="p-4 bg-gray-50 border-b border-gray-200">
          <p className="text-xs font-bold text-gray-500 uppercase mb-3">Le tue statistiche</p>
          <div className="grid grid-cols-4 gap-2">
            <div className="text-center p-2 bg-white rounded-xl border border-gray-200">
              <p className="text-xl font-black text-blue-600">{myStats.messaggi_count}</p>
              <p className="text-[10px] text-gray-500 font-medium">Messaggi</p>
            </div>
            <div className="text-center p-2 bg-white rounded-xl border border-gray-200">
              <p className="text-xl font-black text-pink-600">{myStats.reazioni_date}</p>
              <p className="text-[10px] text-gray-500 font-medium">Reazioni</p>
            </div>
            <div className="text-center p-2 bg-white rounded-xl border border-gray-200">
              <p className="text-xl font-black text-green-600">{myStats.todo_completati}</p>
              <p className="text-[10px] text-gray-500 font-medium">Task ✓</p>
            </div>
            <div className="text-center p-2 bg-white rounded-xl border border-gray-200">
              <p className="text-xl font-black text-orange-600">{myStats.giorni_streak}</p>
              <p className="text-[10px] text-gray-500 font-medium">🔥 Streak</p>
            </div>
          </div>
        </div>
      )}

      {/* My Badges */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-bold text-gray-500 uppercase">I tuoi badge ({myBadges.length})</p>
          <button
            onClick={() => setShowAllBadges(!showAllBadges)}
            className="text-xs text-blue-600 font-bold hover:underline"
          >
            {showAllBadges ? 'Nascondi tutti' : 'Vedi tutti i badge'}
          </button>
        </div>

        {myBadges.length === 0 ? (
          <p className="text-sm text-gray-400 italic">Nessun badge ancora. Continua a partecipare!</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {myBadges.map(badge => {
              const badgeInfo = (BADGE_TYPES as any)[badge.badge_type]
              if (!badgeInfo) return null

              return (
                <div
                  key={badge.id}
                  className="px-3 py-2 bg-gradient-to-r from-amber-100 to-yellow-100 rounded-xl border-2 border-amber-400 flex items-center gap-2 shadow-sm"
                  title={badgeInfo.description}
                >
                  <span className="text-xl">{badgeInfo.icon}</span>
                  <div>
                    <p className="text-xs font-bold text-gray-900">{badgeInfo.label}</p>
                    <p className="text-[10px] text-gray-500">
                      {new Date(badge.earned_at).toLocaleDateString('it-IT')}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* All Badges (collapsible) */}
      {showAllBadges && (
        <div className="p-4 bg-gray-50 border-b border-gray-200">
          <p className="text-xs font-bold text-gray-500 uppercase mb-3">Tutti i badge disponibili</p>
          <div className="grid grid-cols-2 gap-2">
            {allBadgeTypes.map(([type, info]) => {
              const earned = myBadges.some(b => b.badge_type === type)

              return (
                <div
                  key={type}
                  className={`p-3 rounded-xl border-2 flex items-center gap-2 transition-all ${
                    earned
                      ? 'bg-gradient-to-r from-amber-100 to-yellow-100 border-amber-400'
                      : 'bg-gray-100 border-gray-300 opacity-60'
                  }`}
                  title={info.description}
                >
                  <span className={`text-2xl ${earned ? '' : 'grayscale'}`}>{info.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs font-bold truncate ${earned ? 'text-gray-900' : 'text-gray-500'}`}>
                      {info.label}
                    </p>
                    <p className="text-[10px] text-gray-500 truncate">{info.description}</p>
                  </div>
                  {earned && <span className="text-green-500 text-sm">✓</span>}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Leaderboard */}
      <div className="p-4">
        <p className="text-xs font-bold text-gray-500 uppercase mb-3">🏅 Classifica Team</p>
        <div className="space-y-2">
          {leaderboard.slice(0, 5).map((member, index) => {
            const color = getMemberColor(member.id)
            const memberBadges = getUserBadges(member.id)
            const isMe = member.id === currentUserId

            return (
              <div
                key={member.id}
                className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all ${
                  isMe 
                    ? `${color.light} ${color.border}` 
                    : 'bg-white border-gray-200 hover:border-gray-400'
                }`}
              >
                {/* Rank */}
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-sm ${
                  index === 0 ? 'bg-amber-400 text-white' :
                  index === 1 ? 'bg-gray-400 text-white' :
                  index === 2 ? 'bg-orange-600 text-white' :
                  'bg-gray-200 text-gray-600'
                }`}>
                  {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : index + 1}
                </div>

                {/* Avatar */}
                <img
                  src={member.avatar_url || '/default-avatar.png'}
                  alt=""
                  className={`w-10 h-10 rounded-xl object-cover border-2 ${color.border}`}
                />

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className={`font-bold text-sm truncate ${isMe ? color.text : 'text-gray-900'}`}>
                    {member.nome} {member.cognome}
                    {isMe && <span className="text-xs ml-1">(tu)</span>}
                  </p>
                  <div className="flex items-center gap-1">
                    {memberBadges.slice(0, 4).map((badge, i) => {
                      const badgeInfo = (BADGE_TYPES as any)[badge.badge_type]
                      return (
                        <span key={i} className="text-xs" title={badgeInfo?.label}>
                          {badgeInfo?.icon}
                        </span>
                      )
                    })}
                    {memberBadges.length > 4 && (
                      <span className="text-[10px] text-gray-400">+{memberBadges.length - 4}</span>
                    )}
                  </div>
                </div>

                {/* Badge count */}
                <div className="text-center">
                  <p className={`text-lg font-black ${color.text}`}>{member.badgeCount}</p>
                  <p className="text-[10px] text-gray-500">badge</p>
                </div>

                {/* Stats preview */}
                {member.stats && (
                  <div className="hidden sm:flex items-center gap-2 text-xs text-gray-500">
                    <span title="Messaggi">💬 {member.stats.messaggi_count}</span>
                    <span title="Streak">🔥 {member.stats.giorni_streak}</span>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {leaderboard.length > 5 && (
          <button
            onClick={() => setSelectedMember(selectedMember ? null : 'all')}
            className="w-full mt-3 py-2 text-xs font-bold text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-colors"
          >
            {selectedMember === 'all' ? '↑ Mostra meno' : `↓ Mostra tutti (${leaderboard.length})`}
          </button>
        )}

        {selectedMember === 'all' && leaderboard.slice(5).map((member, index) => {
          const color = getMemberColor(member.id)
          const memberBadges = getUserBadges(member.id)
          const isMe = member.id === currentUserId

          return (
            <div
              key={member.id}
              className={`flex items-center gap-3 p-3 rounded-xl border-2 mt-2 ${
                isMe ? `${color.light} ${color.border}` : 'bg-white border-gray-200'
              }`}
            >
              <div className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm bg-gray-200 text-gray-600">
                {index + 6}
              </div>
              <img
                src={member.avatar_url || '/default-avatar.png'}
                alt=""
                className={`w-10 h-10 rounded-xl object-cover border-2 ${color.border}`}
              />
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm truncate text-gray-900">
                  {member.nome} {member.cognome}
                </p>
              </div>
              <div className="text-center">
                <p className="text-lg font-black text-gray-600">{member.badgeCount}</p>
                <p className="text-[10px] text-gray-500">badge</p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}