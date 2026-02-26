'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import ApplySection from './ApplySection'
import PrivateChatModal from './PrivateChatModal'

export default function ProjectDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = params?.id as string
  const supabase = createClient()

  // Stati
  const [bando, setBando] = useState<any>(null)
  const [leaderProjects, setLeaderProjects] = useState<any[]>([])
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [partecipazione, setPartecipazione] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  
  // Colore dominante
  const [dominantColor, setDominantColor] = useState('253, 224, 71') // Giallo cartoon di default
  
  // Chat modal
  const [showChat, setShowChat] = useState(false)

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
  }

  useEffect(() => {
    const fetchData = async () => {
      if (!id) return
      setLoading(true)

      // User
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }
      setCurrentUser(user)

      // Bando
      const { data: bandoData, error } = await supabase
        .from('bando')
        .select(`
          *,
          studente:creatore_studente_id ( id, nome, cognome, avatar_url, bio, email ),
          bando_interesse ( interesse ( id, nome ) )
        `)
        .eq('id', id)
        .single()

      if (error || !bandoData) {
        router.push('/dashboard')
        return
      }

      setBando(bandoData)
      
      if (bandoData.foto_url) {
        extractColor(bandoData.foto_url)
      }

      // Registra visualizzazione
      if (bandoData.creatore_studente_id && bandoData.creatore_studente_id !== user.id) {
        await (supabase
          .from('visualizzazione_bando' as any)
          .insert({
            bando_id: id,
            studente_id: user.id
          }) as any)
      }

      // Altri progetti leader
      if (bandoData.creatore_studente_id) {
        const { data: otherProjects } = await supabase
          .from('bando')
          .select('id, titolo, stato, foto_url')
          .eq('creatore_studente_id', bandoData.creatore_studente_id)
          .neq('id', id)
          .order('data_creazione', { ascending: false })
          .limit(3)

        if (otherProjects) setLeaderProjects(otherProjects)
      }

      // Partecipazione utente
      const { data: partData } = await supabase
        .from('partecipazione')
        .select('id, stato')
        .eq('bando_id', id)
        .eq('studente_id', user.id)
        .maybeSingle()

      setPartecipazione(partData)
      setLoading(false)
    }

    fetchData()
  }, [id, supabase, router])

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <div className="text-5xl sm:text-6xl animate-bounce mb-4">🚀</div>
          <p className="text-gray-900 font-black uppercase tracking-widest text-sm sm:text-base">Caricamento progetto...</p>
        </div>
      </div>
    )
  }

  if (!bando) return null

  const isAdmin = bando.creatore_studente_id === currentUser?.id
  const isAccepted = partecipazione?.stato === 'accepted'
  const isTeamMember = isAdmin || isAccepted
  const figureRicercate = (bando as any).figure_ricercate || []

  return (
    <div className="min-h-screen pb-28 lg:pb-20 bg-gray-50 relative">
      
      {/* HEADER BANNER CARTOON */}
      <div className="relative h-64 sm:h-80 md:h-96 border-b-[4px] sm:border-b-8 border-gray-900 overflow-hidden bg-gray-200 pattern-dots" style={{ backgroundColor: `rgb(${dominantColor})` }}>
        
        {bando.foto_url && (
          <div className="absolute inset-0 z-0">
            <img 
              src={bando.foto_url} 
              alt={bando.titolo}
              className="w-full h-full object-cover mix-blend-overlay opacity-50"
            />
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20 z-0" />
        
        <div className="relative z-10 max-w-6xl mx-auto h-full px-4 sm:px-6 lg:px-8 py-4 sm:py-6 flex flex-col justify-between">
          
          {/* Top Bar (Back & Status) */}
          <div className="flex justify-between items-start">
            <button 
              onClick={() => router.push('/dashboard')}
              className="flex items-center gap-1.5 sm:gap-2 bg-white border-2 sm:border-4 border-gray-900 px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl text-gray-900 font-black uppercase text-[10px] sm:text-sm hover:-translate-y-1 hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
            >
              <span className="text-sm sm:text-xl">🔙</span> <span className="hidden sm:inline">Bacheca</span>
            </button>

            <span className={`px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl border-2 sm:border-4 border-gray-900 text-[10px] sm:text-sm font-black uppercase shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] ${
              bando.stato === 'chiuso' 
                ? 'bg-gray-800 text-white' 
                : 'bg-green-400 text-gray-900'
            }`}>
              {bando.stato === 'chiuso' ? '🔒 Chiuso' : '🟢 Aperto'}
            </span>
          </div>

          {/* Title Area */}
          <div>
            <h1 className="text-3xl sm:text-5xl lg:text-7xl font-black text-white uppercase italic tracking-tighter leading-none mb-2 drop-shadow-[2px_2px_0px_rgba(0,0,0,1)] sm:drop-shadow-[4px_4px_0px_rgba(0,0,0,1)]">
              {bando.titolo}
            </h1>
            <div className="inline-block bg-white border-2 sm:border-4 border-gray-900 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg sm:rounded-xl shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
              <p className="text-gray-900 font-black text-[10px] sm:text-xs uppercase tracking-widest">
                📅 Pubblicato il {new Date(bando.data_creazione).toLocaleDateString('it-IT')}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* CONTENUTO PRINCIPALE */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 mt-6 sm:mt-10">
        
        {/* BANNER WORKSPACE (Cima alla pagina se accettato o admin) */}
        {isTeamMember && (
          <div className="mb-6 sm:mb-8 bg-green-400 border-[3px] sm:border-4 border-gray-900 rounded-2xl sm:rounded-3xl p-5 sm:p-8 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] sm:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] flex flex-col sm:flex-row items-center justify-between gap-4 animate-in zoom-in-95 duration-300">
            <div className="text-center sm:text-left">
              <h2 className="text-2xl sm:text-4xl font-black text-gray-900 uppercase tracking-tighter">
                {isAdmin ? 'Il Tuo Progetto 👑' : 'Sei nel Team! 🎉'}
              </h2>
              <p className="text-gray-900 font-bold text-sm sm:text-base mt-1">
                {isAdmin 
                  ? 'Gestisci le candidature e il calendario dal workspace.' 
                  : 'La tua candidatura è stata accettata. Inizia subito a collaborare!'}
              </p>
            </div>
            <Link 
              href={`/dashboard/my_teams/${id}`} 
              className="w-full sm:w-auto px-6 py-4 bg-white border-[3px] border-gray-900 rounded-xl font-black text-gray-900 uppercase tracking-widest text-sm sm:text-base shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all text-center flex items-center justify-center gap-2"
            >
              Vai al Workspace 🚀
            </Link>
          </div>
        )}

        {/* GRIGLIA ADATTIVA: 
            Se sei nel team, su mobile la colonna destra (sidebar) passa prima della descrizione 
            per una vista molto più pulita. 
        */}
        <div className="flex flex-col lg:grid lg:grid-cols-3 gap-6 sm:gap-8">
          
          {/* COLONNA SINISTRA (Dettagli Lunghi) */}
          <div className={`lg:col-span-2 space-y-8 sm:space-y-12 ${isTeamMember ? 'order-2 lg:order-1' : 'order-1'}`}>
            
            {/* Descrizione */}
            <div className="bg-white border-[3px] sm:border-4 border-gray-900 rounded-2xl sm:rounded-3xl p-5 sm:p-8 relative shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] sm:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] mt-4">
              <span className="absolute -top-3.5 sm:-top-5 left-4 sm:left-8 bg-yellow-300 border-2 sm:border-4 border-gray-900 px-3 py-0.5 sm:px-4 sm:py-1 rounded-lg sm:rounded-xl font-black uppercase tracking-widest text-gray-900 text-[10px] sm:text-sm shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                Descrizione 📝
              </span>
              <p className="text-gray-800 font-bold text-sm sm:text-lg leading-relaxed whitespace-pre-wrap mt-2 sm:mt-4">
                {bando.descrizione}
              </p>
            </div>

            {/* Figure Ricercate */}
            {figureRicercate.length > 0 && (
              <div className="bg-purple-50 border-[3px] sm:border-4 border-gray-900 rounded-2xl sm:rounded-3xl p-5 sm:p-8 relative shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] sm:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
                <span className="absolute -top-3.5 sm:-top-5 left-4 sm:left-8 bg-white border-2 sm:border-4 border-gray-900 px-3 py-0.5 sm:px-4 sm:py-1 rounded-lg sm:rounded-xl font-black uppercase tracking-widest text-gray-900 text-[10px] sm:text-sm shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                  Cerchiamo 👥
                </span>
                
                <div className="grid gap-3 sm:gap-4 mt-2 sm:mt-4">
                  {figureRicercate.map((figura: any, idx: number) => (
                    <div 
                      key={idx}
                      className="bg-white border-2 sm:border-3 border-gray-900 rounded-xl sm:rounded-2xl p-4 sm:p-5 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] sm:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 transition-transform"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 sm:gap-0 mb-3">
                        <div className="flex items-center gap-2 sm:gap-3">
                          <span className={`w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center rounded-lg sm:rounded-xl border-2 border-gray-900 text-sm sm:text-xl shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] ${
                            figura.tipo === 'strutturata' ? 'bg-blue-300' : 'bg-pink-300'
                          }`}>
                            {figura.tipo === 'strutturata' ? '📋' : '✍️'}
                          </span>
                          <h3 className="font-black text-gray-900 text-base sm:text-xl uppercase tracking-tight">
                            {figura.tipo === 'strutturata' ? (figura.corso_nome || 'Studente') : figura.titolo_libero}
                          </h3>
                        </div>
                        <div className="self-start sm:self-auto bg-gray-900 text-white px-3 py-1 rounded-lg border-2 border-gray-900 font-black text-xs sm:text-sm shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                          Q.tà: {figura.quantita}
                        </div>
                      </div>
                      
                      {figura.tipo === 'strutturata' ? (
                        <div className="space-y-3 border-t-2 border-dashed border-gray-200 pt-3">
                          {figura.anno_preferito && (
                            <p className="text-[10px] sm:text-xs font-black text-gray-600 uppercase tracking-widest bg-gray-100 inline-block px-2 py-1 rounded border-2 border-gray-900">
                              🎓 Anno preferito: {figura.anno_preferito}°
                            </p>
                          )}
                          {figura.competenze_nomi && figura.competenze_nomi.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 sm:gap-2">
                              {figura.competenze_nomi.map((comp: string, i: number) => (
                                <span key={i} className="px-2 py-1 bg-white border-2 border-gray-900 text-gray-900 rounded-lg text-[9px] sm:text-xs font-black uppercase">
                                  {comp}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      ) : (
                        figura.descrizione_libera && (
                          <div className="border-t-2 border-dashed border-gray-200 pt-3">
                            <p className="text-xs sm:text-sm font-bold text-gray-700 italic">
                              "{figura.descrizione_libera}"
                            </p>
                          </div>
                        )
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Competenze richieste (Tag Generali) */}
            {bando.bando_interesse && bando.bando_interesse.length > 0 && (
              <div className="bg-orange-50 border-[3px] sm:border-4 border-gray-900 rounded-2xl sm:rounded-3xl p-5 sm:p-8 relative shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] sm:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
                <span className="absolute -top-3.5 sm:-top-5 left-4 sm:left-8 bg-white border-2 sm:border-4 border-gray-900 px-3 py-0.5 sm:px-4 sm:py-1 rounded-lg sm:rounded-xl font-black uppercase tracking-widest text-gray-900 text-[10px] sm:text-sm shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                  Tag / Competenze 🏷️
                </span>
                <div className="flex flex-wrap gap-2 sm:gap-3 mt-2 sm:mt-4">
                  {bando.bando_interesse.map((item: any, idx: number) => (
                    <span 
                      key={idx}
                      className="px-3 sm:px-4 py-1.5 sm:py-2 bg-white border-2 sm:border-3 border-gray-900 text-gray-900 rounded-lg sm:rounded-xl text-[10px] sm:text-sm font-black uppercase shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] sm:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 transition-transform"
                    >
                      {item.interesse?.nome}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Gallery */}
            {bando.gallery_urls && bando.gallery_urls.length > 0 && (
              <div className="bg-white border-[3px] sm:border-4 border-gray-900 rounded-2xl sm:rounded-3xl p-5 sm:p-8 relative shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] sm:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
                <span className="absolute -top-3.5 sm:-top-5 left-4 sm:left-8 bg-blue-300 border-2 sm:border-4 border-gray-900 px-3 py-0.5 sm:px-4 sm:py-1 rounded-lg sm:rounded-xl font-black uppercase tracking-widest text-gray-900 text-[10px] sm:text-sm shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                  Galleria 📸
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4 mt-2 sm:mt-4">
                  {bando.gallery_urls.map((img: string, i: number) => (
                    <div key={i} className="aspect-square rounded-xl sm:rounded-2xl border-2 sm:border-4 border-gray-900 overflow-hidden shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
                      <img 
                        src={img} 
                        alt="Screenshot progetto" 
                        className="w-full h-full object-cover hover:scale-110 transition-transform duration-500"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Apply Section (Modulo Candidatura) - Nascosto se accettato per pulire la vista */}
            {!isAccepted && (
              <div className="pt-4">
                <ApplySection 
                  bandoId={id}
                  isAdmin={isAdmin}
                  haGiaPartecipato={!!partecipazione}
                  statoCandidatura={partecipazione?.stato}
                  dominantColor={dominantColor}
                />
              </div>
            )}
          </div>

          {/* COLONNA DESTRA (Sidebar) */}
          <div className={`space-y-6 sm:space-y-8 mt-4 lg:mt-0 ${isTeamMember ? 'order-1 lg:order-2' : 'order-2'}`}>
            
            {/* Leader Card */}
            <div className="bg-blue-50 border-[3px] sm:border-4 border-gray-900 rounded-2xl sm:rounded-3xl p-5 sm:p-6 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] sm:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] relative">
              <span className="absolute -top-3 sm:-top-4 right-4 sm:right-6 bg-white border-2 border-gray-900 px-2 py-0.5 rounded-lg font-black uppercase tracking-widest text-gray-900 text-[9px] sm:text-[10px] shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] rotate-3">
                Creatore 👑
              </span>
              
              <div className="flex flex-col sm:flex-row lg:flex-col xl:flex-row items-center sm:items-start lg:items-center xl:items-start gap-4 mb-4 text-center sm:text-left lg:text-center xl:text-left">
                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl border-3 sm:border-4 border-gray-900 overflow-hidden bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex-shrink-0">
                  {bando.studente?.avatar_url ? (
                    <img 
                      src={bando.studente.avatar_url} 
                      alt="Avatar leader"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-red-400 text-gray-900 font-black text-2xl uppercase">
                      {bando.studente?.nome?.[0]}{bando.studente?.cognome?.[0]}
                    </div>
                  )}
                </div>
                <div className="mt-2 sm:mt-0">
                  <p className="font-black text-gray-900 text-lg sm:text-xl uppercase leading-tight">
                    {bando.studente?.nome} {bando.studente?.cognome}
                  </p>
                  {bando.studente?.bio && (
                    <p className="text-xs sm:text-sm text-gray-700 font-bold mt-2 line-clamp-3 italic">
                      "{bando.studente.bio}"
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-3 pt-4 border-t-2 border-dashed border-gray-900">
                {!isAdmin && (
                  <button
                    onClick={() => setShowChat(true)}
                    className="w-full py-3 sm:py-4 bg-green-400 text-gray-900 rounded-xl font-black uppercase tracking-widest text-xs sm:text-sm border-2 sm:border-3 border-gray-900 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all flex items-center justify-center gap-2"
                  >
                    <span className="text-lg">💬</span> Invia Messaggio
                  </button>
                )}
                
                <Link
                  href={`/dashboard/user/${bando.creatore_studente_id}`}
                  className="w-full py-3 sm:py-4 bg-white text-gray-900 rounded-xl font-black uppercase tracking-widest text-xs sm:text-sm border-2 sm:border-3 border-gray-900 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all flex items-center justify-center gap-2"
                >
                  <span className="text-lg">👤</span> Visita Profilo
                </Link>
              </div>
            </div>

            {/* Info Dettagli */}
            <div className="bg-green-50 border-[3px] sm:border-4 border-gray-900 rounded-2xl sm:rounded-3xl p-5 sm:p-6 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] sm:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] relative">
              <span className="absolute -top-3 sm:-top-4 left-4 sm:left-6 bg-white border-2 border-gray-900 px-3 py-0.5 rounded-lg font-black uppercase tracking-widest text-gray-900 text-[10px] shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                Info ℹ️
              </span>
              <div className="space-y-3 mt-2">
                <div className="flex justify-between items-center pb-2 border-b-2 border-gray-200">
                  <span className="text-xs font-black text-gray-600 uppercase tracking-widest">Stato</span>
                  <span className={`text-xs font-black uppercase px-2 py-1 rounded border-2 border-gray-900 ${bando.stato === 'chiuso' ? 'bg-gray-300' : 'bg-green-300'}`}>
                    {bando.stato === 'chiuso' ? 'Chiuso' : 'Aperto'}
                  </span>
                </div>
                <div className="flex justify-between items-center pb-2 border-b-2 border-gray-200">
                  <span className="text-xs font-black text-gray-600 uppercase tracking-widest">Creazione</span>
                  <span className="text-xs font-black text-gray-900">
                    {new Date(bando.data_creazione).toLocaleDateString('it-IT')}
                  </span>
                </div>
                {bando.data_chiusura && (
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-black text-gray-600 uppercase tracking-widest">Scadenza</span>
                    <span className="text-xs font-black text-red-600 bg-red-100 px-2 py-0.5 rounded border border-red-200">
                      {new Date(bando.data_chiusura).toLocaleDateString('it-IT')}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Altri progetti del leader */}
            {leaderProjects.length > 0 && (
              <div className="bg-red-50 border-[3px] sm:border-4 border-gray-900 rounded-2xl sm:rounded-3xl p-5 sm:p-6 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] sm:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] relative">
                <span className="absolute -top-3 sm:-top-4 left-4 sm:left-6 bg-white border-2 border-gray-900 px-3 py-0.5 rounded-lg font-black uppercase tracking-widest text-gray-900 text-[10px] shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                  Altri Progetti 🎯
                </span>
                <div className="space-y-3 sm:space-y-4 mt-3 sm:mt-4">
                  {leaderProjects.map((proj) => (
                    <Link
                      key={proj.id}
                      href={`/dashboard/projects/${proj.id}`}
                      className="block p-2 sm:p-3 bg-white border-2 sm:border-3 border-gray-900 rounded-xl shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg border-2 border-gray-900 overflow-hidden bg-gray-100 flex-shrink-0">
                          {proj.foto_url ? (
                            <img src={proj.foto_url} alt="" className="w-full h-full object-cover group-hover:scale-110 transition-transform" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-xl">📁</div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-black text-gray-900 text-xs sm:text-sm uppercase truncate leading-tight mb-1">
                            {proj.titolo}
                          </p>
                          <span className={`text-[8px] sm:text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded border border-gray-900 ${proj.stato === 'chiuso' ? 'bg-gray-300' : 'bg-green-300'}`}>
                            {proj.stato}
                          </span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
            
          </div>
        </div>
      </div>

      {/* STICKY BOTTOM BAR SU MOBILE (Visibile solo se si è parte del team e solo su schermi piccoli) */}
      {isTeamMember && (
        <div className="lg:hidden fixed bottom-0 left-0 right-0 p-4 bg-white border-t-[3px] border-gray-900 z-40 flex items-center justify-between shadow-[0_-4px_0px_0px_rgba(0,0,0,0.1)]">
          <div>
            <p className="font-black text-gray-900 uppercase text-xs">
              {isAdmin ? 'Proprietario 👑' : 'Candidatura Accettata 🎉'}
            </p>
            <p className="text-[10px] font-bold text-gray-600 mt-0.5">
              {isAdmin ? 'Gestisci il tuo team' : 'Sei ufficialmente nel team!'}
            </p>
          </div>
          <Link 
            href={`/dashboard/my_teams/${id}`} 
            className="px-5 py-3 bg-green-400 border-2 border-gray-900 rounded-xl font-black text-gray-900 uppercase tracking-widest text-[10px] shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all"
          >
            Workspace 🚀
          </Link>
        </div>
      )}

      {/* Chat Modal */}
      {showChat && currentUser && bando.studente && (
        <PrivateChatModal
          isOpen={showChat}
          onClose={() => setShowChat(false)}
          currentUserId={currentUser.id}
          otherUser={bando.studente}
          bandoId={id}
          bandoTitolo={bando.titolo}
        />
      )}
    </div>
  )
}