'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'

import SuperAvatar from '@/components/SuperAvatar'

export default function TeamWorkspacePage() {
  const params = useParams()
  const bandoId = params?.id as string
  const supabase = createClient()
  const router = useRouter()

  // STATI DATI
  const [project, setProject] = useState<any>(null)
  const [teamMembers, setTeamMembers] = useState<any[]>([])
  const [leader, setLeader] = useState<any>(null)
  const [pendingApps, setPendingApps] = useState<any[]>([])
  
  // STATI RUOLI E PERMESSI
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [isOwner, setIsOwner] = useState(false)
  
  // STATI MODALI E CARICAMENTO
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false)
  
  // FORM MODIFICA LINK
  const [linksForm, setLinksForm] = useState({ github: '', drive: '' })
  const [isSavingLinks, setIsSavingLinks] = useState(false)

  // CARICAMENTO PRINCIPALE
  const fetchTeamData = async () => {
    if (!bandoId) return
    setLoading(true)
  
    try {
      // 1. Capiamo chi è l'utente loggato
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }
      setCurrentUser(user)

      // 2. Dati del Bando e dei Creatori
      const { data: bandoData, error: bandoError } = await supabase
        .from('bando')
        .select(`
          *,
          creatore_studente:creatore_studente_id (id, nome, cognome, avatar_url, email),
          creatore_azienda:creatore_azienda_id (id, nome, logo_url, email)
        `)
        .eq('id', bandoId)
        .single()
  
      if (bandoError) throw bandoError

      // BLOCCO DI SICUREZZA REALE:
      const checkIsOwner = bandoData.creatore_studente_id === user.id || bandoData.creatore_azienda_id === user.id;

      if (!checkIsOwner) {
        const { data: myParticipation } = await supabase
          .from('partecipazione')
          .select('stato')
          .eq('bando_id', bandoId)
          .eq('studente_id', user.id)
          .single()

        // Se lo stato non è accepted (es. abandoned), lo buttiamo fuori subito
        if (!myParticipation || myParticipation.stato !== 'accepted') {
          router.replace('/dashboard/my_projects')
          return
        }
      }
      
      setProject(bandoData)
      setLinksForm({ 
        github: (bandoData as any)?.github_url || '', 
        drive: (bandoData as any)?.drive_url || '' 
      })
  
      let detectedLeader = null;
  
      const cStudente = Array.isArray(bandoData?.creatore_studente) ? bandoData.creatore_studente[0] : bandoData?.creatore_studente;
      const cAzienda = Array.isArray(bandoData?.creatore_azienda) ? bandoData.creatore_azienda[0] : bandoData?.creatore_azienda;
  
      if (cStudente && cStudente.id) {
        detectedLeader = {
          id: cStudente.id,
          nome: `${cStudente.nome || ''} ${cStudente.cognome || ''}`.trim(),
          avatar_url: cStudente.avatar_url,
          email: cStudente.email,
          ruolo: 'Owner'
        };
      } else if (cAzienda && cAzienda.id) {
        detectedLeader = {
          id: cAzienda.id,
          nome: cAzienda.nome || 'Azienda Sponsor',
          avatar_url: cAzienda.logo_url,
          email: cAzienda.email,
          ruolo: 'Owner'
        };
      }
  
      setLeader(detectedLeader);
      setIsOwner(checkIsOwner);
  
      // 3. Membri del Team (Join con studente_corso per recuperare le info universitarie)
      const { data: membersData, error: membersError } = await supabase
        .from('partecipazione')
        .select(`
          id, 
          ruolo, 
          studente:studente_id (
            id, nome, cognome, avatar_url, email, bio,
            studente_corso (
              anno_inizio,
              corso:corso_id ( nome )
            )
          )
        `)
        .eq('bando_id', bandoId)
        .eq('stato', 'accepted')
  
      if (membersError) throw membersError

      const formattedMembers = membersData?.map((m: any) => {
        const corsoInfo = m.studente?.studente_corso?.[0]; // Prendiamo il primo corso trovato
        return {
          partecipazione_id: m.id,
          ...m.studente,
          ruolo_team: m.ruolo,
          nome_corso: corsoInfo?.corso?.nome || 'Corso non specificato',
          anno_inizio_corso: corsoInfo?.anno_inizio
        }
      }) || [];

      setTeamMembers(formattedMembers)

      // 4. Permessi Admin e Candidature Pendenti
      const userMemberData = formattedMembers.find((m: any) => m.id === user?.id);
      if (checkIsOwner || userMemberData?.ruolo_team === 'admin') {
         setIsAdmin(true);
         
         const { data: pending } = await supabase
            .from('partecipazione')
            .select('id, messaggio, studente:studente_id(nome, cognome, avatar_url)')
            .eq('bando_id', bandoId)
            .eq('stato', 'pending')
         
         setPendingApps(pending || [])
      }
  
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTeamData()
  }, [bandoId])

  // --- AZIONI OWNER E ADMIN ---

  const handleUpdateLinks = async () => {
    setIsSavingLinks(true)
    
    // Aggiungiamo 'as any' all'oggetto che stiamo inviando
    const { error } = await supabase.from('bando').update({
      github_url: linksForm.github,
      drive_url: linksForm.drive
    } as any).eq('id', bandoId)
    
    if (!error) {
      setProject((prev: any) => prev ? { ...prev, github_url: linksForm.github, drive_url: linksForm.drive } : prev)
      setIsLinkModalOpen(false)
    } else {
      alert(`Errore: ${error.message}`)
    }
    setIsSavingLinks(false)
  }

  const handleRoleChange = async (partecipazioneId: string, nuovoRuolo: 'admin' | 'membro') => {
    if (!window.confirm(`Sei sicuro di voler cambiare il ruolo in ${nuovoRuolo.toUpperCase()}?`)) return;
    
    // Aggiungiamo 'as any' all'oggetto dell'update
    const { error } = await supabase
      .from('partecipazione')
      .update({ ruolo: nuovoRuolo } as any)
      .eq('id', partecipazioneId)
      
    if (!error) {
      fetchTeamData();
    } else {
      alert(`Impossibile cambiare ruolo: ${error.message}`)
    }
  }

  const handleKickMember = async (partecipazioneId: string) => {
    if (!window.confirm('ATTENZIONE: Stai per espellere questo utente dal team. Procedere?')) return;
    const { error } = await supabase.from('partecipazione').delete().eq('id', partecipazioneId)
    if (!error) {
      fetchTeamData();
    } else {
      alert(`Impossibile rimuovere membro: ${error.message}`)
    }
  }

  const handleToggleStatus = async () => {
    const nuovoStato = project.stato === 'aperto' ? 'chiuso' : 'aperto';
    const messaggio = nuovoStato === 'chiuso' 
      ? "Sei sicuro di voler CHIUDERE le candidature? Il progetto apparirà oscurato in Home e nessuno potrà più candidarsi." 
      : "Vuoi RIAPRIRE le candidature al pubblico?";
      
    if (!window.confirm(messaggio)) return;

    const { error } = await supabase.from('bando').update({ stato: nuovoStato }).eq('id', bandoId);
    if (!error) {
      setProject((prev: any) => ({ ...prev, stato: nuovoStato }));
    } else {
      alert("Errore durante l'aggiornamento dello stato: " + error.message);
    }
  }

   const handleLeaveTeam = async () => {
    // 1. Chiediamo subito conferma (così sai che il bottone funziona)
    if (!window.confirm("💀 SEI SICURO? Abbandonando il team non potrai più rientrare e il progetto ti verrà contrassegnato come abbandonato.")) return;

    // 2. Peschiamo la tua partecipazione direttamente dal database (infallibile)
    const { data: myPart, error: fetchError } = await supabase
      .from('partecipazione')
      .select('id')
      .eq('bando_id', bandoId)
      .eq('studente_id', currentUser.id)
      .eq('stato', 'accepted')
      .single();

    if (fetchError || !myPart) {
      alert("Errore: impossibile trovare il tuo record nel database.");
      console.error(fetchError);
      return;
    }

    // 3. Spariamo la modifica di stato a "abandoned"
    const { error: updateError } = await supabase
      .from('partecipazione')
      .update({ stato: 'abandoned' } as any)
      .eq('id', myPart.id);

    if (!updateError) {
      // 4. Redirezione fulminea alla Dashboard (Bacheca)
      router.push('/dashboard'); 
    } else {
      alert(`Errore: ${updateError.message}`);
    }
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center font-black text-red-800 animate-pulse uppercase tracking-widest text-2xl italic">Caricamento Workspace...</div>
  if (error) return <div className="p-20 text-center bg-red-50 min-h-screen"><p className="font-mono text-sm bg-black text-white p-4 rounded-xl inline-block">{error}</p></div>

  return (
    <div className="max-w-[1600px] mx-auto p-6 lg:p-10 pb-20 relative">
      
      {/* MODALE MODIFICA LINK */}
      {isLinkModalOpen && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white p-10 rounded-[3rem] w-full max-w-lg shadow-2xl border-4 border-red-800">
            <h3 className="text-3xl font-black italic uppercase text-red-900 mb-6">Modifica Link Operativi</h3>
            <div className="space-y-4 mb-8">
              <div>
                <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Link GitHub Repository</label>
                <input 
                  type="url" 
                  value={linksForm.github} 
                  onChange={e => setLinksForm({...linksForm, github: e.target.value})} 
                  placeholder="https://github.com/..." 
                  className="w-full mt-2 p-4 bg-gray-50 border-2 border-gray-200 rounded-2xl outline-none focus:border-red-800 transition-all font-medium" 
                />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Link Google Drive</label>
                <input 
                  type="url" 
                  value={linksForm.drive} 
                  onChange={e => setLinksForm({...linksForm, drive: e.target.value})} 
                  placeholder="https://drive.google.com/..." 
                  className="w-full mt-2 p-4 bg-gray-50 border-2 border-gray-200 rounded-2xl outline-none focus:border-red-800 transition-all font-medium" 
                />
              </div>
            </div>
            <div className="flex gap-4">
              <button onClick={() => setIsLinkModalOpen(false)} className="flex-1 py-4 font-black uppercase text-xs text-gray-500 hover:bg-gray-100 rounded-2xl transition-all">Annulla</button>
              <button onClick={handleUpdateLinks} disabled={isSavingLinks} className="flex-1 py-4 bg-red-800 text-white font-black uppercase text-xs rounded-2xl shadow-xl hover:bg-red-900 transition-all">
                {isSavingLinks ? 'Salvataggio...' : 'Salva Link'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PANNELLO DI CONTROLLO ADMIN */}
      {isAdmin && (project?.stato === 'aperto' || pendingApps.length > 0) && (
        <div className="mb-10 bg-red-900 border-4 border-red-950 text-white rounded-[3rem] p-8 shadow-xl">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
            <div>
              <h3 className="text-2xl font-black uppercase italic tracking-tight flex items-center gap-3">
                <span>📋</span> Gestione Candidature
              </h3>
              <p className="text-red-300 text-sm font-bold mt-1">
                {pendingApps.length > 0 ? `Hai ${pendingApps.length} nuove richieste in attesa di revisione.` : 'Nessuna nuova richiesta al momento.'}
              </p>
            </div>
            <Link href={`/dashboard/projects/${bandoId}/manage`} className="bg-white text-red-900 px-8 py-4 rounded-xl font-black uppercase text-[10px] tracking-widest hover:scale-105 transition-transform shadow-lg text-center w-full sm:w-auto">
              Vai al Pannello Gestione →
            </Link>
          </div>
          
          {pendingApps.length > 0 && (
            <div className="flex gap-4 overflow-x-auto pb-4 custom-scrollbar pt-4 border-t border-red-800/50">
              {pendingApps.map(app => (
                <Link key={app.id} href={`/dashboard/projects/${bandoId}/manage`} className="min-w-[250px] bg-white/10 border border-white/20 p-4 rounded-3xl hover:bg-white/20 transition-all group">
                  <div className="flex items-center gap-3 mb-2">
                    <img src={app.studente.avatar_url || '/default-avatar.png'} className="w-10 h-10 rounded-full object-cover" />
                    <p className="font-black truncate">{app.studente.nome} {app.studente.cognome}</p>
                  </div>
                  <p className="text-[10px] text-red-200 line-clamp-2 italic">"{app.messaggio}"</p>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}

      {/* HEADER DINAMICO */}
      <div className="mb-10">
        
        {/* TASTO INDIETRO MODIFICATO E POSIZIONATO IN ALTO A SINISTRA */}
        <Link href="/dashboard/my_projects" className="mb-6 flex items-center gap-2 text-gray-400 hover:text-red-800 font-black text-[10px] uppercase tracking-widest transition-all w-fit group">
          <span className="group-hover:-translate-x-1 transition-transform">←</span> Torna ai tuoi progetti
        </Link>

        <div className="flex flex-col md:flex-row justify-between items-end gap-6 border-b-8 border-red-800 pb-10">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-4">
               <span className="bg-red-800 text-white px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] shadow-lg">Team Space</span>
               {/* BADGE DI STATO DEL PROGETTO */}
               <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-inner border-2 ${project?.stato === 'chiuso' ? 'bg-gray-200 text-gray-500 border-gray-300' : 'bg-green-100 text-green-700 border-green-200'}`}>
                 Stato: {project?.stato}
               </span>
            </div>
            <h1 className="text-5xl md:text-8xl font-black text-red-900 uppercase italic tracking-tighter leading-[0.85]">{project?.titolo}</h1>
          </div>
          
          <div className="flex flex-col gap-3">
            {/* BOTTONE CHIUDI/RIAPRI PROGETTO (Solo Owner) */}
            {isOwner && (
              <button 
                onClick={handleToggleStatus}
                className={`font-black text-[10px] uppercase px-8 py-4 rounded-2xl transition-all shadow-xl text-center border-4 ${project?.stato === 'aperto' ? 'bg-orange-100 text-orange-900 border-orange-200 hover:bg-orange-200' : 'bg-green-100 text-green-900 border-green-200 hover:bg-green-200'}`}
              >
                {project?.stato === 'aperto' ? '🛑 Chiudi Candidature' : '✅ Riapri Candidature'}
              </button>
            )}
            {/* Il vecchio tasto "Esci dal Workspace" è stato rimosso in favore della freccia in alto */}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-8 lg:gap-12">
        
        {/* LATO SINISTRO (Bacheca e Link) */}
        <div className="col-span-12 lg:col-span-8 space-y-12">
          
          <div className="bg-white rounded-[4rem] border-4 border-red-800 p-10 shadow-2xl relative overflow-hidden">
            <div className="relative z-10">
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-3xl font-black text-red-900 uppercase italic flex items-center gap-4">
                  <span className="bg-red-100 p-3 rounded-2xl">🔗</span> Link di Progetto
                </h2>
                {isAdmin && (
                  <button onClick={() => setIsLinkModalOpen(true)} className="text-[10px] font-black text-white bg-red-800 uppercase tracking-widest px-6 py-3 rounded-xl hover:bg-red-900 transition-all shadow-lg">
                    ✏️ Modifica Link
                  </button>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {project?.github_url ? (
                  <a href={project.github_url} target="_blank" rel="noopener noreferrer" className="flex flex-col bg-gray-50 border-4 border-gray-200 hover:border-red-800 p-8 rounded-[2.5rem] transition-all">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Development</span>
                    <span className="text-2xl font-black text-gray-800">GitHub ↗</span>
                  </a>
                ) : (
                  <div className="flex flex-col bg-gray-50 border-4 border-dashed border-gray-200 p-8 rounded-[2.5rem] opacity-50">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Development</span>
                    <span className="text-lg font-black text-gray-400">Nessun link GitHub impostato</span>
                  </div>
                )}
                
                {project?.drive_url ? (
                  <a href={project.drive_url} target="_blank" rel="noopener noreferrer" className="flex flex-col bg-gray-50 border-4 border-gray-200 hover:border-red-800 p-8 rounded-[2.5rem] transition-all">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Assets</span>
                    <span className="text-2xl font-black text-gray-800">Google Drive ↗</span>
                  </a>
                ) : (
                  <div className="flex flex-col bg-gray-50 border-4 border-dashed border-gray-200 p-8 rounded-[2.5rem] opacity-50">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Assets</span>
                    <span className="text-lg font-black text-gray-400">Nessun link Drive impostato</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="bg-red-900 rounded-[4rem] p-12 text-white shadow-2xl relative overflow-hidden">
            <h2 className="text-3xl font-black uppercase italic mb-8">📣 Bacheca Team</h2>
            <div className="bg-white/10 backdrop-blur-md border border-white/20 p-8 rounded-[3rem]">
              <p className="text-xl font-medium italic">Spazio riservato agli annunci del team (Sviluppo in arrivo...)</p>
            </div>
          </div>
        </div>

        {/* LATO DESTRO: TEAM DIRECTORY */}
        <div className="col-span-12 lg:col-span-4">
          <div className="bg-white rounded-[4rem] border-4 border-gray-100 p-10 shadow-2xl sticky top-8 relative z-20">
            <h3 className="text-[11px] font-black text-gray-400 uppercase tracking-[0.5em] mb-10 text-center">Team Members</h3>
            
            <div className="space-y-6">
              {/* LEADER */}
              {leader && (
                <div className="relative p-6 bg-red-50 border-4 border-red-100 rounded-[3rem] group/leader">
                  <div className="absolute -top-3 left-8 bg-red-800 text-white px-4 py-1 rounded-full text-[9px] font-black uppercase tracking-widest">OWNER</div>
                  <div className="flex items-center gap-5">
                    <img src={leader.avatar_url || '/default-avatar.png'} className="w-16 h-16 rounded-[1.5rem] object-cover border-4 border-white shadow-lg" />
                    <div className="overflow-hidden">
                      <p className="text-xl font-black text-gray-900 leading-none mb-1 truncate">{leader.nome}</p>
                      <p className="text-[10px] font-bold text-red-800 uppercase">Creatore</p>
                    </div>
                  </div>

                  {/* HOVER CARD LEADER */}
                  <div className="absolute right-[105%] top-1/2 -translate-y-1/2 w-64 bg-gray-900 text-white p-6 rounded-[2rem] opacity-0 invisible group-hover/leader:opacity-100 group-hover/leader:visible transition-all duration-300 z-50 shadow-2xl scale-95 group-hover/leader:scale-100 hidden xl:block border-4 border-gray-800">
                    <div className="flex items-center gap-4 mb-4">
                      <img src={leader.avatar_url || '/default-avatar.png'} className="w-16 h-16 rounded-2xl object-cover border-2 border-gray-700" />
                      <div>
                        <p className="font-black text-lg leading-tight">{leader.nome}</p>
                        <p className="text-[9px] font-bold text-red-400 uppercase tracking-widest mt-1">Project Creator</p>
                      </div>
                    </div>
                    <div className="bg-white/10 p-3 rounded-xl mb-3">
                      <p className="text-[10px] text-gray-400 uppercase tracking-widest mb-1">Email</p>
                      <p className="text-xs font-mono text-gray-200 truncate">{leader.email}</p>
                    </div>
                    {currentUser?.id !== leader.id && (
                      <a href={`https://mail.google.com/mail/?view=cm&fs=1&to=${leader.email}`} target="_blank" rel="noopener noreferrer" className="block w-full text-center bg-red-800 text-white py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-700 transition-colors">
                        ✉️ Invia Email
                      </a>
                    )}
                    <div className="absolute top-1/2 -right-3 -translate-y-1/2 w-0 h-0 border-y-[12px] border-y-transparent border-l-[12px] border-l-gray-900"></div>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-4 px-4">
                <div className="h-px bg-gray-100 flex-1"></div>
                <span className="text-[9px] font-black text-gray-300 uppercase">Membri</span>
                <div className="h-px bg-gray-100 flex-1"></div>
              </div>

              {/* LISTA STUDENTI CON HOVER CARD */}
              <div className="space-y-4">
                {teamMembers.length > 0 ? teamMembers.map((membro, idx) => (
                  <div key={idx} className="relative flex items-center gap-4 p-4 hover:bg-gray-50 rounded-[2rem] transition-all border-2 border-transparent hover:border-gray-100 group">
                    <img src={membro.avatar_url || '/default-avatar.png'} className="w-12 h-12 rounded-xl object-cover" />
                    <div className="overflow-hidden flex-1">
                      <p className="font-black text-gray-800 truncate leading-none mb-1">{membro.nome} {membro.cognome}</p>
                      <p className={`text-[9px] font-bold uppercase tracking-widest mb-2 ${membro.ruolo_team === 'admin' ? 'text-red-800' : 'text-gray-400'}`}>
                        {membro.ruolo_team === 'admin' ? 'Amministratore' : 'Membro Team'}
                      </p>
                      {currentUser?.id !== membro.id && (
                        <a href={`https://mail.google.com/mail/?view=cm&fs=1&to=${membro.email}`} target="_blank" rel="noopener noreferrer" className="inline-block bg-gray-800 text-white px-3 py-1 rounded-md text-[8px] font-black uppercase tracking-widest hover:bg-black">✉️ Contatta</a>
                      )}
                    </div>

                    {/* HOVER CARD: CV E GESTIONE RUOLI */}
                    <div className="absolute right-[105%] top-1/2 -translate-y-1/2 w-80 bg-gray-900 text-white p-6 rounded-[2rem] opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 z-50 shadow-2xl scale-95 group-hover:scale-100 hidden xl:block border-4 border-gray-800">
                      
                      {/* Intestazione */}
                      <div className="flex items-center gap-4 mb-4">
                        <img src={membro.avatar_url || '/default-avatar.png'} className="w-16 h-16 rounded-2xl object-cover border-2 border-gray-700" />
                        <div>
                          <p className="font-black text-lg leading-tight">{membro.nome} {membro.cognome}</p>
                          <p className="text-[9px] text-gray-400 uppercase tracking-widest mt-1">
                            {membro.nome_corso}
                          </p>
                        </div>
                      </div>

                      {/* Dettagli CV (Visibili ad Admin e Owner) */}
                      {isAdmin && (
                        <div className="bg-white/5 p-4 rounded-2xl mb-4 border border-white/10">
                          <p className="text-[9px] font-black text-red-400 uppercase tracking-widest mb-2">Dettagli Profilo</p>
                          <p className="text-xs text-gray-300 italic line-clamp-3 mb-3">"{membro.bio || 'Nessuna biografia inserita.'}"</p>
                          <div className="flex items-start gap-2 pt-2 border-t border-white/10">
                            <span className="text-lg">🎓</span>
                            <div>
                              <p className="text-[10px] font-black text-white leading-tight uppercase">{membro.nome_corso}</p>
                              <p className="text-[8px] text-gray-500 font-bold uppercase mt-1">Iniziato nel {membro.anno_inizio_corso || 'N.D.'}</p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* AZIONI OWNER */}
                      {isOwner && currentUser?.id !== membro.id && (
                        <div className="flex flex-col gap-2 pt-2 border-t border-gray-800">
                          {membro.ruolo_team !== 'admin' ? (
                            <button onClick={() => handleRoleChange(membro.partecipazione_id, 'admin')} className="w-full bg-green-500/20 text-green-400 hover:bg-green-500 hover:text-white transition-colors py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border border-green-500/30">
                              ⬆️ Promuovi ad Admin
                            </button>
                          ) : (
                            <button onClick={() => handleRoleChange(membro.partecipazione_id, 'membro')} className="w-full bg-orange-500/20 text-orange-400 hover:bg-orange-500 hover:text-white transition-colors py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border border-orange-500/30">
                              ⬇️ Revoca Admin
                            </button>
                          )}
                          <button onClick={() => handleKickMember(membro.partecipazione_id)} className="w-full bg-red-900/50 text-red-400 hover:bg-red-600 hover:text-white transition-colors py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border border-red-900">
                            ❌ Rimuovi dal Team
                          </button>
                        </div>
                      )}

                      <div className="absolute top-1/2 -right-3 -translate-y-1/2 w-0 h-0 border-y-[12px] border-y-transparent border-l-[12px] border-l-gray-900"></div>
                    </div>
                  </div>
                )) : (
                  <p className="text-center py-10 text-gray-300 font-bold italic text-sm">Nessun altro membro per ora.</p>
                )}
              </div>

              {/* --- BOTTONE ABBANDONA TEAM (Non visibile all'Owner) --- */}
              {!isOwner && (
                <div className="mt-8 pt-6 border-t-2 border-gray-100">
                  <button 
                    onClick={handleLeaveTeam} 
                    className="w-full bg-white text-gray-400 hover:bg-red-900 hover:text-white hover:border-red-900 transition-all py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest border-2 border-gray-200 shadow-sm"
                  >
                    🚪 Abbandona il Team
                  </button>
                </div>
              )}

            </div>
          </div>
        </div>

      </div>
    </div>
  )
}