'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

// Definiamo i tipi validi per il sesso come indicato nel dizionario dati
type SessoType = 'M' | 'F' | 'altro' | 'non_specificato';

export default function OnboardingPage() {
  const [nome, setNome] = useState('')
  const [cognome, setCognome] = useState('')
  const [corso, setCorso] = useState('')
  
  // Utilizziamo il tipo specifico per evitare l'errore di TypeScript
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
      // 1. Salvataggio nella tabella 'studente'
      // Usiamo upsert per gestire eventuali record già esistenti
      const { error: studentError } = await supabase
        .from('studente')
        .upsert({
          id: user.id,
          nome: nome,
          cognome: cognome,
          email: user.email!,
          data_nascita: dataNascita || null,
          sesso: sesso // Ora TypeScript sa che questo valore è corretto
        })
  
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
            anno_inizio: parseInt(annoInizio), // Deve essere un numero
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
        <h2 className="text-2xl font-bold text-red-800 mb-6 text-center">Completa il tuo Profilo</h2>

        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-xl text-sm border border-red-100">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <input type="text" placeholder="Nome" className="w-full p-3 border rounded-xl text-gray-900 bg-white"
            value={nome} onChange={(e) => setNome(e.target.value)} required />
          
          <input type="text" placeholder="Cognome" className="w-full p-3 border rounded-xl text-gray-900 bg-white"
            value={cognome} onChange={(e) => setCognome(e.target.value)} required />

          <div className="flex gap-2">
            <div className="flex-1">
              <label className="text-[10px] text-gray-400 ml-1 uppercase font-bold">Data Nascita *</label>
              <input type="date" className="w-full p-3 border rounded-xl text-gray-900 bg-white"
                value={dataNascita} onChange={(e) => setDataNascita(e.target.value)} required />
            </div>
            <div className="w-1/3">
              <label className="text-[10px] text-gray-400 ml-1 uppercase font-bold">Sesso</label>
              <select className="w-full p-3 border rounded-xl text-gray-900 bg-white"
                value={sesso} onChange={(e) => setSesso(e.target.value as SessoType)}>
                <option value="non_specificato">Altro</option>
                <option value="M">M</option>
                <option value="F">F</option>
              </select>
            </div>
          </div>

          <div className="pt-4 space-y-4">
            <input type="text" placeholder="Corso (es. Informatica)" className="w-full p-3 border rounded-xl text-gray-900 bg-white"
              value={corso} onChange={(e) => setCorso(e.target.value)} required />
            
            <div className="flex gap-2">
              <input type="number" placeholder="Anno Inizio *" className="w-full p-3 border rounded-xl text-gray-900 bg-white"
                value={annoInizio} onChange={(e) => setAnnoInizio(e.target.value)} required />
              
              <input type="number" placeholder="Anno Fine" className="w-full p-3 border rounded-xl text-gray-900 bg-white"
                value={annoFine} onChange={(e) => setAnnoFine(e.target.value)} />
            </div>

            <input type="number" placeholder="Voto Laurea (60-113)" className="w-full p-3 border rounded-xl text-gray-900 bg-white"
              value={voto} onChange={(e) => setVoto(e.target.value)} min="60" max="113" />
          </div>

          <button type="submit" disabled={loading} className="w-full bg-red-800 text-white p-4 rounded-xl font-bold hover:bg-red-900 transition-colors disabled:opacity-50 mt-4">
            {loading ? 'Salvataggio...' : 'Crea Profilo'}
          </button>
        </form>
      </div>
    </main>
  )
}