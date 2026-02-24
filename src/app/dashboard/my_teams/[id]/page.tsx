'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { getMemberColor } from '@/lib/member-colors'

// Import components
import TeamChat from '@/components/team-workspace/TeamChat'
import TeamMembers from '@/components/team-workspace/TeamMembers'
import TeamTodoList from '@/components/team-workspace/TeamTodoList'
import TeamPolls from '@/components/team-workspace/TeamPolls'
import TeamNotes from '@/components/team-workspace/TeamNotes'
import TeamCalendar from '@/components/team-workspace/TeamCalendar'

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
  partecipazione_id?: string
}

export default function TeamWorkspacePage() {
  const params = useParams()
  const bandoId = params?.id as string
  const supabase = createClient()
  const router = useRouter()

  // States
  const [project, setProject] = useState<any>(null)
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [leader, setLeader] = useState<TeamMember | null>(null)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [isOwner, setIsOwner] = useState(false)
  const [dominantColor, setDominantColor] = useState('239, 68, 68')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Active tab for tools
  const [activeTab, setActiveTab] = useState<'chat' | 'todo' | 'polls' | 'notes' | 'calendar'>('chat')

  // Extract dominant color from image
  const extractColor = (imageUrl: string) => {
    if (!imageUrl) return
    
    const img = new Image()
    img.crossOrigin = 'Anonymous'
    img.src = imageUrl

    img.onload = () => {
      try {
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')
        if (!ctx) return

        const size = 50
        canvas.width = size
        canvas.height = size
        ctx.drawImage(img, 0, 0, size, size)

        const imageData = ctx.getImageData(0, 0, size, size).data
        let r = 0, g = 0, b = 0, count = 0

        for (let i = 0; i < imageData.length; i += 4) {
          const red = imageData[i]
          const green = imageData[i + 1]
          const blue = imageData[i + 2]
          const brightness = (red + green + blue) / 3

          if (brightness > 30 && brightness < 220) {
            r += red
            g += green
            b += blue
            count++
          }
        }

        if (count > 0) {
          setDominantColor(`${Math.round(r/count)}, ${Math.round(g/count)}, ${Math.round(b/count)}`)
        }
      } catch (e) {
        console.error("Color extraction error:", e)
      }
    }
    
    img.onerror = () => setDominantColor('239, 68, 68')
  }

  // Fetch team data
  const fetchTeamData = async () => {
    if (!bandoId) return
    setLoading(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }
      setCurrentUser(user)

      // Fetch project
      const { data: bandoData, error: bandoError } = await supabase
        .from('bando')
        .select(`
          *,
          creatore_studente:creatore_studente_id (id, nome, cognome, avatar_url, email, bio)
        `)
        .eq('id', bandoId)
        .single()

      if (bandoError) throw bandoError

      const checkIsOwner = bandoData.creatore_studente_id === user.id
      
      // Check if user is member
      if (!checkIsOwner) {
        const { data: myParticipation } = await supabase
          .from('partecipazione')
          .select('stato')
          .eq('bando_id', bandoId)
          .eq('studente_id', user.id)
          .single()

        if (!myParticipation || myParticipation.stato !== 'accepted') {
          router.replace('/dashboard/my_teams') 
          return
        }
      }

      setProject(bandoData)
      setIsOwner(checkIsOwner)

      if (bandoData.foto_url) {
        extractColor(bandoData.foto_url)
      }

      // Set leader
      const cStudente = bandoData?.creatore_studente
      if (cStudente) {
        setLeader({
          id: cStudente.id,
          nome: cStudente.nome,
          cognome: cStudente.cognome,
          avatar_url: cStudente.avatar_url,
          email: cStudente.email,
          bio: cStudente.bio,
          ruolo_team: 'owner'
        })
      }

      // Fetch team members
      const { data: membersData } = await supabase
        .from('partecipazione')
        .select(`
          id, 
          ruolo, 
          studente:studente_id (
            id, nome, cognome, avatar_url, email, bio,
            studente_corso (
              anno_inizio,
              corso:corso_id ( nome )
            )
          )
        `)
        .eq('bando_id', bandoId)
        .eq('stato', 'accepted')

      const formattedMembers: TeamMember[] = membersData?.map((m: any) => {
        const corsoInfo = m.studente?.studente_corso?.[0]
        return {
          partecipazione_id: m.id,
          id: m.studente?.id,
          nome: m.studente?.nome,
          cognome: m.studente?.cognome,
          avatar_url: m.studente?.avatar_url,
          email: m.studente?.email,
          bio: m.studente?.bio,
          ruolo_team: m.ruolo || 'membro',
          nome_corso: corsoInfo?.corso?.nome || 'Non specificato',
          anno_inizio_corso: corsoInfo?.anno_inizio
        }
      }) || []

      setTeamMembers(formattedMembers)

      // Check if admin
      const userMemberData = formattedMembers.find(m => m.id === user?.id)
      if (checkIsOwner || userMemberData?.ruolo_team === 'admin') {
        setIsAdmin(true)
      }

    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // Leave team
  const handleLeaveTeam = async () => {
    if (!currentUser?.id || !bandoId) return
    if (!window.confirm("Sei sicuro di voler abbandonare il team? Non potrai più rientrare.")) return

    const { data: myPart } = await supabase
      .from('partecipazione')
      .select('id')
      .eq('bando_id', bandoId)
      .eq('studente_id', currentUser.id)
      .eq('stato', 'accepted')
      .single()

    if (myPart) {
      await supabase
        .from('partecipazione')
        .update({ stato: 'abandoned' } as any)
        .eq('id', myPart.id)

      router.push('/dashboard/my_teams')
    }
  }

  useEffect(() => {
    if (bandoId) {
      fetchTeamData()
    }
  }, [bandoId])

  // All members including leader
  const allMembers: TeamMember[] = leader ? [leader, ...teamMembers] : teamMembers

  // Cartoon styles
  const cardStyle = "bg-white rounded-2xl border-2 border-gray-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"

  if (loading) {
    return (
      <div 
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: `rgba(${dominantColor}, 0.1)` }}
      >
        <div className={`${cardStyle} p-8 text-center`}>
          <div className="w-12 h-12 border-4 border-gray-300 border-t-gray-900 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-900 font-bold">Caricamento workspace...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className={`${cardStyle} p-8 text-center`}>
          <span className="text-4xl block mb-3">❌</span>
          <p className="text-red-600 font-bold">{error}</p>
          <button 
            onClick={() => router.push('/dashboard/my_teams')}
            className="mt-4 px-4 py-2 bg-gray-900 text-white rounded-xl font-bold hover:bg-gray-800"
          >
            Torna ai Miei Team
          </button>
        </div>
      </div>
    )
  }

  return (
    <div 
      className="min-h-screen pb-20 transition-colors duration-700"
      style={{ backgroundColor: `rgba(${dominantColor}, 0.15)` }}
    >
      {/* Banner Header */}
      <div className="relative h-56 sm:h-72 overflow-hidden border-b-4 border-gray-900">
        {project?.foto_url ? (
          <img 
            src={project.foto_url} 
            alt={project.titolo}
            className="w-full h-full object-cover"
          />
        ) : (
          <div 
            className="w-full h-full"
            style={{ background: `linear-gradient(135deg, rgb(${dominantColor}) 0%, rgba(${dominantColor}, 0.7) 100%)` }}
          />
        )}
        
        {/* Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
        
        {/* Back button */}
        <div className="absolute top-4 left-4 sm:top-6 sm:left-6">
          <button 
            onClick={() => router.push('/dashboard/my_projects')}
            className="flex items-center gap-2 bg-white text-gray-900 px-4 py-2 rounded-xl font-bold text-sm border-2 border-gray-900 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[3px] hover:translate-y-[3px] transition-all"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            I miei team
          </button>
        </div>

        {/* Admin settings button */}
        {isAdmin && (
          <div className="absolute top-4 right-4 sm:top-6 sm:right-6">
            <Link
              href={`/dashboard/projects/${bandoId}/manage`}
              className="flex items-center gap-2 bg-white text-gray-900 px-4 py-2 rounded-xl font-bold text-sm border-2 border-gray-900 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[3px] hover:translate-y-[3px] transition-all"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Gestione
            </Link>
          </div>
        )}

        {/* Project info */}
        <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-8">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center gap-2 mb-3">
              <span className={`px-3 py-1.5 rounded-xl text-xs font-black border-2 ${
                project?.stato === 'chiuso' 
                  ? 'bg-gray-700 text-white border-gray-500' 
                  : 'bg-green-500 text-white border-green-600'
              }`}>
                {project?.stato === 'chiuso' ? '🔒 Chiuso' : '🟢 Aperto'}
              </span>
              <span className="px-3 py-1.5 rounded-xl text-xs font-black bg-white/20 backdrop-blur-sm text-white border-2 border-white/30">
                Workspace
              </span>
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white mb-2 drop-shadow-lg">
              {project?.titolo}
            </h1>
            <p className="text-white/90 text-sm sm:text-base max-w-2xl line-clamp-2 font-medium">
              {project?.descrizione}
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 mt-8">
        <div className="grid lg:grid-cols-3 gap-6">
          
          {/* Main content - 2/3 */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Project Links - Moved away from banner */}
            <div className={cardStyle + " p-5"}>
              <h2 className="text-lg font-black text-gray-900 mb-4 flex items-center gap-2">
                <span>🔗</span> Link di Progetto
              </h2>
              <div className="grid sm:grid-cols-2 gap-4">
                {project?.github_url ? (
                  <a 
                    href={project.github_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-4 bg-gray-900 hover:bg-gray-800 text-white rounded-xl transition-all border-2 border-gray-700 shadow-[3px_3px_0px_0px_rgba(0,0,0,0.3)] hover:shadow-none hover:translate-x-[3px] hover:translate-y-[3px]"
                  >
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                    </svg>
                    <div>
                      <p className="font-black">GitHub</p>
                      <p className="text-xs text-gray-400">Repository</p>
                    </div>
                  </a>
                ) : (
                  <div className="flex items-center gap-3 p-4 bg-gray-100 text-gray-400 rounded-xl border-2 border-dashed border-gray-300">
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                    </svg>
                    <span className="font-bold">Nessun link GitHub</span>
                  </div>
                )}

                {project?.drive_url ? (
                  <a 
                    href={project.drive_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-all border-2 border-blue-700 shadow-[3px_3px_0px_0px_rgba(30,64,175,1)] hover:shadow-none hover:translate-x-[3px] hover:translate-y-[3px]"
                  >
                    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M4.433 22l-1.45-2.512L11.11 5.75h2.78l8.127 13.738L20.567 22H4.433zm11.593-4.5L12 9.262 7.974 17.5h8.052zM12 2L2.273 19.5l1.45 2.512L12 7.512l8.277 14.5 1.45-2.512L12 2z"/>
                    </svg>
                    <div>
                      <p className="font-black">Google Drive</p>
                      <p className="text-xs text-blue-200">Documenti</p>
                    </div>
                  </a>
                ) : (
                  <div className="flex items-center gap-3 p-4 bg-gray-100 text-gray-400 rounded-xl border-2 border-dashed border-gray-300">
                    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M4.433 22l-1.45-2.512L11.11 5.75h2.78l8.127 13.738L20.567 22H4.433zm11.593-4.5L12 9.262 7.974 17.5h8.052zM12 2L2.273 19.5l1.45 2.512L12 7.512l8.277 14.5 1.45-2.512L12 2z"/>
                    </svg>
                    <span className="font-bold">Nessun link Drive</span>
                  </div>
                )}
              </div>
            </div>

            {/* Tools Tabs */}
            <div className="flex gap-2 overflow-x-auto pb-2">
              {[
                { id: 'chat' as const, label: 'Chat', icon: '💬' },
                { id: 'todo' as const, label: 'To-Do', icon: '✅' },
                { id: 'polls' as const, label: 'Sondaggi', icon: '📊' },
                { id: 'notes' as const, label: 'Note', icon: '📝' },
                { id: 'calendar' as const, label: 'Calendario', icon: '📅' },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm whitespace-nowrap transition-all border-2 ${
                    activeTab === tab.id
                      ? 'bg-gray-900 text-white border-gray-700 shadow-none'
                      : 'bg-white text-gray-600 border-gray-300 hover:border-gray-900 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'
                  }`}
                >
                  <span>{tab.icon}</span>
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Active Tool */}
            {activeTab === 'chat' && (
              <TeamChat 
                bandoId={bandoId}
                currentUserId={currentUser?.id}
                members={allMembers}
                projectTitle={project?.titolo || ''}
                isAdmin={isAdmin}
              />
            )}

            {activeTab === 'todo' && (
              <TeamTodoList 
                bandoId={bandoId}
                currentUserId={currentUser?.id}
                members={allMembers}
              />
            )}

            {activeTab === 'polls' && (
              <TeamPolls 
                bandoId={bandoId}
                currentUserId={currentUser?.id}
                members={allMembers}
              />
            )}

            {activeTab === 'notes' && (
              <TeamNotes 
                bandoId={bandoId}
                currentUserId={currentUser?.id}
                members={allMembers}
              />
            )}

            {activeTab === 'calendar' && (
              <TeamCalendar 
                bandoId={bandoId}
                currentUserId={currentUser?.id}
                members={allMembers}
              />
            )}
          </div>

          {/* Sidebar - Team Members */}
          <div className="space-y-6">
            <TeamMembers 
              members={allMembers}
              currentUserId={currentUser?.id}
              bandoId={bandoId}
              isOwner={isOwner}
              onLeaveTeam={handleLeaveTeam}
            />
          </div>
        </div>
      </div>
    </div>
  )
}