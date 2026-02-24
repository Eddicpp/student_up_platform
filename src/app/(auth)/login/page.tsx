'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

// --- COMPONENTE OCCHI CARTOON DIREZIONALI ---
const CartoonEyePair = ({ 
  className, 
  isLookingAway, 
  sector, 
  blinkDelay = '0s',
  sizeClass = 'w-10 h-10' // Dimensione default
}: { 
  className?: string, 
  isLookingAway: boolean, 
  sector: 'N' | 'NE' | 'E' | 'SE' | 'S' | 'SW' | 'W' | 'NW', 
  blinkDelay?: string,
  sizeClass?: string 
}) => {
  
  // Calcola dove deve andare la pupilla in base al settore e al focus
  const getPupilPos = () => {
    const coords = {
      N:  { toward: 'top-[75%] left-[50%]', away: 'top-[25%] left-[50%]' },
      NE: { toward: 'top-[70%] left-[30%]', away: 'top-[30%] left-[70%]' },
      E:  { toward: 'top-[50%] left-[25%]', away: 'top-[50%] left-[75%]' },
      SE: { toward: 'top-[30%] left-[30%]', away: 'top-[70%] left-[70%]' },
      S:  { toward: 'top-[25%] left-[50%]', away: 'top-[75%] left-[50%]' },
      SW: { toward: 'top-[30%] left-[70%]', away: 'top-[70%] left-[30%]' },
      W:  { toward: 'top-[50%] left-[75%]', away: 'top-[50%] left-[25%]' },
      NW: { toward: 'top-[70%] left-[70%]', away: 'top-[30%] left-[30%]' },
    };
    return isLookingAway ? coords[sector].away : coords[sector].toward;
  }

  const pupilPos = getPupilPos();
  // La pupilla è nera, tonda, grande la metà dell'occhio e si muove in modo fluido
  const pupilStyle = `absolute w-1/2 h-1/2 bg-black rounded-full transition-all duration-300 ease-[cubic-bezier(0.68,-0.55,0.265,1.55)] ${pupilPos} -translate-x-1/2 -translate-y-1/2`;

  // L'occhio intero con l'animazione del battito applicata
  const eyeStyle = `relative ${sizeClass} bg-white border-4 border-gray-900 rounded-full overflow-hidden shadow-[2px_2px_0px_0px_rgba(255,255,255,0.2)] animate-blink`;

  return (
    <div className={`flex gap-1.5 ${className}`}>
      <div className={eyeStyle} style={{ animationDelay: blinkDelay }}>
        <div className={pupilStyle}></div>
      </div>
      <div className={eyeStyle} style={{ animationDelay: blinkDelay }}>
        <div className={pupilStyle}></div>
      </div>
    </div>
  );
};


export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  // Tracciamo il focus della password per far girare gli occhi
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
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center bg-black p-4 overflow-hidden">
      
      {/* INIEZIONE ANIMAZIONE CSS (Blink) */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes blink {
          0%, 90%, 100% { transform: scaleY(1); }
          95% { transform: scaleY(0.1); }
        }
        .animate-blink {
          animation: blink 4s infinite;
        }
      `}} />

      {/* --- BACKGROUND CON GLI OCCHI (8 SETTORI) --- */}
      
      {/* NORD (Guarda in basso verso il centro) */}
      <CartoonEyePair sector="N" isLookingAway={isPasswordFocused} blinkDelay="0.2s" className="absolute top-[5%] left-[45%] -rotate-6" sizeClass="w-14 h-14" />
      <CartoonEyePair sector="N" isLookingAway={isPasswordFocused} blinkDelay="1.5s" className="absolute top-[12%] left-[55%] rotate-12" sizeClass="w-8 h-8" />
      <CartoonEyePair sector="N" isLookingAway={isPasswordFocused} blinkDelay="3.1s" className="absolute top-[2%] left-[65%] rotate-3" sizeClass="w-10 h-10" />

      {/* NORD-EST (Guarda in basso a sinistra) */}
      <CartoonEyePair sector="NE" isLookingAway={isPasswordFocused} blinkDelay="0.8s" className="absolute top-[10%] right-[10%] rotate-12" sizeClass="w-16 h-16" />
      <CartoonEyePair sector="NE" isLookingAway={isPasswordFocused} blinkDelay="2.2s" className="absolute top-[22%] right-[20%] -rotate-12" sizeClass="w-10 h-10" />
      <CartoonEyePair sector="NE" isLookingAway={isPasswordFocused} blinkDelay="1.1s" className="absolute top-[5%] right-[25%] rotate-6" sizeClass="w-12 h-12" />

      {/* EST (Guarda a sinistra) */}
      <CartoonEyePair sector="E" isLookingAway={isPasswordFocused} blinkDelay="0.5s" className="absolute top-[45%] right-[5%] -rotate-6" sizeClass="w-14 h-14" />
      <CartoonEyePair sector="E" isLookingAway={isPasswordFocused} blinkDelay="3.4s" className="absolute top-[60%] right-[12%] rotate-12" sizeClass="w-8 h-8" />
      <CartoonEyePair sector="E" isLookingAway={isPasswordFocused} blinkDelay="1.7s" className="absolute top-[32%] right-[8%] rotate-3" sizeClass="w-12 h-12" />

      {/* SUD-EST (Guarda in alto a sinistra) */}
      <CartoonEyePair sector="SE" isLookingAway={isPasswordFocused} blinkDelay="2.9s" className="absolute bottom-[10%] right-[10%] -rotate-12" sizeClass="w-16 h-16" />
      <CartoonEyePair sector="SE" isLookingAway={isPasswordFocused} blinkDelay="0.3s" className="absolute bottom-[25%] right-[18%] rotate-6" sizeClass="w-10 h-10" />
      <CartoonEyePair sector="SE" isLookingAway={isPasswordFocused} blinkDelay="1.4s" className="absolute bottom-[5%] right-[30%] -rotate-3" sizeClass="w-12 h-12" />

      {/* SUD (Guarda in alto verso il centro) */}
      <CartoonEyePair sector="S" isLookingAway={isPasswordFocused} blinkDelay="1.9s" className="absolute bottom-[8%] left-[45%] rotate-6" sizeClass="w-12 h-12" />
      <CartoonEyePair sector="S" isLookingAway={isPasswordFocused} blinkDelay="0.7s" className="absolute bottom-[15%] left-[55%] -rotate-12" sizeClass="w-8 h-8" />
      <CartoonEyePair sector="S" isLookingAway={isPasswordFocused} blinkDelay="3.8s" className="absolute bottom-[3%] left-[60%] rotate-12" sizeClass="w-14 h-14" />

      {/* SUD-OVEST (Guarda in alto a destra) */}
      <CartoonEyePair sector="SW" isLookingAway={isPasswordFocused} blinkDelay="0.4s" className="absolute bottom-[12%] left-[10%] -rotate-6" sizeClass="w-16 h-16" />
      <CartoonEyePair sector="SW" isLookingAway={isPasswordFocused} blinkDelay="2.5s" className="absolute bottom-[22%] left-[22%] rotate-12" sizeClass="w-10 h-10" />
      <CartoonEyePair sector="SW" isLookingAway={isPasswordFocused} blinkDelay="1.2s" className="absolute bottom-[5%] left-[28%] -rotate-12" sizeClass="w-14 h-14" />

      {/* OVEST (Guarda a destra) */}
      <CartoonEyePair sector="W" isLookingAway={isPasswordFocused} blinkDelay="3.2s" className="absolute top-[45%] left-[5%] rotate-6" sizeClass="w-14 h-14" />
      <CartoonEyePair sector="W" isLookingAway={isPasswordFocused} blinkDelay="0.9s" className="absolute top-[58%] left-[15%] -rotate-3" sizeClass="w-8 h-8" />
      <CartoonEyePair sector="W" isLookingAway={isPasswordFocused} blinkDelay="2.1s" className="absolute top-[35%] left-[8%] rotate-12" sizeClass="w-10 h-10" />

      {/* NORD-OVEST (Guarda in basso a destra) */}
      <CartoonEyePair sector="NW" isLookingAway={isPasswordFocused} blinkDelay="1.6s" className="absolute top-[12%] left-[12%] -rotate-12" sizeClass="w-16 h-16" />
      <CartoonEyePair sector="NW" isLookingAway={isPasswordFocused} blinkDelay="0.1s" className="absolute top-[25%] left-[20%] rotate-6" sizeClass="w-10 h-10" />
      <CartoonEyePair sector="NW" isLookingAway={isPasswordFocused} blinkDelay="2.8s" className="absolute top-[5%] left-[28%] rotate-3" sizeClass="w-12 h-12" />

      {/* --- FINESTRA DI LOGIN --- */}
      {/* Ombra rossa brillante su sfondo nero */}
      <div className="relative z-10 w-full max-w-md bg-white p-8 sm:p-10 rounded-3xl border-4 border-gray-900 shadow-[12px_12px_0px_0px_rgba(220,38,38,1)]">
        
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
                // Focus sulla mail -> Gli occhi tornano a guardarti
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
                // ✅ EVENTI CHIAVE: Focus fa girare gli occhi, Blur li fa tornare normali
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