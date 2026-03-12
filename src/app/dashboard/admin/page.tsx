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

  const [activeTab, setActiveTab] = useState<'utenti' | 'progetti' | 'corsi' | 'logs'>('utenti')
  
  const [users, setUsers] = useState<any[]>([])
  const [projects, setProjects] = useState<any[]>([])
  const [logs, setLogs] = useState<any[]>([])
  const [richiesteCorsi, setRichiesteCorsi] = useState<any[]>([])
  
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [hideStaffProjects, setHideStaffProjects] = useState(false)
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
    
    const { data: userData } = await supabase
      .from('studente')
      .select('*')
      .order('cognome', { ascending: true })
    if (userData) setUsers(userData as any[])

    const { data: projectData } = await supabase
      .from('bando')
      .select('*, autore:studente(nome, cognome, avatar_url, is_system_admin)') 
      .order('data_creazione', { ascending: false })
    if (projectData) setProjects(projectData as any[])

    const { data: richiesteData } = await (supabase as any)
      .from('richiesta_nuovo_corso')
      .select('*, studente(nome, cognome, avatar_url)')
      .eq('stato', 'pending')
      .order('created_at', { ascending: false })
    if (richiesteData) setRichiesteCorsi(richiesteData as any[])

    if (user?.is_owner) {
      const { data: logData } = await (supabase as any)
        .from('admin_log')
        .select('*, studente(nome, cognome, avatar_url)') 
        .order('created_at', { ascending: false })
      if (logData) setLogs(logData as any[])
    }

    setLoading(false)
  }

  useEffect(() => {
    if (user?.is_system_admin) fetchData()
  }, [user])

  const registraLog = async (azione: string, bersaglio: string, dettagli: string = '') => {
    await (supabase as any).from('admin_log').insert([
      { admin_id: user?.id, azione, bersaglio, dettagli }
    ])
  }

  // --- AZIONI DB: CARICA CORSI ---
  const caricaCorsi = async () => {
    if (!confirm("⚠️ Vuoi caricare tutti i corsi di studio nel database?")) return;
    
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

    const { error } = await (supabase as any)
      .from('corso_di_studi')
      .insert(corsi.map(corso => ({ nome: corso })))

    if (error) {
      alert("Errore: " + error.message)
    } else {
      await registraLog('POPOLAMENTO DB', 'Tabella Corsi', `Inseriti ${corsi.length} corsi base.`)
      alert("Corsi caricati con successo! 🎉")
      fetchData()
    }
    
    setSeedingCorsi(false)
  }

  // --- GESTIONE RICHIESTE CORSI ---
  const gestisciRichiesta = async (richiesta: any, azione: 'approvato' | 'rifiutato') => {
    try {
      if (azione === 'approvato') {
        const { data: nuovoCorso, error: insertError } = await (supabase as any)
          .from('corso_di_studi')
          .insert({ nome: richiesta.nome_corso, tipo: richiesta.tipo_corso || 'Laurea' })
          .select()
          .single()

        if (insertError) throw insertError

        if (nuovoCorso) {
          await (supabase as any).from('studente_corso').insert({
            studente_id: richiesta.studente_id,
            corso_id: nuovoCorso.id,
            anno_inizio: new Date().getFullYear()
          })
        }
      }

      await (supabase as any)
        .from('richiesta_nuovo_corso')
        .update({ stato: azione })
        .eq('id', richiesta.id)

      await registraLog(
        azione === 'approvato' ? 'APPROVAZIONE CORSO' : 'RIFIUTO CORSO', 
        richiesta.nome_corso, 
        `Richiesto da: ${richiesta.studente.nome} ${richiesta.studente.cognome}`
      )
      
      alert(azione === 'approvato' ? "Corso approvato! ✅" : "Richiesta rifiutata ❌")
      fetchData()
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
      await registraLog(newStatus === 'bannato' ? 'BAN UTENTE' : 'SBLOCCO UTENTE', `${targetUser.nome} ${targetUser.cognome}`, `Status: ${newStatus}`)
      fetchData()
    } else alert("Errore: " + error.message)
  }

  const applyPause = async (targetUser: any, minutes: number) => {
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
      const inputMotivo = window.prompt("Motivo della sospensione:", "Verifica contenuti.");
      if (inputMotivo === null) return; 
      motivo = inputMotivo;
    }

    const { error } = await supabase
      .from('bando')
      .update({ stato: nuovoStato, motivo_pausa: motivo } as any)
      .eq('id', project.id)

    if (!error) {
      await registraLog(nuovoStato === 'pausa' ? 'SOSPENSIONE PROGETTO' : 'RIATTIVAZIONE PROGETTO', project.titolo, motivo)
      fetchData()
    } else alert("Errore: " + error.message)
  }

  const deleteProject = async (project: any) => {
    if (!confirm(`⚠️ Eliminare "${project.titolo}" definitivamente?`)) return

    try {
      const { error } = await supabase.from('bando').delete().eq('id', project.id)
      if (error) throw error;
      await registraLog('ELIMINAZIONE PROGETTO', project.titolo, `Id: ${project.id}`)
      setProjects(projects.filter(p => p.id !== project.id))
    } catch (error: any) {
      alert("Errore: " + error.message)
    }
  }

  // FILTRI
  const filteredUsers = users.filter(u => 
    `${u.nome} ${u.cognome}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const filteredProjects = projects.filter(p => {
    const matchesSearch = p.titolo?.toLowerCase().includes(searchTerm.toLowerCase())
    const isStaffProject = p.autore?.is_system_admin === true
    return matchesSearch && (hideStaffProjects ? !isStaffProject : true)
  })

  const filteredLogs = logs.filter(l => 
    l.azione.toLowerCase().includes(searchTerm.toLowerCase()) || 
    l.bersaglio.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (l.studente && `${l.studente.nome} ${l.studente.cognome}`.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  // Stili condivisi
  const cardStyle = "bg-white rounded-xl sm:rounded-2xl border-2 sm:border-4 border-gray-900 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] sm:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]"
  const buttonStyle = "border-2 border-gray-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all"

  if (userLoading || loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className={`${cardStyle} p-6 sm:p-10 text-center`}>
          <div className="text-5xl sm:text-6xl animate-bounce mb-4">⚙️</div>
          <p className="text-gray-900 font-black uppercase tracking-widest text-sm sm:text-xl">Caricamento Pannello...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4 sm:space-y-8 pb-20 max-w-7xl mx-auto px-3 sm:px-4">
      
      {/* HEADER */}
      <div className={`${cardStyle} p-4 sm:p-8 bg-amber-400 relative overflow-hidden`}>
        <div className="absolute top-[-20px] right-[-20px] text-6xl sm:text-9xl opacity-20 pointer-events-none rotate-12">🛠️</div>
        <div className="relative z-10">
          <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black uppercase italic tracking-tighter text-gray-900 leading-none">
            Pannello <span className="text-white drop-shadow-[2px_2px_0px_rgba(0,0,0,1)]">Staff</span>
          </h1>
          <p className="text-gray-900 font-bold uppercase text-[10px] sm:text-sm tracking-widest mt-2 bg-white inline-block px-2 sm:px-3 py-1 rounded-lg border-2 border-gray-900">
            Centro di controllo
          </p>
        </div>
        
        {/* Search */}
        <div className="relative mt-4 sm:mt-6">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-lg sm:text-xl">🔍</span>
          <input 
            type="text" 
            placeholder="Cerca..."
            className={`w-full px-4 pl-10 sm:pl-12 py-2.5 sm:py-3 bg-white rounded-xl text-gray-900 font-bold placeholder:text-gray-500 text-sm sm:text-base ${buttonStyle} focus:outline-none`}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* TABS - Scrollable on mobile */}
      <div className="flex gap-2 sm:gap-4 overflow-x-auto pb-2 -mx-3 px-3 sm:mx-0 sm:px-0">
        <button 
          onClick={() => setActiveTab('utenti')}
          className={`flex-shrink-0 px-3 sm:px-6 py-2.5 sm:py-4 rounded-xl font-black text-[10px] sm:text-sm uppercase tracking-wider transition-all border-2 sm:border-4 border-gray-900 flex items-center gap-1.5 sm:gap-2 whitespace-nowrap ${
            activeTab === 'utenti' 
              ? 'bg-blue-400 text-gray-900 shadow-none translate-x-[2px] translate-y-[2px]' 
              : 'bg-white text-gray-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] sm:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]'
          }`}
        >
          <span className="text-base sm:text-xl">👤</span>
          <span className="hidden sm:inline">Utenti</span>
          <span className="text-[9px] sm:text-xs bg-gray-900 text-white px-1.5 sm:px-2 py-0.5 rounded-lg font-black">{users.length}</span>
        </button>

        <button 
          onClick={() => setActiveTab('progetti')}
          className={`flex-shrink-0 px-3 sm:px-6 py-2.5 sm:py-4 rounded-xl font-black text-[10px] sm:text-sm uppercase tracking-wider transition-all border-2 sm:border-4 border-gray-900 flex items-center gap-1.5 sm:gap-2 whitespace-nowrap ${
            activeTab === 'progetti' 
              ? 'bg-red-400 text-gray-900 shadow-none translate-x-[2px] translate-y-[2px]' 
              : 'bg-white text-gray-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] sm:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]'
          }`}
        >
          <span className="text-base sm:text-xl">📁</span>
          <span className="hidden sm:inline">Progetti</span>
          <span className="text-[9px] sm:text-xs bg-gray-900 text-white px-1.5 sm:px-2 py-0.5 rounded-lg font-black">{projects.length}</span>
        </button>

        <button 
          onClick={() => setActiveTab('corsi')}
          className={`flex-shrink-0 px-3 sm:px-6 py-2.5 sm:py-4 rounded-xl font-black text-[10px] sm:text-sm uppercase tracking-wider transition-all border-2 sm:border-4 border-gray-900 flex items-center gap-1.5 sm:gap-2 whitespace-nowrap ${
            activeTab === 'corsi' 
              ? 'bg-green-400 text-gray-900 shadow-none translate-x-[2px] translate-y-[2px]' 
              : 'bg-white text-gray-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] sm:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]'
          }`}
        >
          <span className="text-base sm:text-xl">🎓</span>
          <span className="hidden sm:inline">Corsi</span>
          {richiesteCorsi.length > 0 && (
            <span className="text-[9px] sm:text-xs bg-red-500 text-white px-1.5 sm:px-2 py-0.5 rounded-lg font-black animate-pulse">{richiesteCorsi.length}</span>
          )}
        </button>

        {user?.is_owner && (
          <button 
            onClick={() => setActiveTab('logs')}
            className={`flex-shrink-0 px-3 sm:px-6 py-2.5 sm:py-4 rounded-xl font-black text-[10px] sm:text-sm uppercase tracking-wider transition-all border-2 sm:border-4 border-gray-900 flex items-center gap-1.5 sm:gap-2 whitespace-nowrap ${
              activeTab === 'logs' 
                ? 'bg-gray-900 text-white shadow-none translate-x-[2px] translate-y-[2px]' 
                : 'bg-white text-gray-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] sm:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]'
            }`}
          >
            <span className="text-base sm:text-xl">🕵️</span>
            <span className="hidden sm:inline">Log</span>
            <span className="text-[9px] sm:text-xs bg-amber-400 text-gray-900 px-1.5 sm:px-2 py-0.5 rounded-lg font-black">{logs.length}</span>
          </button>
        )}
      </div>

      {/* TAB: UTENTI */}
      {activeTab === 'utenti' && (
        <div className="space-y-3 sm:space-y-4 animate-in fade-in">
          {/* Desktop: Table */}
          <div className={`${cardStyle} overflow-hidden hidden lg:block`}>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-900 text-[10px] sm:text-[11px] font-black uppercase tracking-widest text-white">
                    <th className="p-3 sm:p-4">Utente</th>
                    <th className="p-3 sm:p-4">Email</th>
                    <th className="p-3 sm:p-4">Ruolo</th>
                    <th className="p-3 sm:p-4">Stato</th>
                    <th className="p-3 sm:p-4 text-right">Azioni</th>
                  </tr>
                </thead>
                <tbody className="divide-y-2 sm:divide-y-4 divide-gray-900">
                  {filteredUsers.map((u) => (
                    <tr key={u.id} className="hover:bg-blue-50 transition-colors">
                      <td className="p-3 sm:p-4">
                        <div className="flex items-center gap-2 sm:gap-3">
                          <img src={u.avatar_url || '/default-avatar.png'} alt="" className="w-8 h-8 sm:w-10 sm:h-10 rounded-full object-cover border-2 border-gray-900" />
                          <span className="font-black text-gray-900 uppercase text-xs sm:text-sm">{u.nome} {u.cognome}</span>
                        </div>
                      </td>
                      <td className="p-3 sm:p-4">
                        <span className="text-[10px] sm:text-xs font-bold text-gray-700 bg-gray-100 px-2 py-1 rounded-lg border border-gray-300">{u.email}</span>
                      </td>
                      <td className="p-3 sm:p-4">
                        {u.is_owner ? (
                          <span className="inline-flex items-center gap-1 bg-yellow-300 text-gray-900 border-2 border-gray-900 text-[9px] sm:text-[10px] font-black px-2 py-1 rounded-lg uppercase">👑 OWNER</span>
                        ) : u.is_system_admin ? (
                          <span className="inline-flex items-center gap-1 bg-gray-900 text-white text-[9px] sm:text-[10px] font-black px-2 py-1 rounded-lg uppercase">🛡️ STAFF</span>
                        ) : (
                          <span className="text-[9px] sm:text-[10px] font-black text-gray-500 uppercase">Studente</span>
                        )}
                      </td>
                      <td className="p-3 sm:p-4">
                        {u.stato_account === 'bannato' ? (
                          <span className="bg-red-500 text-white text-[9px] sm:text-[10px] font-black px-2 py-1 rounded-lg uppercase">🚫 Ban</span>
                        ) : u.stato_account === 'in_pausa' ? (
                          <span className="bg-orange-400 text-gray-900 text-[9px] sm:text-[10px] font-black px-2 py-1 rounded-lg uppercase">⏸ Pausa</span>
                        ) : (
                          <span className="bg-green-400 text-gray-900 text-[9px] sm:text-[10px] font-black px-2 py-1 rounded-lg uppercase">✅ Attivo</span>
                        )}
                      </td>
                      <td className="p-3 sm:p-4">
                        <div className="flex items-center justify-end gap-2 flex-wrap">
                          <Link href={`/dashboard/user/${u.id}`} className={`px-2 py-1.5 rounded-lg font-black text-[9px] uppercase bg-white ${buttonStyle}`}>👁️</Link>
                          {!u.is_owner && user?.is_owner && (
                            <>
                              <button onClick={() => toggleAdmin(u)} className={`px-2 py-1.5 rounded-lg font-black text-[9px] uppercase ${u.is_system_admin ? 'bg-gray-900 text-white' : 'bg-blue-300'} ${buttonStyle}`}>
                                {u.is_system_admin ? '-' : '+'}Staff
                              </button>
                              {u.stato_account !== 'bannato' ? (
                                <button onClick={() => changeAccountStatus(u, 'bannato')} className={`px-2 py-1.5 rounded-lg font-black text-[9px] uppercase bg-red-500 text-white ${buttonStyle}`}>Ban</button>
                              ) : (
                                <button onClick={() => changeAccountStatus(u, 'attivo')} className={`px-2 py-1.5 rounded-lg font-black text-[9px] uppercase bg-green-400 ${buttonStyle}`}>Sblocca</button>
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

          {/* Mobile: Cards */}
          <div className="lg:hidden space-y-3">
            {filteredUsers.map((u) => (
              <div key={u.id} className={`${cardStyle} p-4`}>
                <div className="flex items-start gap-3">
                  <img src={u.avatar_url || '/default-avatar.png'} alt="" className="w-12 h-12 rounded-xl object-cover border-2 border-gray-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]" />
                  <div className="flex-1 min-w-0">
                    <p className="font-black text-gray-900 uppercase text-sm truncate">{u.nome} {u.cognome}</p>
                    <p className="text-[10px] text-gray-700 font-bold truncate">{u.email}</p>
                    
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {u.is_owner ? (
                        <span className="bg-yellow-400 text-gray-900 border-2 border-gray-900 text-[9px] font-black px-2 py-0.5 rounded-lg uppercase shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]">👑 OWNER</span>
                      ) : u.is_system_admin ? (
                        <span className="bg-gray-900 text-white text-[9px] font-black px-2 py-0.5 rounded-lg uppercase">🛡️ STAFF</span>
                      ) : (
                        <span className="bg-gray-300 text-gray-800 text-[9px] font-black px-2 py-0.5 rounded-lg uppercase">Studente</span>
                      )}
                      
                      {u.stato_account === 'bannato' ? (
                        <span className="bg-red-500 text-white text-[9px] font-black px-2 py-0.5 rounded-lg uppercase">🚫 Ban</span>
                      ) : u.stato_account === 'in_pausa' ? (
                        <span className="bg-orange-500 text-white text-[9px] font-black px-2 py-0.5 rounded-lg uppercase">⏸ Pausa</span>
                      ) : (
                        <span className="bg-green-500 text-white text-[9px] font-black px-2 py-0.5 rounded-lg uppercase">✅ Attivo</span>
                      )}
                    </div>
                  </div>
                </div>
                
                {/* Actions */}
                <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t-2 border-gray-300">
                  <Link href={`/dashboard/user/${u.id}`} className={`flex-1 text-center px-3 py-2 rounded-lg font-black text-[10px] uppercase bg-white text-gray-900 ${buttonStyle}`}>
                    👁️ Profilo
                  </Link>
                  {!u.is_owner && (
                    <>
                      {u.stato_account === 'attivo' && (
                        <select 
                          onChange={(e) => e.target.value && applyPause(u, parseInt(e.target.value))}
                          className={`px-2 py-2 rounded-lg font-black text-[10px] uppercase bg-orange-200 text-gray-900 ${buttonStyle} cursor-pointer`}
                          defaultValue=""
                        >
                          <option value="" disabled>⏸ Pausa</option>
                          <option value="10">10 Min</option>
                          <option value="30">30 Min</option>
                          <option value="60">1 Ora</option>
                          <option value="1440">24 Ore</option>
                        </select>
                      )}
                      {user?.is_owner && (
                        <>
                          <button onClick={() => toggleAdmin(u)} className={`px-3 py-2 rounded-lg font-black text-[10px] uppercase ${u.is_system_admin ? 'bg-gray-900 text-white' : 'bg-blue-400 text-gray-900'} ${buttonStyle}`}>
                            {u.is_system_admin ? '- Staff' : '+ Staff'}
                          </button>
                          {u.stato_account !== 'bannato' ? (
                            <button onClick={() => changeAccountStatus(u, 'bannato')} className={`px-3 py-2 rounded-lg font-black text-[10px] uppercase bg-red-500 text-white ${buttonStyle}`}>🚫</button>
                          ) : (
                            <button onClick={() => changeAccountStatus(u, 'attivo')} className={`px-3 py-2 rounded-lg font-black text-[10px] uppercase bg-green-500 text-white ${buttonStyle}`}>Sblocca</button>
                          )}
                        </>
                      )}
                    </>
                  )}
                </div>
              </div>
            ))}
            {filteredUsers.length === 0 && (
              <div className={`${cardStyle} p-8 text-center`}>
                <span className="text-4xl block mb-2">🔍</span>
                <p className="font-black text-gray-600 uppercase text-sm">Nessun utente trovato</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB: PROGETTI */}
      {activeTab === 'progetti' && (
        <div className="space-y-3 sm:space-y-4 animate-in fade-in">
          {/* Filter toggle */}
          <div className="flex justify-end">
            <button 
              onClick={() => setHideStaffProjects(!hideStaffProjects)}
              className={`px-3 py-2 rounded-xl font-black text-[10px] sm:text-xs uppercase tracking-wider border-2 border-gray-900 transition-all flex items-center gap-2 ${
                hideStaffProjects ? 'bg-gray-900 text-white' : 'bg-white text-gray-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'
              }`}
            >
              {hideStaffProjects ? '👀 Mostra Staff' : '🙈 Nascondi Staff'}
            </button>
          </div>

          {/* Desktop: Table */}
          <div className={`${cardStyle} overflow-hidden hidden lg:block`}>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-red-500 text-[10px] sm:text-[11px] font-black uppercase tracking-widest text-white">
                    <th className="p-3 sm:p-4">Progetto</th>
                    <th className="p-3 sm:p-4">Creatore</th>
                    <th className="p-3 sm:p-4">Stato</th>
                    <th className="p-3 sm:p-4 text-right">Azioni</th>
                  </tr>
                </thead>
                <tbody className="divide-y-2 sm:divide-y-4 divide-gray-900">
                  {filteredProjects.map((p) => (
                    <tr key={p.id} className="hover:bg-red-50 transition-colors">
                      <td className="p-3 sm:p-4">
                        <p className="font-black text-gray-900 uppercase text-sm">{p.titolo}</p>
                        <p className="text-[10px] text-gray-500 font-bold line-clamp-1 mt-1">{p.descrizione}</p>
                      </td>
                      <td className="p-3 sm:p-4">
                        {p.autore && (
                          <div className="flex items-center gap-2">
                            <img src={p.autore.avatar_url || '/default-avatar.png'} alt="" className="w-8 h-8 rounded-full object-cover border-2 border-gray-900" />
                            <span className="text-xs font-black text-gray-900 uppercase">{p.autore.nome} {p.autore.cognome}</span>
                          </div>
                        )}
                      </td>
                      <td className="p-3 sm:p-4">
                        {p.stato === 'pausa' ? (
                          <span className="bg-orange-400 text-gray-900 text-[10px] font-black px-2 py-1 rounded-lg uppercase">⏸ Pausa</span>
                        ) : p.stato === 'chiuso' ? (
                          <span className="bg-gray-700 text-white text-[10px] font-black px-2 py-1 rounded-lg uppercase">🔒 Chiuso</span>
                        ) : (
                          <span className="bg-green-400 text-gray-900 text-[10px] font-black px-2 py-1 rounded-lg uppercase">✅ Pubblico</span>
                        )}
                      </td>
                      <td className="p-3 sm:p-4">
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={() => toggleProjectPause(p)} className={`px-3 py-1.5 rounded-lg font-black text-[10px] uppercase bg-white ${buttonStyle}`}>
                            {p.stato === 'pausa' ? '▶' : '⏸'}
                          </button>
                          <button onClick={() => deleteProject(p)} className={`px-3 py-1.5 rounded-lg font-black text-[10px] uppercase bg-red-500 text-white ${buttonStyle}`}>🗑️</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile: Cards */}
          <div className="lg:hidden space-y-3">
            {filteredProjects.map((p) => (
              <div key={p.id} className={`${cardStyle} p-4`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-black text-gray-900 uppercase text-sm">{p.titolo}</p>
                    <p className="text-[10px] text-gray-700 font-bold line-clamp-2 mt-1">{p.descrizione}</p>
                  </div>
                  {p.stato === 'pausa' ? (
                    <span className="bg-orange-500 text-white text-[9px] font-black px-2 py-1 rounded-lg uppercase flex-shrink-0">⏸</span>
                  ) : p.stato === 'chiuso' ? (
                    <span className="bg-gray-700 text-white text-[9px] font-black px-2 py-1 rounded-lg uppercase flex-shrink-0">🔒</span>
                  ) : (
                    <span className="bg-green-500 text-white text-[9px] font-black px-2 py-1 rounded-lg uppercase flex-shrink-0">✅</span>
                  )}
                </div>
                
                {p.autore && (
                  <div className="flex items-center gap-2 mt-3 pt-3 border-t-2 border-gray-300">
                    <img src={p.autore.avatar_url || '/default-avatar.png'} alt="" className="w-8 h-8 rounded-full object-cover border-2 border-gray-900" />
                    <div>
                      <span className="text-[10px] font-black text-gray-900 uppercase">{p.autore.nome} {p.autore.cognome}</span>
                      {p.autore.is_system_admin && (
                        <span className="ml-2 bg-gray-900 text-white text-[8px] font-black px-1.5 py-0.5 rounded uppercase">Staff</span>
                      )}
                    </div>
                  </div>
                )}
                
                <div className="flex gap-2 mt-3">
                  <button onClick={() => toggleProjectPause(p)} className={`flex-1 px-3 py-2 rounded-lg font-black text-[10px] uppercase bg-white text-gray-900 ${buttonStyle}`}>
                    {p.stato === 'pausa' ? '▶ Riattiva' : '⏸ Pausa'}
                  </button>
                  <button onClick={() => deleteProject(p)} className={`px-4 py-2 rounded-lg font-black text-[10px] uppercase bg-red-500 text-white ${buttonStyle}`}>
                    🗑️
                  </button>
                </div>
              </div>
            ))}
            {filteredProjects.length === 0 && (
              <div className={`${cardStyle} p-8 text-center`}>
                <span className="text-4xl block mb-2">📁</span>
                <p className="font-black text-gray-600 uppercase text-sm">Nessun progetto trovato</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB: CORSI */}
      {activeTab === 'corsi' && (
        <div className="space-y-4 sm:space-y-6 animate-in fade-in">
          
          {/* Richieste Corsi */}
          <div className={`${cardStyle} overflow-hidden`}>
            <div className="bg-green-400 px-4 sm:px-6 py-3 sm:py-4 border-b-2 sm:border-b-4 border-gray-900">
              <p className="text-gray-900 font-black text-xs sm:text-sm uppercase tracking-widest">
                📥 Richieste Nuovi Corsi ({richiesteCorsi.length})
              </p>
            </div>
            
            <div className="p-4 sm:p-6 bg-gray-50">
              {richiesteCorsi.length === 0 ? (
                <div className="text-center py-6 sm:py-8">
                  <span className="text-3xl sm:text-4xl block mb-2 opacity-50">🎉</span>
                  <p className="font-black text-gray-500 uppercase tracking-widest text-xs sm:text-sm">Nessuna richiesta in sospeso!</p>
                </div>
              ) : (
                <div className="grid gap-3 sm:gap-4 sm:grid-cols-2">
                  {richiesteCorsi.map(r => (
                    <div key={r.id} className={`${cardStyle} p-4 flex flex-col justify-between`}>
                      <div className="mb-3">
                        <span className="text-[9px] sm:text-[10px] font-black uppercase text-gray-500 tracking-widest">Corso Richiesto:</span>
                        <h4 className="text-base sm:text-xl font-black text-gray-900 uppercase leading-tight mt-1">{r.nome_corso}</h4>
                        {r.tipo_corso && (
                          <span className="text-[9px] sm:text-[10px] font-black bg-blue-100 text-blue-900 border-2 border-blue-900 px-2 py-0.5 rounded-md inline-block mt-1 uppercase">
                            {r.tipo_corso}
                          </span>
                        )}
                        
                        <div className="mt-2 sm:mt-3 flex items-center gap-2">
                          <img src={r.studente?.avatar_url || '/default-avatar.png'} className="w-5 h-5 sm:w-6 sm:h-6 rounded-full border border-gray-900" alt="" />
                          <span className="text-[10px] sm:text-xs font-bold text-gray-600">Da: {r.studente?.nome} {r.studente?.cognome}</span>
                        </div>
                      </div>
                      
                      <div className="flex gap-2 border-t-2 border-gray-100 pt-3">
                        <button 
                          onClick={() => gestisciRichiesta(r, 'approvato')}
                          className={`flex-1 bg-green-400 text-gray-900 font-black text-[10px] uppercase tracking-wider py-2 rounded-xl ${buttonStyle}`}
                        >
                          ✅ Approva
                        </button>
                        <button 
                          onClick={() => gestisciRichiesta(r, 'rifiutato')}
                          className={`flex-1 bg-red-400 text-gray-900 font-black text-[10px] uppercase tracking-wider py-2 rounded-xl ${buttonStyle}`}
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

          {/* Strumenti Database */}
          <div className={`${cardStyle} p-4 sm:p-6`}>
            <h3 className="font-black text-gray-900 uppercase tracking-widest text-sm sm:text-base mb-2 flex items-center gap-2">
              <span className="text-xl sm:text-2xl">🧰</span> Strumenti Database
            </h3>
            <p className="text-[10px] sm:text-sm font-bold text-gray-500 mb-4 sm:mb-6">Inserisci 30+ corsi di laurea standard nel database.</p>
            
            <button 
              onClick={caricaCorsi}
              disabled={seedingCorsi}
              className={`w-full sm:w-auto px-4 sm:px-8 py-3 sm:py-4 bg-yellow-300 text-gray-900 font-black uppercase tracking-widest text-xs sm:text-sm rounded-xl flex items-center justify-center gap-2 sm:gap-3 disabled:opacity-50 ${buttonStyle}`}
            >
              {seedingCorsi ? (
                <><span className="animate-spin">⏳</span> Caricamento...</>
              ) : (
                <><span>📚</span> Popola Corsi Base</>
              )}
            </button>
          </div>
        </div>
      )}

      {/* TAB: LOGS (OWNER ONLY) */}
      {activeTab === 'logs' && user?.is_owner && (
        <div className="animate-in fade-in">
          {/* Desktop: Table */}
          <div className={`${cardStyle} overflow-hidden hidden lg:block`}>
            <div className="bg-gray-900 px-4 sm:px-6 py-3 sm:py-4 border-b-2 sm:border-b-4 border-gray-900">
              <p className="text-white font-black text-xs uppercase tracking-widest">🕵️ Registro Attività Staff</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-100 text-[10px] font-black uppercase tracking-widest text-gray-600">
                    <th className="p-3 sm:p-4">Data</th>
                    <th className="p-3 sm:p-4">Admin</th>
                    <th className="p-3 sm:p-4">Azione</th>
                    <th className="p-3 sm:p-4">Bersaglio</th>
                  </tr>
                </thead>
                <tbody className="divide-y-2 divide-gray-200">
                  {filteredLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-amber-50 transition-colors">
                      <td className="p-3 sm:p-4">
                        <p className="text-xs font-black text-gray-900">{new Date(log.created_at).toLocaleDateString('it-IT')}</p>
                        <p className="text-[10px] text-gray-500">{new Date(log.created_at).toLocaleTimeString('it-IT')}</p>
                      </td>
                      <td className="p-3 sm:p-4">
                        {log.studente ? (
                          <div className="flex items-center gap-2">
                            <img src={log.studente.avatar_url || '/default-avatar.png'} alt="" className="w-8 h-8 rounded-full border-2 border-gray-900" />
                            <span className="text-xs font-black text-gray-900 uppercase">{log.studente.nome} {log.studente.cognome}</span>
                          </div>
                        ) : (
                          <span className="text-xs font-black text-gray-400 uppercase">🤖 Sistema</span>
                        )}
                      </td>
                      <td className="p-3 sm:p-4">
                        <span className={`text-[10px] font-black px-2 py-1 rounded-lg uppercase ${
                          log.azione.includes('ELIMINA') || log.azione.includes('BAN') ? 'bg-red-400' :
                          log.azione.includes('SOSPENSIONE') ? 'bg-orange-400' :
                          log.azione.includes('APPROVAZ') ? 'bg-green-400' : 'bg-gray-200'
                        }`}>
                          {log.azione}
                        </span>
                        {log.dettagli && <p className="text-[10px] text-gray-500 mt-1">{log.dettagli}</p>}
                      </td>
                      <td className="p-3 sm:p-4">
                        <span className="text-sm font-black text-gray-900 uppercase">{log.bersaglio}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile: Cards */}
          <div className="lg:hidden space-y-3">
            <div className={`${cardStyle} px-4 py-3 bg-gray-900`}>
              <p className="text-white font-black text-xs uppercase tracking-widest">🕵️ Registro Attività</p>
            </div>
            {filteredLogs.map((log) => (
              <div key={log.id} className={`${cardStyle} p-4`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <span className={`text-[10px] font-black px-2 py-1 rounded-lg uppercase inline-block text-white ${
                      log.azione.includes('ELIMINA') || log.azione.includes('BAN') ? 'bg-red-500' :
                      log.azione.includes('SOSPENSIONE') ? 'bg-orange-500' :
                      log.azione.includes('APPROVAZ') ? 'bg-green-500' : 'bg-gray-700'
                    }`}>
                      {log.azione}
                    </span>
                    <p className="font-black text-gray-900 uppercase text-sm mt-2">{log.bersaglio}</p>
                    {log.dettagli && <p className="text-[10px] text-gray-700 font-bold mt-1">{log.dettagli}</p>}
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-[10px] font-black text-gray-900">{new Date(log.created_at).toLocaleDateString('it-IT')}</p>
                    <p className="text-[9px] text-gray-600 font-bold">{new Date(log.created_at).toLocaleTimeString('it-IT')}</p>
                  </div>
                </div>
                {log.studente && (
                  <div className="flex items-center gap-2 mt-3 pt-3 border-t-2 border-gray-300">
                    <img src={log.studente.avatar_url || '/default-avatar.png'} alt="" className="w-6 h-6 rounded-full border border-gray-900" />
                    <span className="text-[10px] font-bold text-gray-800">{log.studente.nome} {log.studente.cognome}</span>
                  </div>
                )}
              </div>
            ))}
            {filteredLogs.length === 0 && (
              <div className={`${cardStyle} p-8 text-center`}>
                <span className="text-4xl block mb-2">📋</span>
                <p className="font-black text-gray-600 uppercase text-sm">Nessun log registrato</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}