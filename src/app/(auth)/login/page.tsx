'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const router = useRouter()
  const supabase = createClient()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { error: loginError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (loginError) {
      setError("Email o password errati. Assicurati di aver confermato l'email.")
      setLoading(false)
    } else {
      // --- INIZIO SMART ROUTING ---
      // Recuperiamo l'utente appena loggato
      const { data: { user } } = await supabase.auth.getUser()

      if (user) {
        // Chiediamo al database se questo utente ha già salvato il suo nome
        const { data: studente } = await supabase
          .from('studente')
          .select('nome')
          .eq('id', user.id)
          .maybeSingle()

        // Se non esiste la riga o il nome è vuoto -> Nuovo utente -> Onboarding
        if (!studente || !studente.nome) {
          router.push('/onboarding')
        } 
        // Se ha già un nome -> Utente esistente -> Bacheca Progetti
        else {
          router.push('/dashboard')
        }
        
        router.refresh()
      }
      // --- FINE SMART ROUTING ---
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md bg-white p-8 rounded-2xl shadow-lg border border-gray-100">
        <h1 className="text-3xl font-bold text-red-800 mb-2 text-center">StudentUP</h1>
        <p className="text-gray-500 text-center mb-8">Accedi al tuo account UniPD</p>

        <form onSubmit={handleLogin} className="space-y-4">
          {error && <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>}
          <input
            type="email"
            placeholder="email@studenti.unipd.it"
            className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 outline-none text-gray-900 placeholder:text-gray-500 bg-white"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            />
            <input
            type="password"
            placeholder="Password"
            className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 outline-none text-gray-900 placeholder:text-gray-500 bg-white"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            />
          <button
            disabled={loading}
            className="w-full bg-red-800 text-white p-3 rounded-xl font-bold hover:bg-red-900 transition-colors disabled:opacity-50"
          >
            {loading ? 'Entrando...' : 'Accedi'}
          </button>
        </form>
        <p className="mt-6 text-center text-sm">
          Non hai un account? <Link href="/register" className="text-red-800 font-bold">Registrati</Link>
        </p>
      </div>
    </main>
  )
}