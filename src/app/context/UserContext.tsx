'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { createClient } from '@/lib/supabase/client'

export type UserData = {
  id: string
  email: string
  nome: string
  cognome: string
  avatar_url: string | null
  bio: string | null
  is_system_admin: boolean
  is_owner: boolean // <-- AGGIUNTO
  stato_account: string // <-- AGGIUNTO
  corso_studi: string | null
  anno_corso: number | null
}

type UserContextType = {
  user: UserData | null
  loading: boolean
  refreshUser: () => Promise<void>
}

const UserContext = createContext<UserContextType>({
  user: null,
  loading: true,
  refreshUser: async () => {}
})


export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserData | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  const fetchUser = async () => {
    console.log("🔍 [UserContext] Inizio recupero dati...");
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      
      if (!authUser) {
        console.warn("⚠️ [UserContext] Nessun utente loggato in Auth.");
        setUser(null)
        setLoading(false)
        return
      }

      // 1. Recupero dati base studente
      const { data: studenteData, error: studenteError } = await supabase
        .from('studente')
        .select('*')
        .eq('id', authUser.id)
        .maybeSingle()

      if (studenteError || !studenteData) {
        console.error('❌ [UserContext] Errore database o studente non trovato:', studenteError)
        setUser(null)
        setLoading(false)
        return
      }

      const studente = studenteData as any
      console.log("🛡️ [UserContext] Privilegi Admin:", studente.is_system_admin);

      // 2. Recupero dati corso (Dichiarazione variabili fuori dai blocchi per evitare l'errore)
      let annoCorsoCalcolato: number | null = null
      let corsoNome: string | null = null

      const { data: corsoData } = await supabase
        .from('studente_corso')
        .select(`
          anno_inizio,
          corso:corso_id ( nome )
        `)
        .eq('studente_id', authUser.id)
        .eq('completato', false)
        .maybeSingle()

      if (corsoData) {
        const annoInizio = corsoData.anno_inizio
        const annoCorrente = new Date().getFullYear()
        annoCorsoCalcolato = annoCorrente - annoInizio
        corsoNome = (corsoData.corso as any)?.nome || null
        console.log("🎓 [UserContext] Corso trovato:", corsoNome, "Anno:", annoCorsoCalcolato);
      }

      // 3. Impostazione stato finale
      const finalUserData: UserData = {
        id: studente.id,
        email: studente.email,
        nome: studente.nome,
        cognome: studente.cognome,
        avatar_url: studente.avatar_url ? `${studente.avatar_url}?t=${new Date().getTime()}` : null,
        bio: studente.bio || null,
        is_system_admin: Boolean(studente.is_system_admin),
        is_owner: Boolean(studente.is_owner),
        stato_account: studente.stato_account || 'attivo',
        corso_studi: corsoNome,
        anno_corso: annoCorsoCalcolato
      }

      // 🛑 CONTROLLO SCADENZA PAUSA: Se il tempo è passato, lo riattiviamo in automatico
      if (finalUserData.stato_account === 'in_pausa' && studente.pausa_fino_a) {
        const scadenza = new Date(studente.pausa_fino_a);
        if (new Date() > scadenza) {
          // Il tempo è scaduto! Lo sblocchiamo nel DB
          await supabase.from('studente').update({ stato_account: 'attivo', pausa_fino_a: null } as any).eq('id', studente.id);
          finalUserData.stato_account = 'attivo';
        }
      }

      setUser(finalUserData)

    } catch (err) {
      console.error('💥 [UserContext] Errore critico:', err)
      setUser(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUser()

    // Listener per cambi di auth
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        fetchUser()
      } else if (event === 'SIGNED_OUT') {
        setUser(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  // 🛑 SCHERMATE DI BLOCCO (IL BUTTAFUORI)
  if (user?.stato_account === 'bannato') {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4">
        <h1 className="text-6xl text-red-600 mb-4">🚫</h1>
        <h1 className="text-4xl font-black text-white uppercase tracking-widest text-center">Account Bannato</h1>
        <p className="text-gray-500 mt-4 text-center">L'accesso a StudentUP ti è stato revocato permanentemente.</p>
        <button onClick={() => supabase.auth.signOut().then(() => window.location.href = '/login')} className="mt-8 px-6 py-3 bg-red-600 text-white rounded-xl font-bold uppercase text-sm">Esci</button>
      </div>
    )
  }

  if (user?.stato_account === 'in_pausa') {
    return (
      <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center p-4">
        <h1 className="text-6xl text-orange-500 mb-4">⏸️</h1>
        <h1 className="text-4xl font-black text-white uppercase tracking-widest text-center">Account Sospeso</h1>
        <p className="text-gray-400 mt-4 text-center">Il tuo account è temporaneamente in pausa per violazione del regolamento.</p>
        <button onClick={() => supabase.auth.signOut().then(() => window.location.href = '/login')} className="mt-8 px-6 py-3 border border-orange-500 text-orange-500 rounded-xl font-bold uppercase text-sm">Esci</button>
      </div>
    )
  }

  // Se è tutto ok, carica il sito normalmente
  return (
    <UserContext.Provider value={{ user, loading, refreshUser: fetchUser }}>
      {children}
    </UserContext.Provider>
  )
}



// Hook per usare il context
export function useUser() {
  const context = useContext(UserContext)
  if (!context) {
    throw new Error('useUser deve essere usato dentro UserProvider')
  }
  return context
}
