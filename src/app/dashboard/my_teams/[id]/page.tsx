'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'

interface TeamMember {
  id: string
  nome: string
  cognome: string
  avatar_url: string | null
  email: string
  bio: string | null
  ruolo_team: 'admin' | 'membro'
  nome_corso: string
  anno_inizio_corso: number | null
  partecipazione_id: string
}

interface Message {
  id: string
  testo: string
  created_at: string
  studente: {
    id: string
    nome: string
    cognome: string
    avatar_url: string | null
  }
}

export default function TeamWorkspacePage() {
  const params = useParams()
  const bandoId = params?.id as string
  const supabase = createClient()
  const router = useRouter()
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Stati dati
  const [project, setProject] = useState<any>(null)
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [leader, setLeader] = useState<any>(null)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [isOwner, setIsOwner] = useState(false)
  
  // Colore dominante
  const [dominantColor, setDominantColor] = useState('239, 68, 68')
  
  // Chat
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [sendingMessage, setSendingMessage] = useState(false)
  
  // UI
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [hoveredMember, setHoveredMember] = useState<string | null>(null)
  const [copiedEmail, setCopiedEmail] = useState<string | null>(null)

  // 1. MODIFICA: Try-Catch aggiunto per proteggere l'esecuzione del Canvas (CORS error prevention)
  const extractColor = (imageUrl: string) => {
    if (!imageUrl) return;
    
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
          r = Math.round(r / count)
          g = Math.round(g / count)
          b = Math.round(b / count)
          setDominantColor(`${r}, ${g}, ${b}`)
        }
      } catch (e) {
        console.error("Errore estrazione colore (possibile problema CORS):", e)
        setDominantColor('239, 68, 68') // Fallback a rosso standard
      }
    }
    
    img.onerror = () => {
      console.warn("Impossibile caricare l'immagine per l'estrazione del colore.")
      setDominantColor('239, 68, 68')
    }
  }

  // Fetch dati
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

      // Dati bando
      const { data: bandoData, error: bandoError } = await supabase
        .from('bando')
        .select(`
          *,
          creatore_studente:creatore_studente_id (id, nome, cognome, avatar_url, email, bio)
        `)
        .eq('id', bandoId)
        .single()

      if (bandoError) throw bandoError

      // Controllo accesso
      const checkIsOwner = bandoData.creatore_studente_id === user.id
      
      if (!checkIsOwner) {
        const { data: myParticipation } = await supabase
          .from('partecipazione')
          .select('stato')
          .eq('bando_id', bandoId)
          .eq('studente_id', user.id)
          .single()

        if (!myParticipation || myParticipation.stato !== 'accepted') {
          router.replace('/dashboard/my_teams') // Corretto: indirizziamo a my_teams
          return
        }
      }

      setProject(bandoData)
      setIsOwner(checkIsOwner)

      // Estrai colore dal banner
      if (bandoData.foto_url) {
        extractColor(bandoData.foto_url)
      }

      // Leader
      const cStudente = bandoData?.creatore_studente
      if (cStudente) {
        setLeader({
          id: cStudente.id,
          nome: cStudente.nome,
          cognome: cStudente.cognome,
          avatar_url: cStudente.avatar_url,
          email: cStudente.email,
          bio: cStudente.bio,
          ruolo: 'Owner'
        })
      }

      // Membri team
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

      const formattedMembers = membersData?.map((m: any) => {
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

      // Permessi
      const userMemberData = formattedMembers.find(m => m.id === user?.id)
      if (checkIsOwner || userMemberData?.ruolo_team === 'admin') {
        setIsAdmin(true)
      }

      // Messaggi chat
      await fetchMessages()

    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const fetchMessages = async () => {
    if (!bandoId) return;
    const { data } = await (supabase
      .from('messaggio_team' as any)
      .select(`
        id,
        testo,
        created_at,
        studente:studente_id (id, nome, cognome, avatar_url)
      `)
      .eq('bando_id', bandoId)
      .order('created_at', { ascending: true })
      .limit(50) as any)

    if (data) setMessages(data)
  }

  const sendMessage = async () => {
    // 2. MODIFICA: Controllo di sicurezza fondamentale. Evita crash se currentUser non è ancora pronto.
    if (!newMessage.trim() || sendingMessage || !currentUser?.id || !bandoId) return
    
    setSendingMessage(true)

    const { error } = await (supabase
      .from('messaggio_team' as any)
      .insert({
        bando_id: bandoId,
        studente_id: currentUser.id,
        testo: newMessage.trim()
      }) as any)

    if (!error) {
      setNewMessage('')
      await fetchMessages()
      // Scroll to bottom
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
      }, 100)
    }

    setSendingMessage(false)
  }

  const copyEmail = (email: string) => {
    navigator.clipboard.writeText(email)
    setCopiedEmail(email)
    setTimeout(() => setCopiedEmail(null), 2000)
  }

  const handleLeaveTeam = async () => {
    if (!currentUser?.id || !bandoId) return;
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

      router.push('/dashboard/my_teams') // Corretto: indirizziamo alla dashboard dei team
    }
  }

  useEffect(() => {
    if (bandoId) {
       fetchTeamData()
    }
  }, [bandoId])

  // Realtime messages
  useEffect(() => {
    if (!bandoId) return

    const channel = supabase
      .channel(`team-${bandoId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messaggio_team',
        filter: `bando_id=eq.${bandoId}`
      }, (payload) => {
        // 3. MODIFICA: Invece di fare fetch di tutto, potremmo appendere il payload
        // Ma per ora manteniamo il fetch garantendo che bandoId sia valido
        fetchMessages()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [bandoId]) // rimosso fetchMessages dalle dipendenze se l'hai mai messo, per evitare loop

  // Rileva lo scroll iniziale della chat
  useEffect(() => {
    if (messages.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages])


  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-gray-300 border-t-red-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-500 font-medium">Caricamento workspace...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 font-medium">{error}</p>
          <button 
            onClick={() => router.push('/dashboard/my_teams')}
            className="mt-4 px-4 py-2 bg-gray-100 rounded-lg text-sm font-medium hover:bg-gray-200"
          >
            Torna ai Miei Team
          </button>
        </div>
      </div>
    )
  }

  const allMembers = leader ? [{ ...leader, ruolo_team: 'owner' as const }, ...teamMembers] : teamMembers

  return (
    <div 
      className="min-h-screen pb-20 transition-colors duration-700"
      style={{ backgroundColor: `rgba(${dominantColor}, 0.05)` }}
    >
      {/* Banner Header */}
      <div className="relative h-64 sm:h-80 overflow-hidden">
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
        
        {/* Overlay gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
        
        {/* Back button */}
        <div className="absolute top-4 left-4 sm:top-6 sm:left-6">
          <button 
            // 4. MODIFICA: Aggiornato percorso di ritorno
            onClick={() => router.push('/dashboard/my_teams')}
            className="flex items-center gap-2 bg-white/10 backdrop-blur-md text-white px-4 py-2 rounded-xl font-medium text-sm hover:bg-white/20 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            I miei team
          </button>
        </div>

        {/* Admin badge + settings */}
        {isAdmin && (
          <div className="absolute top-4 right-4 sm:top-6 sm:right-6 flex gap-2">
            <Link
              href={`/dashboard/projects/${bandoId}/manage`}
              className="flex items-center gap-2 bg-white text-gray-900 px-4 py-2 rounded-xl font-medium text-sm hover:bg-gray-100 transition-colors shadow-lg"
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
          <div className="max-w-5xl mx-auto">
            <div className="flex items-center gap-2 mb-3">
              <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                project?.stato === 'chiuso' 
                  ? 'bg-gray-500 text-white' 
                  : 'bg-green-500 text-white'
              }`}>
                {project?.stato === 'chiuso' ? '🔒 Chiuso' : '🟢 Aperto'}
              </span>
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-white/20 backdrop-blur-sm text-white">
                Workspace
              </span>
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-2">
              {project?.titolo}
            </h1>
            <p className="text-white/80 text-sm sm:text-base max-w-2xl line-clamp-2">
              {project?.descrizione}
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 -mt-6">
        <div className="grid lg:grid-cols-3 gap-6">
          
          {/* Main content */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Link di progetto */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <span>🔗</span> Link di Progetto
              </h2>
              <div className="grid sm:grid-cols-2 gap-4">
                {project?.github_url ? (
                  <a 
                    href={project.github_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-4 bg-gray-900 hover:bg-gray-800 text-white rounded-xl transition-colors"
                  >
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                    </svg>
                    <div>
                      <p className="font-semibold">GitHub</p>
                      <p className="text-xs text-gray-400">Repository</p>
                    </div>
                  </a>
                ) : (
                  <div className="flex items-center gap-3 p-4 bg-gray-50 text-gray-400 rounded-xl border-2 border-dashed border-gray-200">
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                    </svg>
                    <span className="text-sm font-medium">Nessun link GitHub</span>
                  </div>
                )}

                {project?.drive_url ? (
                  <a 
                    href={project.drive_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors"
                  >
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12.01 1.485c-2.082 0-3.754.02-3.743.047.01.02 1.708 3.001 3.774 6.62l3.76 6.574h3.76c2.081 0 3.753-.02 3.742-.047-.005-.02-1.708-3.001-3.775-6.62l-3.76-6.574h-3.758zm-6.267 10.942c-.023.005-1.727 3.001-3.794 6.621l-3.76 6.574 3.76-.005c2.082-.005 3.754-.025 3.743-.047-.005-.02 1.708-3.001 3.775-6.62l3.76-6.574-3.76.005c-2.082.005-3.754.025-3.724.046z"/>
                    </svg>
                    <div>
                      <p className="font-semibold">Google Drive</p>
                      <p className="text-xs text-blue-200">Documenti</p>
                    </div>
                  </a>
                ) : (
                  <div className="flex items-center gap-3 p-4 bg-gray-50 text-gray-400 rounded-xl border-2 border-dashed border-gray-200">
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12.01 1.485c-2.082 0-3.754.02-3.743.047.01.02 1.708 3.001 3.774 6.62l3.76 6.574h3.76c2.081 0 3.753-.02 3.742-.047-.005-.02-1.708-3.001-3.775-6.62l-3.76-6.574h-3.758zm-6.267 10.942c-.023.005-1.727 3.001-3.794 6.621l-3.76 6.574 3.76-.005c2.082-.005 3.754-.025 3.743-.047-.005-.02 1.708-3.001 3.775-6.62l3.76-6.574-3.76.005c-2.082.005-3.754.025-3.724.046z"/>
                    </svg>
                    <span className="text-sm font-medium">Nessun link Drive</span>
                  </div>
                )}
              </div>
            </div>

            {/* Chat Team */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <span>💬</span> Chat Team
                </h2>
                <span className="text-xs text-gray-400">{messages.length} messaggi</span>
              </div>
              
              {/* Messages */}
              <div className="h-80 overflow-y-auto p-4 space-y-4 bg-gray-50">
                {messages.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-center">
                    <div>
                      <span className="text-4xl block mb-2">💬</span>
                      <p className="text-gray-500 text-sm">Nessun messaggio ancora</p>
                      <p className="text-gray-400 text-xs">Inizia la conversazione!</p>
                    </div>
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isMe = msg.studente?.id === currentUser?.id
                    return (
                      <div key={msg.id} className={`flex gap-3 ${isMe ? 'flex-row-reverse' : ''}`}>
                        <img 
                          src={msg.studente?.avatar_url || '/default-avatar.png'} 
                          alt=""
                          className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                        />
                        <div className={`max-w-[70%] ${isMe ? 'text-right' : ''}`}>
                          <p className="text-xs text-gray-500 mb-1">
                            {msg.studente?.nome} {msg.studente?.cognome}
                          </p>
                          <div className={`px-4 py-2 rounded-2xl ${
                            isMe 
                              ? 'bg-blue-600 text-white rounded-br-md' 
                              : 'bg-white border border-gray-200 text-gray-900 rounded-bl-md'
                          }`}>
                            <p className="text-sm">{msg.testo}</p>
                          </div>
                          <p className="text-[10px] text-gray-400 mt-1">
                            {new Date(msg.created_at).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                    )
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div className="p-4 border-t border-gray-100">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                    placeholder="Scrivi un messaggio..."
                    className="flex-1 px-4 py-2.5 bg-gray-100 rounded-xl border-0 focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                  />
                  <button
                    onClick={sendMessage}
                    disabled={!newMessage.trim() || sendingMessage || !currentUser?.id}
                    className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {sendingMessage ? '...' : 'Invia'}
                  </button>
                </div>

                {/* Admin: Notifica tutti */}
                {isAdmin && (
                  <button
                    onClick={() => {
                      const teamEmails = allMembers
                        .filter(m => m.email && m.id !== currentUser?.id)
                        .map(m => m.email)
                        .join(',')
                      
                      if (teamEmails) {
                        const subject = encodeURIComponent(`[${project?.titolo}] Aggiornamento dal team`)
                        window.location.href = `mailto:?bcc=${teamEmails}&subject=${subject}`
                      }
                    }}
                    className="mt-3 w-full py-2 text-xs font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    Invia email a tutto il team
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar - Team Members */}
          <div className="space-y-6">
            <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm sticky top-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <span>👥</span> Team
                </span>
                <span className="text-xs text-gray-400 font-normal">{allMembers.length} membri</span>
              </h2>

              <div className="space-y-2">
                {allMembers.map((member) => (
                  <div
                    key={member.id}
                    className="relative"
                    onMouseEnter={() => setHoveredMember(member.id)}
                    onMouseLeave={() => setHoveredMember(null)}
                  >
                    <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors cursor-pointer">
                      <div className="relative">
                        <img 
                          src={member.avatar_url || '/default-avatar.png'} 
                          alt=""
                          className="w-10 h-10 rounded-xl object-cover"
                        />
                        {member.ruolo_team === 'owner' && (
                          <span className="absolute -top-1 -right-1 text-xs">👑</span>
                        )}
                        {member.ruolo_team === 'admin' && (
                          <span className="absolute -top-1 -right-1 text-xs">🛡️</span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 truncate text-sm">
                          {member.nome} {member.cognome}
                        </p>
                        <p className={`text-xs ${
                          member.ruolo_team === 'owner' ? 'text-amber-600' :
                          member.ruolo_team === 'admin' ? 'text-blue-600' :
                          'text-gray-400'
                        }`}>
                          {member.ruolo_team === 'owner' ? 'Owner' :
                           member.ruolo_team === 'admin' ? 'Admin' : 'Membro'}
                        </p>
                      </div>
                    </div>

                    {/* Hover Card */}
                    {hoveredMember === member.id && (
                      <div className="absolute left-full top-0 ml-2 w-64 bg-white rounded-xl shadow-xl border border-gray-200 p-4 z-50 animate-in fade-in slide-in-from-left-2 duration-200">
                        <div className="flex items-center gap-3 mb-3">
                          <img 
                            src={member.avatar_url || '/default-avatar.png'} 
                            alt=""
                            className="w-12 h-12 rounded-xl object-cover"
                          />
                          <div>
                            <p className="font-semibold text-gray-900">{member.nome} {member.cognome}</p>
                            <p className="text-xs text-gray-500">{member.nome_corso || 'Non specificato'}</p>
                          </div>
                        </div>

                        {member.bio && (
                          <p className="text-xs text-gray-600 mb-3 line-clamp-3 italic">"{member.bio}"</p>
                        )}

                        {member.anno_inizio_corso && (
                          <p className="text-xs text-gray-400 mb-3">
                            🎓 {new Date().getFullYear() - member.anno_inizio_corso + 1}° Anno
                          </p>
                        )}

                        {member.email && member.id !== currentUser?.id && (
                          <button
                            onClick={() => copyEmail(member.email)}
                            className="w-full flex items-center justify-center gap-2 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-medium transition-colors"
                          >
                            {copiedEmail === member.email ? (
                              <>
                                <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                                Copiata!
                              </>
                            ) : (
                              <>
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                                </svg>
                                Copia email
                              </>
                            )}
                          </button>
                        )}

                        {/* Arrow */}
                        <div className="absolute left-0 top-4 -translate-x-full">
                          <div className="w-0 h-0 border-y-8 border-y-transparent border-r-8 border-r-white" />
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Leave team */}
              {!isOwner && (
                <button
                  onClick={handleLeaveTeam}
                  className="w-full mt-6 py-2.5 text-sm font-medium text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors border border-transparent hover:border-red-200"
                >
                  🚪 Abbandona team
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}