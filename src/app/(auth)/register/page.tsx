'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function RegisterPage() {
  // Stati Base: Solo Email e Password
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const router = useRouter()
  const supabase = createClient()

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    // 1. Pulizia Email
    const emailPulita = email.trim().toLowerCase()
    const isInstitutional = emailPulita.endsWith('@studenti.unipd.it')
    
    // 2. Controllo Whitelist per Tester
    let isWhitelisted = false
    if (!isInstitutional) {
      const { data } = await (supabase as any)
        .from('whitelist_esterni')
        .select('email')
        .eq('email', emailPulita)
        .maybeSingle()
      
      if (data) isWhitelisted = true
    }

    if (!isInstitutional && !isWhitelisted) {
      setError('Usa la tua email istituzionale @studenti.unipd.it o chiedi l\'accesso come tester.')
      setLoading(false)
      return
    }

    // 3. Registrazione veloce su Supabase Auth (solo credenziali)
    const { data: authData, error: signUpError } = await supabase.auth.signUp({
      email: emailPulita,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    if (signUpError) {
      setError(signUpError.message)
      setLoading(false)
      return
    }

    const userId = authData.user?.id

    if (userId) {
      // 4. Creazione del "guscio" vuoto nel database (riempiremo il resto nell'onboarding)
      await supabase.from('studente').insert([
        { 
          id: userId, 
          email: emailPulita,
          nome: '',     // Temporaneamente vuoto
          cognome: ''   // Temporaneamente vuoto
        }
      ] as any)
    }

    // 5. Messaggio di successo
    if (isInstitutional) {
      alert("Account creato! Clicca sul link che ti abbiamo inviato via email.")
    } else {
      alert("Account creato! Controlla la tua email per confermare l'accesso, tester.")
    }
    
    router.push('/')
    setLoading(false)
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 p-4 py-12">
      <div className="w-full max-w-md bg-white p-8 md:p-12 rounded-[3rem] shadow-xl border-4 border-gray-100">
        <h1 className="text-4xl font-black text-red-900 mb-2 text-center uppercase italic tracking-tighter">
          StudentUP
        </h1>
        <p className="text-center text-gray-500 font-bold text-sm uppercase tracking-widest mb-10">
          Il primo passo per iniziare
        </p>
        
        {error && (
          <p className="mb-6 p-4 bg-red-50 text-red-800 rounded-2xl text-sm font-bold border-2 border-red-200">
            {error}
          </p>
        )}

        <form onSubmit={handleRegister} className="space-y-6">
          
          <div className="flex flex-col gap-2">
             <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-2">Email Istituzionale *</label>
             <input 
               type="email" 
               placeholder="mario.rossi@studenti.unipd.it" 
               value={email} 
               onChange={(e) => setEmail(e.target.value)} 
               required 
               className="w-full p-4 bg-gray-50 border-2 border-gray-200 rounded-2xl focus:border-red-800 outline-none transition-all font-medium text-gray-900 placeholder-gray-400" 
             />
          </div>

          <div className="flex flex-col gap-2">
             <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-2">Scegli una Password *</label>
             <input 
               type="password" 
               placeholder="Minimo 6 caratteri" 
               value={password} 
               onChange={(e) => setPassword(e.target.value)} 
               required 
               className="w-full p-4 bg-gray-50 border-2 border-gray-200 rounded-2xl focus:border-red-800 outline-none transition-all font-medium text-gray-900 placeholder-gray-400" 
             />
          </div>

          <button 
            type="submit" 
            disabled={loading} 
            className="w-full bg-red-800 text-white p-5 rounded-2xl font-black uppercase tracking-widest text-sm hover:bg-red-900 hover:-translate-y-1 shadow-xl transition-all disabled:opacity-50 disabled:hover:translate-y-0 mt-4"
          >
            {loading ? 'Creazione in corso...' : 'Continua'}
          </button>
        </form>
      </div>
    </main>
  )
}