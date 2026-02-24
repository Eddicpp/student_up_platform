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
  const [votingPoll, setVotingPoll] = useState<string | null>(null)

  // Create form state
  const [newPoll, setNewPoll] = useState({
    domanda: '',
    opzioni: ['', ''],
    multipla: false,
    anonimo: false,
    scadenza: ''
  })

  const fetchPolls = useCallback(async () => {
    const { data: pollsData } = await (supabase as any)
      .from('team_poll')
      .select('*')
      .eq('bando_id', bandoId)
      .order('created_at', { ascending: false })

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

    await (supabase as any)
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
    if (!window.confirm('Eliminare questo sondaggio?')) return

    await (supabase as any)
      .from('team_poll')
      .delete()
      .eq('id', pollId)

    fetchPolls()
  }

  const cardStyle = "bg-white rounded-2xl border-2 border-gray-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"

  if (loading) {
    return (
      <div className={cardStyle + " p-6"}>
        <div className="animate-pulse space-y-3">
          <div className="h-6 bg-gray-200 rounded w-1/3"></div>
          <div className="h-20 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  return (
    <div className={cardStyle + " overflow-hidden"}>
      {/* Header */}
      <div className="p-4 border-b-2 border-gray-900 bg-gray-50 flex items-center justify-between">
        <h2 className="text-lg font-black text-gray-900 flex items-center gap-2">
          <span>📊</span> Sondaggi
        </h2>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border-2 ${
            showCreateForm 
              ? 'bg-gray-900 text-white border-gray-700' 
              : 'bg-violet-500 text-white border-violet-600 hover:bg-violet-600'
          }`}
        >
          {showCreateForm ? '✕ Chiudi' : '+ Nuovo'}
        </button>
      </div>

      {/* Create form */}
      {showCreateForm && (
        <div className="p-4 bg-violet-50 border-b-2 border-violet-300">
          <div className="space-y-3">
            <input
              type="text"
              value={newPoll.domanda}
              onChange={(e) => setNewPoll({ ...newPoll, domanda: e.target.value })}
              placeholder="Qual è la domanda?"
              className="w-full px-4 py-3 rounded-xl border-2 border-gray-300 focus:border-gray-900 outline-none font-medium"
              autoFocus
            />

            {/* Options */}
            <div className="space-y-2">
              {newPoll.opzioni.map((opzione, index) => (
                <div key={index} className="flex gap-2">
                  <input
                    type="text"
                    value={opzione}
                    onChange={(e) => updateOption(index, e.target.value)}
                    placeholder={`Opzione ${index + 1}`}
                    className="flex-1 px-4 py-2 rounded-xl border-2 border-gray-300 focus:border-gray-900 outline-none text-sm"
                  />
                  {newPoll.opzioni.length > 2 && (
                    <button
                      onClick={() => removeOption(index)}
                      className="px-3 text-red-500 hover:bg-red-50 rounded-xl"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
              {newPoll.opzioni.length < 6 && (
                <button
                  onClick={addOption}
                  className="w-full py-2 border-2 border-dashed border-gray-300 rounded-xl text-sm text-gray-500 hover:border-gray-400 hover:text-gray-700"
                >
                  + Aggiungi opzione
                </button>
              )}
            </div>

            {/* Settings */}
            <div className="flex flex-wrap gap-3">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={newPoll.multipla}
                  onChange={(e) => setNewPoll({ ...newPoll, multipla: e.target.checked })}
                  className="w-4 h-4 rounded"
                />
                <span className="font-medium">Scelta multipla</span>
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={newPoll.anonimo}
                  onChange={(e) => setNewPoll({ ...newPoll, anonimo: e.target.checked })}
                  className="w-4 h-4 rounded"
                />
                <span className="font-medium">Voto anonimo</span>
              </label>
              <input
                type="datetime-local"
                value={newPoll.scadenza}
                onChange={(e) => setNewPoll({ ...newPoll, scadenza: e.target.value })}
                className="px-3 py-1 rounded-lg border border-gray-300 text-sm"
                placeholder="Scadenza"
              />
            </div>

            <button
              onClick={createPoll}
              disabled={!newPoll.domanda.trim() || newPoll.opzioni.filter(o => o.trim()).length < 2}
              className="w-full py-3 bg-gray-900 text-white rounded-xl font-bold disabled:opacity-50 border-2 border-gray-700"
            >
              Crea Sondaggio
            </button>
          </div>
        </div>
      )}

      {/* Polls list */}
      <div className="max-h-96 overflow-y-auto">
        {polls.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <span className="text-4xl block mb-2">📊</span>
            <p className="font-bold">Nessun sondaggio</p>
            <p className="text-sm">Crea il primo!</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {polls.map(poll => {
              const pollVotes = votes[poll.id] || []
              const totalVotes = pollVotes.length
              const myVotes = pollVotes.filter(v => v.studente_id === currentUserId)
              const hasVoted = myVotes.length > 0
              const creator = members.find(m => m.id === poll.creato_da)
              const creatorColor = creator ? getMemberColor(creator.id) : null
              const isExpired = poll.scadenza && new Date(poll.scadenza) < new Date()
              const canVote = !poll.chiuso && !isExpired

              return (
                <div key={poll.id} className="p-4">
                  {/* Poll header */}
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-bold text-gray-900">{poll.domanda}</h3>
                      <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                        {creator && (
                          <span className={`px-2 py-0.5 rounded-lg ${creatorColor?.light} ${creatorColor?.text}`}>
                            {creator.nome}
                          </span>
                        )}
                        <span>{totalVotes} voti</span>
                        {poll.multipla && <span className="text-violet-600">• Multipla</span>}
                        {poll.anonimo && <span className="text-gray-400">• Anonimo</span>}
                        {poll.chiuso && <span className="text-red-500 font-bold">• Chiuso</span>}
                        {isExpired && !poll.chiuso && <span className="text-amber-500 font-bold">• Scaduto</span>}
                      </div>
                    </div>

                    {poll.creato_da === currentUserId && (
                      <div className="flex gap-1">
                        {!poll.chiuso && (
                          <button
                            onClick={() => closePoll(poll.id)}
                            className="p-1.5 text-amber-500 hover:bg-amber-50 rounded-lg text-xs"
                            title="Chiudi sondaggio"
                          >
                            🔒
                          </button>
                        )}
                        <button
                          onClick={() => deletePoll(poll.id)}
                          className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg text-xs"
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
                          className={`w-full p-3 rounded-xl border-2 text-left transition-all relative overflow-hidden ${
                            isMyVote
                              ? 'border-violet-500 bg-violet-50'
                              : canVote
                                ? 'border-gray-200 hover:border-gray-400'
                                : 'border-gray-200 cursor-default'
                          }`}
                        >
                          {/* Progress bar background */}
                          <div
                            className={`absolute inset-0 ${isMyVote ? 'bg-violet-200' : 'bg-gray-100'}`}
                            style={{ width: `${percentage}%`, transition: 'width 0.3s ease' }}
                          />

                          {/* Content */}
                          <div className="relative flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              {isMyVote && <span className="text-violet-600">✓</span>}
                              <span className={`font-medium text-sm ${isMyVote ? 'text-violet-700' : 'text-gray-700'}`}>
                                {opzione}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              {/* Voter avatars */}
                              {voters.length > 0 && !poll.anonimo && (
                                <div className="flex -space-x-2">
                                  {voters.slice(0, 3).map((voter: any, i) => (
                                    <img
                                      key={i}
                                      src={voter.avatar_url || '/default-avatar.png'}
                                      className="w-5 h-5 rounded-full border border-white"
                                      alt=""
                                      title={`${voter.nome} ${voter.cognome}`}
                                    />
                                  ))}
                                  {voters.length > 3 && (
                                    <span className="w-5 h-5 rounded-full bg-gray-200 border border-white flex items-center justify-center text-[10px] font-bold">
                                      +{voters.length - 3}
                                    </span>
                                  )}
                                </div>
                              )}
                              <span className={`text-sm font-bold ${isMyVote ? 'text-violet-600' : 'text-gray-500'}`}>
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