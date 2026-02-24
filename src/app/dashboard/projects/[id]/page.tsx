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
  const [dominantColor, setDominantColor] = useState('239, 68, 68')
  
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

  // Fetch dati
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

      // Altri progetti del leader
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
          <div className="w-12 h-12 border-4 border-gray-300 border-t-red-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-500 font-medium">Caricamento progetto...</p>
        </div>
      </div>
    )
  }

  if (!bando) return null

  const isAdmin = bando.creatore_studente_id === currentUser?.id
  const figureRicercate = (bando as any).figure_ricercate || []

  return (
    <div 
      className="min-h-screen pb-20 transition-colors duration-700"
      style={{ backgroundColor: `rgba(${dominantColor}, 0.08)` }}
    >
      {/* Banner */}
      <div className="relative h-72 sm:h-96 overflow-hidden">
        {bando.foto_url ? (
          <img 
            src={bando.foto_url} 
            alt={bando.titolo}
            className="w-full h-full object-cover"
          />
        ) : (
          <div 
            className="w-full h-full"
            style={{ background: `linear-gradient(135deg, rgb(${dominantColor}) 0%, rgba(${dominantColor}, 0.7) 100%)` }}
          />
        )}
        
        {/* Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
        
        {/* Back button */}
        <div className="absolute top-4 left-4 sm:top-6 sm:left-6">
          <button 
            onClick={() => router.push('/dashboard')}
            className="flex items-center gap-2 bg-white/10 backdrop-blur-md text-white px-4 py-2 rounded-xl font-medium text-sm hover:bg-white/20 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Bacheca
          </button>
        </div>

        {/* Status badge */}
        <div className="absolute top-4 right-4 sm:top-6 sm:right-6">
          <span className={`px-4 py-2 rounded-xl text-sm font-bold ${
            bando.stato === 'chiuso' 
              ? 'bg-gray-800 text-gray-300' 
              : 'bg-green-500 text-white'
          }`}>
            {bando.stato === 'chiuso' ? '🔒 Chiuso' : '🟢 Aperto'}
          </span>
        </div>

        {/* Title overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-8">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-2">
              {bando.titolo}
            </h1>
            <p className="text-white/70 text-sm">
              Pubblicato il {new Date(bando.data_creazione).toLocaleDateString('it-IT', {
                day: 'numeric',
                month: 'long',
                year: 'numeric'
              })}
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 -mt-6 relative z-10">
        <div className="grid lg:grid-cols-3 gap-6">
          
          {/* Main content */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Descrizione */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Descrizione</h2>
              <p className="text-gray-600 leading-relaxed whitespace-pre-wrap">
                {bando.descrizione}
              </p>
            </div>

            {/* Figure Ricercate */}
            {figureRicercate.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <span>👥</span> Figure Ricercate
                </h2>
                <div className="space-y-4">
                  {figureRicercate.map((figura: any, idx: number) => (
                    <div 
                      key={idx}
                      className="p-4 bg-gray-50 rounded-xl border border-gray-100"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                            figura.tipo === 'strutturata' 
                              ? 'bg-blue-100 text-blue-700' 
                              : 'bg-purple-100 text-purple-700'
                          }`}>
                            {figura.tipo === 'strutturata' ? '📋' : '✍️'}
                          </span>
                          <h3 className="font-semibold text-gray-900">
                            {figura.tipo === 'strutturata' 
                              ? (figura.corso_nome || 'Studente')
                              : figura.titolo_libero
                            }
                          </h3>
                        </div>
                        <span className="text-sm font-medium text-gray-500">
                          {figura.quantita}x
                        </span>
                      </div>
                      
                      {figura.tipo === 'strutturata' ? (
                        <div className="space-y-2">
                          {figura.anno_preferito && (
                            <p className="text-sm text-gray-600">
                              🎓 Preferibilmente {figura.anno_preferito}° anno
                            </p>
                          )}
                          {figura.competenze_nomi && figura.competenze_nomi.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mt-2">
                              {figura.competenze_nomi.map((comp: string, i: number) => (
                                <span 
                                  key={i}
                                  className="px-2 py-1 bg-blue-50 text-blue-700 rounded-lg text-xs font-medium"
                                >
                                  {comp}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      ) : (
                        figura.descrizione_libera && (
                          <p className="text-sm text-gray-600 mt-2">
                            {figura.descrizione_libera}
                          </p>
                        )
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Competenze richieste */}
            {bando.bando_interesse && bando.bando_interesse.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <span>🏷️</span> Competenze Richieste
                </h2>
                <div className="flex flex-wrap gap-2">
                  {bando.bando_interesse.map((item: any, idx: number) => (
                    <span 
                      key={idx}
                      className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-xl text-sm font-medium"
                    >
                      {item.interesse?.nome}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Gallery */}
            {bando.gallery_urls && bando.gallery_urls.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <span>📸</span> Galleria
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {bando.gallery_urls.map((img: string, i: number) => (
                    <div key={i} className="aspect-square rounded-xl overflow-hidden">
                      <img 
                        src={img} 
                        alt="" 
                        className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Apply Section */}
            <ApplySection 
              bandoId={id}
              isAdmin={isAdmin}
              haGiaPartecipato={!!partecipazione}
              statoCandidatura={partecipazione?.stato}
              dominantColor={dominantColor}
            />
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            
            {/* Leader Card */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
              <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-4">Project Leader</h3>
              
              <div className="flex items-center gap-4 mb-4">
                <div className="w-16 h-16 rounded-2xl overflow-hidden bg-gray-100 flex-shrink-0">
                  {bando.studente?.avatar_url ? (
                    <img 
                      src={bando.studente.avatar_url} 
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400 font-bold text-xl">
                      {bando.studente?.nome?.[0]}{bando.studente?.cognome?.[0]}
                    </div>
                  )}
                </div>
                <div>
                  <p className="font-semibold text-gray-900">
                    {bando.studente?.nome} {bando.studente?.cognome}
                  </p>
                  <p className="text-sm text-gray-500">Fondatore</p>
                </div>
              </div>

              {bando.studente?.bio && (
                <p className="text-sm text-gray-600 mb-4 line-clamp-3">
                  {bando.studente.bio}
                </p>
              )}

              <div className="space-y-2">
                {/* Chat con leader */}
                {!isAdmin && (
                  <button
                    onClick={() => setShowChat(true)}
                    className="w-full flex items-center justify-center gap-2 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium text-sm transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                    Contatta il Leader
                  </button>
                )}
                
                <Link
                  href={`/dashboard/user/${bando.creatore_studente_id}`}
                  className="w-full flex items-center justify-center gap-2 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium text-sm transition-colors"
                >
                  Vedi Profilo
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              </div>
            </div>

            {/* Altri progetti del leader */}
            {leaderProjects.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
                <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-4">
                  Altri progetti di {bando.studente?.nome}
                </h3>
                <div className="space-y-3">
                  {leaderProjects.map((proj) => (
                    <Link
                      key={proj.id}
                      href={`/dashboard/projects/${proj.id}`}
                      className="block p-3 bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg overflow-hidden bg-gray-200 flex-shrink-0">
                          {proj.foto_url ? (
                            <img src={proj.foto_url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
                              📁
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 text-sm truncate group-hover:text-blue-600 transition-colors">
                            {proj.titolo}
                          </p>
                          <p className="text-xs text-gray-500">{proj.stato}</p>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Info box */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
              <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-4">Dettagli</h3>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Stato</span>
                  <span className={`font-medium ${bando.stato === 'chiuso' ? 'text-gray-600' : 'text-green-600'}`}>
                    {bando.stato === 'chiuso' ? 'Chiuso' : 'Aperto'}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Pubblicato</span>
                  <span className="font-medium text-gray-900">
                    {new Date(bando.data_creazione).toLocaleDateString('it-IT')}
                  </span>
                </div>
                {bando.data_chiusura && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Scadenza</span>
                    <span className="font-medium text-gray-900">
                      {new Date(bando.data_chiusura).toLocaleDateString('it-IT')}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

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