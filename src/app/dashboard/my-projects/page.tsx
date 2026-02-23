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
          // ✅ AGGIUNTO (p: any) QUI SOTTO:
          creati.forEach((p: any) => { 
            allProjects.push({
              ...p,
              stato: p.stato || 'attivo',
              category: 'proprietario',
              pinned: p.pinned_by_creator || false, // Ora TypeScript accetta questa riga!
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
        // 1. Se sei il creatore, salviamo il pin nella tabella BANDO
        await supabase
          .from('bando')
          .update({ pinned_by_creator: newPinned } as any)
          .eq('id', project.id)

      } else if (project.partecipazione_id) {
        // 2. Se sei un membro, salviamo il pin nella tabella PARTECIPAZIONE
        await supabase
          .from('partecipazione')
          .update({ pinned: newPinned } as any) 
          .eq('id', project.partecipazione_id)
      }

      // Aggiorniamo la visualizzazione istantaneamente
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
        // AGGIUNTO as any
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
      // AGGIUNTO as any
      .update({ stato: 'abandoned' } as any) 
      .eq('id', project.partecipazione_id)

    setProjects(prev => prev.map(p => 
      p.id === project.id ? { ...p, category: 'abbandonato' } : p
    ))
    setConfirmLeave(null)
    setOpenMenuId(null)
  }

  // Filtro
  const filteredProjects = activeTab === 'tutti' 
    ? projects 
    : projects.filter(p => p.category === activeTab)

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
        return {
          border: 'border-amber-200 hover:border-amber-300',
          badge: 'bg-gradient-to-r from-amber-500 to-orange-500 text-white',
          icon: '👑',
          label: 'Proprietario'
        }
      case 'admin':
        return {
          border: 'border-blue-200 hover:border-blue-300',
          badge: 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white',
          icon: '🛡️',
          label: 'Admin'
        }
      case 'membro':
        return {
          border: 'border-emerald-200 hover:border-emerald-300',
          badge: 'bg-gradient-to-r from-emerald-500 to-green-500 text-white',
          icon: '👤',
          label: 'Membro'
        }
      case 'abbandonato':
        return {
          border: 'border-gray-300',
          badge: 'bg-gray-800 text-gray-400',
          icon: '💀',
          label: 'Abbandonato'
        }
    }
  }

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-gray-300 border-t-red-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-500 font-medium">Caricamento progetti...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="pb-20 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-4 mb-2">
          <button 
            onClick={() => router.push('/dashboard')}
            className="p-2 hover:bg-gray-100 rounded-xl text-gray-500 hover:text-gray-900 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">I Miei Progetti</h1>
            <p className="text-sm text-gray-500">Gestisci i tuoi progetti e le collaborazioni</p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl p-4 border border-amber-200">
          <p className="text-3xl font-bold text-amber-600">{counts.proprietario}</p>
          <p className="text-xs text-amber-700 font-medium mt-1">👑 Proprietario</p>
        </div>
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-4 border border-blue-200">
          <p className="text-3xl font-bold text-blue-600">{counts.admin}</p>
          <p className="text-xs text-blue-700 font-medium mt-1">🛡️ Admin</p>
        </div>
        <div className="bg-gradient-to-br from-emerald-50 to-green-50 rounded-2xl p-4 border border-emerald-200">
          <p className="text-3xl font-bold text-emerald-600">{counts.membro}</p>
          <p className="text-xs text-emerald-700 font-medium mt-1">👤 Membro</p>
        </div>
        <div className="bg-gray-50 rounded-2xl p-4 border border-gray-200">
          <p className="text-3xl font-bold text-gray-600">{counts.abbandonato}</p>
          <p className="text-xs text-gray-500 font-medium mt-1">💀 Abbandonati</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 p-1 bg-gray-100 rounded-2xl mb-6 overflow-x-auto">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm whitespace-nowrap transition-all ${
              activeTab === tab.id
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <span>{tab.icon}</span>
            <span className="hidden sm:inline">{tab.label}</span>
            {counts[tab.id] > 0 && (
              <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                activeTab === tab.id
                  ? 'bg-red-100 text-red-600'
                  : 'bg-gray-200 text-gray-600'
              }`}>
                {counts[tab.id]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Grid Progetti */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredProjects.map((project) => {
          const style = getCategoryStyle(project.category)
          const isAbandoned = project.category === 'abbandonato'

          return (
            <div 
              key={project.id}
              className={`group relative bg-white rounded-2xl border-2 overflow-hidden transition-all duration-300 hover:-translate-y-1 ${style.border} ${
                isAbandoned ? 'opacity-60 grayscale hover:opacity-80 hover:grayscale-0' : 'shadow-sm hover:shadow-lg'
              }`}
            >
              {/* Menu 3 puntini */}
              <div className="absolute top-3 right-3 z-30">
                <button
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    setOpenMenuId(openMenuId === project.id ? null : project.id)
                  }}
                  className="p-2 bg-white/90 backdrop-blur-sm rounded-xl shadow-sm hover:bg-white transition-colors"
                >
                  <svg className="w-4 h-4 text-gray-600" fill="currentColor" viewBox="0 0 24 24">
                    <circle cx="12" cy="5" r="2" />
                    <circle cx="12" cy="12" r="2" />
                    <circle cx="12" cy="19" r="2" />
                  </svg>
                </button>

                {/* Dropdown Menu */}
                {openMenuId === project.id && (
                  <div 
                    className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl shadow-xl border border-gray-100 py-2 z-40"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {/* Pin */}
                    <button
                      onClick={() => handlePin(project)}
                      className="w-full px-4 py-2.5 text-left text-sm hover:bg-gray-50 flex items-center gap-3 transition-colors"
                    >
                      <span>{project.pinned ? '📌' : '📍'}</span>
                      <span>{project.pinned ? 'Rimuovi pin' : 'Pinna in alto'}</span>
                    </button>

                    {/* Mute */}
                    <button
                      onClick={() => handleMute(project)}
                      className="w-full px-4 py-2.5 text-left text-sm hover:bg-gray-50 flex items-center gap-3 transition-colors"
                    >
                      <span>{project.muted ? '🔔' : '🔕'}</span>
                      <span>{project.muted ? 'Riattiva notifiche' : 'Silenzia notifiche'}</span>
                    </button>

                    {/* Divider */}
                    {project.category !== 'proprietario' && (
                      <>
                        <div className="h-px bg-gray-100 my-2" />
                        
                        {/* Leave */}
                        {project.category !== 'abbandonato' ? (
                          <button
                            onClick={() => setConfirmLeave(project.id)}
                            className="w-full px-4 py-2.5 text-left text-sm hover:bg-red-50 text-red-600 flex items-center gap-3 transition-colors"
                          >
                            <span>🚪</span>
                            <span>Abbandona progetto</span>
                          </button>
                        ) : (
                          <button
                            className="w-full px-4 py-2.5 text-left text-sm text-gray-400 flex items-center gap-3 cursor-not-allowed"
                            disabled
                          >
                            <span>💀</span>
                            <span>Già abbandonato</span>
                          </button>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Badge Categoria */}
              <div className="absolute top-3 left-3 z-20">
                <span className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold ${style.badge} shadow-lg`}>
                  <span>{style.icon}</span>
                  <span>{style.label}</span>
                </span>
              </div>

              {/* Indicatori Pin/Mute */}
              {(project.pinned || project.muted) && (
                <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 flex gap-1">
                  {project.pinned && (
                    <span className="bg-amber-100 text-amber-600 px-2 py-1 rounded-full text-xs font-bold">
                      📌
                    </span>
                  )}
                  {project.muted && (
                    <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded-full text-xs font-bold">
                      🔕
                    </span>
                  )}
                </div>
              )}

              {/* Link al workspace */}
              <Link href={isAbandoned ? '#' : `/dashboard/my_teams/${project.id}`} className={isAbandoned ? 'pointer-events-none' : ''}>
                {/* Immagine */}
                <div className="h-40 bg-gradient-to-br from-gray-100 to-gray-200 relative overflow-hidden">
                  {project.foto_url ? (
                    <img 
                      src={project.foto_url} 
                      alt={project.titolo} 
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" 
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <div className="w-12 h-12 rounded-2xl bg-white shadow-sm flex items-center justify-center">
                        <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                        </svg>
                      </div>
                    </div>
                  )}
                  
                  {/* Stato progetto */}
                  <div className="absolute bottom-3 right-3">
                    <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                      project.stato === 'chiuso' 
                        ? 'bg-black/70 text-white' 
                        : 'bg-white/90 text-gray-700'
                    }`}>
                      {project.stato === 'chiuso' ? '🔒 Chiuso' : '🟢 Aperto'}
                    </span>
                  </div>
                </div>

                {/* Contenuto */}
                <div className="p-5">
                  <h3 className="font-bold text-gray-900 text-lg leading-snug line-clamp-2 mb-2 group-hover:text-red-700 transition-colors">
                    {project.titolo}
                  </h3>
                  
                  <p className="text-gray-500 text-sm line-clamp-2 mb-4 leading-relaxed">
                    {project.descrizione}
                  </p>

                  <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                    <span className="text-xs text-gray-400">
                      {new Date(project.data_creazione).toLocaleDateString('it-IT', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric'
                      })}
                    </span>
                    
                    {!isAbandoned && (
                      <span className="flex items-center gap-1.5 text-sm font-medium text-gray-600 group-hover:text-red-600 transition-colors">
                        Workspace
                        <svg className="w-4 h-4 transition-transform group-hover:translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
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
        <div className="text-center py-20">
          <div className="w-20 h-20 mx-auto mb-6 rounded-3xl bg-gray-100 flex items-center justify-center">
            <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">
            {activeTab === 'tutti' ? 'Nessun progetto' : `Nessun progetto come ${tabs.find(t => t.id === activeTab)?.label}`}
          </h3>
          <p className="text-gray-500 mb-6">
            {activeTab === 'proprietario' 
              ? 'Crea il tuo primo progetto per iniziare!'
              : 'Esplora la bacheca per trovare progetti interessanti'
            }
          </p>
          <Link 
            href={activeTab === 'proprietario' ? '/dashboard/create-project' : '/dashboard'}
            className="inline-flex items-center gap-2 bg-red-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-red-700 transition-colors"
          >
            {activeTab === 'proprietario' ? (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Crea progetto
              </>
            ) : (
              <>
                Esplora bacheca
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </>
            )}
          </Link>
        </div>
      )}

      {/* Modal Conferma Abbandono */}
      {confirmLeave && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center">
              <span className="text-3xl">🚪</span>
            </div>
            <h3 className="text-xl font-bold text-gray-900 text-center mb-2">Abbandonare il progetto?</h3>
            <p className="text-gray-500 text-center mb-6">
              Uscirai dal team e non potrai più accedere al workspace. Potrai comunque vedere il progetto nella bacheca pubblica.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmLeave(null)}
                className="flex-1 py-3 rounded-xl font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors"
              >
                Annulla
              </button>
              <button
                onClick={() => {
                  const project = projects.find(p => p.id === confirmLeave)
                  if (project) handleLeave(project)
                }}
                className="flex-1 py-3 rounded-xl font-semibold text-white bg-red-600 hover:bg-red-700 transition-colors"
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