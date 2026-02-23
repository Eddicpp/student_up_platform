'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function RegisterPage() {
  // Stati Base
  const [nome, setNome] = useState('')
  const [cognome, setCognome] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  
  // Stati Universitari
  const [corsoId, setCorsoId] = useState('')
  const [annoInizio, setAnnoInizio] = useState<number | ''>('')
  const [annoAppartenenza, setAnnoAppartenenza] = useState<number | ''>('')
  
  // Stati di Controllo
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const router = useRouter()
  const supabase = createClient()

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const isInstitutional = email.endsWith('@studenti.unipd.it')
    
    // ✅ CONTROLLO DINAMICO SU DATABASE
    let isWhitelisted = false
    if (!isInstitutional) {
      const { data } = await (supabase as any)
        .from('whitelist_esterni')
        .select('email')
        .eq('email', email.toLowerCase())
        .maybeSingle() // maybeSingle è meglio di single() qui per evitare errori se non trova nulla
      
      if (data) isWhitelisted = true
    }

    if (!isInstitutional && !isWhitelisted) {
      setError('Usa la tua email istituzionale @studenti.unipd.it o chiedi l\'accesso come tester.')
      setLoading(false)
      return
    }

    // 3. Registrazione su Supabase Auth
    const { data: authData, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
        // Passiamo i dati extra anche qui per sicurezza
        data: { nome, cognome } 
      },
    })

    if (signUpError) {
      setError(signUpError.message)
      setLoading(false)
      return
    }

    const userId = authData.user?.id

    if (userId) {
      // 4. Creazione del profilo pubblico
      await supabase.from('studente').insert([
        { id: userId, nome, cognome, email }
      ] as any)

      // 5. Salvataggio delle informazioni universitarie per l'Emote!
      if (corsoId && annoInizio && annoAppartenenza) {
        const { error: corsoError } = await supabase.from('studente_corso').insert([
          {
            studente_id: userId,
            corso_id: corsoId,
            anno_inizio: annoInizio,
            anno_appartenenza: annoAppartenenza
          }
        ] as any)

        if (corsoError) {
          console.error("Errore durante il salvataggio del corso:", corsoError)
        }
      }
    }

    // ✅ 6. Messaggio di conferma dinamico
    if (isInstitutional) {
      alert("Controlla la tua email @studenti.unipd.it per confermare l'account!")
    } else {
      alert("Controlla la tua email per confermare l'account, tester!")
    }
    
    router.push('/')
    setLoading(false)
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 p-4 py-12">
      <div className="w-full max-w-2xl bg-white p-8 md:p-12 rounded-[3rem] shadow-xl border-4 border-gray-100">
        <h1 className="text-4xl font-black text-red-900 mb-2 text-center uppercase italic tracking-tighter">
          Unisciti a StudentUP
        </h1>
        <p className="text-center text-gray-500 font-bold text-sm uppercase tracking-widest mb-10">
          Crea il tuo profilo accademico
        </p>
        
        {error && <p className="mb-6 p-4 bg-red-50 text-red-800 rounded-2xl text-sm font-bold border-2 border-red-200">{error}</p>}

        <form onSubmit={handleRegister} className="space-y-6">
          
          {/* DATI PERSONALI */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-2">Nome *</label>
              <input type="text" placeholder="Mario" value={nome} onChange={(e) => setNome(e.target.value)} required className="w-full p-4 bg-gray-50 border-2 border-gray-200 rounded-2xl focus:border-red-800 outline-none transition-all font-medium" />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-2">Cognome *</label>
              <input type="text" placeholder="Rossi" value={cognome} onChange={(e) => setCognome(e.target.value)} required className="w-full p-4 bg-gray-50 border-2 border-gray-200 rounded-2xl focus:border-red-800 outline-none transition-all font-medium" />
            </div>
          </div>

          <div className="flex flex-col gap-2">
             <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-2">Email Istituzionale *</label>
             <input type="email" placeholder="mario.rossi@studenti.unipd.it" value={email} onChange={(e) => setEmail(e.target.value)} required className="w-full p-4 bg-gray-50 border-2 border-gray-200 rounded-2xl focus:border-red-800 outline-none transition-all font-medium" />
          </div>

          {/* DATI UNIVERSITARI (Per l'Emote) */}
          <div className="bg-red-50 p-6 rounded-[2rem] border-2 border-red-100 space-y-4">
            <h3 className="text-[11px] font-black text-red-800 uppercase tracking-widest mb-4">Informazioni di Studio</h3>
            
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-black uppercase text-red-900/60 tracking-widest ml-2">Corso di Laurea *</label>
              <select value={corsoId} onChange={(e) => setCorsoId(e.target.value)} required className="w-full p-4 bg-white border-2 border-red-200 rounded-2xl focus:border-red-800 outline-none transition-all font-medium text-gray-800">
                <option value="" disabled>Seleziona il tuo corso...</option>
                {/* ID fittizi o reali del tuo database */}
                <option value="informatica">Informatica</option>
                <option value="ingegneria">Ingegneria</option>
                <option value="design">Design e Comunicazione</option>
                <option value="economia">Economia</option>
              </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-black uppercase text-red-900/60 tracking-widest ml-2">Inizio Corso *</label>
                <select value={annoInizio} onChange={(e) => setAnnoInizio(Number(e.target.value))} required className="w-full p-4 bg-white border-2 border-red-200 rounded-2xl focus:border-red-800 outline-none transition-all font-medium text-gray-800">
                  <option value="" disabled>Anno immatricolazione</option>
                  <option value={2026}>2026</option>
                  <option value={2025}>2025</option>
                  <option value={2024}>2024</option>
                  <option value={2023}>2023</option>
                  <option value={2022}>2022 o prima</option>
                </select>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-black uppercase text-red-900/60 tracking-widest ml-2">Anno Attuale *</label>
                <select value={annoAppartenenza} onChange={(e) => setAnnoAppartenenza(Number(e.target.value))} required className="w-full p-4 bg-white border-2 border-red-200 rounded-2xl focus:border-red-800 outline-none transition-all font-medium text-gray-800">
                  <option value="" disabled>A che anno sei?</option>
                  <option value={1}>1° Anno</option>
                  <option value={2}>2° Anno</option>
                  <option value={3}>3° Anno</option>
                  <option value={4}>Fuoricorso / Magistrale</option>
                </select>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2">
             <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-2">Password *</label>
             <input type="password" placeholder="Scegli una password sicura" value={password} onChange={(e) => setPassword(e.target.value)} required className="w-full p-4 bg-gray-50 border-2 border-gray-200 rounded-2xl focus:border-red-800 outline-none transition-all font-medium" />
          </div>

          <button type="submit" disabled={loading} className="w-full bg-red-800 text-white p-5 rounded-2xl font-black uppercase tracking-widest text-sm hover:bg-red-900 hover:-translate-y-1 shadow-xl transition-all disabled:opacity-50 disabled:hover:translate-y-0 mt-4">
            {loading ? 'Creazione profilo in corso...' : 'Registrati ora'}
          </button>
        </form>
      </div>
    </main>
  )
}