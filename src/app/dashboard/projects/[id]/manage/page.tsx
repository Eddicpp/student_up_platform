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

  // STATI
  const [project, setProject] = useState<any>(null)
  const [applications, setApplications] = useState<any[]>([])
  const [selectedApp, setSelectedApp] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [diagnosticMsg, setDiagnosticMsg] = useState<string | null>(null)
  
  // STATO FILTRO (Nuovo)
  const [filter, setFilter] = useState<'pending' | 'accepted' | 'rejected'>('pending')

  // STATO MODAL CONFERMA
  const [showModal, setShowModal] = useState(false)
  const [modalAction, setModalAction] = useState<'accepted' | 'rejected' | null>(null)

  // FUNZIONE GENERAZIONE URL
  const getImageUrl = (path: string | null | undefined) => {
    try {
      if (!path) return null
      if (path.startsWith('http')) return path
      const { data } = supabase.storage.from('bandi').getPublicUrl(path)
      if (!data?.publicUrl) return null
      return data.publicUrl
    } catch (e) {
      return null
    }
  }

  useEffect(() => {
    const fetchData = async () => {
      if (!bandoId) return
      setLoading(true)

      try {
        // 1. Caricamento Bando
        const { data: bandoData, error: pError } = await supabase
          .from('bando')
          .select(`*, bando_interesse!bando_id (interesse (nome))`)
          .eq('id', bandoId)
          .single()

        if (pError) throw pError
        setProject(bandoData)

        // 2. Caricamento Candidature (AGGIUNTA logica studente_corso)
        const { data: appsData, error: aError } = await supabase
          .from('partecipazione')
          .select(`
            *, 
            studente:studente_id(
              id, nome, cognome, avatar_url, email, bio,
              studente_corso ( corso:corso_id(nome), anno_inizio )
            )
          `)
          .eq('bando_id', bandoId)
          .order('created_at', { ascending: false })

        if (aError) throw aError
        
        // Formattiamo i dati del corso
        const formattedApps = appsData?.map((app: any) => {
          const corsoInfo = app.studente?.studente_corso?.[0];
          return {
            ...app,
            studente: {
              ...app.studente,
              nome_corso: corsoInfo?.corso?.nome || 'Corso non specificato'
            }
          }
        }) || []

        setApplications(formattedApps)
        
        // Seleziona automaticamente il primo 'pending' se esiste
        const firstPending = formattedApps.find(a => a.stato === 'pending')
        if (firstPending) setSelectedApp(firstPending)

      } catch (err: any) {
        setDiagnosticMsg(`Errore Fetch: ${err.message}`)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [bandoId])

  // APRI MODAL CONFERMA
  const openConfirmModal = (action: 'accepted' | 'rejected') => {
    setModalAction(action)
    setShowModal(true)
  }

  // GESTIONE ACCETTA / RIFIUTA
  const handleStatusUpdate = async () => {
    if (!selectedApp || !modalAction) return

    setActionLoading(true)
    const { error } = await supabase
      .from('partecipazione')
      .update({ stato: modalAction })
      .eq('id', selectedApp.id)

    if (!error) {
      // Aggiorna localmente
      setApplications(prev => prev.map(a => a.id === selectedApp.id ? { ...a, stato: modalAction } : a))
      setSelectedApp({ ...selectedApp, stato: modalAction })
      
      // Spostiamoci automaticamente sul tab corretto per vedere il risultato
      setFilter(modalAction)
    } else {
      alert(`Errore: ${error.message}`)
    }
    
    setActionLoading(false)
    setShowModal(false)
    setModalAction(null)
  }

  const filteredApps = applications.filter(app => app.stato === filter)

  if (loading) return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-red-800 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-red-800 font-black uppercase tracking-widest text-sm">Caricamento...</p>
      </div>
    </div>
  )

  if (diagnosticMsg) return (
    <div className="max-w-2xl mx-auto p-10">
      <div className="bg-red-800 rounded-[2rem] p-8 border-4 border-red-700 shadow-2xl">
        <p className="font-mono text-white text-center">{diagnosticMsg}</p>
        <Link href="/dashboard/my_projects" className="block mt-6 text-center text-white/60 hover:text-white text-xs font-black uppercase">
          ← Torna ai miei progetti
        </Link>
      </div>
    </div>
  )

  return (
    <div className="max-w-[1600px] mx-auto px-4 lg:px-10 pb-20">
      
      {/* MODAL CONFERMA CENTRATO */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setShowModal(false)} />
          
          <div className="relative bg-red-900 rounded-[3rem] p-10 max-w-md w-full shadow-2xl border-4 border-red-800 text-center">
            <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-white/10 flex items-center justify-center text-5xl shadow-inner">
              {modalAction === 'accepted' ? '✅' : '❌'}
            </div>
            
            <h3 className="text-3xl font-black text-white uppercase italic tracking-tighter mb-4">
              {modalAction === 'accepted' ? 'Accettare il candidato?' : 'Rifiutare il candidato?'}
            </h3>
            <p className="text-white/60 text-sm mb-8 font-medium">
              Questa azione è <span className="text-white font-bold">definitiva</span> e l'utente riceverà una notifica.
            </p>
            
            <div className="flex gap-4">
              <button onClick={() => setShowModal(false)} className="flex-1 bg-white/10 text-white font-black py-4 rounded-2xl uppercase text-xs tracking-widest hover:bg-white/20 transition">
                Annulla
              </button>
              <button
                onClick={handleStatusUpdate}
                disabled={actionLoading}
                className={`flex-1 font-black py-4 rounded-2xl uppercase text-xs tracking-widest shadow-xl transition disabled:opacity-50 ${
                  modalAction === 'accepted' ? 'bg-green-500 text-white hover:bg-green-600' : 'bg-white text-red-900 hover:bg-gray-200'
                }`}
              >
                {actionLoading ? 'Attendi...' : 'Conferma'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* HEADER PAGE */}
      <div className="mb-10 flex flex-col md:flex-row justify-between items-end gap-6 border-b-8 border-red-800 pb-10 mt-6">
        <div className="flex-1">
          <Link href={`/dashboard/my_teams/${bandoId}`} className="mb-6 flex items-center gap-2 text-gray-400 hover:text-red-800 font-black text-[10px] uppercase tracking-widest transition-all w-fit group">
            <span className="group-hover:-translate-x-1 transition-transform">←</span> Torna al Workspace
          </Link>
          <h1 className="text-5xl md:text-7xl font-black text-red-900 uppercase italic tracking-tighter leading-[0.85]">
            Candidature
          </h1>
          <p className="text-gray-500 font-bold mt-4 uppercase tracking-widest text-sm">Progetto: <span className="text-red-800">{project?.titolo}</span></p>
        </div>
        
        {/* TABS FILTRO */}
        <div className="flex gap-2 bg-gray-100 p-2 rounded-2xl">
          <button onClick={() => { setFilter('pending'); setSelectedApp(null); }} className={`px-6 py-4 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all ${filter === 'pending' ? 'bg-white shadow-md text-red-800' : 'text-gray-500 hover:bg-gray-200'}`}>
            In Attesa ({applications.filter(a => a.stato === 'pending').length})
          </button>
          <button onClick={() => { setFilter('accepted'); setSelectedApp(null); }} className={`px-6 py-4 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all ${filter === 'accepted' ? 'bg-white shadow-md text-green-600' : 'text-gray-500 hover:bg-gray-200'}`}>
            Accettate ({applications.filter(a => a.stato === 'accepted').length})
          </button>
          <button onClick={() => { setFilter('rejected'); setSelectedApp(null); }} className={`px-6 py-4 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all ${filter === 'rejected' ? 'bg-white shadow-md text-gray-800' : 'text-gray-500 hover:bg-gray-200'}`}>
            Rifiutate ({applications.filter(a => a.stato === 'rejected').length})
          </button>
        </div>
      </div>

      <div className="grid lg:grid-cols-12 gap-8">
        
        {/* --- LATO SINISTRO: LISTA SELEZIONABILE (4 Colonne) --- */}
        <div className="lg:col-span-4 space-y-4 max-h-[800px] overflow-y-auto custom-scrollbar pr-2">
          {filteredApps.length > 0 ? filteredApps.map(app => (
            <button 
              key={app.id}
              onClick={() => setSelectedApp(app)}
              className={`w-full text-left p-4 rounded-[2rem] border-4 transition-all flex items-center gap-4 ${
                selectedApp?.id === app.id 
                  ? 'bg-red-800 border-red-900 text-white shadow-xl scale-[1.02]' 
                  : 'bg-white border-gray-100 hover:border-red-200 text-gray-800 hover:bg-gray-50'
              }`}
            >
              <img src={app.studente?.avatar_url || '/default-avatar.png'} className="w-12 h-12 rounded-xl object-cover shadow-sm" />
              <div className="overflow-hidden flex-1">
                <p className="font-black truncate leading-none mb-1">{app.studente?.nome} {app.studente?.cognome}</p>
                <p className={`text-[9px] font-bold uppercase tracking-widest truncate ${selectedApp?.id === app.id ? 'text-red-300' : 'text-gray-400'}`}>
                  {app.studente?.nome_corso}
                </p>
              </div>
              <div className="text-xl opacity-50">→</div>
            </button>
          )) : (
            <div className="bg-gray-50 p-10 rounded-[3rem] border-4 border-dashed border-gray-200 text-center">
              <span className="text-4xl block opacity-20 mb-2">📭</span>
              <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Nessuna candidatura</p>
            </div>
          )}
        </div>

        {/* --- DESTRA: DETTAGLIO E AZIONI (8 Colonne) --- */}
        <div className="lg:col-span-8">
          {selectedApp ? (
            <div className="bg-red-900 rounded-[4rem] border-4 border-red-950 p-10 lg:p-14 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-red-800 rounded-bl-[10rem] -z-0 opacity-50"></div>
              
              <div className="relative z-10 space-y-8">
                {/* Header Dettaglio */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-6 pb-8 border-b-2 border-red-800/50">
                  <img src={selectedApp.studente?.avatar_url || '/default-avatar.png'} className="w-24 h-24 rounded-[2rem] object-cover border-4 border-red-800 shadow-xl" />
                  <div>
                    <h2 className="text-4xl font-black text-white uppercase italic tracking-tighter leading-none mb-2">
                      {selectedApp.studente?.nome} {selectedApp.studente?.cognome}
                    </h2>
                    <p className="text-xs font-bold text-red-300 uppercase tracking-widest mb-3 flex items-center gap-2">
                      <span>🎓</span> {selectedApp.studente?.nome_corso}
                    </p>
                    <a href={`mailto:${selectedApp.studente?.email}`} className="inline-flex items-center gap-2 bg-red-800 text-white px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-red-700 transition">
                      ✉️ Contatta candidato
                    </a>
                  </div>
                </div>

                {/* Lettera di Presentazione */}
                <div className="bg-white/10 p-8 rounded-[3rem] border border-white/20 backdrop-blur-sm">
                  <h4 className="text-[10px] font-black text-white/50 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <span className="text-lg">📝</span> Lettera di Presentazione
                  </h4>
                  <p className="text-white text-lg leading-relaxed italic font-medium">
                    "{selectedApp.messaggio || 'Nessun messaggio fornito dal candidato.'}"
                  </p>
                </div>

                {/* Info Extra (Bio) */}
                {selectedApp.studente?.bio && (
                  <div>
                    <h4 className="text-[10px] font-black text-red-400 uppercase tracking-widest mb-2 px-2">Biografia Profilo</h4>
                    <p className="text-white/80 text-sm leading-relaxed px-2 border-l-2 border-red-800">
                      {selectedApp.studente.bio}
                    </p>
                  </div>
                )}

                {/* Pulsanti Azione (Solo per i Pending) */}
                <div className="pt-8 mt-8 border-t-2 border-red-800/50">
                  {selectedApp.stato === 'pending' ? (
                    <div className="flex gap-4">
                      <button 
                        onClick={() => openConfirmModal('rejected')}
                        className="flex-1 bg-white/10 text-white border-2 border-white/20 font-black py-5 rounded-[2rem] uppercase text-xs tracking-widest hover:bg-white/20 hover:border-white/40 transition-all"
                      >
                        ❌ Rifiuta
                      </button>
                      <button 
                        onClick={() => openConfirmModal('accepted')}
                        className="flex-[2] bg-green-500 text-white font-black py-5 rounded-[2rem] uppercase text-sm tracking-widest shadow-2xl hover:bg-green-400 hover:scale-[1.02] active:scale-95 transition-all border-b-4 border-green-700 active:border-b-0"
                      >
                        ✅ Accetta nel Team
                      </button>
                    </div>
                  ) : (
                    <div className="bg-black/20 border-2 border-dashed border-black/30 p-8 rounded-[3rem] text-center">
                      <p className={`font-black uppercase tracking-widest text-sm ${selectedApp.stato === 'accepted' ? 'text-green-400' : 'text-gray-400'}`}>
                        {selectedApp.stato === 'accepted' ? "✅ L'utente fa già parte del team" : "❌ Candidatura scartata"}
                      </p>
                    </div>
                  )}
                </div>

              </div>
            </div>
          ) : (
            <div className="bg-gray-50 h-full min-h-[500px] rounded-[4rem] border-4 border-dashed border-gray-200 flex flex-col items-center justify-center p-10 text-center">
              <span className="text-8xl block mb-6 opacity-20">👤</span>
              <h3 className="text-2xl font-black text-gray-400 uppercase italic">Seleziona un candidato</h3>
              <p className="text-gray-400 font-bold text-sm mt-2 max-w-sm">Clicca su uno dei profili nella lista a sinistra per leggere la sua lettera di presentazione e valutarlo.</p>
            </div>
          )}
        </div>

      </div>
    </div>
  )
}