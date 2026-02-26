'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

import { useUser } from '@/app/context/UserContext'

interface Tag {
  id: string
  nome: string
  categoria?: string
}

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

  // --- STATI BANNER CONTROLS ---
  const [bannerScale, setBannerScale] = useState<number>(1)
  const [bannerPosY, setBannerPosY] = useState<number>(50)

  // --- STATI TAG ---
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [availableInterests, setAvailableInterests] = useState<Tag[]>([])
  const [customTagInput, setCustomTagInput] = useState('')

  // --- STATI PROGETTI VETRINA ---
  const [myPlatformProjects, setMyPlatformProjects] = useState<any[]>([])
  const [hiddenProjects, setHiddenProjects] = useState<string[]>([])

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

        const { data: studente }: any = await supabase
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
          
          if (studente.banner_settings) {
            setBannerScale(studente.banner_settings.scale || 1)
            setBannerPosY(studente.banner_settings.posY || 50)
          }
          setHiddenProjects(studente.progetti_nascosti || [])
        }

        const { data: creati } = await supabase
        .from('bando')
        .select('id, titolo, descrizione')
        // Usiamo il nome esatto della colonna dal tuo DB
        .eq('creatore_studente_id', user.id)

        const { data: partecipazioni, error: errPart } = await (supabase as any)
          .from('partecipazione')
          .select('bando_id, stato, ruolo')
          .eq('studente_id', user.id)

        const bandoIds = partecipazioni
          ?.filter((p: any) => 
            p.stato?.toLowerCase().includes('accettat') || 
            p.stato?.toLowerCase() === 'attivo'
          )
          .map((p: any) => p.bando_id) || []
        
        let partecipati: any[] = []
        if (bandoIds.length > 0) {
          const { data: res } = await supabase
            .from('bando')
            .select('id, titolo, descrizione')
            .in('id', bandoIds)
          if (res) partecipati = res
        }

        const allProjects = [...(creati || []), ...partecipati].filter((v,i,a)=>a.findIndex(v2=>(v2.id===v.id))===i)
        setMyPlatformProjects(allProjects)

        const { data: tags } = await supabase.from('interesse').select('*').order('nome', { ascending: true })
        if (tags) setAvailableInterests(tags)

        const { data: corsi } = await supabase
        .from('corso_di_studi')
        .select('id, nome') 
        .order('nome', { ascending: true })

        const { data: corsoAttuale } = await supabase.from('studente_corso').select('id, corso_id, anno_inizio').eq('studente_id', user.id).eq('completato', false).order('anno_inizio', { ascending: false }).limit(1).maybeSingle()

        if (corsoAttuale) {
          setStudenteCorsoId(corsoAttuale.id)
          setCorsoSelezionato(corsoAttuale.corso_id)
          setAnnoInizio(corsoAttuale.anno_inizio)
        }

        const { data: myTags } = await supabase.from('studente_interesse').select('interesse_id').eq('studente_id', user.id)
        if (myTags) setSelectedTags(myTags.map((t: any) => t.interesse_id))

      } catch (err: any) {
        console.error("Errore caricamento:", err)
        setError("Errore nel recupero dei dati.")
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

      if (uploadError) throw new Error(`Errore caricamento nel bucket ${bucket}. Verifica permessi RLS.`)
      
      const { data } = supabase.storage.from(bucket).getPublicUrl(fileName)
      return data.publicUrl
    } catch (err) {
      throw err
    }
  }

  const handleTagToggle = (tagId: string) => {
    if (!isEditing) return
    setSelectedTags(prev => prev.includes(tagId) ? prev.filter(id => id !== tagId) : [...prev, tagId])
  }

  const handleAddCustomTag = (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    const trimmedInput = customTagInput.trim()
    if (!trimmedInput) return

    const existingTag = availableInterests.find(t => t.nome.toLowerCase() === trimmedInput.toLowerCase())
    if (existingTag) {
      if (!selectedTags.includes(existingTag.id)) setSelectedTags(prev => [...prev, existingTag.id])
    } else {
      const newId = `temp_${Date.now()}`
      setAvailableInterests(prev => [...prev, { id: newId, nome: trimmedInput, categoria: 'I Tuoi Tag' }])
      setSelectedTags(prev => [...prev, newId])
    }
    setCustomTagInput('')
  }

  const groupedInterests = availableInterests.reduce((acc, tag) => {
    const cat = tag.categoria || 'Generali'
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(tag)
    return acc
  }, {} as Record<string, Tag[]>)

  const toggleProjectVisibility = (id: string) => {
    setHiddenProjects(prev => prev.includes(id) ? prev.filter(pid => pid !== id) : [...prev, id])
  }

  const handleRemoveCv = () => {
    setCvFile(null)
    setCvUrl('')
  }

  const handleCancelEdit = () => {
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
          progetti_nascosti: hiddenProjects,
          banner_settings: { scale: bannerScale, posY: bannerPosY },
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id)

      if (updateError) throw updateError

      if (corsoSelezionato) {
        if (studenteCorsoId) {
          await supabase.from('studente_corso').update({ corso_id: corsoSelezionato, anno_inizio: annoInizio }).eq('id', studenteCorsoId)
        } else {
          const { data: newCorso } = await supabase.from('studente_corso').insert({ studente_id: user.id, corso_id: corsoSelezionato, anno_inizio: annoInizio, completato: false }).select('id').single()
          if (newCorso) setStudenteCorsoId(newCorso.id)
        }
      }

      const { data: defaultCat } = await supabase.from('categoria').select('id').limit(1).single()
      
      const finalTagIds: string[] = []
      for (const tagId of selectedTags) {
        if (tagId.startsWith('temp_')) {
          const tagObj = availableInterests.find(t => t.id === tagId)
          if (tagObj && defaultCat) {
            const { data: existing } = await supabase.from('interesse').select('id').ilike('nome', tagObj.nome).maybeSingle()
            if (existing) {
              finalTagIds.push(existing.id)
            } else {
              const { data: newTag } = await supabase.from('interesse').insert({ nome: tagObj.nome, categoria_id: defaultCat.id }).select('id').single()
              if (newTag) finalTagIds.push(newTag.id)
            }
          }
        } else {
          finalTagIds.push(tagId)
        }
      }

      await supabase.from('studente_interesse').delete().eq('studente_id', user.id)
      if (finalTagIds.length > 0) {
        const tagInserts = finalTagIds.map(id => ({ studente_id: user.id, interesse_id: id }))
        await supabase.from('studente_interesse').insert(tagInserts)
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
      setError(err.message || "Errore durante il salvataggio.")
    } finally {
      setSaving(false)
    }
  }

  if (loading) return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="text-center">
        <div className="text-5xl sm:text-6xl animate-bounce mb-4">🚀</div>
        <p className="text-gray-900 font-black uppercase tracking-widest text-sm sm:text-xl">Caricamento...</p>
      </div>
    </div>
  )

  return (
    <div className="max-w-5xl mx-auto pb-12 sm:pb-20 px-3 sm:px-4">
      
      {/* HEADER & CONTROLLI */}
      <div className="flex flex-row items-center justify-between gap-2 mb-6 sm:mb-8">
        <button onClick={() => router.push('/dashboard')} className="px-3 sm:px-5 py-2 sm:py-3 bg-white border-[3px] sm:border-4 border-gray-900 rounded-lg sm:rounded-xl font-black text-gray-900 uppercase tracking-widest shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all flex items-center gap-1.5 sm:gap-2 text-xs sm:text-base">
          <span className="text-sm sm:text-xl">🔙</span> <span className="hidden xs:inline">Dashboard</span>
        </button>
        {!isEditing ? (
          <button onClick={() => setIsEditing(true)} className="px-3 sm:px-5 py-2 sm:py-3 bg-yellow-300 border-[3px] sm:border-4 border-gray-900 rounded-lg sm:rounded-xl font-black text-gray-900 uppercase tracking-widest shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all flex items-center gap-1.5 sm:gap-2 text-xs sm:text-base">
            <span className="text-sm sm:text-xl">✏️</span> Modifica
          </button>
        ) : (
          <button onClick={handleCancelEdit} className="px-3 sm:px-5 py-2 sm:py-3 bg-gray-200 border-[3px] sm:border-4 border-gray-900 rounded-lg sm:rounded-xl font-black text-gray-900 uppercase tracking-widest shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all flex items-center gap-1.5 sm:gap-2 text-xs sm:text-base">
            <span className="text-sm sm:text-xl">❌</span> Annulla
          </button>
        )}
      </div>

      {error && <div className="mb-6 p-3 sm:p-4 bg-red-400 border-[3px] border-gray-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] rounded-xl font-black text-gray-900 text-sm sm:text-lg uppercase flex items-center gap-2 animate-in shake"><span>⚠️</span> {error}</div>}
      {success && <div className="mb-6 p-3 sm:p-4 bg-green-400 border-[3px] border-gray-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] rounded-xl font-black text-gray-900 text-sm sm:text-lg uppercase flex items-center gap-2"><span>🎉</span> Aggiornato!</div>}

      <form onSubmit={handleSave}>
        <div className="bg-white rounded-2xl sm:rounded-[2rem] border-[3px] sm:border-4 border-gray-900 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] sm:shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] overflow-hidden relative">
          
          {/* BANNER CARTOON (Più basso su mobile) */}
          <div className="h-32 sm:h-72 bg-gray-200 border-b-[3px] sm:border-b-4 border-gray-900 relative overflow-hidden pattern-dots group">
            {(bannerFile || bannerUrl) ? (
              <img 
                src={bannerFile ? URL.createObjectURL(bannerFile) : bannerUrl} 
                className="w-full h-full object-cover transition-transform" 
                style={{
                  transform: `scale(${bannerScale})`,
                  objectPosition: `50% ${bannerPosY}%`
                }}
                alt="Banner" 
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-blue-400">
                <span className="text-4xl sm:text-6xl opacity-50">🖼️</span>
              </div>
            )}
            
            {isEditing && (
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 sm:gap-4 p-2">
                <label className="bg-white text-gray-900 px-3 sm:px-6 py-2 sm:py-3 border-2 sm:border-4 border-gray-900 rounded-lg sm:rounded-xl font-black uppercase tracking-widest shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all cursor-pointer flex items-center gap-1 text-xs sm:text-base">
                  <span>📸</span> Cambia
                  <input type="file" className="hidden" accept="image/*" onChange={(e) => setBannerFile(e.target.files?.[0] || null)} />
                </label>

                {(bannerFile || bannerUrl) && (
                  <div className="bg-yellow-300 border-2 sm:border-4 border-gray-900 p-2 sm:p-4 rounded-xl shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] flex flex-col sm:flex-row gap-2 sm:gap-4 items-center" onClick={(e) => e.stopPropagation()}>
                    <div className="flex flex-col w-24 sm:w-32">
                      <label className="text-[9px] sm:text-[10px] font-black uppercase text-gray-900 mb-0.5">🔍 Zoom</label>
                      <input type="range" min="1" max="3" step="0.1" value={bannerScale} onChange={(e) => setBannerScale(parseFloat(e.target.value))} className="accent-gray-900 cursor-pointer h-1 sm:h-2"/>
                    </div>
                    <div className="flex flex-col w-24 sm:w-32">
                      <label className="text-[9px] sm:text-[10px] font-black uppercase text-gray-900 mb-0.5">↕️ Posizione</label>
                      <input type="range" min="0" max="100" step="1" value={bannerPosY} onChange={(e) => setBannerPosY(parseInt(e.target.value))} className="accent-gray-900 cursor-pointer h-1 sm:h-2"/>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="px-4 sm:px-12 pb-8 sm:pb-12">
            
            {/* AVATAR & NOME */}
            <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 -mt-12 sm:-mt-20 mb-6 sm:mb-10 relative z-10">
              <div className="relative flex-shrink-0 mx-auto sm:mx-0">
                <div className="w-24 h-24 sm:w-40 sm:h-40 rounded-full border-[3px] sm:border-4 border-gray-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] sm:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] overflow-hidden bg-white">
                  {(avatarFile || avatarUrl) ? (
                    <img src={avatarFile ? URL.createObjectURL(avatarFile) : avatarUrl} className="w-full h-full object-cover" alt="Avatar"/>
                  ) : (
                    <div className="w-full h-full bg-red-400 flex items-center justify-center">
                      <span className="text-3xl sm:text-5xl font-black text-gray-900 uppercase">{nome.charAt(0)}{cognome.charAt(0)}</span>
                    </div>
                  )}
                </div>
                {globalUser?.is_system_admin && (
                  <div className="absolute bottom-0 right-0 bg-yellow-300 border-2 sm:border-4 border-gray-900 text-gray-900 px-2 py-0.5 sm:px-3 sm:py-1 rounded-lg sm:rounded-xl text-[10px] sm:text-xs font-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] uppercase -rotate-6">
                    ⚡ Staff
                  </div>
                )}
                {isEditing && (
                  <label className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 hover:opacity-100 transition-opacity cursor-pointer rounded-full">
                    <span className="text-white font-black uppercase text-xs sm:text-sm">📸</span>
                    <input type="file" className="hidden" accept="image/*" onChange={(e) => setAvatarFile(e.target.files?.[0] || null)} />
                  </label>
                )}
              </div>

              <div className="flex-1 pt-2 sm:pt-24 text-center sm:text-left">
                {isEditing ? (
                  <div className="grid sm:grid-cols-2 gap-3 sm:gap-4">
                    <div>
                      <label className="block text-[10px] sm:text-xs font-black uppercase tracking-widest text-gray-600 mb-1">Nome</label>
                      <input type="text" value={nome} onChange={(e) => setNome(e.target.value)} required className="w-full px-3 py-2 sm:px-4 sm:py-3 bg-white rounded-lg sm:rounded-xl border-[3px] sm:border-4 border-gray-900 focus:outline-none focus:translate-x-[2px] focus:translate-y-[2px] shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] font-black text-gray-900 transition-all text-sm sm:text-lg uppercase" />
                    </div>
                    <div>
                      <label className="block text-[10px] sm:text-xs font-black uppercase tracking-widest text-gray-600 mb-1">Cognome</label>
                      <input type="text" value={cognome} onChange={(e) => setCognome(e.target.value)} required className="w-full px-3 py-2 sm:px-4 sm:py-3 bg-white rounded-lg sm:rounded-xl border-[3px] sm:border-4 border-gray-900 focus:outline-none focus:translate-x-[2px] focus:translate-y-[2px] shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] font-black text-gray-900 transition-all text-sm sm:text-lg uppercase" />
                    </div>
                  </div>
                ) : (
                  <>
                    <h1 className="text-2xl sm:text-5xl font-black text-gray-900 uppercase italic tracking-tighter leading-none mb-1 sm:mb-2">
                      {nome} <span className="text-red-600">{cognome}</span>
                    </h1>
                    {globalUser?.corso_studi && (
                      <div className="inline-block bg-white border-2 border-gray-900 px-2 py-1 sm:px-3 sm:py-1.5 rounded-md sm:rounded-lg shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] mt-1 sm:mt-2">
                        <p className="text-gray-900 font-bold text-[10px] sm:text-sm uppercase tracking-widest">
                          🎓 {globalUser.corso_studi} • Anno {globalUser.anno_corso}
                        </p>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* SEZIONE BIO */}
            <div className="mb-6 sm:mb-10 bg-blue-50 border-[3px] sm:border-4 border-gray-900 rounded-xl sm:rounded-2xl p-4 sm:p-6 relative mt-4">
              <span className="absolute -top-3.5 sm:-top-5 left-4 sm:left-6 bg-white border-2 sm:border-4 border-gray-900 px-3 py-0.5 sm:px-4 sm:py-1 rounded-lg sm:rounded-xl font-black uppercase tracking-widest text-gray-900 text-[10px] sm:text-sm shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">Chi Sono 💭</span>
              {isEditing ? (
                <textarea rows={3} value={bio} onChange={(e) => setBio(e.target.value)} className="w-full px-3 py-2 sm:px-4 sm:py-4 mt-1 sm:mt-2 bg-white rounded-lg sm:rounded-xl border-[3px] sm:border-4 border-gray-900 focus:outline-none focus:translate-x-[2px] focus:translate-y-[2px] shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] font-bold text-gray-900 transition-all resize-none text-sm sm:text-base" placeholder="Scrivi qualcosa di figo su di te..." />
              ) : (
                <p className="text-gray-900 font-bold text-sm sm:text-lg leading-relaxed mt-1 sm:mt-2">{bio || <span className="text-gray-500 italic font-medium">Nessuna biografia inserita. È un tipo misterioso.</span>}</p>
              )}
            </div>

            {/* CORSO E SOCIAL */}
            <div className="grid md:grid-cols-2 gap-6 sm:gap-10 mb-6 sm:mb-10">
              <div className="bg-yellow-50 border-[3px] sm:border-4 border-gray-900 rounded-xl sm:rounded-2xl p-4 sm:p-6 relative mt-2">
                <span className="absolute -top-3.5 sm:-top-5 left-4 sm:left-6 bg-white border-2 sm:border-4 border-gray-900 px-3 py-0.5 sm:px-4 sm:py-1 rounded-lg sm:rounded-xl font-black uppercase tracking-widest text-gray-900 text-[10px] sm:text-sm shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">Studi 📚</span>
                {isEditing ? (
                  <div className="grid gap-3 sm:gap-4 mt-1 sm:mt-2">
                    <select value={corsoSelezionato || ''} onChange={(e) => setCorsoSelezionato(e.target.value || null)} className="w-full px-3 py-2 sm:px-4 sm:py-3 bg-white rounded-lg sm:rounded-xl border-[3px] sm:border-4 border-gray-900 focus:outline-none shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] font-bold text-gray-900 text-xs sm:text-base cursor-pointer">
                      <option value="">Seleziona un corso...</option>
                      {corsiDisponibili.map(corso => <option key={corso.id} value={corso.id}>{corso.nome}</option>)}
                    </select>
                    <select value={annoInizio} onChange={(e) => setAnnoInizio(parseInt(e.target.value))} className="w-full px-3 py-2 sm:px-4 sm:py-3 bg-white rounded-lg sm:rounded-xl border-[3px] sm:border-4 border-gray-900 focus:outline-none shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] font-bold text-gray-900 text-xs sm:text-base cursor-pointer">
                      {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - i).map(year => <option key={year} value={year}>{year}</option>)}
                    </select>
                  </div>
                ) : (
                  <div className="mt-1 sm:mt-2 flex items-center gap-3 sm:gap-4">
                    {corsoSelezionato ? (
                      <>
                        <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-lg sm:rounded-xl bg-white border-2 sm:border-4 border-gray-900 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center -rotate-6"><span className="text-xl sm:text-3xl">🎓</span></div>
                        <div>
                          <p className="font-black text-gray-900 text-sm sm:text-xl uppercase tracking-tighter leading-tight">{corsiDisponibili.find(c => c.id === corsoSelezionato)?.nome || globalUser?.corso_studi}</p>
                          <p className="text-[10px] sm:text-sm font-bold text-gray-600 uppercase tracking-widest mt-0.5 sm:mt-1">{new Date().getFullYear() - annoInizio}° Anno (Iscritto nel {annoInizio})</p>
                        </div>
                      </>
                    ) : (
                      <span className="text-gray-500 font-bold italic text-sm">Nessun corso selezionato</span>
                    )}
                  </div>
                )}
              </div>

              <div className="bg-green-50 border-[3px] sm:border-4 border-gray-900 rounded-xl sm:rounded-2xl p-4 sm:p-6 relative mt-2 md:mt-0">
                <span className="absolute -top-3.5 sm:-top-5 left-4 sm:left-6 bg-white border-2 sm:border-4 border-gray-900 px-3 py-0.5 sm:px-4 sm:py-1 rounded-lg sm:rounded-xl font-black uppercase tracking-widest text-gray-900 text-[10px] sm:text-sm shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">Collegamenti 🔗</span>
                {isEditing ? (
                  <div className="grid gap-2 sm:gap-3 mt-1 sm:mt-2">
                    <input type="url" value={linkedinUrl} onChange={(e) => setLinkedinUrl(e.target.value)} placeholder="LinkedIn URL" className="w-full px-3 py-2 bg-white border-2 sm:border-4 border-gray-900 rounded-lg text-xs sm:text-base font-bold text-gray-900 outline-none" />
                    <input type="url" value={githubUrl} onChange={(e) => setGithubUrl(e.target.value)} placeholder="GitHub URL" className="w-full px-3 py-2 bg-white border-2 sm:border-4 border-gray-900 rounded-lg text-xs sm:text-base font-bold text-gray-900 outline-none" />
                    <input type="url" value={websiteUrl} onChange={(e) => setWebsiteUrl(e.target.value)} placeholder="Sito Web URL" className="w-full px-3 py-2 bg-white border-2 sm:border-4 border-gray-900 rounded-lg text-xs sm:text-base font-bold text-gray-900 outline-none" />
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2 sm:gap-4 mt-1 sm:mt-2">
                    {linkedinUrl && <a href={linkedinUrl.startsWith('http') ? linkedinUrl : `https://${linkedinUrl}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 px-3 sm:px-6 py-1.5 sm:py-3 bg-white border-2 sm:border-4 border-gray-900 rounded-lg sm:rounded-xl font-black uppercase text-[10px] sm:text-sm text-gray-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all"><span className="text-sm sm:text-xl">💼</span> LinkedIn</a>}
                    {githubUrl && <a href={githubUrl.startsWith('http') ? githubUrl : `https://${githubUrl}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 px-3 sm:px-6 py-1.5 sm:py-3 bg-white border-2 sm:border-4 border-gray-900 rounded-lg sm:rounded-xl font-black uppercase text-[10px] sm:text-sm text-gray-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all"><span className="text-sm sm:text-xl">💻</span> GitHub</a>}
                    {websiteUrl && <a href={websiteUrl.startsWith('http') ? websiteUrl : `https://${websiteUrl}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 px-3 sm:px-6 py-1.5 sm:py-3 bg-white border-2 sm:border-4 border-gray-900 rounded-lg sm:rounded-xl font-black uppercase text-[10px] sm:text-sm text-gray-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all"><span className="text-sm sm:text-xl">🌐</span> Web</a>}
                    {twitterUrl && <a href={twitterUrl.startsWith('http') ? twitterUrl : `https://${twitterUrl}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 px-3 sm:px-6 py-1.5 sm:py-3 bg-white border-2 sm:border-4 border-gray-900 rounded-lg sm:rounded-xl font-black uppercase text-[10px] sm:text-sm text-gray-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all"><span className="text-sm sm:text-xl">🐦</span> Twitter</a>}
                    {!linkedinUrl && !githubUrl && !websiteUrl && !twitterUrl && <span className="text-gray-500 font-bold italic text-sm">Nessun collegamento inserito.</span>}
                  </div>
                )}
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6 sm:gap-10 mb-6 sm:mb-10">
              {/* CURRICULUM */}
              <div className="bg-red-50 border-[3px] sm:border-4 border-gray-900 rounded-xl sm:rounded-2xl p-4 sm:p-6 relative mt-2 md:mt-0">
                <span className="absolute -top-3.5 sm:-top-5 left-4 sm:left-6 bg-white border-2 sm:border-4 border-gray-900 px-3 py-0.5 sm:px-4 sm:py-1 rounded-lg sm:rounded-xl font-black uppercase tracking-widest text-gray-900 text-[10px] sm:text-sm shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">Curriculum 📄</span>
                <div className="mt-2 sm:mt-4">
                  {isEditing ? (
                    <div className="flex flex-col gap-3 sm:gap-4">
                      <label className="w-full bg-white p-4 sm:p-6 rounded-lg sm:rounded-xl border-[3px] sm:border-4 border-dashed border-gray-900 cursor-pointer hover:bg-red-100 transition-colors flex flex-col items-center justify-center text-center">
                        <span className="text-2xl sm:text-4xl mb-1 sm:mb-2">📥</span>
                        <span className="font-black uppercase tracking-widest text-gray-900 text-xs sm:text-base">{cvFile ? cvFile.name : (cvUrl ? 'Sostituisci CV' : 'Carica PDF')}</span>
                        <input type="file" className="hidden" accept=".pdf" onChange={(e) => setCvFile(e.target.files?.[0] || null)} />
                      </label>
                      {(cvFile || cvUrl) && (
                        <button type="button" onClick={handleRemoveCv} className="px-3 sm:px-4 py-2 sm:py-3 bg-gray-900 text-white rounded-lg sm:rounded-xl font-black uppercase tracking-widest shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all text-xs sm:text-sm">
                          🗑️ Rimuovi CV
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center justify-center p-2 sm:p-4">
                      {cvPreviewUrl ? (
                        <a href={cvPreviewUrl} target="_blank" rel="noopener noreferrer" className="flex flex-col items-center gap-1 sm:gap-2 group">
                          <div className="w-16 h-16 sm:w-20 sm:h-20 bg-white border-[3px] sm:border-4 border-gray-900 rounded-xl sm:rounded-2xl flex items-center justify-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] group-hover:translate-x-[2px] group-hover:translate-y-[2px] group-hover:shadow-none transition-all">
                            <span className="text-3xl sm:text-4xl">📋</span>
                          </div>
                          <span className="font-black uppercase tracking-widest text-gray-900 mt-1 sm:mt-2 text-xs sm:text-base">Apri CV</span>
                        </a>
                      ) : (
                        <span className="text-gray-500 font-bold italic text-sm">Nessun CV caricato</span>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* COMPETENZE / TAGS */}
              <div className="bg-purple-50 border-[3px] sm:border-4 border-gray-900 rounded-xl sm:rounded-2xl p-4 sm:p-6 relative mt-2 md:mt-0">
                <span className="absolute -top-3.5 sm:-top-5 left-4 sm:left-6 bg-white border-2 sm:border-4 border-gray-900 px-3 py-0.5 sm:px-4 sm:py-1 rounded-lg sm:rounded-xl font-black uppercase tracking-widest text-gray-900 text-[10px] sm:text-sm shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">Skill & Passioni ⭐</span>
                <div className="mt-2 sm:mt-4 max-h-[300px] sm:max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                  {isEditing && (
                    <div className="mb-4 sm:mb-6 bg-white p-3 sm:p-4 rounded-lg sm:rounded-xl border-2 sm:border-4 border-gray-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                      <p className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-gray-600 mb-1.5 sm:mb-2">Aggiungi nuovo tag</p>
                      <div className="flex gap-2">
                        <input type="text" value={customTagInput} onChange={(e) => setCustomTagInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') handleAddCustomTag(e) }} placeholder="Scrivi e premi '+'" className="flex-1 px-2 py-1 sm:px-3 sm:py-2 border-2 border-gray-900 rounded-md sm:rounded-lg focus:outline-none font-bold text-gray-900 text-xs sm:text-sm" />
                        <button type="button" onClick={handleAddCustomTag} className="px-3 sm:px-4 py-1 sm:py-2 bg-purple-400 text-gray-900 border-2 border-gray-900 rounded-md sm:rounded-lg font-black uppercase shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none transition-all">+</button>
                      </div>
                    </div>
                  )}
                  {Object.entries(groupedInterests).map(([categoria, tags]) => {
                    const hasSelectedTags = tags.some(t => selectedTags.includes(t.id))
                    if (!isEditing && !hasSelectedTags) return null
                    return (
                      <div key={categoria} className="mb-4 sm:mb-6 last:mb-0">
                        <h4 className="text-[10px] sm:text-xs font-black text-gray-900 uppercase tracking-widest mb-2 sm:mb-3 border-b-2 border-gray-900 inline-block">{categoria}</h4>
                        <div className="flex flex-wrap gap-2 sm:gap-3">
                          {tags.map(tag => {
                            const isSelected = selectedTags.includes(tag.id)
                            return (
                              <button
                                key={tag.id} type="button" onClick={() => handleTagToggle(tag.id)} disabled={!isEditing}
                                className={`px-2 py-1 sm:px-4 sm:py-2 rounded-lg sm:rounded-xl font-black uppercase tracking-widest text-[10px] sm:text-sm transition-all border-2 sm:border-4 border-gray-900 ${
                                  isSelected ? 'bg-purple-400 text-gray-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] sm:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] -translate-y-0.5 sm:-translate-y-1 rotate-1 sm:rotate-2' : isEditing ? 'bg-white text-gray-600 hover:bg-gray-100' : 'hidden'
                                }`}
                              >
                                {tag.nome}
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })}
                  {selectedTags.length === 0 && !isEditing && <span className="text-gray-500 font-bold italic text-sm">Nessuna competenza selezionata</span>}
                </div>
              </div>
            </div>

            {/* VETRINA PROGETTI IN PIATTAFORMA */}
            <div className="mb-6 sm:mb-10 bg-orange-50 border-[3px] sm:border-4 border-gray-900 rounded-xl sm:rounded-2xl p-4 sm:p-6 relative mt-2">
              <span className="absolute -top-3.5 sm:-top-5 left-4 sm:left-6 bg-white border-2 sm:border-4 border-gray-900 px-3 py-0.5 sm:px-4 sm:py-1 rounded-lg sm:rounded-xl font-black uppercase tracking-widest text-gray-900 text-[10px] sm:text-sm shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                I Miei Progetti 🚀
              </span>
              
              <div className="mt-2 sm:mt-4">
                {myPlatformProjects.length === 0 ? (
                  <p className="text-gray-500 font-bold italic text-sm sm:text-base">Non hai ancora partecipato a nessun progetto in piattaforma.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                    {myPlatformProjects.map(proj => {
                      const isHidden = hiddenProjects.includes(proj.id)
                      if (!isEditing && isHidden) return null

                      return (
                        <div key={proj.id} className={`bg-white border-2 sm:border-4 border-gray-900 p-3 sm:p-5 rounded-xl sm:rounded-2xl flex flex-col justify-between transition-all ${isHidden ? 'opacity-50 grayscale' : 'shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1'}`}>
                          <div>
                            <h4 className="font-black text-sm sm:text-lg uppercase text-gray-900 leading-tight mb-1 sm:mb-2 truncate">{proj.titolo}</h4>
                            <p className="text-[10px] sm:text-xs font-bold text-gray-600 line-clamp-2 sm:line-clamp-3 mb-3 sm:mb-4">{proj.descrizione}</p>
                          </div>
                          
                          {isEditing ? (
                            <button 
                              type="button" 
                              onClick={() => toggleProjectVisibility(proj.id)}
                              className="mt-auto px-2 py-1.5 sm:px-3 sm:py-2 border-2 border-gray-900 rounded-lg sm:rounded-xl text-[10px] sm:text-xs font-black uppercase w-full hover:bg-gray-100 transition-colors"
                            >
                              {isHidden ? '👁️ Mostra' : '🙈 Nascondi'}
                            </button>
                          ) : (
                            <Link href={`/dashboard/projects/${proj.id}`} className="mt-auto block text-center w-full py-2 sm:py-2.5 bg-gray-900 text-white rounded-lg sm:rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-600 border-2 border-gray-900 transition-colors">
                              Vedi Progetto ↗
                            </Link>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* PULSANTONE SALVA */}
            {isEditing && (
              <div className="mt-8 sm:mt-12">
                <button 
                  type="submit" 
                  disabled={saving}
                  className="w-full py-4 sm:py-5 bg-red-600 rounded-xl sm:rounded-2xl font-black text-white text-lg sm:text-2xl uppercase tracking-widest border-[3px] sm:border-4 border-gray-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] sm:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[4px] hover:translate-y-[4px] hover:shadow-none transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 sm:gap-3"
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