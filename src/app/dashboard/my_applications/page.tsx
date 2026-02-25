'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

export default function MyApplicationsPage() {
  const supabase = createClient()

  // STATI
  const [applications, setApplications] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // STATI FILTRI E ORDINAMENTO
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'accepted' | 'rejected' | 'abandoned'>('all')
  const [dateSort, setDateSort] = useState<'desc' | 'asc'>('desc')

  // STATI MODALI
  const [editingApp, setEditingApp] = useState<any | null>(null)
  const [editMessage, setEditMessage] = useState('')
  const [editRole, setEditRole] = useState('') // ✅ NUOVO STATO PER IL RUOLO
  const [deletingApp, setDeletingApp] = useState<any | null>(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [actionSuccess, setActionSuccess] = useState<string | null>(null)

  // FUNZIONE GENERAZIONE URL IMMAGINE
  const getImageUrl = (path: string | null | undefined) => {
    try {
      if (!path) return null
      if (path.startsWith('http')) return path
      const { data } = supabase.storage.from('bandi').getPublicUrl(path)
      return data?.publicUrl || null
    } catch (e) {
      return null
    }
  }

  // FETCH CANDIDATURE
  const fetchMyApplications = async () => {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // ✅ AGGIUNTO IL RECUPERO DEL RUOLO E DELLE FIGURE RICERCATE DAL BANDO
      const { data, error: fetchError } = await supabase
        .from('partecipazione')
        .select(`
          id, 
          stato, 
          messaggio, 
          ruolo,
          created_at,
          bando:bando_id (
            id, 
            titolo, 
            foto_url, 
            stato,
            figure_ricercate
          )
        `)
        .eq('studente_id', user.id) as any

      if (fetchError) throw fetchError
      setApplications(data || [])
    } catch (err: any) {
      console.error("Errore fetch candidature:", err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchMyApplications()
  }, [supabase])

  // MODIFICA CANDIDATURA
  const handleEditApplication = async () => {
    if (!editingApp) return
    setActionLoading(true)
    
    try {
      // ✅ AGGIORNIAMO SIA IL MESSAGGIO CHE IL RUOLO
      const { error } = await supabase
        .from('partecipazione')
        .update({ 
          messaggio: editMessage,
          ruolo: editRole 
        })
        .eq('id', editingApp.id)

      if (error) throw error
      
      setApplications(prev => prev.map(app => 
        app.id === editingApp.id ? { ...app, messaggio: editMessage, ruolo: editRole } : app
      ))
      
      setEditingApp(null)
      setEditMessage('')
      setEditRole('')
      setActionSuccess('Candidatura modificata con successo!')
      setTimeout(() => setActionSuccess(null), 3000)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setActionLoading(false)
    }
  }

  // ELIMINA CANDIDATURA
  const handleDeleteApplication = async () => {
    if (!deletingApp) return
    setActionLoading(true)
    
    try {
      const { error } = await supabase
        .from('partecipazione')
        .delete()
        .eq('id', deletingApp.id)

      if (error) throw error
      
      setApplications(prev => prev.filter(app => app.id !== deletingApp.id))
      setDeletingApp(null)
      setActionSuccess('Candidatura eliminata!')
      setTimeout(() => setActionSuccess(null), 3000)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setActionLoading(false)
    }
  }

  // CONTEGGI PER FILTRI
  const counts = {
    all: applications.length,
    pending: applications.filter(a => a.stato === 'pending').length,
    accepted: applications.filter(a => a.stato === 'accepted').length,
    rejected: applications.filter(a => a.stato === 'rejected').length,
    abandoned: applications.filter(a => a.stato === 'abandoned').length,
  }

  // LOGICA DI FILTRAGGIO E ORDINAMENTO
  const filteredAndSortedApps = applications
    .filter(app => statusFilter === 'all' || app.stato === statusFilter)
    .sort((a, b) => {
      const dateA = new Date(a.created_at).getTime()
      const dateB = new Date(b.created_at).getTime()
      return dateSort === 'desc' ? dateB - dateA : dateA - dateB
    })

  // Config per status
  const statusConfig: Record<string, { icon: string; label: string; badgeClass: string; cardAccent: string }> = {
    pending: { icon: '⏳', label: 'In Attesa', badgeClass: 'bg-orange-400 text-gray-900', cardAccent: 'border-l-orange-400' },
    accepted: { icon: '✅', label: 'Accettata', badgeClass: 'bg-green-400 text-gray-900', cardAccent: 'border-l-green-400' },
    rejected: { icon: '❌', label: 'Rifiutata', badgeClass: 'bg-red-400 text-gray-900', cardAccent: 'border-l-red-400' },
    abandoned: { icon: '💀', label: 'Abbandonata', badgeClass: 'bg-gray-400 text-gray-900', cardAccent: 'border-l-gray-400' }
  }

  // Config filtri
  const filterConfig = [
    { id: 'all', icon: '📋', label: 'Tutte' },
    { id: 'pending', icon: '⏳', label: 'Attesa' },
    { id: 'accepted', icon: '✅', label: 'Accettate' },
    { id: 'rejected', icon: '❌', label: 'Rifiutate' },
    { id: 'abandoned', icon: '💀', label: 'Abbandonate' },
  ]

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl sm:text-6xl animate-bounce mb-4">📨</div>
          <p className="text-gray-900 font-black uppercase tracking-widest text-sm sm:text-base">Caricamento...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-10 sm:p-20 text-center">
        <div className="inline-block bg-red-400 text-gray-900 p-4 sm:p-6 rounded-xl sm:rounded-2xl border-2 sm:border-3 border-gray-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] font-black">
          ⚠️ {error}
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto px-3 sm:px-6 lg:px-10 pb-24 sm:pb-20">
      
      {/* TOAST SUCCESSO */}
      {actionSuccess && (
        <div className="fixed top-4 right-4 z-50 bg-green-400 text-gray-900 px-4 sm:px-6 py-3 rounded-xl border-2 sm:border-3 border-gray-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] font-black text-sm sm:text-base animate-bounce">
          ✅ {actionSuccess}
        </div>
      )}

      {/* MODAL MODIFICA */}
      {editingApp && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl sm:rounded-3xl border-3 sm:border-4 border-gray-900 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] w-full max-w-lg p-5 sm:p-8">
            <div className="flex items-center justify-between mb-4 sm:mb-6">
              <h3 className="text-lg sm:text-2xl font-black text-gray-900 uppercase">✏️ Modifica Candidatura</h3>
              <button 
                onClick={() => { setEditingApp(null); setEditMessage(''); setEditRole(''); }}
                className="w-8 h-8 sm:w-10 sm:h-10 bg-gray-200 hover:bg-gray-300 rounded-lg sm:rounded-xl border-2 border-gray-900 flex items-center justify-center font-black text-gray-900 transition-colors"
              >
                ×
              </button>
            </div>
            
            <p className="text-xs sm:text-sm font-bold text-gray-600 mb-2 uppercase">Progetto:</p>
            <p className="text-base sm:text-lg font-black text-gray-900 mb-4 sm:mb-6">{editingApp.bando?.titolo}</p>
            
            {/* ✅ NUOVA TENDINA PER LA SELEZIONE DEL RUOLO */}
            <label className="block text-xs sm:text-sm font-black text-gray-900 mb-2 uppercase">🎯 Ruolo per cui ti candidi</label>
            <select
              value={editRole}
              onChange={(e) => setEditRole(e.target.value)}
              className="w-full px-3 sm:px-4 py-2.5 sm:py-3 mb-4 sm:mb-6 bg-gray-50 rounded-lg sm:rounded-xl border-2 sm:border-3 border-gray-900 focus:border-blue-500 focus:ring-0 outline-none font-bold text-gray-900 text-sm sm:text-base shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] focus:shadow-none focus:translate-x-[3px] focus:translate-y-[3px] transition-all cursor-pointer appearance-none"
            >
              <option value="">-- Seleziona un ruolo --</option>
              {/* Estraiamo in automatico le figure ricercate scritte dal creatore del bando */}
              {editingApp.bando?.figure_ricercate?.map((figura: any, index: number) => {
                const roleName = figura.tipo === 'strutturata' 
                  ? (figura.corso_nome ? `Studente di ${figura.corso_nome}` : 'Studente Generico')
                  : (figura.titolo_libero || 'Altro');
                return (
                  <option key={index} value={roleName}>{roleName}</option>
                )
              })}
              <option value="Candidatura Spontanea / Altro">Candidatura Spontanea / Altro</option>
            </select>

            <label className="block text-xs sm:text-sm font-black text-gray-900 mb-2 uppercase">📝 Messaggio al Team</label>
            <textarea
              value={editMessage}
              onChange={(e) => setEditMessage(e.target.value)}
              placeholder="Perché sei la persona giusta per questo progetto?..."
              rows={4}
              className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-gray-50 rounded-lg sm:rounded-xl border-2 sm:border-3 border-gray-900 focus:border-blue-500 focus:ring-0 outline-none font-bold text-gray-900 text-sm sm:text-base placeholder:text-gray-400 resize-none shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] focus:shadow-none focus:translate-x-[3px] focus:translate-y-[3px] transition-all"
            />
            
            <div className="flex gap-3 mt-4 sm:mt-6">
              <button
                onClick={() => { setEditingApp(null); setEditMessage(''); setEditRole(''); }}
                className="flex-1 py-2.5 sm:py-3 bg-gray-200 hover:bg-gray-300 text-gray-900 rounded-lg sm:rounded-xl font-black text-xs sm:text-sm uppercase tracking-wider border-2 sm:border-3 border-gray-900 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[3px] hover:translate-y-[3px] transition-all"
              >
                Annulla
              </button>
              <button
                onClick={handleEditApplication}
                disabled={actionLoading || !editRole} // Non salvi se non scegli un ruolo
                className="flex-1 py-2.5 sm:py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg sm:rounded-xl font-black text-xs sm:text-sm uppercase tracking-wider border-2 sm:border-3 border-gray-900 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[3px] hover:translate-y-[3px] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {actionLoading ? '...' : '💾 Salva'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL ELIMINA */}
      {deletingApp && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl sm:rounded-3xl border-3 sm:border-4 border-gray-900 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] w-full max-w-md p-5 sm:p-8 text-center">
            <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-4 sm:mb-6 rounded-2xl bg-red-100 border-3 border-gray-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center">
              <span className="text-3xl sm:text-4xl">🗑️</span>
            </div>
            
            <h3 className="text-lg sm:text-2xl font-black text-gray-900 uppercase mb-2">Eliminare Candidatura?</h3>
            <p className="text-xs sm:text-sm font-bold text-gray-600 mb-4 sm:mb-6">
              Stai per eliminare la candidatura per "<span className="text-gray-900">{deletingApp.bando?.titolo}</span>". Questa azione non può essere annullata!
            </p>
            
            <div className="flex gap-3">
              <button
                onClick={() => setDeletingApp(null)}
                className="flex-1 py-2.5 sm:py-3 bg-gray-200 hover:bg-gray-300 text-gray-900 rounded-lg sm:rounded-xl font-black text-xs sm:text-sm uppercase tracking-wider border-2 sm:border-3 border-gray-900 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[3px] hover:translate-y-[3px] transition-all"
              >
                Annulla
              </button>
              <button
                onClick={handleDeleteApplication}
                disabled={actionLoading}
                className="flex-1 py-2.5 sm:py-3 bg-red-500 hover:bg-red-600 text-white rounded-lg sm:rounded-xl font-black text-xs sm:text-sm uppercase tracking-wider border-2 sm:border-3 border-gray-900 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[3px] hover:translate-y-[3px] transition-all disabled:opacity-50"
              >
                {actionLoading ? '...' : '🗑️ Elimina'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* HEADER */}
      <div className="mb-6 sm:mb-10 pt-4 sm:pt-6">
        <Link 
          href="/dashboard" 
          className="mb-4 sm:mb-6 inline-flex items-center gap-1.5 sm:gap-2 bg-white text-gray-900 font-black text-[10px] sm:text-xs uppercase tracking-widest px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl border-2 border-gray-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
        >
          <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Bacheca
        </Link>
        
        <h1 className="text-2xl sm:text-5xl lg:text-6xl font-black text-gray-900 uppercase italic tracking-tighter leading-none">
          Le Mie <span className="text-red-600">Candidature</span>
        </h1>
        <p className="text-gray-600 mt-2 sm:mt-3 font-bold text-xs sm:text-base">
          Monitora lo stato delle tue richieste
        </p>
      </div>

      {/* FILTRI */}
      <div className="mb-6 sm:mb-10">
        <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
          
          <div className="overflow-x-auto pb-2 -mx-3 px-3 sm:mx-0 sm:px-0 sm:pb-0">
            <div className="bg-white border-2 sm:border-3 border-gray-900 rounded-xl sm:rounded-2xl p-1 sm:p-1.5 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] inline-flex gap-0.5 sm:gap-1 min-w-max">
              {filterConfig.map((filter) => (
                <button 
                  key={filter.id}
                  onClick={() => setStatusFilter(filter.id as any)} 
                  className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg sm:rounded-xl font-black text-[9px] sm:text-xs uppercase tracking-wider transition-all whitespace-nowrap ${
                    statusFilter === filter.id ? 'bg-gray-900 text-white' : 'bg-transparent text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <span className="text-xs sm:text-base">{filter.icon}</span>
                  <span className="hidden xs:inline sm:inline">{filter.label}</span>
                  {counts[filter.id as keyof typeof counts] > 0 && (
                    <span className={`px-1 sm:px-1.5 py-0.5 rounded text-[8px] sm:text-[10px] font-black ${statusFilter === filter.id ? 'bg-red-500 text-white' : 'bg-gray-200 text-gray-700'}`}>
                      {counts[filter.id as keyof typeof counts]}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          <button 
            onClick={() => setDateSort(dateSort === 'desc' ? 'asc' : 'desc')} 
            className="self-start sm:self-auto bg-white px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg sm:rounded-xl font-black uppercase text-[10px] sm:text-xs tracking-widest border-2 sm:border-3 border-gray-900 text-gray-900 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[3px] hover:translate-y-[3px] transition-all flex items-center gap-1.5"
          >
            <span>{dateSort === 'desc' ? '🔽' : '🔼'}</span>
            <span>{dateSort === 'desc' ? 'Recenti' : 'Vecchie'}</span>
          </button>
        </div>

        <div className="mt-3 sm:mt-4">
          <span className="inline-block bg-yellow-300 border-2 border-gray-900 px-3 py-1.5 rounded-lg shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] text-[10px] sm:text-sm font-black text-gray-900 uppercase">
            {filteredAndSortedApps.length} risultat{filteredAndSortedApps.length === 1 ? 'o' : 'i'}
          </span>
        </div>
      </div>

      {/* LISTA CANDIDATURE */}
      <div className="space-y-4 sm:space-y-6">
        {filteredAndSortedApps.length > 0 ? filteredAndSortedApps.map((app) => {
          const bando = app.bando
          const config = statusConfig[app.stato] || statusConfig.pending
          const isRejected = app.stato === 'rejected'
          const isAbandoned = app.stato === 'abandoned'
          const isAccepted = app.stato === 'accepted'
          const isPending = app.stato === 'pending'

          return (
            <article 
              key={app.id} 
              className={`
                bg-white rounded-xl sm:rounded-2xl border-2 sm:border-3 border-gray-900 
                border-l-4 sm:border-l-8 ${config.cardAccent}
                shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] sm:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]
                overflow-hidden
                ${isRejected || isAbandoned ? 'opacity-80 hover:opacity-100' : ''}
                transition-all hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] sm:hover:shadow-[10px_10px_0px_0px_rgba(0,0,0,1)]
              `}
            >
              <div className="flex flex-col sm:flex-row">
                
                {/* Immagine */}
                <div className={`w-full sm:w-40 md:w-48 h-28 sm:h-auto shrink-0 border-b-2 sm:border-b-0 sm:border-r-2 border-gray-900 bg-gray-100 ${isRejected ? 'grayscale' : ''}`}>
                  {bando?.foto_url ? (
                    <img 
                      src={getImageUrl(bando.foto_url) || ''} 
                      className="w-full h-full object-cover"
                      alt={bando?.titolo}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-100 to-purple-100 min-h-[112px] sm:min-h-[160px]">
                      <div className="w-10 h-10 sm:w-14 sm:h-14 rounded-xl bg-white border-2 border-gray-900 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center">
                        <span className="text-xl sm:text-2xl">📦</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Contenuto */}
                <div className="flex-1 p-3 sm:p-5">
                  
                  {/* Header card */}
                  <div className="flex flex-wrap items-center gap-2 mb-2 sm:mb-3">
                    <span className={`inline-flex items-center gap-1 px-2 sm:px-3 py-0.5 sm:py-1 rounded-lg text-[9px] sm:text-xs font-black uppercase tracking-wider border-2 border-gray-900 ${config.badgeClass}`}>
                      <span>{config.icon}</span>
                      <span>{config.label}</span>
                    </span>
                    <span className="text-[9px] sm:text-xs font-bold text-gray-500 uppercase">
                      📅 {new Date(app.created_at).toLocaleDateString('it-IT')}
                    </span>
                  </div>

                  {/* Titolo e Ruolo */}
                  <h3 className="text-base sm:text-xl md:text-2xl font-black text-gray-900 uppercase tracking-tight leading-tight mb-1">
                    {bando?.titolo || 'Progetto non trovato'}
                  </h3>
                  
                  {/* ✅ MOSTRA IL RUOLO SELEZIONATO */}
                  <p className="text-[10px] sm:text-xs font-black text-blue-700 bg-blue-100 border-2 border-blue-900 px-2 py-0.5 rounded-md inline-block uppercase tracking-widest mb-3">
                    🎯 Ruolo: {app.ruolo || 'Non specificato'}
                  </p>

                  {/* Messaggio */}
                  {app.messaggio && (
                    <div className="bg-gray-100 p-3 sm:p-4 rounded-lg sm:rounded-xl border-2 border-gray-200 mb-3 sm:mb-4">
                      <p className="text-gray-700 font-bold text-xs sm:text-sm italic line-clamp-2">
                        "{app.messaggio}"
                      </p>
                    </div>
                  )}

                  {/* Azioni */}
                  <div className="flex flex-wrap items-center gap-2 sm:gap-3 mt-2">
                    <Link 
                      href={`/dashboard/projects/${bando?.id}`} 
                      className="inline-flex items-center gap-1 px-2.5 sm:px-3 py-1.5 sm:py-2 bg-gray-100 hover:bg-gray-200 text-gray-900 rounded-lg sm:rounded-xl font-black text-[9px] sm:text-xs uppercase tracking-wider border-2 border-gray-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
                    >
                      👁️ <span className="hidden sm:inline">Vedi</span> Progetto
                    </Link>
                    
                    {isAccepted && (
                      <Link 
                        href={`/dashboard/my_teams/${bando?.id}`} 
                        className="inline-flex items-center gap-1 px-2.5 sm:px-3 py-1.5 sm:py-2 bg-green-400 hover:bg-green-500 text-gray-900 rounded-lg sm:rounded-xl font-black text-[9px] sm:text-xs uppercase tracking-wider border-2 border-gray-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
                      >
                        🚀 Workspace
                      </Link>
                    )}

                    {isPending && (
                      <>
                        <button
                          onClick={() => {
                            setEditingApp(app)
                            setEditMessage(app.messaggio || '')
                            setEditRole(app.ruolo || '') // Pre-popoliamo il ruolo esistente
                          }}
                          className="inline-flex items-center gap-1 px-2.5 sm:px-3 py-1.5 sm:py-2 bg-blue-400 hover:bg-blue-500 text-gray-900 rounded-lg sm:rounded-xl font-black text-[9px] sm:text-xs uppercase tracking-wider border-2 border-gray-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
                        >
                          ✏️ <span className="hidden sm:inline">Modifica</span>
                        </button>
                        <button
                          onClick={() => setDeletingApp(app)}
                          className="inline-flex items-center gap-1 px-2.5 sm:px-3 py-1.5 sm:py-2 bg-red-400 hover:bg-red-500 text-gray-900 rounded-lg sm:rounded-xl font-black text-[9px] sm:text-xs uppercase tracking-wider border-2 border-gray-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
                        >
                          🗑️ <span className="hidden sm:inline">Elimina</span>
                        </button>
                      </>
                    )}

                    {(isRejected || isAbandoned) && (
                      <button
                        onClick={() => setDeletingApp(app)}
                        className="inline-flex items-center gap-1 px-2.5 sm:px-3 py-1.5 sm:py-2 bg-gray-300 hover:bg-gray-400 text-gray-900 rounded-lg sm:rounded-xl font-black text-[9px] sm:text-xs uppercase tracking-wider border-2 border-gray-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
                      >
                        🗑️ Rimuovi
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </article>
          )
        }) : (
          <div className="text-center py-12 sm:py-20 bg-white border-3 sm:border-4 border-dashed border-gray-300 rounded-2xl sm:rounded-3xl">
            <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-4 sm:mb-6 rounded-2xl bg-gray-100 border-3 border-gray-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center -rotate-6">
              <span className="text-3xl sm:text-4xl">📭</span>
            </div>
            <h3 className="text-lg sm:text-2xl font-black text-gray-900 uppercase mb-2">Nessuna candidatura</h3>
            <p className="text-gray-600 font-bold text-sm sm:text-base mb-4 sm:mb-6">
              {statusFilter !== 'all' 
                ? `Nessuna candidatura ${filterConfig.find(f => f.id === statusFilter)?.label.toLowerCase()}`
                : 'Non hai ancora inviato candidature'
              }
            </p>
            <Link 
              href="/dashboard"
              className="inline-flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl font-black text-xs sm:text-sm uppercase tracking-widest border-2 sm:border-3 border-gray-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[4px] hover:translate-y-[4px] transition-all"
            >
              🔍 Esplora Progetti
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}