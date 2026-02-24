'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'

export default function ManageApplicationPage() {
  const params = useParams()
  const router = useRouter()
  const bandoId = params?.id as string
  const supabase = createClient()

  // Stati
  const [project, setProject] = useState<any>(null)
  const [applications, setApplications] = useState<any[]>([])
  const [teamMembers, setTeamMembers] = useState<any[]>([])
  const [selectedApp, setSelectedApp] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  
  // Colore dominante
  const [dominantColor, setDominantColor] = useState('239, 68, 68')
  
  // Tab e modali
  const [activeTab, setActiveTab] = useState<'candidature' | 'team' | 'impostazioni'>('candidature')
  const [filter, setFilter] = useState<'pending' | 'accepted' | 'rejected'>('pending')
  const [showModal, setShowModal] = useState(false)
  const [modalAction, setModalAction] = useState<'accepted' | 'rejected' | 'pending' | null>(null)
  
  // Form impostazioni
  const [linksForm, setLinksForm] = useState({ github: '', drive: '' })
  const [savingLinks, setSavingLinks] = useState(false)
  
  // Form modifica progetto
  const [editForm, setEditForm] = useState({
    titolo: '',
    descrizione: '',
    foto_url: ''
  })
  const [newCoverFile, setNewCoverFile] = useState<File | null>(null)
  const [coverPreview, setCoverPreview] = useState<string | null>(null)
  const [savingEdit, setSavingEdit] = useState(false)
  const [editSuccess, setEditSuccess] = useState(false)

  // Estrai colore dominante (CON PROTEZIONE CORS)
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
        console.warn("Errore estrazione colore:", e)
        setDominantColor('239, 68, 68')
      }
    }
  }

  // Statistiche (PROTETTE DA DATI NULLI)
  const stats = {
    total: applications?.length || 0,
    pending: applications?.filter(a => a && a.stato === 'pending').length || 0,
    accepted: applications?.filter(a => a && a.stato === 'accepted').length || 0,
    rejected: applications?.filter(a => a && a.stato === 'rejected').length || 0,
  }

  // Fetch dati
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      
      // Progetto
      const { data: projectData } = await supabase
        .from('bando')
        .select('*')
        .eq('id', bandoId)
        .single()
      
      if (projectData) {
        setProject(projectData)
        const projectAny = projectData as any
        setLinksForm({
          github: projectAny.github_url || '',
          drive: projectAny.drive_url || ''
        })
        setEditForm({
          titolo: projectData.titolo || '',
          descrizione: projectData.descrizione || '',
          foto_url: projectData.foto_url || ''
        })
        if (projectData.foto_url) {
          setCoverPreview(projectData.foto_url)
          extractColor(projectData.foto_url)
        }
      }

      // Candidature
      const { data: appsData } = await supabase
        .from('partecipazione')
        .select(`
          *,
          studente:studente_id (
            id, nome, cognome, avatar_url, bio, email,
            studente_corso (
              anno_inizio,
              corso:corso_id ( nome )
            )
          )
        `)
        .eq('bando_id', bandoId)
        .order('data_candidatura', { ascending: false })

      if (appsData) setApplications(appsData)

      // Team members (accepted) - PROTETTO
      const members = appsData?.filter(a => a && a.stato === 'accepted') || []
      setTeamMembers(members)

      setLoading(false)
    }

    if (bandoId) fetchData()
  }, [bandoId, supabase])

  // Azioni candidatura
  const handleAction = async () => {
    if (!selectedApp || !modalAction) return
    setActionLoading(true)

    const { error } = await supabase
      .from('partecipazione')
      .update({ stato: modalAction })
      .eq('id', selectedApp.id)

    if (!error) {
      setApplications(apps => apps.map(app => 
        app.id === selectedApp.id ? { ...app, stato: modalAction } : app
      ))
      setSelectedApp({ ...selectedApp, stato: modalAction })
      
      // Aggiorna team members
      if (modalAction === 'accepted') {
        setTeamMembers(prev => [...prev, { ...selectedApp, stato: 'accepted' }])
      } else {
        setTeamMembers(prev => prev.filter(m => m.id !== selectedApp.id))
      }
    }
    
    setActionLoading(false)
    setShowModal(false)
  }

  // Gestione ruoli
  const handleRoleChange = async (partecipazioneId: string, nuovoRuolo: 'admin' | 'membro') => {
    if (!window.confirm(`Cambiare ruolo in ${nuovoRuolo.toUpperCase()}?`)) return

    const { error } = await supabase
      .from('partecipazione')
      .update({ ruolo: nuovoRuolo } as any)
      .eq('id', partecipazioneId)
      
    if (!error) {
      setTeamMembers(prev => prev.map(m => 
        m.id === partecipazioneId ? { ...m, ruolo: nuovoRuolo } : m
      ))
      setApplications(prev => prev.map(a => 
        a.id === partecipazioneId ? { ...a, ruolo: nuovoRuolo } : a
      ))
    }
  }

  const handleKickMember = async (partecipazioneId: string) => {
    if (!window.confirm('Rimuovere questo membro dal team?')) return

    const { error } = await supabase
      .from('partecipazione')
      .delete()
      .eq('id', partecipazioneId)
      
    if (!error) {
      setTeamMembers(prev => prev.filter(m => m.id !== partecipazioneId))
      setApplications(prev => prev.filter(a => a.id !== partecipazioneId))
    }
  }

  // Impostazioni progetto
  const handleToggleStatus = async () => {
    const nuovoStato = project.stato === 'aperto' ? 'chiuso' : 'aperto'
    const messaggio = nuovoStato === 'chiuso' 
      ? "Chiudere le candidature?" 
      : "Riaprire le candidature?"
      
    if (!window.confirm(messaggio)) return

    const { error } = await supabase
      .from('bando')
      .update({ stato: nuovoStato })
      .eq('id', bandoId)
      
    if (!error) {
      setProject((prev: any) => ({ ...prev, stato: nuovoStato }))
    }
  }

  const handleSaveLinks = async () => {
    setSavingLinks(true)
    
    const { error } = await supabase
      .from('bando')
      .update({
        github_url: linksForm.github,
        drive_url: linksForm.drive
      } as any)
      .eq('id', bandoId)
    
    if (!error) {
      setProject((prev: any) => ({ 
        ...prev, 
        github_url: linksForm.github, 
        drive_url: linksForm.drive 
      }))
    }
    
    setSavingLinks(false)
  }

  const handleDeleteProject = async () => {
    const confirmation = prompt(`Scrivi "ELIMINA" per confermare l'eliminazione di "${project?.titolo}"`)
    
    if (confirmation === 'ELIMINA') {
      const { error } = await supabase.from('bando').delete().eq('id', bandoId)
      if (!error) {
        router.push('/dashboard')
      }
    }
  }

  // Upload immagine
  const uploadImage = async (file: File) => {
    const fileExt = file.name.split('.').pop()
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`

    const { error: uploadError } = await supabase.storage
      .from('project-media')
      .upload(fileName, file)

    if (uploadError) throw uploadError
    const { data } = supabase.storage.from('project-media').getPublicUrl(fileName)
    return data.publicUrl
  }

  // Gestione cambio immagine
  const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setNewCoverFile(file)
      const previewUrl = URL.createObjectURL(file)
      setCoverPreview(previewUrl)
    }
  }

  // Salva modifiche progetto
  const handleSaveEdit = async () => {
    setSavingEdit(true)
    setEditSuccess(false)

    try {
      let finalFotoUrl = editForm.foto_url

      // Upload nuova immagine se presente
      if (newCoverFile) {
        finalFotoUrl = await uploadImage(newCoverFile)
      }

      const { error } = await supabase
        .from('bando')
        .update({
          titolo: editForm.titolo,
          descrizione: editForm.descrizione,
          foto_url: finalFotoUrl
        })
        .eq('id', bandoId)

      if (!error) {
        setProject((prev: any) => ({
          ...prev,
          titolo: editForm.titolo,
          descrizione: editForm.descrizione,
          foto_url: finalFotoUrl
        }))
        setEditForm(prev => ({ ...prev, foto_url: finalFotoUrl }))
        setNewCoverFile(null)
        if (finalFotoUrl) {
          extractColor(finalFotoUrl)
        }
        setEditSuccess(true)
        setTimeout(() => setEditSuccess(false), 3000)
      }
    } catch (err) {
      console.error('Errore salvataggio:', err)
    }

    setSavingEdit(false)
  }

  const handleBroadcast = () => {
    const teamEmails = teamMembers
      .filter(m => m.studente?.email)
      .map(m => m.studente.email)
      .join(',')
    
    if (teamEmails) {
      const subject = encodeURIComponent(`[${project?.titolo}] Aggiornamento`)
      window.location.href = `mailto:?bcc=${teamEmails}&subject=${subject}`
    }
  }

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-gray-300 border-t-red-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-500 font-medium">Caricamento...</p>
        </div>
      </div>
    )
  }

  if (!project) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <p className="text-gray-500">Progetto non trovato</p>
      </div>
    )
  }

  // PROTETTO: Evita errori se un oggetto in 'applications' è nullo
  const filteredApps = applications?.filter(a => a && a.stato === filter) || []

  return (
    <div 
      className="min-h-screen pb-20 transition-colors duration-700"
      style={{ backgroundColor: `rgba(${dominantColor}, 0.08)` }}
    >
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => router.push(`/dashboard/my_teams/${bandoId}`)}
                className="p-2 hover:bg-gray-100 rounded-xl text-gray-500 hover:text-gray-900 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div>
                <p className="text-xs text-gray-500 font-medium mb-1">Gestione Progetto</p>
                <h1 className="text-xl font-bold text-gray-900">{project.titolo}</h1>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className={`px-3 py-1.5 rounded-full text-xs font-bold ${
                project.stato === 'chiuso' 
                  ? 'bg-gray-100 text-gray-600' 
                  : 'bg-green-100 text-green-700'
              }`}>
                {project.stato === 'chiuso' ? '🔒 Chiuso' : '🟢 Aperto'}
              </span>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 mt-6 bg-gray-100 p-1 rounded-xl w-fit">
            {[
              { id: 'candidature' as const, label: 'Candidature', icon: '📨', count: stats.pending },
              { id: 'team' as const, label: 'Team', icon: '👥', count: stats.accepted },
              { id: 'impostazioni' as const, label: 'Impostazioni', icon: '⚙️' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                  activeTab === tab.id
                    ? 'bg-white shadow-sm text-gray-900'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <span>{tab.icon}</span>
                {tab.label}
                {tab.count !== undefined && tab.count > 0 && (
                  <span className={`px-1.5 py-0.5 rounded-full text-xs font-bold ${
                    activeTab === tab.id ? 'bg-red-100 text-red-600' : 'bg-gray-200 text-gray-600'
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        
        {/* Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-2xl p-4 border border-gray-200 shadow-sm">
            <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
            <p className="text-xs text-gray-500 font-medium mt-1">Totale candidature</p>
          </div>
          <div className="bg-amber-50 rounded-2xl p-4 border border-amber-200">
            <p className="text-3xl font-bold text-amber-600">{stats.pending}</p>
            <p className="text-xs text-amber-700 font-medium mt-1">In attesa</p>
          </div>
          <div className="bg-green-50 rounded-2xl p-4 border border-green-200">
            <p className="text-3xl font-bold text-green-600">{stats.accepted}</p>
            <p className="text-xs text-green-700 font-medium mt-1">Nel team</p>
          </div>
          <div className="bg-gray-50 rounded-2xl p-4 border border-gray-200">
            <p className="text-3xl font-bold text-gray-600">{stats.rejected}</p>
            <p className="text-xs text-gray-500 font-medium mt-1">Rifiutate</p>
          </div>
        </div>

        {/* Tab: Candidature */}
        {activeTab === 'candidature' && (
          <div className="space-y-6">
            {/* Filtri */}
            <div className="flex gap-2 overflow-x-auto pb-2">
              {[
                { id: 'pending' as const, label: 'In Attesa', count: stats.pending, color: 'amber' },
                { id: 'accepted' as const, label: 'Accettate', count: stats.accepted, color: 'green' },
                { id: 'rejected' as const, label: 'Rifiutate', count: stats.rejected, color: 'gray' },
              ].map(f => (
                <button
                  key={f.id}
                  onClick={() => setFilter(f.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium text-sm whitespace-nowrap transition-all ${
                    filter === f.id
                      ? f.color === 'amber' ? 'bg-amber-500 text-white' :
                        f.color === 'green' ? 'bg-green-500 text-white' :
                        'bg-gray-700 text-white'
                      : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {f.label}
                  <span className={`px-1.5 py-0.5 rounded-full text-xs ${
                    filter === f.id ? 'bg-white/20' : 'bg-gray-100'
                  }`}>
                    {f.count}
                  </span>
                </button>
              ))}
            </div>

            {/* Lista candidature */}
            <div className="grid lg:grid-cols-3 gap-6">
              {/* Lista sinistra */}
              <div className="lg:col-span-1 space-y-3 max-h-[600px] overflow-y-auto">
                {filteredApps.length === 0 ? (
                  <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center">
                    <span className="text-4xl block mb-2">📭</span>
                    <p className="text-gray-500 text-sm">Nessuna candidatura</p>
                  </div>
                ) : (
                  filteredApps.map(app => (
                    <button
                      key={app.id}
                      onClick={() => setSelectedApp(app)}
                      className={`w-full text-left p-4 rounded-2xl border-2 transition-all ${
                        selectedApp?.id === app.id
                          ? 'border-gray-900 bg-gray-900 text-white'
                          : 'border-gray-200 bg-white hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <img 
                          src={app.studente?.avatar_url || '/default-avatar.png'} 
                          alt=""
                          className="w-10 h-10 rounded-xl object-cover"
                        />
                        <div className="flex-1 min-w-0">
                          <p className={`font-semibold truncate ${selectedApp?.id === app.id ? 'text-white' : 'text-gray-900'}`}>
                            {app.studente?.nome} {app.studente?.cognome}
                          </p>
                          <p className={`text-xs ${selectedApp?.id === app.id ? 'text-gray-400' : 'text-gray-500'}`}>
                            {new Date(app.data_candidatura).toLocaleDateString('it-IT')}
                          </p>
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </div>

              {/* Dettaglio destra */}
              <div className="lg:col-span-2">
                {selectedApp ? (
                  <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
                    {/* Header */}
                    <div className="flex items-start gap-4 mb-6 pb-6 border-b border-gray-100">
                      <img 
                        src={selectedApp.studente?.avatar_url || '/default-avatar.png'} 
                        alt=""
                        className="w-16 h-16 rounded-2xl object-cover"
                      />
                      <div className="flex-1">
                        <h3 className="text-xl font-bold text-gray-900">
                          {selectedApp.studente?.nome} {selectedApp.studente?.cognome}
                        </h3>
                        <p className="text-sm text-gray-500">
                          {selectedApp.studente?.studente_corso?.[0]?.corso?.nome || 'Corso non specificato'}
                        </p>
                        <Link 
                          href={`/dashboard/user/${selectedApp.studente?.id}`}
                          className="inline-block mt-2 text-xs font-medium text-blue-600 hover:text-blue-700"
                        >
                          Vedi profilo completo →
                        </Link>
                      </div>
                    </div>

                    {/* Bio */}
                    {selectedApp.studente?.bio && (
                      <div className="mb-6">
                        <p className="text-xs font-medium text-gray-500 mb-2">Bio</p>
                        <p className="text-sm text-gray-600 italic">"{selectedApp.studente.bio}"</p>
                      </div>
                    )}

                    {/* Messaggio */}
                    <div className="mb-6">
                      <p className="text-xs font-medium text-gray-500 mb-2">Messaggio di candidatura</p>
                      <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                        <p className="text-gray-700 whitespace-pre-wrap">
                          {selectedApp.messaggio || <span className="italic text-gray-400">Nessun messaggio</span>}
                        </p>
                      </div>
                    </div>

                    {/* Azioni */}
                    {selectedApp.stato === 'pending' ? (
                      <div className="grid grid-cols-2 gap-3">
                        <button 
                          onClick={() => { setModalAction('rejected'); setShowModal(true) }}
                          className="py-3 bg-red-50 hover:bg-red-100 text-red-700 rounded-xl font-medium text-sm transition-colors"
                        >
                          ❌ Rifiuta
                        </button>
                        <button 
                          onClick={() => { setModalAction('accepted'); setShowModal(true) }}
                          className="py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-semibold text-sm transition-colors"
                        >
                          ✅ Accetta
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100">
                        <p className={`font-medium text-sm ${
                          selectedApp.stato === 'accepted' ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {selectedApp.stato === 'accepted' ? '✅ Nel team' : '❌ Rifiutata'}
                        </p>
                        <button 
                          onClick={() => { setModalAction('pending'); setShowModal(true) }}
                          className="text-xs text-gray-500 hover:text-gray-700 underline"
                        >
                          Riporta in attesa
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="bg-white rounded-2xl border-2 border-dashed border-gray-200 h-full min-h-[400px] flex items-center justify-center">
                    <div className="text-center">
                      <span className="text-5xl block mb-3">👤</span>
                      <p className="text-gray-500 font-medium">Seleziona una candidatura</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Tab: Team */}
        {activeTab === 'team' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Membri del Team ({teamMembers.length})</h2>
              <button
                onClick={handleBroadcast}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium text-sm transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                Email a tutti
              </button>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {teamMembers.map(member => (
                <div key={member.id} className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
                  <div className="flex items-start gap-3 mb-4">
                    <img 
                      src={member.studente?.avatar_url || '/default-avatar.png'} 
                      alt=""
                      className="w-12 h-12 rounded-xl object-cover"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 truncate">
                        {member.studente?.nome} {member.studente?.cognome}
                      </p>
                      <p className={`text-xs font-medium ${
                        member.ruolo === 'admin' ? 'text-blue-600' : 'text-gray-400'
                      }`}>
                        {member.ruolo === 'admin' ? '🛡️ Admin' : '👤 Membro'}
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    {member.ruolo !== 'admin' ? (
                      <button
                        onClick={() => handleRoleChange(member.id, 'admin')}
                        className="flex-1 py-2 text-xs font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      >
                        Promuovi Admin
                      </button>
                    ) : (
                      <button
                        onClick={() => handleRoleChange(member.id, 'membro')}
                        className="flex-1 py-2 text-xs font-medium text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                      >
                        Rimuovi Admin
                      </button>
                    )}
                    <button
                      onClick={() => handleKickMember(member.id)}
                      className="py-2 px-3 text-xs font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      ❌
                    </button>
                  </div>
                </div>
              ))}

              {teamMembers.length === 0 && (
                <div className="col-span-full bg-white rounded-2xl border-2 border-dashed border-gray-200 p-8 text-center">
                  <span className="text-4xl block mb-2">👥</span>
                  <p className="text-gray-500">Nessun membro nel team</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab: Impostazioni */}
        {activeTab === 'impostazioni' && (
          <div className="space-y-6 max-w-2xl">
            
            {/* Modifica Progetto */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">✏️ Modifica Progetto</h3>
              
              {editSuccess && (
                <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 rounded-xl text-sm font-medium flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Modifiche salvate con successo!
                </div>
              )}
              
              <div className="space-y-4">
                {/* Immagine di copertina */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Immagine di Copertina</label>
                  <div className="relative">
                    <div 
                      className="relative border-2 border-dashed border-gray-200 rounded-xl overflow-hidden hover:border-gray-300 transition-colors group cursor-pointer"
                      style={{ aspectRatio: '16/9' }}
                    >
                      <input 
                        type="file" 
                        accept="image/*" 
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" 
                        onChange={handleCoverChange}
                      />
                      {coverPreview ? (
                        <>
                          <img src={coverPreview} alt="Preview" className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <span className="text-white font-medium text-sm bg-white/20 backdrop-blur-sm px-4 py-2 rounded-xl">
                              Cambia immagine
                            </span>
                          </div>
                        </>
                      ) : (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-50 group-hover:bg-gray-100 transition-colors">
                          <svg className="w-8 h-8 text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          <p className="text-sm text-gray-500">Clicca per caricare</p>
                        </div>
                      )}
                    </div>
                    {newCoverFile && (
                      <p className="text-xs text-blue-600 mt-2 font-medium">
                        📷 Nuova immagine selezionata: {newCoverFile.name}
                      </p>
                    )}
                  </div>
                </div>

                {/* Titolo */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Titolo Progetto</label>
                  <input
                    type="text"
                    value={editForm.titolo}
                    onChange={(e) => setEditForm({ ...editForm, titolo: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-50 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none font-medium"
                  />
                </div>

                {/* Descrizione */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Descrizione</label>
                  <textarea
                    rows={5}
                    value={editForm.descrizione}
                    onChange={(e) => setEditForm({ ...editForm, descrizione: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-50 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none resize-none"
                  />
                </div>

                <button
                  onClick={handleSaveEdit}
                  disabled={savingEdit}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {savingEdit ? (
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
            </div>

            {/* Link */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Link di Progetto</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">GitHub Repository</label>
                  <input
                    type="url"
                    value={linksForm.github}
                    onChange={(e) => setLinksForm({ ...linksForm, github: e.target.value })}
                    placeholder="https://github.com/..."
                    className="w-full px-4 py-3 bg-gray-50 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Google Drive</label>
                  <input
                    type="url"
                    value={linksForm.drive}
                    onChange={(e) => setLinksForm({ ...linksForm, drive: e.target.value })}
                    placeholder="https://drive.google.com/..."
                    className="w-full px-4 py-3 bg-gray-50 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none"
                  />
                </div>
                <button
                  onClick={handleSaveLinks}
                  disabled={savingLinks}
                  className="w-full py-3 bg-gray-900 hover:bg-gray-800 text-white rounded-xl font-medium transition-colors disabled:opacity-50"
                >
                  {savingLinks ? 'Salvataggio...' : 'Salva Link'}
                </button>
              </div>
            </div>

            {/* Stato progetto */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Stato Candidature</h3>
              <p className="text-sm text-gray-500 mb-4">
                {project.stato === 'aperto' 
                  ? 'Il progetto è aperto e accetta nuove candidature.'
                  : 'Il progetto è chiuso, nessuna nuova candidatura possibile.'
                }
              </p>
              <button
                onClick={handleToggleStatus}
                className={`w-full py-3 rounded-xl font-medium transition-colors ${
                  project.stato === 'aperto'
                    ? 'bg-amber-100 hover:bg-amber-200 text-amber-700'
                    : 'bg-green-100 hover:bg-green-200 text-green-700'
                }`}
              >
                {project.stato === 'aperto' ? '🔒 Chiudi Candidature' : '🔓 Riapri Candidature'}
              </button>
            </div>

            {/* Danger Zone */}
            <div className="bg-red-50 rounded-2xl border border-red-200 p-6">
              <h3 className="text-lg font-semibold text-red-700 mb-2">⚠️ Zona Pericolosa</h3>
              <p className="text-sm text-red-600 mb-4">
                Queste azioni sono irreversibili.
              </p>
              <button
                onClick={handleDeleteProject}
                className="w-full py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-medium transition-colors"
              >
                🗑️ Elimina Progetto
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal conferma */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <h3 className="text-xl font-bold text-gray-900 mb-2">Conferma azione</h3>
            <p className="text-gray-500 mb-6">
              {modalAction === 'accepted' && `Accettare ${selectedApp?.studente?.nome} nel team?`}
              {modalAction === 'rejected' && `Rifiutare la candidatura di ${selectedApp?.studente?.nome}?`}
              {modalAction === 'pending' && `Riportare ${selectedApp?.studente?.nome} in attesa?`}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowModal(false)}
                disabled={actionLoading}
                className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium transition-colors"
              >
                Annulla
              </button>
              <button
                onClick={handleAction}
                disabled={actionLoading}
                className={`flex-1 py-3 rounded-xl font-medium text-white transition-colors ${
                  modalAction === 'accepted' ? 'bg-green-600 hover:bg-green-700' :
                  modalAction === 'rejected' ? 'bg-red-600 hover:bg-red-700' :
                  'bg-amber-500 hover:bg-amber-600'
                }`}
              >
                {actionLoading ? '...' : 'Conferma'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}