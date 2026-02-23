import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import ApplySection from './ApplySection'

export default async function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { id } = await params

  if (!id || id === 'undefined') return notFound()

  // 1. Fetch Dati Progetto
  const { data: bando, error }: any = await supabase
    .from('bando')
    .select(`
      *,
      studente:creatore_studente_id ( id, nome, cognome, avatar_url, bio ),
      bando_interesse ( interesse ( id, nome ) )
    `)
    .eq('id', id)
    .single()

  if (error || !bando) return notFound()

  // 2. Fetch Altri Progetti del Leader (escludendo quello attuale)
  const { data: leaderProjects }: any = await supabase
    .from('bando')
    .select('id, titolo, stato')
    .eq('creatore_studente_id', bando.creatore_studente_id)
    .neq('id', id)
    .order('data_creazione', { ascending: false })
    .limit(3)

  // 3. Autenticazione e Stato Utente
  const { data: userData } = await supabase.auth.getUser()
  const user = userData?.user
  if (!user) redirect('/login')

  const isAdmin = bando.creatore_studente_id === user.id

  const { data: partecipazione }: any = await supabase
    .from('partecipazione')
    .select('id, stato')
    .eq('bando_id', id)
    .eq('studente_id', user.id)
    .maybeSingle()

  return (
    <div className="max-w-6xl mx-auto pb-20 px-4">
      {/* HEADER / TORNA INDIETRO */}
      <Link 
        href="/dashboard" 
        className="mb-8 flex items-center gap-2 text-gray-400 hover:text-red-800 font-bold transition-all w-fit group"
      >
        <span className="group-hover:-translate-x-1 transition-transform">←</span> 
        Torna alla Bacheca
      </Link>

      {/* GRIGLIA: CONTENUTO E SIDEBAR */}
      <div className="grid lg:grid-cols-[2fr_1fr] gap-10 mb-10">
        
        {/* SINISTRA: DETTAGLI E GALLERY - SFONDO ROSSO */}
        <div className="space-y-8">
          <div className="bg-red-800 rounded-[3rem] overflow-hidden shadow-2xl border-4 border-red-700">
            {/* Copertina con Badge */}
            <div className="h-96 bg-red-900 relative">
              {bando.foto_url ? (
                <img src={bando.foto_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-red-900 to-red-700 flex items-center justify-center font-black text-white/10 text-6xl italic">
                  StudentUP
                </div>
              )}
              <div className="absolute top-8 right-8">
                <span className="px-6 py-2 bg-white text-red-800 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-2xl">
                  STATO: {bando.stato?.toUpperCase()}
                </span>
              </div>
            </div>

            <div className="p-12">
              <h1 className="text-5xl font-black text-white uppercase mb-8 tracking-tighter leading-none italic">
                {bando.titolo}
              </h1>
              <div className="prose max-w-none">
                <h3 className="text-white/50 uppercase text-[10px] font-black mb-4 tracking-[0.2em]">
                  Il Progetto
                </h3>
                <p className="text-white/90 text-xl leading-relaxed whitespace-pre-wrap font-medium">
                  {bando.descrizione}
                </p>
              </div>
            </div>
          </div>

          {/* Gallery - Solo se ci sono foto */}
          {bando.gallery_urls && Array.isArray(bando.gallery_urls) && bando.gallery_urls.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-6 px-4">
              {bando.gallery_urls.map((img: string, i: number) => (
                <div key={i} className="aspect-square rounded-[2.5rem] overflow-hidden shadow-xl border-4 border-red-700">
                  <img src={img} alt="" className="h-full w-full object-cover hover:scale-110 transition-transform duration-700" />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* DESTRA: SIDEBAR CON SFONDO ROSSO */}
        <div className="space-y-6">
          
          {/* Box Leader - SFONDO ROSSO CON HOVER CARD */}
          <div className="bg-red-800 p-8 rounded-[2.5rem] shadow-xl border-4 border-red-700">
            <h3 className="text-[10px] font-black text-white/50 uppercase mb-6 tracking-widest text-center">
              Project Leader
            </h3>
            
            {/* AREA INTERATTIVA: Aggiunto 'group relative cursor-pointer' */}
            <div className="flex flex-col items-center text-center group relative cursor-pointer">
              
              <div className="w-24 h-24 rounded-full overflow-hidden bg-white/10 border-4 border-white/20 mb-4 shadow-inner transition-transform duration-300 group-hover:scale-110">
                {bando.studente?.avatar_url ? (
                  <img src={bando.studente.avatar_url} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-white/30 text-3xl font-black">
                    {bando.studente?.nome?.[0]}{bando.studente?.cognome?.[0]}
                  </div>
                )}
              </div>
              <p className="font-black text-2xl text-white uppercase leading-none tracking-tighter group-hover:text-red-200 transition-colors">
                {bando.studente?.nome} {bando.studente?.cognome}
              </p>
              <p className="text-[10px] text-red-300 font-black mt-2 uppercase tracking-widest">
                Fondatore
              </p>

              {/* 🟢 HOVER CARD: Visibile solo al passaggio del mouse */}
              <div className="absolute top-full left-1/2 -translate-x-1/2 mt-4 w-72 bg-white rounded-3xl shadow-[0_20px_50px_-12px_rgba(0,0,0,0.5)] border-4 border-gray-100 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 z-50 p-6 pointer-events-none group-hover:pointer-events-auto">
                
                {/* Info Profilo Base */}
                <div className="text-center mb-5">
                  <h4 className="font-black text-gray-900 uppercase tracking-tighter text-lg leading-none mb-2">
                    {bando.studente?.nome} {bando.studente?.cognome}
                  </h4>
                  <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest leading-relaxed line-clamp-2">
                    {bando.studente?.bio || 'Nessuna bio inserita dal creatore.'}
                  </p>
                </div>

                {/* Lista Altri Progetti */}
                <div className="space-y-3 text-left">
                  <h5 className="text-[10px] font-black text-red-800 uppercase tracking-widest border-b-2 border-red-50 pb-2">
                    Altri Suoi Progetti ({leaderProjects?.length || 0})
                  </h5>
                  
                  {leaderProjects && leaderProjects.length > 0 ? (
                    leaderProjects.map((lp: any) => (
                      <Link 
                        key={lp.id} 
                        href={`/dashboard/projects/${lp.id}`} 
                        className="block group/link bg-gray-50 p-3 rounded-xl border border-transparent hover:border-red-100 hover:bg-red-50 transition-colors"
                      >
                        <p className="text-xs font-black text-gray-700 uppercase leading-tight group-hover/link:text-red-700 transition-colors line-clamp-1">
                          {lp.titolo}
                        </p>
                        <p className="text-[9px] font-bold text-gray-400 uppercase mt-1">
                          Stato: {lp.stato}
                        </p>
                      </Link>
                    ))
                  ) : (
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest text-center py-2">
                      Nessun altro progetto
                    </p>
                  )}
                </div>
                
                {/* Bottone Profilo Completo */}
                <div className="mt-5 pt-4 border-t-2 border-gray-50">
                  <Link 
                    href={`/dashboard/user/${bando.creatore_studente_id}`} 
                    className="block w-full py-3 bg-red-50 text-red-800 rounded-xl text-center text-[10px] font-black uppercase tracking-widest hover:bg-red-800 hover:text-white transition-colors"
                  >
                    Vedi Profilo Completo
                  </Link>
                </div>
              </div>
              {/* FINE HOVER CARD */}

            </div>
          </div>

          {/* Box Skills Richieste - SFONDO ROSSO */}
          <div className="bg-red-800 p-8 rounded-[2.5rem] shadow-xl border-4 border-red-700">
            <h3 className="text-[10px] font-black text-white/50 uppercase mb-6 tracking-widest">
              Skills Richieste
            </h3>
            <div className="space-y-3">
              {bando.bando_interesse?.length > 0 ? (
                bando.bando_interesse.map((item: any, idx: number) => (
                  <div 
                    key={idx} 
                    className="flex items-center gap-3 text-white font-black text-xs uppercase tracking-tight"
                  >
                    <span className="w-2 h-2 bg-white rounded-full"></span>
                    {item.interesse?.nome}
                  </div>
                ))
              ) : (
                <p className="text-white/50 text-sm">Nessuna skill specificata</p>
              )}
            </div>
          </div>

          {/* Box Dettagli - SFONDO ROSSO */}
          <div className="bg-red-800 p-8 rounded-[2.5rem] shadow-xl border-4 border-red-700">
            <h3 className="text-[10px] font-black text-white/50 uppercase mb-6 tracking-widest">
              Dettagli
            </h3>
            <div className="space-y-4 text-sm">
              <div className="flex justify-between">
                <span className="text-white/50 font-bold">Creato il</span>
                <span className="font-black text-white">
                  {new Date(bando.data_creazione).toLocaleDateString('it-IT')}
                </span>
              </div>
              {bando.data_chiusura && (
                <div className="flex justify-between">
                  <span className="text-white/50 font-bold">Scadenza</span>
                  <span className="font-black text-white">
                    {new Date(bando.data_chiusura).toLocaleDateString('it-IT')}
                  </span>
                </div>
              )}
              {bando.importo && (
                <div className="flex justify-between">
                  <span className="text-white/50 font-bold">Compenso</span>
                  <span className="font-black text-green-400">€{bando.importo}</span>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>

      {/* FOOTER: PULSANTE CANDIDATURA FULL WIDTH */}
      <div className="w-full pt-10">
        <ApplySection 
          bandoId={id} 
          isAdmin={isAdmin} 
          haGiaPartecipato={!!partecipazione}
          statoCandidatura={partecipazione?.stato}
        />
      </div>
    </div>
  )
}