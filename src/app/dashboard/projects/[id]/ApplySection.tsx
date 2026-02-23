'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function ApplySection({ 
  bandoId, 
  isAdmin, 
  haGiaPartecipato, 
  statoCandidatura 
}: { 
  bandoId: string, 
  isAdmin: boolean, 
  haGiaPartecipato: boolean,
  statoCandidatura?: string
}) {
  const [messaggio, setMessaggio] = useState('')
  const [link, setLink] = useState('') // 🔗 Nuovo stato per il link
  const [ruolo, setRuolo] = useState('') // 🎭 Nuovo stato per il ruolo
  
  const [loading, setLoading] = useState(false)
  const [inviato, setInviato] = useState(false)
  const [errore, setErrore] = useState<string | null>(null) // Gestione errore interna
  
  const supabase = createClient()

  // Se sei Admin (creatore del bando), non mostrare nulla
  if (isAdmin) return null

  const handleApply = async () => {
    if (messaggio.length < 20) {
      setErrore("Il messaggio è un po' troppo corto! Scrivi almeno 20 caratteri.")
      return
    }
    if (!ruolo) {
      setErrore("Per favore, seleziona il ruolo per cui ti candidi.")
      return
    }

    setLoading(true)
    setErrore(null)
    
    const { data: { user } } = await supabase.auth.getUser()
    
    if (user) {
      // 💡 TRUCCO: Uniamo i dati extra nel messaggio per non toccare il Database
      const messaggioCompleto = `
[RUOLO PROPOSTO]: ${ruolo}
--------------------------------
${messaggio}
--------------------------------
[LINK EXTRA]: ${link || 'Nessun link allegato'}
      `.trim()

      const { error } = await supabase.from('partecipazione').insert({
        bando_id: bandoId,
        studente_id: user.id,
        messaggio: messaggioCompleto, // Salviamo il messaggio formattato
        stato: 'pending'
      })
      
      if (!error) {
        setInviato(true)
      } else {
        console.error('Errore candidatura:', error)
        setErrore("C'è stato un problema tecnico. Riprova tra poco.")
      }
    }
    setLoading(false)
  }

  // Mappa stati per visualizzazione italiana
  const statoLabel: Record<string, string> = {
    'pending': '⏳ In Attesa di Revisione',
    'accepted': '✅ Candidatura Accettata!',
    'rejected': '❌ Candidatura Non Accettata'
  }

  // BANNER STATO (Se ha già partecipato)
  if (haGiaPartecipato || inviato) {
    const stato = statoCandidatura || 'pending'
    const isRejected = stato === 'rejected'
    const isAccepted = stato === 'accepted'

    return (
      <div className={`rounded-[3rem] p-12 text-center shadow-2xl border-4 transition-all duration-500 animate-in fade-in slide-in-from-bottom-4 ${
        isRejected ? 'bg-gray-100 border-gray-200 text-gray-500' :
        isAccepted ? 'bg-green-600 border-green-500 text-white' :
        'bg-white border-red-100 text-red-900' // Pending style
      }`}>
        <h4 className="font-black text-4xl uppercase italic mb-4 tracking-tighter">
          {inviato ? 'Candidatura Inviata!' : 'Stato Candidatura'}
        </h4>
        <div className={`inline-block px-6 py-2 rounded-full text-sm font-black uppercase tracking-widest ${
          isRejected ? 'bg-gray-200' : isAccepted ? 'bg-green-700' : 'bg-red-50 text-red-600'
        }`}>
          {inviato ? statoLabel['pending'] : statoLabel[stato]}
        </div>
        <p className="mt-6 text-sm font-bold opacity-60 uppercase tracking-widest">
          {isAccepted ? "Controlla la tua email o la chat di team!" : 
           isRejected ? "Non demordere, ci sono altri progetti!" : 
           "Il Leader sta valutando il tuo profilo."}
        </p>
      </div>
    )
  }

  // FORM CANDIDATURA 2.0
  return (
    <div className="bg-red-800 rounded-[3.5rem] p-8 md:p-12 text-white shadow-2xl border-4 border-red-700 relative overflow-hidden group">
      
      {/* Decorazione Sfondo */}
      <div className="absolute -top-20 -right-20 w-64 h-64 bg-red-700 rounded-full blur-3xl opacity-50 group-hover:scale-150 transition-transform duration-700 pointer-events-none" />

      <div className="relative z-10 flex flex-col gap-8">
        
        {/* Intestazione */}
        <div className="text-center space-y-2">
          <h4 className="font-black text-4xl md:text-5xl uppercase italic tracking-tighter">
            Unisciti al Team
          </h4>
          <p className="text-red-200 text-xs md:text-sm font-black uppercase tracking-[0.3em]">
            Fai la differenza in questo progetto
          </p>
        </div>
        
        <div className="max-w-3xl mx-auto w-full space-y-4">
          
          {/* 1. Selezione Ruolo & Link (Grid) */}
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-widest text-red-300 ml-2">Il tuo Ruolo *</label>
              <select 
                value={ruolo}
                onChange={(e) => setRuolo(e.target.value)}
                className="w-full p-4 rounded-2xl bg-black/20 border-2 border-white/10 text-white focus:bg-black/30 focus:border-white/40 outline-none font-bold text-sm appearance-none cursor-pointer hover:bg-black/30 transition-colors"
              >
                <option value="" className="text-gray-500">Seleziona ruolo...</option>
                <option value="Developer" className="text-gray-900">💻 Developer (Frontend/Backend)</option>
                <option value="Designer" className="text-gray-900">🎨 UI/UX Designer</option>
                <option value="Marketing" className="text-gray-900">📈 Marketing & Social</option>
                <option value="Project Manager" className="text-gray-900">📊 Project Manager</option>
                <option value="Altro" className="text-gray-900">✨ Altro / Jolly</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-widest text-red-300 ml-2">Portfolio / LinkedIn / GitHub</label>
              <input 
                type="text"
                placeholder="https://..."
                value={link}
                onChange={(e) => setLink(e.target.value)}
                className="w-full p-4 rounded-2xl bg-black/20 border-2 border-white/10 text-white placeholder:text-white/30 focus:bg-black/30 focus:border-white/40 outline-none font-bold text-sm transition-colors"
              />
            </div>
          </div>

          {/* 2. Messaggio Textarea */}
          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase tracking-widest text-red-300 ml-2">
              Perché dovrebbero scegliere te? ({messaggio.length} car.)
            </label>
            <textarea 
              className="w-full p-6 rounded-[2rem] bg-white text-gray-900 border-4 border-transparent focus:border-red-300 outline-none transition-all text-lg font-medium resize-none shadow-xl min-h-[150px]"
              placeholder="Ciao! Sono molto interessato perché..."
              value={messaggio}
              onChange={(e) => setMessaggio(e.target.value)}
            />
          </div>

          {/* Errore Inline */}
          {errore && (
            <div className="bg-red-950 text-red-200 p-4 rounded-xl text-sm font-bold border border-red-900 flex items-center gap-2 animate-pulse">
              ⚠️ {errore}
            </div>
          )}

          {/* Bottone Invio */}
          <button 
            onClick={handleApply}
            disabled={loading}
            className="w-full bg-black text-white font-black py-6 rounded-[2rem] shadow-2xl hover:scale-[1.01] hover:bg-gray-900 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-[0.2em] text-lg md:text-xl border-4 border-transparent hover:border-white/20"
          >
            {loading ? '🚀 INVIO IN CORSO...' : 'INVIA CANDIDATURA'}
          </button>
        </div>
      </div>
    </div>
  )
}