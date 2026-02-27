'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function RegisterPage() {
  // Stati Base: Email e Password
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  
  // NUOVO STATO: Occhietto per la password
  const [showPassword, setShowPassword] = useState(false)
  
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

    // 3. Registrazione veloce su Supabase Auth 
    // (Avendo disattivato "Confirm Email" su Supabase, questo farà il login automatico)
    const { data: authData, error: signUpError } = await supabase.auth.signUp({
      email: emailPulita,
      password,
      // Rimosso emailRedirectTo perché non serve più
    })

    if (signUpError) {
      setError(signUpError.message)
      setLoading(false)
      return
    }

    const userId = authData.user?.id

    if (userId) {
      // 4. Creazione del "guscio" vuoto nel database
      await supabase.from('studente').insert([
        { 
          id: userId, 
          email: emailPulita,
          nome: '', 
          cognome: '' 
        }
      ] as any)
    }

    // 5. Niente email, niente alert: dritto all'Onboarding! 🚀
    router.push('/onboarding')
  }

  // ... (Qui inizia il tuo return con il JSX)

  return (
    <main className="relative flex min-h-screen items-center justify-center p-4 overflow-hidden bg-gradient-to-br from-indigo-400 via-purple-500 to-pink-500">
      
      {/* --- PATTERN DI SFONDO --- */}
      <div className="absolute inset-0 opacity-10 pointer-events-none">
        <div className="absolute inset-0" style={{
          backgroundImage: `radial-gradient(circle at 2px 2px, white 1px, transparent 0)`,
          backgroundSize: '32px 32px'
        }}></div>
      </div>

      {/* --- INIEZIONE MAXI-ANIMAZIONI CSS CUSTOM --- */}
      <style dangerouslySetInnerHTML={{__html: `
        /* 🚀 TOP-LEFT */
        @keyframes rocket-flight { 0% { transform: translate(0, 0) rotate(45deg); } 50% { transform: translate(60px, -60px) rotate(60deg); } 100% { transform: translate(0, 0) rotate(45deg); } }
        @keyframes ufo-hover { 0%, 100% { transform: translateY(0px) rotate(0deg); } 50% { transform: translateY(-15px) rotate(8deg); } }
        
        /* 🔨 TOP-RIGHT */
        @keyframes hammer-hit { 0%, 100% { transform: rotate(-45deg); } 10% { transform: rotate(10deg); } 20% { transform: rotate(-45deg); } }
        @keyframes nail-down { 0%, 100% { transform: translateY(0); } 10%, 90% { transform: translateY(8px); } }
        @keyframes wrench-turn { 0%, 100% { transform: rotate(-20deg); } 50% { transform: rotate(20deg); } }

        /* 💡 CENTER-LEFT */
        @keyframes float-up-fade { 0% { transform: translateY(20px); opacity: 0; } 20% { opacity: 1; } 80% { transform: translateY(-30px); opacity: 1; } 100% { transform: translateY(-40px); opacity: 0; } }
        @keyframes pencil-draw { 0%, 100% { transform: translateX(0) rotate(-45deg); } 50% { transform: translateX(40px) rotate(-35deg); } }
        @keyframes brush-paint { 0%, 100% { transform: rotate(0deg); } 50% { transform: rotate(-30deg) translate(10px, -10px); } }
        @keyframes drop-fall { 0% { transform: translateY(0); opacity: 1; } 100% { transform: translateY(40px); opacity: 0; } }

        /* 📊 CENTER-RIGHT */
        @keyframes mag-zoom { 0%, 100% { transform: scale(1) translate(0, 0); } 50% { transform: scale(1.3) translate(10px, -10px); } }
        @keyframes bar-grow { 0%, 20% { transform: scaleY(0.1); } 80%, 100% { transform: scaleY(1); } }
        @keyframes check-appear { 0%, 30% { opacity: 0; transform: scale(0) rotate(-20deg); } 40%, 80% { opacity: 1; transform: scale(1) rotate(0deg); } 100% { opacity: 0; transform: scale(0); } }

        /* 🎯 BOTTOM-LEFT */
        @keyframes arrow-hit { 0% { transform: translate(-40px, 40px); opacity: 0; } 20%, 80% { transform: translate(0, 0); opacity: 1; } 100% { transform: translate(0, 0); opacity: 0; } }
        @keyframes wave-flag { 0%, 100% { transform: rotate(-10deg); } 50% { transform: rotate(15deg); } }
        @keyframes pendulum { 0%, 100% { transform: rotate(-20deg); } 50% { transform: rotate(20deg); } }
        @keyframes shine-slide { 0% { left: -50%; opacity: 0; } 50% { opacity: 1; } 100% { left: 150%; opacity: 0; } }

        /* 💻 BOTTOM-RIGHT */
        @keyframes bug-walk { 0% { transform: translateX(0px) rotate(90deg); opacity: 1; } 80% { transform: translateX(80px) rotate(90deg); opacity: 1; } 100% { transform: translateX(100px) rotate(90deg); opacity: 0; } }
        @keyframes steam-rise { 0% { transform: translateY(0) scale(1); opacity: 0; } 50% { opacity: 0.8; } 100% { transform: translateY(-30px) scale(1.5); opacity: 0; } }
        @keyframes code-scroll { 0% { transform: translateY(15px); opacity: 0; } 30%, 70% { opacity: 1; } 100% { transform: translateY(-15px); opacity: 0; } }

        /* 🔗 SPARSE & DECORATIVE */
        @keyframes twinkle-random { 0%, 100% { opacity: 0.2; transform: scale(0.8); } 50% { opacity: 1; transform: scale(1.2); } }
        @keyframes chat-pop { 0%, 100% { transform: scale(0); opacity: 0; } 10%, 90% { transform: scale(1); opacity: 1; } }
        @keyframes ripple { 0% { transform: scale(0.5); opacity: 1; border-width: 4px; } 100% { transform: scale(3.5); opacity: 0; border-width: 0px; } }
        @keyframes float-heart { 0% { transform: translateY(0) scale(0.8); opacity: 0; } 20% { opacity: 1; } 100% { transform: translateY(-80px) scale(1.2); opacity: 0; } }
        @keyframes slide-arrow { 0% { transform: translateX(-30px); opacity: 0; } 50% { transform: translateX(0); opacity: 1; } 100% { transform: translateX(30px); opacity: 0; } }
        @keyframes confetti-fall { 0% { transform: translateY(-20px) rotate(0deg); opacity: 1; } 100% { transform: translateY(100px) rotate(360deg); opacity: 0; } }

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

      {/* ===============================================
         SFONDO DOODLE ANIMATO (IDENTICO AL LOGIN)
         =============================================== */}
      <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden select-none opacity-90">
        
        {/* ============ RIGA 1 ============ */}
        <div className="absolute top-[3%] left-[3%] text-3xl anim-rocket">🚀</div>
        <div className="absolute top-[5%] left-[12%] text-2xl anim-twinkle-1 text-white">✨</div>
        <div className="absolute top-[4%] left-[22%] text-4xl animate-[spin_20s_linear_infinite]">🪐</div>
        <div className="absolute top-[6%] left-[32%] text-3xl animate-pulse">♪</div>
        <div className="absolute top-[3%] left-[42%] text-2xl anim-confetti">🎊</div>
        <div className="absolute top-[5%] left-[52%] text-3xl animate-bounce">🎈</div>
        <div className="absolute top-[4%] left-[62%] text-2xl anim-twinkle-2 text-yellow-300">⭐</div>
        <div className="absolute top-[6%] left-[72%] text-3xl anim-hammer">🔨</div>
        <div className="absolute top-[3%] left-[82%] text-4xl animate-[spin_4s_linear_infinite]">⚙️</div>
        <div className="absolute top-[5%] left-[92%] text-2xl anim-twinkle-3 text-cyan-300">✨</div>
        
        {/* ============ RIGA 2 ============ */}
        <div className="absolute top-[12%] left-[5%] text-4xl animate-pulse">⏳</div>
        <div className="absolute top-[14%] left-[15%] text-3xl">🔭</div>
        <div className="absolute top-[11%] left-[25%] text-3xl hover:animate-bounce">📷</div>
        <div className="absolute top-[13%] left-[35%] text-2xl animate-pulse" style={{animationDelay: '0.3s'}}>♫</div>
        <div className="absolute top-[15%] left-[45%] text-3xl anim-bulb">💡</div>
        <div className="absolute top-[12%] left-[55%] text-3xl">🎲</div>
        <div className="absolute top-[14%] left-[65%] text-4xl">🏗️</div>
        <div className="absolute top-[11%] left-[75%] text-3xl animate-[spin_4s_linear_reverse_infinite]" style={{fontSize: '1.5rem'}}>⚙️</div>
        <div className="absolute top-[13%] left-[85%] text-3xl anim-wrench">🔧</div>
        <div className="absolute top-[15%] left-[95%] text-2xl anim-ufo">🛸</div>
        
        {/* ============ RIGA 3 ============ */}
        <div className="absolute top-[20%] left-[3%] text-3xl">🎸</div>
        <div className="absolute top-[22%] left-[13%] text-4xl hover:animate-spin">🎭</div>
        <div className="absolute top-[19%] left-[23%] text-3xl animate-[spin_3s_linear_infinite]">💿</div>
        <div className="absolute top-[21%] left-[33%] text-2xl anim-twinkle-1 text-white" style={{animationDelay: '1s'}}>⭐</div>
        <div className="absolute top-[23%] left-[43%] text-3xl">🪁</div>
        <div className="absolute top-[20%] left-[53%] text-3xl anim-bell">🔔</div>
        <div className="absolute top-[22%] left-[63%] text-4xl anim-brush">🖌️</div>
        <div className="absolute top-[19%] left-[73%] text-3xl anim-pencil">✏️</div>
        <div className="absolute top-[21%] left-[83%] text-3xl">🧩</div>
        <div className="absolute top-[23%] left-[93%] text-2xl anim-twinkle-2 text-white" style={{animationDelay: '1.5s'}}>✨</div>
        
        {/* ============ RIGA 4 ============ */}
        <div className="absolute top-[28%] left-[5%] text-3xl">⚖️</div>
        <div className="absolute top-[30%] left-[15%] text-3xl anim-float-idea">💭</div>
        <div className="absolute top-[27%] left-[25%] text-4xl animate-pulse">⚛️</div>
        <div className="absolute top-[29%] left-[35%] text-2xl bg-blue-400 rounded-full w-2 h-2"></div>
        <div className="absolute top-[31%] left-[67%] text-3xl hover:animate-pulse">🔬</div>
        <div className="absolute top-[28%] left-[77%] text-4xl" style={{transformStyle: 'preserve-3d'}}>🧬</div>
        <div className="absolute top-[30%] left-[87%] text-3xl animate-bounce">🧪</div>
        <div className="absolute top-[27%] left-[95%] text-2xl anim-twinkle-3 text-cyan-300">✨</div>
        
        {/* ============ RIGA 5 ============ */}
        <div className="absolute top-[36%] left-[3%] text-4xl text-red-400 anim-heart">❤️</div>
        <div className="absolute top-[38%] left-[10%] text-3xl hover:scale-110 transition-transform">🧠</div>
        <div className="absolute top-[35%] left-[18%] text-3xl">💉</div>
        <div className="absolute top-[40%] left-[5%] text-2xl">💊</div>
        
        {/* RIGA 5 LATO DESTRO - Computer */}
        <div className="absolute top-[36%] left-[82%] text-4xl">
          <span className="animate-pulse block">💻</span>
          <span className="absolute top-1 left-3 text-xs font-mono text-green-400 anim-code">{'</>'}</span>
        </div>
        <div className="absolute top-[38%] left-[92%] text-2xl font-mono text-green-400 animate-pulse">|</div>
        <div className="absolute top-[40%] left-[88%] text-3xl animate-bounce">👾</div>
        
        {/* ============ RIGA 6 ============ */}
        <div className="absolute top-[44%] left-[2%] text-3xl">🌊</div>
        <div className="absolute top-[46%] left-[10%] text-4xl">⚓</div>
        <div className="absolute top-[48%] left-[5%] text-3xl">🧭</div>
        <div className="absolute top-[45%] left-[15%] text-2xl anim-twinkle-1 text-white">⭐</div>
        
        <div className="absolute top-[44%] left-[85%] text-3xl">🧲</div>
        <div className="absolute top-[46%] left-[92%] text-4xl animate-[spin_2s_linear_infinite]">⚙️</div>
        <div className="absolute top-[48%] left-[88%] text-3xl animate-pulse">📶</div>
        <div className="absolute top-[45%] left-[95%] text-2xl anim-twinkle-2 text-purple-300">✨</div>
        
        {/* ============ RIGA 7 ============ */}
        <div className="absolute top-[52%] left-[3%] text-4xl animate-[spin_10s_linear_infinite]">☀️</div>
        <div className="absolute top-[54%] left-[12%] text-3xl">☁️</div>
        <div className="absolute top-[56%] left-[6%] text-2xl anim-drop">💧</div>
        <div className="absolute top-[53%] left-[18%] text-3xl animate-pulse">🔥</div>
        
        <div className="absolute top-[52%] left-[84%] text-3xl">💼</div>
        <div className="absolute top-[54%] left-[93%] text-4xl">🪙</div>
        <div className="absolute top-[56%] left-[88%] text-2xl anim-slide">📈</div>
        <div className="absolute top-[53%] left-[95%] text-3xl origin-bottom">📊</div>
        
        {/* ============ RIGA 8 ============ */}
        <div className="absolute top-[60%] left-[5%] text-3xl">🌳</div>
        <div className="absolute top-[62%] left-[15%] text-4xl hover:scale-110 transition-transform">🌸</div>
        <div className="absolute top-[64%] left-[8%] text-3xl">🍃</div>
        <div className="absolute top-[61%] left-[22%] text-2xl anim-twinkle-3 text-white" style={{animationDelay: '0.7s'}}>✨</div>
        <div className="absolute top-[63%] left-[40%] text-3xl text-green-400 animate-[spin_6s_linear_infinite]">♻️</div>
        <div className="absolute top-[60%] left-[55%] text-4xl hover:animate-bounce">🎁</div>
        <div className="absolute top-[62%] left-[75%] text-3xl">🪀</div>
        <div className="absolute top-[64%] left-[85%] text-3xl">🥁</div>
        <div className="absolute top-[61%] left-[93%] text-4xl">🎹</div>
        
        {/* ============ RIGA 9 ============ */}
        <div className="absolute top-[68%] left-[3%] text-4xl animate-bounce">🏀</div>
        <div className="absolute top-[70%] left-[13%] text-3xl animate-[spin_3s_linear_infinite]">⚽</div>
        <div className="absolute top-[72%] left-[6%] text-3xl">🏃</div>
        <div className="absolute top-[69%] left-[20%] text-4xl">🏊</div>
        <div className="absolute top-[71%] left-[30%] text-3xl hover:scale-110 transition-transform">🧘</div>
        <div className="absolute top-[68%] left-[45%] text-2xl text-pink-400 anim-heart">💕</div>
        <div className="absolute top-[70%] left-[58%] text-4xl animate-[spin_10s_linear_infinite]">🎡</div>
        <div className="absolute top-[72%] left-[70%] text-3xl">
          <span className="block">🚁</span>
          <span className="absolute -top-1 left-2 text-lg animate-[spin_0.2s_linear_infinite]">―</span>
        </div>
        <div className="absolute top-[69%] left-[80%] text-3xl anim-bug">🐛</div>

        {/* Tazzina caffè */}
        <div className="absolute top-[71%] left-[90%] text-4xl">
          <span className="block">☕</span>
          <span className="absolute -top-4 left-2 text-sm anim-steam opacity-60 text-gray-200">♨️</span>
        </div>
        
        {/* ============ RIGA 10 ============ */}
        {/* TROFEO */}
        <div className="absolute top-[76%] left-[5%] w-12 h-12 overflow-hidden flex items-center justify-center rounded-xl">
          <span className="text-4xl relative z-10">🏆</span>
          <div className="absolute top-0 left-0 w-3 h-full bg-white/40 skew-x-12 z-20 pointer-events-none anim-shine"></div>
        </div>

        <div className="absolute top-[78%] left-[15%] text-3xl anim-pendulum">🏅</div>
        <div className="absolute top-[80%] left-[8%] text-3xl anim-flag">🚩</div>

        {/* BERSAGLIO */}
        <div className="absolute top-[77%] left-[25%] text-4xl">
          <span className="block">🎯</span>
          <span className="absolute -left-2 top-1 text-2xl anim-arrow">🏹</span>
        </div>

        <div className="absolute top-[79%] left-[38%] text-3xl">🚜</div>
        <div className="absolute top-[76%] left-[50%] text-3xl animate-bounce">🍇</div>
        <div className="absolute top-[78%] left-[60%] text-4xl">🍷</div>
        <div className="absolute top-[80%] left-[72%] text-3xl anim-twinkle-1 text-white">⭐</div>
        <div className="absolute top-[77%] left-[82%] text-3xl font-mono text-green-400 animate-pulse">{"{ }"}</div>
        <div className="absolute top-[79%] left-[92%] text-2xl anim-twinkle-2 text-yellow-300">✨</div>
        
        {/* ============ RIGA 11 ============ */}
        <div className="absolute top-[84%] left-[3%] text-3xl" style={{animationDelay: '0.5s'}}>♬</div>
        <div className="absolute top-[86%] left-[12%] text-4xl">🎨</div>
        <div className="absolute top-[88%] left-[5%] text-3xl hover:-translate-y-2 transition-transform">📚</div>
        <div className="absolute top-[85%] left-[20%] text-3xl">📝</div>
        <div className="absolute top-[87%] left-[32%] text-4xl hover:scale-110 transition-transform">🤝</div>
        <div className="absolute top-[84%] left-[45%] w-4 h-4 border-2 border-white/30 rounded-full anim-ripple"></div>
        <div className="absolute top-[86%] left-[55%] text-3xl">📣</div>
        <div className="absolute top-[88%] left-[68%] text-4xl anim-chat-pop">💬</div>
        <div className="absolute top-[85%] left-[78%] text-3xl">👤</div>
        <div className="absolute top-[87%] left-[88%] text-3xl anim-confetti" style={{animationDelay: '1s'}}>🎉</div>
        
        {/* ============ RIGA 12 ============ */}
        <div className="absolute top-[92%] left-[5%] text-2xl anim-twinkle-3 text-white" style={{animationDelay: '0.3s'}}>✨</div>
        <div className="absolute top-[94%] left-[15%] text-3xl animate-bounce">🎓</div>
        <div className="absolute top-[93%] left-[28%] text-2xl animate-[spin_4s_linear_reverse_infinite] font-bold text-white/50">+</div>
        <div className="absolute top-[95%] left-[40%] text-3xl">🌟</div>
        <div className="absolute top-[92%] left-[52%] text-2xl anim-twinkle-1 text-cyan-300">✨</div>
        <div className="absolute top-[94%] left-[65%] text-3xl">🎪</div>
        <div className="absolute top-[93%] left-[78%] text-2xl animate-[spin_4s_linear_infinite] font-bold text-white/50">×</div>
        <div className="absolute top-[95%] left-[88%] text-3xl anim-ufo">🛸</div>
        <div className="absolute top-[92%] left-[95%] text-2xl anim-twinkle-2 text-white" style={{animationDelay: '2s'}}>⭐</div>

        {/* ============ ELEMENTI EXTRA SPARSI ============ */}
        <div className="absolute top-[33%] left-[8%] flex items-center gap-0.5 opacity-70">
          <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse"></div>
          <div className="w-4 h-0.5 bg-white/40"></div>
          <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" style={{animationDelay: '0.3s'}}></div>
        </div>
        
        <div className="absolute top-[65%] left-[92%] flex items-center gap-0.5 opacity-70">
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
          <div className="w-4 h-0.5 bg-white/40"></div>
          <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse" style={{animationDelay: '0.5s'}}></div>
        </div>
        
        <div className="absolute top-[82%] left-[62%] flex items-end gap-0.5 h-6 opacity-80 border-b-2 border-l-2 border-white/40 p-0.5">
          <div className="w-1.5 bg-green-400" style={{height: '40%', animation: 'bar-grow 1s ease-out infinite alternate'}}></div>
          <div className="w-1.5 bg-green-400" style={{height: '70%', animation: 'bar-grow 1.2s ease-out infinite alternate 0.2s'}}></div>
          <div className="w-1.5 bg-green-400" style={{height: '50%', animation: 'bar-grow 1.4s ease-out infinite alternate 0.4s'}}></div>
          <div className="w-1.5 bg-green-400" style={{height: '90%', animation: 'bar-grow 1.6s ease-out infinite alternate 0.6s'}}></div>
        </div>
        
        <div className="absolute top-[25%] left-[50%] w-3 h-3 border border-white/30 rounded-full anim-ripple"></div>
        <div className="absolute top-[75%] left-[35%] w-4 h-4 border border-white/20 rounded-full anim-ripple" style={{animationDelay: '1s'}}></div>

      </div>
      {/* --- FINE SFONDO DOODLE --- */}

      {/* --- FINESTRA DI REGISTRAZIONE NEO-BRUTALISTA --- */}
      <div className="relative z-10 w-full max-w-md bg-white p-8 sm:p-10 rounded-3xl shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] border-4 border-gray-900">
        
        <div className="text-center mb-8">
          <h1 className="text-5xl font-black text-gray-900 italic tracking-tighter uppercase mb-2">
            STUDENT<span className="text-red-600">UP</span>
          </h1>
          <div className="inline-block bg-yellow-300 border-2 border-gray-900 px-3 py-1 rounded-lg shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] -rotate-2 mt-2">
            <p className="text-gray-900 font-black text-sm uppercase tracking-widest">Inizia da qui</p>
          </div>
        </div>

        <form onSubmit={handleRegister} className="space-y-6">
          
          <div className="flex flex-col gap-2">
             <label className="text-xs font-black uppercase text-gray-900 tracking-widest ml-1">Email Istituzionale *</label>
             <div className="relative group">
               <input 
                 type="email" 
                 placeholder="mario.rossi@studenti.unipd.it" 
                 value={email} 
                 onChange={(e) => setEmail(e.target.value)} 
                 required 
                 className="w-full p-4 pl-12 bg-white border-4 border-gray-900 rounded-xl focus:outline-none focus:translate-x-[4px] focus:translate-y-[4px] focus:shadow-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all font-black text-gray-900 placeholder-gray-500 text-lg relative z-20" 
               />
               <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl z-20 transition-transform group-focus-within:scale-110">🎓</span>
             </div>
          </div>

          {/* CAMPO PASSWORD CON OCCHIETTO */}
          <div className="flex flex-col gap-2">
             <label className="text-xs font-black uppercase text-gray-900 tracking-widest ml-1">Scegli una Password *</label>
             <div className="relative group">
               <input 
                 // Se showPassword è true mostra il testo, altrimenti i pallini
                 type={showPassword ? "text" : "password"} 
                 placeholder="Minimo 6 caratteri" 
                 value={password} 
                 onChange={(e) => setPassword(e.target.value)} 
                 required 
                 // Aggiunto pr-12 (padding right) per non far finire il testo sotto l'occhietto
                 className="w-full p-4 pl-12 pr-12 bg-white border-4 border-gray-900 rounded-xl focus:outline-none focus:translate-x-[4px] focus:translate-y-[4px] focus:shadow-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all font-black text-gray-900 placeholder-gray-500 text-lg relative z-20" 
               />
               <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl z-20 transition-transform group-focus-within:scale-110">🔑</span>
               
               {/* BOTTONE OCCHIETTO */}
               <button 
                 type="button"
                 onClick={() => setShowPassword(!showPassword)}
                 className="absolute right-4 top-1/2 -translate-y-1/2 text-xl z-30 hover:scale-110 transition-transform"
               >
                 {showPassword ? "🙈" : "👁️"}
               </button>
             </div>
          </div>

          {error && (
            <p className="p-4 bg-red-400 text-gray-900 rounded-xl text-sm font-black border-4 border-gray-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] animate-in shake">
              ⚠️ {error}
            </p>
          )}

          <button 
            type="submit" 
            disabled={loading} 
            className="w-full bg-red-600 text-white p-5 rounded-xl font-black uppercase tracking-widest text-xl hover:shadow-none hover:translate-x-[6px] hover:translate-y-[6px] shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] border-4 border-gray-900 transition-all disabled:opacity-50 disabled:hover:translate-x-0 disabled:hover:translate-y-0 mt-4 relative z-20"
          >
            {loading ? 'Creazione in corso...' : 'Continua ✨'}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t-4 border-dashed border-gray-300 text-center relative z-20">
          <p className="text-gray-600 font-bold">
            Hai già un account?
          </p>
          <Link 
            href="/login" 
            className="inline-block mt-3 px-6 py-2 bg-yellow-300 text-gray-900 font-black uppercase tracking-widest border-4 border-gray-900 rounded-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[4px] hover:translate-y-[4px] transition-all"
          >
            Torna al Login 🔙
          </Link>
        </div>

      </div>
    </main>
  )
}