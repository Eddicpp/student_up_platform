'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getMemberColor } from '@/lib/member-colors'

interface Poll {
  id: string
  domanda: string
  opzioni: string[]
  creato_da: string
  scadenza: string | null
  multipla: boolean
  anonimo: boolean
  chiuso: boolean
  created_at: string
}

interface PollVote {
  poll_id: string
  studente_id: string
  opzione_index: number
}

interface TeamMember {
  id: string
  nome: string
  cognome: string
  avatar_url: string | null
}

interface TeamPollsProps {
  bandoId: string
  currentUserId: string
  members: TeamMember[]
}

export default function TeamPolls({ bandoId, currentUserId, members }: TeamPollsProps) {
  const supabase = createClient()
  const [polls, setPolls] = useState<Poll[]>([])
  const [votes, setVotes] = useState<Record<string, PollVote[]>>({})
  const [loading, setLoading] = useState(true)
  const [showCreateForm, setShowCreateForm] = useState(false)

  // Create form state
  const [newPoll, setNewPoll] = useState({
    domanda: '',
    opzioni: ['', ''],
    multipla: false,
    anonimo: false,
    scadenza: ''
  })

  const fetchPolls = useCallback(async () => {
    const { data: pollsData, error: pollsError } = await (supabase as any)
      .from('team_poll')
      .select('*')
      .eq('bando_id', bandoId)
      .order('created_at', { ascending: false })

    if (pollsError) {
      console.error("Errore fetch sondaggi:", pollsError)
    }

    if (pollsData) {
      setPolls(pollsData)

      // Fetch votes for each poll
      const votesMap: Record<string, PollVote[]> = {}
      for (const poll of pollsData) {
        const { data: votesData } = await (supabase as any)
          .from('team_poll_voto')
          .select('poll_id, studente_id, opzione_index')
          .eq('poll_id', poll.id)

        votesMap[poll.id] = votesData || []
      }
      setVotes(votesMap)
    }
    setLoading(false)
  }, [bandoId, supabase])

  useEffect(() => {
    fetchPolls()

    // Realtime
    const channel = supabase
      .channel(`polls-${bandoId}`)
      .on('postgres_changes' as any, {
        event: '*',
        schema: 'public',
        table: 'team_poll',
        filter: `bando_id=eq.${bandoId}`
      }, () => fetchPolls())
      .on('postgres_changes' as any, {
        event: '*',
        schema: 'public',
        table: 'team_poll_voto'
      }, () => fetchPolls())
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [bandoId, fetchPolls])

  const addOption = () => {
    if (newPoll.opzioni.length < 6) {
      setNewPoll({ ...newPoll, opzioni: [...newPoll.opzioni, ''] })
    }
  }

  const removeOption = (index: number) => {
    if (newPoll.opzioni.length > 2) {
      setNewPoll({ ...newPoll, opzioni: newPoll.opzioni.filter((_, i) => i !== index) })
    }
  }

  const updateOption = (index: number, value: string) => {
    const newOpzioni = [...newPoll.opzioni]
    newOpzioni[index] = value
    setNewPoll({ ...newPoll, opzioni: newOpzioni })
  }

  const createPoll = async () => {
    const validOpzioni = newPoll.opzioni.filter(o => o.trim())
    if (!newPoll.domanda.trim() || validOpzioni.length < 2) return

    const { error } = await (supabase as any)
      .from('team_poll')
      .insert({
        bando_id: bandoId,
        domanda: newPoll.domanda.trim(),
        opzioni: validOpzioni,
        creato_da: currentUserId,
        multipla: newPoll.multipla,
        anonimo: newPoll.anonimo,
        scadenza: newPoll.scadenza || null
      })

    if (error) {
      alert(`Errore creazione sondaggio: ${error.message}`)
      return
    }

    setNewPoll({ domanda: '', opzioni: ['', ''], multipla: false, anonimo: false, scadenza: '' })
    setShowCreateForm(false)
    fetchPolls()
  }

  const vote = async (pollId: string, optionIndex: number) => {
    const poll = polls.find(p => p.id === pollId)
    if (!poll) return

    const myVotes = votes[pollId]?.filter(v => v.studente_id === currentUserId) || []
    const hasVotedThis = myVotes.some(v => v.opzione_index === optionIndex)

    if (hasVotedThis) {
      // Remove vote
      await (supabase as any)
        .from('team_poll_voto')
        .delete()
        .eq('poll_id', pollId)
        .eq('studente_id', currentUserId)
        .eq('opzione_index', optionIndex)
    } else {
      // If not multipla, remove previous votes
      if (!poll.multipla && myVotes.length > 0) {
        await (supabase as any)
          .from('team_poll_voto')
          .delete()
          .eq('poll_id', pollId)
          .eq('studente_id', currentUserId)
      }

      // Add vote
      await (supabase as any)
        .from('team_poll_voto')
        .insert({
          poll_id: pollId,
          studente_id: currentUserId,
          opzione_index: optionIndex
        })
    }

    fetchPolls()
  }

  const closePoll = async (pollId: string) => {
    await (supabase as any)
      .from('team_poll')
      .update({ chiuso: true })
      .eq('id', pollId)

    fetchPolls()
  }

  const deletePoll = async (pollId: string) => {
    if (!window.confirm('Eliminare questo sondaggio in modo permanente?')) return

    await (supabase as any)
      .from('team_poll')
      .delete()
      .eq('id', pollId)

    fetchPolls()
  }

  const cardStyle = "bg-white rounded-2xl border-2 border-gray-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"

  if (loading) {
    return (
      <div className={cardStyle + " p-6 h-[600px] flex items-center justify-center"}>
        <div className="animate-pulse space-y-4 w-full">
          <div className="h-8 bg-gray-200 rounded-xl w-1/3 mx-auto"></div>
          <div className="h-32 bg-gray-200 rounded-xl w-full"></div>
        </div>
      </div>
    )
  }

  return (
    <div className={cardStyle + " overflow-hidden flex flex-col h-[600px]"}>
      {/* Header */}
      <div className="p-4 border-b-2 border-gray-900 bg-gray-50 flex items-center justify-between flex-shrink-0">
        <h2 className="text-lg font-black text-gray-900 flex items-center gap-2">
          <span>📊</span> Sondaggi
        </h2>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className={`px-4 py-2 rounded-xl text-xs font-black transition-all border-2 border-gray-900 uppercase tracking-widest ${
            showCreateForm 
              ? 'bg-gray-900 text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] translate-x-[1px] translate-y-[1px]' 
              : 'bg-violet-300 text-gray-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-violet-400 hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px]'
          }`}
        >
          {showCreateForm ? '✕ Chiudi' : '+ Nuovo'}
        </button>
      </div>

      {/* Create form */}
      {showCreateForm && (
        <div className="p-4 bg-violet-100 border-b-2 border-gray-900 flex-shrink-0">
          <div className="space-y-3">
            <input
              type="text"
              value={newPoll.domanda}
              onChange={(e) => setNewPoll({ ...newPoll, domanda: e.target.value })}
              placeholder="Qual è la domanda?"
              className="w-full px-4 py-3 rounded-xl border-2 border-gray-900 focus:outline-none focus:translate-x-[2px] focus:translate-y-[2px] focus:shadow-none shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] font-black text-gray-900 placeholder:text-gray-500 transition-all"
              autoFocus
            />

            {/* Options */}
            <div className="space-y-2 bg-white p-3 rounded-xl border-2 border-gray-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
              <p className="text-xs font-black uppercase tracking-widest text-gray-600 mb-2">Opzioni di risposta</p>
              {newPoll.opzioni.map((opzione, index) => (
                <div key={index} className="flex gap-2">
                  <input
                    type="text"
                    value={opzione}
                    onChange={(e) => updateOption(index, e.target.value)}
                    placeholder={`Opzione ${index + 1}`}
                    className="flex-1 px-3 py-2 rounded-lg border-2 border-gray-400 focus:border-gray-900 outline-none text-sm font-bold text-gray-900 placeholder:text-gray-400 transition-colors"
                  />
                  {newPoll.opzioni.length > 2 && (
                    <button
                      onClick={() => removeOption(index)}
                      className="px-3 bg-red-100 hover:bg-red-400 text-red-600 hover:text-gray-900 border-2 border-red-300 hover:border-gray-900 rounded-lg font-black transition-colors"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
              {newPoll.opzioni.length < 6 && (
                <button
                  onClick={addOption}
                  className="w-full py-2 mt-2 border-2 border-dashed border-gray-400 rounded-lg text-sm font-black uppercase tracking-widest text-gray-500 hover:border-gray-900 hover:text-gray-900 transition-colors"
                >
                  + Aggiungi opzione
                </button>
              )}
            </div>

            {/* Settings */}
            <div className="flex flex-wrap gap-3 bg-white p-3 rounded-xl border-2 border-gray-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
              <label className="flex items-center gap-2 text-sm cursor-pointer group">
                <div className={`w-5 h-5 rounded border-2 border-gray-900 flex items-center justify-center transition-colors ${newPoll.multipla ? 'bg-violet-400' : 'bg-white'}`}>
                  {newPoll.multipla && <span className="text-gray-900 font-black text-xs">✓</span>}
                </div>
                <input
                  type="checkbox"
                  checked={newPoll.multipla}
                  onChange={(e) => setNewPoll({ ...newPoll, multipla: e.target.checked })}
                  className="hidden"
                />
                <span className="font-black text-gray-900 uppercase tracking-wider text-xs">Scelta Multipla</span>
              </label>

              <label className="flex items-center gap-2 text-sm cursor-pointer group">
                <div className={`w-5 h-5 rounded border-2 border-gray-900 flex items-center justify-center transition-colors ${newPoll.anonimo ? 'bg-gray-900' : 'bg-white'}`}>
                  {newPoll.anonimo && <span className="text-white font-black text-xs">✓</span>}
                </div>
                <input
                  type="checkbox"
                  checked={newPoll.anonimo}
                  onChange={(e) => setNewPoll({ ...newPoll, anonimo: e.target.checked })}
                  className="hidden"
                />
                <span className="font-black text-gray-900 uppercase tracking-wider text-xs">Voto Anonimo</span>
              </label>

              <div className="w-full h-0.5 bg-gray-200 my-1" />

              <div className="w-full flex items-center justify-between">
                <span className="font-black text-gray-900 uppercase tracking-wider text-xs">Scadenza (Opzionale)</span>
                <input
                  type="datetime-local"
                  value={newPoll.scadenza}
                  onChange={(e) => setNewPoll({ ...newPoll, scadenza: e.target.value })}
                  className="px-3 py-1 rounded-lg border-2 border-gray-900 text-xs font-bold text-gray-900 outline-none"
                />
              </div>
            </div>

            <button
              onClick={createPoll}
              disabled={!newPoll.domanda.trim() || newPoll.opzioni.filter(o => o.trim()).length < 2}
              className="w-full py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl font-black uppercase tracking-widest disabled:opacity-50 border-2 border-gray-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[4px] hover:translate-y-[4px] transition-all"
            >
              Pubblica Sondaggio
            </button>
          </div>
        </div>
      )}

      {/* Polls list */}
      <div className="flex-1 overflow-y-auto p-3 bg-gray-100">
        {polls.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-gray-500 border-4 border-dashed border-gray-300 rounded-2xl">
            <span className="text-5xl block mb-4">📊</span>
            <p className="font-black text-xl text-gray-900">Nessun sondaggio</p>
            <p className="text-sm font-bold mt-2">Crea il primo sondaggio per il team!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {polls.map(poll => {
              const pollVotes = votes[poll.id] || []
              const totalVotes = pollVotes.length
              const myVotes = pollVotes.filter(v => v.studente_id === currentUserId)
              const creator = members.find(m => m.id === poll.creato_da)
              const creatorColor = creator ? getMemberColor(creator.id) : null
              const isExpired = poll.scadenza && new Date(poll.scadenza) < new Date()
              const canVote = !poll.chiuso && !isExpired

              return (
                <div key={poll.id} className="bg-white p-4 rounded-xl border-2 border-gray-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                  {/* Poll header */}
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="font-black text-lg text-gray-900 leading-tight mb-2 uppercase">{poll.domanda}</h3>
                      <div className="flex flex-wrap items-center gap-2 mt-1 text-[10px] font-black uppercase tracking-widest">
                        {creator && (
                          <span className={`px-2 py-1 rounded-lg border-2 border-gray-900 ${creatorColor?.light} ${creatorColor?.text} shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]`}>
                            {creator.nome}
                          </span>
                        )}
                        <span className="bg-gray-200 text-gray-700 px-2 py-1 rounded-lg border-2 border-gray-400">{totalVotes} Voti</span>
                        {poll.multipla && <span className="bg-violet-200 text-violet-800 px-2 py-1 rounded-lg border-2 border-violet-400">Multipla</span>}
                        {poll.anonimo && <span className="bg-gray-800 text-white px-2 py-1 rounded-lg border-2 border-gray-900">Anonimo</span>}
                        {poll.chiuso && <span className="bg-red-500 text-white px-2 py-1 rounded-lg border-2 border-gray-900">Chiuso</span>}
                        {isExpired && !poll.chiuso && <span className="bg-amber-400 text-gray-900 px-2 py-1 rounded-lg border-2 border-gray-900">Scaduto</span>}
                      </div>
                    </div>

                    {poll.creato_da === currentUserId && (
                      <div className="flex gap-1.5 flex-shrink-0 ml-2">
                        {!poll.chiuso && (
                          <button
                            onClick={() => closePoll(poll.id)}
                            className="p-2 bg-amber-300 hover:bg-amber-400 border-2 border-gray-900 rounded-lg shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none transition-all"
                            title="Chiudi sondaggio"
                          >
                            🔒
                          </button>
                        )}
                        <button
                          onClick={() => deletePoll(poll.id)}
                          className="p-2 bg-red-400 hover:bg-red-500 border-2 border-gray-900 rounded-lg shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none transition-all"
                          title="Elimina"
                        >
                          🗑️
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Options */}
                  <div className="space-y-2">
                    {poll.opzioni.map((opzione, index) => {
                      const optionVotes = pollVotes.filter(v => v.opzione_index === index)
                      const percentage = totalVotes > 0 ? (optionVotes.length / totalVotes) * 100 : 0
                      const isMyVote = myVotes.some(v => v.opzione_index === index)
                      const voters = poll.anonimo ? [] : optionVotes.map(v => members.find(m => m.id === v.studente_id)).filter(Boolean)

                      return (
                        <button
                          key={index}
                          onClick={() => canVote && vote(poll.id, index)}
                          disabled={!canVote}
                          className={`w-full p-3 rounded-xl border-2 text-left transition-all relative overflow-hidden group ${
                            isMyVote
                              ? 'border-gray-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] translate-x-[2px] translate-y-[2px]'
                              : canVote
                                ? 'border-gray-400 hover:border-gray-900 hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'
                                : 'border-gray-300 cursor-not-allowed opacity-80'
                          }`}
                        >
                          {/* Progress bar background */}
                          <div
                            className={`absolute inset-0 z-0 ${isMyVote ? 'bg-violet-300' : 'bg-gray-100'}`}
                            style={{ width: `${percentage}%`, transition: 'width 0.5s cubic-bezier(0.4, 0, 0.2, 1)' }}
                          />

                          {/* Content */}
                          <div className="relative z-10 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              {/* Custom Checkbox */}
                              <div className={`w-5 h-5 rounded flex items-center justify-center border-2 transition-colors ${
                                isMyVote ? 'bg-gray-900 border-gray-900' : 'bg-white border-gray-500 group-hover:border-gray-900'
                              }`}>
                                {isMyVote && <span className="text-white text-xs font-black">✓</span>}
                              </div>
                              <span className={`font-black text-sm ${isMyVote ? 'text-gray-900' : 'text-gray-700'}`}>
                                {opzione}
                              </span>
                            </div>
                            
                            <div className="flex items-center gap-3">
                              {/* Voter avatars */}
                              {voters.length > 0 && !poll.anonimo && (
                                <div className="flex -space-x-2">
                                  {voters.slice(0, 3).map((voter: any, i) => (
                                    <img
                                      key={i}
                                      src={voter.avatar_url || '/default-avatar.png'}
                                      className="w-6 h-6 rounded-full border-2 border-gray-900 object-cover"
                                      alt=""
                                      title={`${voter.nome} ${voter.cognome}`}
                                    />
                                  ))}
                                  {voters.length > 3 && (
                                    <span className="w-6 h-6 rounded-full bg-white border-2 border-gray-900 flex items-center justify-center text-[9px] font-black">
                                      +{voters.length - 3}
                                    </span>
                                  )}
                                </div>
                              )}
                              <span className={`text-sm font-black w-10 text-right ${isMyVote ? 'text-gray-900' : 'text-gray-500'}`}>
                                {percentage.toFixed(0)}%
                              </span>
                            </div>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}