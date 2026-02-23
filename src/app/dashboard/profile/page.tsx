'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

import { useUser } from '@/app/context/UserContext'
import SuperAvatar from '@/components/SuperAvatar'

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
  const [studenteCorsoId, setStudenteCorsoId] = useState<string | null>(null) // ID del record in studente_corso
  
  // --- STATI FILE (URL E FILE OGGETTO) ---
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

  // --- STATO PER ANTEPRIMA CV ---
  const [cvPreviewUrl, setCvPreviewUrl] = useState<string | null>(null)

  // Gestione anteprima CV con cleanup
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

  // 1. CARICAMENTO DATI INIZIALI
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

        // Fetch corsi di studi disponibili
        const { data: corsi } = await supabase
          .from('corso_di_studi')
          .select('id, nome, tipo')
          .order('nome', { ascending: true })
        
        if (corsi) setCorsiDisponibili(corsi)

        // Fetch corso attuale dello studente
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

  // 2. FUNZIONE UPLOAD
  const uploadFile = async (file: File, bucket: string) => {
    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
      
      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(fileName, file, { cacheControl: '3600', upsert: true })

      if (uploadError) {
        console.error(`Errore upload nel bucket ${bucket}:`, uploadError)
        throw new Error(`Errore caricamento nel bucket ${bucket}. Verifica i permessi RLS.`)
      }
      
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
    // Ricarica i dati originali
    window.location.reload()
  }

  // 3. SALVATAGGIO COMPLETO
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
          nome,
          cognome,
          bio,
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

      // Aggiorna corso di studi
      if (corsoSelezionato) {
        if (studenteCorsoId) {
          // Aggiorna il record esistente
          const { error: corsoError } = await supabase
            .from('studente_corso')
            .update({
              corso_id: corsoSelezionato,
              anno_inizio: annoInizio
            })
            .eq('id', studenteCorsoId)
          
          if (corsoError) throw corsoError
        } else {
          // Crea un nuovo record
          const { data: newCorso, error: corsoError } = await supabase
            .from('studente_corso')
            .insert({
              studente_id: user.id,
              corso_id: corsoSelezionato,
              anno_inizio: annoInizio,
              completato: false
            })
            .select('id')
            .single()
          
          if (corsoError) throw corsoError
          if (newCorso) setStudenteCorsoId(newCorso.id)
        }
      }

      const { error: deleteError } = await supabase
        .from('studente_interesse')
        .delete()
        .eq('studente_id', user.id)
      
      if (deleteError) throw deleteError

      if (selectedTags.length > 0) {
        const tagInserts = selectedTags.map(tagId => ({
          studente_id: user.id,
          interesse_id: tagId
        }))
        const { error: insertError } = await supabase
          .from('studente_interesse')
          .insert(tagInserts)
        
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

  // Componente per i social links in modalità view
  const SocialLink = ({ url, icon, label, color }: { url: string, icon: React.ReactNode, label: string, color: string }) => {
    if (!url) return null
    return (
      <a 
        href={url.startsWith('http') ? url : `https://${url}`}
        target="_blank"
        rel="noopener noreferrer"
        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all hover:scale-105 ${color}`}
      >
        {icon}
        <span className="hidden sm:inline">{label}</span>
      </a>
    )
  }

  if (loading) return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-gray-300 border-t-red-600 rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-gray-500 font-medium">Caricamento profilo...</p>
      </div>
    </div>
  )

  return (
    <div className="max-w-5xl mx-auto pb-20">
      {/* Header con navigazione */}
      <div className="flex items-center justify-between mb-6">
        <button 
          onClick={() => router.push('/dashboard')}
          className="flex items-center gap-2 text-gray-500 hover:text-gray-900 font-medium text-sm transition-colors group"
        >
          <svg className="w-4 h-4 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Dashboard
        </button>

        {/* Bottone Modifica/Annulla */}
        {!isEditing ? (
          <button 
            onClick={() => setIsEditing(true)}
            className="flex items-center gap-2 bg-gray-900 text-white px-5 py-2.5 rounded-xl font-medium text-sm hover:bg-gray-800 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
            Modifica Profilo
          </button>
        ) : (
          <button 
            onClick={handleCancelEdit}
            className="flex items-center gap-2 bg-gray-100 text-gray-600 px-5 py-2.5 rounded-xl font-medium text-sm hover:bg-gray-200 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            Annulla
          </button>
        )}
      </div>

      {/* Messaggi di stato */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-2xl font-medium text-sm flex items-center gap-3">
          <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {error}
        </div>
      )}
      {success && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 text-green-700 rounded-2xl font-medium text-sm flex items-center gap-3">
          <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Profilo aggiornato con successo!
        </div>
      )}

      <form onSubmit={handleSave}>
        {/* Card Principale */}
        <div className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden">
          
          {/* Banner */}
          <div className="h-48 sm:h-56 bg-gradient-to-br from-gray-100 to-gray-200 relative group">
            {(bannerFile || bannerUrl) ? (
              <img 
                src={bannerFile ? URL.createObjectURL(bannerFile) : bannerUrl} 
                className="w-full h-full object-cover" 
                alt="Banner" 
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center">
                <div className="text-center">
                  <div className="w-16 h-16 mx-auto mb-2 rounded-2xl bg-white/10 flex items-center justify-center">
                    <svg className="w-8 h-8 text-white/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                </div>
              </div>
            )}
            
            {/* Overlay per modifica banner */}
            {isEditing && (
              <label className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                <span className="bg-white text-gray-900 px-5 py-2.5 rounded-xl font-medium text-sm shadow-lg flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  Cambia copertina
                </span>
                <input type="file" className="hidden" accept="image/*" onChange={(e) => setBannerFile(e.target.files?.[0] || null)} />
              </label>
            )}
          </div>

          {/* Contenuto */}
          <div className="px-6 sm:px-10 pb-10">
            {/* Avatar e info base */}
            <div className="flex flex-col sm:flex-row gap-6 -mt-16 sm:-mt-12 mb-8">
              {/* Avatar */}
              <div className="relative z-10 flex-shrink-0">
                <div className="w-32 h-32 sm:w-36 sm:h-36 rounded-3xl border-4 border-white shadow-xl overflow-hidden bg-white">
                  {(avatarFile || avatarUrl) ? (
                    <img 
                      src={avatarFile ? URL.createObjectURL(avatarFile) : avatarUrl} 
                      className="w-full h-full object-cover"
                      alt="Avatar"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-red-100 to-red-50 flex items-center justify-center">
                      <span className="text-4xl font-black text-red-300">
                        {nome.charAt(0)}{cognome.charAt(0)}
                      </span>
                    </div>
                  )}
                </div>
                
                {/* Badge Staff */}
                {globalUser?.is_system_admin && (
                  <div className="absolute -bottom-2 -right-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg">
                    ⚡ Staff
                  </div>
                )}

                {/* Bottone modifica avatar */}
                {isEditing && (
                  <label className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 hover:opacity-100 transition-opacity cursor-pointer rounded-3xl">
                    <span className="text-white text-xs font-bold">Modifica</span>
                    <input type="file" className="hidden" accept="image/*" onChange={(e) => setAvatarFile(e.target.files?.[0] || null)} />
                  </label>
                )}
              </div>

              {/* Nome e info */}
              <div className="flex-1 pt-4 sm:pt-16">
                {isEditing ? (
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1.5">Nome</label>
                      <input 
                        type="text" 
                        value={nome} 
                        onChange={(e) => setNome(e.target.value)} 
                        required 
                        className="w-full px-4 py-3 bg-gray-50 rounded-xl border border-gray-200 focus:border-red-500 focus:ring-2 focus:ring-red-500/20 outline-none font-medium text-gray-900 transition-all" 
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1.5">Cognome</label>
                      <input 
                        type="text" 
                        value={cognome} 
                        onChange={(e) => setCognome(e.target.value)} 
                        required
                        className="w-full px-4 py-3 bg-gray-50 rounded-xl border border-gray-200 focus:border-red-500 focus:ring-2 focus:ring-red-500/20 outline-none font-medium text-gray-900 transition-all" 
                      />
                    </div>
                  </div>
                ) : (
                  <>
                    <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                      {nome} {cognome}
                    </h1>
                    {globalUser?.corso_studi && (
                      <p className="text-gray-500 mt-1">
                        {globalUser.corso_studi} • Anno {globalUser.anno_corso}
                      </p>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Bio */}
            <div className="mb-8">
              <label className="block text-xs font-medium text-gray-500 mb-2">Bio</label>
              {isEditing ? (
                <textarea 
                  rows={4} 
                  value={bio} 
                  onChange={(e) => setBio(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 rounded-xl border border-gray-200 focus:border-red-500 focus:ring-2 focus:ring-red-500/20 outline-none font-medium text-gray-900 transition-all resize-none"
                  placeholder="Scrivi qualcosa su di te..." 
                />
              ) : (
                <p className="text-gray-600 leading-relaxed">
                  {bio || <span className="text-gray-400 italic">Nessuna biografia</span>}
                </p>
              )}
            </div>

            {/* Corso di Studi */}
            <div className="mb-8 p-6 bg-gray-50 rounded-2xl border border-gray-100">
              <label className="block text-xs font-medium text-gray-500 mb-4">📚 Corso di Studi</label>
              
              {isEditing ? (
                <div className="grid sm:grid-cols-2 gap-4">
                  {/* Selezione Corso */}
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1.5">Corso</label>
                    <select
                      value={corsoSelezionato || ''}
                      onChange={(e) => setCorsoSelezionato(e.target.value || null)}
                      className="w-full px-4 py-3 bg-white rounded-xl border border-gray-200 focus:border-red-500 focus:ring-2 focus:ring-red-500/20 outline-none font-medium text-gray-900 transition-all"
                    >
                      <option value="">Seleziona un corso...</option>
                      {corsiDisponibili.map(corso => (
                        <option key={corso.id} value={corso.id}>
                          {corso.nome} ({corso.tipo})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Anno di Inizio */}
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1.5">Anno di Iscrizione</label>
                    <select
                      value={annoInizio}
                      onChange={(e) => setAnnoInizio(parseInt(e.target.value))}
                      className="w-full px-4 py-3 bg-white rounded-xl border border-gray-200 focus:border-red-500 focus:ring-2 focus:ring-red-500/20 outline-none font-medium text-gray-900 transition-all"
                    >
                      {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - i).map(year => (
                        <option key={year} value={year}>{year}</option>
                      ))}
                    </select>
                    <p className="text-xs text-gray-400 mt-1.5">
                      Anno di corso attuale: <strong className="text-gray-600">{new Date().getFullYear() - annoInizio}°</strong>
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-4">
                  {corsoSelezionato ? (
                    <>
                      <div className="w-12 h-12 rounded-xl bg-red-100 flex items-center justify-center">
                        <span className="text-xl">🎓</span>
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">
                          {corsiDisponibili.find(c => c.id === corsoSelezionato)?.nome || globalUser?.corso_studi}
                        </p>
                        <p className="text-sm text-gray-500">
                          {new Date().getFullYear() - annoInizio}° Anno • Iscritto nel {annoInizio}
                        </p>
                      </div>
                    </>
                  ) : (
                    <span className="text-gray-400 italic">Nessun corso selezionato</span>
                  )}
                </div>
              )}
            </div>

            {/* Social Links */}
            <div className="mb-8">
              <label className="block text-xs font-medium text-gray-500 mb-3">Link & Social</label>
              
              {isEditing ? (
                <div className="grid sm:grid-cols-2 gap-4">
                  {/* LinkedIn */}
                  <div className="relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[#0A66C2]">
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                      </svg>
                    </div>
                    <input 
                      type="url" 
                      value={linkedinUrl} 
                      onChange={(e) => setLinkedinUrl(e.target.value)}
                      placeholder="linkedin.com/in/username"
                      className="w-full pl-12 pr-4 py-3 bg-gray-50 rounded-xl border border-gray-200 focus:border-[#0A66C2] focus:ring-2 focus:ring-[#0A66C2]/20 outline-none text-sm text-gray-900 transition-all" 
                    />
                  </div>

                  {/* GitHub */}
                  <div className="relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-900">
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                      </svg>
                    </div>
                    <input 
                      type="url" 
                      value={githubUrl} 
                      onChange={(e) => setGithubUrl(e.target.value)}
                      placeholder="github.com/username"
                      className="w-full pl-12 pr-4 py-3 bg-gray-50 rounded-xl border border-gray-200 focus:border-gray-900 focus:ring-2 focus:ring-gray-900/20 outline-none text-sm text-gray-900 transition-all" 
                    />
                  </div>

                  {/* Website */}
                  <div className="relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                      </svg>
                    </div>
                    <input 
                      type="url" 
                      value={websiteUrl} 
                      onChange={(e) => setWebsiteUrl(e.target.value)}
                      placeholder="tuosito.com"
                      className="w-full pl-12 pr-4 py-3 bg-gray-50 rounded-xl border border-gray-200 focus:border-red-500 focus:ring-2 focus:ring-red-500/20 outline-none text-sm text-gray-900 transition-all" 
                    />
                  </div>

                  {/* Twitter/X */}
                  <div className="relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-900">
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                      </svg>
                    </div>
                    <input 
                      type="url" 
                      value={twitterUrl} 
                      onChange={(e) => setTwitterUrl(e.target.value)}
                      placeholder="x.com/username"
                      className="w-full pl-12 pr-4 py-3 bg-gray-50 rounded-xl border border-gray-200 focus:border-gray-900 focus:ring-2 focus:ring-gray-900/20 outline-none text-sm text-gray-900 transition-all" 
                    />
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {linkedinUrl && (
                    <a 
                      href={linkedinUrl.startsWith('http') ? linkedinUrl : `https://${linkedinUrl}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#0A66C2]/10 text-[#0A66C2] text-sm font-medium hover:bg-[#0A66C2]/20 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                      </svg>
                      LinkedIn
                    </a>
                  )}
                  {githubUrl && (
                    <a 
                      href={githubUrl.startsWith('http') ? githubUrl : `https://${githubUrl}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-900/10 text-gray-900 text-sm font-medium hover:bg-gray-900/20 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                      </svg>
                      GitHub
                    </a>
                  )}
                  {websiteUrl && (
                    <a 
                      href={websiteUrl.startsWith('http') ? websiteUrl : `https://${websiteUrl}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500/10 text-red-600 text-sm font-medium hover:bg-red-500/20 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                      </svg>
                      Website
                    </a>
                  )}
                  {twitterUrl && (
                    <a 
                      href={twitterUrl.startsWith('http') ? twitterUrl : `https://${twitterUrl}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-900/10 text-gray-900 text-sm font-medium hover:bg-gray-900/20 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                      </svg>
                      X
                    </a>
                  )}
                  {!linkedinUrl && !githubUrl && !websiteUrl && !twitterUrl && (
                    <span className="text-gray-400 italic text-sm">Nessun link aggiunto</span>
                  )}
                </div>
              )}
            </div>

            {/* CV Section */}
            <div className="mb-8 p-6 bg-gray-50 rounded-2xl border border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <label className="text-xs font-medium text-gray-500">Curriculum Vitae</label>
                {cvPreviewUrl && !isEditing && (
                  <a
                    href={cvPreviewUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-red-600 text-xs font-medium hover:text-red-700 transition-colors flex items-center gap-1"
                  >
                    Apri PDF
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                )}
              </div>
              
              {isEditing ? (
                <div className="flex flex-col sm:flex-row gap-3">
                  <label className="flex-1 bg-white p-4 rounded-xl border-2 border-dashed border-gray-200 hover:border-red-300 cursor-pointer transition-all flex items-center justify-center gap-3 hover:bg-red-50/50">
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span className="text-sm font-medium text-gray-600">
                      {cvFile ? cvFile.name : (cvUrl ? 'CV Caricato ✓' : 'Seleziona PDF')}
                    </span>
                    <input type="file" className="hidden" accept=".pdf" onChange={(e) => setCvFile(e.target.files?.[0] || null)} />
                  </label>
                  {(cvFile || cvUrl) && (
                    <button 
                      type="button" 
                      onClick={handleRemoveCv} 
                      className="px-4 py-2 bg-red-100 text-red-600 rounded-xl font-medium text-sm hover:bg-red-200 transition-colors"
                    >
                      Rimuovi
                    </button>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  {cvPreviewUrl ? (
                    <div className="flex items-center gap-3 text-gray-600">
                      <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center">
                        <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <span className="text-sm font-medium">CV caricato</span>
                    </div>
                  ) : (
                    <span className="text-gray-400 italic text-sm">Nessun CV caricato</span>
                  )}
                </div>
              )}
            </div>

            {/* Tags / Competenze */}
            <div className="mb-8">
              <label className="block text-xs font-medium text-gray-500 mb-3">Competenze & Interessi</label>
              <div className="flex flex-wrap gap-2">
                {availableInterests.map(tag => {
                  const isSelected = selectedTags.includes(tag.id)
                  return (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={() => handleTagToggle(tag.id)}
                      disabled={!isEditing}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                        isSelected 
                          ? 'bg-red-600 text-white shadow-sm' 
                          : isEditing
                            ? 'bg-gray-100 text-gray-600 hover:bg-gray-200 cursor-pointer'
                            : 'bg-gray-100 text-gray-400 cursor-default'
                      } ${!isEditing && !isSelected ? 'hidden' : ''}`}
                    >
                      {tag.nome}
                    </button>
                  )
                })}
                {selectedTags.length === 0 && !isEditing && (
                  <span className="text-gray-400 italic text-sm">Nessuna competenza selezionata</span>
                )}
              </div>
              {isEditing && selectedTags.length > 0 && (
                <p className="text-xs text-gray-400 mt-2">
                  {selectedTags.length} competenze selezionate
                </p>
              )}
            </div>

            {/* Submit Button */}
            {isEditing && (
              <div className="flex gap-3 pt-4 border-t border-gray-100">
                <button 
                  type="button"
                  onClick={handleCancelEdit}
                  className="flex-1 py-3 rounded-xl font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors"
                >
                  Annulla
                </button>
                <button 
                  type="submit" 
                  disabled={saving}
                  className="flex-1 py-3 rounded-xl font-semibold text-white bg-red-600 hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {saving ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Salvataggio...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Salva Modifiche
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      </form>
    </div>
  )
}