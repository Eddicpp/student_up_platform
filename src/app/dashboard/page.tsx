'use client'

import { useState, useEffect, useMemo, Suspense } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'

function DashboardContent() {
  const supabase = createClient()
  
  const searchParams = useSearchParams()
  const isVerified = searchParams.get('verified') === 'true'
  
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
          const { data: studente } = await supabase
            .from('studente')
            .select('nome')
            .eq('id', authUser.id)
            .maybeSingle()
          setUserName(studente?.nome || '')

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

    if (filterTab === 'miei') {
      result = result.filter(b => 
        user && (b.creatore_studente_id === user.id || userStatusMap[b.id] === 'accepted')
      )
    } else if (filterTab === 'aperti') {
      result = result.filter(b => b.stato !== 'chiuso')
    } else if (filterTab === 'chiusi') {
      result = result.filter(b => b.stato === 'chiuso')
    }

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

    result.sort((a, b) => {
      const isA_Abandoned = userStatusMap[a.id] === 'abandoned'
      const isB_Abandoned = userStatusMap[b.id] === 'abandoned'
      if (isA_Abandoned && !isB_Abandoned) return 1
      if (!isA_Abandoned && isB_Abandoned) return -1

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

  const totalProjects = bandi.length
  const myProjects = bandi.filter(b => 
    user && (b.creatore_studente_id === user.id || userStatusMap[b.id] === 'accepted')
  ).length

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl animate-bounce mb-4">🚀</div>
          <p className="text-gray-900 font-black uppercase tracking-widest">Caricamento bacheca...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="pb-20 max-w-7xl mx-auto px-4 lg:px-8">
      
      {/* BANNER DI SUCCESSO BRUTALISTA */}
      {isVerified && (
        <div className="bg-green-400 border-4 border-gray-900 text-gray-900 p-4 mt-6 mb-2 font-black uppercase tracking-widest shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] rounded-xl flex items-center gap-3">
          <span className="text-2xl">✅</span> Email verificata con successo! Benvenuto a bordo.
        </div>
      )}

      {/* HERO SECTION CARTOON */}
      <div className="relative mb-10 pt-6">
        <div className="relative">
          {userName && (
            <p className="text-red-600 font-black text-sm tracking-widest uppercase mb-2">
              Bentornato, {userName} 👋
            </p>
          )}
          
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
            <div>
              <h1 className="text-5xl lg:text-7xl font-black text-gray-900 tracking-tighter uppercase italic leading-none">
                Bacheca <span className="text-red-600">Progetti</span>
              </h1>
              <p className="text-gray-600 mt-4 max-w-lg font-bold text-lg leading-tight">
                Esplora i progetti aperti, trova il team perfetto per le tue competenze.
              </p>
              
              <div className="flex flex-wrap gap-3 mt-6">
                <div className="flex items-center gap-2 bg-white border-2 border-gray-900 rounded-xl px-4 py-2 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
                  <span className="w-3 h-3 bg-green-500 border border-gray-900 rounded-full animate-pulse" />
                  <span className="text-sm font-bold text-gray-700 uppercase tracking-widest"><strong className="text-gray-900 font-black">{totalProjects}</strong> progetti</span>
                </div>
                {myProjects > 0 && (
                  <div className="flex items-center gap-2 bg-amber-300 border-2 border-gray-900 rounded-xl px-4 py-2 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
                    <span className="text-sm font-bold text-gray-900 uppercase tracking-widest"><strong className="font-black">{myProjects}</strong> tuoi</span>
                  </div>
                )}
              </div>
            </div>
            
            <Link 
              href="/dashboard/create-project" 
              className="group relative inline-flex items-center gap-3 bg-red-600 text-white px-8 py-4 rounded-xl font-black uppercase tracking-widest text-lg border-4 border-gray-900 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[6px] hover:translate-y-[6px] transition-all self-start lg:self-auto"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Nuovo Progetto
            </Link>
          </div>
        </div>
      </div>

      {/* SEARCH & FILTERS CARTOON */}
      <div className="mb-10">
        <div className="flex flex-col lg:flex-row gap-4 mb-4">
          
          {/* ✅ Barra di ricerca Scurita e Cartoon */}
          <div className="flex-1 relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl z-10">🔍</span>
            <input
              type="text"
              placeholder="Cerca per nome, descrizione o tag..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-12 py-4 bg-white border-4 border-gray-900 rounded-xl text-gray-900 font-black placeholder:text-gray-600 placeholder:font-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] focus:outline-none focus:translate-x-[6px] focus:translate-y-[6px] focus:shadow-none transition-all text-lg"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-900 hover:bg-gray-200 p-1.5 rounded-lg transition-colors border-2 border-transparent hover:border-gray-900 z-10"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

          {/* Ordinamento Cartoon */}
          <div className="flex items-center gap-3">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-6 py-4 bg-white rounded-xl border-4 border-gray-900 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] outline-none text-base font-black text-gray-900 uppercase tracking-widest cursor-pointer focus:translate-x-[6px] focus:translate-y-[6px] focus:shadow-none transition-all appearance-none pr-10 relative"
              style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='black' stroke-width='3'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`, backgroundPosition: 'right 1rem center', backgroundRepeat: 'no-repeat', backgroundSize: '1.2em' }}
            >
              <option value="recenti">📅 Recenti</option>
              <option value="vecchi">📅 Vecchi</option>
              <option value="nome_az">🔤 A - Z</option>
              <option value="nome_za">🔤 Z - A</option>
            </select>
          </div>
        </div>

        {/* Filter Tabs Cartoon */}
        <div className="flex flex-wrap gap-3 mt-6">
          {[
            { id: 'tutti', label: 'Tutti', icon: '📋' },
            { id: 'miei', label: 'I miei', icon: '👑' },
            { id: 'aperti', label: 'Aperti', icon: '🟢' },
            { id: 'chiusi', label: 'Chiusi', icon: '🔒' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setFilterTab(tab.id as any)}
              className={`flex items-center gap-2 px-5 py-3 rounded-xl font-black text-sm uppercase tracking-widest transition-all border-2 border-gray-900 ${
                filterTab === tab.id
                  ? 'bg-gray-900 text-white shadow-[4px_4px_0px_0px_rgba(220,38,38,1)] translate-x-[2px] translate-y-[2px]'
                  : 'bg-white text-gray-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[4px] hover:translate-y-[4px]'
              }`}
            >
              <span className="text-lg">{tab.icon}</span>
              {tab.label}
              {tab.id === 'tutti' && (
                <span className={`px-2 py-0.5 rounded-md text-[10px] font-black ${
                  filterTab === tab.id ? 'bg-red-600 text-white' : 'bg-gray-200 text-gray-900'
                }`}>
                  {bandi.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Risultati ricerca text */}
        {searchQuery && (
          <div className="mt-4 inline-block bg-yellow-300 border-2 border-gray-900 px-4 py-2 rounded-xl shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
            <p className="text-sm font-black text-gray-900 uppercase tracking-widest">
              {filteredBandi.length} {filteredBandi.length === 1 ? 'Risultato' : 'Risultati'} per "<span className="text-red-600">{searchQuery}</span>"
            </p>
          </div>
        )}
      </div>
      
      {/* GRID PROGETTI CARTOON */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
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
            badgeIcon: '',
            badgeText: '',
            badgeClass: '',
            imageOverlay: '',
            tagBg: 'bg-gray-100 text-gray-900 border-2 border-gray-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]',
            opacity: '',
          }

          if (isAbandoned) {
            config = {
              ...config,
              cardBg: 'bg-gray-50',
              badgeIcon: '💀',
              badgeText: 'Abbandonato',
              badgeClass: 'bg-gray-300 text-gray-900 border-2 border-gray-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]',
              opacity: 'opacity-70 grayscale hover:opacity-100 hover:grayscale-0',
              tagBg: 'bg-gray-200 text-gray-500 border-2 border-gray-400'
            }
          } else if (isOwner) {
            config = {
              ...config,
              badgeIcon: '👑',
              badgeText: 'Owner',
              badgeClass: 'bg-amber-400 text-gray-900 border-2 border-gray-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]',
              tagBg: 'bg-amber-100 text-gray-900 border-2 border-gray-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]',
            }
          } else if (isAdmin) {
            config = {
              ...config,
              badgeIcon: '🛡️',
              badgeText: 'Admin',
              badgeClass: 'bg-blue-400 text-gray-900 border-2 border-gray-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]',
              tagBg: 'bg-blue-100 text-gray-900 border-2 border-gray-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]',
            }
          } else if (isSimpleMember) {
            config = {
              ...config,
              badgeIcon: '👤',
              badgeText: 'Membro',
              badgeClass: 'bg-emerald-400 text-gray-900 border-2 border-gray-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]',
              tagBg: 'bg-emerald-100 text-gray-900 border-2 border-gray-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]',
            }
          } else if (isChiuso) {
            config = {
              ...config,
              opacity: 'opacity-70 hover:opacity-100',
              imageOverlay: 'after:absolute after:inset-0 after:bg-black/50',
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
                relative rounded-2xl overflow-hidden border-2 border-gray-900 transition-all duration-200
                ${config.cardBg} shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]
                hover:-translate-y-2 hover:shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] flex flex-col h-full
              `}>
                
                {(isInTeam || isAbandoned) && (
                  <div className={`
                    absolute top-4 left-4 z-20 
                    flex items-center gap-1.5 px-3 py-1.5 rounded-xl
                    text-xs font-black tracking-widest uppercase
                    ${config.badgeClass}
                  `}>
                    <span className="text-sm">{config.badgeIcon}</span>
                    <span>{config.badgeText}</span>
                  </div>
                )}

                {!isInTeam && !isAbandoned && (
                  <div className="absolute top-4 right-4 z-20">
                    <span className={`
                      px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-widest border-2 border-gray-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]
                      ${isChiuso ? 'bg-black text-white' : 'bg-green-400 text-black'}
                    `}>
                      {isChiuso ? '🔒 Chiuso' : '🟢 Aperto'}
                    </span>
                  </div>
                )}

                <div className={`relative h-48 border-b-2 border-gray-900 overflow-hidden ${config.imageOverlay}`}>
                  {bando.foto_url ? (
                    <img 
                      src={bando.foto_url} 
                      alt={bando.titolo} 
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
                    />
                  ) : (
                    <div className="w-full h-full bg-blue-100 flex items-center justify-center pattern-dots">
                      <div className="w-16 h-16 rounded-2xl bg-white border-2 border-gray-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center">
                        <svg className="w-8 h-8 text-gray-900" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                        </svg>
                      </div>
                    </div>
                  )}
                </div>

                <div className="p-6 flex flex-col flex-1">
                  <h3 className="font-black text-gray-900 text-xl leading-tight line-clamp-2 mb-3 uppercase group-hover:text-red-600 transition-colors">
                    {bando.titolo}
                  </h3>
                  
                  <p className="text-gray-700 font-bold text-sm line-clamp-2 mb-5">
                    {bando.descrizione}
                  </p>

                  <div className="flex flex-wrap gap-2 mb-6">
                    {bando.bando_interesse?.slice(0, 3).map((item: any, idx: number) => (
                      <span 
                        key={idx} 
                        className={`text-[10px] px-2.5 py-1 font-black uppercase tracking-widest rounded-lg ${config.tagBg}`}
                      >
                        {item.interesse?.nome}
                      </span>
                    ))}
                    {bando.bando_interesse?.length > 3 && (
                      <span className="text-[10px] px-2.5 py-1 rounded-lg font-black uppercase tracking-widest bg-gray-200 text-gray-900 border-2 border-gray-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                        +{bando.bando_interesse.length - 3}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t-2 border-dashed border-gray-300 mt-auto">
                    <span className="text-xs font-black text-gray-500 uppercase tracking-widest">
                      {new Date(bando.data_creazione).toLocaleDateString('it-IT', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric'
                      })}
                    </span>
                    
                    <span className="flex items-center gap-1.5 text-xs font-black text-gray-900 uppercase tracking-widest bg-yellow-300 px-3 py-1.5 rounded-lg border-2 border-gray-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] group-hover:bg-yellow-400 group-hover:translate-x-[2px] group-hover:translate-y-[2px] group-hover:shadow-none transition-all">
                      {isAbandoned ? (
                        'Bloccato'
                      ) : isInTeam ? (
                        <>
                          Workspace
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                          </svg>
                        </>
                      ) : (
                        <>
                          Scopri
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
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

      {/* EMPTY STATE CARTOON */}
      {filteredBandi.length === 0 && (
        <div className="text-center py-24 bg-white border-4 border-gray-900 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] rounded-3xl mt-8">
          <div className="w-24 h-24 mx-auto mb-6 rounded-3xl bg-blue-100 border-4 border-gray-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center -rotate-6">
            {searchQuery ? (
              <span className="text-5xl">🕵️‍♂️</span>
            ) : (
              <span className="text-5xl">🏜️</span>
            )}
          </div>
          <h3 className="text-3xl font-black text-gray-900 mb-4 uppercase tracking-tight">
            {searchQuery ? 'Nessun risultato' : 'Nessun progetto trovato'}
          </h3>
          <p className="text-gray-600 font-bold mb-8 max-w-md mx-auto text-lg leading-tight">
            {searchQuery 
              ? `Nessun progetto corrisponde a "${searchQuery}". Prova con altre parole chiave!`
              : 'Sii il primo a creare un progetto e inizia a costruire il tuo team!'
            }
          </p>
          {searchQuery ? (
            <button 
              onClick={() => setSearchQuery('')}
              className="inline-flex items-center gap-3 bg-white text-gray-900 px-8 py-4 rounded-xl font-black uppercase tracking-widest text-lg border-4 border-gray-900 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:bg-gray-100 hover:shadow-none hover:translate-x-[6px] hover:translate-y-[6px] transition-all"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
              Azzera ricerca
            </button>
          ) : (
            <Link 
              href="/dashboard/create-project"
              className="inline-flex items-center gap-3 bg-red-600 text-white px-8 py-4 rounded-xl font-black uppercase tracking-widest text-lg border-4 border-gray-900 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[6px] hover:translate-y-[6px] transition-all"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Crea progetto
            </Link>
          )}
        </div>
      )}
    </div>
  )
}

// Wrapper Suspense
export default function HomePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-xl font-black text-red-800 uppercase tracking-widest animate-pulse border-4 border-red-800 p-6 rounded-2xl shadow-[6px_6px_0px_0px_rgba(153,27,27,1)] bg-white">
          ⏳ Caricamento...
        </div>
      </div>
    }>
      <DashboardContent />
    </Suspense>
  )
}