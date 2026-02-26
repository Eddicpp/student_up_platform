'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useParams, useRouter } from 'next/navigation'
import PrivateChatModal from '@/app/dashboard/projects/[id]/PrivateChatModal'

// Emoji per lo sfondo animato
const EMOJI_LIST = [
  '📚', '🎓', '💡', '🚀', '⭐', '🎯', '💪', '🔥', '✨', '🎨',
  '💻', '📱', '🎮', '🎵', '📷', '🎬', '✏️', '📝', '📊', '🔬',
  '🧪', '🔭', '🌍', '🌟', '💫', '🏆', '🥇', '🎖️', '🤝', '👥',
  '💼', '📈', '🎤', '🎧', '🖥️', '⚡', '🌈', '🎁', '🔑', '💎'
]

interface FloatingEmoji {
  id: number
  emoji: string
  left: number
  top: number
  size: number
  duration: number
  delay: number
}

export default function PublicProfilePage() {
  const params = useParams()
  const router = useRouter()
  const supabase = createClient()
  const targetUserId = params.id as string

  // --- STATI DATI ---
  const [profileData, setProfileData] = useState<any>(null)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [tags, setTags] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [emojis, setEmojis] = useState<FloatingEmoji[]>([])
  
  // Stati UI
  const [emailCopied, setEmailCopied] = useState(false)
  const [showChat, setShowChat] = useState(false)

  // Genera emoji fluttuanti
  useEffect(() => {
    const generated: FloatingEmoji[] = []
    for (let i = 0; i < 50; i++) {
      generated.push({
        id: i,
        emoji: EMOJI_LIST[Math.floor(Math.random() * EMOJI_LIST.length)],
        left: Math.random() * 100,
        top: Math.random() * 100,
        size: Math.random() * 1.2 + 0.6,
        duration: Math.random() * 10 + 15,
        delay: Math.random() * -20
      })
    }
    setEmojis(generated)
  }, [])

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!targetUserId) return

      try {
        // Utente attuale (per permessi e chat)
        const { data: { user } } = await supabase.auth.getUser()
        if (user) setCurrentUser(user)

        // 1. Fetch dati base studente
        const { data: studente, error: fetchError } = await supabase
          .from('studente')
          .select('*')
          .eq('id', targetUserId)
          .single()

        if (fetchError || !studente) {
          throw new Error("Utente non trovato")
        }

        // 2. Fetch Corso di Studi
        const { data: corsoAttuale } = await supabase
          .from('studente_corso')
          .select(`
            anno_inizio,
            corso:corso_id ( nome, tipo )
          `)
          .eq('studente_id', targetUserId)
          .eq('completato', false)
          .order('anno_inizio', { ascending: false })
          .limit(1)
          .maybeSingle()

        // Uniamo i dati del corso al profilo
        if (corsoAttuale) {
          Object.assign(studente, {
            corso_studi: (corsoAttuale.corso as any)?.nome,
            anno_corso: new Date().getFullYear() - corsoAttuale.anno_inizio + 1
          });
        }

        setProfileData(studente)

        // 3. Fetch Competenze/Interessi
        const { data: myTags } = await supabase
          .from('studente_interesse')
          .select('interesse(nome)')
          .eq('studente_id', targetUserId)

        if (myTags) {
          const tagNames = myTags.map((t: any) => t.interesse?.nome).filter(Boolean)
          setTags(tagNames)
        }

      } catch (err: any) {
        console.error("Errore fetch profilo:", err)
        setError("Profilo non disponibile o inesistente.")
      } finally {
        setLoading(false)
      }
    }

    fetchUserProfile()
  }, [targetUserId, supabase])

  // Copia email
  const handleCopyEmail = () => {
    if (profileData?.email) {
      navigator.clipboard.writeText(profileData.email)
      setEmailCopied(true)
      setTimeout(() => setEmailCopied(false), 2000)
    }
  }

  // Stili condivisi
  const cardStyle = "bg-white rounded-2xl sm:rounded-3xl border-2 sm:border-4 border-gray-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] sm:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]"
  const buttonStyle = "border-2 sm:border-3 border-gray-900 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] sm:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[3px] hover:translate-y-[3px] sm:hover:translate-x-[4px] sm:hover:translate-y-[4px] transition-all"
  const sectionLabelStyle = "absolute -top-3 sm:-top-4 left-3 sm:left-5 bg-white border-2 border-gray-900 px-2 sm:px-3 py-0.5 sm:py-1 rounded-lg font-black uppercase tracking-widest text-gray-900 text-[10px] sm:text-xs shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 via-orange-50 to-yellow-50 p-4 relative overflow-hidden">
      {/* Sfondo emoji */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {emojis.map((item) => (
          <div
            key={item.id}
            className="absolute animate-float opacity-30"
            style={{
              left: `${item.left}%`,
              top: `${item.top}%`,
              fontSize: `${item.size}rem`,
              animationDuration: `${item.duration}s`,
              animationDelay: `${item.delay}s`,
            }}
          >
            {item.emoji}
          </div>
        ))}
      </div>
      
      <div className={`${cardStyle} p-6 sm:p-10 text-center relative z-10`}>
        <div className="text-5xl sm:text-7xl animate-bounce mb-4">🚀</div>
        <p className="text-gray-900 font-black uppercase tracking-widest text-sm sm:text-lg">Caricamento Profilo...</p>
      </div>

      <style jsx global>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          25% { transform: translateY(-20px) rotate(5deg); }
          50% { transform: translateY(-10px) rotate(-5deg); }
          75% { transform: translateY(-25px) rotate(3deg); }
        }
        .animate-float { animation: float 20s ease-in-out infinite; }
      `}</style>
    </div>
  )

  if (error || !profileData) return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 via-orange-50 to-yellow-50 p-4 relative overflow-hidden">
      {/* Sfondo emoji */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {emojis.map((item) => (
          <div
            key={item.id}
            className="absolute animate-float opacity-30"
            style={{
              left: `${item.left}%`,
              top: `${item.top}%`,
              fontSize: `${item.size}rem`,
              animationDuration: `${item.duration}s`,
              animationDelay: `${item.delay}s`,
            }}
          >
            {item.emoji}
          </div>
        ))}
      </div>

      <div className={`${cardStyle} p-6 sm:p-10 text-center max-w-md relative z-10`}>
        <div className="text-5xl sm:text-7xl mb-4 inline-block transform -rotate-6">🤷‍♂️</div>
        <h1 className="text-xl sm:text-2xl font-black text-gray-900 uppercase tracking-tight mb-6">⚠️ {error}</h1>
        <button 
          onClick={() => router.back()} 
          className={`px-5 sm:px-6 py-2.5 sm:py-3 bg-white rounded-xl font-black text-sm sm:text-base uppercase tracking-widest ${buttonStyle}`}
        >
          ← Torna indietro
        </button>
      </div>

      <style jsx global>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          25% { transform: translateY(-20px) rotate(5deg); }
          50% { transform: translateY(-10px) rotate(-5deg); }
          75% { transform: translateY(-25px) rotate(3deg); }
        }
        .animate-float { animation: float 20s ease-in-out infinite; }
      `}</style>
    </div>
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-orange-50 to-yellow-50 pb-10 sm:pb-20 relative overflow-hidden">
      
      {/* Sfondo animato con emoji */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {emojis.map((item) => (
          <div
            key={item.id}
            className="absolute animate-float opacity-20"
            style={{
              left: `${item.left}%`,
              top: `${item.top}%`,
              fontSize: `${item.size}rem`,
              animationDuration: `${item.duration}s`,
              animationDelay: `${item.delay}s`,
            }}
          >
            {item.emoji}
          </div>
        ))}
      </div>

      {/* Pattern di sfondo */}
      <div 
        className="absolute inset-0 opacity-[0.02] pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
        }}
      />

      <div className="max-w-4xl mx-auto px-3 sm:px-6 pt-4 sm:pt-8 relative z-10">
        
        {/* Header con navigazione */}
        <div className="flex items-center justify-between mb-4 sm:mb-6">
          <button 
            onClick={() => router.back()} 
            className={`px-3 sm:px-5 py-2 sm:py-2.5 bg-white rounded-xl sm:rounded-xl font-black text-gray-900 uppercase tracking-wider text-xs sm:text-sm flex items-center gap-1.5 sm:gap-2 ${buttonStyle}`}
          >
            <span>←</span> Indietro
          </button>
          
          {/* Badge utente corrente */}
          {currentUser?.id === profileData.id && (
            <span className="px-3 py-1.5 bg-yellow-300 rounded-lg border-2 border-gray-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] text-[10px] sm:text-xs font-black uppercase">
              👤 Il tuo profilo
            </span>
          )}
        </div>

        {/* Card principale profilo */}
        <div className={`${cardStyle} overflow-hidden`}>
          
          {/* BANNER */}
          <div className="h-28 sm:h-48 lg:h-56 bg-gradient-to-r from-red-400 via-orange-400 to-yellow-400 border-b-2 sm:border-b-4 border-gray-900 relative overflow-hidden">
            {profileData.banner_url ? (
              <img 
                src={profileData.banner_url} 
                className="w-full h-full object-cover" 
                style={{
                  transform: `scale(${profileData.banner_settings?.scale || 1})`,
                  objectPosition: `50% ${profileData.banner_settings?.posY || 50}%`
                }}
                alt="Banner Profilo" 
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <span className="text-4xl sm:text-6xl opacity-30">🎨</span>
              </div>
            )}
            
            {/* Overlay gradient */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
          </div>

          {/* Contenuto profilo */}
          <div className="px-4 sm:px-8 lg:px-10 pb-6 sm:pb-10">
            
            {/* AVATAR & INFO PRINCIPALE */}
            <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 -mt-12 sm:-mt-16 lg:-mt-20 mb-6 sm:mb-8 relative z-10">
              
              {/* Avatar */}
              <div className="relative flex-shrink-0 mx-auto sm:mx-0">
                <div className="w-24 h-24 sm:w-32 sm:h-32 lg:w-40 lg:h-40 rounded-2xl sm:rounded-3xl border-3 sm:border-4 border-gray-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] sm:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] overflow-hidden bg-white">
                  {profileData.avatar_url ? (
                    <img src={profileData.avatar_url} className="w-full h-full object-cover" alt="Avatar"/>
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-red-400 to-orange-400 flex items-center justify-center">
                      <span className="text-3xl sm:text-5xl font-black text-white uppercase">
                        {profileData.nome?.charAt(0)}{profileData.cognome?.charAt(0)}
                      </span>
                    </div>
                  )}
                </div>
                
                {/* Badge Staff */}
                {profileData.is_system_admin && (
                  <div className="absolute -bottom-2 -right-2 sm:-bottom-3 sm:-right-3 bg-yellow-400 border-2 border-gray-900 text-gray-900 px-2 sm:px-3 py-0.5 sm:py-1 rounded-lg text-[9px] sm:text-xs font-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] uppercase -rotate-6">
                    ⚡ Staff
                  </div>
                )}
              </div>

              {/* Info Testo */}
              <div className="flex-1 pt-0 sm:pt-16 lg:pt-20 text-center sm:text-left">
                <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black text-gray-900 uppercase tracking-tight leading-none mb-2">
                  {profileData.nome} <span className="text-red-500">{profileData.cognome}</span>
                </h1>
                
                {profileData.corso_studi && (
                  <div className="inline-flex items-center gap-1.5 bg-white border-2 border-gray-900 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] mt-1 sm:mt-2">
                    <span className="text-sm sm:text-lg">🎓</span>
                    <p className="text-gray-900 font-bold text-[10px] sm:text-sm uppercase tracking-wider">
                      {profileData.corso_studi} • Anno {profileData.anno_corso}
                    </p>
                  </div>
                )}

                {/* Pulsanti Azione */}
                <div className="flex flex-wrap justify-center sm:justify-start gap-2 sm:gap-3 mt-4 sm:mt-5">
                  {currentUser?.id !== profileData.id && (
                    <button 
                      onClick={() => setShowChat(true)}
                      className={`flex-1 sm:flex-none px-4 sm:px-5 py-2 sm:py-2.5 bg-yellow-400 hover:bg-yellow-500 rounded-xl sm:rounded-xl font-black text-gray-900 text-xs sm:text-sm uppercase tracking-wider flex items-center justify-center gap-1.5 sm:gap-2 ${buttonStyle}`}
                    >
                      <span>💬</span> Contatta
                    </button>
                  )}
                  <button 
                    onClick={handleCopyEmail}
                    className={`flex-1 sm:flex-none px-4 sm:px-5 py-2 sm:py-2.5 bg-white hover:bg-gray-50 rounded-xl sm:rounded-xl font-black text-gray-900 text-xs sm:text-sm uppercase tracking-wider flex items-center justify-center gap-1.5 sm:gap-2 ${buttonStyle}`}
                  >
                    <span>{emailCopied ? '✅' : '📧'}</span> {emailCopied ? 'Copiata!' : 'Email'}
                  </button>
                </div>
              </div>
            </div>

            {/* SEZIONE BIO */}
            <div className="mb-5 sm:mb-8 bg-blue-100 border-2 border-gray-900 rounded-xl sm:rounded-2xl p-4 sm:p-5 relative shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] sm:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
              <span className={sectionLabelStyle}>💭 Chi Sono</span>
              <p className="text-gray-900 font-bold text-sm sm:text-base leading-relaxed mt-1 sm:mt-2">
                {profileData.bio || <span className="text-gray-500 italic font-medium">Nessuna biografia inserita. È un tipo misterioso. 🕵️</span>}
              </p>
            </div>

            {/* GRID: COMPETENZE & SOCIAL */}
            <div className="grid sm:grid-cols-2 gap-4 sm:gap-6 mb-5 sm:mb-8">
              
              {/* COMPETENZE / TAGS */}
              <div className="bg-purple-100 border-2 border-gray-900 rounded-xl sm:rounded-2xl p-4 sm:p-5 relative shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] sm:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                <span className={sectionLabelStyle}>⭐ Skills</span>
                <div className="mt-2 sm:mt-3 flex flex-wrap gap-1.5 sm:gap-2">
                  {tags.length > 0 ? (
                    tags.map(tag => (
                      <span 
                        key={tag} 
                        className="px-2.5 sm:px-3 py-1 sm:py-1.5 bg-white text-gray-900 border-2 border-gray-900 rounded-lg font-bold uppercase tracking-wider text-[10px] sm:text-xs shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5 hover:shadow-[2px_3px_0px_0px_rgba(0,0,0,1)] transition-all cursor-default"
                      >
                        {tag}
                      </span>
                    ))
                  ) : (
                    <span className="text-gray-500 font-bold italic text-xs sm:text-sm">Nessuna competenza inserita</span>
                  )}
                </div>
              </div>

              {/* COLLEGAMENTI SOCIAL */}
              <div className="bg-green-100 border-2 border-gray-900 rounded-xl sm:rounded-2xl p-4 sm:p-5 relative shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] sm:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                <span className={sectionLabelStyle}>🔗 Link</span>
                <div className="flex flex-wrap gap-1.5 sm:gap-2 mt-2 sm:mt-3">
                  {profileData.linkedin_url && (
                    <a 
                      href={profileData.linkedin_url.startsWith('http') ? profileData.linkedin_url : `https://${profileData.linkedin_url}`} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-4 py-1.5 sm:py-2 bg-white rounded-lg font-bold uppercase text-gray-900 text-[10px] sm:text-xs border-2 border-gray-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
                    >
                      <span>💼</span> LinkedIn
                    </a>
                  )}
                  {profileData.github_url && (
                    <a 
                      href={profileData.github_url.startsWith('http') ? profileData.github_url : `https://${profileData.github_url}`} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-4 py-1.5 sm:py-2 bg-white rounded-lg font-bold uppercase text-gray-900 text-[10px] sm:text-xs border-2 border-gray-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
                    >
                      <span>💻</span> GitHub
                    </a>
                  )}
                  {profileData.website_url && (
                    <a 
                      href={profileData.website_url.startsWith('http') ? profileData.website_url : `https://${profileData.website_url}`} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-4 py-1.5 sm:py-2 bg-white rounded-lg font-bold uppercase text-gray-900 text-[10px] sm:text-xs border-2 border-gray-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
                    >
                      <span>🌐</span> Web
                    </a>
                  )}
                  {profileData.twitter_url && (
                    <a 
                      href={profileData.twitter_url.startsWith('http') ? profileData.twitter_url : `https://${profileData.twitter_url}`} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-4 py-1.5 sm:py-2 bg-white rounded-lg font-bold uppercase text-gray-900 text-[10px] sm:text-xs border-2 border-gray-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
                    >
                      <span>🐦</span> Twitter
                    </a>
                  )}
                  {!profileData.linkedin_url && !profileData.github_url && !profileData.website_url && !profileData.twitter_url && (
                    <span className="text-gray-500 font-bold italic text-xs sm:text-sm">Nessun collegamento</span>
                  )}
                </div>
              </div>
            </div>

            {/* CURRICULUM */}
            <div className="bg-red-100 border-2 border-gray-900 rounded-xl sm:rounded-2xl p-4 sm:p-5 relative shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] sm:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
              <span className={sectionLabelStyle}>📄 CV</span>
              <div className="flex items-center justify-center py-2 sm:py-4 mt-1 sm:mt-2">
                {profileData.cv_url ? (
                  <a 
                    href={profileData.cv_url} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className={`flex flex-col items-center gap-2 sm:gap-3 group px-6 sm:px-8 py-3 sm:py-4 bg-white rounded-xl border-2 border-gray-900 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] sm:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[3px] hover:translate-y-[3px] transition-all`}
                  >
                    <span className="text-3xl sm:text-4xl">📋</span>
                    <span className="font-black uppercase tracking-widest text-gray-900 text-xs sm:text-sm">Scarica CV</span>
                  </a>
                ) : (
                  <div className="flex flex-col items-center gap-2 py-2">
                    <span className="text-3xl sm:text-4xl opacity-40">📋</span>
                    <span className="text-gray-500 font-bold italic text-xs sm:text-sm">Nessun CV caricato</span>
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* Modal della Chat Privata */}
      {showChat && currentUser && profileData && (
        <PrivateChatModal
          isOpen={showChat}
          onClose={() => setShowChat(false)}
          currentUserId={currentUser.id}
          otherUser={{
            id: profileData.id,
            nome: profileData.nome,
            cognome: profileData.cognome,
            avatar_url: profileData.avatar_url
          }}
          bandoId="profilo_diretto" 
          bandoTitolo="Messaggio Diretto"
        />
      )}

      {/* Stile per l'animazione float */}
      <style jsx global>{`
        @keyframes float {
          0%, 100% {
            transform: translateY(0px) rotate(0deg);
          }
          25% {
            transform: translateY(-20px) rotate(5deg);
          }
          50% {
            transform: translateY(-10px) rotate(-5deg);
          }
          75% {
            transform: translateY(-25px) rotate(3deg);
          }
        }
        .animate-float {
          animation: float 20s ease-in-out infinite;
        }
      `}</style>
    </div>
  )
}