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
    <main className="relative flex min-h-screen items-center justify-center p-4 overflow-hidden bg-gradient-to-br from-amber-400 via-orange-400 to-rose-500">
      
      {/* --- PATTERN DI SFONDO --- */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0" style={{
          backgroundImage: `radial-gradient(circle at 2px 2px, white 1px, transparent 0)`,
          backgroundSize: '32px 32px'
        }}></div>
      </div>

      {/* --- INIEZIONE CSS ANIMAZIONI --- */}
      <style dangerouslySetInnerHTML={{__html: `
        /* ========================================
           ANIMAZIONI ORIGINALI
           ======================================== */
        
        /* 🚀 Spazio & Innovazione */
        @keyframes rocket-flight {
          0% { transform: translate(0, 0) rotate(45deg); }
          50% { transform: translate(60px, -60px) rotate(60deg); }
          100% { transform: translate(0, 0) rotate(45deg); }
        }
        @keyframes ufo-hover {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-15px) rotate(8deg); }
        }
        
        /* 🔨 Costruzione */
        @keyframes hammer-hit {
          0%, 100% { transform: rotate(-45deg); }
          10% { transform: rotate(10deg); } 
          20% { transform: rotate(-45deg); }
        }
        @keyframes wrench-turn {
          0%, 100% { transform: rotate(-20deg); }
          50% { transform: rotate(20deg); }
        }

        /* 💡 Creatività */
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

        /* 📊 Dati */
        @keyframes mag-zoom {
          0%, 100% { transform: scale(1) translate(0, 0); }
          50% { transform: scale(1.3) translate(10px, -10px); }
        }
        @keyframes bar-grow {
          0%, 20% { transform: scaleY(0.1); }
          80%, 100% { transform: scaleY(1); }
        }

        /* 🎯 Obiettivi */
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

        /* 💻 Tech */
        @keyframes bug-walk {
          0% { transform: translateX(0px); opacity: 1; }
          80% { transform: translateX(80px); opacity: 1; }
          100% { transform: translateX(100px); opacity: 0; }
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

        /* Decorativi */
        @keyframes twinkle {
          0%, 100% { opacity: 0.3; transform: scale(0.8); }
          50% { opacity: 1; transform: scale(1.2); }
        }
        @keyframes ripple {
          0% { transform: scale(0.5); opacity: 1; }
          100% { transform: scale(3); opacity: 0; }
        }
        @keyframes float-heart {
          0% { transform: translateY(0) scale(0.8); opacity: 0; }
          20% { opacity: 1; }
          100% { transform: translateY(-80px) scale(1.2); opacity: 0; }
        }
        @keyframes confetti-fall {
          0% { transform: translateY(-20px) rotate(0deg); opacity: 1; }
          100% { transform: translateY(100px) rotate(360deg); opacity: 0; }
        }

        /* ========================================
           ANIMAZIONI CORSI DI STUDIO
           ======================================== */
        
        /* 📖 LETTERE - Pagine che girano */
        @keyframes page-flip {
          0%, 100% { transform: rotateY(0deg); }
          50% { transform: rotateY(-30deg); }
        }
        
        /* ⏳ STORIA - Clessidra che gira */
        @keyframes hourglass-flip {
          0%, 45% { transform: rotate(0deg); }
          50%, 95% { transform: rotate(180deg); }
          100% { transform: rotate(360deg); }
        }
        
        /* 🗣️ LINGUE - Cambio testo */
        @keyframes lang-switch {
          0%, 20% { content: "Hi!"; }
          25%, 45% { content: "Ciao!"; }
          50%, 70% { content: "Hola!"; }
          75%, 95% { content: "你好!"; }
        }
        
        /* 🎭 TEATRO - Maschere alternate */
        @keyframes mask-switch {
          0%, 45% { opacity: 1; }
          50%, 95% { opacity: 0; }
        }
        @keyframes mask-switch-reverse {
          0%, 45% { opacity: 0; }
          50%, 95% { opacity: 1; }
        }
        
        /* ♪ MUSICA - Note che fluttuano */
        @keyframes music-float {
          0% { transform: translateY(0) rotate(0deg); }
          25% { transform: translateY(-15px) rotate(10deg); }
          50% { transform: translateY(-5px) rotate(-5deg); }
          75% { transform: translateY(-20px) rotate(5deg); }
          100% { transform: translateY(0) rotate(0deg); }
        }
        
        /* ⚖️ GIURISPRUDENZA - Bilancia oscillante */
        @keyframes balance-swing {
          0%, 100% { transform: rotate(-8deg); }
          50% { transform: rotate(8deg); }
        }
        
        /* 📈 ECONOMIA - Freccia che sale */
        @keyframes arrow-climb {
          0% { transform: translateY(20px) rotate(45deg); opacity: 0; }
          50% { transform: translateY(0) rotate(45deg); opacity: 1; }
          100% { transform: translateY(-20px) rotate(45deg); opacity: 0; }
        }
        
        /* ⚛️ FISICA - Elettroni orbitanti */
        @keyframes electron-orbit {
          0% { transform: rotate(0deg) translateX(20px) rotate(0deg); }
          100% { transform: rotate(360deg) translateX(20px) rotate(-360deg); }
        }
        
        /* 🧬 BIOLOGIA - DNA rotante */
        @keyframes dna-rotate {
          0% { transform: rotateY(0deg); }
          100% { transform: rotateY(360deg); }
        }
        
        /* ⚗️ CHIMICA - Bolle che salgono */
        @keyframes bubble-rise {
          0% { transform: translateY(0) scale(0.5); opacity: 0; }
          20% { opacity: 1; }
          100% { transform: translateY(-40px) scale(1); opacity: 0; }
        }
        
        /* 💊 MEDICINA - Battito cardiaco */
        @keyframes heartbeat {
          0%, 100% { transform: scale(1); }
          10% { transform: scale(1.15); }
          20% { transform: scale(1); }
          30% { transform: scale(1.1); }
          40% { transform: scale(1); }
        }
        
        /* 🧠 PSICOLOGIA - Onde cerebrali */
        @keyframes brain-wave {
          0%, 100% { transform: scaleX(1); }
          50% { transform: scaleX(1.5); }
        }
        
        /* 💉 INFERMIERISTICA - Siringa */
        @keyframes syringe-push {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(5px); }
        }
        
        /* 🏗️ ING. CIVILE - Gru che solleva */
        @keyframes crane-lift {
          0%, 100% { transform: rotate(0deg); }
          50% { transform: rotate(-15deg); }
        }
        
        /* ⚙️ ING. MECCANICA - Ingranaggi */
        @keyframes gear-rotate {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes gear-rotate-reverse {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(-360deg); }
        }
        
        /* ⚡ ING. ELETTRONICA - Corrente */
        @keyframes current-flow {
          0% { background-position: 0% 50%; }
          100% { background-position: 100% 50%; }
        }
        
        /* ✈️ ING. AEROSPAZIALE - Decollo */
        @keyframes takeoff {
          0% { transform: translate(0, 0) rotate(-45deg); }
          100% { transform: translate(100px, -100px) rotate(-45deg); opacity: 0; }
        }
        
        /* 🏛️ ARCHITETTURA - Linee che si disegnano */
        @keyframes draw-line {
          0% { width: 0; }
          100% { width: 100%; }
        }
        
        /* 💻 INFORMATICA - Cursore lampeggiante */
        @keyframes cursor-blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
        
        /* 🤖 AI/ML - Neuroni che si connettono */
        @keyframes neuron-pulse {
          0%, 100% { opacity: 0.3; transform: scale(0.8); }
          50% { opacity: 1; transform: scale(1); }
        }
        
        /* 🎮 GAME DEV - Personaggio che salta */
        @keyframes pixel-jump {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-20px); }
        }
        
        /* 🌐 WEB DEV - Tag che appaiono */
        @keyframes tag-appear {
          0% { opacity: 0; transform: scale(0.5); }
          50% { opacity: 1; transform: scale(1.1); }
          100% { opacity: 1; transform: scale(1); }
        }
        
        /* 👨‍🏫 FORMAZIONE - Scrittura lavagna */
        @keyframes chalk-write {
          0% { width: 0; }
          100% { width: 40px; }
        }
        
        /* 🤝 SERVIZIO SOCIALE - Mani che si stringono */
        @keyframes handshake {
          0%, 100% { transform: rotate(0deg); }
          25% { transform: rotate(-10deg); }
          75% { transform: rotate(10deg); }
        }
        
        /* 📣 COMUNICAZIONE - Onde sonore */
        @keyframes sound-wave {
          0% { transform: scale(0.5); opacity: 1; }
          100% { transform: scale(2); opacity: 0; }
        }
        
        /* 🚜 AGRARIA - Trattore che si muove */
        @keyframes tractor-move {
          0%, 100% { transform: translateX(0); }
          50% { transform: translateX(30px); }
        }
        
        /* 🍇 ENOLOGIA - Vino che si versa */
        @keyframes wine-pour {
          0% { height: 0; }
          100% { height: 20px; }
        }
        
        /* ♻️ SCIENZE AMBIENTALI - Frecce riciclo */
        @keyframes recycle-spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        /* 🏃 SCIENZE MOTORIE - Corsa */
        @keyframes running {
          0%, 100% { transform: translateX(0) scaleX(1); }
          25% { transform: translateX(10px) scaleX(0.9); }
          50% { transform: translateX(20px) scaleX(1); }
          75% { transform: translateX(10px) scaleX(0.9); }
        }
        
        /* ⏱️ SPORT MANAGEMENT - Cronometro */
        @keyframes timer-tick {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        /* 👗 MODA - Forbici che tagliano */
        @keyframes scissors-cut {
          0%, 100% { transform: rotate(0deg); }
          50% { transform: rotate(-20deg); }
        }
        
        /* 🎨 GRAPHIC DESIGN - Forma che appare */
        @keyframes shape-morph {
          0%, 100% { border-radius: 50%; transform: rotate(0deg); }
          50% { border-radius: 10%; transform: rotate(180deg); }
        }
        
        /* 🗺️ TURISMO - Aereo che vola */
        @keyframes plane-fly {
          0% { transform: translate(-50px, 20px) rotate(-15deg); opacity: 0; }
          50% { opacity: 1; }
          100% { transform: translate(50px, -20px) rotate(-15deg); opacity: 0; }
        }
        
        /* 🧭 GEOGRAFIA - Bussola */
        @keyframes compass-needle {
          0%, 100% { transform: rotate(-30deg); }
          50% { transform: rotate(30deg); }
        }

        /* ========================================
           CLASSI UTILITY
           ======================================== */
        
        .anim-rocket { animation: rocket-flight 6s ease-in-out infinite; }
        .anim-ufo { animation: ufo-hover 4s ease-in-out infinite; }
        .anim-hammer { animation: hammer-hit 2s infinite; transform-origin: bottom right; }
        .anim-wrench { animation: wrench-turn 3s ease-in-out infinite; }
        .anim-float-idea { animation: float-up-fade 4s ease-in infinite; }
        .anim-pencil { animation: pencil-draw 3s ease-in-out infinite; }
        .anim-zoom { animation: mag-zoom 4s ease-in-out infinite; }
        .anim-arrow { animation: arrow-hit 3s infinite; }
        .anim-flag { animation: wave-flag 2s ease-in-out infinite; transform-origin: bottom left; }
        .anim-pendulum { animation: pendulum 2.5s ease-in-out infinite alternate; transform-origin: top center; }
        .anim-bug { animation: bug-walk 5s linear infinite; }
        .anim-steam { animation: steam-rise 3s ease-out infinite; }
        .anim-code { animation: code-scroll 3s linear infinite; }
        .anim-heart { animation: float-heart 4s ease-in infinite; }
        .anim-confetti { animation: confetti-fall 4s linear infinite; }
        
        .anim-twinkle-1 { animation: twinkle 3s infinite; }
        .anim-twinkle-2 { animation: twinkle 4s infinite 1s; }
        .anim-twinkle-3 { animation: twinkle 2.5s infinite 0.5s; }
        
        /* Corsi */
        .anim-page-flip { animation: page-flip 3s ease-in-out infinite; }
        .anim-hourglass { animation: hourglass-flip 6s ease-in-out infinite; }
        .anim-music { animation: music-float 3s ease-in-out infinite; }
        .anim-balance { animation: balance-swing 3s ease-in-out infinite; transform-origin: top center; }
        .anim-climb { animation: arrow-climb 2s ease-out infinite; }
        .anim-electron { animation: electron-orbit 2s linear infinite; }
        .anim-dna { animation: dna-rotate 4s linear infinite; }
        .anim-bubble { animation: bubble-rise 2s ease-out infinite; }
        .anim-heartbeat { animation: heartbeat 1.5s ease-in-out infinite; }
        .anim-brain { animation: brain-wave 2s ease-in-out infinite; }
        .anim-crane { animation: crane-lift 4s ease-in-out infinite; transform-origin: bottom center; }
        .anim-gear { animation: gear-rotate 4s linear infinite; }
        .anim-gear-rev { animation: gear-rotate-reverse 4s linear infinite; }
        .anim-takeoff { animation: takeoff 4s ease-in infinite; }
        .anim-cursor { animation: cursor-blink 1s step-end infinite; }
        .anim-neuron { animation: neuron-pulse 2s ease-in-out infinite; }
        .anim-jump { animation: pixel-jump 1s ease-in-out infinite; }
        .anim-handshake { animation: handshake 2s ease-in-out infinite; }
        .anim-wave { animation: sound-wave 1.5s ease-out infinite; }
        .anim-tractor { animation: tractor-move 4s ease-in-out infinite; }
        .anim-recycle { animation: recycle-spin 6s linear infinite; }
        .anim-run { animation: running 1s ease-in-out infinite; }
        .anim-scissors { animation: scissors-cut 1.5s ease-in-out infinite; }
        .anim-morph { animation: shape-morph 4s ease-in-out infinite; }
        .anim-plane { animation: plane-fly 5s ease-in-out infinite; }
        .anim-compass { animation: compass-needle 3s ease-in-out infinite; transform-origin: center bottom; }
        .anim-syringe { animation: syringe-push 2s ease-in-out infinite; }
      `}} />

      {/* --- SFONDO DOODLE ANIMATO CON TUTTI I CORSI --- */}
      <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden select-none">
        
        {/* ============================================
            AREA TOP-LEFT (UMANISTICA + SPAZIO)
            ============================================ */}
        
        {/* Razzo */}
        <div className="absolute top-[5%] left-[5%] text-4xl anim-rocket drop-shadow-lg">🚀</div>
        
        {/* LETTERE - Libro con pagine */}
        <div className="absolute top-[8%] left-[15%] text-5xl anim-page-flip drop-shadow-md" style={{transformStyle: 'preserve-3d'}}>📖</div>
        
        {/* FILOSOFIA - Pensatore */}
        <div className="absolute top-[18%] left-[8%] relative">
          <div className="text-4xl">🤔</div>
          <div className="absolute -top-3 -right-2 text-2xl anim-float-idea">❓</div>
        </div>
        
        {/* STORIA - Clessidra */}
        <div className="absolute top-[15%] left-[22%] text-4xl anim-hourglass">⏳</div>
        
        {/* MUSICA - Note fluttuanti */}
        <div className="absolute top-[25%] left-[5%] flex gap-2">
          <div className="text-3xl anim-music">♪</div>
          <div className="text-2xl anim-music" style={{animationDelay: '0.3s'}}>♫</div>
          <div className="text-3xl anim-music" style={{animationDelay: '0.6s'}}>♬</div>
        </div>
        
        {/* TEATRO - Maschere */}
        <div className="absolute top-[28%] left-[18%] relative w-12 h-12">
          <div className="absolute text-4xl" style={{animation: 'mask-switch 4s infinite'}}>😀</div>
          <div className="absolute text-4xl" style={{animation: 'mask-switch-reverse 4s infinite'}}>😢</div>
        </div>
        
        {/* ARTE - Tavolozza */}
        <div className="absolute top-[12%] left-[28%] text-4xl animate-pulse">🎨</div>
        
        {/* Stelle decorative */}
        <div className="absolute top-[3%] left-[12%] text-xl anim-twinkle-1 text-white">✨</div>
        <div className="absolute top-[22%] left-[25%] text-lg anim-twinkle-2 text-white">⭐</div>


        {/* ============================================
            AREA TOP-RIGHT (COSTRUZIONE + INGEGNERIA)
            ============================================ */}
        
        {/* Martello e chiodo */}
        <div className="absolute top-[5%] right-[10%] flex flex-col items-center">
          <div className="text-4xl anim-hammer z-10">🔨</div>
          <div className="text-2xl -mt-2">🔩</div>
        </div>
        
        {/* ING. MECCANICA - Ingranaggi */}
        <div className="absolute top-[12%] right-[22%] flex">
          <div className="text-4xl anim-gear">⚙️</div>
          <div className="text-3xl anim-gear-rev -ml-3 mt-3">⚙️</div>
          <div className="text-2xl anim-gear -ml-2 -mt-1">⚙️</div>
        </div>
        
        {/* ING. CIVILE - Gru */}
        <div className="absolute top-[8%] right-[35%] text-5xl anim-crane">🏗️</div>
        
        {/* ING. AEROSPAZIALE - Shuttle */}
        <div className="absolute top-[20%] right-[8%] text-4xl anim-takeoff">🛫</div>
        
        {/* ARCHITETTURA - Righello e matita */}
        <div className="absolute top-[25%] right-[18%] flex items-center gap-1">
          <div className="text-3xl">📐</div>
          <div className="text-3xl anim-pencil">✏️</div>
        </div>
        
        {/* Chiave inglese */}
        <div className="absolute top-[18%] right-[30%] text-4xl anim-wrench">🔧</div>
        
        {/* Stella */}
        <div className="absolute top-[5%] right-[25%] text-lg anim-twinkle-3 text-white">⭐</div>


        {/* ============================================
            AREA CENTER-LEFT (CREATIVITÀ + EDUCAZIONE)
            ============================================ */}
        
        {/* Lampadina idea */}
        <div className="absolute top-[38%] left-[5%] text-5xl animate-pulse drop-shadow-[0_0_20px_rgba(253,224,71,0.8)]">💡</div>
        
        {/* FORMAZIONE - Lavagna */}
        <div className="absolute top-[45%] left-[15%] relative">
          <div className="text-4xl">📝</div>
          <div className="absolute top-1 left-3 w-0 h-0.5 bg-white" style={{animation: 'chalk-write 2s ease-out infinite'}}></div>
        </div>
        
        {/* SERVIZIO SOCIALE - Mani */}
        <div className="absolute top-[52%] left-[8%] text-4xl anim-handshake">🤝</div>
        
        {/* COMUNICAZIONE - Megafono con onde */}
        <div className="absolute top-[60%] left-[5%] relative">
          <div className="text-4xl">📣</div>
          <div className="absolute top-1 -right-4 w-4 h-4 border-2 border-white/60 rounded-full anim-wave"></div>
          <div className="absolute top-0 -right-6 w-6 h-6 border-2 border-white/40 rounded-full anim-wave" style={{animationDelay: '0.3s'}}></div>
        </div>
        
        {/* Nuvoletta pensiero */}
        <div className="absolute top-[42%] left-[22%] text-3xl anim-float-idea">💭</div>
        
        {/* SOCIOLOGIA - Rete persone */}
        <div className="absolute top-[68%] left-[12%] flex items-center gap-1 opacity-80">
          <div className="text-2xl anim-neuron">👤</div>
          <div className="w-4 h-0.5 bg-white/60"></div>
          <div className="text-2xl anim-neuron" style={{animationDelay: '0.5s'}}>👤</div>
          <div className="w-4 h-0.5 bg-white/60"></div>
          <div className="text-2xl anim-neuron" style={{animationDelay: '1s'}}>👤</div>
        </div>


        {/* ============================================
            AREA CENTER-RIGHT (SCIENZE + MEDICINA)
            ============================================ */}
        
        {/* FISICA - Atomo con elettroni */}
        <div className="absolute top-[38%] right-[8%] relative w-16 h-16">
          <div className="absolute inset-0 flex items-center justify-center text-3xl">⚛️</div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-2 h-2 bg-blue-400 rounded-full anim-electron"></div>
          </div>
          <div className="absolute inset-0 flex items-center justify-center" style={{transform: 'rotate(60deg)'}}>
            <div className="w-2 h-2 bg-red-400 rounded-full anim-electron" style={{animationDelay: '0.7s'}}></div>
          </div>
        </div>
        
        {/* CHIMICA - Provetta con bolle */}
        <div className="absolute top-[45%] right-[20%] relative">
          <div className="text-4xl">🧪</div>
          <div className="absolute -top-2 left-2 text-lg anim-bubble">○</div>
          <div className="absolute -top-4 left-4 text-sm anim-bubble" style={{animationDelay: '0.5s'}}>○</div>
          <div className="absolute -top-1 left-5 text-xs anim-bubble" style={{animationDelay: '1s'}}>○</div>
        </div>
        
        {/* BIOLOGIA - DNA */}
        <div className="absolute top-[52%] right-[10%] text-4xl anim-dna" style={{transformStyle: 'preserve-3d'}}>🧬</div>
        
        {/* MEDICINA - Cuore che batte */}
        <div className="absolute top-[58%] right-[22%] relative">
          <div className="text-4xl anim-heartbeat text-red-500 drop-shadow-md">❤️</div>
          <div className="absolute -top-1 -right-3 text-2xl">🩺</div>
        </div>
        
        {/* PSICOLOGIA - Cervello */}
        <div className="absolute top-[65%] right-[8%] relative">
          <div className="text-4xl">🧠</div>
          <div className="absolute top-0 -right-3 w-8 h-1 bg-gradient-to-r from-purple-400 to-transparent anim-brain origin-left"></div>
          <div className="absolute top-2 -right-3 w-6 h-1 bg-gradient-to-r from-blue-400 to-transparent anim-brain origin-left" style={{animationDelay: '0.5s'}}></div>
        </div>
        
        {/* INFERMIERISTICA - Siringa */}
        <div className="absolute top-[72%] right-[18%] text-3xl anim-syringe">💉</div>
        
        {/* MATEMATICA - Simboli */}
        <div className="absolute top-[40%] right-[32%] text-2xl font-black text-white/80 animate-pulse">∑</div>
        <div className="absolute top-[48%] right-[28%] text-xl font-black text-white/60 animate-pulse" style={{animationDelay: '0.5s'}}>∫</div>
        <div className="absolute top-[55%] right-[35%] text-2xl font-black text-white/70 animate-pulse" style={{animationDelay: '1s'}}>π</div>


        {/* ============================================
            AREA BOTTOM-LEFT (OBIETTIVI + AGRARIA + SPORT)
            ============================================ */}
        
        {/* Bersaglio con freccia */}
        <div className="absolute bottom-[25%] left-[5%] relative">
          <div className="text-5xl">🎯</div>
          <div className="text-3xl absolute -bottom-1 -left-3 anim-arrow">🏹</div>
        </div>
        
        {/* Trofeo con shine */}
        <div className="absolute bottom-[12%] left-[15%] relative overflow-hidden w-14 h-14 flex items-center justify-center">
          <div className="text-5xl drop-shadow-[0_0_15px_rgba(251,191,36,0.6)]">🏆</div>
          <div className="absolute top-0 w-3 h-full bg-white/50 skew-x-[20deg] mix-blend-overlay" style={{animation: 'shine-slide 3s infinite'}}></div>
        </div>
        
        {/* SCIENZE MOTORIE - Persona che corre */}
        <div className="absolute bottom-[5%] left-[5%] text-4xl anim-run">🏃</div>
        
        {/* AGRARIA - Trattore */}
        <div className="absolute bottom-[18%] left-[25%] text-4xl anim-tractor">🚜</div>
        
        {/* ENOLOGIA - Uva e vino */}
        <div className="absolute bottom-[8%] left-[28%] flex items-end gap-1">
          <div className="text-3xl">🍇</div>
          <div className="relative">
            <div className="text-3xl">🍷</div>
          </div>
        </div>
        
        {/* SCIENZE AMBIENTALI - Riciclo */}
        <div className="absolute bottom-[25%] left-[35%] text-4xl anim-recycle text-green-400">♻️</div>
        
        {/* Bandiera */}
        <div className="absolute bottom-[30%] left-[18%] text-4xl anim-flag">🚩</div>
        
        {/* Medaglia pendolo */}
        <div className="absolute bottom-[35%] left-[8%] text-4xl anim-pendulum">🏅</div>


        {/* ============================================
            AREA BOTTOM-RIGHT (TECH + DESIGN + TURISMO)
            ============================================ */}
        
        {/* INFORMATICA - Laptop con codice */}
        <div className="absolute bottom-[20%] right-[8%] relative">
          <div className="text-5xl">💻</div>
          <div className="absolute top-1.5 left-3.5 flex items-center">
            <div className="text-xs font-mono text-green-400 anim-code">{'</>'}</div>
            <div className="w-0.5 h-3 bg-green-400 ml-0.5 anim-cursor"></div>
          </div>
        </div>
        
        {/* AI/ML - Rete neurale */}
        <div className="absolute bottom-[28%] right-[20%] flex items-center gap-1">
          <div className="w-3 h-3 bg-purple-400 rounded-full anim-neuron"></div>
          <div className="w-6 h-0.5 bg-white/50"></div>
          <div className="w-3 h-3 bg-blue-400 rounded-full anim-neuron" style={{animationDelay: '0.3s'}}></div>
          <div className="w-6 h-0.5 bg-white/50"></div>
          <div className="w-3 h-3 bg-green-400 rounded-full anim-neuron" style={{animationDelay: '0.6s'}}></div>
        </div>
        
        {/* GAME DEV - Personaggio pixel */}
        <div className="absolute bottom-[35%] right-[10%] relative">
          <div className="text-3xl anim-jump">👾</div>
          <div className="absolute -top-4 left-3 text-xl" style={{animation: 'twinkle 1s infinite'}}>⭐</div>
        </div>
        
        {/* Bug che cammina */}
        <div className="absolute bottom-[8%] right-[25%] text-3xl anim-bug">🐛</div>
        
        {/* Caffè con vapore */}
        <div className="absolute bottom-[5%] right-[8%] relative">
          <div className="text-4xl">☕</div>
          <div className="absolute -top-4 left-3 text-xl anim-steam text-white/60">♨️</div>
        </div>
        
        {/* MODA - Forbici */}
        <div className="absolute bottom-[15%] right-[35%] text-3xl anim-scissors">✂️</div>
        
        {/* GRAPHIC DESIGN - Forma che muta */}
        <div className="absolute bottom-[25%] right-[30%] w-8 h-8 bg-gradient-to-br from-pink-400 to-purple-500 anim-morph"></div>
        
        {/* TURISMO - Aereo */}
        <div className="absolute bottom-[32%] right-[40%] text-3xl anim-plane">✈️</div>
        
        {/* GEOGRAFIA - Bussola */}
        <div className="absolute bottom-[10%] right-[42%] relative w-10 h-10">
          <div className="text-4xl">🧭</div>
        </div>
        
        {/* Brackets */}
        <div className="absolute bottom-[28%] right-[5%] text-3xl text-green-400 font-black animate-pulse">{"{ }"}</div>


        {/* ============================================
            ELEMENTI DECORATIVI SPARSI
            ============================================ */}
        
        {/* Centro - GIURISPRUDENZA - Bilancia */}
        <div className="absolute top-[32%] left-[38%] text-5xl anim-balance">⚖️</div>
        
        {/* ECONOMIA - Grafico */}
        <div className="absolute top-[70%] left-[42%] flex items-end gap-1 h-10 opacity-80">
          <div className="w-2 bg-green-400 origin-bottom" style={{height: '40%', animation: 'bar-grow 2s infinite'}}></div>
          <div className="w-2 bg-green-400 origin-bottom" style={{height: '70%', animation: 'bar-grow 2s infinite 0.2s'}}></div>
          <div className="w-2 bg-green-400 origin-bottom" style={{height: '50%', animation: 'bar-grow 2s infinite 0.4s'}}></div>
          <div className="w-2 bg-green-400 origin-bottom" style={{height: '90%', animation: 'bar-grow 2s infinite 0.6s'}}></div>
          <div className="text-2xl anim-climb ml-1">📈</div>
        </div>
        
        {/* Lente zoom */}
        <div className="absolute bottom-[45%] right-[45%] text-4xl anim-zoom">🔍</div>
        
        {/* Cuori che salgono */}
        <div className="absolute bottom-[50%] left-[48%] text-2xl anim-heart text-red-400">❤️</div>
        <div className="absolute bottom-[55%] right-[48%] text-xl anim-heart text-pink-400" style={{animationDelay: '2s'}}>💕</div>
        
        {/* Coriandoli */}
        <div className="absolute top-[8%] left-[45%] text-2xl anim-confetti">🎊</div>
        <div className="absolute top-[5%] right-[48%] text-xl anim-confetti" style={{animationDelay: '1.5s'}}>🎉</div>
        
        {/* Stelle sparse */}
        <div className="absolute top-[50%] left-[30%] text-xl anim-twinkle-1 text-white">✨</div>
        <div className="absolute bottom-[40%] right-[35%] text-lg anim-twinkle-2 text-white">⭐</div>
        <div className="absolute top-[75%] left-[55%] text-xl anim-twinkle-3 text-white">✨</div>
        
        {/* Cerchi ripple */}
        <div className="absolute top-[60%] left-[50%] w-4 h-4 border-2 border-white/40 rounded-full" style={{animation: 'ripple 3s infinite'}}></div>
        
        {/* Simboli + e x rotanti */}
        <div className="absolute top-[35%] right-[50%] text-2xl text-white/50 font-black animate-[spin_8s_linear_infinite]">+</div>
        <div className="absolute bottom-[60%] left-[55%] text-xl text-white/40 font-black animate-[spin_6s_linear_reverse_infinite]">×</div>
        
        {/* UFO */}
        <div className="absolute top-[80%] right-[55%] text-3xl anim-ufo">🛸</div>
        
        {/* Pianeta */}
        <div className="absolute bottom-[70%] left-[60%] text-4xl animate-[spin_30s_linear_infinite]">🪐</div>

      </div>
      {/* --- FINE SFONDO DOODLE --- */}

      {/* --- FINESTRA DI LOGIN --- */}
      <div className="relative z-10 w-full max-w-md bg-white p-8 sm:p-10 rounded-3xl border-4 border-gray-900 shadow-[12px_12px_0px_0px_rgba(0,0,0,0.3)]">
        
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
            <div className="p-4 bg-red-400 border-4 border-gray-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] text-gray-900 font-bold rounded-xl text-sm">
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
                required
              />
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl transition-transform group-focus-within:scale-110">📧</span>
            </div>

            {/* Input Password */}
            <div className="relative group">
              <input
                type="password"
                placeholder="La tua password"
                className="w-full p-4 pl-12 border-4 border-gray-900 rounded-xl focus:outline-none focus:translate-x-[4px] focus:translate-y-[4px] focus:shadow-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] text-gray-900 font-black placeholder:text-gray-500 placeholder:font-bold bg-white transition-all text-lg"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl transition-transform group-focus-within:scale-110">🔑</span>
            </div>
          </div>

          <button
            disabled={loading}
            className="w-full bg-gray-900 text-white p-4 rounded-xl font-black text-xl uppercase tracking-widest border-4 border-gray-900 shadow-[6px_6px_0px_0px_rgba(220,38,38,1)] hover:shadow-none hover:translate-x-[6px] hover:translate-y-[6px] transition-all disabled:opacity-50 mt-4"
          >
            {loading ? 'Caricamento...' : 'Entra 🚀'}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t-4 border-dashed border-gray-300 text-center">
          <p className="text-gray-600 font-bold">
            Non hai ancora un account?
          </p>
          <Link 
            href="/register" 
            className="inline-block mt-3 px-6 py-2 bg-amber-400 text-gray-900 font-black uppercase tracking-widest border-4 border-gray-900 rounded-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[4px] hover:translate-y-[4px] transition-all"
          >
            Registrati Ora ✨
          </Link>
        </div>
      </div>
    </main>
  )
}