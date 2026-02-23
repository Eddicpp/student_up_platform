'use client'

import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

export default function HomePage() {
  const supabase = createClient()
  
  // Stati dati
  const [user, setUser] = useState<any>(null)
  const [userName, setUserName] = useState('')
  const [bandi, setBandi] = useState<any[]>([])
  const [userRolesMap, setUserRolesMap] = useState<Record<string, string>>({})
  const [userStatusMap, setUserStatusMap] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)

  // Stati filtri
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<'recenti' | 'vecchi' | 'nome_az' | 'nome_za'>('recenti')
  const [filterTab, setFilterTab] = useState<'tutti' | 'miei' | 'aperti' | 'chiusi'>('tutti')

  // Fetch dati
  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: { user: authUser } } = await supabase.auth.getUser()
        setUser(authUser)

        if (authUser) {
          // Fetch nome utente
          const { data: studente } = await supabase
            .from('studente')
            .select('nome')
            .eq('id', authUser.id)
            .maybeSingle()
          setUserName(studente?.nome || '')

          // Fetch partecipazioni
          const { data: partecipazioni } = await supabase
            .from('partecipazione')
            .select('bando_id, ruolo, stato')
            .eq('studente_id', authUser.id)
          
          if (partecipazioni) {
            const rolesMap: Record<string, string> = {}
            const statusMap: Record<string, string> = {}
            partecipazioni.forEach((p: any) => {
              rolesMap[p.bando_id] = p.ruolo || 'membro'
              statusMap[p.bando_id] = p.stato
            })
            setUserRolesMap(rolesMap)
            setUserStatusMap(statusMap)
          }
        }

        // Fetch bandi
        const { data: bandiBruti } = await supabase
          .from('bando')
          .select(`*, bando_interesse ( interesse ( nome ) )`)
          .order('data_creazione', { ascending: false })

        setBandi(bandiBruti || [])
      } catch (err) {
        console.error('Errore fetch:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  // Filtri e ordinamento
  const filteredBandi = useMemo(() => {
    let result = [...bandi]

    // Filtro per tab
    if (filterTab === 'miei') {
      result = result.filter(b => 
        user && (b.creatore_studente_id === user.id || userStatusMap[b.id] === 'accepted')
      )
    } else if (filterTab === 'aperti') {
      result = result.filter(b => b.stato !== 'chiuso')
    } else if (filterTab === 'chiusi') {
      result = result.filter(b => b.stato === 'chiuso')
    }

    // Filtro per ricerca
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      result = result.filter(b => 
        b.titolo?.toLowerCase().includes(query) ||
        b.descrizione?.toLowerCase().includes(query) ||
        b.bando_interesse?.some((bi: any) => 
          bi.interesse?.nome?.toLowerCase().includes(query)
        )
      )
    }

    // Ordinamento
    result.sort((a, b) => {
      // Prima ordina per abbandonati (sempre in fondo)
      const isA_Abandoned = userStatusMap[a.id] === 'abandoned'
      const isB_Abandoned = userStatusMap[b.id] === 'abandoned'
      if (isA_Abandoned && !isB_Abandoned) return 1
      if (!isA_Abandoned && isB_Abandoned) return -1

      // Poi ordina per criterio selezionato
      switch (sortBy) {
        case 'recenti':
          return new Date(b.data_creazione).getTime() - new Date(a.data_creazione).getTime()
        case 'vecchi':
          return new Date(a.data_creazione).getTime() - new Date(b.data_creazione).getTime()
        case 'nome_az':
          return (a.titolo || '').localeCompare(b.titolo || '')
        case 'nome_za':
          return (b.titolo || '').localeCompare(a.titolo || '')
        default:
          return 0
      }
    })

    return result
  }, [bandi, searchQuery, sortBy, filterTab, user, userStatusMap])

  // Contatori
  const totalProjects = bandi.length
  const myProjects = bandi.filter(b => 
    user && (b.creatore_studente_id === user.id || userStatusMap[b.id] === 'accepted')
  ).length

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
    <div className="pb-20 max-w-7xl mx-auto px-4 lg:px-8">
      
      {/* HERO SECTION */}
      <div className="relative mb-8 pt-4">
        <div className="absolute -top-20 -left-20 w-72 h-72 bg-red-200 rounded-full blur-3xl opacity-20 pointer-events-none" />
        <div className="absolute -top-10 right-0 w-96 h-96 bg-orange-200 rounded-full blur-3xl opacity-10 pointer-events-none" />
        
        <div className="relative">
          {userName && (
            <p className="text-red-600 font-semibold text-sm tracking-wide mb-2">
              Bentornato, {userName} 👋
            </p>
          )}
          
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
            <div>
              <h1 className="text-4xl lg:text-5xl font-black text-gray-900 tracking-tight">
                Bacheca Progetti
              </h1>
              <p className="text-gray-500 mt-3 max-w-lg">
                Esplora i progetti aperti, trova il team perfetto per le tue competenze.
              </p>
              
              <div className="flex gap-3 mt-6">
                <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-full px-4 py-2 shadow-sm">
                  <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  <span className="text-sm text-gray-600"><strong className="text-gray-900">{totalProjects}</strong> progetti</span>
                </div>
                {myProjects > 0 && (
                  <div className="flex items-center gap-2 bg-red-50 border border-red-100 rounded-full px-4 py-2">
                    <span className="text-sm text-red-600"><strong>{myProjects}</strong> tuoi</span>
                  </div>
                )}
              </div>
            </div>
            
            <Link 
              href="/dashboard/create-project" 
              className="group relative inline-flex items-center gap-3 bg-gray-900 text-white px-6 py-4 rounded-2xl font-semibold hover:bg-gray-800 transition-all duration-300 shadow-lg hover:shadow-xl hover:-translate-y-0.5 self-start lg:self-auto"
            >
              <span className="w-8 h-8 bg-white/20 rounded-xl flex items-center justify-center group-hover:bg-white/30 transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                </svg>
              </span>
              Nuovo Progetto
            </Link>
          </div>
        </div>
      </div>

      {/* SEARCH & FILTERS */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4 mb-6 shadow-sm">
        <div className="flex flex-col lg:flex-row gap-4">
          
          {/* Barra di ricerca */}
          <div className="flex-1 relative">
            <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Cerca per nome, descrizione o tag..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-gray-50 rounded-xl border border-gray-200 focus:border-red-500 focus:ring-2 focus:ring-red-500/20 outline-none text-sm transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

          {/* Ordinamento */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500 whitespace-nowrap">Ordina:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-4 py-3 bg-gray-50 rounded-xl border border-gray-200 focus:border-red-500 focus:ring-2 focus:ring-red-500/20 outline-none text-sm font-medium text-gray-700 cursor-pointer"
            >
              <option value="recenti">📅 Più recenti</option>
              <option value="vecchi">📅 Meno recenti</option>
              <option value="nome_az">🔤 Nome A-Z</option>
              <option value="nome_za">🔤 Nome Z-A</option>
            </select>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 mt-4 overflow-x-auto pb-1">
          {[
            { id: 'tutti', label: 'Tutti', icon: '📋' },
            { id: 'miei', label: 'I miei', icon: '👑' },
            { id: 'aperti', label: 'Aperti', icon: '🟢' },
            { id: 'chiusi', label: 'Chiusi', icon: '🔒' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setFilterTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                filterTab === tab.id
                  ? 'bg-gray-900 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <span>{tab.icon}</span>
              {tab.label}
              {tab.id === 'tutti' && (
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                  filterTab === tab.id ? 'bg-white/20' : 'bg-gray-200'
                }`}>
                  {bandi.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Risultati ricerca */}
        {searchQuery && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <p className="text-sm text-gray-500">
              {filteredBandi.length} risultat{filteredBandi.length === 1 ? 'o' : 'i'} per "<span className="font-medium text-gray-700">{searchQuery}</span>"
            </p>
          </div>
        )}
      </div>
      
      {/* GRID PROGETTI */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredBandi.map((bando: any, index: number) => {
          
          const isOwner = user && (bando.creatore_studente_id === user.id || bando.creatore_azienda_id === user.id)
          const pStatus = userStatusMap[bando.id]
          const isAbandoned = pStatus === 'abandoned'
          
          const userRole = userRolesMap[bando.id]
          const isAdmin = pStatus === 'accepted' && userRole === 'admin'
          const isSimpleMember = pStatus === 'accepted' && userRole === 'membro'
          
          const isInTeam = isOwner || isAdmin || isSimpleMember
          const isChiuso = bando.stato === 'chiuso'

          let config = {
            cardBg: 'bg-white',
            cardBorder: 'border-gray-100 hover:border-gray-200',
            cardShadow: 'shadow-sm hover:shadow-lg',
            badgeIcon: '',
            badgeText: '',
            badgeClass: '',
            imageOverlay: '',
            tagBg: 'bg-gray-100 text-gray-600',
            opacity: '',
          }

          if (isAbandoned) {
            config = {
              ...config,
              cardBg: 'bg-gray-50',
              cardBorder: 'border-gray-200',
              cardShadow: 'shadow-none',
              badgeIcon: '💀',
              badgeText: 'Abbandonato',
              badgeClass: 'bg-gray-900 text-gray-400',
              opacity: 'opacity-50 grayscale hover:opacity-70 hover:grayscale-0',
            }
          } else if (isOwner) {
            config = {
              ...config,
              cardBorder: 'border-amber-200 hover:border-amber-300',
              badgeIcon: '👑',
              badgeText: 'Owner',
              badgeClass: 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg shadow-amber-500/25',
              tagBg: 'bg-amber-100 text-amber-700',
            }
          } else if (isAdmin) {
            config = {
              ...config,
              cardBorder: 'border-blue-200 hover:border-blue-300',
              badgeIcon: '🛡️',
              badgeText: 'Admin',
              badgeClass: 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-lg shadow-blue-500/25',
              tagBg: 'bg-blue-100 text-blue-700',
            }
          } else if (isSimpleMember) {
            config = {
              ...config,
              cardBorder: 'border-emerald-200 hover:border-emerald-300',
              badgeIcon: '✓',
              badgeText: 'Nel Team',
              badgeClass: 'bg-gradient-to-r from-emerald-500 to-green-500 text-white shadow-lg shadow-emerald-500/25',
              tagBg: 'bg-emerald-100 text-emerald-700',
            }
          } else if (isChiuso) {
            config = {
              ...config,
              opacity: 'opacity-60 hover:opacity-100',
              imageOverlay: 'after:absolute after:inset-0 after:bg-black/40',
            }
          }

          const linkTarget = isInTeam && !isAbandoned 
            ? `/dashboard/my_teams/${bando.id}` 
            : `/dashboard/projects/${bando.id}`

          return (
            <Link 
              key={bando.id} 
              href={linkTarget} 
              className={`group block ${config.opacity}`}
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <article className={`
                relative rounded-2xl overflow-hidden border-2 transition-all duration-300
                ${config.cardBg} ${config.cardBorder} ${config.cardShadow}
                hover:-translate-y-1
              `}>
                
                {(isInTeam || isAbandoned) && (
                  <div className={`
                    absolute top-4 left-4 z-20 
                    flex items-center gap-1.5 px-3 py-1.5 rounded-full
                    text-xs font-bold tracking-wide
                    ${config.badgeClass}
                  `}>
                    <span>{config.badgeIcon}</span>
                    <span>{config.badgeText}</span>
                  </div>
                )}

                {!isInTeam && !isAbandoned && (
                  <div className="absolute top-4 right-4 z-20">
                    <span className={`
                      px-3 py-1.5 rounded-full text-xs font-bold tracking-wide
                      ${isChiuso 
                        ? 'bg-black/80 text-white backdrop-blur-sm' 
                        : 'bg-white/90 text-gray-900 backdrop-blur-sm shadow-sm'
                      }
                    `}>
                      {isChiuso ? '🔒 Chiuso' : '🟢 Aperto'}
                    </span>
                  </div>
                )}

                <div className={`relative h-44 overflow-hidden ${config.imageOverlay}`}>
                  {bando.foto_url ? (
                    <img 
                      src={bando.foto_url} 
                      alt={bando.titolo} 
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" 
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                      <div className="text-center">
                        <div className="w-12 h-12 mx-auto mb-2 rounded-2xl bg-white shadow-sm flex items-center justify-center">
                          <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                          </svg>
                        </div>
                        <span className="text-xs text-gray-400 font-medium">No preview</span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="p-5">
                  <h3 className="font-bold text-gray-900 text-lg leading-snug line-clamp-2 mb-2 group-hover:text-red-700 transition-colors">
                    {bando.titolo}
                  </h3>
                  
                  <p className="text-gray-500 text-sm line-clamp-2 mb-4 leading-relaxed">
                    {bando.descrizione}
                  </p>

                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {bando.bando_interesse?.slice(0, 3).map((item: any, idx: number) => (
                      <span 
                        key={idx} 
                        className={`text-[11px] px-2.5 py-1 rounded-md font-medium ${config.tagBg}`}
                      >
                        {item.interesse?.nome}
                      </span>
                    ))}
                    {bando.bando_interesse?.length > 3 && (
                      <span className="text-[11px] px-2.5 py-1 rounded-md font-medium bg-gray-100 text-gray-500">
                        +{bando.bando_interesse.length - 3}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                    <span className="text-xs text-gray-400">
                      {new Date(bando.data_creazione).toLocaleDateString('it-IT', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric'
                      })}
                    </span>
                    
                    <span className="flex items-center gap-1.5 text-sm font-medium text-gray-600 group-hover:text-red-600 transition-colors">
                      {isAbandoned ? (
                        'Non disponibile'
                      ) : isInTeam ? (
                        <>
                          Workspace
                          <svg className="w-4 h-4 transition-transform group-hover:translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </>
                      ) : (
                        <>
                          Scopri
                          <svg className="w-4 h-4 transition-transform group-hover:translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </>
                      )}
                    </span>
                  </div>
                </div>
              </article>
            </Link>
          )
        })}
      </div>

      {/* Empty State */}
      {filteredBandi.length === 0 && (
        <div className="text-center py-20">
          <div className="w-20 h-20 mx-auto mb-6 rounded-3xl bg-gray-100 flex items-center justify-center">
            {searchQuery ? (
              <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            ) : (
              <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
            )}
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">
            {searchQuery ? 'Nessun risultato' : 'Nessun progetto trovato'}
          </h3>
          <p className="text-gray-500 mb-6">
            {searchQuery 
              ? `Nessun progetto corrisponde a "${searchQuery}"`
              : 'Sii il primo a creare un progetto!'
            }
          </p>
          {searchQuery ? (
            <button 
              onClick={() => setSearchQuery('')}
              className="inline-flex items-center gap-2 bg-gray-100 text-gray-700 px-6 py-3 rounded-xl font-semibold hover:bg-gray-200 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Cancella ricerca
            </button>
          ) : (
            <Link 
              href="/dashboard/create-project"
              className="inline-flex items-center gap-2 bg-red-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-red-700 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Crea il primo progetto
            </Link>
          )}
        </div>
      )}
    </div>
  )
}