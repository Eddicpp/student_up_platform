'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import SuperAvatar from '@/components/SuperAvatar'

export default function ManageApplicationPage() {
  const params = useParams()
  const router = useRouter()
  const bandoId = params?.id as string
  const supabase = createClient()

  // STATI
  const [project, setProject] = useState<any>(null)
  const [applications, setApplications] = useState<any[]>([])
  const [selectedApp, setSelectedApp] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  
  // STATO FILTRO E MODAL
  const [filter, setFilter] = useState<'pending' | 'accepted' | 'rejected'>('pending')
  const [showModal, setShowModal] = useState(false)
  const [modalAction, setModalAction] = useState<'accepted' | 'rejected' | 'pending' | null>(null)

  // STATISTICHE DERIVATE
  const stats = {
    total: applications.length,
    pending: applications.filter(a => a.stato === 'pending').length,
    accepted: applications.filter(a => a.stato === 'accepted').length,
  }

  // FETCH DATI
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      
      // 1. Prendi il Progetto
      const { data: projectData } = await supabase
        .from('bando')
        .select('*')
        .eq('id', bandoId)
        .single()
      
      if (projectData) setProject(projectData)

      // 2. Prendi le Candidature (Includendo l'email per il Broadcast!)
      const { data: appsData } = await supabase
        .from('partecipazione')
        .select(`
          *,
          studente:studente_id ( id, nome, cognome, avatar_url, bio, email )
        `)
        .eq('bando_id', bandoId)
        .order('data_candidatura', { ascending: false })

      if (appsData) setApplications(appsData)
      setLoading(false)
    }

    if (bandoId) fetchData()
  }, [bandoId, supabase])

  // --- AZIONI EXTRA: BROADCAST ED ELIMINAZIONE ---

  const handleBroadcast = () => {
    // Prende le email di tutti i membri 'accepted'
    const teamEmails = applications
      .filter(a => a.stato === 'accepted' && a.studente?.email)
      .map(a => a.studente.email)
      .join(',') // Unisce le email separate da virgola (BCC standard)
    
    if (!teamEmails) {
      alert("⚠️ Nessun membro confermato nel team a cui inviare il messaggio!")
      return
    }

    // Apre il client di posta predefinito con le mail in Copia Nascosta (BCC)
    const subject = encodeURIComponent(`Aggiornamento Team: ${project?.titolo}`)
    window.location.href = `mailto:?bcc=${teamEmails}&subject=${subject}`
  }

  const handleDeleteProject = async () => {
    const confirmation = prompt(`⚠️ ATTENZIONE: Stai per eliminare definitivamente il progetto "${project?.titolo}".\n\nScrivi ELIMINA per confermare:`)
    
    if (confirmation === 'ELIMINA') {
      const { error } = await supabase.from('bando').delete().eq('id', bandoId)
      if (!error) {
        alert("Progetto eliminato con successo.")
        router.push('/dashboard')
      } else {
        alert("Errore durante l'eliminazione: " + error.message)
      }
    }
  }

  // --- AZIONI CANDIDATURA ---
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
    } else {
      alert("Errore: " + error.message)
    }
    
    setActionLoading(false)
    setShowModal(false)
  }

  if (loading) return <div className="p-20 text-center font-black animate-pulse text-red-800">CARICAMENTO QUARTIER GENERALE...</div>
  if (!project) return <div className="p-20 text-center font-black">Progetto non trovato.</div>

  const filteredApps = applications.filter(a => a.stato === filter)

  return (
    <div className="max-w-7xl mx-auto pb-20 px-4 space-y-8">
      
      {/* 🚀 1. HERO BANNER E STATISTICHE */}
      <div className="relative rounded-[3rem] overflow-hidden shadow-2xl border-4 border-black bg-black group">
        
        {/* Immagine di Copertina Sfocata/Scurita */}
        <div className="absolute inset-0 opacity-40">
          {project.foto_url ? (
            <img src={project.foto_url} alt="Cover" className="w-full h-full object-cover blur-sm scale-105" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-red-900 to-black" />
          )}
        </div>

        <div className="relative z-10 p-8 md:p-12 flex flex-col md:flex-row gap-8 items-start md:items-end justify-between min-h-[300px]">
          
          <div className="space-y-4 flex-1">
            <span className="bg-red-600 text-white px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg">
              Quartier Generale
            </span>
            <h1 className="text-4xl md:text-6xl font-black text-white uppercase italic tracking-tighter leading-none drop-shadow-xl">
              {project.titolo}
            </h1>
            
            {/* 📊 Statistiche Rapide */}
            <div className="flex flex-wrap gap-4 pt-4">
              <div className="bg-white/10 backdrop-blur-md border border-white/20 px-6 py-3 rounded-2xl">
                <p className="text-white/60 text-[10px] font-black uppercase tracking-widest mb-1">Candidati Totali</p>
                <p className="text-3xl font-black text-white leading-none">{stats.total}</p>
              </div>
              <div className="bg-orange-500/20 backdrop-blur-md border border-orange-500/30 px-6 py-3 rounded-2xl">
                <p className="text-orange-200 text-[10px] font-black uppercase tracking-widest mb-1">Da Valutare</p>
                <p className="text-3xl font-black text-orange-400 leading-none">{stats.pending}</p>
              </div>
              <div className="bg-green-500/20 backdrop-blur-md border border-green-500/30 px-6 py-3 rounded-2xl">
                <p className="text-green-200 text-[10px] font-black uppercase tracking-widest mb-1">Team Attuale</p>
                <p className="text-3xl font-black text-green-400 leading-none">{stats.accepted}</p>
              </div>
            </div>
          </div>

          {/* Bottoni Azione Progetto */}
          <div className="flex flex-col gap-3 w-full md:w-auto">
            {/* ✉️ Broadcast Message */}
            <button 
              onClick={handleBroadcast}
              className="flex items-center justify-center gap-2 bg-white text-black font-black uppercase tracking-widest text-xs px-6 py-4 rounded-2xl hover:bg-gray-200 transition-colors shadow-xl"
            >
              ✉️ Invia Email al Team
            </button>
            <div className="flex gap-3">
              <Link 
                href={`/dashboard/create-project?edit=${project.id}`}
                className="flex-1 text-center bg-white/10 backdrop-blur-md text-white font-black uppercase tracking-widest text-xs px-6 py-4 rounded-2xl border border-white/20 hover:bg-white/20 transition-colors"
              >
                ✏️ Modifica
              </Link>
              <button 
                onClick={handleDeleteProject}
                className="flex-1 bg-red-950/50 backdrop-blur-md text-red-400 font-black uppercase tracking-widest text-xs px-6 py-4 rounded-2xl border border-red-900 hover:bg-red-600 hover:text-white hover:border-red-600 transition-colors"
              >
                🗑️ Elimina
              </button>
            </div>
          </div>

        </div>
      </div>


      {/* 🚀 2. GESTIONE CANDIDATI (Layout Originale con Filtri) */}
      <div className="flex gap-4 border-b-2 border-gray-200 pb-4 overflow-x-auto">
        <button onClick={() => setFilter('pending')} className={`text-xl font-black uppercase tracking-tighter transition-all whitespace-nowrap ${filter === 'pending' ? 'text-black' : 'text-gray-300 hover:text-gray-500'}`}>
          ⏳ In Attesa ({stats.pending})
        </button>
        <button onClick={() => setFilter('accepted')} className={`text-xl font-black uppercase tracking-tighter transition-all whitespace-nowrap ${filter === 'accepted' ? 'text-green-600' : 'text-gray-300 hover:text-gray-500'}`}>
          ✅ Accettati ({stats.accepted})
        </button>
        <button onClick={() => setFilter('rejected')} className={`text-xl font-black uppercase tracking-tighter transition-all whitespace-nowrap ${filter === 'rejected' ? 'text-red-800' : 'text-gray-300 hover:text-gray-500'}`}>
          ❌ Scartati ({stats.total - stats.pending - stats.accepted})
        </button>
      </div>

      <div className="grid lg:grid-cols-3 gap-8 min-h-[600px]">
        {/* LISTA SINISTRA */}
        <div className="lg:col-span-1 flex flex-col gap-4 max-h-[800px] overflow-y-auto pr-2 pb-10 custom-scrollbar">
          {filteredApps.length === 0 ? (
            <div className="text-center p-10 bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200">
              <span className="text-4xl block mb-2 opacity-50">👻</span>
              <p className="text-gray-400 font-bold uppercase text-xs tracking-widest">Nessun candidato in questa lista</p>
            </div>
          ) : (
            filteredApps.map((app) => (
              <button
                key={app.id}
                onClick={() => setSelectedApp(app)}
                className={`w-full text-left p-5 rounded-[2rem] border-4 transition-all duration-300 flex items-center gap-4 ${
                  selectedApp?.id === app.id 
                    ? 'border-black bg-black text-white shadow-xl scale-[1.02]' 
                    : 'border-transparent bg-white hover:bg-gray-50 hover:border-gray-200 shadow-sm'
                }`}
              >
                <div className="shrink-0">
                  {app.studente?.avatar_url ? (
                    <img src={app.studente.avatar_url} className="w-14 h-14 rounded-full object-cover border-2 border-white/20" />
                  ) : (
                    <div className="w-14 h-14 rounded-full bg-gray-200 flex items-center justify-center font-black text-gray-500 text-xl border-2 border-white/20">
                      {app.studente?.nome?.[0]}{app.studente?.cognome?.[0]}
                    </div>
                  )}
                </div>
                <div className="overflow-hidden">
                  <p className={`font-black uppercase tracking-tight truncate leading-none mb-1 ${selectedApp?.id === app.id ? 'text-white' : 'text-black'}`}>
                    {app.studente?.nome} {app.studente?.cognome}
                  </p>
                  <p className={`text-[10px] font-bold uppercase tracking-widest truncate ${selectedApp?.id === app.id ? 'text-gray-400' : 'text-gray-500'}`}>
                    {new Date(app.data_candidatura).toLocaleDateString('it-IT')}
                  </p>
                </div>
              </button>
            ))
          )}
        </div>

        {/* DETTAGLIO DESTRA */}
        <div className="lg:col-span-2">
          {selectedApp ? (
            <div className="bg-white h-full rounded-[4rem] border-4 border-gray-100 shadow-2xl p-8 md:p-12 animate-in fade-in slide-in-from-right-8 relative overflow-hidden">
              <div className="relative z-10 flex flex-col h-full">
                
                <div className="flex items-start justify-between mb-8 pb-8 border-b-2 border-gray-50">
                  <div className="flex items-center gap-6">
                    {selectedApp.studente?.avatar_url ? (
                      <img src={selectedApp.studente.avatar_url} className="w-24 h-24 rounded-[2rem] object-cover shadow-lg" />
                    ) : (
                      <div className="w-24 h-24 rounded-[2rem] bg-gray-100 flex items-center justify-center font-black text-gray-400 text-3xl shadow-inner">
                        {selectedApp.studente?.nome?.[0]}{selectedApp.studente?.cognome?.[0]}
                      </div>
                    )}
                    <div>
                      <h2 className="text-3xl font-black text-black uppercase tracking-tighter leading-none mb-2">
                        {selectedApp.studente?.nome} {selectedApp.studente?.cognome}
                      </h2>
                      <Link href={`/dashboard/user/${selectedApp.studente?.id}`} className="inline-block bg-gray-100 text-gray-600 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-black hover:text-white transition-colors">
                        Vedi Profilo Completo →
                      </Link>
                    </div>
                  </div>
                </div>

                <div className="flex-1">
                  <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4">Lettera di Presentazione / Ruolo</h3>
                  <div className="bg-gray-50 p-8 rounded-[2rem] border-2 border-gray-100">
                    <p className="text-gray-700 font-medium leading-relaxed whitespace-pre-wrap text-lg">
                      {selectedApp.messaggio || <span className="italic opacity-50">Nessun messaggio fornito dal candidato.</span>}
                    </p>
                  </div>
                </div>

                <div className="pt-8 mt-8 border-t-2 border-gray-50">
                  {selectedApp.stato === 'pending' ? (
                    <div className="grid grid-cols-2 gap-4">
                      <button 
                        onClick={() => { setModalAction('rejected'); setShowModal(true) }}
                        className="bg-red-50 text-red-800 py-6 rounded-[2rem] font-black uppercase tracking-widest text-sm hover:bg-red-800 hover:text-white transition-all border-2 border-transparent hover:border-red-900"
                      >
                        ❌ Scarta
                      </button>
                      <button 
                        onClick={() => { setModalAction('accepted'); setShowModal(true) }}
                        className="bg-green-500 text-white py-6 rounded-[2rem] font-black uppercase tracking-widest text-sm shadow-xl hover:bg-green-400 hover:scale-[1.02] active:scale-95 transition-all border-b-4 border-green-700 active:border-b-0"
                      >
                        ✅ Accetta nel Team
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between bg-black/5 p-6 rounded-[2rem] border-2 border-dashed border-black/10">
                      <p className={`font-black uppercase tracking-widest text-sm ${selectedApp.stato === 'accepted' ? 'text-green-600' : 'text-red-600'}`}>
                        {selectedApp.stato === 'accepted' ? "✅ Utente nel team" : "❌ Candidatura scartata"}
                      </p>
                      {/* Tasto per ripescare/cacciare qualcuno */}
                      <button 
                        onClick={() => { setModalAction('pending'); setShowModal(true) }}
                        className="text-[10px] font-black text-gray-500 hover:text-black uppercase tracking-widest underline underline-offset-4"
                      >
                        Riporta in Attesa
                      </button>
                    </div>
                  )}
                </div>

              </div>
            </div>
          ) : (
            <div className="bg-gray-50 h-full min-h-[500px] rounded-[4rem] border-4 border-dashed border-gray-200 flex flex-col items-center justify-center p-10 text-center">
              <span className="text-8xl block mb-6 opacity-20">👤</span>
              <h3 className="text-2xl font-black text-gray-400 uppercase italic">Seleziona un candidato</h3>
              <p className="text-gray-400 font-bold text-sm mt-2 max-w-sm">Clicca su uno dei profili nella lista a sinistra per leggere la sua presentazione.</p>
            </div>
          )}
        </div>
      </div>

      {/* MODAL DI CONFERMA */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-[3rem] p-10 max-w-md w-full shadow-2xl border-4 border-black animate-in zoom-in-95 duration-200">
            <h3 className="text-3xl font-black uppercase italic tracking-tighter mb-4 text-center">
              Sei sicuro?
            </h3>
            <p className="text-gray-600 font-medium text-center mb-8">
              Stai per {
                modalAction === 'accepted' ? 'ACCETTARE' : 
                modalAction === 'rejected' ? 'SCARTARE' : 
                'RIPORTARE IN ATTESA' // ✅ Gestisce il caso 'pending'
              } 
              <span className="font-black text-black block mt-1">
                {selectedApp?.studente?.nome} {selectedApp?.studente?.cognome}
              </span>
            </p>
            <div className="flex flex-col gap-3">
              <button 
                onClick={handleAction} disabled={actionLoading}
                className={`py-4 rounded-2xl font-black uppercase tracking-widest text-sm text-white transition-all ${
                  modalAction === 'accepted' ? 'bg-green-600 hover:bg-green-500' : 
                  modalAction === 'rejected' ? 'bg-red-800 hover:bg-red-700' : 'bg-orange-500 hover:bg-orange-400'
                }`}
              >
                {actionLoading ? 'Attendi...' : 'Sì, Conferma'}
              </button>
              <button 
                onClick={() => setShowModal(false)} disabled={actionLoading}
                className="py-4 rounded-2xl font-black uppercase tracking-widest text-sm bg-gray-100 text-gray-600 hover:bg-gray-200"
              >
                Annulla
              </button>
            </div>
          </div>
        </div>
      )}
      
    </div>
  )
}