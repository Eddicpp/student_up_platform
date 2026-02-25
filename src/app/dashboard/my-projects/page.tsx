'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

type ProjectCategory = 'proprietario' | 'admin' | 'membro' | 'abbandonato'

interface ProjectData {
  id: string
  titolo: string
  descrizione: string
  foto_url: string | null
  stato: string
  data_creazione: string
  category: ProjectCategory
  partecipazione_id?: string
  pinned?: boolean
  muted?: boolean
}

export default function MyProjectsPage() {
  const supabase = createClient()
  const router = useRouter()
  
  const [projects, setProjects] = useState<ProjectData[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<ProjectCategory | 'tutti'>('tutti')
  const [searchQuery, setSearchQuery] = useState('')
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const [confirmLeave, setConfirmLeave] = useState<string | null>(null)

  // Fetch progetti
  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          router.push('/login')
          return
        }

        const allProjects: ProjectData[] = []

        // 1. Progetti creati (proprietario)
        const { data: creati } = await supabase
          .from('bando')
          .select('*')
          .eq('creatore_studente_id', user.id)
          .order('data_creazione', { ascending: false })

        if (creati) {
          creati.forEach((p: any) => { 
            allProjects.push({
              ...p,
              stato: p.stato || 'attivo',
              category: 'proprietario',
              pinned: p.pinned_by_creator || false,
              muted: false
            } as unknown as ProjectData)
        })
      }

        // 2. Partecipazioni (admin, membro, abbandonato)
        const { data: partecipazioni } = await supabase
          .from('partecipazione')
          .select(`
            id,
            stato,
            ruolo,
            pinned,
            muted,
            bando:bando_id (*)
          `)
          .eq('studente_id', user.id)

        if (partecipazioni) {
          partecipazioni.forEach((p: any) => {
            if (!p.bando) return
            
            // Evita duplicati (se sei creatore E partecipante)
            if (allProjects.some(proj => proj.id === p.bando.id)) return

            let category: ProjectCategory = 'membro'
            if (p.stato === 'abandoned') {
              category = 'abbandonato'
            } else if (p.stato === 'accepted' && p.ruolo === 'admin') {
              category = 'admin'
            } else if (p.stato === 'accepted') {
              category = 'membro'
            } else {
              return // Skip pending o rejected
            }

            allProjects.push({
              ...p.bando,
              category,
              partecipazione_id: p.id,
              pinned: p.pinned || false,
              muted: p.muted || false
            })
          })
        }

        // Ordina: pinned first, poi per data
        allProjects.sort((a, b) => {
          if (a.pinned && !b.pinned) return -1
          if (!a.pinned && b.pinned) return 1
          return new Date(b.data_creazione).getTime() - new Date(a.data_creazione).getTime()
        })

        setProjects(allProjects)
      } catch (err) {
        console.error('Errore fetch:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchProjects()
  }, [])

  // Chiudi menu cliccando fuori
  useEffect(() => {
    const handleClick = () => setOpenMenuId(null)
    if (openMenuId) {
      document.addEventListener('click', handleClick)
      return () => document.removeEventListener('click', handleClick)
    }
  }, [openMenuId])

  // Azioni
  const handlePin = async (project: ProjectData) => {
    const newPinned = !project.pinned
    
    try {
      if (project.category === 'proprietario') {
        await supabase
          .from('bando')
          .update({ pinned_by_creator: newPinned } as any)
          .eq('id', project.id)

      } else if (project.partecipazione_id) {
        await supabase
          .from('partecipazione')
          .update({ pinned: newPinned } as any) 
          .eq('id', project.partecipazione_id)
      }

      setProjects(projects.map(p => 
        p.id === project.id ? { ...p, pinned: newPinned } : p
      ))
    } catch (err) {
      console.error("Errore durante il pin:", err)
      alert("Errore durante il salvataggio del pin")
    }
  }

  const handleMute = async (project: ProjectData) => {
    const newMuted = !project.muted
    
    if (project.partecipazione_id) {
      await supabase
        .from('partecipazione')
        .update({ muted: newMuted } as any) 
        .eq('id', project.partecipazione_id)
    }

    setProjects(prev => prev.map(p => 
      p.id === project.id ? { ...p, muted: newMuted } : p
    ))
    setOpenMenuId(null)
  }

  const handleLeave = async (project: ProjectData) => {
    if (!project.partecipazione_id) return
    
    await supabase
      .from('partecipazione')
      .update({ stato: 'abandoned' } as any) 
      .eq('id', project.partecipazione_id)

    setProjects(prev => prev.map(p => 
      p.id === project.id ? { ...p, category: 'abbandonato' } : p
    ))
    setConfirmLeave(null)
    setOpenMenuId(null)
  }

  // Filtro combinato: Categoria + Barra di ricerca
  const filteredProjects = projects.filter(p => {
    const matchCategory = activeTab === 'tutti' || p.category === activeTab
    const matchSearch = p.titolo.toLowerCase().includes(searchQuery.toLowerCase()) || 
                        (p.descrizione && p.descrizione.toLowerCase().includes(searchQuery.toLowerCase()))
    return matchCategory && matchSearch
  })

  // Contatori
  const counts = {
    tutti: projects.length,
    proprietario: projects.filter(p => p.category === 'proprietario').length,
    admin: projects.filter(p => p.category === 'admin').length,
    membro: projects.filter(p => p.category === 'membro').length,
    abbandonato: projects.filter(p => p.category === 'abbandonato').length,
  }

  const tabs = [
    { id: 'tutti' as const, label: 'Tutti', icon: '📋' },
    { id: 'proprietario' as const, label: 'Proprietario', icon: '👑' },
    { id: 'admin' as const, label: 'Admin', icon: '🛡️' },
    { id: 'membro' as const, label: 'Membro', icon: '👤' },
    { id: 'abbandonato' as const, label: 'Abbandonati', icon: '💀' },
  ]

  const getCategoryStyle = (category: ProjectCategory) => {
    switch (category) {
      case 'proprietario':
        return { badge: 'bg-amber-400 text-black border-2 border-gray-900', icon: '👑', label: 'Proprietario' }
      case 'admin':
        return { badge: 'bg-blue-400 text-black border-2 border-gray-900', icon: '🛡️', label: 'Admin' }
      case 'membro':
        return { badge: 'bg-emerald-400 text-black border-2 border-gray-900', icon: '👤', label: 'Membro' }
      case 'abbandonato':
        return { badge: 'bg-gray-300 text-black border-2 border-gray-900', icon: '💀', label: 'Abbandonato' }
    }
  }

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <div className="text-5xl md:text-6xl animate-bounce mb-4">🚀</div>
          <p className="text-gray-900 font-black uppercase tracking-widest text-sm md:text-base">Caricamento...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="pb-20 max-w-7xl mx-auto px-4 sm:px-6">
      {/* Header Responsivo */}
      <div className="mb-6 md:mb-8 flex flex-col lg:flex-row lg:items-end justify-between gap-5">
        <div className="flex items-center gap-3 md:gap-4">
          <button 
            onClick={() => router.push('/dashboard')}
            className="p-2 md:p-3 bg-white border-2 border-gray-900 rounded-xl shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] md:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
          >
            <svg className="w-5 h-5 md:w-6 md:h-6 text-gray-900" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <h1 className="text-2xl sm:text-4xl md:text-5xl font-black text-gray-900 uppercase italic tracking-tighter leading-none">
              I Miei <span className="text-red-600">Progetti</span>
            </h1>
            <p className="text-[10px] md:text-sm font-bold text-gray-600 mt-1 md:mt-2 uppercase tracking-widest">Gestisci le tue collaborazioni</p>
          </div>
        </div>

        {/* ✅ Barra di Ricerca Ridisegnata */}
        <div className="w-full lg:w-96 flex flex-col">
          <label className="block text-[10px] md:text-xs font-black uppercase tracking-widest text-gray-900 mb-1.5 ml-1">
            🔎 Cosa stai cercando?
          </label>
          <div className="relative">
            <input
              type="text"
              placeholder="Scrivi una parola chiave..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-2.5 md:py-3 bg-yellow-100 focus:bg-white border-2 md:border-3 border-gray-900 rounded-xl text-gray-900 font-black text-sm md:text-base placeholder:text-gray-700 placeholder:italic shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] md:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] focus:outline-none focus:translate-x-[3px] focus:translate-y-[3px] focus:shadow-none transition-all"
            />
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg md:text-xl grayscale opacity-70">🔍</span>
          </div>
        </div>
      </div>

      {/* Stats Cards - Più compatte su mobile */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6 md:mb-8">
        <div className="bg-amber-400 rounded-xl md:rounded-2xl p-3 md:p-5 border-2 border-gray-900 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] md:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 transition-transform">
          <p className="text-2xl md:text-4xl font-black text-gray-900 leading-none">{counts.proprietario}</p>
          <p className="text-[10px] md:text-xs text-gray-900 font-black uppercase tracking-widest mt-1 md:mt-2">👑 Proprietario</p>
        </div>
        <div className="bg-blue-400 rounded-xl md:rounded-2xl p-3 md:p-5 border-2 border-gray-900 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] md:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 transition-transform">
          <p className="text-2xl md:text-4xl font-black text-gray-900 leading-none">{counts.admin}</p>
          <p className="text-[10px] md:text-xs text-gray-900 font-black uppercase tracking-widest mt-1 md:mt-2">🛡️ Admin</p>
        </div>
        <div className="bg-emerald-400 rounded-xl md:rounded-2xl p-3 md:p-5 border-2 border-gray-900 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] md:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 transition-transform">
          <p className="text-2xl md:text-4xl font-black text-gray-900 leading-none">{counts.membro}</p>
          <p className="text-[10px] md:text-xs text-gray-900 font-black uppercase tracking-widest mt-1 md:mt-2">👤 Membro</p>
        </div>
        <div className="bg-gray-200 rounded-xl md:rounded-2xl p-3 md:p-5 border-2 border-gray-900 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] md:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 transition-transform">
          <p className="text-2xl md:text-4xl font-black text-gray-900 leading-none">{counts.abbandonato}</p>
          <p className="text-[10px] md:text-xs text-gray-900 font-black uppercase tracking-widest mt-1 md:mt-2">💀 Abbandonati</p>
        </div>
      </div>

      {/* Tabs - Scrollabili orizzontalmente su smartphone */}
      <div className="flex overflow-x-auto pb-4 -mx-4 px-4 sm:mx-0 sm:px-0 sm:flex-wrap gap-2 md:gap-3 mb-4 md:mb-8 snap-x hide-scrollbar">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center whitespace-nowrap snap-start gap-1.5 md:gap-2 px-4 py-2 md:px-5 md:py-3 rounded-xl font-black text-xs md:text-sm uppercase tracking-widest transition-all border-2 border-gray-900 ${
              activeTab === tab.id
                ? 'bg-gray-900 text-white shadow-[3px_3px_0px_0px_rgba(220,38,38,1)] translate-x-[1px] translate-y-[1px]'
                : 'bg-white text-gray-900 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[3px] hover:translate-y-[3px]'
            }`}
          >
            <span className="text-sm md:text-lg">{tab.icon}</span>
            <span>{tab.label}</span>
            {counts[tab.id] > 0 && (
              <span className={`px-1.5 py-0.5 rounded-md text-[9px] md:text-[10px] font-black ${
                activeTab === tab.id ? 'bg-red-600 text-white' : 'bg-gray-200 text-gray-900'
              }`}>
                {counts[tab.id]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Grid Progetti */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-8">
        {filteredProjects.map((project) => {
          const style = getCategoryStyle(project.category)
          const isAbandoned = project.category === 'abbandonato'

          return (
            <div 
              key={project.id}
              className={`group relative bg-white rounded-xl md:rounded-2xl border-2 border-gray-900 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] md:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] overflow-hidden transition-all duration-200 hover:-translate-y-1 md:hover:-translate-y-2 hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] flex flex-col h-full ${
                isAbandoned ? 'opacity-70 grayscale hover:grayscale-0' : ''
              }`}
            >
              {/* Menu 3 puntini */}
              <div className="absolute top-3 right-3 md:top-4 md:right-4 z-30">
                <button
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    setOpenMenuId(openMenuId === project.id ? null : project.id)
                  }}
                  className="p-1.5 md:p-2 bg-white border-2 border-gray-900 rounded-lg md:rounded-xl shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
                >
                  <svg className="w-4 h-4 md:w-5 md:h-5 text-gray-900" fill="currentColor" viewBox="0 0 24 24">
                    <circle cx="12" cy="5" r="2.5" />
                    <circle cx="12" cy="12" r="2.5" />
                    <circle cx="12" cy="19" r="2.5" />
                  </svg>
                </button>

                {openMenuId === project.id && (
                  <div 
                    className="absolute right-0 top-full mt-2 w-48 md:w-56 bg-white rounded-xl border-2 border-gray-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] py-2 z-40 overflow-hidden"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      onClick={() => handlePin(project)}
                      className="w-full px-3 md:px-4 py-2 md:py-3 text-left text-xs md:text-sm font-black text-gray-900 hover:bg-gray-100 flex items-center gap-2 md:gap-3 transition-colors border-b-2 border-transparent hover:border-gray-900"
                    >
                      <span className="text-lg md:text-xl">{project.pinned ? '📌' : '📍'}</span>
                      <span className="uppercase tracking-widest">{project.pinned ? 'Rimuovi pin' : 'Fissa in alto'}</span>
                    </button>

                    <button
                      onClick={() => handleMute(project)}
                      className="w-full px-3 md:px-4 py-2 md:py-3 text-left text-xs md:text-sm font-black text-gray-900 hover:bg-gray-100 flex items-center gap-2 md:gap-3 transition-colors border-b-2 border-transparent hover:border-gray-900"
                    >
                      <span className="text-lg md:text-xl">{project.muted ? '🔔' : '🔕'}</span>
                      <span className="uppercase tracking-widest">{project.muted ? 'Riattiva notif.' : 'Silenzia'}</span>
                    </button>

                    {project.category !== 'proprietario' && (
                      <>
                        <div className="h-0.5 bg-gray-900 w-full my-1" />
                        {project.category !== 'abbandonato' ? (
                          <button
                            onClick={() => setConfirmLeave(project.id)}
                            className="w-full px-3 md:px-4 py-2 md:py-3 text-left text-xs md:text-sm font-black text-red-600 hover:bg-red-50 flex items-center gap-2 md:gap-3 transition-colors"
                          >
                            <span className="text-lg md:text-xl">🚪</span>
                            <span className="uppercase tracking-widest">Abbandona</span>
                          </button>
                        ) : (
                          <button className="w-full px-3 md:px-4 py-2 md:py-3 text-left text-xs md:text-sm font-black text-gray-400 flex items-center gap-2 md:gap-3 cursor-not-allowed" disabled>
                            <span className="text-lg md:text-xl">💀</span>
                            <span className="uppercase tracking-widest">Abbandonato</span>
                          </button>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Badge Categoria */}
              <div className="absolute top-3 left-3 md:top-4 md:left-4 z-20">
                <span className={`flex items-center gap-1 md:gap-2 px-2 md:px-3 py-1 md:py-1.5 rounded-lg md:rounded-xl text-[9px] md:text-xs font-black uppercase tracking-widest shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] ${style.badge}`}>
                  <span className="text-xs md:text-sm">{style.icon}</span>
                  <span>{style.label}</span>
                </span>
              </div>

              {/* Indicatori Pin/Mute */}
              {(project.pinned || project.muted) && (
                <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 flex gap-1.5 md:gap-2">
                  {project.pinned && (
                    <span className="bg-amber-400 border-2 border-gray-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] px-1.5 py-0.5 md:px-2 md:py-1 rounded-lg text-xs md:text-sm">📌</span>
                  )}
                  {project.muted && (
                    <span className="bg-gray-200 border-2 border-gray-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] px-1.5 py-0.5 md:px-2 md:py-1 rounded-lg text-xs md:text-sm">🔕</span>
                  )}
                </div>
              )}

              {/* Link al workspace */}
              <Link href={isAbandoned ? '#' : `/dashboard/my_teams/${project.id}`} className={`flex flex-col flex-1 ${isAbandoned ? 'pointer-events-none' : ''}`}>
                <div className="h-36 md:h-48 bg-blue-100 border-b-2 border-gray-900 relative overflow-hidden">
                  {project.foto_url ? (
                    <img 
                      src={project.foto_url} 
                      alt={project.titolo} 
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gray-100 pattern-dots">
                      <div className="w-12 h-12 md:w-16 md:h-16 rounded-xl md:rounded-2xl bg-white border-2 border-gray-900 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center">
                        <svg className="w-6 h-6 md:w-8 md:h-8 text-gray-900" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                        </svg>
                      </div>
                    </div>
                  )}
                  
                  <div className="absolute bottom-3 right-3 md:bottom-4 md:right-4">
                    <span className={`px-2 py-1 md:px-3 md:py-1.5 rounded-lg md:rounded-xl border-2 border-gray-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] text-[9px] md:text-xs font-black uppercase tracking-widest ${
                      project.stato === 'chiuso' ? 'bg-black text-white' : 'bg-green-400 text-black'
                    }`}>
                      {project.stato === 'chiuso' ? '🔒 Chiuso' : '🟢 Aperto'}
                    </span>
                  </div>
                </div>

                <div className="p-4 md:p-6 flex flex-col flex-1 bg-white">
                  <h3 className="font-black text-gray-900 text-lg md:text-xl leading-tight line-clamp-2 mb-2 md:mb-3 uppercase">
                    {project.titolo}
                  </h3>
                  
                  <p className="text-gray-700 font-medium text-xs md:text-sm line-clamp-2 mb-4 md:mb-6 flex-1">
                    {project.descrizione}
                  </p>

                  <div className="flex items-center justify-between pt-3 md:pt-4 border-t-2 border-dashed border-gray-300 mt-auto">
                    <span className="text-[10px] md:text-xs font-bold text-gray-500 uppercase tracking-widest">
                      {new Date(project.data_creazione).toLocaleDateString('it-IT', {
                        day: '2-digit', month: '2-digit', year: 'numeric'
                      })}
                    </span>
                    
                    {!isAbandoned && (
                      <span className="flex items-center gap-1 md:gap-1.5 text-[10px] md:text-xs font-black text-gray-900 uppercase tracking-widest bg-yellow-300 px-2.5 py-1 md:px-3 md:py-1.5 rounded-lg border-2 border-gray-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] group-hover:bg-yellow-400 group-hover:translate-x-[2px] group-hover:translate-y-[2px] group-hover:shadow-none transition-all">
                        Apri
                        <svg className="w-3 h-3 md:w-4 md:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                        </svg>
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            </div>
          )
        })}
      </div>

      {/* Empty State */}
      {filteredProjects.length === 0 && (
        <div className="text-center py-16 md:py-24 bg-white border-4 border-gray-900 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] md:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] rounded-2xl md:rounded-3xl mt-6 md:mt-8 px-4">
          <div className="w-20 h-20 md:w-24 md:h-24 mx-auto mb-4 md:mb-6 rounded-2xl md:rounded-3xl bg-gray-100 border-4 border-gray-900 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] md:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center rotate-3">
            <span className="text-4xl md:text-5xl">🕵️‍♂️</span>
          </div>
          <h3 className="text-2xl md:text-3xl font-black text-gray-900 mb-3 md:mb-4 uppercase tracking-tight">
            {searchQuery ? 'Nessun Risultato' : activeTab === 'tutti' ? 'Nessun progetto' : `Nessuno come ${tabs.find(t => t.id === activeTab)?.label}`}
          </h3>
          <p className="text-sm md:text-base text-gray-600 font-bold mb-6 md:mb-8 max-w-md mx-auto">
            {searchQuery 
              ? 'Non abbiamo trovato progetti con questa ricerca. Prova a usare altre parole!'
              : activeTab === 'proprietario' 
                ? 'Non hai ancora creato nulla. Rimboccati le maniche e crea il tuo primo progetto!'
                : 'Esplora la bacheca per trovare progetti interessanti a cui unirti.'
            }
          </p>
          <Link 
            href={activeTab === 'proprietario' ? '/dashboard/create-project' : '/dashboard'}
            className="inline-flex items-center gap-2 md:gap-3 bg-red-600 text-white px-6 py-3 md:px-8 md:py-4 rounded-xl font-black uppercase tracking-widest text-sm md:text-lg border-3 md:border-4 border-gray-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] md:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[4px] hover:translate-y-[4px] transition-all"
          >
            {activeTab === 'proprietario' ? (
              <>
                <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                Crea Progetto
              </>
            ) : (
              <>
                Esplora Bacheca
                <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
              </>
            )}
          </Link>
        </div>
      )}

      {/* Modal Conferma Abbandono */}
      {confirmLeave && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl md:rounded-3xl p-6 md:p-8 max-w-md w-full border-4 border-gray-900 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] md:shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] animate-in fade-in zoom-in-95">
            <div className="w-16 h-16 md:w-20 md:h-20 mx-auto mb-4 md:mb-6 rounded-full bg-red-400 border-3 md:border-4 border-gray-900 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] md:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center -rotate-6">
              <span className="text-3xl md:text-4xl">🚪</span>
            </div>
            <h3 className="text-xl md:text-2xl font-black text-gray-900 text-center mb-3 md:mb-4 uppercase tracking-tighter">Sicuro di uscire?</h3>
            <p className="text-sm md:text-base text-gray-700 font-bold text-center mb-6 md:mb-8">
              Abbandonerai il team e non potrai più accedere al workspace. Il progetto rimarrà visibile in bacheca.
            </p>
            <div className="flex gap-3 md:gap-4">
              <button
                onClick={() => setConfirmLeave(null)}
                className="flex-1 py-3 md:py-4 rounded-xl font-black text-xs md:text-sm uppercase tracking-widest text-gray-900 bg-white border-3 md:border-4 border-gray-900 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[3px] hover:translate-y-[3px] transition-all"
              >
                Annulla
              </button>
              <button
                onClick={() => {
                  const project = projects.find(p => p.id === confirmLeave)
                  if (project) handleLeave(project)
                }}
                className="flex-1 py-3 md:py-4 rounded-xl font-black text-xs md:text-sm uppercase tracking-widest text-white bg-red-600 border-3 md:border-4 border-gray-900 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[3px] hover:translate-y-[3px] transition-all"
              >
                Abbandona
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}