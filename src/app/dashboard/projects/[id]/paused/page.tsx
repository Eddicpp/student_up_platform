'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useParams, useRouter } from 'next/navigation'

export default function ProjectPausedPage() {
  const params = useParams()
  const router = useRouter()
  const supabase = createClient()
  
  // FIX TYPESCRIPT: Diciamo a TS che id è sicuramente una stringa
  const bandoId = params?.id as string

  const [project, setProject] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchPauseInfo = async () => {
      // Evitiamo che Supabase cerchi 'undefined'
      if (!bandoId) return 

      // FIX TYPESCRIPT: (supabase as any) bypassa l'errore sulla colonna "motivo_pausa"
      const { data } = await (supabase as any)
        .from('bando')
        .select('titolo, motivo_pausa, stato')
        .eq('id', bandoId)
        .single()

      if (data) {
        // Se per caso il bando viene riattivato mentre l'utente è qui, lo rimandiamo al workspace
        if (data.stato !== 'pausa') {
          router.replace(`/dashboard/projects/${bandoId}`)
          return
        }
        setProject(data)
      }
      setLoading(false)
    }

    fetchPauseInfo()
  }, [bandoId, supabase, router])

  if (loading) return <div className="min-h-screen flex items-center justify-center font-black uppercase">Verifica stato...</div>

  return (
    <div className="min-h-screen bg-orange-50 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full bg-white border-4 border-gray-900 rounded-3xl shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] p-8 md:p-12 text-center relative overflow-hidden">
        
        {/* Decorazione Cartoon */}
        <div className="absolute -top-6 -right-6 text-9xl opacity-10 rotate-12 select-none">⏸️</div>
        
        <div className="relative z-10">
          <div className="inline-block bg-orange-400 border-4 border-gray-900 rounded-2xl p-4 mb-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            <span className="text-6xl">🚧</span>
          </div>

          <h1 className="text-3xl md:text-4xl font-black uppercase italic tracking-tighter text-gray-900 mb-4">
            Progetto in <span className="text-orange-500">Pausa</span>
          </h1>

          <div className="bg-gray-100 border-2 border-gray-900 rounded-2xl p-6 mb-8 text-left">
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-1">Nome Progetto</p>
            <p className="text-lg font-black text-gray-900 mb-4 uppercase">{project?.titolo || 'Caricamento...'}</p>
            
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-1">Comunicazione dello Staff</p>
            <p className="text-base font-bold text-gray-800 leading-relaxed italic">
               "{project?.motivo_pausa || 'Nessuna motivazione specifica fornita dallo staff.'}"
            </p>
          </div>

          <p className="text-gray-600 font-bold mb-8 text-sm">
            L'accesso a questo workspace è stato temporaneamente sospeso. <br />
            Se ritieni ci sia un errore, contatta l'assistenza.
          </p>

          <button 
            onClick={() => router.push('/dashboard')}
            className="w-full md:w-auto px-8 py-4 bg-gray-900 text-white rounded-2xl font-black uppercase tracking-widest border-4 border-gray-900 shadow-[6px_6px_0px_0px_rgba(251,191,36,1)] hover:translate-x-[3px] hover:translate-y-[3px] hover:shadow-none transition-all"
          >
            Torna alla Dashboard
          </button>
        </div>
      </div>
    </div>
  )
}