import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import ApplySection from './ApplySection'

export default async function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { id } = await params

  if (!id || id === 'undefined') return notFound()

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
          
          {/* Box Leader - SFONDO ROSSO */}
          <div className="bg-red-800 p-8 rounded-[2.5rem] shadow-xl border-4 border-red-700">
            <h3 className="text-[10px] font-black text-white/50 uppercase mb-6 tracking-widest text-center">
              Project Leader
            </h3>
            <div className="flex flex-col items-center text-center">
              <div className="w-24 h-24 rounded-full overflow-hidden bg-white/10 border-4 border-white/20 mb-4 shadow-inner">
                {bando.studente?.avatar_url ? (
                  <img src={bando.studente.avatar_url} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-white/30 text-3xl font-black">
                    {bando.studente?.nome?.[0]}{bando.studente?.cognome?.[0]}
                  </div>
                )}
              </div>
              <p className="font-black text-2xl text-white uppercase leading-none tracking-tighter">
                {bando.studente?.nome} {bando.studente?.cognome}
              </p>
              <p className="text-[10px] text-red-200 font-black mt-2 uppercase tracking-widest">
                Fondatore
              </p>
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

          {/* Box Dettagli - SFONDO ROSSO (stesso stile degli altri) */}
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