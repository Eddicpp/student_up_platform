'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useParams, useRouter } from 'next/navigation'
import PrivateChatModal from '@/app/dashboard/projects/[id]/PrivateChatModal'

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
  
  // Stati UI
  const [emailCopied, setEmailCopied] = useState(false)
  const [showChat, setShowChat] = useState(false)

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!targetUserId) return

      try {
        // Utente attuale (per la chat e permessi)
        const { data: { user } } = await supabase.auth.getUser()
        if (user) setCurrentUser(user)

        // 1. Fetch dati base studente visitato
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

  if (loading) return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="text-center">
        <div className="text-6xl animate-bounce mb-4">🚀</div>
        <p className="text-gray-900 font-black uppercase tracking-widest text-xl">Caricamento Profilo...</p>
      </div>
    </div>
  )

  if (error || !profileData) return (
    <div className="text-center pt-20 px-4">
      <div className="text-6xl mb-6 -rotate-6">🤷‍♂️</div>
      <h1 className="text-4xl font-black text-gray-900 uppercase tracking-tighter mb-6">⚠️ {error}</h1>
      <button 
        onClick={() => router.back()} 
        className="px-6 py-3 bg-white border-4 border-gray-900 rounded-xl font-black uppercase tracking-widest shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all"
      >
        ← Torna indietro
      </button>
    </div>
  )

  return (
    <div className="max-w-5xl mx-auto pb-20 px-4 mt-6">
      
      {/* Header con navigazione */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-8">
        <button 
          onClick={() => router.back()} 
          className="px-5 py-3 bg-white border-4 border-gray-900 rounded-xl font-black text-gray-900 uppercase tracking-widest shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[4px] hover:translate-y-[4px] hover:shadow-none transition-all flex items-center gap-2"
        >
          <span className="text-xl">🔙</span> Indietro
        </button>
      </div>

      <div className="bg-white rounded-[2rem] border-4 border-gray-900 shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] overflow-hidden relative">
        
        {/* BANNER CARTOON */}
        <div className="h-48 sm:h-72 bg-gray-200 border-b-4 border-gray-900 relative overflow-hidden pattern-dots group">
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
            <div className="w-full h-full flex items-center justify-center bg-blue-400">
              <span className="text-6xl opacity-50">🖼️</span>
            </div>
          )}
        </div>

        <div className="px-6 sm:px-12 pb-12">
          
          {/* AVATAR & NOME */}
          <div className="flex flex-col sm:flex-row gap-6 -mt-16 sm:-mt-20 mb-10 relative z-10">
            <div className="relative flex-shrink-0 mx-auto sm:mx-0">
              <div className="w-32 h-32 sm:w-40 sm:h-40 rounded-full border-4 border-gray-900 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] overflow-hidden bg-white">
                {profileData.avatar_url ? (
                  <img src={profileData.avatar_url} className="w-full h-full object-cover" alt="Avatar"/>
                ) : (
                  <div className="w-full h-full bg-red-400 flex items-center justify-center">
                    <span className="text-5xl font-black text-gray-900 uppercase">{profileData.nome?.charAt(0)}{profileData.cognome?.charAt(0)}</span>
                  </div>
                )}
              </div>
              
              {/* Badge Staff sovrapposto all'icona */}
              {profileData.is_system_admin && (
                <div className="absolute bottom-0 right-0 z-20 bg-yellow-300 border-4 border-gray-900 text-gray-900 px-3 py-1 rounded-xl text-xs font-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] uppercase -rotate-6">
                  ⚡ Staff
                </div>
              )}
            </div>

            <div className="flex-1 pt-4 sm:pt-24 text-center sm:text-left">
              <h1 className="text-4xl sm:text-5xl font-black text-gray-900 uppercase italic tracking-tighter leading-none mb-2">
                {profileData.nome} <span className="text-red-600">{profileData.cognome}</span>
              </h1>
              {profileData.corso_studi && (
                <div className="inline-block bg-white border-2 border-gray-900 px-3 py-1.5 rounded-lg shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] mt-2">
                  <p className="text-gray-900 font-bold text-sm uppercase tracking-widest">
                    🎓 {profileData.corso_studi} • Anno {profileData.anno_corso}
                  </p>
                </div>
              )}

              {/* Pulsanti Contatta e Mail */}
              <div className="flex flex-wrap justify-center sm:justify-start gap-4 mt-6">
                {currentUser?.id !== profileData.id && (
                  <button 
                    onClick={() => setShowChat(true)}
                    className="px-5 py-3 bg-yellow-300 border-4 border-gray-900 rounded-xl font-black text-gray-900 uppercase tracking-widest shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[4px] hover:translate-y-[4px] hover:shadow-none transition-all flex items-center gap-2"
                  >
                    <span className="text-xl">💬</span> Contatta
                  </button>
                )}
                <button 
                  onClick={handleCopyEmail}
                  className="px-5 py-3 bg-white border-4 border-gray-900 rounded-xl font-black text-gray-900 uppercase tracking-widest shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[4px] hover:translate-y-[4px] hover:shadow-none transition-all flex items-center gap-2"
                >
                  <span className="text-xl">{emailCopied ? '✅' : '📧'}</span> {emailCopied ? 'Copiata!' : 'Copia Email'}
                </button>
              </div>
            </div>
          </div>

          {/* SEZIONE BIO */}
          <div className="mb-10 bg-blue-50 border-4 border-gray-900 rounded-2xl p-6 relative">
            <span className="absolute -top-5 left-6 bg-white border-4 border-gray-900 px-4 py-1 rounded-xl font-black uppercase tracking-widest text-gray-900 text-sm shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">Chi Sono 💭</span>
            <p className="text-gray-900 font-bold text-lg leading-relaxed mt-2">
              {profileData.bio || <span className="text-gray-500 italic font-medium">Nessuna biografia inserita. È un tipo misterioso.</span>}
            </p>
          </div>

          {/* CORSO E SOCIAL */}
          <div className="grid md:grid-cols-2 gap-10 mb-10">
            
            {/* COMPETENZE / TAGS */}
            <div className="bg-purple-50 border-4 border-gray-900 rounded-2xl p-6 relative">
              <span className="absolute -top-5 left-6 bg-white border-4 border-gray-900 px-4 py-1 rounded-xl font-black uppercase tracking-widest text-gray-900 text-sm shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">Skill & Passioni ⭐</span>
              <div className="mt-4 flex flex-wrap gap-3">
                {tags.length > 0 ? (
                  tags.map(tag => (
                    <span key={tag} className="px-4 py-2 bg-white text-gray-900 border-4 border-gray-900 rounded-xl font-black uppercase tracking-widest text-sm shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 transition-transform">
                      {tag}
                    </span>
                  ))
                ) : (
                  <span className="text-gray-500 font-bold italic">Nessuna competenza inserita</span>
                )}
              </div>
            </div>

            {/* COLLEGAMENTI SOCIAL */}
            <div className="bg-green-50 border-4 border-gray-900 rounded-2xl p-6 relative">
              <span className="absolute -top-5 left-6 bg-white border-4 border-gray-900 px-4 py-1 rounded-xl font-black uppercase tracking-widest text-gray-900 text-sm shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">Collegamenti 🔗</span>
              <div className="flex flex-wrap gap-4 mt-2">
                {profileData.linkedin_url && <a href={profileData.linkedin_url.startsWith('http') ? profileData.linkedin_url : `https://${profileData.linkedin_url}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-6 py-3 bg-white border-4 border-gray-900 rounded-xl font-black uppercase text-gray-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[4px] hover:translate-y-[4px] hover:shadow-none transition-all"><span className="text-xl">💼</span> LinkedIn</a>}
                {profileData.github_url && <a href={profileData.github_url.startsWith('http') ? profileData.github_url : `https://${profileData.github_url}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-6 py-3 bg-white border-4 border-gray-900 rounded-xl font-black uppercase text-gray-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[4px] hover:translate-y-[4px] hover:shadow-none transition-all"><span className="text-xl">💻</span> GitHub</a>}
                {profileData.website_url && <a href={profileData.website_url.startsWith('http') ? profileData.website_url : `https://${profileData.website_url}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-6 py-3 bg-white border-4 border-gray-900 rounded-xl font-black uppercase text-gray-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[4px] hover:translate-y-[4px] hover:shadow-none transition-all"><span className="text-xl">🌐</span> Web</a>}
                {profileData.twitter_url && <a href={profileData.twitter_url.startsWith('http') ? profileData.twitter_url : `https://${profileData.twitter_url}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-6 py-3 bg-white border-4 border-gray-900 rounded-xl font-black uppercase text-gray-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[4px] hover:translate-y-[4px] hover:shadow-none transition-all"><span className="text-xl">🐦</span> Twitter</a>}
                {!profileData.linkedin_url && !profileData.github_url && !profileData.website_url && !profileData.twitter_url && <span className="text-gray-500 font-bold italic mt-2">Nessun collegamento inserito.</span>}
              </div>
            </div>

          </div>

          <div className="grid md:grid-cols-2 gap-10">
            {/* CURRICULUM */}
            <div className="bg-red-50 border-4 border-gray-900 rounded-2xl p-6 relative">
              <span className="absolute -top-5 left-6 bg-white border-4 border-gray-900 px-4 py-1 rounded-xl font-black uppercase tracking-widest text-gray-900 text-sm shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">Curriculum 📄</span>
              <div className="flex items-center justify-center p-4">
                {profileData.cv_url ? (
                  <a href={profileData.cv_url} target="_blank" rel="noopener noreferrer" className="flex flex-col items-center gap-2 group">
                    <div className="w-20 h-20 bg-white border-4 border-gray-900 rounded-2xl flex items-center justify-center shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] group-hover:translate-x-[4px] group-hover:translate-y-[4px] group-hover:shadow-none transition-all">
                      <span className="text-4xl">📋</span>
                    </div>
                    <span className="font-black uppercase tracking-widest text-gray-900 mt-2">Apri CV</span>
                  </a>
                ) : (
                  <span className="text-gray-500 font-bold italic">Nessun CV caricato</span>
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
          otherUser={profileData}
          bandoId="profilo_diretto" 
          bandoTitolo="Messaggio Diretto"
        />
      )}

    </div>
  )
}