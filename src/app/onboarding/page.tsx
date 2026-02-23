'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

type SessoType = 'M' | 'F' | 'altro' | 'non_specificato';

export default function OnboardingPage() {
  // Rimosso nome e cognome
  const [corso, setCorso] = useState('')
  const [sesso, setSesso] = useState<SessoType>('non_specificato')
  const [dataNascita, setDataNascita] = useState('')
  
  const [annoInizio, setAnnoInizio] = useState('')
  const [annoFine, setAnnoFine] = useState('')
  const [voto, setVoto] = useState('')

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const router = useRouter()
  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
  
    const { data: { user } } = await supabase.auth.getUser()
  
    if (!user) {
      setError("Utente non autenticato.")
      setLoading(false)
      return
    }

    try {
      // 1. Aggiornamento nella tabella 'studente' (Non sovrascrive Nome e Cognome)
      const { error: studentError } = await supabase
        .from('studente')
        .update({
          data_nascita: dataNascita || null,
          sesso: sesso
        })
        .eq('id', user.id) // Aggiorna solo la riga di questo utente
  
      if (studentError) throw studentError

      // 2. Ricerca dell'ID del corso
      const { data: corsoDati } = await supabase
        .from('corso_di_studi')
        .select('id')
        .ilike('nome', `%${corso}%`) 
        .maybeSingle()

      if (corsoDati) {
        // 3. Salvataggio nella tabella 'studente_corso'
        const { error: corsoInsertError } = await supabase
          .from('studente_corso')
          .upsert({
            studente_id: user.id,
            corso_id: corsoDati.id,
            anno_inizio: parseInt(annoInizio),
            anno_fine: annoFine ? parseInt(annoFine) : null,
            voto: voto ? parseInt(voto) : null,
            completato: !!annoFine
          }, { onConflict: 'studente_id, corso_id' })
          
        if (corsoInsertError) throw corsoInsertError
      }
  
      router.push('/dashboard')
    } catch (err: any) {
      setError(err.message || "Errore durante il salvataggio.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-100 p-4 py-10">
      <div className="w-full max-w-md bg-white p-8 rounded-2xl shadow-xl border border-gray-200">
        <h2 className="text-2xl font-bold text-red-800 mb-2 text-center">Completa il tuo Profilo</h2>
        <p className="text-center text-gray-500 text-sm mb-6">Mancano solo gli ultimi dettagli accademici.</p>

        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-xl text-sm border border-red-100">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="text-[10px] text-gray-400 ml-1 uppercase font-bold">Data Nascita *</label>
              {/* ✅ Testo sempre grigio scuro */}
              <input type="date" className="w-full p-3 border border-gray-200 rounded-xl text-gray-900 bg-white placeholder-gray-400 focus:border-red-800 outline-none transition-all"
                value={dataNascita} onChange={(e) => setDataNascita(e.target.value)} required />
            </div>
            <div className="w-1/3">
              <label className="text-[10px] text-gray-400 ml-1 uppercase font-bold">Sesso</label>
              <select className="w-full p-3 border border-gray-200 rounded-xl text-gray-900 bg-white focus:border-red-800 outline-none transition-all"
                value={sesso} onChange={(e) => setSesso(e.target.value as SessoType)}>
                <option value="non_specificato">Altro</option>
                <option value="M">M</option>
                <option value="F">F</option>
              </select>
            </div>
          </div>

          <div className="pt-2 space-y-4">
            <div className="flex flex-col gap-1">
               <label className="text-[10px] text-gray-400 ml-1 uppercase font-bold">Corso di Laurea *</label>
               <input type="text" placeholder="es. Informatica" className="w-full p-3 border border-gray-200 rounded-xl text-gray-900 bg-white placeholder-gray-400 focus:border-red-800 outline-none transition-all"
                 value={corso} onChange={(e) => setCorso(e.target.value)} required />
            </div>
            
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="text-[10px] text-gray-400 ml-1 uppercase font-bold">Anno Inizio *</label>
                <input type="number" placeholder="2021" className="w-full p-3 border border-gray-200 rounded-xl text-gray-900 bg-white placeholder-gray-400 focus:border-red-800 outline-none transition-all"
                  value={annoInizio} onChange={(e) => setAnnoInizio(e.target.value)} required />
              </div>
              <div className="flex-1">
                <label className="text-[10px] text-gray-400 ml-1 uppercase font-bold">Anno Fine (se laureato)</label>
                <input type="number" placeholder="2024" className="w-full p-3 border border-gray-200 rounded-xl text-gray-900 bg-white placeholder-gray-400 focus:border-red-800 outline-none transition-all"
                  value={annoFine} onChange={(e) => setAnnoFine(e.target.value)} />
              </div>
            </div>

            <div className="flex flex-col gap-1">
               <label className="text-[10px] text-gray-400 ml-1 uppercase font-bold">Voto Laurea (Opzionale)</label>
               <input type="number" placeholder="es. 110" className="w-full p-3 border border-gray-200 rounded-xl text-gray-900 bg-white placeholder-gray-400 focus:border-red-800 outline-none transition-all"
                 value={voto} onChange={(e) => setVoto(e.target.value)} min="60" max="113" />
            </div>
          </div>

          <button type="submit" disabled={loading} className="w-full bg-red-800 text-white p-4 rounded-xl font-bold hover:bg-red-900 transition-colors disabled:opacity-50 mt-4">
            {loading ? 'Salvataggio...' : 'Conferma ed entra'}
          </button>
        </form>
      </div>
    </main>
  )
}