'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getMemberColor } from '@/lib/member-colors'

interface Note {
  id: string
  titolo: string
  contenuto: string | null
  creato_da: string
  ultimo_modificato_da: string
  created_at: string
  updated_at: string
}

interface TeamMember {
  id: string
  nome: string
  cognome: string
  avatar_url: string | null
}

interface TeamNotesProps {
  bandoId: string
  currentUserId: string
  members: TeamMember[]
}

export default function TeamNotes({ bandoId, currentUserId, members }: TeamNotesProps) {
  const supabase = createClient()
  const [notes, setNotes] = useState<Note[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedNote, setSelectedNote] = useState<Note | null>(null)
  const [editMode, setEditMode] = useState(false)
  const [showCreateForm, setShowCreateForm] = useState(false)

  // Edit state
  const [editTitle, setEditTitle] = useState('')
  const [editContent, setEditContent] = useState('')
  const [saving, setSaving] = useState(false)

  // New note state
  const [newTitle, setNewTitle] = useState('')

  const fetchNotes = useCallback(async () => {
    const { data } = await (supabase as any)
      .from('team_note')
      .select('*')
      .eq('bando_id', bandoId)
      .order('updated_at', { ascending: false })

    if (data) {
      setNotes(data)
      // Auto-select first note if none selected
      if (!selectedNote && data.length > 0) {
        setSelectedNote(data[0])
      }
    }
    setLoading(false)
  }, [bandoId, supabase, selectedNote])

  useEffect(() => {
    fetchNotes()
  }, [fetchNotes])

  const createNote = async () => {
    if (!newTitle.trim()) return

    const { data } = await (supabase as any)
      .from('team_note')
      .insert({
        bando_id: bandoId,
        titolo: newTitle.trim(),
        contenuto: '',
        creato_da: currentUserId,
        ultimo_modificato_da: currentUserId
      })
      .select()
      .single()

    if (data) {
      setNotes(prev => [data, ...prev])
      setSelectedNote(data)
      setNewTitle('')
      setShowCreateForm(false)
      setEditMode(true)
      setEditTitle(data.titolo)
      setEditContent('')
    }
  }

  const selectNote = (note: Note) => {
    setSelectedNote(note)
    setEditTitle(note.titolo)
    setEditContent(note.contenuto || '')
    setEditMode(false)
  }

  const saveNote = async () => {
    if (!selectedNote) return
    setSaving(true)

    await (supabase as any)
      .from('team_note')
      .update({
        titolo: editTitle,
        contenuto: editContent,
        ultimo_modificato_da: currentUserId,
        updated_at: new Date().toISOString()
      })
      .eq('id', selectedNote.id)

    setNotes(prev => prev.map(n => 
      n.id === selectedNote.id 
        ? { ...n, titolo: editTitle, contenuto: editContent, ultimo_modificato_da: currentUserId, updated_at: new Date().toISOString() } 
        : n
    ))
    setSelectedNote(prev => prev ? { ...prev, titolo: editTitle, contenuto: editContent } : null)
    setEditMode(false)
    setSaving(false)
  }

  const deleteNote = async (noteId: string) => {
    if (!window.confirm('Eliminare questa nota?')) return

    await (supabase as any)
      .from('team_note')
      .delete()
      .eq('id', noteId)

    setNotes(prev => prev.filter(n => n.id !== noteId))
    if (selectedNote?.id === noteId) {
      setSelectedNote(notes.length > 1 ? notes.find(n => n.id !== noteId) || null : null)
    }
  }

  const getMemberName = (id: string) => {
    const member = members.find(m => m.id === id)
    return member ? member.nome : 'Sconosciuto'
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('it-IT', { 
      day: 'numeric', 
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const cardStyle = "bg-white rounded-2xl border-2 border-gray-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"

  if (loading) {
    return (
      <div className={cardStyle + " p-6 h-96"}>
        <div className="animate-pulse space-y-3">
          <div className="h-6 bg-gray-200 rounded w-1/3"></div>
          <div className="h-40 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  return (
    <div className={cardStyle + " overflow-hidden h-96 flex"}>
      {/* Sidebar - Notes list */}
      <div className="w-1/3 border-r-2 border-gray-900 flex flex-col">
        {/* Header */}
        <div className="p-3 border-b-2 border-gray-900 bg-gray-50 flex items-center justify-between">
          <h2 className="text-sm font-black text-gray-900 flex items-center gap-1">
            <span>📝</span> Note
          </h2>
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold transition-all ${
              showCreateForm 
                ? 'bg-gray-900 text-white' 
                : 'bg-teal-500 text-white hover:bg-teal-600'
            }`}
          >
            {showCreateForm ? '✕' : '+'}
          </button>
        </div>

        {/* Create form */}
        {showCreateForm && (
          <div className="p-2 bg-teal-50 border-b border-teal-200">
            <input
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Titolo nota..."
              className="w-full px-3 py-2 rounded-lg border-2 border-gray-300 focus:border-gray-900 outline-none text-sm"
              onKeyPress={(e) => e.key === 'Enter' && createNote()}
              autoFocus
            />
            <button
              onClick={createNote}
              disabled={!newTitle.trim()}
              className="w-full mt-2 py-2 bg-gray-900 text-white rounded-lg text-xs font-bold disabled:opacity-50"
            >
              Crea
            </button>
          </div>
        )}

        {/* Notes list */}
        <div className="flex-1 overflow-y-auto">
          {notes.length === 0 ? (
            <div className="p-4 text-center text-gray-500 text-sm">
              <span className="text-2xl block mb-1">📝</span>
              Nessuna nota
            </div>
          ) : (
            notes.map(note => {
              const isSelected = selectedNote?.id === note.id
              const creator = members.find(m => m.id === note.creato_da)
              const creatorColor = creator ? getMemberColor(creator.id) : null

              return (
                <button
                  key={note.id}
                  onClick={() => selectNote(note)}
                  className={`w-full p-3 text-left border-b border-gray-100 transition-all ${
                    isSelected 
                      ? 'bg-gray-900 text-white' 
                      : 'hover:bg-gray-50'
                  }`}
                >
                  <p className={`font-bold text-sm truncate ${isSelected ? 'text-white' : 'text-gray-900'}`}>
                    {note.titolo}
                  </p>
                  <div className={`flex items-center gap-1 mt-1 text-[10px] ${isSelected ? 'text-gray-400' : 'text-gray-500'}`}>
                    <span className={`w-2 h-2 rounded-full ${creatorColor?.bg || 'bg-gray-400'}`}></span>
                    <span>{getMemberName(note.ultimo_modificato_da)}</span>
                    <span>•</span>
                    <span>{formatDate(note.updated_at)}</span>
                  </div>
                </button>
              )
            })
          )}
        </div>
      </div>

      {/* Main - Note content */}
      <div className="flex-1 flex flex-col">
        {selectedNote ? (
          <>
            {/* Note header */}
            <div className="p-3 border-b-2 border-gray-900 bg-gray-50 flex items-center justify-between">
              {editMode ? (
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="flex-1 px-2 py-1 font-bold text-gray-900 bg-white border-2 border-gray-300 rounded-lg focus:border-gray-900 outline-none"
                />
              ) : (
                <h3 className="font-black text-gray-900 truncate flex-1">{selectedNote.titolo}</h3>
              )}

              <div className="flex items-center gap-1 ml-2">
                {editMode ? (
                  <>
                    <button
                      onClick={() => setEditMode(false)}
                      className="px-2 py-1 text-xs text-gray-500 hover:bg-gray-200 rounded-lg"
                    >
                      Annulla
                    </button>
                    <button
                      onClick={saveNote}
                      disabled={saving}
                      className="px-3 py-1 bg-green-500 text-white text-xs font-bold rounded-lg hover:bg-green-600 disabled:opacity-50"
                    >
                      {saving ? '...' : '✓ Salva'}
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => setEditMode(true)}
                      className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg text-xs"
                      title="Modifica"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => deleteNote(selectedNote.id)}
                      className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg text-xs"
                      title="Elimina"
                    >
                      🗑️
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Note content */}
            <div className="flex-1 p-4 overflow-y-auto">
              {editMode ? (
                <textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  placeholder="Scrivi qui..."
                  className="w-full h-full resize-none outline-none text-sm text-gray-700 leading-relaxed"
                  autoFocus
                />
              ) : (
                <div className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                  {selectedNote.contenuto || (
                    <span className="text-gray-400 italic">Nessun contenuto. Clicca ✏️ per modificare.</span>
                  )}
                </div>
              )}
            </div>

            {/* Note footer */}
            <div className="p-2 border-t border-gray-100 bg-gray-50 text-[10px] text-gray-500 flex items-center justify-between">
              <span>Creato da {getMemberName(selectedNote.creato_da)}</span>
              <span>Modificato: {formatDate(selectedNote.updated_at)}</span>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500 text-sm">
            <div className="text-center">
              <span className="text-4xl block mb-2">📝</span>
              <p className="font-bold">Seleziona una nota</p>
              <p className="text-xs">o creane una nuova</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}