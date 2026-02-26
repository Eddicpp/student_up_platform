'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useParams, useRouter } from 'next/navigation'

export default function PublicProfilePage() {
  const params = useParams()
  const router = useRouter()
  const supabase = createClient()
  const targetUserId = params.id as string

  // --- STATI DATI ---
  const [profileData, setProfileData] = useState<any>(null)
  const [tags, setTags] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Stato per copia email
  const [emailCopied, setEmailCopied] = useState(false)

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!targetUserId) return

      try {
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
          // Estraiamo solo i nomi dei tag
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

  // Funzione per copiare l'email
  const handleCopyEmail = () => {
    if (profileData?.email) {
      navigator.clipboard.writeText(profileData.email)
      setEmailCopied(true)
      setTimeout(() => setEmailCopied(false), 2000)
    }
  }

  // Funzione per aprire la chat
  const handleOpenChat = () => {
    // Sostituisci questo percorso con quello corretto per i messaggi diretti nella tua app
    // Es: router.push(`/dashboard/messages?user=${targetUserId}`)
    alert("Funzione chat diretta! (Collega qui il tuo sistema di messaggistica)")
  }

  if (loading) return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="text-center">
        <div className="text-5xl sm:text-6xl animate-bounce mb-4">🚀</div>
        <p className="text-gray-900 font-black uppercase tracking-widest text-sm sm:text-xl">Caricamento profilo...</p>
      </div>
    </div>
  )

  if (error || !profileData) return (
    <div className="text-center pt-20 px-4">
      <div className="text-6xl mb-6 -rotate-6">🤷‍♂️</div>
      <h1 className="text-3xl sm:text-4xl font-black text-gray-900 uppercase tracking-tighter mb-6">⚠️ {error}</h1>
      <button 
        onClick={() => router.back()} 
        className="px-6 py-3 bg-white border-4 border-gray-900 rounded-xl font-black uppercase tracking-widest shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all"
      >
        ← Torna indietro
      </button>
    </div>
  )

  return (
    <div className="max-w-5xl mx-auto pb-12 sm:pb-20 px-3 sm:px-4 mt-6">
      
      {/* HEADER CON NAVIGAZIONE */}
      <div className="flex flex-row items-center justify-between gap-2 mb-6 sm:mb-8">
        <button 
          onClick={() => router.back()}
          className="px-3 sm:px-5 py-2 sm:py-3 bg-white border-[3px] sm:border-4 border-gray-900 rounded-lg sm:rounded-xl font-black text-gray-900 uppercase tracking-widest shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all flex items-center gap-1.5 sm:gap-2 text-xs sm:text-base"
        >
          <span className="text-sm sm:text-xl">🔙</span> Indietro
        </button>
      </div>

      <div className="bg-white rounded-2xl sm:rounded-[2rem] border-[3px] sm:border-4 border-gray-900 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] sm:shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] overflow-hidden relative">
        
        {/* BANNER CARTOON */}
        <div className="h-32 sm:h-72 bg-gray-200 border-b-[3px] sm:border-b-4 border-gray-900 relative overflow-hidden pattern-dots">
          {profileData.banner_url ? (
            <img 
              src={profileData.banner_url} 
              className="w-full h-full object-cover" 
              alt="Banner" 
              style={profileData.banner_settings ? {
                transform: `scale(${profileData.banner_settings.scale || 1})`,
                objectPosition: `50% ${profileData.banner_settings.posY || 50}%`
              } : {}}
            />
          ) : (
            <div className="w-full h-full bg-blue-400 flex items-center justify-center">
              <span className="text-4xl sm:text-6xl opacity-50">🖼️</span>
            </div>
          )}
        </div>

        <div className="px-4 sm:px-12 pb-8 sm:pb-12">
          
          {/* AVATAR, NOME E BOTTONI */}
          <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 -mt-12 sm:-mt-20 mb-6 sm:mb-10 relative z-10">
            <div className="relative flex-shrink-0 mx-auto sm:mx-0">
              <div className="w-24 h-24 sm:w-40 sm:h-40 rounded-full border-[3px] sm:border-4 border-gray-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] sm:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] overflow-hidden bg-white relative">
                {profileData.avatar_url ? (
                  <img src={profileData.avatar_url} className="w-full h-full object-cover" alt="Avatar"/>
                ) : (
                  <div className="w-full h-full bg-red-400 flex items-center justify-center">
                    <span className="text-3xl sm:text-5xl font-black text-gray-900 uppercase">{profileData.nome?.charAt(0)}{profileData.cognome?.charAt(0)}</span>
                  </div>
                )}
              </div>
              {profileData.is_system_admin && (
                <div className="absolute bottom-0 right-0 bg-yellow-300 border-2 sm:border-4 border-gray-900 text-gray-900 px-2 py-0.5 sm:px-3 sm:py-1 rounded-lg sm:rounded-xl text-[10px] sm:text-xs font-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] uppercase -rotate-6">
                  ⚡ Staff
                </div>
              )}
            </div>

            {/* Informazioni testuali posizionate correttamente per non sovrapporsi */}
            <div className="flex-1 pt-2 sm:pt-24 text-center sm:text-left">
              <h1 className="text-2xl sm:text-5xl font-black text-gray-900 uppercase italic tracking-tighter leading-none mb-1 sm:mb-2">
                {profileData.nome} <span className="text-red-600">{profileData.cognome}</span>
              </h1>
              {profileData.corso_studi && (
                <div className="inline-block bg-white border-2 border-gray-900 px-2 py-1 sm:px-3 sm:py-1.5 rounded-md sm:rounded-lg shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] mt-1 sm:mt-2">
                  <p className="text-gray-900 font-bold text-[10px] sm:text-sm uppercase tracking-widest">
                    🎓 {profileData.corso_studi} • Anno {profileData.anno_corso}
                  </p>
                </div>
              )}

              {/* Tasti di interazione immediata */}
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mt-4 sm:mt-6">
                <button 
                  onClick={handleOpenChat}
                  className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-5 py-2 sm:py-2.5 bg-yellow-300 text-gray-900 border-2 sm:border-3 border-gray-900 rounded-lg sm:rounded-xl font-black uppercase tracking-widest text-[10px] sm:text-sm shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] sm:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all"
                >
                  <span className="text-sm sm:text-lg">💬</span> Contatta
                </button>

                <button 
                  onClick={handleCopyEmail}
                  className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-5 py-2 sm:py-2.5 bg-white text-gray-900 border-2 sm:border-3 border-gray-900 rounded-lg sm:rounded-xl font-black uppercase tracking-widest text-[10px] sm:text-sm shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] sm:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all"
                >
                  <span className="text-sm sm:text-lg">{emailCopied ? '✅' : '📧'}</span> 
                  {emailCopied ? 'Copiata!' : 'Copia Email'}
                </button>
              </div>
            </div>
          </div>

          {/* SEZIONE BIO */}
          <div className="mb-6 sm:mb-10 bg-blue-50 border-[3px] sm:border-4 border-gray-900 rounded-xl sm:rounded-2xl p-4 sm:p-6 relative mt-4">
            <span className="absolute -top-3.5 sm:-top-5 left-4 sm:left-6 bg-white border-2 sm:border-4 border-gray-900 px-3 py-0.5 sm:px-4 sm:py-1 rounded-lg sm:rounded-xl font-black uppercase tracking-widest text-gray-900 text-[10px] sm:text-sm shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">Chi Sono 💭</span>
            <p className="text-gray-900 font-bold text-sm sm:text-lg leading-relaxed mt-1 sm:mt-2">
              {profileData.bio || <span className="text-gray-500 italic font-medium">Nessuna biografia inserita. È un tipo misterioso.</span>}
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 sm:gap-10 mb-6 sm:mb-10">
            {/* COMPETENZE / TAGS */}
            <div className="bg-purple-50 border-[3px] sm:border-4 border-gray-900 rounded-xl sm:rounded-2xl p-4 sm:p-6 relative mt-2">
              <span className="absolute -top-3.5 sm:-top-5 left-4 sm:left-6 bg-white border-2 sm:border-4 border-gray-900 px-3 py-0.5 sm:px-4 sm:py-1 rounded-lg sm:rounded-xl font-black uppercase tracking-widest text-gray-900 text-[10px] sm:text-sm shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">Skill & Passioni ⭐</span>
              <div className="mt-2 sm:mt-4 flex flex-wrap gap-2 sm:gap-3">
                {tags.length > 0 ? (
                  tags.map((tag, i) => (
                    <span key={i} className="px-2 py-1 sm:px-4 sm:py-2 bg-white text-gray-900 border-2 sm:border-3 border-gray-900 rounded-lg sm:rounded-xl font-black uppercase tracking-widest text-[10px] sm:text-sm shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] sm:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
                      {tag}
                    </span>
                  ))
                ) : (
                  <span className="text-gray-500 font-bold italic text-sm">Nessuna competenza inserita</span>
                )}
              </div>
            </div>

            {/* COLLEGAMENTI SOCIAL */}
            <div className="bg-green-50 border-[3px] sm:border-4 border-gray-900 rounded-xl sm:rounded-2xl p-4 sm:p-6 relative mt-2 md:mt-0">
              <span className="absolute -top-3.5 sm:-top-5 left-4 sm:left-6 bg-white border-2 sm:border-4 border-gray-900 px-3 py-0.5 sm:px-4 sm:py-1 rounded-lg sm:rounded-xl font-black uppercase tracking-widest text-gray-900 text-[10px] sm:text-sm shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">Collegamenti 🔗</span>
              <div className="flex flex-wrap gap-2 sm:gap-4 mt-1 sm:mt-2">
                {profileData.linkedin_url && <a href={profileData.linkedin_url.startsWith('http') ? profileData.linkedin_url : `https://${profileData.linkedin_url}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 px-3 sm:px-6 py-1.5 sm:py-3 bg-white border-2 sm:border-4 border-gray-900 rounded-lg sm:rounded-xl font-black uppercase text-[10px] sm:text-sm text-gray-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all"><span className="text-sm sm:text-xl">💼</span> LinkedIn</a>}
                {profileData.github_url && <a href={profileData.github_url.startsWith('http') ? profileData.github_url : `https://${profileData.github_url}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 px-3 sm:px-6 py-1.5 sm:py-3 bg-white border-2 sm:border-4 border-gray-900 rounded-lg sm:rounded-xl font-black uppercase text-[10px] sm:text-sm text-gray-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all"><span className="text-sm sm:text-xl">💻</span> GitHub</a>}
                {profileData.website_url && <a href={profileData.website_url.startsWith('http') ? profileData.website_url : `https://${profileData.website_url}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 px-3 sm:px-6 py-1.5 sm:py-3 bg-white border-2 sm:border-4 border-gray-900 rounded-lg sm:rounded-xl font-black uppercase text-[10px] sm:text-sm text-gray-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all"><span className="text-sm sm:text-xl">🌐</span> Web</a>}
                {profileData.twitter_url && <a href={profileData.twitter_url.startsWith('http') ? profileData.twitter_url : `https://${profileData.twitter_url}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 px-3 sm:px-6 py-1.5 sm:py-3 bg-white border-2 sm:border-4 border-gray-900 rounded-lg sm:rounded-xl font-black uppercase text-[10px] sm:text-sm text-gray-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all"><span className="text-sm sm:text-xl">🐦</span> Twitter</a>}
                {!profileData.linkedin_url && !profileData.github_url && !profileData.website_url && !profileData.twitter_url && <span className="text-gray-500 font-bold italic text-sm mt-2">Nessun collegamento inserito.</span>}
              </div>
            </div>
          </div>

          {/* CURRICULUM */}
          <div className="bg-red-50 border-[3px] sm:border-4 border-gray-900 rounded-xl sm:rounded-2xl p-4 sm:p-6 relative mt-6">
            <span className="absolute -top-3.5 sm:-top-5 left-4 sm:left-6 bg-white border-2 sm:border-4 border-gray-900 px-3 py-0.5 sm:px-4 sm:py-1 rounded-lg sm:rounded-xl font-black uppercase tracking-widest text-gray-900 text-[10px] sm:text-sm shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">Curriculum 📄</span>
            <div className="mt-2 sm:mt-4 flex items-center justify-center p-2 sm:p-4">
              {profileData.cv_url ? (
                <a href={profileData.cv_url} target="_blank" rel="noopener noreferrer" className="flex flex-col items-center gap-1 sm:gap-2 group">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 bg-white border-[3px] sm:border-4 border-gray-900 rounded-xl sm:rounded-2xl flex items-center justify-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] group-hover:translate-x-[2px] group-hover:translate-y-[2px] group-hover:shadow-none transition-all">
                    <span className="text-3xl sm:text-4xl">📋</span>
                  </div>
                  <span className="font-black uppercase tracking-widest text-gray-900 mt-1 sm:mt-2 text-xs sm:text-base">Apri CV</span>
                </a>
              ) : (
                <span className="text-gray-500 font-bold italic text-sm">Nessun CV caricato</span>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}