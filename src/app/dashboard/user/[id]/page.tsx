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
        <div className="w-12 h-12 border-4 border-gray-300 border-t-red-600 rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-gray-500 font-medium">Caricamento profilo...</p>
      </div>
    </div>
  )

  if (error || !profileData) return (
    <div className="text-center pt-20">
      <h1 className="text-4xl font-black text-gray-300">⚠️ {error}</h1>
      <button onClick={() => router.back()} className="mt-6 font-bold text-red-800 hover:underline uppercase text-sm">
        ← Torna indietro
      </button>
    </div>
  )

  return (
    <div className="max-w-5xl mx-auto pb-20 pt-10">
      
      {/* Header con navigazione */}
      <div className="flex items-center justify-between mb-6">
        <button 
          onClick={() => router.back()}
          className="flex items-center gap-2 text-gray-500 hover:text-gray-900 font-medium text-sm transition-colors group"
        >
          <svg className="w-4 h-4 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Indietro
        </button>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden">
        
        {/* Banner */}
        <div className="h-48 sm:h-56 bg-gradient-to-br from-gray-100 to-gray-200 relative">
          {profileData.banner_url ? (
            <img 
              src={profileData.banner_url} 
              className="w-full h-full object-cover" 
              alt="Banner" 
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center">
              <span className="text-white/10 font-black text-6xl italic">STUDENT<span className="text-red-600/20">UP</span></span>
            </div>
          )}
        </div>

        {/* Contenuto */}
        <div className="px-6 sm:px-10 pb-10">
          
          {/* Avatar e info base (LAYOUT ORIZZONTALE) */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end -mt-16 sm:-mt-12 mb-8 gap-4">
            
            <div className="flex items-end gap-6 z-10">
              {/* ✅ IL TUO SUPER AVATAR: Misura media, layout orizzontale */}
              <SuperAvatar 
                src={profileData.avatar_url}
                nome={profileData.nome}
                cognome={profileData.cognome}
                isStaff={profileData.is_system_admin}
                size="md"
              />
              
              <div className="pb-2">
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 leading-none">
                  {profileData.nome} {profileData.cognome}
                </h1>
                {profileData.corso_studi && (
                  <p className="text-gray-500 mt-2 text-sm font-medium">
                    {profileData.corso_studi} • {profileData.anno_corso}° Anno
                  </p>
                )}
              </div>
            </div>

            {/* Pulsanti Azione Rapida */}
            <div className="flex gap-3 mt-4 sm:mt-0 pt-2">
              <a 
                href={`mailto:${profileData.email}`}
                className="flex items-center gap-2 bg-gray-900 text-white px-5 py-2.5 rounded-xl font-medium text-sm hover:bg-gray-800 transition-colors shadow-md"
              >
                ✉️ Contatta
              </a>
            </div>

          </div>

          <div className="grid md:grid-cols-3 gap-8">
            
            {/* Colonna Sinistra (Bio & Tags) */}
            <div className="md:col-span-2 space-y-8">
              
              {/* Bio */}
              <div>
                <label className="block text-xs font-black tracking-widest uppercase text-gray-400 mb-3">Biografia</label>
                <p className="text-gray-600 leading-relaxed bg-gray-50 p-6 rounded-2xl border border-gray-100">
                  {profileData.bio || <span className="text-gray-400 italic">Nessuna biografia inserita.</span>}
                </p>
              </div>

              {/* Tags / Competenze */}
              <div>
                <label className="block text-xs font-black tracking-widest uppercase text-gray-400 mb-3">Competenze & Interessi</label>
                <div className="flex flex-wrap gap-2">
                  {tags.length > 0 ? (
                    tags.map((tag, i) => (
                      <span key={i} className="px-4 py-2 bg-red-50 text-red-700 border border-red-100 rounded-xl text-xs font-bold uppercase tracking-wider">
                        {tag}
                      </span>
                    ))
                  ) : (
                    <span className="text-gray-400 italic text-sm">Nessuna competenza inserita</span>
                  )}
                </div>
              </div>

            </div>

            {/* Colonna Destra (Social & CV) */}
            <div className="space-y-8">
              
              {/* Social Links */}
              <div>
                <label className="block text-xs font-black tracking-widest uppercase text-gray-400 mb-3">Contatti</label>
                <div className="flex flex-col gap-3">
                  {profileData.linkedin_url && (
                    <a href={profileData.linkedin_url.startsWith('http') ? profileData.linkedin_url : `https://${profileData.linkedin_url}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 hover:bg-gray-100 text-gray-700 font-medium text-sm transition-colors border border-gray-100">
                      <span className="text-[#0A66C2]">🔗</span> LinkedIn
                    </a>
                  )}
                  {profileData.github_url && (
                    <a href={profileData.github_url.startsWith('http') ? profileData.github_url : `https://${profileData.github_url}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 hover:bg-gray-100 text-gray-700 font-medium text-sm transition-colors border border-gray-100">
                      <span className="text-gray-900">💻</span> GitHub
                    </a>
                  )}
                  {profileData.website_url && (
                    <a href={profileData.website_url.startsWith('http') ? profileData.website_url : `https://${profileData.website_url}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 hover:bg-gray-100 text-gray-700 font-medium text-sm transition-colors border border-gray-100">
                      <span className="text-red-500">🌍</span> Sito Web
                    </a>
                  )}
                  {profileData.twitter_url && (
                    <a href={profileData.twitter_url.startsWith('http') ? profileData.twitter_url : `https://${profileData.twitter_url}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 hover:bg-gray-100 text-gray-700 font-medium text-sm transition-colors border border-gray-100">
                      <span className="text-black">✖️</span> Twitter / X
                    </a>
                  )}
                  {!profileData.linkedin_url && !profileData.github_url && !profileData.website_url && !profileData.twitter_url && (
                    <span className="text-gray-400 italic text-sm">Nessun link disponibile</span>
                  )}
                </div>
              </div>

              {/* CV Section */}
              <div>
                <label className="block text-xs font-black tracking-widest uppercase text-gray-400 mb-3">Curriculum</label>
                {profileData.cv_url ? (
                  <a
                    href={profileData.cv_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 w-full p-4 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 font-bold text-sm transition-colors border border-red-200"
                  >
                    📄 Apri PDF
                  </a>
                ) : (
                  <div className="p-4 rounded-xl bg-gray-50 border border-gray-100 text-center">
                    <span className="text-gray-400 italic text-sm">Nessun CV caricato</span>
                  </div>
                )}
              </div>

            </div>
          </div>
        </div>
      </div>
    </div>
  )
}