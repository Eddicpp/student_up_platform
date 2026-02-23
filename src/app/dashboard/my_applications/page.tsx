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

  useEffect(() => {
    const fetchMyApplications = async () => {
      setLoading(true)
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return // Se non c'è l'utente, non facciamo nulla (il middleware gestirà il redirect)

        // Recuperiamo le partecipazioni (usiamo 'as any' per evitare errori di tipo sulla join)
        const { data, error: fetchError } = await supabase
          .from('partecipazione')
          .select(`
            id, 
            stato, 
            messaggio, 
            created_at,
            bando:bando_id (
              id, 
              titolo, 
              foto_url, 
              stato
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

    fetchMyApplications()
  }, [supabase])

  // LOGICA DI FILTRAGGIO E ORDINAMENTO
  const filteredAndSortedApps = applications
    .filter(app => statusFilter === 'all' || app.stato === statusFilter)
    .sort((a, b) => {
      const dateA = new Date(a.created_at).getTime()
      const dateB = new Date(b.created_at).getTime()
      return dateSort === 'desc' ? dateB - dateA : dateA - dateB
    })

  if (loading) return <div className="min-h-screen flex items-center justify-center font-black text-red-800 animate-pulse uppercase tracking-widest text-2xl italic">Caricamento Candidature...</div>
  if (error) return <div className="p-20 text-center"><p className="bg-black text-white p-4 rounded-xl inline-block">{error}</p></div>

  return (
    <div className="max-w-[1200px] mx-auto p-6 lg:p-10 pb-20">
      
      {/* HEADER */}
      <div className="mb-10">
        <Link href="/dashboard" className="mb-6 flex items-center gap-2 text-gray-400 hover:text-red-800 font-black text-[10px] uppercase tracking-widest transition-all w-fit group">
          <span className="group-hover:-translate-x-1 transition-transform">←</span> Torna alla Bacheca
        </Link>
        <h1 className="text-5xl md:text-7xl font-black text-red-900 uppercase italic tracking-tighter leading-[0.85]">
          Le Mie Candidature
        </h1>
      </div>

      {/* FILTRI */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center mb-10 bg-white p-4 rounded-[2rem] border-4 border-gray-100 shadow-sm">
        <div className="flex flex-wrap gap-2">
          {['all', 'pending', 'accepted', 'rejected', 'abandoned'].map((s) => (
            <button 
              key={s}
              onClick={() => setStatusFilter(s as any)} 
              className={`px-5 py-2.5 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all ${statusFilter === s ? 'bg-gray-800 text-white shadow-md' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
            >
              {s === 'all' ? `Tutte (${applications.length})` : s}
            </button>
          ))}
        </div>

        <button onClick={() => setDateSort(dateSort === 'desc' ? 'asc' : 'desc')} className="bg-gray-50 px-4 py-2.5 rounded-xl font-black uppercase text-[10px] tracking-widest border-2 border-gray-200 text-gray-700">
          {dateSort === 'desc' ? '🔽 Più recenti' : '🔼 Meno recenti'}
        </button>
      </div>

      {/* LISTA */}
      <div className="space-y-6">
        {filteredAndSortedApps.length > 0 ? filteredAndSortedApps.map((app) => {
          const bando = app.bando; // Dati estratti dalla join
          
          let statusStyle = "bg-orange-100 text-orange-800 border-orange-200";
          if (app.stato === 'accepted') statusStyle = "bg-green-100 text-green-800 border-green-200";
          if (app.stato === 'rejected') statusStyle = "bg-red-100 text-red-800 border-red-200";
          if (app.stato === 'abandoned') statusStyle = "bg-gray-200 text-gray-600 border-gray-300";

          return (
            <div key={app.id} className="bg-white rounded-[2.5rem] border-4 border-gray-100 p-6 md:p-8 shadow-xl flex flex-col-reverse md:flex-row justify-between gap-8 group">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-4">
                  <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border-2 ${statusStyle}`}>
                    {app.stato}
                  </span>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                    {new Date(app.created_at).toLocaleDateString('it-IT')}
                  </span>
                </div>
                
                <h3 className="text-3xl font-black text-gray-900 uppercase italic tracking-tighter leading-tight mb-4">
                  {bando?.titolo || 'Progetto non trovato'}
                </h3>

                <div className="bg-gray-50 p-6 rounded-3xl border-2 border-gray-100">
                  <p className="text-gray-700 italic font-medium text-sm">"{app.messaggio || 'Nessun messaggio'}"</p>
                </div>

                <div className="mt-6 flex gap-4">
                   <Link href={`/dashboard/projects/${bando?.id}`} className="text-[10px] font-black text-red-800 uppercase tracking-widest hover:underline">Scheda Bando</Link>
                   {app.stato === 'accepted' && (
                     <Link href={`/dashboard/my_teams/${bando?.id}`} className="text-[10px] font-black text-green-600 uppercase tracking-widest hover:underline">Entra nel Workspace</Link>
                   )}
                </div>
              </div>

              <div className="w-full md:w-64 h-48 md:h-auto shrink-0 rounded-[2rem] overflow-hidden border-4 border-gray-100 bg-gray-900">
                {bando?.foto_url ? (
                  <img 
                    src={getImageUrl(bando.foto_url) || ''} 
                    className={`w-full h-full object-cover ${app.stato === 'rejected' ? 'grayscale opacity-40' : ''}`}
                    alt="Logo Progetto"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-white/10 font-black text-4xl italic">SU</div>
                )}
              </div>
            </div>
          )
        }) : (
          <div className="bg-gray-50 p-20 rounded-[4rem] border-4 border-dashed border-gray-200 text-center">
            <p className="text-gray-400 font-black uppercase tracking-widest">Nessuna candidatura trovata</p>
          </div>
        )}
      </div>
    </div>
  )
}