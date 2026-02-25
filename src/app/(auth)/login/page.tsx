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
      
      {/* --- INIEZIONE MAXI-ANIMAZIONI CSS CUSTOM --- */}
      <style dangerouslySetInnerHTML={{__html: `
        /* 🚀 TOP-LEFT */
        @keyframes rocket-flight {
          0% { transform: translate(0, 0) rotate(45deg); }
          50% { transform: translate(60px, -60px) rotate(60deg); }
          100% { transform: translate(0, 0) rotate(45deg); }
        }
        @keyframes ufo-hover {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-15px) rotate(8deg); }
        }
        
        /* 🔨 TOP-RIGHT */
        @keyframes hammer-hit {
          0%, 100% { transform: rotate(-45deg); }
          10% { transform: rotate(10deg); } 
          20% { transform: rotate(-45deg); }
        }
        @keyframes nail-down {
          0%, 100% { transform: translateY(0); }
          10%, 90% { transform: translateY(8px); } 
        }
        @keyframes wrench-turn {
          0%, 100% { transform: rotate(-20deg); }
          50% { transform: rotate(20deg); }
        }

        /* 💡 CENTER-LEFT */
        @keyframes float-up-fade {
          0% { transform: translateY(20px); opacity: 0; }
          20% { opacity: 1; }
          80% { transform: translateY(-30px); opacity: 1; }
          100% { transform: translateY(-40px); opacity: 0; }
        }
        @keyframes pencil-draw {
          0%, 100% { transform: translateX(0) rotate(-45deg); }
          50% { transform: translateX(40px) rotate(-35deg); }
        }
        @keyframes brush-paint {
          0%, 100% { transform: rotate(0deg); }
          50% { transform: rotate(-30deg) translate(10px, -10px); }
        }
        @keyframes drop-fall {
          0% { transform: translateY(0); opacity: 1; }
          100% { transform: translateY(40px); opacity: 0; }
        }

        /* 📊 CENTER-RIGHT */
        @keyframes mag-zoom {
          0%, 100% { transform: scale(1) translate(0, 0); }
          50% { transform: scale(1.3) translate(10px, -10px); }
        }
        @keyframes bar-grow {
          0%, 20% { transform: scaleY(0.1); }
          80%, 100% { transform: scaleY(1); }
        }
        @keyframes check-appear {
          0%, 30% { opacity: 0; transform: scale(0) rotate(-20deg); }
          40%, 80% { opacity: 1; transform: scale(1) rotate(0deg); }
          100% { opacity: 0; transform: scale(0); }
        }

        /* 🎯 BOTTOM-LEFT */
        @keyframes arrow-hit {
          0% { transform: translate(-40px, 40px); opacity: 0; }
          20%, 80% { transform: translate(0, 0); opacity: 1; }
          100% { transform: translate(0, 0); opacity: 0; }
        }
        @keyframes wave-flag {
          0%, 100% { transform: rotate(-10deg); }
          50% { transform: rotate(15deg); }
        }
        @keyframes pendulum {
          0%, 100% { transform: rotate(-20deg); }
          50% { transform: rotate(20deg); }
        }
        @keyframes shine-slide {
          0% { left: -50%; opacity: 0; }
          50% { opacity: 1; }
          100% { left: 150%; opacity: 0; }
        }

        /* 💻 BOTTOM-RIGHT */
        @keyframes bug-walk {
          0% { transform: translateX(0px) rotate(90deg); opacity: 1; }
          80% { transform: translateX(80px) rotate(90deg); opacity: 1; }
          100% { transform: translateX(100px) rotate(90deg); opacity: 0; }
        }
        @keyframes steam-rise {
          0% { transform: translateY(0) scale(1); opacity: 0; }
          50% { opacity: 0.8; }
          100% { transform: translateY(-30px) scale(1.5); opacity: 0; }
        }
        @keyframes code-scroll {
          0% { transform: translateY(15px); opacity: 0; }
          30%, 70% { opacity: 1; }
          100% { transform: translateY(-15px); opacity: 0; }
        }

        /* 🔗 SPARSE & DECORATIVE */
        @keyframes twinkle-random {
          0%, 100% { opacity: 0.2; transform: scale(0.8); }
          50% { opacity: 1; transform: scale(1.2); }
        }
        @keyframes chat-pop {
          0%, 100% { transform: scale(0); opacity: 0; }
          10%, 90% { transform: scale(1); opacity: 1; }
        }
        @keyframes ripple {
          0% { transform: scale(0.5); opacity: 1; border-width: 4px; }
          100% { transform: scale(3.5); opacity: 0; border-width: 0px; }
        }
        @keyframes float-heart {
          0% { transform: translateY(0) scale(0.8); opacity: 0; }
          20% { opacity: 1; }
          100% { transform: translateY(-80px) scale(1.2); opacity: 0; }
        }
        @keyframes slide-arrow {
          0% { transform: translateX(-30px); opacity: 0; }
          50% { transform: translateX(0); opacity: 1; }
          100% { transform: translateX(30px); opacity: 0; }
        }
        @keyframes confetti-fall {
          0% { transform: translateY(-20px) rotate(0deg); opacity: 1; }
          100% { transform: translateY(100px) rotate(360deg); opacity: 0; }
        }

        /* Classi assegnate */
        .anim-rocket { animation: rocket-flight 6s ease-in-out infinite; }
        .anim-ufo { animation: ufo-hover 4s ease-in-out infinite; }
        .anim-hammer { animation: hammer-hit 2s infinite; transform-origin: bottom right; }
        .anim-nail { animation: nail-down 2s infinite; }
        .anim-wrench { animation: wrench-turn 3s ease-in-out infinite; }
        
        .anim-float-idea { animation: float-up-fade 4s ease-in infinite; }
        .anim-pencil { animation: pencil-draw 3s ease-in-out infinite; }
        .anim-brush { animation: brush-paint 3s infinite; transform-origin: bottom left; }
        .anim-drop { animation: drop-fall 3s infinite; }
        
        .anim-zoom { animation: mag-zoom 4s ease-in-out infinite; }
        .anim-check { animation: check-appear 3s infinite; }
        
        .anim-arrow { animation: arrow-hit 3s infinite; }
        .anim-flag { animation: wave-flag 2s ease-in-out infinite; transform-origin: bottom left; }
        .anim-pendulum { animation: pendulum 2.5s ease-in-out infinite alternate; transform-origin: top center; }
        .anim-shine { animation: shine-slide 3s infinite; }
        
        .anim-bug { animation: bug-walk 5s linear infinite; }
        .anim-steam { animation: steam-rise 3s ease-out infinite; }
        .anim-code { animation: code-scroll 3s linear infinite; }
        
        .anim-chat-pop { animation: chat-pop 4s cubic-bezier(0.175, 0.885, 0.32, 1.275) infinite; }
        .anim-ripple { animation: ripple 2s cubic-bezier(0.0, 0.0, 0.2, 1) infinite; }
        .anim-heart { animation: float-heart 4s ease-in infinite; }
        .anim-slide { animation: slide-arrow 3s ease-in-out infinite; }
        .anim-confetti { animation: confetti-fall 4s linear infinite; }

        .anim-twinkle-1 { animation: twinkle-random 3s infinite; }
        .anim-twinkle-2 { animation: twinkle-random 4s infinite 1s; }
        .anim-twinkle-3 { animation: twinkle-random 2.5s infinite 0.5s; }
      `}} />

      {/* --- SFONDO DOODLE ANIMATO --- */}
      <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden opacity-80 select-none">
        
        {/* 🚀 AREA TOP-LEFT (Spazio & Innovazione) */}
        <div className="absolute top-[8%] left-[8%] text-5xl anim-rocket drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]">🚀</div>
        <div className="absolute top-[18%] left-[15%] text-6xl animate-[spin_20s_linear_infinite]">🪐</div>
        <div className="absolute top-[25%] left-[5%] text-4xl anim-ufo">🛸</div>
        <div className="absolute top-[5%] left-[20%] text-2xl anim-twinkle-1 text-yellow-300">✨</div>
        <div className="absolute top-[12%] left-[28%] text-xl anim-twinkle-2 text-yellow-300">⭐</div>

        {/* 🔨 AREA TOP-RIGHT (Costruzione & Making) */}
        <div className="absolute top-[10%] right-[12%] flex flex-col items-center">
          <div className="text-5xl anim-hammer z-10">🔨</div>
          <div className="text-3xl anim-nail -mt-3">🔩</div>
        </div>
        <div className="absolute top-[20%] right-[22%] flex">
          <div className="text-4xl animate-[spin_4s_linear_infinite] origin-center">⚙️</div>
          <div className="text-3xl animate-[spin_4s_linear_reverse_infinite] -ml-2 mt-2 origin-center">⚙️</div>
        </div>
        <div className="absolute top-[28%] right-[8%] text-5xl anim-wrench">🔧</div>
        <div className="absolute top-[8%] right-[25%] text-xl anim-twinkle-3 text-yellow-300">⭐</div>

        {/* 💡 AREA CENTER-LEFT (Idee & Creatività) */}
        <div className="absolute top-[45%] left-[10%] text-5xl animate-pulse drop-shadow-[0_0_20px_rgba(253,224,71,0.6)]">💡</div>
        <div className="absolute top-[38%] left-[18%] text-4xl anim-float-idea">💭</div>
        <div className="absolute top-[60%] left-[8%] text-5xl anim-pencil">✏️</div>
        <div className="absolute top-[70%] left-[15%] relative">
          <div className="text-5xl anim-brush">🖌️</div>
          <div className="text-2xl anim-drop absolute top-6 left-8">💧</div>
        </div>
        <div className="absolute top-[55%] left-[22%] text-2xl font-black text-white tracking-widest animate-pulse">...</div>

        {/* 📊 AREA CENTER-RIGHT (Dati & Analisi) */}
        {/* Grafico a barre custom che cresce */}
        <div className="absolute top-[45%] right-[10%] flex items-end gap-1.5 h-12 w-14 border-b-4 border-l-4 border-white/50 pb-1 pl-1">
          <div className="w-2.5 bg-blue-400 origin-bottom h-full" style={{animation: 'bar-grow 2s ease-out infinite alternate'}}></div>
          <div className="w-2.5 bg-green-400 origin-bottom h-[60%]" style={{animation: 'bar-grow 2.5s ease-out infinite alternate 0.2s'}}></div>
          <div className="w-2.5 bg-yellow-400 origin-bottom h-[80%]" style={{animation: 'bar-grow 3s ease-out infinite alternate 0.4s'}}></div>
        </div>
        <div className="absolute top-[55%] right-[18%] text-5xl anim-zoom">🔍</div>
        {/* Calcolatrice con numeri animati */}
        <div className="absolute top-[65%] right-[8%] relative hover:animate-bounce">
          <div className="text-5xl">🧮</div>
          <div className="absolute top-2 left-2 w-7 h-3 bg-white/90 rounded flex items-center justify-center overflow-hidden">
            <span className="text-[8px] font-black text-black animate-pulse">42</span>
          </div>
        </div>
        {/* Checklist con spunta */}
        <div className="absolute top-[38%] right-[25%] relative">
          <div className="text-5xl">📋</div>
          <div className="text-2xl absolute top-2 -right-3 text-green-400 drop-shadow-md anim-check font-black">✔️</div>
        </div>

        {/* 🎯 AREA BOTTOM-LEFT (Obiettivi & Target) */}
        <div className="absolute bottom-[20%] left-[10%] relative">
          <div className="text-6xl">🎯</div>
          <div className="text-4xl absolute -bottom-2 -left-2 anim-arrow">🏹</div>
        </div>
        {/* Trofeo con riflesso brillante */}
        <div className="absolute bottom-[8%] left-[18%] relative overflow-hidden w-16 h-16 flex items-center justify-center">
          <div className="text-6xl drop-shadow-[0_0_15px_rgba(251,191,36,0.5)]">🏆</div>
          <div className="absolute top-0 w-4 h-full bg-white/40 skew-x-[20deg] anim-shine mix-blend-overlay"></div>
        </div>
        <div className="absolute bottom-[25%] left-[25%] text-5xl anim-flag">🚩</div>
        <div className="absolute bottom-[5%] left-[6%] text-5xl anim-pendulum">🏅</div>

        {/* 💻 AREA BOTTOM-RIGHT (Tech & Coding) */}
        {/* Laptop con codice scorrevole */}
        <div className="absolute bottom-[15%] right-[12%] relative">
          <div className="text-6xl">💻</div>
          <div className="absolute top-1 left-3 w-10 h-7 overflow-hidden flex items-center justify-center">
            <div className="text-[10px] font-black text-green-400 anim-code">{'</>'}</div>
          </div>
        </div>
        <div className="absolute bottom-[25%] right-[22%] text-4xl text-green-400 font-black animate-pulse">{"{ }"}</div>
        <div className="absolute bottom-[8%] right-[25%] text-4xl anim-bug">🐛</div>
        <div className="absolute bottom-[5%] right-[8%] relative">
          <div className="text-5xl">☕</div>
          <div className="absolute -top-6 left-2 flex gap-1">
            <div className="text-xl anim-steam text-gray-300">♨️</div>
          </div>
        </div>

        {/* 🔗 AREA SPARSE (Connessioni & Collaborazione) */}
        {/* Nodi connessi */}
        <div className="absolute top-[30%] left-[45%] flex items-center gap-1 opacity-60">
          <div className="w-3 h-3 rounded-full bg-blue-400 animate-ping"></div>
          <div className="w-8 h-1 bg-white/50"></div>
          <div className="w-3 h-3 rounded-full bg-red-400 animate-ping" style={{animationDelay: '0.5s'}}></div>
        </div>
        <div className="absolute top-[50%] right-[35%] text-3xl anim-slide text-white/50">➡️</div>
        <div className="absolute bottom-[30%] left-[35%] text-5xl anim-chat-pop">💬</div>

        {/* ✨ ELEMENTI DECORATIVI SPARSI */}
        <div className="absolute top-[35%] left-[30%] text-2xl anim-twinkle-1 text-white">✨</div>
        <div className="absolute bottom-[40%] right-[30%] text-2xl anim-heart text-red-500 drop-shadow-md">❤️</div>
        <div className="absolute top-[70%] left-[35%] text-4xl animate-pulse text-yellow-400 drop-shadow-[0_0_10px_rgba(250,204,21,0.8)]">⚡</div>
        <div className="absolute top-[20%] right-[40%] text-2xl animate-[spin_6s_linear_infinite] text-blue-400 font-black">+</div>
        <div className="absolute bottom-[30%] left-[40%] text-2xl animate-[spin_5s_linear_reverse_infinite] text-purple-400 font-black">×</div>
        
        {/* Cerchi concentrici */}
        <div className="absolute top-[20%] right-[45%] w-6 h-6 border-blue-400 rounded-full anim-ripple"></div>
        {/* Coriandoli */}
        <div className="absolute top-[10%] left-[50%] text-3xl anim-confetti">🎊</div>
      </div>
      {/* --- FINE SFONDO DOODLE --- */}

      {/* --- FINESTRA DI LOGIN --- */}
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
                className="w-full p-4 pl-12 border-4 border-gray-900 rounded-xl focus:outline-none focus:translate-x-[4px] focus:translate-y-[4px] focus:shadow-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] text-gray-900 font-black placeholder:text-gray-500 placeholder:font-bold bg-white transition-all text-lg relative z-20"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl z-20 transition-transform group-focus-within:scale-110">📧</span>
            </div>

            {/* Input Password */}
            <div className="relative group">
              <input
                type="password"
                placeholder="La tua password"
                className="w-full p-4 pl-12 border-4 border-gray-900 rounded-xl focus:outline-none focus:translate-x-[4px] focus:translate-y-[4px] focus:shadow-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] text-gray-900 font-black placeholder:text-gray-500 placeholder:font-bold bg-white transition-all text-lg relative z-20"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl z-20 transition-transform group-focus-within:scale-110">🔑</span>
            </div>
          </div>

          <button
            disabled={loading}
            className="w-full bg-red-600 text-white p-4 rounded-xl font-black text-xl uppercase tracking-widest border-4 border-gray-900 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[6px] hover:translate-y-[6px] transition-all disabled:opacity-50 mt-4 relative z-20"
          >
            {loading ? 'Caricamento...' : 'Entra'}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t-4 border-dashed border-gray-300 text-center relative z-20">
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