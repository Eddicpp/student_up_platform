'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getMemberColor, TODO_PRIORITIES } from '@/lib/member-colors'

interface Todo {
  id: string
  testo: string
  completato: boolean
  priorita: 'bassa' | 'normale' | 'alta' | 'urgente'
  scadenza: string | null
  assegnato_a: string | null
  creato_da: string
  created_at: string
}

interface TeamMember {
  id: string
  nome: string
  cognome: string
  avatar_url: string | null
}

interface TeamTodoListProps {
  bandoId: string
  currentUserId: string
  members: TeamMember[]
}

export default function TeamTodoList({ bandoId, currentUserId, members }: TeamTodoListProps) {
  const supabase = createClient()
  const [todos, setTodos] = useState<Todo[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [filter, setFilter] = useState<'all' | 'mine' | 'pending' | 'completed'>('all')

  // Modifica
  const [editingTodo, setEditingTodo] = useState<string | null>(null)
  const [editFormData, setEditFormData] = useState({
    testo: '',
    priorita: 'normale' as any,
    assegnato_a: '',
    scadenza: ''
  })

  // Form aggiunta
  const [newTodo, setNewTodo] = useState({
    testo: '',
    priorita: 'normale' as const,
    assegnato_a: '',
    scadenza: ''
  })

  const fetchTodos = useCallback(async () => {
    const { data, error } = await (supabase as any)
      .from('team_todo')
      .select('*')
      .eq('bando_id', bandoId)
      .order('created_at', { ascending: false })

    if (error) console.error("Errore fetch todo:", error)
    if (data) setTodos(data)
    setLoading(false)
  }, [bandoId, supabase])

  useEffect(() => {
    fetchTodos()

    const channel = supabase
      .channel(`todos-${bandoId}`)
      .on('postgres_changes' as any, {
        event: '*',
        schema: 'public',
        table: 'team_todo',
        filter: `bando_id=eq.${bandoId}`
      }, () => {
        fetchTodos()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [bandoId, fetchTodos])

  const addTodo = async () => {
    if (!newTodo.testo.trim()) return

    const { error } = await (supabase as any)
      .from('team_todo')
      .insert({
        bando_id: bandoId,
        testo: newTodo.testo.trim(),
        priorita: newTodo.priorita,
        assegnato_a: newTodo.assegnato_a || null,
        scadenza: newTodo.scadenza || null,
        creato_da: currentUserId 
      })

    if (error) {
      alert(`Errore durante il salvataggio: ${error.message}`)
      return
    }

    setNewTodo({ testo: '', priorita: 'normale', assegnato_a: '', scadenza: '' })
    setShowAddForm(false)
    fetchTodos()
  }

  const toggleTodo = async (id: string, completato: boolean) => {
    await (supabase as any)
      .from('team_todo')
      .update({ completato: !completato, updated_at: new Date().toISOString() })
      .eq('id', id)
    fetchTodos()
  }

  const deleteTodo = async (id: string) => {
    if (!window.confirm('Sei sicuro di voler eliminare questa attività?')) return
    await (supabase as any).from('team_todo').delete().eq('id', id)
    fetchTodos()
  }

  const startEditing = (todo: Todo) => {
    setEditFormData({
      testo: todo.testo,
      priorita: todo.priorita,
      assegnato_a: todo.assegnato_a || '',
      scadenza: todo.scadenza || ''
    })
    setEditingTodo(todo.id)
  }

  const saveEdit = async () => {
    if (!editFormData.testo.trim()) return

    const { error } = await (supabase as any)
      .from('team_todo')
      .update({
        testo: editFormData.testo.trim(),
        priorita: editFormData.priorita,
        assegnato_a: editFormData.assegnato_a || null,
        scadenza: editFormData.scadenza || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', editingTodo)

    if (error) {
      alert(`Errore modifica: ${error.message}`)
      return
    }

    setEditingTodo(null)
    fetchTodos()
  }

  // Filter & Sort
  const filteredTodos = todos.filter(todo => {
    switch (filter) {
      case 'mine': return todo.assegnato_a === currentUserId
      case 'pending': return !todo.completato
      case 'completed': return todo.completato
      default: return true
    }
  })

  const sortedTodos = [...filteredTodos].sort((a, b) => {
    if (a.completato !== b.completato) return a.completato ? 1 : -1
    const priorityOrder = { urgente: 0, alta: 1, normale: 2, bassa: 3 }
    return priorityOrder[a.priorita] - priorityOrder[b.priorita]
  })

  const stats = {
    total: todos.length,
    completed: todos.filter(t => t.completato).length,
    pending: todos.filter(t => !t.completato).length,
    mine: todos.filter(t => t.assegnato_a === currentUserId).length
  }

  const cardStyle = "bg-white rounded-2xl border-2 border-gray-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"

  if (loading) {
    return (
      <div className={cardStyle + " p-6"}>
        <div className="animate-pulse space-y-3">
          <div className="h-6 bg-gray-200 rounded w-1/3"></div>
          <div className="h-10 bg-gray-200 rounded"></div>
          <div className="h-10 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  return (
    <div className={cardStyle + " overflow-hidden flex flex-col h-[600px]"}>
      {/* Header */}
      <div className="p-4 border-b-2 border-gray-900 bg-gray-50 flex-shrink-0">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-black text-gray-900 flex items-center gap-2">
            <span>✅</span> To-Do List
          </h2>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border-2 ${
              showAddForm 
                ? 'bg-gray-900 text-white border-gray-700 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] translate-x-[1px] translate-y-[1px]' 
                : 'bg-green-400 text-gray-900 border-gray-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-green-500'
            }`}
          >
            {showAddForm ? '✕ Chiudi' : '+ Aggiungi'}
          </button>
        </div>

        {/* Stats */}
        <div className="flex gap-2 text-xs">
          <span className="px-2 py-1 bg-gray-200 text-gray-900 rounded-lg font-bold border border-gray-400">{stats.total} totali</span>
          <span className="px-2 py-1 bg-green-200 text-green-900 border border-green-400 rounded-lg font-bold">{stats.completed} ✓</span>
          <span className="px-2 py-1 bg-amber-200 text-amber-900 border border-amber-400 rounded-lg font-bold">{stats.pending} pending</span>
        </div>
      </div>

      {/* Add form */}
      {showAddForm && (
        <div className="p-4 bg-blue-100 border-b-2 border-gray-900 flex-shrink-0">
          <div className="space-y-3">
            <input
              type="text"
              value={newTodo.testo}
              onChange={(e) => setNewTodo({ ...newTodo, testo: e.target.value })}
              placeholder="Cosa c'è da fare?"
              className="w-full px-4 py-3 bg-white text-gray-900 placeholder:text-gray-500 rounded-xl border-2 border-gray-900 focus:outline-none focus:translate-x-[2px] focus:translate-y-[2px] focus:shadow-none shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] font-black transition-all"
              autoFocus
            />
            
            <div className="grid grid-cols-3 gap-2">
              <select
                value={newTodo.priorita}
                onChange={(e) => setNewTodo({ ...newTodo, priorita: e.target.value as any })}
                className="px-3 py-2 bg-white text-gray-900 font-bold rounded-xl border-2 border-gray-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] text-sm cursor-pointer outline-none"
              >
                <option value="bassa">⬇️ Bassa</option>
                <option value="normale">➡️ Normale</option>
                <option value="alta">⬆️ Alta</option>
                <option value="urgente">🔴 Urgente</option>
              </select>

              <select
                value={newTodo.assegnato_a}
                onChange={(e) => setNewTodo({ ...newTodo, assegnato_a: e.target.value })}
                className="px-3 py-2 bg-white text-gray-900 font-bold rounded-xl border-2 border-gray-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] text-sm cursor-pointer outline-none"
              >
                <option value="">👤 Nessuno</option>
                {members.map(m => (
                  <option key={m.id} value={m.id}>{m.nome}</option>
                ))}
              </select>

              <input
                type="date"
                value={newTodo.scadenza}
                onChange={(e) => setNewTodo({ ...newTodo, scadenza: e.target.value })}
                className="px-3 py-2 bg-white text-gray-900 font-bold rounded-xl border-2 border-gray-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] text-sm cursor-pointer outline-none"
              />
            </div>

            <button
              onClick={addTodo}
              disabled={!newTodo.testo.trim()}
              className="w-full py-3 bg-gray-900 hover:bg-gray-800 text-white rounded-xl font-black uppercase tracking-widest disabled:opacity-50 border-2 border-gray-900 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[3px] hover:translate-y-[3px] transition-all mt-1"
            >
              Aggiungi Attività
            </button>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="p-3 border-b-2 border-gray-900 bg-gray-50 flex gap-2 overflow-x-auto flex-shrink-0">
        {[
          { id: 'all', label: 'Tutti' },
          { id: 'pending', label: 'Da fare' },
          { id: 'mine', label: 'Assegnati a me' },
          { id: 'completed', label: 'Completati' },
        ].map(f => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id as any)}
            className={`px-3 py-1.5 rounded-lg text-xs font-black whitespace-nowrap transition-all border-2 ${
              filter === f.id
                ? 'bg-gray-900 text-white border-gray-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] translate-x-[1px] translate-y-[1px]'
                : 'bg-white text-gray-700 border-gray-400 hover:border-gray-900 hover:text-gray-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Todo list */}
      <div className="flex-1 overflow-y-auto bg-white p-3">
        {sortedTodos.length === 0 ? (
          <div className="p-8 text-center text-gray-500 h-full flex flex-col justify-center border-4 border-dashed border-gray-200 rounded-2xl m-2">
            <span className="text-4xl block mb-2">📋</span>
            <p className="font-black text-gray-900 text-lg">Nessuna attività</p>
            <p className="text-sm font-bold mt-1">Niente da fare qui. Crea un nuovo task!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {sortedTodos.map(todo => {
              const assignee = members.find(m => m.id === todo.assegnato_a)
              const assigneeColor = assignee ? getMemberColor(assignee.id) : null
              const priorityStyle = TODO_PRIORITIES[todo.priorita]
              const isOverdue = todo.scadenza && new Date(todo.scadenza) < new Date() && !todo.completato
              const isEditing = editingTodo === todo.id

              return (
                <div
                  key={todo.id}
                  className={`p-3 rounded-xl border-2 border-gray-900 transition-all flex items-start gap-3 ${
                    todo.completato 
                      ? 'bg-gray-100 opacity-80' 
                      : 'bg-white shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]'
                  }`}
                >
                  {/* SINISTRA: Spunta Checkbox Evidente */}
                  {!isEditing && (
                    <button
                      onClick={() => toggleTodo(todo.id, todo.completato)}
                      className={`w-8 h-8 rounded-lg border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-all focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2 ${
                        todo.completato
                          ? 'bg-green-400 border-gray-900 text-gray-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] translate-x-[1px] translate-y-[1px]'
                          : 'bg-white border-gray-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-gray-100'
                      }`}
                    >
                      {todo.completato && (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="4">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </button>
                  )}

                  {/* CENTRO: Contenuto o Modulo Modifica */}
                  <div className="flex-1 min-w-0">
                    {isEditing ? (
                      // --- FORM DI MODIFICA ---
                      <div className="space-y-3 pb-1">
                        <input
                          type="text"
                          value={editFormData.testo}
                          onChange={(e) => setEditFormData({ ...editFormData, testo: e.target.value })}
                          className="w-full px-3 py-2 bg-yellow-50 text-gray-900 rounded-lg border-2 border-gray-900 focus:outline-none font-black text-sm"
                          autoFocus
                        />
                        <div className="grid grid-cols-3 gap-2">
                          <select
                            value={editFormData.priorita}
                            onChange={(e) => setEditFormData({ ...editFormData, priorita: e.target.value as any })}
                            className="px-2 py-1 bg-white text-gray-900 font-bold rounded-lg border-2 border-gray-900 text-xs outline-none"
                          >
                            <option value="bassa">⬇️ Bassa</option>
                            <option value="normale">➡️ Normale</option>
                            <option value="alta">⬆️ Alta</option>
                            <option value="urgente">🔴 Urgente</option>
                          </select>
                          <select
                            value={editFormData.assegnato_a}
                            onChange={(e) => setEditFormData({ ...editFormData, assegnato_a: e.target.value })}
                            className="px-2 py-1 bg-white text-gray-900 font-bold rounded-lg border-2 border-gray-900 text-xs outline-none"
                          >
                            <option value="">👤 Nessuno</option>
                            {members.map(m => (
                              <option key={m.id} value={m.id}>{m.nome}</option>
                            ))}
                          </select>
                          <input
                            type="date"
                            value={editFormData.scadenza}
                            onChange={(e) => setEditFormData({ ...editFormData, scadenza: e.target.value })}
                            className="px-2 py-1 bg-white text-gray-900 font-bold rounded-lg border-2 border-gray-900 text-xs outline-none"
                          />
                        </div>
                        <div className="flex gap-2 pt-2">
                          <button onClick={saveEdit} className="flex-1 py-2 bg-green-400 border-2 border-gray-900 rounded-lg text-xs font-black uppercase tracking-wider shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all">
                            Salva
                          </button>
                          <button onClick={() => setEditingTodo(null)} className="flex-1 py-2 bg-gray-200 border-2 border-gray-900 rounded-lg text-xs font-black uppercase tracking-wider shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all">
                            Annulla
                          </button>
                        </div>
                      </div>
                    ) : (
                      // --- VISUALIZZAZIONE NORMALE ---
                      <>
                        <p className={`font-black text-sm leading-tight mt-1 ${todo.completato ? 'line-through text-gray-500' : 'text-gray-900'}`}>
                          {todo.testo}
                        </p>
                        
                        <div className="flex flex-wrap items-center gap-2 mt-2">
                          <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black border-2 border-gray-900 ${priorityStyle.color} shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]`}>
                            {priorityStyle.icon} {todo.priorita}
                          </span>

                          {assignee && (
                            <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black flex items-center gap-1 ${assigneeColor?.light} ${assigneeColor?.text} border-2 border-gray-900 shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]`}>
                              <img src={assignee.avatar_url || '/default-avatar.png'} className="w-3 h-3 rounded-full border border-gray-900" alt="" />
                              {assignee.nome}
                            </span>
                          )}

                          {todo.scadenza && (
                            <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black border-2 border-gray-900 shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] ${
                              isOverdue 
                                ? 'bg-red-400 text-gray-900' 
                                : 'bg-gray-200 text-gray-800'
                            }`}>
                              📅 {new Date(todo.scadenza).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })}
                            </span>
                          )}
                        </div>
                      </>
                    )}
                  </div>

                  {/* DESTRA: Azioni Rapide (Matita e Cestino) */}
                  {!isEditing && (
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {/* Tasto Modifica */}
                      <button
                        onClick={() => startEditing(todo)}
                        title="Modifica"
                        className="p-1.5 bg-yellow-300 hover:bg-yellow-400 border-2 border-gray-900 rounded-lg shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all text-sm"
                      >
                        ✏️
                      </button>

                      {/* Tasto Elimina */}
                      <button
                        onClick={() => deleteTodo(todo.id)}
                        title="Elimina"
                        className="p-1.5 bg-red-400 hover:bg-red-500 border-2 border-gray-900 rounded-lg shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all text-sm"
                      >
                        🗑️
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}