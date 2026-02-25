'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

import { useUser } from '@/app/context/UserContext'

export default function ProfilePage() {
  const router = useRouter()
  const supabase = createClient()

  const { user: globalUser, refreshUser } = useUser()

  // --- MODALITÀ VIEW/EDIT ---
  const [isEditing, setIsEditing] = useState(false)

  // --- STATI DEL PROFILO ---
  const [nome, setNome] = useState('')
  const [cognome, setCognome] = useState('')
  const [bio, setBio] = useState('')
  
  // --- SOCIAL LINKS ---
  const [linkedinUrl, setLinkedinUrl] = useState('')
  const [githubUrl, setGithubUrl] = useState('')
  const [websiteUrl, setWebsiteUrl] = useState('')
  const [twitterUrl, setTwitterUrl] = useState('')

  // --- CORSO DI STUDI ---
  const [corsiDisponibili, setCorsiDisponibili] = useState<{id: string, nome: string, tipo: string}[]>([])
  const [corsoSelezionato, setCorsoSelezionato] = useState<string | null>(null)
  const [annoInizio, setAnnoInizio] = useState<number>(new Date().getFullYear())
  const [studenteCorsoId, setStudenteCorsoId] = useState<string | null>(null)
  
  // --- STATI FILE ---
  const [avatarUrl, setAvatarUrl] = useState('')
  const [bannerUrl, setBannerUrl] = useState('')
  const [cvUrl, setCvUrl] = useState('')

  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [bannerFile, setBannerFile] = useState<File | null>(null)
  const [cvFile, setCvFile] = useState<File | null>(null)

  // --- STATI TAG ---
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [availableInterests, setAvailableInterests] = useState<{id: string, nome: string}[]>([])

  // --- STATI UI ---
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const [cvPreviewUrl, setCvPreviewUrl] = useState<string | null>(null)

  useEffect(() => {
    if (cvFile) {
      const objectUrl = URL.createObjectURL(cvFile)
      setCvPreviewUrl(objectUrl)
      return () => URL.revokeObjectURL(objectUrl)
    } else if (cvUrl) {
      setCvPreviewUrl(cvUrl)
    } else {
      setCvPreviewUrl(null)
    }
  }, [cvFile, cvUrl])

  // CARICAMENTO DATI
  useEffect(() => {
    const fetchProfileData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          router.push('/login')
          return
        }

        const { data: studente, error: fetchError }: any = await supabase
          .from('studente')
          .select('*')
          .eq('id', user.id)
          .maybeSingle()

        if (studente) {
          setNome(studente.nome || '')
          setCognome(studente.cognome || '')
          setBio(studente.bio || '')
          setAvatarUrl(studente.avatar_url || '')
          setBannerUrl(studente.banner_url || '')
          setCvUrl(studente.cv_url || '')
          setLinkedinUrl(studente.linkedin_url || '')
          setGithubUrl(studente.github_url || '')
          setWebsiteUrl(studente.website_url || '')
          setTwitterUrl(studente.twitter_url || '')
        }

        const { data: tags } = await supabase
          .from('interesse')
          .select('id, nome')
          .order('nome', { ascending: true })
        
        if (tags) setAvailableInterests(tags)

        const { data: corsi } = await supabase
          .from('corso_di_studi')
          .select('id, nome, tipo')
          .order('nome', { ascending: true })
        
        if (corsi) setCorsiDisponibili(corsi)

        const { data: corsoAttuale } = await supabase
          .from('studente_corso')
          .select('id, corso_id, anno_inizio')
          .eq('studente_id', user.id)
          .eq('completato', false)
          .order('anno_inizio', { ascending: false })
          .limit(1)
          .maybeSingle()

        if (corsoAttuale) {
          setStudenteCorsoId(corsoAttuale.id)
          setCorsoSelezionato(corsoAttuale.corso_id)
          setAnnoInizio(corsoAttuale.anno_inizio)
        }

        const { data: myTags } = await supabase
          .from('studente_interesse')
          .select('interesse_id')
          .eq('studente_id', user.id)

        if (myTags) {
          setSelectedTags(myTags.map((t: any) => t.interesse_id))
        }

      } catch (err: any) {
        console.error("Errore caricamento:", err)
        setError("Impossibile caricare i dati.")
      } finally {
        setLoading(false)
      }
    }

    fetchProfileData()
  }, [supabase, router])

  const uploadFile = async (file: File, bucket: string) => {
    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
      
      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(fileName, file, { cacheControl: '3600', upsert: true })

      if (uploadError) throw new Error(`Errore caricamento nel bucket ${bucket}.`)
      
      const { data } = supabase.storage.from(bucket).getPublicUrl(fileName)
      return data.publicUrl
    } catch (err) {
      throw err
    }
  }

  const handleTagToggle = (tagId: string) => {
    if (!isEditing) return
    setSelectedTags(prev => 
      prev.includes(tagId) ? prev.filter(id => id !== tagId) : [...prev, tagId]
    )
  }

  const handleRemoveCv = () => {
    setCvFile(null)
    setCvUrl('')
  }

  const handleCancelEdit = () => {
    setIsEditing(false)
    setAvatarFile(null)
    setBannerFile(null)
    setCvFile(null)
    setError(null)
    window.location.reload()
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    setSuccess(false)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("Utente non autenticato")

      let finalAvatarUrl = avatarUrl
      let finalBannerUrl = bannerUrl
      let finalCvUrl = cvUrl

      if (avatarFile) finalAvatarUrl = await uploadFile(avatarFile, 'avatars')
      if (bannerFile) finalBannerUrl = await uploadFile(bannerFile, 'banners')
      if (cvFile) finalCvUrl = await uploadFile(cvFile, 'documents')

      const { error: updateError } = await supabase
        .from('studente')
        .update({
          nome, cognome, bio,
          avatar_url: finalAvatarUrl,
          banner_url: finalBannerUrl,
          cv_url: finalCvUrl,
          linkedin_url: linkedinUrl,
          github_url: githubUrl,
          website_url: websiteUrl,
          twitter_url: twitterUrl,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id)

      if (updateError) throw updateError

      if (corsoSelezionato) {
        if (studenteCorsoId) {
          const { error: corsoError } = await supabase
            .from('studente_corso')
            .update({ corso_id: corsoSelezionato, anno_inizio: annoInizio })
            .eq('id', studenteCorsoId)
          if (corsoError) throw corsoError
        } else {
          const { data: newCorso, error: corsoError } = await supabase
            .from('studente_corso')
            .insert({ studente_id: user.id, corso_id: corsoSelezionato, anno_inizio: annoInizio, completato: false })
            .select('id').single()
          if (corsoError) throw corsoError
          if (newCorso) setStudenteCorsoId(newCorso.id)
        }
      }

      const { error: deleteError } = await supabase.from('studente_interesse').delete().eq('studente_id', user.id)
      if (deleteError) throw deleteError

      if (selectedTags.length > 0) {
        const tagInserts = selectedTags.map(tagId => ({ studente_id: user.id, interesse_id: tagId }))
        const { error: insertError } = await supabase.from('studente_interesse').insert(tagInserts)
        if (insertError) throw insertError
      }

      await refreshUser()
      
      setAvatarUrl(finalAvatarUrl)
      setBannerUrl(finalBannerUrl)
      setCvUrl(finalCvUrl)
      setAvatarFile(null)
      setBannerFile(null)
      setCvFile(null)
      
      setSuccess(true)
      setIsEditing(false)
      setTimeout(() => setSuccess(false), 3000)

    } catch (err: any) {
      console.error("Errore salvataggio:", err)
      setError(err.message || "Errore durante il salvataggio.")
    } finally {
      setSaving(false)
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

  return (
    <div className="max-w-5xl mx-auto pb-20 px-4">
      
      {/* HEADER & CONTROLLI */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-8">
        <button 
          onClick={() => router.push('/dashboard')}
          className="px-5 py-3 bg-white border-4 border-gray-900 rounded-xl font-black text-gray-900 uppercase tracking-widest shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[4px] hover:translate-y-[4px] hover:shadow-none transition-all flex items-center gap-2"
        >
          <span className="text-xl">🔙</span> Dashboard
        </button>

        {!isEditing ? (
          <button 
            onClick={() => setIsEditing(true)}
            className="px-5 py-3 bg-yellow-300 border-4 border-gray-900 rounded-xl font-black text-gray-900 uppercase tracking-widest shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[4px] hover:translate-y-[4px] hover:shadow-none transition-all flex items-center gap-2"
          >
            <span className="text-xl">✏️</span> Modifica Profilo
          </button>
        ) : (
          <button 
            onClick={handleCancelEdit}
            className="px-5 py-3 bg-gray-200 border-4 border-gray-900 rounded-xl font-black text-gray-900 uppercase tracking-widest shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[4px] hover:translate-y-[4px] hover:shadow-none transition-all flex items-center gap-2"
          >
            <span className="text-xl">❌</span> Annulla
          </button>
        )}
      </div>

      {/* ALERT MESSAGGI */}
      {error && (
        <div className="mb-8 p-4 bg-red-400 border-4 border-gray-900 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] rounded-2xl font-black text-gray-900 text-lg uppercase flex items-center gap-3 animate-in shake">
          <span>⚠️</span> {error}
        </div>
      )}
      {success && (
        <div className="mb-8 p-4 bg-green-400 border-4 border-gray-900 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] rounded-2xl font-black text-gray-900 text-lg uppercase flex items-center gap-3">
          <span>🎉</span> Profilo aggiornato con successo!
        </div>
      )}

      <form onSubmit={handleSave}>
        <div className="bg-white rounded-[2rem] border-4 border-gray-900 shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] overflow-hidden relative">
          
          {/* BANNER CARTOON */}
          <div className="h-48 sm:h-64 bg-gray-200 border-b-4 border-gray-900 relative group overflow-hidden pattern-dots">
            {(bannerFile || bannerUrl) ? (
              <img 
                src={bannerFile ? URL.createObjectURL(bannerFile) : bannerUrl} 
                className="w-full h-full object-cover" 
                alt="Banner" 
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-blue-400">
                <span className="text-6xl opacity-50">🖼️</span>
              </div>
            )}
            
            {isEditing && (
              <label className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                <span className="bg-white text-gray-900 px-6 py-3 border-4 border-gray-900 rounded-xl font-black uppercase tracking-widest shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all flex items-center gap-2">
                  <span className="text-xl">📸</span> Cambia Copertina
                </span>
                <input type="file" className="hidden" accept="image/*" onChange={(e) => setBannerFile(e.target.files?.[0] || null)} />
              </label>
            )}
          </div>

          <div className="px-6 sm:px-12 pb-12">
            
            {/* AVATAR & NOME */}
            <div className="flex flex-col sm:flex-row gap-6 -mt-16 sm:-mt-20 mb-10 relative z-10">
              <div className="relative flex-shrink-0 mx-auto sm:mx-0">
                <div className="w-32 h-32 sm:w-40 sm:h-40 rounded-full border-4 border-gray-900 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] overflow-hidden bg-white">
                  {(avatarFile || avatarUrl) ? (
                    <img 
                      src={avatarFile ? URL.createObjectURL(avatarFile) : avatarUrl} 
                      className="w-full h-full object-cover"
                      alt="Avatar"
                    />
                  ) : (
                    <div className="w-full h-full bg-red-400 flex items-center justify-center">
                      <span className="text-5xl font-black text-gray-900 uppercase">
                        {nome.charAt(0)}{cognome.charAt(0)}
                      </span>
                    </div>
                  )}
                </div>
                
                {globalUser?.is_system_admin && (
                  <div className="absolute bottom-0 right-0 bg-yellow-300 border-4 border-gray-900 text-gray-900 px-3 py-1 rounded-xl text-xs font-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] uppercase -rotate-6">
                    ⚡ Staff
                  </div>
                )}

                {isEditing && (
                  <label className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 hover:opacity-100 transition-opacity cursor-pointer rounded-full">
                    <span className="text-white font-black uppercase text-sm">Cambia 📸</span>
                    <input type="file" className="hidden" accept="image/*" onChange={(e) => setAvatarFile(e.target.files?.[0] || null)} />
                  </label>
                )}
              </div>

              <div className="flex-1 pt-4 sm:pt-24 text-center sm:text-left">
                {isEditing ? (
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-black uppercase tracking-widest text-gray-600 mb-2">Nome</label>
                      <input 
                        type="text" 
                        value={nome} 
                        onChange={(e) => setNome(e.target.value)} 
                        required 
                        className="w-full px-4 py-3 bg-white rounded-xl border-4 border-gray-900 focus:outline-none focus:translate-x-[4px] focus:translate-y-[4px] focus:shadow-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] font-black text-gray-900 transition-all text-lg uppercase" 
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-black uppercase tracking-widest text-gray-600 mb-2">Cognome</label>
                      <input 
                        type="text" 
                        value={cognome} 
                        onChange={(e) => setCognome(e.target.value)} 
                        required
                        className="w-full px-4 py-3 bg-white rounded-xl border-4 border-gray-900 focus:outline-none focus:translate-x-[4px] focus:translate-y-[4px] focus:shadow-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] font-black text-gray-900 transition-all text-lg uppercase" 
                      />
                    </div>
                  </div>
                ) : (
                  <>
                    <h1 className="text-4xl sm:text-5xl font-black text-gray-900 uppercase italic tracking-tighter leading-none mb-2">
                      {nome} <span className="text-red-600">{cognome}</span>
                    </h1>
                    {globalUser?.corso_studi && (
                      <div className="inline-block bg-white border-2 border-gray-900 px-3 py-1.5 rounded-lg shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] mt-2">
                        <p className="text-gray-900 font-bold text-sm uppercase tracking-widest">
                          🎓 {globalUser.corso_studi} • Anno {globalUser.anno_corso}
                        </p>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* SEZIONE BIO */}
            <div className="mb-10 bg-blue-50 border-4 border-gray-900 rounded-2xl p-6 relative">
              <span className="absolute -top-5 left-6 bg-white border-4 border-gray-900 px-4 py-1 rounded-xl font-black uppercase tracking-widest text-gray-900 text-sm shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                Chi Sono 💭
              </span>
              {isEditing ? (
                <textarea 
                  rows={4} 
                  value={bio} 
                  onChange={(e) => setBio(e.target.value)}
                  className="w-full px-4 py-4 mt-2 bg-white rounded-xl border-4 border-gray-900 focus:outline-none focus:translate-x-[4px] focus:translate-y-[4px] focus:shadow-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] font-bold text-gray-900 transition-all resize-none text-base"
                  placeholder="Scrivi qualcosa di figo su di te..." 
                />
              ) : (
                <p className="text-gray-900 font-bold text-lg leading-relaxed mt-2">
                  {bio || <span className="text-gray-500 italic font-medium">Nessuna biografia inserita. È un tipo misterioso.</span>}
                </p>
              )}
            </div>

            {/* CORSO DI STUDI */}
            <div className="mb-10 bg-yellow-50 border-4 border-gray-900 rounded-2xl p-6 relative">
              <span className="absolute -top-5 left-6 bg-white border-4 border-gray-900 px-4 py-1 rounded-xl font-black uppercase tracking-widest text-gray-900 text-sm shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                Studi 📚
              </span>
              
              {isEditing ? (
                <div className="grid sm:grid-cols-2 gap-6 mt-2">
                  <div>
                    <label className="block text-xs font-black uppercase tracking-widest text-gray-600 mb-2">Corso</label>
                    <select
                      value={corsoSelezionato || ''}
                      onChange={(e) => setCorsoSelezionato(e.target.value || null)}
                      className="w-full px-4 py-3 bg-white rounded-xl border-4 border-gray-900 focus:outline-none focus:translate-x-[4px] focus:translate-y-[4px] focus:shadow-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] font-bold text-gray-900 transition-all cursor-pointer"
                    >
                      <option value="">Seleziona un corso...</option>
                      {corsiDisponibili.map(corso => (
                        <option key={corso.id} value={corso.id}>{corso.nome} ({corso.tipo})</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-black uppercase tracking-widest text-gray-600 mb-2">Anno di Iscrizione</label>
                    <select
                      value={annoInizio}
                      onChange={(e) => setAnnoInizio(parseInt(e.target.value))}
                      className="w-full px-4 py-3 bg-white rounded-xl border-4 border-gray-900 focus:outline-none focus:translate-x-[4px] focus:translate-y-[4px] focus:shadow-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] font-bold text-gray-900 transition-all cursor-pointer"
                    >
                      {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - i).map(year => (
                        <option key={year} value={year}>{year}</option>
                      ))}
                    </select>
                    <p className="text-xs font-black text-gray-500 uppercase mt-3">
                      Sei al <strong className="text-red-600 text-base">{new Date().getFullYear() - annoInizio}°</strong> anno
                    </p>
                  </div>
                </div>
              ) : (
                <div className="mt-2 flex items-center gap-4">
                  {corsoSelezionato ? (
                    <>
                      <div className="w-16 h-16 rounded-xl bg-white border-4 border-gray-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center -rotate-6">
                        <span className="text-3xl">🎓</span>
                      </div>
                      <div>
                        <p className="font-black text-gray-900 text-xl uppercase tracking-tighter">
                          {corsiDisponibili.find(c => c.id === corsoSelezionato)?.nome || globalUser?.corso_studi}
                        </p>
                        <p className="text-sm font-bold text-gray-600 uppercase tracking-widest mt-1">
                          {new Date().getFullYear() - annoInizio}° Anno (Iscritto nel {annoInizio})
                        </p>
                      </div>
                    </>
                  ) : (
                    <span className="text-gray-500 font-bold italic">Nessun corso selezionato</span>
                  )}
                </div>
              )}
            </div>

            {/* LINKS & SOCIAL */}
            <div className="mb-10 bg-green-50 border-4 border-gray-900 rounded-2xl p-6 relative">
              <span className="absolute -top-5 left-6 bg-white border-4 border-gray-900 px-4 py-1 rounded-xl font-black uppercase tracking-widest text-gray-900 text-sm shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                Collegamenti 🔗
              </span>
              
              {isEditing ? (
                <div className="grid sm:grid-cols-2 gap-6 mt-2">
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl">💼</span>
                    <input 
                      type="url" value={linkedinUrl} onChange={(e) => setLinkedinUrl(e.target.value)} placeholder="LinkedIn URL"
                      className="w-full pl-12 pr-4 py-3 bg-white rounded-xl border-4 border-gray-900 focus:outline-none focus:translate-x-[4px] focus:translate-y-[4px] focus:shadow-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] font-bold text-gray-900 transition-all" 
                    />
                  </div>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl">💻</span>
                    <input 
                      type="url" value={githubUrl} onChange={(e) => setGithubUrl(e.target.value)} placeholder="GitHub URL"
                      className="w-full pl-12 pr-4 py-3 bg-white rounded-xl border-4 border-gray-900 focus:outline-none focus:translate-x-[4px] focus:translate-y-[4px] focus:shadow-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] font-bold text-gray-900 transition-all" 
                    />
                  </div>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl">🌐</span>
                    <input 
                      type="url" value={websiteUrl} onChange={(e) => setWebsiteUrl(e.target.value)} placeholder="Sito Web URL"
                      className="w-full pl-12 pr-4 py-3 bg-white rounded-xl border-4 border-gray-900 focus:outline-none focus:translate-x-[4px] focus:translate-y-[4px] focus:shadow-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] font-bold text-gray-900 transition-all" 
                    />
                  </div>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl">🐦</span>
                    <input 
                      type="url" value={twitterUrl} onChange={(e) => setTwitterUrl(e.target.value)} placeholder="Twitter/X URL"
                      className="w-full pl-12 pr-4 py-3 bg-white rounded-xl border-4 border-gray-900 focus:outline-none focus:translate-x-[4px] focus:translate-y-[4px] focus:shadow-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] font-bold text-gray-900 transition-all" 
                    />
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap gap-4 mt-2">
                  {linkedinUrl && (
                    <a href={linkedinUrl.startsWith('http') ? linkedinUrl : `https://${linkedinUrl}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-6 py-3 bg-white border-4 border-gray-900 rounded-xl font-black uppercase text-gray-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[4px] hover:translate-y-[4px] hover:shadow-none transition-all">
                      <span className="text-xl">💼</span> LinkedIn
                    </a>
                  )}
                  {githubUrl && (
                    <a href={githubUrl.startsWith('http') ? githubUrl : `https://${githubUrl}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-6 py-3 bg-white border-4 border-gray-900 rounded-xl font-black uppercase text-gray-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[4px] hover:translate-y-[4px] hover:shadow-none transition-all">
                      <span className="text-xl">💻</span> GitHub
                    </a>
                  )}
                  {websiteUrl && (
                    <a href={websiteUrl.startsWith('http') ? websiteUrl : `https://${websiteUrl}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-6 py-3 bg-white border-4 border-gray-900 rounded-xl font-black uppercase text-gray-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[4px] hover:translate-y-[4px] hover:shadow-none transition-all">
                      <span className="text-xl">🌐</span> Web
                    </a>
                  )}
                  {twitterUrl && (
                    <a href={twitterUrl.startsWith('http') ? twitterUrl : `https://${twitterUrl}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-6 py-3 bg-white border-4 border-gray-900 rounded-xl font-black uppercase text-gray-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[4px] hover:translate-y-[4px] hover:shadow-none transition-all">
                      <span className="text-xl">🐦</span> Twitter
                    </a>
                  )}
                  {!linkedinUrl && !githubUrl && !websiteUrl && !twitterUrl && (
                    <span className="text-gray-500 font-bold italic">Nessun collegamento inserito.</span>
                  )}
                </div>
              )}
            </div>

            <div className="grid md:grid-cols-2 gap-10">
              
              {/* CURRICULUM */}
              <div className="bg-red-50 border-4 border-gray-900 rounded-2xl p-6 relative">
                <span className="absolute -top-5 left-6 bg-white border-4 border-gray-900 px-4 py-1 rounded-xl font-black uppercase tracking-widest text-gray-900 text-sm shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                  Curriculum 📄
                </span>
                <div className="mt-4">
                  {isEditing ? (
                    <div className="flex flex-col gap-4">
                      <label className="w-full bg-white p-6 rounded-xl border-4 border-dashed border-gray-900 cursor-pointer hover:bg-gray-50 transition-colors flex flex-col items-center justify-center text-center">
                        <span className="text-4xl mb-2">📥</span>
                        <span className="font-black uppercase tracking-widest text-gray-900">
                          {cvFile ? cvFile.name : (cvUrl ? 'Sostituisci CV' : 'Carica PDF')}
                        </span>
                        <input type="file" className="hidden" accept=".pdf" onChange={(e) => setCvFile(e.target.files?.[0] || null)} />
                      </label>
                      {(cvFile || cvUrl) && (
                        <button type="button" onClick={handleRemoveCv} className="px-4 py-3 bg-gray-900 text-white rounded-xl font-black uppercase tracking-widest shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[4px] hover:translate-y-[4px] hover:shadow-none transition-all">
                          🗑️ Rimuovi CV
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center justify-center p-4">
                      {cvPreviewUrl ? (
                        <a href={cvPreviewUrl} target="_blank" rel="noopener noreferrer" className="flex flex-col items-center gap-2 group">
                          <div className="w-20 h-20 bg-white border-4 border-gray-900 rounded-2xl flex items-center justify-center shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] group-hover:translate-x-[4px] group-hover:translate-y-[4px] group-hover:shadow-none transition-all">
                            <span className="text-4xl">📋</span>
                          </div>
                          <span className="font-black uppercase tracking-widest text-gray-900 mt-2">Apri CV</span>
                        </a>
                      ) : (
                        <span className="text-gray-500 font-bold italic">Nessun CV caricato</span>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* COMPETENZE / TAGS */}
              <div className="bg-purple-50 border-4 border-gray-900 rounded-2xl p-6 relative">
                <span className="absolute -top-5 left-6 bg-white border-4 border-gray-900 px-4 py-1 rounded-xl font-black uppercase tracking-widest text-gray-900 text-sm shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                  Skill & Passioni ⭐
                </span>
                <div className="mt-4 flex flex-wrap gap-3">
                  {availableInterests.map(tag => {
                    const isSelected = selectedTags.includes(tag.id)
                    return (
                      <button
                        key={tag.id}
                        type="button"
                        onClick={() => handleTagToggle(tag.id)}
                        disabled={!isEditing}
                        className={`px-4 py-2 rounded-xl font-black uppercase tracking-widest text-sm transition-all border-4 border-gray-900 ${
                          isSelected 
                            ? 'bg-purple-400 text-gray-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] -translate-y-1 rotate-2' 
                            : isEditing
                              ? 'bg-white text-gray-600 hover:bg-gray-100 hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'
                              : 'hidden'
                        }`}
                      >
                        {tag.nome}
                      </button>
                    )
                  })}
                  {selectedTags.length === 0 && !isEditing && (
                    <span className="text-gray-500 font-bold italic">Nessuna competenza selezionata</span>
                  )}
                </div>
              </div>
            </div>

            {/* PULSANTONE SALVA */}
            {isEditing && (
              <div className="mt-12">
                <button 
                  type="submit" 
                  disabled={saving}
                  className="w-full py-5 bg-red-600 rounded-2xl font-black text-white text-2xl uppercase tracking-widest border-4 border-gray-900 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[6px] hover:translate-y-[6px] hover:shadow-none transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
                >
                  {saving ? 'Salvataggio... ⏳' : 'Salva Modifiche 💥'}
                </button>
              </div>
            )}
          </div>
        </div>
      </form>
    </div>
  )
}