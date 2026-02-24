'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface ApplySectionProps {
  bandoId: string
  isAdmin: boolean
  haGiaPartecipato: boolean
  statoCandidatura?: string
  dominantColor?: string
}

export default function ApplySection({ 
  bandoId, 
  isAdmin, 
  haGiaPartecipato, 
  statoCandidatura,
  dominantColor = '239, 68, 68'
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

  const handleApply = async () => {
    if (messaggio.length < 20) {
      setErrore("Il messaggio deve contenere almeno 20 caratteri")
      return
    }
    if (!ruolo) {
      setErrore("Seleziona il ruolo per cui ti candidi")
      return
    }

    setLoading(true)
    setErrore(null)
    
    const { data: { user } } = await supabase.auth.getUser()
    
    if (user) {
      const messaggioCompleto = `[RUOLO]: ${ruolo}\n\n${messaggio}${link ? `\n\n[LINK]: ${link}` : ''}`

      const { error } = await supabase.from('partecipazione').insert({
        bando_id: bandoId,
        studente_id: user.id,
        messaggio: messaggioCompleto,
        stato: 'pending'
      })
      
      if (!error) {
        setInviato(true)
      } else {
        setErrore("Errore durante l'invio. Riprova.")
      }
    }
    setLoading(false)
  }

  // Mappa stati
  const statoConfig: Record<string, { label: string; icon: string; color: string; bg: string }> = {
    'pending': { 
      label: 'In Attesa di Revisione', 
      icon: '⏳', 
      color: 'text-amber-700',
      bg: 'bg-amber-50 border-amber-200'
    },
    'accepted': { 
      label: 'Candidatura Accettata!', 
      icon: '✅', 
      color: 'text-green-700',
      bg: 'bg-green-50 border-green-200'
    },
    'rejected': { 
      label: 'Candidatura Non Accettata', 
      icon: '❌', 
      color: 'text-gray-600',
      bg: 'bg-gray-50 border-gray-200'
    }
  }

  // Banner stato (se ha già partecipato)
  if (haGiaPartecipato || inviato) {
    const stato = inviato ? 'pending' : (statoCandidatura || 'pending')
    const config = statoConfig[stato]

    return (
      <div className={`rounded-2xl border p-6 ${config.bg} animate-in fade-in slide-in-from-bottom-4 duration-500`}>
        <div className="flex items-center gap-4">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl ${
            stato === 'accepted' ? 'bg-green-100' : 
            stato === 'rejected' ? 'bg-gray-100' : 'bg-amber-100'
          }`}>
            {config.icon}
          </div>
          <div>
            <h4 className={`font-semibold ${config.color}`}>
              {inviato ? 'Candidatura Inviata!' : 'Stato Candidatura'}
            </h4>
            <p className={`text-sm ${config.color} opacity-80`}>
              {config.label}
            </p>
          </div>
        </div>
        
        {stato === 'accepted' && (
          <p className="mt-4 text-sm text-green-600 bg-green-100 px-4 py-2 rounded-xl">
            🎉 Congratulazioni! Controlla il workspace del team per iniziare a collaborare.
          </p>
        )}
        
        {stato === 'pending' && (
          <p className="mt-4 text-sm text-amber-600">
            Il leader sta valutando la tua candidatura. Riceverai una notifica appena ci saranno novità.
          </p>
        )}
        
        {stato === 'rejected' && (
          <p className="mt-4 text-sm text-gray-500">
            Non demordere! Ci sono tanti altri progetti che cercano talenti come te.
          </p>
        )}
      </div>
    )
  }

  // Form candidatura
  return (
    <div 
      className="rounded-2xl p-6 shadow-sm border overflow-hidden"
      style={{ 
        backgroundColor: `rgba(${dominantColor}, 0.08)`,
        borderColor: `rgba(${dominantColor}, 0.2)`
      }}
    >
      <div className="mb-6">
        <h3 className="text-xl font-bold text-gray-900 mb-1">Candidati al Progetto</h3>
        <p className="text-sm text-gray-500">Fai sapere al leader perché sei la persona giusta</p>
      </div>

      <div className="space-y-4">
        {/* Ruolo e Link */}
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Ruolo *
            </label>
            <select 
              value={ruolo}
              onChange={(e) => setRuolo(e.target.value)}
              className="w-full px-4 py-3 bg-white rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none text-sm font-medium appearance-none cursor-pointer"
            >
              <option value="">Seleziona ruolo...</option>
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

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Portfolio / LinkedIn / GitHub
            </label>
            <input 
              type="url"
              placeholder="https://..."
              value={link}
              onChange={(e) => setLink(e.target.value)}
              className="w-full px-4 py-3 bg-white rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none text-sm"
            />
          </div>
        </div>

        {/* Messaggio */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Presentazione *
            <span className="font-normal text-gray-400 ml-2">({messaggio.length}/500)</span>
          </label>
          <textarea 
            className="w-full px-4 py-3 bg-white rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none text-sm resize-none min-h-[120px]"
            placeholder="Ciao! Sono interessato a questo progetto perché..."
            value={messaggio}
            onChange={(e) => setMessaggio(e.target.value.slice(0, 500))}
            maxLength={500}
          />
        </div>

        {/* Errore */}
        {errore && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm font-medium flex items-center gap-2">
            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {errore}
          </div>
        )}

        {/* Submit */}
        <button 
          onClick={handleApply}
          disabled={loading}
          className="w-full py-3.5 bg-gray-900 hover:bg-gray-800 text-white rounded-xl font-semibold text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Invio in corso...
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
              Invia Candidatura
            </>
          )}
        </button>

        <p className="text-xs text-gray-400 text-center">
          Inviando la candidatura accetti di condividere il tuo profilo con il leader del progetto
        </p>
      </div>
    </div>
  )
}