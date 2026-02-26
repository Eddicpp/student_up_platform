'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/app/context/UserContext'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function AdminPanel() {
  const { user, loading: userLoading } = useUser()
  const router = useRouter()
  const supabase = createClient()

  // Aggiunto 'corsi' ai tab possibili
  const [activeTab, setActiveTab] = useState<'utenti' | 'progetti' | 'corsi' | 'logs'>('utenti')
  
  const [users, setUsers] = useState<any[]>([])
  const [projects, setProjects] = useState<any[]>([])
  const [logs, setLogs] = useState<any[]>([])
  
  // NUOVO STATO: Richieste dei corsi
  const [richiesteCorsi, setRichiesteCorsi] = useState<any[]>([])
  
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [hideStaffProjects, setHideStaffProjects] = useState(false)
  
  // STATO PER IL CARICAMENTO DEI CORSI
  const [seedingCorsi, setSeedingCorsi] = useState(false)

  // PROTEZIONE ADMIN
  useEffect(() => {
    if (!userLoading && (!user || !user.is_system_admin)) {
      router.push('/dashboard')
    }
  }, [user, userLoading, router])

  // FETCH DATI
  const fetchData = async () => {
    setLoading(true)
    
    // Fetch Utenti
    const { data: userData } = await supabase
      .from('studente')
      .select('*')
      .order('cognome', { ascending: true })
    if (userData) setUsers(userData as any[])

    // Fetch Progetti
    const { data: projectData } = await supabase
      .from('bando')
      .select('*, autore:studente(nome, cognome, avatar_url, is_system_admin)') 
      .order('data_creazione', { ascending: false })
    if (projectData) setProjects(projectData as any[])

    // FETCH RICHIESTE CORSI PENDENTI
    const { data: richiesteData } = await (supabase as any)
      .from('richiesta_nuovo_corso')
      .select('*, studente(nome, cognome, avatar_url)')
      .eq('stato', 'pending')
      .order('created_at', { ascending: false })
    if (richiesteData) setRichiesteCorsi(richiesteData as any[])

    // FETCH LOGS (Solo Owner)
    if (user?.is_owner) {
      const { data: logData, error: logError } = await (supabase as any)
        .from('admin_log')
        .select('*, studente(nome, cognome, avatar_url)') 
        .order('created_at', { ascending: false })
        
      if (logError) console.error("Errore recupero log:", JSON.stringify(logError, null, 2))
      if (logData) setLogs(logData as any[])
    }

    setLoading(false)
  }

  useEffect(() => {
    if (user?.is_system_admin) fetchData()
  }, [user])

  // FUNZIONE SEGRETA: Registra le azioni nel database
  const registraLog = async (azione: string, bersaglio: string, dettagli: string = '') => {
    await (supabase as any).from('admin_log').insert([
      { admin_id: user?.id, azione, bersaglio, dettagli }
    ])
  }

  // --- AZIONI DB: CARICA CORSI DI STUDIO ---
  const caricaCorsi = async () => {
    if (!confirm("⚠️ Vuoi caricare tutti i corsi di studio nel database? (Fallo solo se la lista è vuota per evitare duplicati)")) return;
    
    setSeedingCorsi(true)
    
    const corsi = [
      'Informatica', 'Ingegneria Informatica', 'Ingegneria Meccanica', 'Ingegneria Gestionale',
      'Ingegneria Aerospaziale', 'Ingegneria Elettronica', 'Ingegneria Biomedica', 'Ingegneria Civile',
      'Economia Aziendale', 'Economia e Management', 'Economia e Finanza', 'Scienze della Comunicazione',
      'Scienze Politiche', 'Giurisprudenza', 'Lettere Moderne', 'Lingue e Letterature Straniere',
      'Filosofia', 'Design e Comunicazione Visiva', 'Architettura', 'Medicina e Chirurgia',
      'Odontoiatria', 'Scienze Infermieristiche', 'Biotecnologie', 'Scienze Biologiche',
      'Fisica', 'Matematica', 'Chimica', 'Psicologia', 'Scienze della Formazione Primaria',
      'Scienze Motorie e Sportive', 'Scienze dei Beni Culturali', 'DAMS (Discipline Arti, Musica e Spettacolo)',
      'Scienze Agrarie e Alimentari', 'Medicina Veterinaria'
    ]

    const corsiDaInserire = corsi.map(corso => ({ nome: corso }))

    // Corretto nome tabella in 'corso_di_studi'
    const { error } = await (supabase as any)
      .from('corso_di_studi')
      .insert(corsiDaInserire)

    if (error) {
      alert("Errore durante l'inserimento: " + error.message)
    } else {
      await registraLog('POPOLAMENTO DB', 'Tabella Corsi', `Inseriti ${corsi.length} corsi base.`)
      alert("Corsi caricati con successo! 🎉")
      fetchData()
    }
    
    setSeedingCorsi(false)
  }

  // --- GESTIONE RICHIESTE NUOVI CORSI ---
  const gestisciRichiesta = async (richiesta: any, azione: 'approvato' | 'rifiutato') => {
    try {
      if (azione === 'approvato') {
        // 1. Aggiungiamo il corso alla tabella ufficiale
        const { data: nuovoCorso, error: insertError } = await (supabase as any)
          .from('corso_di_studi')
          .insert({ nome: richiesta.nome_corso })
          .select()
          .single()

        if (insertError) throw insertError

        // 2. Colleghiamo lo studente a questo nuovo corso automaticamente
        if (nuovoCorso) {
          await (supabase as any).from('studente_corso').insert({
            studente_id: richiesta.studente_id,
            corso_id: nuovoCorso.id,
            anno_inizio: new Date().getFullYear() // Fallback
          })
        }
      }

      // 3. Aggiorniamo lo stato della richiesta
      await (supabase as any)
        .from('richiesta_nuovo_corso')
        .update({ stato: azione })
        .eq('id', richiesta.id)

      await registraLog(
        azione === 'approvato' ? 'APPROVAZIONE CORSO' : 'RIFIUTO CORSO', 
        richiesta.nome_corso, 
        `Richiesto da: ${richiesta.studente.nome} ${richiesta.studente.cognome}`
      )
      
      alert(azione === 'approvato' ? "Corso approvato e aggiunto! ✅" : "Richiesta rifiutata ❌")
      fetchData() // Aggiorna la lista
    } catch (err: any) {
      alert("Errore: " + err.message)
    }
  }

  // --- AZIONI UTENTI ---
  const toggleAdmin = async (targetUser: any) => {
    if (!user?.is_owner) return alert("Solo l'Owner può gestire lo Staff!")
    if (targetUser.is_owner) return alert("L'Owner non può essere declassato!")
    
    const { error } = await supabase
      .from('studente')
      .update({ is_system_admin: !targetUser.is_system_admin } as any)
      .eq('id', targetUser.id)
    
    if (!error) {
      await registraLog(
        targetUser.is_system_admin ? 'RIMOZIONE STAFF' : 'PROMOZIONE STAFF', 
        `${targetUser.nome} ${targetUser.cognome}`, 
        targetUser.email
      )
      fetchData()
    } else alert("Errore: " + error.message)
  }

  const changeAccountStatus = async (targetUser: any, newStatus: 'attivo' | 'bannato') => {
    if (targetUser.is_owner) return alert("Non puoi modificare lo stato dell'Owner!")
    
    const { error } = await supabase
      .from('studente')
      .update({ stato_account: newStatus, pausa_fino_a: null } as any)
      .eq('id', targetUser.id)

    if (!error) {
      await registraLog(newStatus === 'bannato' ? 'BAN UTENTE' : 'SBLOCCO UTENTE', `${targetUser.nome} ${targetUser.cognome}`, `Status impostato su: ${newStatus}`)
      fetchData()
    } else alert("Errore: " + error.message)
  }

  const applyPause = async (targetUser: any) => {
    const selectEl = document.getElementById(`pause-time-${targetUser.id}`) as HTMLSelectElement;
    const minutes = parseInt(selectEl.value);
    
    const scadenza = new Date();
    scadenza.setMinutes(scadenza.getMinutes() + minutes);

    const { error } = await supabase
      .from('studente')
      .update({ stato_account: 'in_pausa', pausa_fino_a: scadenza.toISOString() } as any)
      .eq('id', targetUser.id)

    if (!error) {
      await registraLog('SOSPENSIONE', `${targetUser.nome} ${targetUser.cognome}`, `Sospeso per ${minutes} minuti`)
      fetchData()
    } else alert("Errore: " + error.message)
  }

  // --- AZIONI PROGETTI ---
  const toggleProjectPause = async (project: any) => {
    let motivo = project.motivo_pausa;
    const nuovoStato = project.stato === 'pausa' ? 'aperto' : 'pausa';
    
    if (nuovoStato === 'pausa') {
      const inputMotivo = window.prompt("Inserisci il motivo della sospensione:", "Sospensione per verifica contenuti.");
      if (inputMotivo === null) return; 
      motivo = inputMotivo;
    }

    const { error } = await supabase
      .from('bando')
      .update({ 
        stato: nuovoStato,
        motivo_pausa: motivo 
      } as any)
      .eq('id', project.id)

    if (!error) {
      await registraLog(nuovoStato === 'pausa' ? 'SOSPENSIONE PROGETTO' : 'RIATTIVAZIONE PROGETTO', project.titolo, motivo)
      fetchData()
    } else {
      alert("Errore: " + error.message)
    }
  }

  const deleteProject = async (project: any) => {
    if (!confirm(`⚠️ SEI SICURO? Questa azione cancellerà il progetto "${project.titolo}" per sempre e in modo irreversibile.`)) return

    try {
      const { error } = await supabase
        .from('bando')
        .delete()
        .eq('id', project.id)

      if (error) throw error;

      await registraLog('ELIMINAZIONE PROGETTO', project.titolo, `Id Progetto: ${project.id}`)
      setProjects(projects.filter(p => p.id !== project.id))
      
    } catch (error: any) {
      alert("Errore durante l'eliminazione. Assicurati di avere i permessi RLS corretti.\nDettaglio: " + error.message)
    }
  }

  // FILTRI RICERCA
  const filteredUsers = users.filter(u => 
    `${u.nome} ${u.cognome}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const filteredProjects = projects.filter(p => {
    const matchesSearch = p.titolo?.toLowerCase().includes(searchTerm.toLowerCase())
    const isStaffProject = p.autore?.is_system_admin === true
    const matchesStaffFilter = hideStaffProjects ? !isStaffProject : true
    return matchesSearch && matchesStaffFilter
  })

  const filteredLogs = logs.filter(l => 
    l.azione.toLowerCase().includes(searchTerm.toLowerCase()) || 
    l.bersaglio.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (l.studente && `${l.studente.nome} ${l.studente.cognome}`.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  if (userLoading || loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl animate-bounce mb-4">⚙️</div>
          <p className="text-gray-900 font-black uppercase tracking-widest text-xl">Caricamento Pannello...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8 pb-20 max-w-7xl mx-auto">
      
      {/* HEADER & RICERCA CARTOON */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 bg-amber-400 p-8 rounded-3xl border-4 border-gray-900 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] relative overflow-hidden">
        <div className="absolute top-[-20px] right-[-20px] text-9xl opacity-20 pointer-events-none rotate-12">🛠️</div>
        <div className="relative z-10">
          <h1 className="text-4xl md:text-5xl font-black uppercase italic tracking-tighter text-gray-900 leading-none">
            Pannello <span className="text-white drop-shadow-[2px_2px_0px_rgba(0,0,0,1)]">Staff</span>
          </h1>
          <p className="text-gray-900 font-bold uppercase text-sm tracking-widest mt-2 bg-white inline-block px-3 py-1 rounded-lg border-2 border-gray-900">
            Centro di controllo totale
          </p>
        </div>
        <div className="relative z-10 w-full md:w-auto">
          <div className="relative group">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl z-20 transition-transform group-focus-within:scale-110">🔍</span>
            <input 
              type="text" 
              placeholder="Cerca utente, progetto..."
              className="w-full md:w-80 px-4 pl-12 py-3 bg-white border-4 border-gray-900 rounded-xl text-gray-900 font-black placeholder:text-gray-500 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] focus:outline-none focus:translate-x-[4px] focus:translate-y-[4px] focus:shadow-none transition-all text-lg"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* NAVIGAZIONE TABS CARTOON */}
      <div className="flex flex-wrap gap-4">
        <button 
          onClick={() => setActiveTab('utenti')}
          className={`flex-1 sm:flex-none px-6 py-4 rounded-xl font-black text-sm md:text-base uppercase tracking-widest transition-all border-4 border-gray-900 flex items-center justify-center gap-2 ${
            activeTab === 'utenti' ? 'bg-blue-400 text-gray-900 shadow-none translate-x-[4px] translate-y-[4px]' : 'bg-white text-gray-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:bg-gray-50 hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'
          }`}
        >
          <span className="text-xl">👤</span> Utenti ({users.length})
        </button>
        <button 
          onClick={() => setActiveTab('progetti')}
          className={`flex-1 sm:flex-none px-6 py-4 rounded-xl font-black text-sm md:text-base uppercase tracking-widest transition-all border-4 border-gray-900 flex items-center justify-center gap-2 ${
            activeTab === 'progetti' ? 'bg-red-400 text-gray-900 shadow-none translate-x-[4px] translate-y-[4px]' : 'bg-white text-gray-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:bg-gray-50 hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'
          }`}
        >
          <span className="text-xl">📁</span> Progetti ({projects.length})
        </button>

        {/* NUOVO TAB: CORSI */}
        <button 
          onClick={() => setActiveTab('corsi')}
          className={`flex-1 sm:flex-none px-6 py-4 rounded-xl font-black text-sm md:text-base uppercase tracking-widest transition-all border-4 border-gray-900 flex items-center justify-center gap-2 ${
            activeTab === 'corsi' ? 'bg-green-400 text-gray-900 shadow-none translate-x-[4px] translate-y-[4px]' : 'bg-white text-gray-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:bg-gray-50 hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'
          }`}
        >
          <span className="text-xl">🎓</span> Corsi 
          {richiesteCorsi.length > 0 && (
            <span className="bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full ml-1 animate-pulse">{richiesteCorsi.length}</span>
          )}
        </button>

        {user?.is_owner && (
          <button 
            onClick={() => setActiveTab('logs')}
            className={`flex-1 sm:flex-none px-6 py-4 rounded-xl font-black text-sm md:text-base uppercase tracking-widest transition-all border-4 border-gray-900 flex items-center justify-center gap-2 ${
              activeTab === 'logs' ? 'bg-gray-900 text-white shadow-none translate-x-[4px] translate-y-[4px]' : 'bg-white text-gray-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:bg-gray-50 hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'
            }`}
          >
            <span className="text-xl">🕵️‍♂️</span> Log ({logs.length})
          </button>
        )}
      </div>

      {/* --- TABELLA UTENTI --- */}
      {activeTab === 'utenti' && (
        <div className="bg-white rounded-3xl shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] overflow-hidden border-4 border-gray-900 animate-in fade-in slide-in-from-bottom-4">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-900 border-b-4 border-gray-900 text-[11px] font-black uppercase tracking-widest text-white">
                  <th className="p-4 whitespace-nowrap">Utente</th>
                  <th className="p-4 whitespace-nowrap">Email</th>
                  <th className="p-4 whitespace-nowrap">Ruolo</th>
                  <th className="p-4 whitespace-nowrap">Stato</th>
                  <th className="p-4 text-right whitespace-nowrap">Azioni</th>
                </tr>
              </thead>
              <tbody className="divide-y-4 divide-gray-900">
                {filteredUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-blue-50 transition-colors">
                    {/* ALLINEAMENTO VERTICALE E IMMAGINE ROTONDA */}
                    <td className="p-4 align-middle">
                      <div className="flex items-center gap-3">
                        <img 
                          src={u.avatar_url || '/default-avatar.png'} 
                          alt="Avatar" 
                          className="w-10 h-10 rounded-full object-cover border-2 border-gray-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] flex-shrink-0" 
                        />
                        <span className="font-black text-gray-900 uppercase text-sm leading-none m-0 pt-1">
                          {u.nome} {u.cognome}
                        </span>
                      </div>
                    </td>
                    <td className="p-4 align-middle">
                      <span className="text-xs font-bold text-gray-700 bg-white border-2 border-gray-900 px-3 py-1.5 rounded-lg shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] inline-block m-0">
                        {u.email}
                      </span>
                    </td>
                    <td className="p-4 align-middle">
                      <div className="flex items-center m-0">
                        {u.is_owner ? (
                          <span className="inline-flex items-center gap-1 bg-yellow-300 text-gray-900 border-2 border-gray-900 text-[10px] font-black px-3 py-1.5 rounded-xl uppercase tracking-widest shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] whitespace-nowrap">👑 OWNER</span>
                        ) : u.is_system_admin ? (
                          <span className="inline-flex items-center gap-1 bg-black text-white border-2 border-black text-[10px] font-black px-3 py-1.5 rounded-xl uppercase tracking-widest shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] whitespace-nowrap">🛡️ STAFF</span>
                        ) : (
                          <span className="inline-flex items-center bg-gray-100 text-gray-600 border-2 border-gray-400 text-[10px] font-black px-3 py-1.5 rounded-xl uppercase tracking-widest whitespace-nowrap">STUDENTE</span>
                        )}
                      </div>
                    </td>
                    <td className="p-4 align-middle">
                      <div className="flex items-center m-0">
                        {u.stato_account === 'bannato' ? (
                           <span className="inline-flex items-center gap-1 bg-red-500 text-white border-2 border-gray-900 font-black text-[10px] uppercase px-3 py-1.5 rounded-xl shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] whitespace-nowrap">🚫 Bannato</span>
                        ) : u.stato_account === 'in_pausa' ? (
                           <span className="inline-flex items-center gap-1 bg-orange-400 text-gray-900 border-2 border-gray-900 font-black text-[10px] uppercase px-3 py-1.5 rounded-xl shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] whitespace-nowrap">⏸ Pausa</span>
                        ) : (
                           <span className="inline-flex items-center gap-1 bg-green-400 text-gray-900 border-2 border-gray-900 font-black text-[10px] uppercase px-3 py-1.5 rounded-xl shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] whitespace-nowrap">✅ Attivo</span>
                        )}
                      </div>
                    </td>
                    <td className="p-4 align-middle">
                      <div className="flex items-center justify-end gap-2 flex-wrap min-w-[180px] m-0">
                        <Link 
                          href={`/dashboard/user/${u.id}`} 
                          className="px-3 py-2 rounded-xl font-black text-[10px] uppercase bg-white border-2 border-gray-900 text-gray-900 hover:bg-gray-100 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
                        >
                          👁️ Profilo
                        </Link>
                        {!u.is_owner && (
                          <>
                            {u.stato_account === 'in_pausa' ? (
                               user?.is_owner && (
                                 <button 
                                   onClick={() => changeAccountStatus(u, 'attivo')} 
                                   className="px-3 py-2 rounded-xl font-black text-[10px] uppercase bg-green-400 border-2 border-gray-900 text-gray-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
                                 >
                                   Sblocca
                                 </button>
                               )
                            ) : u.stato_account === 'attivo' && (
                               <div className="flex items-center gap-1 bg-white rounded-xl p-1 border-2 border-gray-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                                 <select 
                                   id={`pause-time-${u.id}`} 
                                   className="appearance-none text-[10px] font-black bg-transparent text-gray-900 outline-none cursor-pointer pl-2 pr-4 uppercase tracking-wider"
                                 >
                                   <option value="10">10 Min</option>
                                   <option value="30">30 Min</option>
                                   <option value="60">1 Ora</option>
                                   <option value="1440">24 Ore</option>
                                   <option value="4320">3 Gg</option>
                                   <option value="10080">1 Set</option>
                                 </select>
                                 <button 
                                   onClick={() => applyPause(u)} 
                                   className="px-2 py-1 rounded-lg bg-orange-400 border-2 border-gray-900 text-gray-900 font-black text-[10px] uppercase hover:bg-orange-500 transition-colors m-0"
                                 >
                                   ⏸
                                 </button>
                               </div>
                            )}
                            {user?.is_owner && (
                              <>
                                <button 
                                  onClick={() => toggleAdmin(u)}
                                  className={`px-3 py-2 rounded-xl font-black text-[10px] uppercase border-2 border-gray-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all ${
                                    u.is_system_admin ? 'bg-gray-900 text-white' : 'bg-blue-300 text-gray-900'
                                  }`}
                                >
                                  {u.is_system_admin ? '- Staff' : '+ Staff'}
                                </button>
                                
                                {u.stato_account !== 'bannato' ? (
                                  <button 
                                    onClick={() => changeAccountStatus(u, 'bannato')} 
                                    className="px-3 py-2 rounded-xl font-black text-[10px] uppercase bg-red-500 border-2 border-gray-900 text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
                                  >
                                    Banna
                                  </button>
                                ) : (
                                  <button 
                                    onClick={() => changeAccountStatus(u, 'attivo')} 
                                    className="px-3 py-2 rounded-xl font-black text-[10px] uppercase bg-gray-300 border-2 border-gray-900 text-gray-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
                                  >
                                    Revoca Ban
                                  </button>
                                )}
                              </>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* --- TABELLA PROGETTI --- */}
      {activeTab === 'progetti' && (
        <div className="animate-in fade-in slide-in-from-bottom-4">
          <div className="flex justify-end mb-6">
            <button 
              onClick={() => setHideStaffProjects(!hideStaffProjects)}
              className={`px-4 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest border-4 border-gray-900 transition-all flex items-center gap-2 ${
                hideStaffProjects 
                  ? 'bg-gray-900 text-white shadow-none translate-x-[4px] translate-y-[4px]' 
                  : 'bg-white text-gray-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'
              }`}
            >
              {hideStaffProjects ? '👀 Mostra Progetti Staff' : '🙈 Nascondi Progetti Staff'}
            </button>
          </div>

          <div className="bg-white rounded-3xl shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] overflow-hidden border-4 border-gray-900">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-red-500 border-b-4 border-gray-900 text-[11px] font-black uppercase tracking-widest text-white">
                    <th className="p-4 whitespace-nowrap">Progetto</th>
                    <th className="p-4 whitespace-nowrap">Creatore</th>
                    <th className="p-4 whitespace-nowrap">Stato Visibilità</th>
                    <th className="p-4 text-right whitespace-nowrap">Azioni</th>
                  </tr>
                </thead>
                <tbody className="divide-y-4 divide-gray-900">
                  {filteredProjects.map((p) => (
                    <tr key={p.id} className="hover:bg-red-50 transition-colors">
                      <td className="p-4 align-middle">
                        <div className="flex flex-col justify-center m-0">
                          <p className="font-black text-gray-900 uppercase text-base leading-none mb-1.5">{p.titolo}</p>
                          <p className="text-[10px] text-gray-600 font-bold uppercase line-clamp-1 bg-gray-100 px-2 py-1 rounded-lg border-2 border-gray-300 inline-block w-fit m-0">
                            {p.descrizione}
                          </p>
                        </div>
                      </td>
                      <td className="p-4 align-middle">
                        {p.autore ? (
                          <div className="flex items-center gap-3 m-0">
                            <img 
                              src={p.autore.avatar_url || '/default-avatar.png'} 
                              alt="Avatar" 
                              className="w-10 h-10 rounded-full object-cover border-2 border-gray-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] flex-shrink-0" 
                            />
                            <div className="flex flex-col justify-center">
                              <span className="text-xs font-black text-gray-900 uppercase leading-none mb-1.5 mt-1">{p.autore.nome} {p.autore.cognome}</span>
                              <div className="m-0 leading-none">
                                {p.autore.is_owner ? (
                                  <span className="inline-flex items-center gap-1 bg-yellow-300 border-2 border-gray-900 text-gray-900 text-[9px] font-black px-2 py-0.5 rounded-lg uppercase tracking-widest">👑 OWNER</span>
                                ) : p.autore.is_system_admin ? (
                                  <span className="inline-flex items-center gap-1 bg-black text-white border-2 border-black text-[9px] font-black px-2 py-0.5 rounded-lg uppercase tracking-widest">🛡️ STAFF</span>
                                ) : null}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs font-black text-gray-400 uppercase bg-gray-100 px-2 py-1 rounded-lg border-2 border-gray-300 m-0">N/A</span>
                        )}
                      </td>
                      <td className="p-4 align-middle">
                        <div className="flex items-center m-0">
                          {p.stato === 'pausa' ? (
                            <span className="bg-orange-400 text-gray-900 border-2 border-gray-900 text-[10px] font-black px-3 py-1.5 rounded-xl uppercase tracking-widest shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] whitespace-nowrap m-0">
                              ⏸ IN PAUSA
                            </span>
                          ) : p.stato === 'chiuso' ? (
                             <span className="bg-gray-700 text-white border-2 border-gray-900 text-[10px] font-black px-3 py-1.5 rounded-xl uppercase tracking-widest shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] whitespace-nowrap m-0">
                              🔒 CHIUSO
                            </span>
                          ) : (
                            <span className="bg-green-400 text-gray-900 border-2 border-gray-900 text-[10px] font-black px-3 py-1.5 rounded-xl uppercase tracking-widest shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] whitespace-nowrap m-0">
                              ✅ PUBBLICO
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-4 align-middle">
                        <div className="flex items-center justify-end gap-2 flex-nowrap m-0">
                          <button 
                            onClick={() => toggleProjectPause(p)}
                            className="px-4 py-2 rounded-xl font-black text-[10px] uppercase bg-white border-2 border-gray-900 text-gray-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-orange-300 hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all whitespace-nowrap m-0"
                          >
                            {p.stato === 'pausa' ? '▶ Riattiva' : '⏸ Pausa'}
                          </button>
                          <button 
                            onClick={() => deleteProject(p)}
                            className="px-4 py-2 rounded-xl font-black text-[10px] uppercase bg-red-500 border-2 border-gray-900 text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all whitespace-nowrap m-0"
                          >
                            🗑️ Elimina
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredProjects.length === 0 && (
                    <tr><td colSpan={4} className="p-10 text-center text-gray-500 font-black uppercase text-sm tracking-widest">Nessun progetto trovato</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
      

      {/* --- NUOVO TAB: CORSI E DATABASE TOOLS (Visibile a tutti gli admin) --- */}
      {activeTab === 'corsi' && (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
          
          {/* SEZIONE: GESTIONE RICHIESTE CORSI */}
          <div className="bg-white rounded-3xl shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] overflow-hidden border-4 border-gray-900">
            <div className="bg-green-400 px-6 py-4 border-b-4 border-gray-900 flex items-center justify-between">
              <p className="text-gray-900 font-black text-sm uppercase tracking-widest m-0">
                📥 Richieste Nuovi Corsi ({richiesteCorsi.length})
              </p>
            </div>
            
            <div className="p-6 bg-gray-50">
              {richiesteCorsi.length === 0 ? (
                <div className="text-center py-8">
                  <span className="text-4xl block mb-2 opacity-50">🎉</span>
                  <p className="font-black text-gray-500 uppercase tracking-widest">Nessuna richiesta in sospeso!</p>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {richiesteCorsi.map(r => (
                    <div key={r.id} className="bg-white p-4 rounded-2xl border-4 border-gray-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex flex-col justify-between">
                      <div className="mb-4">
                        <span className="text-[10px] font-black uppercase text-gray-500 tracking-widest">Corso Richiesto:</span>
                        <h4 className="text-xl font-black text-gray-900 uppercase leading-tight mt-1">{r.nome_corso}</h4>
                        
                        <div className="mt-3 flex items-center gap-2">
                          <img src={r.studente?.avatar_url || '/default-avatar.png'} className="w-6 h-6 rounded-full border border-gray-900" alt="avatar" />
                          <span className="text-xs font-bold text-gray-600">Da: {r.studente?.nome} {r.studente?.cognome}</span>
                        </div>
                      </div>
                      
                      <div className="flex gap-2 border-t-2 border-gray-100 pt-3">
                        <button 
                          onClick={() => gestisciRichiesta(r, 'approvato')}
                          className="flex-1 bg-green-400 border-2 border-gray-900 text-gray-900 font-black text-[10px] uppercase tracking-widest py-2 rounded-xl shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all"
                        >
                          ✅ Approva
                        </button>
                        <button 
                          onClick={() => gestisciRichiesta(r, 'rifiutato')}
                          className="flex-1 bg-red-400 border-2 border-gray-900 text-gray-900 font-black text-[10px] uppercase tracking-widest py-2 rounded-xl shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all"
                        >
                          ❌ Rifiuta
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* SEZIONE: STRUMENTI DATABASE (Il bottone che non vedevi) */}
          <div className="bg-white rounded-3xl shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-6 sm:p-8 border-4 border-gray-900">
            <h3 className="font-black text-gray-900 uppercase tracking-widest mb-2 flex items-center gap-2">
              <span className="text-2xl">🧰</span> Strumenti Database
            </h3>
            <p className="text-sm font-bold text-gray-500 mb-6">Usa questo pulsante per inserire rapidamente una lista di 30+ corsi di laurea standard (Informatica, Ingegneria, Medicina, ecc.) nel database. Fallo solo una volta a sistema vuoto.</p>
            
            <button 
              onClick={caricaCorsi}
              disabled={seedingCorsi}
              className="w-full sm:w-auto px-8 py-4 bg-yellow-300 border-[3px] border-gray-900 text-gray-900 font-black uppercase tracking-widest rounded-xl hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
            >
              {seedingCorsi ? (
                <><span className="animate-spin text-xl">⏳</span> Caricamento in corso...</>
              ) : (
                <><span className="text-xl">📚</span> Popola Tabella Corsi Base</>
              )}
            </button>
          </div>
        </div>
      )}


      {/* --- TABELLA LOGS (SOLO OWNER) --- */}
      {activeTab === 'logs' && user?.is_owner && (
        <div className="animate-in fade-in slide-in-from-bottom-4">
          <div className="bg-white rounded-3xl shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] overflow-hidden border-4 border-gray-900">
            <div className="bg-gray-900 px-6 py-4 border-b-4 border-gray-900 flex items-center justify-between">
              <p className="text-white font-black text-xs uppercase tracking-widest m-0">
                🕵️ Registro Attività Staff
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-100 border-b-4 border-gray-900 text-[11px] font-black uppercase tracking-widest text-gray-600">
                    <th className="p-4 whitespace-nowrap">Data & Ora</th>
                    <th className="p-4 whitespace-nowrap">Chi ha agito</th>
                    <th className="p-4 whitespace-nowrap">Azione Eseguita</th>
                    <th className="p-4 whitespace-nowrap">Bersaglio</th>
                  </tr>
                </thead>
                <tbody className="divide-y-4 divide-gray-900">
                  {filteredLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-amber-50 transition-colors">
                      <td className="p-4 align-middle whitespace-nowrap">
                        <div className="flex flex-col justify-center m-0">
                          <p className="text-xs font-black text-gray-900 bg-white border-2 border-gray-900 px-2 py-1 rounded-lg inline-block shadow-sm m-0 w-fit">
                            {new Date(log.created_at).toLocaleDateString('it-IT')}
                          </p>
                          <p className="text-[10px] font-bold text-gray-500 mt-1 uppercase tracking-wider m-0">
                            {new Date(log.created_at).toLocaleTimeString('it-IT')}
                          </p>
                        </div>
                      </td>
                      <td className="p-4 align-middle">
                        {log.studente ? (
                          <div className="flex items-center gap-3 m-0">
                            <img 
                              src={log.studente.avatar_url || '/default-avatar.png'} 
                              alt="Avatar" 
                              className="w-10 h-10 rounded-full object-cover border-2 border-gray-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] flex-shrink-0" 
                            />
                            <span className="text-xs font-black text-gray-900 uppercase m-0 pt-1">{log.studente.nome} {log.studente.cognome}</span>
                          </div>
                        ) : (
                          <span className="text-xs font-black text-gray-400 uppercase bg-gray-100 px-2 py-1 rounded-lg border-2 border-gray-300 m-0">🤖 Sistema</span>
                        )}
                      </td>
                      <td className="p-4 align-middle">
                        <div className="flex flex-col justify-center m-0">
                          <span className={`inline-block text-[10px] font-black px-3 py-1.5 rounded-xl uppercase tracking-widest border-2 border-gray-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] w-fit m-0 ${
                            log.azione.includes('ELIMINA') || log.azione.includes('BAN') || log.azione.includes('RIFIUT') ? 'bg-red-400 text-gray-900' :
                            log.azione.includes('SOSPENSIONE') || log.azione.includes('PAUSA') ? 'bg-orange-400 text-gray-900' :
                            log.azione.includes('APPROVAZ') ? 'bg-green-400 text-gray-900' :
                            'bg-white text-gray-900'
                          }`}>
                            {log.azione}
                          </span>
                          {log.dettagli && (
                            <p className="text-[10px] text-gray-600 font-bold mt-1.5 uppercase tracking-wide break-words max-w-xs m-0">{log.dettagli}</p>
                          )}
                        </div>
                      </td>
                      <td className="p-4 align-middle">
                        <span className="text-sm font-black text-gray-900 uppercase m-0 flex items-center h-full">{log.bersaglio}</span>
                      </td>
                    </tr>
                  ))}
                  {filteredLogs.length === 0 && (
                    <tr><td colSpan={4} className="p-10 text-center text-gray-500 font-black uppercase text-sm tracking-widest">Nessun log registrato</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}