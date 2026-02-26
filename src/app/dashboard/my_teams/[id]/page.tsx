'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'

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
  
  // NUOVO STATO: Gestione Modale Info Progetto
  const [showProjectInfo, setShowProjectInfo] = useState(false)
  
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

  const allMembers: TeamMember[] = leader ? [leader, ...teamMembers] : teamMembers
  const cardStyle = "bg-white rounded-2xl border-[3px] sm:border-4 border-gray-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] sm:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]"

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: `rgba(${dominantColor}, 0.1)` }}>
        <div className={`${cardStyle} p-6 sm:p-8 text-center bg-white`}>
          <div className="text-4xl sm:text-5xl animate-bounce mb-3 sm:mb-4">🚀</div>
          <p className="text-gray-900 font-black uppercase tracking-widest text-sm sm:text-base">Caricamento workspace...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
        <div className={`${cardStyle} p-6 sm:p-8 text-center bg-white w-full max-w-sm`}>
          <span className="text-4xl sm:text-5xl block mb-3 sm:mb-4">❌</span>
          <p className="text-gray-900 font-black uppercase tracking-tight text-lg mb-2">Errore</p>
          <p className="text-red-600 font-bold text-sm mb-6">{error}</p>
          <button 
            onClick={() => router.push('/dashboard/my_projects')}
            className="w-full py-3 bg-gray-900 text-white rounded-xl font-black uppercase tracking-widest border-2 border-gray-900 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all"
          >
            Torna ai Miei Team
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen pb-20 transition-colors duration-700 relative" style={{ backgroundColor: `rgba(${dominantColor}, 0.15)` }}>
      
      {/* Banner Header */}
      <div className="relative h-48 sm:h-64 lg:h-72 overflow-hidden border-b-[3px] sm:border-b-4 border-gray-900 pattern-dots">
        {project?.foto_url ? (
          <img src={project.foto_url} alt={project.titolo} className="w-full h-full object-cover mix-blend-overlay opacity-60" />
        ) : (
          <div className="w-full h-full" style={{ background: `linear-gradient(135deg, rgb(${dominantColor}) 0%, rgba(${dominantColor}, 0.7) 100%)` }} />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
        
        <div className="absolute top-3 left-3 sm:top-6 sm:left-6">
          <button onClick={() => router.push('/dashboard/my_teams')} className="flex items-center gap-1.5 sm:gap-2 bg-white text-gray-900 px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl font-black uppercase tracking-widest text-[10px] sm:text-xs border-2 sm:border-3 border-gray-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all">
            <span className="text-sm sm:text-base">🔙</span> <span className="hidden sm:inline">I miei team</span>
          </button>
        </div>

        {isAdmin && (
          <div className="absolute top-3 right-3 sm:top-6 sm:right-6">
            <Link href={`/dashboard/projects/${bandoId}/manage`} className="flex items-center gap-1.5 sm:gap-2 bg-yellow-300 text-gray-900 px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl font-black uppercase tracking-widest text-[10px] sm:text-xs border-2 sm:border-3 border-gray-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all">
              <span className="text-sm sm:text-base">⚙️</span> <span className="hidden sm:inline">Gestione</span>
            </Link>
          </div>
        )}

        <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-6 lg:p-8">
          <div className="max-w-6xl mx-auto">
            <div className="flex flex-wrap items-center gap-2 mb-2 sm:mb-3">
              <span className={`px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg sm:rounded-xl text-[9px] sm:text-xs font-black uppercase tracking-widest border-2 ${project?.stato === 'chiuso' ? 'bg-gray-700 text-white border-gray-900' : 'bg-green-400 text-gray-900 border-gray-900'}`}>
                {project?.stato === 'chiuso' ? '🔒 Chiuso' : '🟢 Aperto'}
              </span>
              <span className="px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg sm:rounded-xl text-[9px] sm:text-xs font-black uppercase tracking-widest bg-white text-gray-900 border-2 border-gray-900">
                Workspace
              </span>
            </div>
            <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black text-white mb-1 sm:mb-2 drop-shadow-[2px_2px_0px_rgba(0,0,0,1)] leading-tight line-clamp-2">
              {project?.titolo}
            </h1>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-3 sm:px-6 mt-4 sm:mt-8">
        <div className="flex flex-col lg:grid lg:grid-cols-3 gap-5 sm:gap-6 lg:gap-8">
          
          {/* Main content - 2/3 */}
          <div className="lg:col-span-2 flex flex-col gap-5 sm:gap-6 lg:gap-8 relative z-10">
            
            {/* Tools Tabs - RIMPICCIOLITI */}
            <div className="order-1 lg:order-1 relative z-20">
              <div className="flex gap-1.5 sm:gap-2 overflow-x-auto pb-4 pt-1 -mx-3 px-3 sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] snap-x">
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
                    className={`flex items-center gap-1 sm:gap-1.5 px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-lg sm:rounded-xl font-black text-[9px] sm:text-xs uppercase tracking-wider whitespace-nowrap transition-all border-2 snap-start shrink-0 ${
                      activeTab === tab.id
                        ? 'bg-gray-900 text-white border-gray-900 translate-x-[2px] translate-y-[2px] shadow-none'
                        : 'bg-white text-gray-900 border-gray-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] sm:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:bg-gray-50'
                    }`}
                  >
                    <span className="text-base sm:text-lg">{tab.icon}</span>
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Active Tool */}
            <div className="order-2 lg:order-2 relative z-10">
              {activeTab === 'chat' && <TeamChat bandoId={bandoId} currentUserId={currentUser?.id} members={allMembers} projectTitle={project?.titolo || ''} isAdmin={isAdmin} />}
              {activeTab === 'todo' && <TeamTodoList bandoId={bandoId} currentUserId={currentUser?.id} members={allMembers} />}
              {activeTab === 'polls' && <TeamPolls bandoId={bandoId} currentUserId={currentUser?.id} members={allMembers} />}
              {activeTab === 'notes' && <TeamNotes bandoId={bandoId} currentUserId={currentUser?.id} members={allMembers} />}
              {activeTab === 'calendar' && <TeamCalendar bandoId={bandoId} currentUserId={currentUser?.id} members={allMembers} />}
            </div>

            {/* Project Links */}
            <div className={`order-3 lg:order-3 ${cardStyle} p-4 sm:p-6 bg-white relative z-10`}>
              <h2 className="text-base sm:text-lg font-black text-gray-900 mb-4 flex items-center gap-2 uppercase tracking-tight">
                <span>🔗</span> Link di Progetto
              </h2>
              <div className="flex flex-col sm:grid sm:grid-cols-2 gap-3 sm:gap-4">
                {project?.github_url ? (
                  <a href={project.github_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-3 sm:p-4 bg-gray-900 text-white rounded-xl transition-all border-2 border-gray-900 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[3px] hover:translate-y-[3px]">
                    <svg className="w-6 h-6 sm:w-8 sm:h-8 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
                    <div className="min-w-0">
                      <p className="font-black text-sm sm:text-base uppercase">GitHub</p>
                      <p className="text-[10px] sm:text-xs text-gray-400 font-bold truncate">Repository</p>
                    </div>
                  </a>
                ) : (
                  <div className="flex items-center gap-3 p-3 sm:p-4 bg-gray-100 text-gray-400 rounded-xl border-[3px] border-dashed border-gray-300">
                    <span className="text-xl sm:text-2xl">💻</span>
                    <span className="font-bold text-xs sm:text-sm">Nessun link GitHub</span>
                  </div>
                )}
                {project?.drive_url ? (
                  <a href={project.drive_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-3 sm:p-4 bg-blue-500 text-white rounded-xl transition-all border-2 border-gray-900 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[3px] hover:translate-y-[3px]">
                    <span className="text-2xl sm:text-3xl bg-white rounded p-1 shadow-sm">📁</span>
                    <div className="min-w-0">
                      <p className="font-black text-sm sm:text-base uppercase text-gray-900">Google Drive</p>
                      <p className="text-[10px] sm:text-xs text-blue-900 font-bold truncate">Documenti Condivisi</p>
                    </div>
                  </a>
                ) : (
                  <div className="flex items-center gap-3 p-3 sm:p-4 bg-gray-100 text-gray-400 rounded-xl border-[3px] border-dashed border-gray-300">
                    <span className="text-xl sm:text-2xl">📁</span>
                    <span className="font-bold text-xs sm:text-sm">Nessun link Drive</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar - Team Members */}
          <div className="space-y-4 lg:space-y-6 lg:order-last order-4 mt-2 sm:mt-0 relative z-10">
            <TeamMembers 
              members={allMembers}
              currentUserId={currentUser?.id}
              bandoId={bandoId}
              isOwner={isOwner}
              onLeaveTeam={handleLeaveTeam}
            />

            {/* NUOVO TASTO INFO PROGETTO - RIMPICCIOLITO */}
            <button
              onClick={() => setShowProjectInfo(true)}
              className="w-full bg-white hover:bg-blue-50 text-gray-900 flex items-center justify-between p-3 rounded-2xl border-[3px] border-gray-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] transition-all group"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-xl border-2 border-gray-900 flex items-center justify-center text-lg group-hover:scale-110 transition-transform">
                  ℹ️
                </div>
                <div className="text-left">
                  <p className="font-black text-sm uppercase leading-tight text-gray-900">Info Progetto</p>
                  <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest mt-0.5">Dettagli & Regole</p>
                </div>
              </div>
              <span className="text-gray-400 font-bold">→</span>
            </button>
          </div>
        </div>
      </div>

      {/* --- MODALE INFO PROGETTO --- */}
      {showProjectInfo && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl border-4 border-gray-900 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] max-w-2xl w-full max-h-[90vh] overflow-y-auto relative animate-in zoom-in-95 duration-200 custom-scrollbar">
            
            <button 
              onClick={() => setShowProjectInfo(false)}
              className="absolute top-4 right-4 w-10 h-10 bg-red-400 border-2 border-gray-900 rounded-xl flex items-center justify-center font-black text-gray-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-red-500 hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all z-10"
            >
              ✕
            </button>
            
            {project?.foto_url && (
              <div className="w-full h-48 sm:h-64 border-b-4 border-gray-900 relative">
                <img src={project.foto_url} alt="Cover" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              </div>
            )}
            
            <div className="p-6 sm:p-8">
              <div className="inline-block bg-yellow-300 px-3 py-1.5 rounded-lg border-2 border-gray-900 font-black text-[10px] uppercase tracking-widest mb-4 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                {project?.stato === 'chiuso' ? '🔒 Candidature Chiuse' : '🟢 Candidature Aperte'}
              </div>
              
              <h2 className="text-2xl sm:text-4xl font-black text-gray-900 mb-6 uppercase leading-tight line-clamp-3">
                {project?.titolo}
              </h2>
              
              <div className="bg-gray-50 border-2 border-gray-900 rounded-2xl p-5 sm:p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] relative overflow-hidden">
                <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                  <span>📝</span> Descrizione Completa
                </h3>
                <p className="text-gray-800 font-bold whitespace-pre-wrap leading-relaxed text-sm sm:text-base">
                  {project?.descrizione || 'Nessuna descrizione disponibile per questo progetto.'}
                </p>
              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  )
}