'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useParams, useRouter } from 'next/navigation'
import SuperAvatar from '@/components/SuperAvatar'

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

  if (loading) return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="text-center">
        <div className="text-5xl sm:text-6xl animate-bounce mb-4">🚀</div>
        <p className="text-gray-900 font-black uppercase tracking-widest text-sm sm:text-lg">Caricamento profilo...</p>
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
    <div className="max-w-5xl mx-auto pb-20 pt-6 sm:pt-10 px-4 sm:px-6">
      
      {/* Header con navigazione */}
      <div className="mb-6 sm:mb-8">
        <button 
          onClick={() => router.back()}
          className="inline-flex items-center gap-2 bg-white px-4 py-2 border-2 sm:border-3 border-gray-900 rounded-lg sm:rounded-xl font-black text-[10px] sm:text-xs uppercase tracking-widest text-gray-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] sm:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all"
        >
          <span className="text-sm sm:text-base">🔙</span> Indietro
        </button>
      </div>

      <div className="bg-white rounded-2xl sm:rounded-[2rem] border-[3px] sm:border-4 border-gray-900 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] sm:shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] overflow-hidden">
        
        {/* Banner Cartoon */}
        <div className="h-40 sm:h-56 bg-gray-200 border-b-[3px] sm:border-b-4 border-gray-900 relative overflow-hidden pattern-dots">
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
              <span className="text-white font-black text-4xl sm:text-6xl italic drop-shadow-[4px_4px_0px_rgba(0,0,0,1)]">STUDENT<span className="text-yellow-300">UP</span></span>
            </div>
          )}
        </div>

        {/* Contenuto */}
        <div className="px-4 sm:px-10 pb-8 sm:pb-10">
          
          {/* Avatar e info base (LAYOUT ORIZZONTALE) */}
          <div className="flex flex-col sm:flex-row justify-between items-center sm:items-end -mt-12 sm:-mt-16 mb-8 gap-4 sm:gap-6 text-center sm:text-left">
            
            <div className="flex flex-col sm:flex-row items-center sm:items-end gap-4 sm:gap-6 z-10">
              {/* Avatar Cartoon */}
              <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-full border-[3px] sm:border-4 border-gray-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] sm:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] overflow-hidden bg-white flex-shrink-0 relative">
                {profileData.avatar_url ? (
                  <img src={profileData.avatar_url} className="w-full h-full object-cover" alt="Avatar"/>
                ) : (
                  <div className="w-full h-full bg-red-400 flex items-center justify-center">
                    <span className="text-3xl sm:text-5xl font-black text-gray-900 uppercase">{profileData.nome?.charAt(0)}{profileData.cognome?.charAt(0)}</span>
                  </div>
                )}
                
                {/* Badge Staff (Se applicabile) */}
                {profileData.is_system_admin && (
                  <div className="absolute bottom-0 right-0 bg-yellow-300 border-2 border-gray-900 text-gray-900 px-2 py-0.5 rounded-lg text-[8px] sm:text-[10px] font-black uppercase -rotate-12">
                    Staff
                  </div>
                )}
              </div>
              
              <div className="pb-2">
                <h1 className="text-3xl sm:text-4xl font-black text-gray-900 uppercase italic tracking-tighter leading-none mb-1 sm:mb-2">
                  {profileData.nome} <span className="text-red-600">{profileData.cognome}</span>
                </h1>
                {profileData.corso_studi && (
                  <div className="inline-block bg-gray-100 border-2 border-gray-900 px-2 py-1 sm:px-3 sm:py-1.5 rounded-lg">
                    <p className="text-gray-900 font-bold text-[10px] sm:text-sm uppercase tracking-widest">
                      🎓 {profileData.corso_studi} • {profileData.anno_corso}° Anno
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Pulsante Contatta */}
            <div className="w-full sm:w-auto pt-2 sm:pt-0 sm:pb-2">
              <a 
                href={`mailto:${profileData.email}`}
                className="flex items-center justify-center gap-2 bg-yellow-300 text-gray-900 border-[3px] border-gray-900 px-6 py-3 rounded-xl font-black uppercase tracking-widest shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all w-full sm:w-auto"
              >
                <span className="text-xl">✉️</span> Contatta
              </a>
            </div>

          </div>

          <div className="grid md:grid-cols-3 gap-6 sm:gap-8">
            
            {/* Colonna Sinistra (Bio & Tags) */}
            <div className="md:col-span-2 space-y-6 sm:space-y-8">
              
              {/* Bio */}
              <div className="bg-blue-50 border-[3px] sm:border-4 border-gray-900 rounded-xl sm:rounded-2xl p-4 sm:p-6 relative mt-4">
                <span className="absolute -top-3.5 sm:-top-5 left-4 sm:left-6 bg-white border-2 sm:border-4 border-gray-900 px-3 py-0.5 sm:px-4 sm:py-1 rounded-lg sm:rounded-xl font-black uppercase tracking-widest text-gray-900 text-[10px] sm:text-sm shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                  Chi Sono 💭
                </span>
                <p className="text-gray-900 font-bold text-sm sm:text-lg leading-relaxed mt-2">
                  {profileData.bio || <span className="text-gray-500 italic">Nessuna biografia inserita. È un tipo misterioso.</span>}
                </p>
              </div>

              {/* Tags / Competenze */}
              <div className="bg-purple-50 border-[3px] sm:border-4 border-gray-900 rounded-xl sm:rounded-2xl p-4 sm:p-6 relative mt-4">
                <span className="absolute -top-3.5 sm:-top-5 left-4 sm:left-6 bg-white border-2 sm:border-4 border-gray-900 px-3 py-0.5 sm:px-4 sm:py-1 rounded-lg sm:rounded-xl font-black uppercase tracking-widest text-gray-900 text-[10px] sm:text-sm shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                  Competenze 🚀
                </span>
                <div className="flex flex-wrap gap-2 sm:gap-3 mt-2">
                  {tags.length > 0 ? (
                    tags.map((tag, i) => (
                      <span key={i} className="px-3 sm:px-4 py-1.5 sm:py-2 bg-white text-gray-900 border-2 sm:border-3 border-gray-900 rounded-lg sm:rounded-xl text-[10px] sm:text-sm font-black uppercase shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 transition-transform">
                        {tag}
                      </span>
                    ))
                  ) : (
                    <span className="text-gray-500 font-bold italic text-sm">Nessuna competenza inserita</span>
                  )}
                </div>
              </div>

            </div>

            {/* Colonna Destra (Social & CV) */}
            <div className="space-y-6 sm:space-y-8">
              
              {/* Social Links */}
              <div className="bg-green-50 border-[3px] sm:border-4 border-gray-900 rounded-xl sm:rounded-2xl p-4 sm:p-6 relative mt-4 md:mt-0">
                <span className="absolute -top-3.5 sm:-top-5 left-4 sm:left-6 bg-white border-2 sm:border-4 border-gray-900 px-3 py-0.5 sm:px-4 sm:py-1 rounded-lg sm:rounded-xl font-black uppercase tracking-widest text-gray-900 text-[10px] sm:text-sm shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                  Contatti 🔗
                </span>
                <div className="flex flex-col gap-3 mt-2">
                  {profileData.linkedin_url && (
                    <a href={profileData.linkedin_url.startsWith('http') ? profileData.linkedin_url : `https://${profileData.linkedin_url}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 px-4 py-3 bg-white border-2 sm:border-3 border-gray-900 rounded-xl font-black uppercase text-[10px] sm:text-xs text-gray-900 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all">
                      <span className="text-lg sm:text-xl">💼</span> LinkedIn
                    </a>
                  )}
                  {profileData.github_url && (
                    <a href={profileData.github_url.startsWith('http') ? profileData.github_url : `https://${profileData.github_url}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 px-4 py-3 bg-white border-2 sm:border-3 border-gray-900 rounded-xl font-black uppercase text-[10px] sm:text-xs text-gray-900 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all">
                      <span className="text-lg sm:text-xl">💻</span> GitHub
                    </a>
                  )}
                  {profileData.website_url && (
                    <a href={profileData.website_url.startsWith('http') ? profileData.website_url : `https://${profileData.website_url}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 px-4 py-3 bg-white border-2 sm:border-3 border-gray-900 rounded-xl font-black uppercase text-[10px] sm:text-xs text-gray-900 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all">
                      <span className="text-lg sm:text-xl">🌍</span> Sito Web
                    </a>
                  )}
                  {profileData.twitter_url && (
                    <a href={profileData.twitter_url.startsWith('http') ? profileData.twitter_url : `https://${profileData.twitter_url}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 px-4 py-3 bg-white border-2 sm:border-3 border-gray-900 rounded-xl font-black uppercase text-[10px] sm:text-xs text-gray-900 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all">
                      <span className="text-lg sm:text-xl">🐦</span> Twitter / X
                    </a>
                  )}
                  {!profileData.linkedin_url && !profileData.github_url && !profileData.website_url && !profileData.twitter_url && (
                    <span className="text-gray-500 font-bold italic text-sm text-center py-2">Nessun link disponibile</span>
                  )}
                </div>
              </div>

              {/* CV Section */}
              <div className="bg-red-50 border-[3px] sm:border-4 border-gray-900 rounded-xl sm:rounded-2xl p-4 sm:p-6 relative mt-4 md:mt-0">
                <span className="absolute -top-3.5 sm:-top-5 left-4 sm:left-6 bg-white border-2 sm:border-4 border-gray-900 px-3 py-0.5 sm:px-4 sm:py-1 rounded-lg sm:rounded-xl font-black uppercase tracking-widest text-gray-900 text-[10px] sm:text-sm shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                  Curriculum 📄
                </span>
                <div className="mt-2 text-center">
                  {profileData.cv_url ? (
                    <a
                      href={profileData.cv_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex flex-col items-center justify-center gap-2 group w-full py-4 bg-white border-2 sm:border-3 border-gray-900 rounded-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all"
                    >
                      <span className="text-3xl sm:text-4xl group-hover:scale-110 transition-transform">📋</span>
                      <span className="font-black uppercase tracking-widest text-gray-900 text-xs sm:text-sm">Apri PDF</span>
                    </a>
                  ) : (
                    <span className="text-gray-500 font-bold italic text-sm block py-4">Nessun CV caricato</span>
                  )}
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>
    </div>
  )
}