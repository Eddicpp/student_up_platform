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
  const [loading, setLoading] = useState(false)
  const [inviato, setInviato] = useState(false)
  const supabase = createClient()

  // Se sei Admin (creatore del bando), non mostrare nulla
  if (isAdmin) return null

  /*
  const handleApply = async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { error } = await supabase.from('partecipazione').insert({
        bando_id: bandoId,
        studente_id: user.id,
        messaggio: messaggio,
        stato: 'pending' // ✅ Valore corretto dell'ENUM
      })
      
      if (!error) {
        setInviato(true)
      } else {
        console.error('Errore candidatura:', error)
        alert('Errore durante l\'invio. Riprova.')
      }
    }
    setLoading(false)
  }*/

  const handleApply = async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    
    // DEBUG
    console.log('User ID:', user?.id)
    console.log('Bando ID:', bandoId)
    
    if (user) {
      const { error } = await supabase.from('partecipazione').insert({
        bando_id: bandoId,
        studente_id: user.id,
        messaggio: messaggio,
        stato: 'pending'
      })
      
      if (!error) {
        setInviato(true)
      } else {
        console.error('Errore candidatura:', error)
        // MOSTRA ERRORE DETTAGLIATO
        alert(`Errore: ${error.message} | Codice: ${error.code} | Dettagli: ${error.details}`)
      }
    }
    setLoading(false)
  }

  // Mappa stati per visualizzazione italiana
  const statoLabel: Record<string, string> = {
    'pending': 'In Revisione',
    'accepted': 'Accettata ✅',
    'rejected': 'Non Accettata'
  }

  // Messaggio di conferma se già inviato
  if (haGiaPartecipato || inviato) {
    return (
      <div className="bg-red-800 rounded-[3rem] p-12 text-white text-center shadow-2xl border-4 border-red-700">
        <h4 className="font-black text-4xl uppercase italic mb-2 tracking-tighter">
          Candidatura Ricevuta!
        </h4>
        <p className="text-red-200 text-sm font-black uppercase tracking-widest">
          Stato: {statoLabel[statoCandidatura || 'pending'] || statoCandidatura}
        </p>
      </div>
    )
  }

  // Form candidatura
  return (
    <div className="bg-red-800 rounded-[3.5rem] p-12 text-white shadow-2xl border-4 border-red-700">
      <div className="flex flex-col gap-8">
        <div className="text-center space-y-2">
          <h4 className="font-black text-5xl uppercase italic tracking-tighter">
            Vuoi unirti al team?
          </h4>
          <p className="text-red-200 text-sm font-black uppercase tracking-[0.3em]">
            Presentati al leader ora
          </p>
        </div>
        
        <div className="max-w-4xl mx-auto w-full space-y-6">
          <textarea 
            className="w-full p-8 rounded-[2rem] bg-white/10 border-2 border-white/10 text-white placeholder:text-white/30 focus:bg-white/20 focus:border-white/30 outline-none transition-all text-lg font-medium resize-none shadow-inner"
            placeholder="Scrivi qui perché sei la persona giusta..."
            rows={4}
            value={messaggio}
            onChange={(e) => setMessaggio(e.target.value)}
          />
          <button 
            onClick={handleApply}
            disabled={loading || !messaggio.trim()}
            className="w-full bg-white text-red-800 font-black py-7 rounded-[2rem] shadow-2xl hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-[0.2em] text-xl"
          >
            {loading ? 'INVIO IN CORSO...' : 'INVIA CANDIDATURA 🚀'}
          </button>
        </div>
      </div>
    </div>
  )
}