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
  
  // Statistiche
  const [viewsCount, setViewsCount] = useState(0)
  const [viewsToday, setViewsToday] = useState(0)
  const [viewsThisWeek, setViewsThisWeek] = useState(0)
  
  // Colore dominante
  const [dominantColor, setDominantColor] = useState('239, 68, 68')
  
  // Tab e modali
  const [activeTab, setActiveTab] = useState<'candidature' | 'team' | 'statistiche' | 'impostazioni'>('candidature')
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
  
  // Gestione Immagine
  const [newCoverFile, setNewCoverFile] = useState<File | null>(null)
  const [coverPreview, setCoverPreview] = useState<string | null>(null)
  const [coverPositionY, setCoverPositionY] = useState(50) 
  const [coverZoom, setCoverZoom] = useState(1)
  const [savingEdit, setSavingEdit] = useState(false)
  const [editSuccess, setEditSuccess] = useState(false)

  // Estrai colore dominante
  const extractColor = (imageUrl: string) => {
    if (!imageUrl) return
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
      }
    }
    
    img.onerror = () => setDominantColor('239, 68, 68')
  }

  // Statistiche candidature
  const stats = {
    total: applications?.length || 0,
    pending: applications?.filter(a => a?.stato === 'pending').length || 0,
    accepted: applications?.filter(a => a?.stato === 'accepted').length || 0,
    rejected: applications?.filter(a => a?.stato === 'rejected').length || 0,
  }

  // Fetch statistiche visualizzazioni
  const fetchViewStats = async () => {
    if (!bandoId) return

    const { count: totalViews } = await (supabase
      .from('visualizzazione_bando' as any)
      .select('*', { count: 'exact', head: true })
      .eq('bando_id', bandoId) as any)

    setViewsCount(totalViews || 0)

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    const { count: todayViews } = await (supabase
      .from('visualizzazione_bando' as any)
      .select('*', { count: 'exact', head: true })
      .eq('bando_id', bandoId)
      .gte('created_at', today.toISOString()) as any)

    setViewsToday(todayViews || 0)

    const weekAgo = new Date()
    weekAgo.setDate(weekAgo.getDate() - 7)
    
    const { count: weekViews } = await (supabase
      .from('visualizzazione_bando' as any)
      .select('*', { count: 'exact', head: true })
      .eq('bando_id', bandoId)
      .gte('created_at', weekAgo.toISOString()) as any)

    setViewsThisWeek(weekViews || 0)
  }

  // Fetch dati
  useEffect(() => {
    const fetchData = async () => {
      if (!bandoId) return
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

      // Team members
      const members = appsData?.filter(a => a?.stato === 'accepted') || []
      setTeamMembers(members)

      // Fetch statistiche
      await fetchViewStats()

      setLoading(false)
    }

    fetchData()
  }, [bandoId, supabase])

  // Azioni candidatura
  const handleAction = async () => {
    if (!selectedApp || !modalAction) return
    setActionLoading(true)

    try {
      // 1. Aggiorna DB
      const { error } = await supabase
        .from('partecipazione')
        .update({ stato: modalAction })
        .eq('id', selectedApp.id)

      if (error) throw error;

      // 2. Aggiorna UI
      setApplications(apps => apps.map(app => 
        app.id === selectedApp.id ? { ...app, stato: modalAction } : app
      ))
      setSelectedApp((prev: any) => prev ? ({ ...prev, stato: modalAction }) : null)
      
      // LOGICA TEAM CORRETTA
      if (modalAction === 'accepted') {
        setTeamMembers(prev => {
          if (prev.some(m => m.id === selectedApp.id)) return prev;
          return [...prev, { ...selectedApp, stato: 'accepted' }];
        })
      } else {
        setTeamMembers(prev => prev.filter(m => m.id !== selectedApp.id))
      }

      // 3. Email (All'indirizzo VERO dello studente)
      if ((modalAction === 'accepted' || modalAction === 'rejected') && selectedApp.studente?.email) {
        const emailObject = {
          to: selectedApp.studente.email,
          subject: modalAction === 'accepted' 
            ? `🎉 Sei nel team! Candidatura Accettata per ${project?.titolo || 'il progetto'}` 
            : `Risposta alla tua candidatura per ${project?.titolo || 'il progetto'}`,
          message: modalAction === 'accepted'
            ? `Ottime notizie! Il creatore ha accettato la tua candidatura per il progetto "${project?.titolo || ''}". Entra ora in StudentUP per accedere al Workspace del team e iniziare a collaborare.`
            : `Ti informiamo che, sfortunatamente, la tua candidatura per il progetto "${project?.titolo || ''}" non è stata selezionata. Non scoraggiarti, ci sono tante altre idee su StudentUP!`,
          projectName: project?.titolo || 'Progetto StudentUP'
        }

        const res = await fetch('/api/send-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(emailObject)
        })
        
        if (!res.ok) {
          console.warn("Errore server email, controlla i log di Vercel/Resend.")
        }
      }

    } catch (err) {
      console.error("Errore durante l'azione:", err)
      alert("C'è stato un errore nell'aggiornamento. Riprova.")
    } finally {
      setActionLoading(false)
      setShowModal(false)
      setModalAction(null)
    }
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
    if (!window.confirm(nuovoStato === 'chiuso' ? "Chiudere le candidature?" : "Riaprire le candidature?")) return

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

  // Upload immagine a Supabase
  const uploadImage = async (file: File | Blob) => {
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.jpg`

    const { error: uploadError } = await supabase.storage
      .from('project-media')
      .upload(fileName, file)

    if (uploadError) throw uploadError
    const { data } = supabase.storage.from('project-media').getPublicUrl(fileName)
    return data.publicUrl
  }

  // Gestione selezione immagine
  const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setNewCoverFile(file)
      const previewUrl = URL.createObjectURL(file)
      setCoverPreview(previewUrl)
      setCoverPositionY(50)
      setCoverZoom(1)
    }
  }

  const generateCroppedFile = (imageUrl: string, positionY: number, zoom: number): Promise<File> => {
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.crossOrigin = 'Anonymous'
      img.onload = () => {
        const canvas = document.createElement('canvas')
        const targetRatio = 16 / 9
        
        canvas.width = 1200
        canvas.height = Math.round(1200 / targetRatio)
        
        const ctx = canvas.getContext('2d')
        if (!ctx) return reject(new Error("Canvas context missing"))

        const sourceWidth = img.width / zoom
        const sourceHeight = img.height / zoom

        let cropWidth = sourceWidth
        let cropHeight = sourceHeight
        
        if (sourceWidth / sourceHeight > targetRatio) {
          cropHeight = sourceHeight
          cropWidth = sourceHeight * targetRatio
        } else {
          cropWidth = sourceWidth
          cropHeight = sourceWidth / targetRatio
        }

        const sourceX = (img.width - cropWidth) / 2
        const sourceY = (img.height - cropHeight) * (positionY / 100)

        ctx.drawImage(img, sourceX, sourceY, cropWidth, cropHeight, 0, 0, canvas.width, canvas.height)

        canvas.toBlob((blob) => {
          if (blob) resolve(new File([blob], "cover-cropped.jpg", { type: "image/jpeg" }))
          else reject(new Error("Blob creation failed"))
        }, 'image/jpeg', 0.9)
      }
      img.onerror = () => reject(new Error("Image load failed"))
      img.src = imageUrl
    })
  }

  const handleSaveEdit = async () => {
    setSavingEdit(true)
    setEditSuccess(false)

    try {
      let finalFotoUrl = editForm.foto_url

      if (coverPreview && (newCoverFile || coverPositionY !== 50 || coverZoom !== 1)) {
        const croppedFile = await generateCroppedFile(coverPreview, coverPositionY, coverZoom)
        finalFotoUrl = await uploadImage(croppedFile)
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
        setCoverPositionY(50)
        setCoverZoom(1)
        
        if (finalFotoUrl) {
          setCoverPreview(finalFotoUrl)
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

  // Email a tutti
  const handleBroadcast = () => {
    const teamEmails = teamMembers
      .filter(m => m.studente?.email)
      .map(m => m.studente.email)
    
    if (teamEmails.length > 0) {
      const bcc = teamEmails.join(',')
      const subject = encodeURIComponent(`[${project?.titolo}] Aggiornamento dal team`)
      const body = encodeURIComponent(`Ciao team!\n\n`)
      
      window.open(
        `https://mail.google.com/mail/?view=cm&fs=1&bcc=${bcc}&su=${subject}&body=${body}`,
        '_blank'
      )
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: `rgba(${dominantColor}, 0.08)` }}>
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-gray-300 border-t-red-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-500 font-medium">Caricamento...</p>
        </div>
      </div>
    )
  }

  if (!project) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Progetto non trovato</p>
      </div>
    )
  }

  const filteredApps = applications?.filter(a => a?.stato === filter) || []

  const cardStyle = "bg-white rounded-2xl border-2 border-gray-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
  const cardStyleLight = "bg-white rounded-2xl border-2 border-gray-800 shadow-[3px_3px_0px_0px_rgba(0,0,0,0.8)]"

  return (
    <div 
      className="min-h-screen pb-20 transition-colors duration-500"
      style={{ 
        background: `linear-gradient(180deg, rgba(${dominantColor}, 0.35) 0%, rgba(${dominantColor}, 0.05) 100%)` 
      }}
    >
      {/* Header */}
      <div className="bg-white/90 backdrop-blur-sm border-b-2 border-gray-900 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => router.push(`/dashboard/my_teams/${bandoId}`)}
                className="p-2 hover:bg-gray-100 rounded-xl text-gray-900 border-2 border-gray-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div>
                <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">Gestione Progetto</p>
                <h1 className="text-lg font-black text-gray-900">{project.titolo}</h1>
              </div>
            </div>

            <span className={`px-4 py-2 rounded-xl text-xs font-black border-2 ${
              project.stato === 'chiuso' 
                ? 'bg-gray-100 text-gray-600 border-gray-400' 
                : 'bg-green-100 text-green-700 border-green-600'
            }`}>
              {project.stato === 'chiuso' ? '🔒 Chiuso' : '🟢 Aperto'}
            </span>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mt-4 overflow-x-auto pb-1">
            {[
              { id: 'candidature' as const, label: 'Candidature', icon: '📨', count: stats.pending },
              { id: 'team' as const, label: 'Team', icon: '👥', count: stats.accepted },
              { id: 'statistiche' as const, label: 'Statistiche', icon: '📊' },
              { id: 'impostazioni' as const, label: 'Impostazioni', icon: '⚙️' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm transition-all whitespace-nowrap border-2 ${
                  activeTab === tab.id
                    ? 'bg-gray-900 text-white border-gray-900 shadow-none'
                    : 'bg-white text-gray-600 border-gray-300 hover:border-gray-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,0.3)] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'
                }`}
              >
                <span>{tab.icon}</span>
                {tab.label}
                {tab.count !== undefined && tab.count > 0 && (
                  <span className={`px-2 py-0.5 rounded-full text-xs font-black ${
                    activeTab === tab.id ? 'bg-red-500 text-white' : 'bg-red-100 text-red-600'
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
        
        {/* Tab: Candidature */}
        {activeTab === 'candidature' && (
          <div className="space-y-6">
            <div className="grid grid-cols-3 gap-4">
              <div className={`${cardStyleLight} p-4`}>
                <p className="text-2xl font-black text-amber-600">{stats.pending}</p>
                <p className="text-xs text-gray-500 font-bold">In attesa</p>
              </div>
              <div className={`${cardStyleLight} p-4`}>
                <p className="text-2xl font-black text-green-600">{stats.accepted}</p>
                <p className="text-xs text-gray-500 font-bold">Accettate</p>
              </div>
              <div className={`${cardStyleLight} p-4`}>
                <p className="text-2xl font-black text-gray-600">{stats.rejected}</p>
                <p className="text-xs text-gray-500 font-bold">Rifiutate</p>
              </div>
            </div>

            <div className="flex gap-2 overflow-x-auto pb-2">
              {[
                { id: 'pending' as const, label: 'In Attesa', count: stats.pending, color: 'amber' },
                { id: 'accepted' as const, label: 'Accettate', count: stats.accepted, color: 'green' },
                { id: 'rejected' as const, label: 'Rifiutate', count: stats.rejected, color: 'gray' },
              ].map(f => (
                <button
                  key={f.id}
                  onClick={() => setFilter(f.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm whitespace-nowrap transition-all border-2 ${
                    filter === f.id
                      ? f.color === 'amber' ? 'bg-amber-500 text-white border-amber-700 shadow-[3px_3px_0px_0px_rgba(180,83,9,1)]' :
                        f.color === 'green' ? 'bg-green-500 text-white border-green-700 shadow-[3px_3px_0px_0px_rgba(21,128,61,1)]' :
                        'bg-gray-700 text-white border-gray-900 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]'
                      : 'bg-white border-gray-300 text-gray-600 hover:border-gray-500'
                  }`}
                >
                  {f.label}
                  <span className={`px-2 py-0.5 rounded-full text-xs font-black ${
                    filter === f.id ? 'bg-white/30' : 'bg-gray-100'
                  }`}>
                    {f.count}
                  </span>
                </button>
              ))}
            </div>

            <div className="grid lg:grid-cols-3 gap-6">
              <div className="lg:col-span-1 space-y-3 max-h-[600px] overflow-y-auto pr-2">
                {filteredApps.length === 0 ? (
                  <div className={`${cardStyle} p-8 text-center`}>
                    <span className="text-4xl block mb-2">📭</span>
                    <p className="text-gray-500 font-bold text-sm">Nessuna candidatura</p>
                  </div>
                ) : (
                  filteredApps.map(app => (
                    <button
                      key={app.id}
                      onClick={() => setSelectedApp(app)}
                      className={`w-full text-left p-4 rounded-2xl border-2 transition-all ${
                        selectedApp?.id === app.id
                          ? 'border-gray-900 bg-gray-900 text-white shadow-none translate-x-1 translate-y-1'
                          : 'border-gray-800 bg-white hover:border-gray-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px]'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <img 
                          src={app.studente?.avatar_url || '/default-avatar.png'} 
                          alt=""
                          className="w-10 h-10 rounded-xl object-cover border-2 border-gray-900"
                        />
                        <div className="flex-1 min-w-0">
                          <p className={`font-bold truncate ${selectedApp?.id === app.id ? 'text-white' : 'text-gray-900'}`}>
                            {app.studente?.nome} {app.studente?.cognome}
                          </p>
                          <p className={`text-xs font-medium ${selectedApp?.id === app.id ? 'text-gray-400' : 'text-gray-500'}`}>
                            {new Date(app.data_candidatura).toLocaleDateString('it-IT')}
                          </p>
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </div>

              <div className="lg:col-span-2">
                {selectedApp ? (
                  <div className={`${cardStyle} p-6`}>
                    <div className="flex items-start gap-4 mb-6 pb-6 border-b-2 border-gray-200">
                      <img 
                        src={selectedApp.studente?.avatar_url || '/default-avatar.png'} 
                        alt=""
                        className="w-16 h-16 rounded-2xl object-cover border-2 border-gray-900"
                      />
                      <div className="flex-1">
                        <h3 className="text-xl font-black text-gray-900">
                          {selectedApp.studente?.nome} {selectedApp.studente?.cognome}
                        </h3>
                        <p className="text-sm text-gray-500 font-medium">
                          {selectedApp.studente?.studente_corso?.[0]?.corso?.nome || 'Corso non specificato'}
                        </p>
                        <Link 
                          href={`/dashboard/user/${selectedApp.studente?.id}`}
                          className="inline-block mt-2 text-xs font-bold text-blue-600 hover:text-blue-700 underline"
                        >
                          Vedi profilo completo →
                        </Link>
                      </div>
                    </div>

                    {selectedApp.studente?.bio && (
                      <div className="mb-6">
                        <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Bio</p>
                        <p className="text-sm text-gray-600 italic bg-gray-50 p-3 rounded-xl border border-gray-200">"{selectedApp.studente.bio}"</p>
                      </div>
                    )}

                    <div className="mb-6">
                      <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Messaggio di candidatura</p>
                      <div className="bg-gray-50 rounded-xl p-4 border-2 border-gray-200">
                        <p className="text-gray-700 whitespace-pre-wrap font-medium">
                          {selectedApp.messaggio || <span className="italic text-gray-400">Nessun messaggio</span>}
                        </p>
                      </div>
                    </div>

                    {selectedApp.stato === 'pending' ? (
                      <div className="grid grid-cols-2 gap-3">
                        <button 
                          onClick={() => { setModalAction('rejected'); setShowModal(true) }}
                          className="py-3 bg-red-50 hover:bg-red-100 text-red-700 rounded-xl font-bold text-sm transition-colors border-2 border-red-300 hover:border-red-500"
                        >
                          ❌ Rifiuta
                        </button>
                        <button 
                          onClick={() => { setModalAction('accepted'); setShowModal(true) }}
                          className="py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold text-sm transition-colors border-2 border-green-800 shadow-[3px_3px_0px_0px_rgba(21,128,61,1)] hover:shadow-none hover:translate-x-[3px] hover:translate-y-[3px]"
                        >
                          ✅ Accetta
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border-2 border-gray-200">
                        <p className={`font-bold text-sm ${
                          selectedApp.stato === 'accepted' ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {selectedApp.stato === 'accepted' ? '✅ Nel team' : '❌ Rifiutata'}
                        </p>
                        <button 
                          onClick={() => { setModalAction('pending'); setShowModal(true) }}
                          className="text-xs text-gray-500 hover:text-gray-700 font-bold underline"
                        >
                          Riporta in attesa
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="bg-white rounded-2xl border-2 border-dashed border-gray-400 h-full min-h-[400px] flex items-center justify-center">
                    <div className="text-center">
                      <span className="text-5xl block mb-3">👤</span>
                      <p className="text-gray-500 font-bold">Seleziona una candidatura</p>
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
              <h2 className="text-lg font-black text-gray-900">👥 Membri del Team ({teamMembers.length})</h2>
              <button
                onClick={handleBroadcast}
                disabled={teamMembers.length === 0}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold text-sm transition-all border-2 border-red-800 shadow-[3px_3px_0px_0px_rgba(127,29,29,1)] hover:shadow-none hover:translate-x-[3px] hover:translate-y-[3px] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20 18h-2V9.25L12 13 6 9.25V18H4V6h1.2l6.8 4.25L18.8 6H20m0-2H4c-1.11 0-2 .89-2 2v12a2 2 0 002 2h16a2 2 0 002-2V6a2 2 0 00-2-2z"/>
                </svg>
                Apri Gmail
              </button>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {teamMembers.map(member => (
                <div key={member.id} className={`${cardStyle} p-4`}>
                  <div className="flex items-start gap-3 mb-4">
                    <img 
                      src={member.studente?.avatar_url || '/default-avatar.png'} 
                      alt=""
                      className="w-12 h-12 rounded-xl object-cover border-2 border-gray-900"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-gray-900 truncate">
                        {member.studente?.nome} {member.studente?.cognome}
                      </p>
                      <p className={`text-xs font-bold ${
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
                        className="flex-1 py-2 text-xs font-bold text-blue-600 hover:bg-blue-50 rounded-lg transition-colors border border-blue-200"
                      >
                        Promuovi Admin
                      </button>
                    ) : (
                      <button
                        onClick={() => handleRoleChange(member.id, 'membro')}
                        className="flex-1 py-2 text-xs font-bold text-amber-600 hover:bg-amber-50 rounded-lg transition-colors border border-amber-200"
                      >
                        Rimuovi Admin
                      </button>
                    )}
                    <button
                      onClick={() => handleKickMember(member.id)}
                      className="py-2 px-3 text-xs font-bold text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-red-200"
                    >
                      ❌
                    </button>
                  </div>
                </div>
              ))}

              {teamMembers.length === 0 && (
                <div className="col-span-full bg-white rounded-2xl border-2 border-dashed border-gray-400 p-8 text-center">
                  <span className="text-4xl block mb-2">👥</span>
                  <p className="text-gray-500 font-bold">Nessun membro nel team</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab: Statistiche */}
        {activeTab === 'statistiche' && (
          <div className="space-y-6">
            <h2 className="text-lg font-black text-gray-900">📊 Statistiche Progetto</h2>
            
            <div className="grid sm:grid-cols-3 gap-4">
              <div className={`${cardStyle} p-6`}>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center border-2 border-blue-600">
                    <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-3xl font-black text-gray-900">{viewsCount}</p>
                    <p className="text-xs text-gray-500 font-bold">Visualizzazioni totali</p>
                  </div>
                </div>
              </div>

              <div className={`${cardStyle} p-6`}>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center border-2 border-green-600">
                    <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-3xl font-black text-gray-900">{viewsToday}</p>
                    <p className="text-xs text-gray-500 font-bold">Visite oggi</p>
                  </div>
                </div>
              </div>

              <div className={`${cardStyle} p-6`}>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center border-2 border-purple-600">
                    <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-3xl font-black text-gray-900">{viewsThisWeek}</p>
                    <p className="text-xs text-gray-500 font-bold">Visite questa settimana</p>
                  </div>
                </div>
              </div>
            </div>

            <div className={`${cardStyle} p-6`}>
              <h3 className="text-base font-black text-gray-900 mb-4">📈 Tassi di Conversione</h3>
              <div className="grid sm:grid-cols-2 gap-6">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-gray-600 font-medium">Visite → Candidature</span>
                    <span className="text-sm font-black text-gray-900">
                      {viewsCount > 0 ? ((stats.total / viewsCount) * 100).toFixed(1) : 0}%
                    </span>
                  </div>
                  <div className="h-3 bg-gray-100 rounded-full overflow-hidden border-2 border-gray-300">
                    <div 
                      className="h-full bg-blue-500 rounded-full transition-all"
                      style={{ width: `${viewsCount > 0 ? Math.min((stats.total / viewsCount) * 100, 100) : 0}%` }}
                    />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-gray-600 font-medium">Candidature → Accettate</span>
                    <span className="text-sm font-black text-gray-900">
                      {stats.total > 0 ? ((stats.accepted / stats.total) * 100).toFixed(1) : 0}%
                    </span>
                  </div>
                  <div className="h-3 bg-gray-100 rounded-full overflow-hidden border-2 border-gray-300">
                    <div 
                      className="h-full bg-green-500 rounded-full transition-all"
                      style={{ width: `${stats.total > 0 ? (stats.accepted / stats.total) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-gray-900 rounded-2xl p-6 text-white border-2 border-gray-700 shadow-[4px_4px_0px_0px_rgba(55,65,81,1)]">
              <h3 className="text-base font-black mb-4">📋 Riepilogo</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div>
                  <p className="text-2xl font-black">{viewsCount}</p>
                  <p className="text-xs text-gray-400 font-bold">Visite</p>
                </div>
                <div>
                  <p className="text-2xl font-black">{stats.total}</p>
                  <p className="text-xs text-gray-400 font-bold">Candidature</p>
                </div>
                <div>
                  <p className="text-2xl font-black">{stats.accepted}</p>
                  <p className="text-xs text-gray-400 font-bold">Membri</p>
                </div>
                <div>
                  <p className="text-2xl font-black">{stats.pending}</p>
                  <p className="text-xs text-gray-400 font-bold">In attesa</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab: Impostazioni */}
        {activeTab === 'impostazioni' && (
          <div className="space-y-6 max-w-2xl">
            
            {/* Modifica Progetto */}
            <div className={`${cardStyle} p-6`}>
              <h3 className="text-lg font-black text-gray-900 mb-4">✏️ Modifica Progetto</h3>
              
              {editSuccess && (
                <div className="mb-4 p-3 bg-green-50 border-2 border-green-500 text-green-700 rounded-xl text-sm font-bold flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Modifiche salvate con successo!
                </div>
              )}
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Immagine di Copertina</label>
                  
                  <div 
                    className="relative border-2 border-dashed border-gray-400 rounded-xl overflow-hidden hover:border-gray-900 transition-colors group cursor-pointer bg-gray-50"
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
                        <img 
                          src={coverPreview} 
                          alt="Preview" 
                          className="w-full h-full object-cover transition-all" 
                          style={{ 
                            objectPosition: `center ${coverPositionY}%`,
                            transform: `scale(${coverZoom})`
                          }} 
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                          <span className="text-white font-bold text-sm bg-gray-900 px-4 py-2 rounded-xl border-2 border-white">
                            Sostituisci Immagine
                          </span>
                        </div>
                      </>
                    ) : (
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <svg className="w-10 h-10 text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <p className="text-sm text-gray-500 font-bold">Clicca per caricare il banner</p>
                      </div>
                    )}
                  </div>

                  {coverPreview && (
                    <div className="mt-4 p-4 bg-white/60 border-2 border-gray-300 rounded-xl backdrop-blur-sm animate-in fade-in zoom-in duration-300 space-y-4">
                      <div>
                        <label className="block text-sm font-bold text-gray-900 mb-2 flex items-center gap-2">
                          <span>↕️</span> Scorri per l'inquadratura verticale
                        </label>
                        <input 
                          type="range" 
                          min="0" 
                          max="100" 
                          value={coverPositionY} 
                          onChange={(e) => setCoverPositionY(Number(e.target.value))}
                          className="w-full h-2 bg-gray-300 rounded-lg appearance-none cursor-pointer accent-gray-900"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-gray-900 mb-2 flex items-center gap-2">
                          <span>🔍</span> Regola lo Zoom
                        </label>
                        <input 
                          type="range" 
                          min="1" 
                          max="3" 
                          step="0.05"
                          value={coverZoom} 
                          onChange={(e) => setCoverZoom(Number(e.target.value))}
                          className="w-full h-2 bg-gray-300 rounded-lg appearance-none cursor-pointer accent-gray-900"
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Titolo Progetto</label>
                  <input
                    type="text"
                    value={editForm.titolo}
                    onChange={(e) => setEditForm({ ...editForm, titolo: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-50 text-gray-900 rounded-xl border-2 border-gray-300 focus:border-gray-900 outline-none font-bold"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Descrizione</label>
                  <textarea
                    rows={5}
                    value={editForm.descrizione}
                    onChange={(e) => setEditForm({ ...editForm, descrizione: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-50 text-gray-900 rounded-xl border-2 border-gray-300 focus:border-gray-900 outline-none resize-none font-medium"
                  />
                </div>

                <button
                  onClick={handleSaveEdit}
                  disabled={savingEdit}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-2 border-2 border-blue-800 shadow-[4px_4px_0px_0px_rgba(30,64,175,1)] hover:shadow-none hover:translate-x-1 hover:translate-y-1"
                >
                  {savingEdit ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Salvataggio in corso...
                    </>
                  ) : 'Salva Modifiche'}
                </button>
              </div>
            </div>

            {/* Link */}
            <div className={`${cardStyle} p-6`}>
              <h3 className="text-lg font-black text-gray-900 mb-4">🔗 Link di Progetto</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">GitHub Repository</label>
                  <input
                    type="url"
                    value={linksForm.github}
                    onChange={(e) => setLinksForm({ ...linksForm, github: e.target.value })}
                    placeholder="https://github.com/..."
                    className="w-full px-4 py-3 bg-gray-50 text-gray-900 rounded-xl border-2 border-gray-300 focus:border-gray-900 outline-none font-bold"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Google Drive</label>
                  <input
                    type="url"
                    value={linksForm.drive}
                    onChange={(e) => setLinksForm({ ...linksForm, drive: e.target.value })}
                    placeholder="https://drive.google.com/..."
                    className="w-full px-4 py-3 bg-gray-50 text-gray-900 rounded-xl border-2 border-gray-300 focus:border-gray-900 outline-none font-bold"
                  />
                </div>
                <button
                  onClick={handleSaveLinks}
                  disabled={savingLinks}
                  className="w-full py-3 bg-gray-900 hover:bg-gray-800 text-white rounded-xl font-bold transition-all disabled:opacity-50 border-2 border-gray-700 shadow-[4px_4px_0px_0px_rgba(55,65,81,1)] hover:shadow-none hover:translate-x-1 hover:translate-y-1"
                >
                  {savingLinks ? 'Salvataggio...' : 'Salva Link'}
                </button>
              </div>
            </div>

            {/* Stato */}
            <div className={`${cardStyle} p-6`}>
              <h3 className="text-lg font-black text-gray-900 mb-4">📋 Stato Candidature</h3>
              <p className="text-sm text-gray-500 mb-4 font-medium">
                {project.stato === 'aperto' 
                  ? 'Il progetto è aperto e accetta nuove candidature.'
                  : 'Il progetto è chiuso, nessuna nuova candidatura possibile.'}
              </p>
              <button
                onClick={handleToggleStatus}
                className={`w-full py-3 rounded-xl font-bold transition-all border-2 ${
                  project.stato === 'aperto'
                    ? 'bg-amber-100 hover:bg-amber-200 text-amber-700 border-amber-500'
                    : 'bg-green-100 hover:bg-green-200 text-green-700 border-green-500'
                }`}
              >
                {project.stato === 'aperto' ? '🔒 Chiudi Candidature' : '🔓 Riapri Candidature'}
              </button>
            </div>

            {/* Danger Zone */}
            <div className="bg-red-50 rounded-2xl border-2 border-red-500 p-6 shadow-[4px_4px_0px_0px_rgba(185,28,28,1)]">
              <h3 className="text-lg font-black text-red-700 mb-2">⚠️ Zona Pericolosa</h3>
              <p className="text-sm text-red-600 mb-4 font-medium">Questa azione è irreversibile.</p>
              <button
                onClick={handleDeleteProject}
                className="w-full py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold transition-all border-2 border-red-800"
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
          <div className="bg-white rounded-2xl p-6 max-w-md w-full border-2 border-gray-900 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
            <h3 className="text-xl font-black text-gray-900 mb-2">Conferma azione</h3>
            <p className="text-gray-500 mb-6 font-medium">
              {modalAction === 'accepted' && `Accettare ${selectedApp?.studente?.nome} nel team?`}
              {modalAction === 'rejected' && `Rifiutare la candidatura di ${selectedApp?.studente?.nome}?`}
              {modalAction === 'pending' && `Riportare ${selectedApp?.studente?.nome} in attesa?`}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowModal(false)}
                disabled={actionLoading}
                className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-bold border-2 border-gray-300"
              >
                Annulla
              </button>
              <button
                onClick={handleAction}
                disabled={actionLoading}
                className={`flex-1 py-3 rounded-xl font-bold text-white border-2 ${
                  modalAction === 'accepted' ? 'bg-green-600 hover:bg-green-700 border-green-800' :
                  modalAction === 'rejected' ? 'bg-red-600 hover:bg-red-700 border-red-800' :
                  'bg-amber-500 hover:bg-amber-600 border-amber-700'
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
