'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/app/context/UserContext'
import { useRouter } from 'next/navigation'
import SuperAvatar from '@/components/SuperAvatar'
import Link from 'next/link'

export default function AdminPanel() {
  const { user, loading: userLoading } = useUser()
  const router = useRouter()
  const supabase = createClient()

  // ✅ AGGIUNTO 'logs' tra le tab disponibili
  const [activeTab, setActiveTab] = useState<'utenti' | 'progetti' | 'logs'>('utenti')
  
  const [users, setUsers] = useState<any[]>([])
  const [projects, setProjects] = useState<any[]>([])
  const [logs, setLogs] = useState<any[]>([]) // ✅ STATO PER I LOG
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [hideStaffProjects, setHideStaffProjects] = useState(false)

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

    // ✅ FETCH LOGS (Solo se l'utente è Owner)
    if (user?.is_owner) {
      const { data: logData, error: logError } = await (supabase as any)
        .from('admin_log')
        // Tolto l'alias "admin:". Ora chiamiamo direttamente la tabella "studente"
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


  // ✅ FUNZIONE SEGRETA: Registra le azioni nel database
  const registraLog = async (azione: string, bersaglio: string, dettagli: string = '') => {
    await (supabase as any).from('admin_log').insert([
      { admin_id: user?.id, azione, bersaglio, dettagli }
    ])
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
      // REGISTRA LOG
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
    const minutes = parseInt(selectEl.value); // <-- ORA USIAMO I MINUTI
    
    const scadenza = new Date();
    scadenza.setMinutes(scadenza.getMinutes() + minutes); // Aggiungiamo i minuti

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
    const { error } = await supabase
      .from('bando')
      .update({ nascosto_admin: !project.nascosto_admin } as any)
      .eq('id', project.id)

    if (!error) {
      // ✅ REGISTRA LOG PROGETTO PAUSA
      await registraLog(project.nascosto_admin ? 'RIATTIVAZIONE PROGETTO' : 'SOSPENSIONE PROGETTO', project.titolo)
      fetchData()
    } else alert("Errore: " + error.message)
  }

  const deleteProject = async (project: any) => {
    if (!confirm("⚠️ SEI SICURO? Questa azione cancellerà il progetto per sempre.")) return

    const { error } = await supabase
      .from('bando')
      .delete()
      .eq('id', project.id)

    if (!error) {
      // ✅ REGISTRA LOG PROGETTO ELIMINATO
      await registraLog('ELIMINAZIONE PROGETTO', project.titolo, `Id Progetto: ${project.id}`)
      fetchData()
    } else alert("Errore durante l'eliminazione: " + error.message)
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

  // Filtro Log
  const filteredLogs = logs.filter(l => 
    l.azione.toLowerCase().includes(searchTerm.toLowerCase()) || 
    l.bersaglio.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (l.studente && `${l.studente.nome} ${l.studente.cognome}`.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  if (userLoading || loading) return <div className="p-10 text-center font-black animate-pulse text-red-800">CARICAMENTO PANNELLO STAFF...</div>

  return (
    <div className="space-y-8 pb-20">
      {/* HEADER & RICERCA */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-8 rounded-[2rem] shadow-xl border-4 border-black">
        <div>
          <h1 className="text-3xl font-black uppercase italic tracking-tighter text-black">
            Pannello di Controllo <span className="text-red-800">Staff</span>
          </h1>
          <p className="text-gray-500 font-medium uppercase text-xs tracking-widest mt-1">
            Gestione utenti e progetti della piattaforma
          </p>
        </div>
        <div className="flex gap-2">
          <input 
            type="text" 
            placeholder="Cerca..."
            className="px-4 py-2 bg-gray-100 rounded-xl border-2 border-transparent focus:border-black outline-none font-bold text-sm w-64"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* NAVIGAZIONE TABS */}
      <div className="flex gap-4 border-b-2 border-gray-200 pb-4 overflow-x-auto">
        <button 
          onClick={() => setActiveTab('utenti')}
          className={`text-xl font-black uppercase tracking-tighter transition-all whitespace-nowrap ${activeTab === 'utenti' ? 'text-black' : 'text-gray-300 hover:text-gray-500'}`}
        >
          👤 Utenti Iscritti ({users.length})
        </button>
        <button 
          onClick={() => setActiveTab('progetti')}
          className={`text-xl font-black uppercase tracking-tighter transition-all whitespace-nowrap ${activeTab === 'progetti' ? 'text-red-800' : 'text-gray-300 hover:text-gray-500'}`}
        >
          📁 Progetti ({projects.length})
        </button>
        
        {/* ✅ TAB VISIBILE SOLO ALL'OWNER */}
        {user?.is_owner && (
          <button 
            onClick={() => setActiveTab('logs')}
            className={`text-xl font-black uppercase tracking-tighter transition-all whitespace-nowrap ${activeTab === 'logs' ? 'text-amber-500' : 'text-gray-300 hover:text-gray-500'}`}
          >
            🕵️ Registro Staff ({logs.length})
          </button>
        )}
      </div>

      {/* --- TABELLA UTENTI --- */}
      {activeTab === 'utenti' && (
        <div className="bg-white rounded-[2.5rem] shadow-2xl overflow-hidden border-2 border-gray-100 animate-in fade-in slide-in-from-bottom-4">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">
                  <th className="p-6">Studente</th>
                  <th className="p-6">Email</th>
                  <th className="p-6">Ruolo</th>
                  <th className="p-6">Stato Account</th>
                  <th className="p-6 text-right">Azioni</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-gray-50/50 transition-colors group">
                    <td className="p-6">
                      <div className="flex items-center gap-4">
                        <SuperAvatar src={u.avatar_url} nome={u.nome} cognome={u.cognome} isStaff={u.is_system_admin || u.is_owner} size="sm" />
                        <div>
                          <p className="font-black text-black uppercase text-sm leading-none">{u.nome} {u.cognome}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-6"><span className="text-xs font-bold text-gray-500">{u.email}</span></td>
                    <td className="p-6">
                      {u.is_owner ? (
                        <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-800 border-2 border-amber-400 text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-tighter whitespace-nowrap">👑 OWNER</span>
                      ) : u.is_system_admin ? (
                        <span className="inline-flex items-center gap-1 bg-black text-white text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-tighter whitespace-nowrap">🛡️ STAFF</span>
                      ) : (
                        <span className="inline-flex items-center bg-gray-100 text-gray-400 text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-tighter whitespace-nowrap">STUDENTE</span>
                      )}
                    </td>
                    <td className="p-6">
                      {u.stato_account === 'bannato' ? (
                         <span className="text-red-600 font-black text-xs uppercase flex items-center gap-1">🚫 Bannato</span>
                      ) : u.stato_account === 'in_pausa' ? (
                         <span className="text-orange-500 font-black text-xs uppercase flex items-center gap-1">⏸ In Pausa</span>
                      ) : (
                         <span className="text-green-600 font-black text-xs uppercase flex items-center gap-1">✅ Attivo</span>
                      )}
                    </td>
                    <td className="p-6 text-right flex items-center justify-end gap-2 flex-wrap">
                      <Link href={`/dashboard/user/${u.id}`} className="px-3 py-1.5 rounded-lg font-black text-[10px] uppercase bg-gray-100 text-black hover:bg-gray-200">
                        Profilo
                      </Link>
                      {!u.is_owner && (
                        <>
                          {u.stato_account === 'in_pausa' ? (
                             user?.is_owner && (
                               <button onClick={() => changeAccountStatus(u, 'attivo')} className="px-3 py-1.5 rounded-lg font-black text-[10px] uppercase bg-green-50 text-green-700 hover:bg-green-600 hover:text-white">
                                 Sblocca Pausa
                               </button>
                             )
                          ) : u.stato_account === 'attivo' && (
                             <div className="flex items-center gap-1 bg-orange-50 rounded-lg p-1 border border-orange-200">
                               <select id={`pause-time-${u.id}`} className="text-[10px] font-bold bg-transparent text-orange-800 outline-none cursor-pointer">
                                 <option value="10">10 Minuti</option>
                                 <option value="30">30 Minuti</option>
                                 <option value="60">1 Ora</option>
                                 <option value="1440">24 Ore</option>
                                 <option value="4320">3 Giorni</option>
                                 <option value="10080">1 Sett.</option>
                               </select>
                               <button onClick={() => applyPause(u)} className="px-2 py-1 rounded bg-orange-500 text-white font-black text-[9px] uppercase hover:bg-orange-600 transition-colors shadow-sm">
                                 Pausa
                               </button>
                             </div>
                          )}
                          {user?.is_owner && (
                            <>
                              <button 
                                onClick={() => toggleAdmin(u)}
                                className={`px-3 py-1.5 rounded-lg font-black text-[10px] uppercase transition-all shadow-sm ${
                                  u.is_system_admin ? 'bg-black text-white hover:bg-red-600' : 'border border-black text-black hover:bg-black hover:text-white'
                                }`}
                              >
                                {u.is_system_admin ? '- Staff' : '+ Staff'}
                              </button>
                              
                              {u.stato_account !== 'bannato' ? (
                                <button onClick={() => changeAccountStatus(u, 'bannato')} className="px-3 py-1.5 rounded-lg font-black text-[10px] uppercase bg-red-100 text-red-800 hover:bg-red-800 hover:text-white">
                                  Banna
                                </button>
                              ) : (
                                <button onClick={() => changeAccountStatus(u, 'attivo')} className="px-3 py-1.5 rounded-lg font-black text-[10px] uppercase bg-gray-800 text-white hover:bg-black">
                                  Revoca Ban
                                </button>
                              )}
                            </>
                          )}
                        </>
                      )}
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
          <div className="flex justify-end mb-4">
            <label className="flex items-center gap-2 cursor-pointer group">
              <input 
                type="checkbox" 
                checked={hideStaffProjects}
                onChange={(e) => setHideStaffProjects(e.target.checked)}
                className="w-4 h-4 rounded text-red-600 border-gray-300 focus:ring-red-500 cursor-pointer"
              />
              <span className="text-xs font-bold uppercase tracking-widest text-gray-500 group-hover:text-black transition-colors">
                Nascondi Progetti Staff
              </span>
            </label>
          </div>

          <div className="bg-white rounded-[2.5rem] shadow-2xl overflow-hidden border-2 border-gray-100">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-red-50 border-b border-red-100 text-[10px] font-black uppercase tracking-[0.2em] text-red-800">
                    <th className="p-6">Progetto</th>
                    <th className="p-6">Creatore</th>
                    <th className="p-6">Stato</th>
                    <th className="p-6 text-right">Azioni</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredProjects.map((p) => (
                    <tr key={p.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="p-6">
                        {/* REINSERITO IL TITOLO DEL PROGETTO */}
                        <p className="font-black text-black uppercase text-sm leading-none">{p.titolo}</p>
                        <p className="text-[10px] text-gray-400 font-bold mt-1 uppercase line-clamp-1">{p.descrizione}</p>
                      </td>
                      <td className="p-6">
                        {p.autore ? (
                          <div className="flex flex-col gap-2">
                             <div className="flex items-center gap-3">
                               <SuperAvatar src={p.autore.avatar_url} nome={p.autore.nome} cognome={p.autore.cognome} isStaff={p.autore.is_system_admin || p.autore.is_owner} size="sm" />
                               <span className="text-xs font-bold text-gray-700 uppercase">{p.autore.nome} {p.autore.cognome}</span>
                             </div>
                             {/* ETICHETTA RUOLO CREATORE SOTTO IL NOME */}
                             <div>
                               {p.autore.is_owner ? (
                                 <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-800 text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-tighter whitespace-nowrap">👑 OWNER</span>
                               ) : p.autore.is_system_admin ? (
                                 <span className="inline-flex items-center gap-1 bg-black text-white text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-tighter whitespace-nowrap">🛡️ STAFF</span>
                               ) : null}
                             </div>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400 italic">Autore Ignoto</span>
                        )}
                      </td>
                      <td className="p-6">
                        {p.nascosto_admin ? (
                          <span className="bg-orange-100 text-orange-800 text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-tighter">IN PAUSA</span>
                        ) : (
                          <span className="bg-green-100 text-green-800 text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-tighter">ATTIVO</span>
                        )}
                      </td>
                      <td className="p-6 text-right flex items-center justify-end gap-2">
                        <button 
                          onClick={() => toggleProjectPause(p)}
                          className="px-4 py-2 rounded-xl font-black text-[10px] uppercase transition-all bg-orange-50 text-orange-600 hover:bg-orange-500 hover:text-white"
                        >
                          {p.nascosto_admin ? '▶ Riattiva' : '⏸ Pausa'}
                        </button>
                        <button 
                          onClick={() => deleteProject(p)}
                          className="px-4 py-2 rounded-xl font-black text-[10px] uppercase transition-all bg-red-50 text-red-600 hover:bg-red-600 hover:text-white"
                        >
                          🗑️ Elimina
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filteredProjects.length === 0 && (
                    <tr><td colSpan={4} className="p-10 text-center text-gray-400 font-bold uppercase text-xs">Nessun progetto trovato</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ✅ NUOVA TABELLA: REGISTRO STAFF (SOLO OWNER) */}
      {activeTab === 'logs' && user?.is_owner && (
        <div className="bg-white rounded-[2.5rem] shadow-2xl overflow-hidden border-2 border-amber-100 animate-in fade-in slide-in-from-bottom-4">
          <div className="bg-amber-50 px-8 py-4 border-b border-amber-100">
            <p className="text-amber-800 font-bold text-xs uppercase tracking-widest">
              Tutte le azioni amministrative effettuate dallo Staff e dall'Owner
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">
                  <th className="p-6">Data & Ora</th>
                  <th className="p-6">Staff (Chi ha agito)</th>
                  <th className="p-6">Azione</th>
                  <th className="p-6">Bersaglio</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="p-6 whitespace-nowrap">
                      <p className="text-xs font-bold text-gray-900">
                        {new Date(log.created_at).toLocaleDateString('it-IT')}
                      </p>
                      <p className="text-[10px] font-bold text-gray-400">
                        {new Date(log.created_at).toLocaleTimeString('it-IT')}
                      </p>
                    </td>
                    <td className="p-6">
                      {/* ✅ FIX: DA log.admin A log.studente */}
                      {log.studente ? (
                        <div className="flex items-center gap-3">
                          <SuperAvatar src={log.studente.avatar_url} nome={log.studente.nome} cognome={log.studente.cognome} isStaff={true} size="sm" />
                          <span className="text-xs font-bold text-gray-700 uppercase">{log.studente.nome} {log.studente.cognome}</span>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400 italic">Sistema</span>
                      )}
                    </td>
                    <td className="p-6">
                      <span className={`text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-tighter ${
                        log.azione.includes('ELIMINA') || log.azione.includes('BAN') ? 'bg-red-100 text-red-800' :
                        log.azione.includes('SOSPENSIONE') || log.azione.includes('PAUSA') ? 'bg-orange-100 text-orange-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {log.azione}
                      </span>
                      {log.dettagli && (
                        <p className="text-[10px] text-gray-400 font-bold mt-1">{log.dettagli}</p>
                      )}
                    </td>
                    <td className="p-6">
                      <span className="text-sm font-black text-black">{log.bersaglio}</span>
                    </td>
                  </tr>
                ))}
                {filteredLogs.length === 0 && (
                  <tr><td colSpan={4} className="p-10 text-center text-gray-400 font-bold uppercase text-xs tracking-widest">Nessun log registrato</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )}