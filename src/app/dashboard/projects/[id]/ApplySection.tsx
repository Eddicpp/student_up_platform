'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface ApplySectionProps {
  bandoId: string
  isAdmin: boolean
  haGiaPartecipato: boolean
  statoCandidatura?: string 
  dominantColor?: string
  statoBando?: string 
}

export default function ApplySection({ 
  bandoId, 
  isAdmin, 
  haGiaPartecipato, 
  statoCandidatura,
  dominantColor = '239, 68, 68',
  statoBando
}: ApplySectionProps) {
  const [messaggio, setMessaggio] = useState('')
  const [link, setLink] = useState('')
  const [ruolo, setRuolo] = useState('')
  
  const [loading, setLoading] = useState(false)
  const [inviato, setInviato] = useState(false)
  const [errore, setErrore] = useState<string | null>(null)
  
  const supabase = createClient()

  // Se sei Admin, non mostrare nulla
  if (isAdmin) return null

  // ==========================================
  // BLOCCO BANDO CHIUSO
  // ==========================================
  if (statoBando === 'chiuso' && !haGiaPartecipato && !inviato) {
    return (
      <div className="mt-8 rounded-2xl sm:rounded-3xl border-4 border-gray-900 p-5 sm:p-8 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] bg-gray-100 opacity-80">
        <div className="flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-white border-4 border-gray-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center text-3xl sm:text-4xl -rotate-3">
            🔒
          </div>
          <div>
            <h4 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-gray-900">
              Candidature Chiuse
            </h4>
            <p className="text-sm sm:text-base font-bold text-gray-500 mt-1">
              Il leader ha smesso di accettare nuovi membri per questo progetto.
            </p>
          </div>
        </div>
      </div>
    )
  }

  const handleApply = async () => {
  if (messaggio.length < 20) {
    setErrore("Il messaggio deve contenere almeno 20 caratteri ✍️")
    return
  }
  if (!ruolo) {
    setErrore("Seleziona il ruolo per cui ti candidi 🎯")
    return
  }

  setLoading(true)
  setErrore(null)
  
  const { data: { user } } = await supabase.auth.getUser()
  
  if (user) {
    const messaggioCompleto = `[RUOLO]: ${ruolo}\n\n${messaggio}${link ? `\n\n[LINK]: ${link}` : ''}`

    // 1. Aggiungiamo 'data' e '.select()' alla query
    const { data, error } = await supabase.from('partecipazione').insert({
      bando_id: bandoId,
      studente_id: user.id,
      messaggio: messaggioCompleto,
      stato: 'pending'
    }).select()
    
    if (error) {
      // 2. Log ultra-dettagliato nella console (F12)
      console.error("🚨 DETTAGLI ERRORE SUPABASE:", {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint
      })
      // 3. Mostriamo l'errore tecnico direttamente nella UI per fare debug
      setErrore(`Errore ${error.code}: ${error.message} ❌`)
    } else {
      console.log("✅ Candidatura salvata con successo:", data)
      setInviato(true)
    }
  } else {
    setErrore("Devi essere loggato per inviare una candidatura 🔒")
  }
  
  setLoading(false)
}

  // Mappa stati per i banner post-candidatura
  const statoConfig: Record<string, { label: string; icon: string; bg: string; text: string }> = {
    'pending': { 
      label: 'In Attesa di Valutazione', 
      icon: '⏳', 
      bg: 'bg-amber-300',
      text: 'text-gray-900'
    },
    'accepted': { 
      label: 'Candidatura Accettata!', 
      icon: '✅', 
      bg: 'bg-green-400',
      text: 'text-gray-900'
    },
    'rejected': { 
      label: 'Non Accettata', 
      icon: '❌', 
      bg: 'bg-gray-300',
      text: 'text-gray-900'
    },
    'default': {
      label: 'Stato Sconosciuto',
      icon: '❓',
      bg: 'bg-white',
      text: 'text-gray-900'
    }
  }

  // ==========================================
  // BANNER STATO (Già candidato o appena inviato)
  // ==========================================
  if (haGiaPartecipato || inviato) {
    const stato = inviato ? 'pending' : (statoCandidatura || 'pending')
    const config = statoConfig[stato] || statoConfig['default']

    return (
      <div className={`mt-8 rounded-2xl sm:rounded-3xl border-4 border-gray-900 p-5 sm:p-8 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] sm:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] animate-in zoom-in-95 duration-300 ${config.bg}`}>
        <div className="flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-white border-4 border-gray-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center text-3xl sm:text-4xl -rotate-6">
            {config.icon}
          </div>
          <div>
            <h4 className={`text-xl sm:text-2xl font-black uppercase tracking-tight ${config.text}`}>
              {inviato ? 'Candidatura Inviata!' : 'Stato Candidatura'}
            </h4>
            <p className={`text-sm sm:text-base font-bold mt-1 ${config.text}`}>
              {config.label}
            </p>
          </div>
        </div>
        
        <div className="mt-6 pt-4 border-t-4 border-gray-900 border-dashed">
          {stato === 'accepted' && (
            <p className="text-sm sm:text-base font-bold text-gray-900">
              🎉 Congratulazioni! Vai nella sezione "I Miei Progetti" per accedere al workspace del team.
            </p>
          )}
          {stato === 'pending' && (
            <p className="text-sm sm:text-base font-bold text-gray-900">
              Il leader sta valutando il tuo profilo. Riceverai una notifica non appena ci saranno novità. Incrociamo le dita! 🤞
            </p>
          )}
          {stato === 'rejected' && (
            <p className="text-sm sm:text-base font-bold text-gray-900">
              Non demordere! Esplora la bacheca, ci sono tanti altri team che cercano un talento come il tuo. 💪
            </p>
          )}
        </div>
      </div>
    )
  }

  // Classi standard per gli input
  const inputClass = "w-full px-4 py-3 sm:py-4 bg-white rounded-xl border-3 sm:border-4 border-gray-900 focus:outline-none focus:translate-x-[2px] focus:translate-y-[2px] focus:shadow-none shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] sm:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] text-gray-900 font-bold text-sm sm:text-base placeholder:text-gray-500 placeholder:italic transition-all"
  const labelClass = "block text-[10px] sm:text-xs font-black uppercase tracking-widest text-gray-900 mb-1.5 sm:mb-2 ml-1"

  // ==========================================
  // FORM DI CANDIDATURA CARTOON
  // ==========================================
  return (
    <div className="bg-blue-50 border-[3px] sm:border-4 border-gray-900 rounded-2xl sm:rounded-3xl p-5 sm:p-8 relative shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] sm:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] mt-8 sm:mt-10">
      
      {/* Etichetta Galleggiante */}
      <span className="absolute -top-3.5 sm:-top-5 right-4 sm:right-8 bg-red-400 border-2 sm:border-4 border-gray-900 px-3 py-0.5 sm:px-4 sm:py-1 rounded-lg sm:rounded-xl font-black uppercase tracking-widest text-white text-[10px] sm:text-sm shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] rotate-3">
        Candidati Ora 🚀
      </span>

      <div className="mb-6 sm:mb-8 text-center sm:text-left mt-2">
        <h3 className="text-2xl sm:text-3xl font-black text-gray-900 uppercase tracking-tighter leading-tight">
          Unisciti al <span className="text-blue-600">Team</span>
        </h3>
        <p className="text-sm sm:text-base font-bold text-gray-600 mt-1">Fai sapere al leader perché sei la persona giusta!</p>
      </div>

      <div className="space-y-5 sm:space-y-6">
        
        {/* Ruolo e Link (Impilati su mobile, affiancati su PC) */}
        <div className="flex flex-col sm:flex-row gap-4 sm:gap-6">
          <div className="flex-1">
            <label className={labelClass}>Ruolo Desiderato *</label>
            <select 
              value={ruolo}
              onChange={(e) => setRuolo(e.target.value)}
              className={`${inputClass} cursor-pointer appearance-none`}
            >
              <option value="">Seleziona un ruolo...</option>
              <option value="Developer Frontend">💻 Developer Frontend</option>
              <option value="Developer Backend">⚙️ Developer Backend</option>
              <option value="Full Stack Developer">🔧 Full Stack Developer</option>
              <option value="UI/UX Designer">🎨 UI/UX Designer</option>
              <option value="Graphic Designer">🖼️ Graphic Designer</option>
              <option value="Marketing">📈 Marketing & Growth</option>
              <option value="Social Media Manager">📱 Social Media Manager</option>
              <option value="Content Creator">✍️ Content Creator</option>
              <option value="Project Manager">📊 Project Manager</option>
              <option value="Business Development">💼 Business Development</option>
              <option value="Data Analyst">📊 Data Analyst</option>
              <option value="Altro">✨ Altro</option>
            </select>
          </div>

          <div className="flex-1">
            <label className={labelClass}>Portfolio / LinkedIn (Opzionale)</label>
            <input 
              type="url"
              placeholder="https://..."
              value={link}
              onChange={(e) => setLink(e.target.value)}
              className={inputClass}
            />
          </div>
        </div>

        {/* Messaggio */}
        <div>
          <div className="flex justify-between items-end mb-1.5 sm:mb-2 ml-1">
            <label className="block text-[10px] sm:text-xs font-black uppercase tracking-widest text-gray-900">
              Presentazione *
            </label>
            <span className={`text-[10px] font-black ${messaggio.length < 20 ? 'text-red-500' : 'text-gray-500'}`}>
              {messaggio.length}/500
            </span>
          </div>
          <textarea 
            className={`${inputClass} resize-none min-h-[140px] sm:min-h-[160px]`}
            placeholder="Ciao! Vorrei partecipare a questo progetto perché..."
            value={messaggio}
            onChange={(e) => setMessaggio(e.target.value.slice(0, 500))}
            maxLength={500}
          />
        </div>

        {/* Errore */}
        {errore && (
          <div className="p-3 sm:p-4 bg-red-400 border-[3px] border-gray-900 rounded-xl text-gray-900 text-xs sm:text-sm font-black uppercase tracking-wide shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] flex items-center gap-2 animate-in shake">
            <span className="text-lg">⚠️</span>
            {errore}
          </div>
        )}

        {/* Pulsante Invio */}
        <button 
          onClick={handleApply}
          disabled={loading}
          className="w-full py-4 sm:py-5 bg-yellow-300 hover:bg-yellow-400 text-gray-900 rounded-xl sm:rounded-2xl font-black text-lg sm:text-xl uppercase tracking-widest border-[3px] sm:border-4 border-gray-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] sm:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[4px] hover:translate-y-[4px] hover:shadow-none transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 mt-2"
        >
          {loading ? (
            <>
              <span className="animate-spin text-2xl">⏳</span>
              Invio in corso...
            </>
          ) : (
            <>
              Invia Candidatura <span className="text-2xl">🚀</span>
            </>
          )}
        </button>

        <p className="text-[9px] sm:text-[10px] font-bold text-gray-500 uppercase tracking-widest text-center mt-4">
          ℹ️ Inviando la candidatura accetti di condividere il tuo profilo pubblico con il leader del team.
        </p>
      </div>
    </div>
  )
}