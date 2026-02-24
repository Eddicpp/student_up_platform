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

  // Form state
  const [newTodo, setNewTodo] = useState({
    testo: '',
    priorita: 'normale' as const,
    assegnato_a: '',
    scadenza: ''
  })

  const fetchTodos = useCallback(async () => {
    const { data } = await (supabase as any)
      .from('team_todo')
      .select('*')
      .eq('bando_id', bandoId)
      .order('created_at', { ascending: false })

    if (data) setTodos(data)
    setLoading(false)
  }, [bandoId, supabase])

  useEffect(() => {
    fetchTodos()

    // Realtime
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

    await (supabase as any)
      .from('team_todo')
      .insert({
        bando_id: bandoId,
        testo: newTodo.testo.trim(),
        priorita: newTodo.priorita,
        assegnato_a: newTodo.assegnato_a || null,
        scadenza: newTodo.scadenza || null,
        creato_da: currentUserId
      })

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
    if (!window.confirm('Eliminare questa attività?')) return

    await (supabase as any)
      .from('team_todo')
      .delete()
      .eq('id', id)

    fetchTodos()
  }

  // Filter todos
  const filteredTodos = todos.filter(todo => {
    switch (filter) {
      case 'mine': return todo.assegnato_a === currentUserId
      case 'pending': return !todo.completato
      case 'completed': return todo.completato
      default: return true
    }
  })

  // Sort by priority and completion
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
    <div className={cardStyle + " overflow-hidden"}>
      {/* Header */}
      <div className="p-4 border-b-2 border-gray-900 bg-gray-50">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-black text-gray-900 flex items-center gap-2">
            <span>✅</span> To-Do List
          </h2>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border-2 ${
              showAddForm 
                ? 'bg-gray-900 text-white border-gray-700' 
                : 'bg-green-500 text-white border-green-600 hover:bg-green-600'
            }`}
          >
            {showAddForm ? '✕ Chiudi' : '+ Aggiungi'}
          </button>
        </div>

        {/* Stats */}
        <div className="flex gap-2 text-xs">
          <span className="px-2 py-1 bg-gray-200 text-gray-700 rounded-lg font-bold">{stats.total} totali</span>
          <span className="px-2 py-1 bg-green-100 text-green-700 rounded-lg font-bold">{stats.completed} ✓</span>
          <span className="px-2 py-1 bg-amber-100 text-amber-700 rounded-lg font-bold">{stats.pending} pending</span>
        </div>
      </div>

      {/* Add form */}
      {showAddForm && (
        <div className="p-4 bg-blue-50 border-b-2 border-blue-300">
          <div className="space-y-3">
            <input
              type="text"
              value={newTodo.testo}
              onChange={(e) => setNewTodo({ ...newTodo, testo: e.target.value })}
              placeholder="Cosa c'è da fare?"
              className="w-full px-4 py-3 rounded-xl border-2 border-gray-300 focus:border-gray-900 outline-none font-medium"
              autoFocus
            />
            
            <div className="grid grid-cols-3 gap-2">
              {/* Priority */}
              <select
                value={newTodo.priorita}
                onChange={(e) => setNewTodo({ ...newTodo, priorita: e.target.value as any })}
                className="px-3 py-2 rounded-xl border-2 border-gray-300 text-sm font-medium"
              >
                <option value="bassa">⬇️ Bassa</option>
                <option value="normale">➡️ Normale</option>
                <option value="alta">⬆️ Alta</option>
                <option value="urgente">🔴 Urgente</option>
              </select>

              {/* Assignee */}
              <select
                value={newTodo.assegnato_a}
                onChange={(e) => setNewTodo({ ...newTodo, assegnato_a: e.target.value })}
                className="px-3 py-2 rounded-xl border-2 border-gray-300 text-sm font-medium"
              >
                <option value="">👤 Nessuno</option>
                {members.map(m => (
                  <option key={m.id} value={m.id}>{m.nome}</option>
                ))}
              </select>

              {/* Due date */}
              <input
                type="date"
                value={newTodo.scadenza}
                onChange={(e) => setNewTodo({ ...newTodo, scadenza: e.target.value })}
                className="px-3 py-2 rounded-xl border-2 border-gray-300 text-sm font-medium"
              />
            </div>

            <button
              onClick={addTodo}
              disabled={!newTodo.testo.trim()}
              className="w-full py-3 bg-gray-900 text-white rounded-xl font-bold disabled:opacity-50 border-2 border-gray-700"
            >
              Aggiungi Attività
            </button>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="p-3 border-b border-gray-200 flex gap-2 overflow-x-auto">
        {[
          { id: 'all', label: 'Tutti' },
          { id: 'pending', label: 'Da fare' },
          { id: 'mine', label: 'Assegnati a me' },
          { id: 'completed', label: 'Completati' },
        ].map(f => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id as any)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
              filter === f.id
                ? 'bg-gray-900 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Todo list */}
      <div className="max-h-80 overflow-y-auto">
        {sortedTodos.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <span className="text-4xl block mb-2">📋</span>
            <p className="font-bold">Nessuna attività</p>
            <p className="text-sm">Aggiungi la prima!</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {sortedTodos.map(todo => {
              const assignee = members.find(m => m.id === todo.assegnato_a)
              const assigneeColor = assignee ? getMemberColor(assignee.id) : null
              const priorityStyle = TODO_PRIORITIES[todo.priorita]
              const isOverdue = todo.scadenza && new Date(todo.scadenza) < new Date() && !todo.completato

              return (
                <div
                  key={todo.id}
                  className={`p-3 flex items-start gap-3 hover:bg-gray-50 transition-colors ${
                    todo.completato ? 'opacity-60' : ''
                  }`}
                >
                  {/* Checkbox */}
                  <button
                    onClick={() => toggleTodo(todo.id, todo.completato)}
                    className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-all ${
                      todo.completato
                        ? 'bg-green-500 border-green-600 text-white'
                        : 'border-gray-300 hover:border-gray-500'
                    }`}
                  >
                    {todo.completato && '✓'}
                  </button>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p className={`font-medium text-sm ${todo.completato ? 'line-through text-gray-400' : 'text-gray-900'}`}>
                      {todo.testo}
                    </p>
                    
                    <div className="flex flex-wrap items-center gap-2 mt-1.5">
                      {/* Priority badge */}
                      <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border ${priorityStyle.color}`}>
                        {priorityStyle.icon} {todo.priorita}
                      </span>

                      {/* Assignee */}
                      {assignee && (
                        <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold flex items-center gap-1 ${assigneeColor?.light} ${assigneeColor?.text} border ${assigneeColor?.border}`}>
                          <img src={assignee.avatar_url || '/default-avatar.png'} className="w-3 h-3 rounded-full" alt="" />
                          {assignee.nome}
                        </span>
                      )}

                      {/* Due date */}
                      {todo.scadenza && (
                        <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold ${
                          isOverdue 
                            ? 'bg-red-100 text-red-600 border border-red-300' 
                            : 'bg-gray-100 text-gray-500'
                        }`}>
                          📅 {new Date(todo.scadenza).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Delete */}
                  <button
                    onClick={() => deleteTodo(todo.id)}
                    className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    🗑️
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}