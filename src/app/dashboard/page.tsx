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

  // Conteggi per tabs
  const counts = useMemo(() => ({
    tutti: bandi.length,
    miei: bandi.filter(b => user && (b.creatore_studente_id === user.id || userStatusMap[b.id] === 'accepted')).length,
    aperti: bandi.filter(b => b.stato !== 'chiuso').length,
    chiusi: bandi.filter(b => b.stato === 'chiuso').length,
  }), [bandi, user, userStatusMap])

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl sm:text-6xl animate-bounce mb-4">🚀</div>
          <p className="text-gray-900 font-black uppercase tracking-widest text-sm sm:text-base">Caricamento...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="pb-24 sm:pb-20 max-w-7xl mx-auto px-3 sm:px-4 lg:px-8">
      
      {/* BANNER DI SUCCESSO */}
      {isVerified && (
        <div className="bg-green-400 border-2 sm:border-4 border-gray-900 text-gray-900 p-3 sm:p-4 mt-4 sm:mt-6 mb-2 font-black uppercase tracking-widest shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] rounded-xl flex items-center gap-2 sm:gap-3 text-xs sm:text-base">
          <span className="text-lg sm:text-2xl">✅</span> Email verificata! Benvenuto.
        </div>
      )}

      {/* HERO SECTION - COMPATTO SU MOBILE */}
      <div className="relative mb-6 sm:mb-10 pt-4 sm:pt-6">
        <div className="relative">
          {userName && (
            <p className="text-red-600 font-black text-[10px] sm:text-sm tracking-widest uppercase mb-1 sm:mb-2">
              Bentornato, {userName} 👋
            </p>
          )}
          
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4 sm:gap-6">
            <div>
              <h1 className="text-2xl sm:text-5xl lg:text-6xl font-black text-gray-900 tracking-tighter uppercase italic leading-none">
                Bacheca <span className="text-red-600">Progetti</span>
              </h1>
              <p className="text-gray-600 mt-2 sm:mt-4 max-w-lg font-bold text-xs sm:text-base leading-tight">
                Esplora i progetti aperti e trova il team perfetto.
              </p>
              
              {/* Stats badges - compatti */}
              <div className="flex flex-wrap gap-2 mt-3 sm:mt-6">
                <div className="flex items-center gap-1.5 bg-white border-2 border-gray-900 rounded-lg sm:rounded-xl px-2 sm:px-4 py-1 sm:py-2 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                  <span className="w-2 h-2 sm:w-3 sm:h-3 bg-green-500 border border-gray-900 rounded-full animate-pulse" />
                  <span className="text-[10px] sm:text-sm font-black text-gray-900 uppercase">{totalProjects} progetti</span>
                </div>
                {myProjects > 0 && (
                  <div className="flex items-center gap-1.5 bg-amber-300 border-2 border-gray-900 rounded-lg sm:rounded-xl px-2 sm:px-4 py-1 sm:py-2 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                    <span className="text-[10px] sm:text-sm font-black text-gray-900 uppercase">{myProjects} tuoi</span>
                  </div>
                )}
              </div>
            </div>
            
            {/* CTA NUOVO PROGETTO - PIÙ PROMINENTE */}
            <Link 
              href="/dashboard/create-project" 
              className="hidden sm:inline-flex group relative items-center justify-center gap-2 sm:gap-3 bg-gradient-to-r from-red-500 to-red-600 text-white px-6 sm:px-8 py-3 sm:py-4 rounded-xl sm:rounded-2xl font-black uppercase tracking-widest text-sm sm:text-lg border-3 sm:border-4 border-gray-900 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[6px] hover:translate-y-[6px] transition-all animate-pulse hover:animate-none"
            >
              {/* Sparkle decorations */}
              <span className="absolute -top-2 -right-2 text-xl sm:text-2xl animate-bounce">✨</span>
              <span className="absolute -bottom-1 -left-1 text-lg sm:text-xl animate-bounce" style={{animationDelay: '0.5s'}}>⭐</span>
              
              <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Nuovo Progetto
            </Link>
          </div>
        </div>
      </div>

      {/* SEARCH & FILTERS - COMPATTO E ELEGANTE */}
      <div className="mb-6 sm:mb-10">
        
        {/* Search + Sort Row */}
        <div className="flex gap-2 sm:gap-4 mb-3 sm:mb-4">
          
          {/* Barra di ricerca */}
          <div className="flex-1 relative">
            <span className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 text-base sm:text-xl z-10">🔍</span>
            <input
              type="text"
              placeholder="Cerca progetti..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 sm:pl-12 pr-9 sm:pr-12 py-2.5 sm:py-3 bg-white border-2 sm:border-3 border-gray-900 rounded-xl text-gray-900 font-bold text-sm sm:text-base placeholder:text-gray-500 placeholder:font-bold shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] sm:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] focus:outline-none focus:shadow-none focus:translate-x-[3px] focus:translate-y-[3px] transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 sm:right-3 top-1/2 -translate-y-1/2 text-gray-900 hover:bg-gray-200 p-1 rounded-lg transition-colors z-10"
              >
                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

          {/* Ordinamento - Compatto */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-2 sm:px-4 py-2.5 sm:py-3 bg-white rounded-xl border-2 sm:border-3 border-gray-900 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] outline-none text-xs sm:text-sm font-black text-gray-900 uppercase cursor-pointer focus:shadow-none focus:translate-x-[3px] focus:translate-y-[3px] transition-all appearance-none"
            style={{ 
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='black' stroke-width='3'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`, 
              backgroundPosition: 'right 0.5rem center', 
              backgroundRepeat: 'no-repeat', 
              backgroundSize: '1em',
              paddingRight: '2rem'
            }}
          >
            <option value="recenti">📅 Nuovi</option>
            <option value="vecchi">📅 Vecchi</option>
            <option value="nome_az">A→Z</option>
            <option value="nome_za">Z→A</option>
          </select>
        </div>

        {/* Filter Tabs - ELEGANTE E COMPATTO */}
        <div className="bg-white border-2 sm:border-3 border-gray-900 rounded-xl sm:rounded-2xl p-1 sm:p-1.5 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] inline-flex gap-1">
          {[
            { id: 'tutti', label: 'Tutti', icon: '📋', mobileLabel: '📋' },
            { id: 'miei', label: 'I miei', icon: '👑', mobileLabel: '👑' },
            { id: 'aperti', label: 'Aperti', icon: '🟢', mobileLabel: '🟢' },
            { id: 'chiusi', label: 'Chiusi', icon: '🔒', mobileLabel: '🔒' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setFilterTab(tab.id as any)}
              className={`relative flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl font-black text-[10px] sm:text-xs uppercase tracking-wider transition-all ${
                filterTab === tab.id
                  ? 'bg-gray-900 text-white'
                  : 'bg-transparent text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              }`}
            >
              <span className="text-sm sm:text-base">{tab.icon}</span>
              <span className="hidden sm:inline">{tab.label}</span>
              {counts[tab.id as keyof typeof counts] > 0 && (
                <span className={`ml-0.5 sm:ml-1 px-1.5 sm:px-2 py-0.5 rounded-md text-[8px] sm:text-[10px] font-black ${
                  filterTab === tab.id 
                    ? 'bg-red-500 text-white' 
                    : 'bg-gray-200 text-gray-700'
                }`}>
                  {counts[tab.id as keyof typeof counts]}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Risultati ricerca */}
        {searchQuery && (
          <div className="mt-3 inline-block bg-yellow-300 border-2 border-gray-900 px-3 py-1.5 rounded-lg shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
            <p className="text-[10px] sm:text-sm font-black text-gray-900 uppercase">
              {filteredBandi.length} risultat{filteredBandi.length === 1 ? 'o' : 'i'} per "<span className="text-red-600">{searchQuery}</span>"
            </p>
          </div>
        )}
      </div>
      
      {/* GRID PROGETTI - MASONRY SU DESKTOP */}
      <div className="columns-1 sm:columns-2 lg:columns-3 gap-4 sm:gap-6 space-y-4 sm:space-y-6">
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
            tagBg: 'bg-gray-100 text-gray-900 border border-gray-900',
            opacity: '',
          }

          if (isAbandoned) {
            config = {
              ...config,
              cardBg: 'bg-gray-50',
              badgeIcon: '💀',
              badgeText: 'Abbandonato',
              badgeClass: 'bg-gray-300 text-gray-900 border-2 border-gray-900',
              opacity: 'opacity-70 grayscale hover:opacity-100 hover:grayscale-0',
              tagBg: 'bg-gray-200 text-gray-500 border border-gray-400'
            }
          } else if (isOwner) {
            config = {
              ...config,
              badgeIcon: '👑',
              badgeText: 'Owner',
              badgeClass: 'bg-amber-400 text-gray-900 border-2 border-gray-900',
              tagBg: 'bg-amber-100 text-gray-900 border border-gray-900',
            }
          } else if (isAdmin) {
            config = {
              ...config,
              badgeIcon: '🛡️',
              badgeText: 'Admin',
              badgeClass: 'bg-blue-400 text-gray-900 border-2 border-gray-900',
              tagBg: 'bg-blue-100 text-gray-900 border border-gray-900',
            }
          } else if (isSimpleMember) {
            config = {
              ...config,
              badgeIcon: '👤',
              badgeText: 'Membro',
              badgeClass: 'bg-emerald-400 text-gray-900 border-2 border-gray-900',
              tagBg: 'bg-emerald-100 text-gray-900 border border-gray-900',
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
              className={`group block break-inside-avoid ${config.opacity}`}
            >
              <article className={`
                relative rounded-xl sm:rounded-2xl overflow-hidden border-2 sm:border-3 border-gray-900 transition-all duration-200
                ${config.cardBg} shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] sm:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]
                hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] sm:hover:shadow-[10px_10px_0px_0px_rgba(0,0,0,1)]
              `}>
                
                {/* Badges */}
                {(isInTeam || isAbandoned) && (
                  <div className={`
                    absolute top-2 sm:top-3 left-2 sm:left-3 z-20 
                    flex items-center gap-1 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-lg
                    text-[9px] sm:text-xs font-black tracking-wider uppercase
                    ${config.badgeClass}
                  `}>
                    <span className="text-xs sm:text-sm">{config.badgeIcon}</span>
                    <span className="hidden sm:inline">{config.badgeText}</span>
                  </div>
                )}

                {!isInTeam && !isAbandoned && (
                  <div className="absolute top-2 sm:top-3 right-2 sm:right-3 z-20">
                    <span className={`
                      px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-lg text-[9px] sm:text-xs font-black uppercase tracking-wider border-2 border-gray-900
                      ${isChiuso ? 'bg-black text-white' : 'bg-green-400 text-black'}
                    `}>
                      {isChiuso ? '🔒' : '🟢'} <span className="hidden sm:inline">{isChiuso ? 'Chiuso' : 'Aperto'}</span>
                    </span>
                  </div>
                )}

                {/* Immagine */}
                <div className={`relative h-32 sm:h-40 border-b-2 border-gray-900 overflow-hidden ${config.imageOverlay}`}>
                  {bando.foto_url ? (
                    <img 
                      src={bando.foto_url} 
                      alt={bando.titolo} 
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" 
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center">
                      <div className="w-10 h-10 sm:w-14 sm:h-14 rounded-xl bg-white border-2 border-gray-900 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center">
                        <span className="text-xl sm:text-2xl">📦</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Contenuto */}
                <div className="p-3 sm:p-5">
                  <h3 className="font-black text-gray-900 text-sm sm:text-lg leading-tight line-clamp-2 mb-2 uppercase group-hover:text-red-600 transition-colors">
                    {bando.titolo}
                  </h3>
                  
                  <p className="text-gray-700 font-bold text-xs sm:text-sm line-clamp-2 mb-3 sm:mb-4">
                    {bando.descrizione}
                  </p>

                  {/* Tags */}
                  <div className="flex flex-wrap gap-1 sm:gap-1.5 mb-3 sm:mb-4">
                    {bando.bando_interesse?.slice(0, 2).map((item: any, idx: number) => (
                      <span 
                        key={idx} 
                        className={`text-[8px] sm:text-[10px] px-1.5 sm:px-2 py-0.5 font-black uppercase tracking-wide rounded ${config.tagBg}`}
                      >
                        {item.interesse?.nome}
                      </span>
                    ))}
                    {bando.bando_interesse?.length > 2 && (
                      <span className="text-[8px] sm:text-[10px] px-1.5 sm:px-2 py-0.5 rounded font-black uppercase bg-gray-200 text-gray-700 border border-gray-900">
                        +{bando.bando_interesse.length - 2}
                      </span>
                    )}
                  </div>

                  {/* Footer */}
                  <div className="flex items-center justify-between pt-2 sm:pt-3 border-t-2 border-dashed border-gray-200">
                    <span className="text-[9px] sm:text-xs font-bold text-gray-500 uppercase">
                      {new Date(bando.data_creazione).toLocaleDateString('it-IT', {
                        day: '2-digit',
                        month: '2-digit'
                      })}
                    </span>
                    
                    <span className="flex items-center gap-1 text-[9px] sm:text-xs font-black text-gray-900 uppercase bg-yellow-300 px-2 sm:px-3 py-1 rounded-lg border border-gray-900 group-hover:bg-yellow-400 transition-all">
                      {isAbandoned ? '🔒' : isInTeam ? '🚀' : '👀'}
                      <span className="hidden sm:inline ml-1">
                        {isAbandoned ? 'Bloccato' : isInTeam ? 'Workspace' : 'Scopri'}
                      </span>
                      <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                      </svg>
                    </span>
                  </div>
                </div>
              </article>
            </Link>
          )
        })}
      </div>

      {/* EMPTY STATE */}
      {filteredBandi.length === 0 && (
        <div className="text-center py-12 sm:py-24 bg-white border-3 sm:border-4 border-gray-900 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] rounded-2xl sm:rounded-3xl mt-6 sm:mt-8">
          <div className="w-16 h-16 sm:w-24 sm:h-24 mx-auto mb-4 sm:mb-6 rounded-2xl sm:rounded-3xl bg-blue-100 border-3 sm:border-4 border-gray-900 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center -rotate-6">
            {searchQuery ? (
              <span className="text-3xl sm:text-5xl">🕵️‍♂️</span>
            ) : (
              <span className="text-3xl sm:text-5xl">🏜️</span>
            )}
          </div>
          <h3 className="text-xl sm:text-3xl font-black text-gray-900 mb-2 sm:mb-4 uppercase tracking-tight">
            {searchQuery ? 'Nessun risultato' : 'Nessun progetto'}
          </h3>
          <p className="text-gray-600 font-bold mb-4 sm:mb-8 max-w-md mx-auto text-sm sm:text-lg leading-tight px-4">
            {searchQuery 
              ? `Nessun progetto corrisponde a "${searchQuery}".`
              : 'Sii il primo a creare un progetto!'
            }
          </p>
          {searchQuery ? (
            <button 
              onClick={() => setSearchQuery('')}
              className="inline-flex items-center gap-2 bg-white text-gray-900 px-4 sm:px-8 py-2.5 sm:py-4 rounded-xl font-black uppercase tracking-widest text-sm sm:text-lg border-3 sm:border-4 border-gray-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[4px] hover:translate-y-[4px] transition-all"
            >
              <svg className="w-4 h-4 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
              Azzera
            </button>
          ) : (
            <Link 
              href="/dashboard/create-project"
              className="inline-flex items-center gap-2 bg-red-600 text-white px-4 sm:px-8 py-2.5 sm:py-4 rounded-xl font-black uppercase tracking-widest text-sm sm:text-lg border-3 sm:border-4 border-gray-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[4px] hover:translate-y-[4px] transition-all"
            >
              <svg className="w-4 h-4 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Crea
            </Link>
          )}
        </div>
      )}

      {/* FAB MOBILE - Pulsante fisso in basso a destra */}
      <Link 
        href="/dashboard/create-project"
        className="sm:hidden fixed bottom-20 right-4 z-50 w-14 h-14 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-full flex items-center justify-center border-3 border-gray-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-[4px] active:translate-y-[4px] transition-all animate-bounce"
      >
        <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
        </svg>
        {/* Sparkle */}
        <span className="absolute -top-1 -right-1 text-lg">✨</span>
      </Link>
    </div>
  )
}

// Wrapper Suspense
export default function HomePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-lg sm:text-xl font-black text-red-800 uppercase tracking-widest animate-pulse border-3 sm:border-4 border-red-800 p-4 sm:p-6 rounded-xl sm:rounded-2xl shadow-[4px_4px_0px_0px_rgba(153,27,27,1)] bg-white">
          ⏳ Caricamento...
        </div>
      </div>
    }>
      <DashboardContent />
    </Suspense>
  )
}