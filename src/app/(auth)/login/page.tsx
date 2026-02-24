'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

// --- COMPONENTE OCCHI CARTOON ---
// Questo componente gestisce una singola coppia di occhi
const CartoonEyePair = ({ className, isLookingAway }: { className?: string, isLookingAway: boolean }) => {
  // Stile comune per la pupilla nera
  const pupilStyle = `absolute w-3/5 h-3/5 bg-black rounded-full transition-all duration-300 ease-[cubic-bezier(0.68,-0.55,0.265,1.55)] ${
    isLookingAway 
      ? '-top-1 left-1/2 -translate-x-1/2' // Guarda in alto (nasconde lo sguardo)
      : 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2' // Guarda al centro (il form)
  }`;

  // Stile comune per il bulbo oculare bianco
  const eyeStyle = "relative w-8 h-8 sm:w-10 sm:h-10 bg-white border-4 border-gray-900 rounded-full overflow-hidden shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]";

  return (
    <div className={`flex gap-1 ${className}`}>
      {/* Occhio Sinistro */}
      <div className={eyeStyle}>
        <div className={pupilStyle}></div>
      </div>
      {/* Occhio Destro */}
      <div className={eyeStyle}>
        <div className={pupilStyle}></div>
      </div>
    </div>
  );
};


export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  // ✅ NUOVO STATO: Tracciamo se il campo password ha il focus
  const [isPasswordFocused, setIsPasswordFocused] = useState(false)
  
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
      const { data: { user } } = await supabase.auth.getUser()

      if (user) {
        const { data: studente } = await supabase
          .from('studente')
          .select('nome')
          .eq('id', user.id)
          .maybeSingle()

        if (!studente || !studente.nome) {
          router.push('/onboarding')
        } 
        else {
          router.push('/dashboard')
        }
        
        router.refresh()
      }
      // --- FINE SMART ROUTING ---
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center bg-blue-400 p-4 overflow-hidden">
      
      {/* --- BACKGROUND ANIMATO CON OCCHI --- */}
      {/* Pattern a pois */}
      <div 
        className="absolute inset-0 opacity-20 pointer-events-none" 
        style={{ 
          backgroundImage: 'radial-gradient(#000 3px, transparent 3px)', 
          backgroundSize: '32px 32px' 
        }} 
      />
      
      {/* ✅ OCCHI SPARSI SULLO SFONDO */}
      {/* In alto a sinistra */}
      <CartoonEyePair 
        className="absolute top-10 left-[10%] pointer-events-none -rotate-12 scale-75 sm:scale-100" 
        isLookingAway={isPasswordFocused} 
      />
      {/* In basso a sinistra */}
      <CartoonEyePair 
        className="absolute bottom-20 left-[5%] pointer-events-none rotate-6 scale-90 sm:scale-110" 
        isLookingAway={isPasswordFocused} 
      />
       {/* In alto a destra */}
      <CartoonEyePair 
        className="absolute top-16 right-[12%] pointer-events-none rotate-12 scale-90 sm:scale-105" 
        isLookingAway={isPasswordFocused} 
      />
      {/* In basso a destra */}
      <CartoonEyePair 
        className="absolute bottom-32 right-[8%] pointer-events-none -rotate-6 scale-75 sm:scale-95" 
        isLookingAway={isPasswordFocused} 
      />
       {/* Centro alto (seminascosto su mobile) */}
       <CartoonEyePair 
        className="absolute top-5 left-1/2 -translate-x-1/2 pointer-events-none scale-50 sm:scale-75 opacity-50 sm:opacity-100" 
        isLookingAway={isPasswordFocused} 
      />
      {/* --- FINE BACKGROUND --- */}


      {/* --- FINESTRA DI LOGIN --- */}
      <div className="relative z-10 w-full max-w-md bg-white p-8 sm:p-10 rounded-3xl border-4 border-gray-900 shadow-[12px_12px_0px_0px_rgba(0,0,0,1)]">
        
        <div className="text-center mb-8">
          <h1 className="text-5xl font-black text-gray-900 italic tracking-tighter uppercase mb-2">
            STUDENT<span className="text-red-600">UP</span>
          </h1>
          <div className="inline-block bg-yellow-300 border-2 border-gray-900 px-3 py-1 rounded-lg shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] -rotate-2 mt-2">
            <p className="text-gray-900 font-black text-sm uppercase tracking-widest">Accesso UniPD</p>
          </div>
        </div>

        <form onSubmit={handleLogin} className="space-y-5">
          {error && (
            <div className="p-4 bg-red-400 border-4 border-gray-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] text-gray-900 font-bold rounded-xl text-sm animate-in shake">
              ⚠️ {error}
            </div>
          )}
          
          <div className="space-y-4">
            {/* Input Email */}
            <div className="relative group">
              <input
                type="email"
                placeholder="mario.rossi@studenti.unipd.it"
                className="w-full p-4 pl-12 border-4 border-gray-900 rounded-xl focus:outline-none focus:translate-x-[4px] focus:translate-y-[4px] focus:shadow-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] text-gray-900 font-black placeholder:text-gray-500 placeholder:font-bold bg-white transition-all text-lg"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                // Quando l'email ha il focus, assicuriamoci che gli occhi guardino
                onFocus={() => setIsPasswordFocused(false)}
                required
              />
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl group-focus-within:scale-110 transition-transform">📧</span>
            </div>

            {/* Input Password */}
            <div className="relative group">
              <input
                type="password"
                placeholder="La tua password"
                className="w-full p-4 pl-12 border-4 border-gray-900 rounded-xl focus:outline-none focus:translate-x-[4px] focus:translate-y-[4px] focus:shadow-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] text-gray-900 font-black placeholder:text-gray-500 placeholder:font-bold bg-white transition-all text-lg"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                // ✅ QUI AVVIENE LA MAGIA: Focus = occhi in alto, Blur = occhi giù
                onFocus={() => setIsPasswordFocused(true)}
                onBlur={() => setIsPasswordFocused(false)}
                required
              />
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl group-focus-within:scale-110 transition-transform">🔑</span>
            </div>
          </div>

          <button
            disabled={loading}
            className="w-full bg-red-600 text-white p-4 rounded-xl font-black text-xl uppercase tracking-widest border-4 border-gray-900 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[6px] hover:translate-y-[6px] transition-all disabled:opacity-50 mt-4"
          >
            {loading ? 'Caricamento...' : 'Entra'}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t-4 border-dashed border-gray-300 text-center">
          <p className="text-gray-600 font-bold">
            Non hai ancora un account?
          </p>
          <Link 
            href="/register" 
            className="inline-block mt-3 px-6 py-2 bg-white text-gray-900 font-black uppercase tracking-widest border-4 border-gray-900 rounded-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[4px] hover:translate-y-[4px] transition-all"
          >
            Registrati Ora
          </Link>
        </div>
      </div>
    </main>
  )
}