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

// Colori pastello in stile "Post-it"
const NOTE_COLORS = [
  'bg-yellow-200',
  'bg-green-200',
  'bg-blue-200',
  'bg-pink-200',
  'bg-purple-200',
  'bg-orange-200',
  'bg-teal-200'
]

// Funzione per assegnare un colore fisso in base all'ID della nota
const getNoteColor = (id: string) => {
  let hash = 0
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash)
  }
  return NOTE_COLORS[Math.abs(hash) % NOTE_COLORS.length]
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

  const cardStyle = "bg-white rounded-2xl border-[3px] border-gray-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"

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

  // Colore di sfondo della nota attualmente selezionata
  const currentBgColor = selectedNote ? getNoteColor(selectedNote.id) : 'bg-gray-50'

  return (
    <div className={cardStyle + " overflow-hidden h-96 flex relative"}>
      {/* Sidebar - Notes list */}
      <div className="w-1/3 border-r-[3px] border-gray-900 flex flex-col bg-white z-10">
        {/* Header */}
        <div className="p-3 border-b-[3px] border-gray-900 bg-gray-100 flex items-center justify-between">
          <h2 className="text-sm font-black text-gray-900 flex items-center gap-1 uppercase tracking-widest">
            <span>📝</span> Note
          </h2>
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className={`w-7 h-7 rounded-xl flex items-center justify-center text-sm font-black transition-all border-2 border-gray-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] ${
              showCreateForm 
                ? 'bg-red-400 text-gray-900' 
                : 'bg-yellow-300 text-gray-900'
            }`}
          >
            {showCreateForm ? '✕' : '+'}
          </button>
        </div>

        {/* Create form */}
        {showCreateForm && (
          <div className="p-3 bg-gray-50 border-b-[3px] border-gray-900">
            <input
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Titolo nota..."
              className="w-full px-3 py-2 rounded-xl border-2 border-gray-900 focus:border-gray-900 outline-none text-sm font-bold text-gray-900 bg-white"
              onKeyPress={(e) => e.key === 'Enter' && createNote()}
              autoFocus
            />
            <button
              onClick={createNote}
              disabled={!newTitle.trim()}
              className="w-full mt-2 py-2 bg-green-400 text-gray-900 border-2 border-gray-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] rounded-xl text-xs font-black uppercase tracking-widest hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all disabled:opacity-50 disabled:pointer-events-none"
            >
              Crea
            </button>
          </div>
        )}

        {/* Notes list */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {notes.length === 0 ? (
            <div className="p-4 text-center text-gray-500 text-sm mt-4">
              <span className="text-3xl block mb-2 opacity-50">📭</span>
              <p className="font-bold uppercase tracking-widest text-[10px]">Nessuna nota</p>
            </div>
          ) : (
            notes.map(note => {
              const isSelected = selectedNote?.id === note.id
              const creator = members.find(m => m.id === note.creato_da)
              const creatorColor = creator ? getMemberColor(creator.id) : null
              const noteColor = getNoteColor(note.id)

              return (
                <button
                  key={note.id}
                  onClick={() => selectNote(note)}
                  className={`w-full p-4 text-left border-b-[3px] border-gray-900 transition-all ${noteColor} ${
                    isSelected 
                      ? 'shadow-[inset_6px_0px_0px_0px_rgba(0,0,0,1)] brightness-95' 
                      : 'hover:brightness-90 opacity-90 hover:opacity-100'
                  }`}
                >
                  <p className="font-black text-sm truncate text-gray-900">
                    {note.titolo}
                  </p>
                  <div className="flex items-center gap-1.5 mt-1.5 text-[9px] font-bold text-gray-700 uppercase tracking-wider">
                    <span className={`w-2 h-2 rounded-full border border-gray-900 ${creatorColor?.bg || 'bg-gray-400'}`}></span>
                    <span className="truncate">{getMemberName(note.ultimo_modificato_da)}</span>
                    <span className="opacity-50">•</span>
                    <span>{formatDate(note.updated_at)}</span>
                  </div>
                </button>
              )
            })
          )}
        </div>
      </div>

      {/* Main - Note content */}
      <div className={`flex-1 flex flex-col transition-colors duration-300 ${currentBgColor}`}>
        {selectedNote ? (
          <>
            {/* Note header */}
            <div className="p-4 border-b-[3px] border-gray-900 bg-white/40 flex items-center justify-between">
              {editMode ? (
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="flex-1 px-3 py-1.5 font-black text-lg text-gray-900 bg-white border-2 border-gray-900 rounded-xl focus:outline-none shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                />
              ) : (
                <h3 className="font-black text-xl text-gray-900 truncate flex-1 leading-none">{selectedNote.titolo}</h3>
              )}

              <div className="flex items-center gap-2 ml-4">
                {editMode ? (
                  <>
                    <button
                      onClick={() => setEditMode(false)}
                      className="px-3 py-2 text-xs font-black uppercase tracking-widest text-gray-900 bg-white border-2 border-gray-900 rounded-xl hover:bg-gray-100 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
                    >
                      Annulla
                    </button>
                    <button
                      onClick={saveNote}
                      disabled={saving}
                      className="px-4 py-2 bg-green-400 text-gray-900 border-2 border-gray-900 text-xs font-black uppercase tracking-widest rounded-xl hover:bg-green-500 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all disabled:opacity-50"
                    >
                      {saving ? '...' : 'Salva'}
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => setEditMode(true)}
                      className="w-8 h-8 flex items-center justify-center bg-white border-2 border-gray-900 rounded-xl hover:bg-blue-100 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
                      title="Modifica"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => deleteNote(selectedNote.id)}
                      className="w-8 h-8 flex items-center justify-center bg-white border-2 border-gray-900 rounded-xl hover:bg-red-100 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
                      title="Elimina"
                    >
                      🗑️
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Note content */}
            <div className="flex-1 p-5 overflow-y-auto custom-scrollbar relative">
              {editMode ? (
                <textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  placeholder="Scrivi le tue note qui..."
                  className="w-full h-full resize-none outline-none text-base text-gray-900 font-bold bg-white/40 p-4 rounded-2xl border-2 border-gray-900 shadow-[inset_2px_2px_0px_0px_rgba(0,0,0,0.1)] leading-relaxed placeholder-gray-500"
                  autoFocus
                />
              ) : (
                <div className="text-base text-gray-900 font-bold whitespace-pre-wrap leading-relaxed">
                  {selectedNote.contenuto || (
                    <span className="text-gray-500 opacity-70 italic font-medium">Nessun contenuto. Clicca ✏️ per modificare.</span>
                  )}
                </div>
              )}
            </div>

            {/* Note footer */}
            <div className="p-3 border-t-[3px] border-gray-900 bg-white/40 text-[10px] font-black uppercase tracking-widest text-gray-700 flex items-center justify-between">
              <span>✍️ Creato da: {getMemberName(selectedNote.creato_da)}</span>
              <span>🕒 Modificato: {formatDate(selectedNote.updated_at)}</span>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500 text-sm">
            <div className="text-center">
              <span className="text-6xl block mb-4 opacity-50">📌</span>
              <p className="font-black uppercase text-gray-400 tracking-widest text-lg">Seleziona una nota</p>
              <p className="text-xs font-bold text-gray-400 mt-2">oppure creane una nuova dal menu laterale</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}