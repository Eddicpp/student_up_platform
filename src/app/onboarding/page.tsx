'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

type SessoType = 'M' | 'F' | 'altro' | 'non_specificato';

export default function OnboardingPage() {
  // Stati aggiunti: Nome e Cognome
  const [nome, setNome] = useState('')
  const [cognome, setCognome] = useState('')
  
  // STATI PER IL CORSO MODIFICATI
  const [listaCorsi, setListaCorsi] = useState<any[]>([])
  const [corsoSelezionato, setCorsoSelezionato] = useState('')
  const [corsoAltro, setCorsoAltro] = useState('')
  const [sesso, setSesso] = useState<SessoType>('non_specificato')
  const [dataNascita, setDataNascita] = useState('')
  
  const [annoInizio, setAnnoInizio] = useState('')
  const [annoFine, setAnnoFine] = useState('')
  const [voto, setVoto] = useState('')

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const router = useRouter()
  const supabase = createClient()

  // FETCH CORSI ALL'AVVIO
  useEffect(() => {
    const fetchCorsi = async () => {
      // CORREZIONE: Usiamo 'corso_di_studi' al posto di 'corso'
      const { data } = await supabase.from('corso_di_studi').select('*').order('nome', { ascending: true })
      if (data) setListaCorsi(data)
    }
    fetchCorsi()
  }, [supabase])

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

    // CONTROLLI EXTRA
    if (!corsoSelezionato) {
      setError("Seleziona un corso di laurea.")
      setLoading(false)
      return
    }
    if (corsoSelezionato === 'altro' && !corsoAltro.trim()) {
      setError("Specifica il nome del corso di laurea.")
      setLoading(false)
      return
    }

    try {
      // 1. Usiamo UPSERT invece di UPDATE
      // Questo crea la riga se manca, o la aggiorna se esiste già.
      // Risolve l'errore di Foreign Key per le tabelle collegate.
      const { error: studentError } = await supabase
        .from('studente')
        .upsert({
          id: user.id,
          email: user.email!, // Il '!' dice a TS: "Tranquillo, l'email c'è"
          nome: nome.trim(),
          cognome: cognome.trim(),
          data_nascita: dataNascita || null,
          sesso: sesso
        } as any, { onConflict: 'id' })
  
      if (studentError) throw studentError

      // 2. Ora che siamo SICURI che lo studente esiste nel DB, 
      // possiamo inserire la richiesta del corso senza errori di Foreign Key
      if (corsoSelezionato === 'altro') {
        const { error: richiestaError } = await (supabase as any)
          .from('richiesta_nuovo_corso')
          .insert({ 
            nome_corso: corsoAltro.trim(), 
            studente_id: user.id 
          })
          
        if (richiestaError) throw richiestaError;
        alert("Richiesta per il nuovo corso inviata agli Admin! Verrai assegnato appena approvato. 🚀");
      } else {
        const { error: corsoInsertError } = await supabase
          .from('studente_corso')
          .upsert({
            studente_id: user.id,
            corso_id: corsoSelezionato, 
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

  // Classi standardizzate per gli input in stile cartoon
  const inputClass = "w-full p-3 sm:p-4 border-4 border-gray-900 rounded-xl focus:outline-none focus:translate-x-[4px] focus:translate-y-[4px] focus:shadow-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] text-gray-900 font-black placeholder:text-gray-500 placeholder:font-bold bg-white transition-all text-sm sm:text-base"
  const labelClass = "block text-[10px] sm:text-xs font-black uppercase tracking-widest text-gray-900 mb-1"

  return (
    <main className="relative flex min-h-screen items-center justify-center p-4 overflow-hidden bg-gradient-to-br from-amber-400 via-orange-500 to-rose-500">
      
      {/* --- PATTERN DI SFONDO --- */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0" style={{
          backgroundImage: `radial-gradient(circle at 2px 2px, white 1px, transparent 0)`,
          backgroundSize: '32px 32px'
        }}></div>
      </div>

      {/* --- MEGA CSS ANIMAZIONI --- */}
      <style dangerouslySetInnerHTML={{__html: `
        /* ========================================
           ANIMAZIONI BASE
           ======================================== */
        
        @keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }
        @keyframes float-reverse { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(10px); } }
        @keyframes wiggle { 0%, 100% { transform: rotate(-5deg); } 50% { transform: rotate(5deg); } }
        @keyframes bounce-soft { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }
        @keyframes spin-slow { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        @keyframes spin-reverse { 0% { transform: rotate(0deg); } 100% { transform: rotate(-360deg); } }
        @keyframes pulse-grow { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.15); } }
        @keyframes shake { 0%, 100% { transform: translateX(0); } 25% { transform: translateX(-3px); } 75% { transform: translateX(3px); } }
        @keyframes swing { 0%, 100% { transform: rotate(-15deg); } 50% { transform: rotate(15deg); } }
        @keyframes pop { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.2); } }
        @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
        @keyframes slide-x { 0%, 100% { transform: translateX(0); } 50% { transform: translateX(15px); } }
        @keyframes slide-y { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(15px); } }
        
        /* ========================================
           ANIMAZIONI SPECIFICHE
           ======================================== */
        
        @keyframes rocket-flight { 0% { transform: translate(0, 0) rotate(45deg); } 50% { transform: translate(40px, -40px) rotate(55deg); } 100% { transform: translate(0, 0) rotate(45deg); } }
        @keyframes ufo-hover { 0%, 100% { transform: translateY(0) rotate(0deg); } 50% { transform: translateY(-12px) rotate(5deg); } }
        @keyframes orbit { 0% { transform: rotate(0deg) translateX(15px) rotate(0deg); } 100% { transform: rotate(360deg) translateX(15px) rotate(-360deg); } }
        
        @keyframes hammer-hit { 0%, 100% { transform: rotate(-45deg); } 15% { transform: rotate(5deg); } 30% { transform: rotate(-45deg); } }
        @keyframes gear-rotate { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        @keyframes gear-reverse { 0% { transform: rotate(0deg); } 100% { transform: rotate(-360deg); } }
        @keyframes crane-lift { 0%, 100% { transform: rotate(0deg); } 50% { transform: rotate(-10deg); } }
        @keyframes wrench-turn { 0%, 100% { transform: rotate(-15deg); } 50% { transform: rotate(15deg); } }
        
        @keyframes bulb-glow { 0%, 100% { filter: drop-shadow(0 0 8px rgba(253,224,71,0.5)); } 50% { filter: drop-shadow(0 0 20px rgba(253,224,71,0.9)); } }
        @keyframes idea-float { 0% { transform: translateY(15px); opacity: 0; } 30% { opacity: 1; } 100% { transform: translateY(-25px); opacity: 0; } }
        @keyframes pencil-write { 0%, 100% { transform: translateX(0) rotate(-45deg); } 50% { transform: translateX(25px) rotate(-40deg); } }
        @keyframes brush-stroke { 0%, 100% { transform: rotate(0deg); } 50% { transform: rotate(-25deg) translateX(8px); } }
        
        @keyframes bubble { 0% { transform: translateY(0) scale(0.5); opacity: 0; } 30% { opacity: 1; } 100% { transform: translateY(-30px) scale(1); opacity: 0; } }
        @keyframes dna-spin { 0% { transform: rotateY(0deg); } 100% { transform: rotateY(360deg); } }
        @keyframes atom-pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.1); } }
        @keyframes microscope-focus { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-5px); } }
        @keyframes thermometer { 0%, 100% { height: 30%; } 50% { height: 80%; } }
        
        @keyframes heartbeat { 0%, 100% { transform: scale(1); } 10% { transform: scale(1.15); } 20% { transform: scale(1); } 30% { transform: scale(1.1); } }
        @keyframes brain-wave { 0%, 100% { transform: scaleX(1); } 50% { transform: scaleX(1.3); } }
        @keyframes syringe { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(4px); } }
        @keyframes pill-bounce { 0%, 100% { transform: translateY(0) rotate(0deg); } 50% { transform: translateY(-10px) rotate(180deg); } }
        
        @keyframes cursor-blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }
        @keyframes code-type { 0% { width: 0; } 50% { width: 100%; } 100% { width: 0; } }
        @keyframes bug-crawl { 0% { transform: translateX(0); } 100% { transform: translateX(60px); opacity: 0; } }
        @keyframes data-flow { 0% { transform: translateY(10px); opacity: 0; } 50% { opacity: 1; } 100% { transform: translateY(-10px); opacity: 0; } }
        @keyframes pixel-jump { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-15px); } }
        @keyframes loading-spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        @keyframes wifi-pulse { 0%, 100% { opacity: 0.3; transform: scale(0.8); } 50% { opacity: 1; transform: scale(1); } }
        @keyframes battery-charge { 0% { width: 20%; } 50% { width: 100%; } 100% { width: 20%; } }
        
        @keyframes ball-bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-20px); } }
        @keyframes ball-roll { 0% { transform: translateX(0) rotate(0deg); } 100% { transform: translateX(30px) rotate(360deg); } }
        @keyframes run-cycle { 0%, 100% { transform: translateX(0); } 50% { transform: translateX(20px); } }
        @keyframes swim { 0%, 100% { transform: translateX(0) rotate(-5deg); } 50% { transform: translateX(15px) rotate(5deg); } }
        @keyframes bike-pedal { 0%, 100% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        @keyframes yoga-breathe { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.05); } }
        
        @keyframes music-bounce { 0%, 100% { transform: translateY(0) rotate(-5deg); } 50% { transform: translateY(-12px) rotate(5deg); } }
        @keyframes guitar-strum { 0%, 100% { transform: rotate(-3deg); } 50% { transform: rotate(3deg); } }
        @keyframes drum-hit { 0%, 90% { transform: rotate(0deg); } 95% { transform: rotate(-20deg); } }
        @keyframes piano-key { 0%, 100% { transform: scaleY(1); } 50% { transform: scaleY(0.95); } }
        @keyframes vinyl-spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        
        @keyframes wave { 0%, 100% { transform: translateX(0) scaleY(1); } 50% { transform: translateX(10px) scaleY(0.8); } }
        @keyframes flame { 0%, 100% { transform: scaleY(1) scaleX(1); } 50% { transform: scaleY(1.2) scaleX(0.9); } }
        @keyframes leaf-fall { 0% { transform: translateY(-20px) rotate(0deg); opacity: 0; } 50% { opacity: 1; } 100% { transform: translateY(30px) rotate(180deg); opacity: 0; } }
        @keyframes sun-ray { 0%, 100% { transform: scale(1); opacity: 0.8; } 50% { transform: scale(1.1); opacity: 1; } }
        @keyframes cloud-float { 0%, 100% { transform: translateX(0); } 50% { transform: translateX(20px); } }
        @keyframes rain-drop { 0% { transform: translateY(-10px); opacity: 0; } 50% { opacity: 1; } 100% { transform: translateY(20px); opacity: 0; } }
        @keyframes tree-sway { 0%, 100% { transform: rotate(-2deg); } 50% { transform: rotate(2deg); } }
        @keyframes flower-bloom { 0%, 100% { transform: scale(0.9); } 50% { transform: scale(1.1); } }
        @keyframes recycle-spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        
        @keyframes chart-grow { 0% { transform: scaleY(0.2); } 100% { transform: scaleY(1); } }
        @keyframes coin-flip { 0%, 100% { transform: rotateY(0deg); } 50% { transform: rotateY(180deg); } }
        @keyframes briefcase-shake { 0%, 100% { transform: rotate(0deg); } 25% { transform: rotate(-5deg); } 75% { transform: rotate(5deg); } }
        @keyframes arrow-up { 0% { transform: translateY(10px); opacity: 0; } 50% { opacity: 1; } 100% { transform: translateY(-10px); opacity: 0; } }
        
        @keyframes bell-ring { 0%, 100% { transform: rotate(0deg); } 25% { transform: rotate(15deg); } 75% { transform: rotate(-15deg); } }
        @keyframes magnet-pull { 0%, 100% { transform: translateX(0); } 50% { transform: translateX(5px); } }
        @keyframes compass-spin { 0%, 100% { transform: rotate(-20deg); } 50% { transform: rotate(20deg); } }
        @keyframes hourglass-flip { 0%, 45% { transform: rotate(0deg); } 50%, 95% { transform: rotate(180deg); } }
        @keyframes telescope-move { 0%, 100% { transform: rotate(-10deg); } 50% { transform: rotate(10deg); } }
        @keyframes camera-flash { 0%, 90% { opacity: 1; filter: brightness(1); } 95% { opacity: 1; filter: brightness(1.5); } }
        @keyframes dice-roll { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg) translateX(10px); } }
        @keyframes puzzle-fit { 0%, 100% { transform: translate(0, 0); } 50% { transform: translate(5px, -5px); } }
        @keyframes balloon-float { 0%, 100% { transform: translateY(0) rotate(-5deg); } 50% { transform: translateY(-15px) rotate(5deg); } }
        @keyframes kite-fly { 0%, 100% { transform: translate(0, 0) rotate(-10deg); } 50% { transform: translate(10px, -10px) rotate(10deg); } }
        @keyframes yo-yo { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(20px); } }
        @keyframes gift-shake { 0%, 100% { transform: rotate(0deg); } 25% { transform: rotate(-8deg); } 75% { transform: rotate(8deg); } }
        @keyframes anchor-swing { 0%, 100% { transform: rotate(-10deg); } 50% { transform: rotate(10deg); } }
        @keyframes helicopter { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        @keyframes ferris-wheel { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        
        @keyframes twinkle { 0%, 100% { opacity: 0.3; transform: scale(0.8); } 50% { opacity: 1; transform: scale(1.2); } }
        @keyframes sparkle { 0%, 100% { opacity: 0; transform: scale(0) rotate(0deg); } 50% { opacity: 1; transform: scale(1) rotate(180deg); } }
        @keyframes ripple { 0% { transform: scale(0.5); opacity: 1; } 100% { transform: scale(2.5); opacity: 0; } }
        @keyframes confetti { 0% { transform: translateY(-10px) rotate(0deg); opacity: 1; } 100% { transform: translateY(60px) rotate(360deg); opacity: 0; } }
        @keyframes heart-float { 0% { transform: translateY(0) scale(0.8); opacity: 0; } 30% { opacity: 1; } 100% { transform: translateY(-50px) scale(1.1); opacity: 0; } }
        @keyframes shine { 0% { left: -50%; } 100% { left: 150%; } }

        /* ========================================
           CLASSI UTILITY
           ======================================== */
        
        .a-float { animation: float 3s ease-in-out infinite; }
        .a-float-rev { animation: float-reverse 3s ease-in-out infinite; }
        .a-wiggle { animation: wiggle 2s ease-in-out infinite; }
        .a-bounce { animation: bounce-soft 2s ease-in-out infinite; }
        .a-spin { animation: spin-slow 8s linear infinite; }
        .a-spin-rev { animation: spin-reverse 8s linear infinite; }
        .a-pulse { animation: pulse-grow 2s ease-in-out infinite; }
        .a-shake { animation: shake 0.5s ease-in-out infinite; }
        .a-swing { animation: swing 3s ease-in-out infinite; transform-origin: top center; }
        .a-pop { animation: pop 1.5s ease-in-out infinite; }
        .a-blink { animation: blink 2s ease-in-out infinite; }
        .a-slide-x { animation: slide-x 3s ease-in-out infinite; }
        .a-slide-y { animation: slide-y 3s ease-in-out infinite; }
        
        .a-rocket { animation: rocket-flight 5s ease-in-out infinite; }
        .a-ufo { animation: ufo-hover 4s ease-in-out infinite; }
        .a-orbit { animation: orbit 3s linear infinite; }
        .a-hammer { animation: hammer-hit 1.5s infinite; transform-origin: bottom right; }
        .a-gear { animation: gear-rotate 4s linear infinite; }
        .a-gear-rev { animation: gear-reverse 4s linear infinite; }
        .a-crane { animation: crane-lift 4s ease-in-out infinite; transform-origin: bottom center; }
        .a-wrench { animation: wrench-turn 3s ease-in-out infinite; }
        .a-bulb { animation: bulb-glow 2s ease-in-out infinite; }
        .a-idea { animation: idea-float 3s ease-in infinite; }
        .a-pencil { animation: pencil-write 3s ease-in-out infinite; }
        .a-brush { animation: brush-stroke 2.5s ease-in-out infinite; transform-origin: bottom; }
        .a-bubble { animation: bubble 2s ease-out infinite; }
        .a-dna { animation: dna-spin 4s linear infinite; }
        .a-atom { animation: atom-pulse 2s ease-in-out infinite; }
        .a-microscope { animation: microscope-focus 3s ease-in-out infinite; }
        .a-heartbeat { animation: heartbeat 1.5s ease-in-out infinite; }
        .a-brain { animation: brain-wave 2s ease-in-out infinite; }
        .a-syringe { animation: syringe 2s ease-in-out infinite; }
        .a-pill { animation: pill-bounce 2s ease-in-out infinite; }
        .a-cursor { animation: cursor-blink 1s step-end infinite; }
        .a-bug { animation: bug-crawl 4s linear infinite; }
        .a-data { animation: data-flow 2s ease-in-out infinite; }
        .a-pixel { animation: pixel-jump 1s ease-in-out infinite; }
        .a-loading { animation: loading-spin 1.5s linear infinite; }
        .a-wifi { animation: wifi-pulse 2s ease-in-out infinite; }
        .a-ball-bounce { animation: ball-bounce 1s ease-in-out infinite; }
        .a-ball-roll { animation: ball-roll 3s linear infinite; }
        .a-run { animation: run-cycle 1.5s ease-in-out infinite; }
        .a-swim { animation: swim 2s ease-in-out infinite; }
        .a-yoga { animation: yoga-breathe 4s ease-in-out infinite; }
        .a-music { animation: music-bounce 2s ease-in-out infinite; }
        .a-guitar { animation: guitar-strum 1s ease-in-out infinite; }
        .a-drum { animation: drum-hit 1s ease-in-out infinite; transform-origin: bottom; }
        .a-piano { animation: piano-key 0.5s ease-in-out infinite; }
        .a-vinyl { animation: vinyl-spin 3s linear infinite; }
        .a-wave { animation: wave 2s ease-in-out infinite; }
        .a-flame { animation: flame 0.5s ease-in-out infinite; }
        .a-leaf { animation: leaf-fall 4s ease-in-out infinite; }
        .a-sun { animation: sun-ray 3s ease-in-out infinite; }
        .a-cloud { animation: cloud-float 5s ease-in-out infinite; }
        .a-rain { animation: rain-drop 1.5s linear infinite; }
        .a-tree { animation: tree-sway 4s ease-in-out infinite; transform-origin: bottom; }
        .a-flower { animation: flower-bloom 3s ease-in-out infinite; }
        .a-recycle { animation: recycle-spin 6s linear infinite; }
        .a-chart { animation: chart-grow 2s ease-out infinite alternate; transform-origin: bottom; }
        .a-coin { animation: coin-flip 3s ease-in-out infinite; }
        .a-briefcase { animation: briefcase-shake 2s ease-in-out infinite; }
        .a-arrow-up { animation: arrow-up 2s ease-in-out infinite; }
        .a-bell { animation: bell-ring 1s ease-in-out infinite; transform-origin: top; }
        .a-magnet { animation: magnet-pull 2s ease-in-out infinite; }
        .a-compass { animation: compass-spin 3s ease-in-out infinite; transform-origin: center; }
        .a-hourglass { animation: hourglass-flip 4s ease-in-out infinite; }
        .a-telescope { animation: telescope-move 4s ease-in-out infinite; transform-origin: bottom; }
        .a-camera { animation: camera-flash 3s ease-in-out infinite; }
        .a-dice { animation: dice-roll 2s ease-in-out infinite; }
        .a-puzzle { animation: puzzle-fit 2s ease-in-out infinite; }
        .a-balloon { animation: balloon-float 3s ease-in-out infinite; }
        .a-kite { animation: kite-fly 3s ease-in-out infinite; }
        .a-yoyo { animation: yo-yo 1.5s ease-in-out infinite; }
        .a-gift { animation: gift-shake 2s ease-in-out infinite; }
        .a-anchor { animation: anchor-swing 3s ease-in-out infinite; transform-origin: top; }
        .a-helicopter { animation: helicopter 0.3s linear infinite; }
        .a-ferris { animation: ferris-wheel 10s linear infinite; }
        .a-twinkle { animation: twinkle 2s ease-in-out infinite; }
        .a-sparkle { animation: sparkle 2s ease-in-out infinite; }
        .a-ripple { animation: ripple 2s ease-out infinite; }
        .a-confetti { animation: confetti 3s linear infinite; }
        .a-heart { animation: heart-float 3s ease-in infinite; }
      `}} />

      {/* ===============================================
         SFONDO DOODLE ANIMATO - 80+ ANIMAZIONI
         =============================================== */}
      <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden select-none">
        
        {/* ============ RIGA 1 ============ */}
        <div className="absolute top-[3%] left-[3%] text-3xl a-rocket">🚀</div>
        <div className="absolute top-[5%] left-[12%] text-2xl a-twinkle text-white">✨</div>
        <div className="absolute top-[4%] left-[22%] text-4xl a-spin">🪐</div>
        <div className="absolute top-[6%] left-[32%] text-3xl a-music">♪</div>
        <div className="absolute top-[3%] left-[42%] text-2xl a-confetti">🎊</div>
        <div className="absolute top-[5%] left-[52%] text-3xl a-balloon">🎈</div>
        <div className="absolute top-[4%] left-[62%] text-2xl a-twinkle text-white" style={{animationDelay: '0.5s'}}>⭐</div>
        <div className="absolute top-[6%] left-[72%] text-3xl a-hammer">🔨</div>
        <div className="absolute top-[3%] left-[82%] text-4xl a-gear">⚙️</div>
        <div className="absolute top-[5%] left-[92%] text-2xl a-sparkle text-yellow-300">✨</div>
        
        {/* ============ RIGA 2 ============ */}
        <div className="absolute top-[12%] left-[5%] text-4xl a-hourglass">⏳</div>
        <div className="absolute top-[14%] left-[15%] text-3xl a-telescope">🔭</div>
        <div className="absolute top-[11%] left-[25%] text-3xl a-camera">📷</div>
        <div className="absolute top-[13%] left-[35%] text-2xl a-music" style={{animationDelay: '0.3s'}}>♫</div>
        <div className="absolute top-[15%] left-[45%] text-3xl a-bulb">💡</div>
        <div className="absolute top-[12%] left-[55%] text-3xl a-dice">🎲</div>
        <div className="absolute top-[14%] left-[65%] text-4xl a-crane">🏗️</div>
        <div className="absolute top-[11%] left-[75%] text-3xl a-gear-rev" style={{fontSize: '1.5rem'}}>⚙️</div>
        <div className="absolute top-[13%] left-[85%] text-3xl a-wrench">🔧</div>
        <div className="absolute top-[15%] left-[95%] text-2xl a-ufo">🛸</div>
        
        {/* ============ RIGA 3 ============ */}
        <div className="absolute top-[20%] left-[3%] text-3xl a-guitar">🎸</div>
        <div className="absolute top-[22%] left-[13%] text-4xl a-wiggle">🎭</div>
        <div className="absolute top-[19%] left-[23%] text-3xl a-vinyl">💿</div>
        <div className="absolute top-[21%] left-[33%] text-2xl a-twinkle text-white" style={{animationDelay: '1s'}}>⭐</div>
        <div className="absolute top-[23%] left-[43%] text-3xl a-kite">🪁</div>
        <div className="absolute top-[20%] left-[53%] text-3xl a-bell">🔔</div>
        <div className="absolute top-[22%] left-[63%] text-4xl a-brush">🖌️</div>
        <div className="absolute top-[19%] left-[73%] text-3xl a-pencil">✏️</div>
        <div className="absolute top-[21%] left-[83%] text-3xl a-puzzle">🧩</div>
        <div className="absolute top-[23%] left-[93%] text-2xl a-twinkle text-white" style={{animationDelay: '1.5s'}}>✨</div>
        
        {/* ============ RIGA 4 ============ */}
        <div className="absolute top-[28%] left-[5%] text-3xl a-swing">⚖️</div>
        <div className="absolute top-[30%] left-[15%] text-3xl a-idea">💭</div>
        <div className="absolute top-[27%] left-[25%] text-4xl a-atom">⚛️</div>
        <div className="absolute top-[29%] left-[35%] text-2xl a-orbit bg-blue-400 rounded-full w-2 h-2"></div>
        <div className="absolute top-[31%] left-[67%] text-3xl a-microscope">🔬</div>
        <div className="absolute top-[28%] left-[77%] text-4xl a-dna" style={{transformStyle: 'preserve-3d'}}>🧬</div>
        <div className="absolute top-[30%] left-[87%] text-3xl a-bubble">🧪</div>
        <div className="absolute top-[27%] left-[95%] text-2xl a-sparkle text-cyan-300">✨</div>
        
        {/* ============ RIGA 5 ============ */}
        <div className="absolute top-[36%] left-[3%] text-4xl a-heartbeat text-red-400">❤️</div>
        <div className="absolute top-[38%] left-[10%] text-3xl a-brain">🧠</div>
        <div className="absolute top-[35%] left-[18%] text-3xl a-syringe">💉</div>
        <div className="absolute top-[40%] left-[5%] text-2xl a-pill">💊</div>
        
        <div className="absolute top-[36%] left-[82%] text-4xl">
          <span className="a-pulse block">💻</span>
          <span className="absolute top-1 left-3 text-xs font-mono text-green-400 a-data">{'</>'}</span>
        </div>
        <div className="absolute top-[38%] left-[92%] text-2xl font-mono text-green-400 a-blink">|</div>
        <div className="absolute top-[40%] left-[88%] text-3xl a-pixel">👾</div>
        
        {/* ============ RIGA 6 ============ */}
        <div className="absolute top-[44%] left-[2%] text-3xl a-wave">🌊</div>
        <div className="absolute top-[46%] left-[10%] text-4xl a-anchor">⚓</div>
        <div className="absolute top-[48%] left-[5%] text-3xl a-compass">🧭</div>
        <div className="absolute top-[45%] left-[15%] text-2xl a-twinkle text-white">⭐</div>
        
        <div className="absolute top-[44%] left-[85%] text-3xl a-magnet">🧲</div>
        <div className="absolute top-[46%] left-[92%] text-4xl a-loading">⚙️</div>
        <div className="absolute top-[48%] left-[88%] text-3xl a-wifi">📶</div>
        <div className="absolute top-[45%] left-[95%] text-2xl a-sparkle text-purple-300">✨</div>
        
        {/* ============ RIGA 7 ============ */}
        <div className="absolute top-[52%] left-[3%] text-4xl a-sun">☀️</div>
        <div className="absolute top-[54%] left-[12%] text-3xl a-cloud">☁️</div>
        <div className="absolute top-[56%] left-[6%] text-2xl a-rain">💧</div>
        <div className="absolute top-[53%] left-[18%] text-3xl a-flame">🔥</div>
        
        <div className="absolute top-[52%] left-[84%] text-3xl a-briefcase">💼</div>
        <div className="absolute top-[54%] left-[93%] text-4xl a-coin">🪙</div>
        <div className="absolute top-[56%] left-[88%] text-2xl a-arrow-up">📈</div>
        <div className="absolute top-[53%] left-[95%] text-3xl a-chart origin-bottom">📊</div>
        
        {/* ============ RIGA 8 ============ */}
        <div className="absolute top-[60%] left-[5%] text-3xl a-tree">🌳</div>
        <div className="absolute top-[62%] left-[15%] text-4xl a-flower">🌸</div>
        <div className="absolute top-[64%] left-[8%] text-3xl a-leaf">🍃</div>
        <div className="absolute top-[61%] left-[22%] text-2xl a-twinkle text-white" style={{animationDelay: '0.7s'}}>✨</div>
        <div className="absolute top-[63%] left-[40%] text-3xl a-recycle text-green-400">♻️</div>
        <div className="absolute top-[60%] left-[55%] text-4xl a-gift">🎁</div>
        <div className="absolute top-[62%] left-[75%] text-3xl a-yoyo">🪀</div>
        <div className="absolute top-[64%] left-[85%] text-3xl a-drum">🥁</div>
        <div className="absolute top-[61%] left-[93%] text-4xl a-piano">🎹</div>
        
        {/* ============ RIGA 9 ============ */}
        <div className="absolute top-[68%] left-[3%] text-4xl a-ball-bounce">🏀</div>
        <div className="absolute top-[70%] left-[13%] text-3xl a-ball-roll">⚽</div>
        <div className="absolute top-[72%] left-[6%] text-3xl a-run">🏃</div>
        <div className="absolute top-[69%] left-[20%] text-4xl a-swim">🏊</div>
        <div className="absolute top-[71%] left-[30%] text-3xl a-yoga">🧘</div>
        <div className="absolute top-[68%] left-[45%] text-2xl a-heart text-pink-400">💕</div>
        <div className="absolute top-[70%] left-[58%] text-4xl a-ferris">🎡</div>
        <div className="absolute top-[72%] left-[70%] text-3xl">
          <span className="block">🚁</span>
          <span className="absolute -top-1 left-2 text-lg a-helicopter">―</span>
        </div>
        <div className="absolute top-[69%] left-[80%] text-3xl a-bug">🐛</div>

        <div className="absolute top-[71%] left-[90%] text-4xl">
          <span className="block">☕</span>
          <span className="absolute -top-4 left-2 text-sm a-idea opacity-60">♨️</span>
        </div>
        
        {/* ============ RIGA 10 ============ */}
        <div className="absolute top-[76%] left-[5%] w-12 h-12 overflow-hidden flex items-center justify-center rounded-xl">
          <span className="text-4xl relative z-10">🏆</span>
          <div className="absolute top-0 left-0 w-3 h-full bg-white/40 skew-x-12 z-20 pointer-events-none" style={{animation: 'shine 3s infinite'}}></div>
        </div>

        <div className="absolute top-[78%] left-[15%] text-3xl a-swing" style={{transformOrigin: 'top'}}>🏅</div>
        <div className="absolute top-[80%] left-[8%] text-3xl a-wiggle">🚩</div>

        <div className="absolute top-[77%] left-[25%] text-4xl">
          <span className="block">🎯</span>
          <span className="absolute -left-2 top-1 text-2xl" style={{animation: 'arrow-up 2s infinite'}}>🏹</span>
        </div>

        <div className="absolute top-[79%] left-[38%] text-3xl a-slide-x">🚜</div>
        <div className="absolute top-[76%] left-[50%] text-3xl a-bounce">🍇</div>
        <div className="absolute top-[78%] left-[60%] text-4xl a-wiggle">🍷</div>
        <div className="absolute top-[80%] left-[72%] text-3xl a-twinkle text-white">⭐</div>
        <div className="absolute top-[77%] left-[82%] text-3xl font-mono text-green-400 a-pulse">{"{ }"}</div>
        <div className="absolute top-[79%] left-[92%] text-2xl a-sparkle text-yellow-300">✨</div>
        
        {/* ============ RIGA 11 ============ */}
        <div className="absolute top-[84%] left-[3%] text-3xl a-music" style={{animationDelay: '0.5s'}}>♬</div>
        <div className="absolute top-[86%] left-[12%] text-4xl a-pop">🎨</div>
        <div className="absolute top-[88%] left-[5%] text-3xl a-float">📚</div>
        <div className="absolute top-[85%] left-[20%] text-3xl a-wiggle">📝</div>
        <div className="absolute top-[87%] left-[32%] text-4xl a-shake">🤝</div>
        <div className="absolute top-[84%] left-[45%] w-4 h-4 border-2 border-white/30 rounded-full a-ripple"></div>
        <div className="absolute top-[86%] left-[55%] text-3xl a-pop">📣</div>
        <div className="absolute top-[88%] left-[68%] text-4xl a-float-rev">💬</div>
        <div className="absolute top-[85%] left-[78%] text-3xl a-slide-y">👤</div>
        <div className="absolute top-[87%] left-[88%] text-3xl a-confetti" style={{animationDelay: '1s'}}>🎉</div>
        
        {/* ============ RIGA 12 ============ */}
        <div className="absolute top-[92%] left-[5%] text-2xl a-twinkle text-white" style={{animationDelay: '0.3s'}}>✨</div>
        <div className="absolute top-[94%] left-[15%] text-3xl a-bounce">🎓</div>
        <div className="absolute top-[93%] left-[28%] text-2xl a-spin-rev font-bold text-white/50">+</div>
        <div className="absolute top-[95%] left-[40%] text-3xl a-float">🌟</div>
        <div className="absolute top-[92%] left-[52%] text-2xl a-sparkle text-cyan-300">✨</div>
        <div className="absolute top-[94%] left-[65%] text-3xl a-wiggle">🎪</div>
        <div className="absolute top-[93%] left-[78%] text-2xl a-spin font-bold text-white/50">×</div>
        <div className="absolute top-[95%] left-[88%] text-3xl a-ufo">🛸</div>
        <div className="absolute top-[92%] left-[95%] text-2xl a-twinkle text-white" style={{animationDelay: '2s'}}>⭐</div>

        {/* ============ ELEMENTI EXTRA SPARSI ============ */}
        <div className="absolute top-[33%] left-[8%] flex items-center gap-0.5 opacity-70">
          <div className="w-2 h-2 bg-purple-400 rounded-full a-pulse"></div>
          <div className="w-4 h-0.5 bg-white/40"></div>
          <div className="w-2 h-2 bg-blue-400 rounded-full a-pulse" style={{animationDelay: '0.3s'}}></div>
        </div>
        
        <div className="absolute top-[65%] left-[92%] flex items-center gap-0.5 opacity-70">
          <div className="w-2 h-2 bg-green-400 rounded-full a-pulse"></div>
          <div className="w-4 h-0.5 bg-white/40"></div>
          <div className="w-2 h-2 bg-yellow-400 rounded-full a-pulse" style={{animationDelay: '0.5s'}}></div>
        </div>
        
        <div className="absolute top-[82%] left-[62%] flex items-end gap-0.5 h-6 opacity-80">
          <div className="w-1.5 bg-green-400 a-chart" style={{height: '40%', animationDelay: '0s'}}></div>
          <div className="w-1.5 bg-green-400 a-chart" style={{height: '70%', animationDelay: '0.2s'}}></div>
          <div className="w-1.5 bg-green-400 a-chart" style={{height: '50%', animationDelay: '0.4s'}}></div>
          <div className="w-1.5 bg-green-400 a-chart" style={{height: '90%', animationDelay: '0.6s'}}></div>
        </div>
        
        <div className="absolute top-[25%] left-[50%] w-3 h-3 border border-white/30 rounded-full a-ripple"></div>
        <div className="absolute top-[75%] left-[35%] w-4 h-4 border border-white/20 rounded-full a-ripple" style={{animationDelay: '1s'}}></div>
      </div>
      {/* --- FINE SFONDO DOODLE --- */}

      {/* --- FINESTRA DI ONBOARDING CARTOON --- */}
      {/* Utilizziamo flex-col sm:flex-row per far impilare gli elementi su telefono evitando sovrapposizioni */}
      <div className="relative z-10 w-full max-w-lg bg-white p-6 sm:p-10 rounded-3xl border-4 border-gray-900 shadow-[12px_12px_0px_0px_rgba(0,0,0,0.3)] max-h-[90vh] overflow-y-auto custom-scrollbar">
        
        <div className="text-center mb-6 sm:mb-8">
          <h1 className="text-4xl sm:text-5xl font-black text-gray-900 italic tracking-tighter uppercase mb-2">
            PROFILO <span className="text-red-600">UNIPD</span>
          </h1>
          <div className="inline-block bg-yellow-300 border-2 border-gray-900 px-3 py-1 rounded-lg shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] -rotate-2 mt-2">
            <p className="text-gray-900 font-black text-xs sm:text-sm uppercase tracking-widest">Ultimi dettagli ✨</p>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-400 border-4 border-gray-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] text-gray-900 font-bold rounded-xl text-sm uppercase">
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5 sm:space-y-6">
          
          {/* NOME E COGNOME (Si impilano su mobile, si affiancano su desktop) */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <label className={labelClass}>Nome *</label>
              <input type="text" placeholder="Mario" className={inputClass}
                value={nome} onChange={(e) => setNome(e.target.value)} required />
            </div>
            <div className="flex-1">
              <label className={labelClass}>Cognome *</label>
              <input type="text" placeholder="Rossi" className={inputClass}
                value={cognome} onChange={(e) => setCognome(e.target.value)} required />
            </div>
          </div>

          {/* DATA DI NASCITA E SESSO */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <label className={labelClass}>Data Nascita *</label>
              <input type="date" className={inputClass}
                value={dataNascita} onChange={(e) => setDataNascita(e.target.value)} required />
            </div>
            <div className="w-full sm:w-1/3">
              <label className={labelClass}>Sesso</label>
              <select className={`${inputClass} cursor-pointer appearance-none`}
                value={sesso} onChange={(e) => setSesso(e.target.value as SessoType)}>
                <option value="non_specificato">Altro</option>
                <option value="M">M</option>
                <option value="F">F</option>
              </select>
            </div>
          </div>

          {/* CORSO DI LAUREA */}
          <div className="pt-4 border-t-4 border-dashed border-gray-200 space-y-4 sm:space-y-6">
            <div>
               <label className={labelClass}>Corso di Laurea *</label>
               <select 
                 value={corsoSelezionato} 
                 onChange={(e) => setCorsoSelezionato(e.target.value)} 
                 className={`${inputClass} cursor-pointer appearance-none bg-white`}
                 required
               >
                 <option value="" disabled>Scegli il tuo corso...</option>
                 {listaCorsi.map(c => (
                   <option key={c.id} value={c.id}>{c.nome}</option>
                 ))}
                 <option value="altro" className="font-black text-blue-600">✨ Altro (Non in lista)</option>
               </select>
            </div>

            {/* SE L'UTENTE SCEGLIE ALTRO, MOSTRA QUESTO */}
            {corsoSelezionato === 'altro' && (
              <div className="animate-in fade-in zoom-in-95 duration-200">
                <label className={labelClass}>Nome del Corso (da approvare)</label>
                <input 
                  type="text" 
                  placeholder="Es: Laurea in Astrofisica" 
                  className={`${inputClass} border-blue-500 focus:border-blue-700 bg-blue-50`}
                  value={corsoAltro} 
                  onChange={(e) => setCorsoAltro(e.target.value)} 
                  required
                />
                <p className="text-[10px] text-gray-500 font-bold mt-2 italic">
                  *Il tuo corso verrà inviato agli Admin per l'approvazione e aggiunto al database.
                </p>
              </div>
            )}
            
            {/* ANNI DI STUDIO */}
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <label className={labelClass}>Anno Inizio *</label>
                <input type="number" placeholder="2021" className={inputClass}
                  value={annoInizio} onChange={(e) => setAnnoInizio(e.target.value)} required />
              </div>
              <div className="flex-1">
                <label className={labelClass}>Anno Fine (Se Laureato)</label>
                <input type="number" placeholder="2024" className={inputClass}
                  value={annoFine} onChange={(e) => setAnnoFine(e.target.value)} />
              </div>
            </div>

            {/* VOTO LAUREA */}
            <div>
               <label className={labelClass}>Voto Laurea (Opzionale)</label>
               <input type="number" placeholder="es. 110" className={inputClass}
                 value={voto} onChange={(e) => setVoto(e.target.value)} min="60" max="113" />
            </div>
          </div>

          {/* PULSANTONE INVIO */}
          <button 
            type="submit" 
            disabled={loading} 
            className="w-full bg-red-600 text-white p-4 rounded-xl font-black text-lg sm:text-xl uppercase tracking-widest border-4 border-gray-900 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[6px] hover:translate-y-[6px] transition-all disabled:opacity-50 mt-6"
          >
            {loading ? 'Salvataggio... ⏳' : 'Conferma ed Entra 🚀'}
          </button>
        </form>
      </div>
    </main>
  )
}