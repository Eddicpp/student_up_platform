'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getMemberColor, EVENT_COLORS } from '@/lib/member-colors'

interface TeamEvent {
  id: string
  titolo: string
  descrizione: string | null
  data_inizio: string
  data_fine: string | null
  luogo: string | null
  link_meeting: string | null
  creato_da: string
  colore: string
  created_at: string
}

interface EventPartecipante {
  evento_id: string
  studente_id: string
  stato: 'pending' | 'confermato' | 'rifiutato' | 'forse'
}

interface TeamMember {
  id: string
  nome: string
  cognome: string
  avatar_url: string | null
}

interface TeamCalendarProps {
  bandoId: string
  currentUserId: string
  members: TeamMember[]
}

export default function TeamCalendar({ bandoId, currentUserId, members }: TeamCalendarProps) {
  const supabase = createClient()
  const [events, setEvents] = useState<TeamEvent[]>([])
  const [partecipanti, setPartecipanti] = useState<Record<string, EventPartecipante[]>>({})
  const [loading, setLoading] = useState(true)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState<TeamEvent | null>(null)
  const [currentMonth, setCurrentMonth] = useState(new Date())

  // Create form state
  const [newEvent, setNewEvent] = useState({
    titolo: '',
    descrizione: '',
    data_inizio: '',
    ora_inizio: '',
    data_fine: '',
    ora_fine: '',
    luogo: '',
    link_meeting: '',
    colore: EVENT_COLORS[0]
  })

  const fetchEvents = useCallback(async () => {
    const { data: eventsData } = await (supabase as any)
      .from('team_evento')
      .select('*')
      .eq('bando_id', bandoId)
      .order('data_inizio', { ascending: true })

    if (eventsData) {
      setEvents(eventsData)

      // Fetch partecipanti
      const partMap: Record<string, EventPartecipante[]> = {}
      for (const event of eventsData) {
        const { data: partData } = await (supabase as any)
          .from('team_evento_partecipante')
          .select('evento_id, studente_id, stato')
          .eq('evento_id', event.id)

        partMap[event.id] = partData || []
      }
      setPartecipanti(partMap)
    }
    setLoading(false)
  }, [bandoId, supabase])

  useEffect(() => {
    fetchEvents()
  }, [fetchEvents])

  const createEvent = async () => {
    if (!newEvent.titolo.trim() || !newEvent.data_inizio || !newEvent.ora_inizio) return

    const dataInizio = `${newEvent.data_inizio}T${newEvent.ora_inizio}:00`
    const dataFine = newEvent.data_fine && newEvent.ora_fine 
      ? `${newEvent.data_fine}T${newEvent.ora_fine}:00`
      : null

    await (supabase as any)
      .from('team_evento')
      .insert({
        bando_id: bandoId,
        titolo: newEvent.titolo.trim(),
        descrizione: newEvent.descrizione || null,
        data_inizio: dataInizio,
        data_fine: dataFine,
        luogo: newEvent.luogo || null,
        link_meeting: newEvent.link_meeting || null,
        creato_da: currentUserId,
        colore: newEvent.colore
      })

    setNewEvent({
      titolo: '', descrizione: '', data_inizio: '', ora_inizio: '',
      data_fine: '', ora_fine: '', luogo: '', link_meeting: '', colore: EVENT_COLORS[0]
    })
    setShowCreateForm(false)
    fetchEvents()
  }

  const updateRSVP = async (eventId: string, stato: 'confermato' | 'rifiutato' | 'forse') => {
    await (supabase as any)
      .from('team_evento_partecipante')
      .upsert({
        evento_id: eventId,
        studente_id: currentUserId,
        stato
      }, { onConflict: 'evento_id,studente_id' })

    fetchEvents()
  }

  const deleteEvent = async (eventId: string) => {
    if (!window.confirm('Eliminare questo evento?')) return

    await (supabase as any)
      .from('team_evento')
      .delete()
      .eq('id', eventId)

    setSelectedEvent(null)
    fetchEvents()
  }

  // Calendar helpers
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startDayOfWeek = firstDay.getDay()
    
    return { daysInMonth, startDayOfWeek }
  }

  const { daysInMonth, startDayOfWeek } = getDaysInMonth(currentMonth)

  const getEventsForDay = (day: number) => {
    const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day)
    const dateStr = date.toISOString().split('T')[0]
    
    return events.filter(e => {
      const eventDate = e.data_inizio.split('T')[0]
      return eventDate === dateStr
    })
  }

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })
  }

  // Upcoming events
  const upcomingEvents = events
    .filter(e => new Date(e.data_inizio) >= new Date())
    .slice(0, 5)

  const cardStyle = "bg-white rounded-2xl border-2 border-gray-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"

  return (
    <div className={cardStyle + " overflow-hidden"}>
      {/* Header */}
      <div className="p-4 border-b-2 border-gray-900 bg-gray-50 flex items-center justify-between">
        <h2 className="text-lg font-black text-gray-900 flex items-center gap-2">
          <span>📅</span> Calendario
        </h2>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border-2 ${
            showCreateForm 
              ? 'bg-gray-900 text-white border-gray-700' 
              : 'bg-orange-500 text-white border-orange-600 hover:bg-orange-600'
          }`}
        >
          {showCreateForm ? '✕ Chiudi' : '+ Evento'}
        </button>
      </div>

      {/* Create form */}
      {showCreateForm && (
        <div className="p-4 bg-orange-50 border-b-2 border-orange-300">
          <div className="space-y-3">
            <input
              type="text"
              value={newEvent.titolo}
              onChange={(e) => setNewEvent({ ...newEvent, titolo: e.target.value })}
              placeholder="Titolo evento"
              className="w-full px-4 py-3 rounded-xl border-2 border-gray-300 focus:border-gray-900 outline-none font-medium"
            />

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-bold text-gray-500 mb-1 block">Data inizio</label>
                <input
                  type="date"
                  value={newEvent.data_inizio}
                  onChange={(e) => setNewEvent({ ...newEvent, data_inizio: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border-2 border-gray-300 text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 mb-1 block">Ora</label>
                <input
                  type="time"
                  value={newEvent.ora_inizio}
                  onChange={(e) => setNewEvent({ ...newEvent, ora_inizio: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border-2 border-gray-300 text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                value={newEvent.luogo}
                onChange={(e) => setNewEvent({ ...newEvent, luogo: e.target.value })}
                placeholder="📍 Luogo (opzionale)"
                className="px-3 py-2 rounded-xl border-2 border-gray-300 text-sm"
              />
              <input
                type="url"
                value={newEvent.link_meeting}
                onChange={(e) => setNewEvent({ ...newEvent, link_meeting: e.target.value })}
                placeholder="🔗 Link meeting"
                className="px-3 py-2 rounded-xl border-2 border-gray-300 text-sm"
              />
            </div>

            {/* Color picker */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-gray-500">Colore:</span>
              {EVENT_COLORS.map(color => (
                <button
                  key={color}
                  onClick={() => setNewEvent({ ...newEvent, colore: color })}
                  className={`w-6 h-6 rounded-full border-2 transition-transform ${
                    newEvent.colore === color ? 'border-gray-900 scale-125' : 'border-transparent'
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>

            <button
              onClick={createEvent}
              disabled={!newEvent.titolo.trim() || !newEvent.data_inizio || !newEvent.ora_inizio}
              className="w-full py-3 bg-gray-900 text-white rounded-xl font-bold disabled:opacity-50 border-2 border-gray-700"
            >
              Crea Evento
            </button>
          </div>
        </div>
      )}

      <div className="flex">
        {/* Mini Calendar */}
        <div className="w-1/2 p-3 border-r border-gray-200">
          {/* Month navigation */}
          <div className="flex items-center justify-between mb-3">
            <button
              onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}
              className="p-1 hover:bg-gray-100 rounded-lg font-bold"
            >
              ←
            </button>
            <span className="font-bold text-sm text-gray-900 capitalize">
              {currentMonth.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' })}
            </span>
            <button
              onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}
              className="p-1 hover:bg-gray-100 rounded-lg font-bold"
            >
              →
            </button>
          </div>

          {/* Days header */}
          <div className="grid grid-cols-7 gap-1 mb-1">
            {['D', 'L', 'M', 'M', 'G', 'V', 'S'].map((day, i) => (
              <div key={i} className="text-center text-[10px] font-bold text-gray-400">
                {day}
              </div>
            ))}
          </div>

          {/* Days grid */}
          <div className="grid grid-cols-7 gap-1">
            {/* Empty cells for start offset */}
            {Array.from({ length: startDayOfWeek }).map((_, i) => (
              <div key={`empty-${i}`} className="h-7"></div>
            ))}
            
            {/* Day cells */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i //+ 1
              const dayEvents = getEventsForDay(day)
              const isToday = new Date().toDateString() === 
                new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day).toDateString()

              return (
                <button
                  key={day}
                  onClick={() => {
                    if (dayEvents.length > 0) setSelectedEvent(dayEvents[0])
                  }}
                  className={`h-7 rounded-lg text-xs font-medium relative transition-all ${
                    isToday 
                      ? 'bg-gray-900 text-white' 
                      : dayEvents.length > 0 
                        ? 'bg-orange-100 text-orange-700 hover:bg-orange-200' 
                        : 'hover:bg-gray-100'
                  }`}
                >
                  {day}
                  
                  {/* PALLINO EVENTI */}
                  {dayEvents.length === 1 && (
                    <span 
                      className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full"
                      style={{ backgroundColor: dayEvents[0].colore }}
                    />
                  )}
                  {dayEvents.length > 1 && (
                    <span 
                      className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-transparent"
                      style={{ border: `2px solid ${dayEvents[0].colore}` }}
                    />
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* Upcoming events */}
        <div className="w-1/2 flex flex-col">
          <div className="p-2 border-b border-gray-100 bg-gray-50">
            <span className="text-xs font-bold text-gray-500">Prossimi eventi</span>
          </div>
          
          <div className="flex-1 overflow-y-auto max-h-60">
            {upcomingEvents.length === 0 ? (
              <div className="p-4 text-center text-gray-500 text-sm">
                <span className="text-2xl block mb-1">📅</span>
                Nessun evento
              </div>
            ) : (
              upcomingEvents.map(event => {
                const myRSVP = partecipanti[event.id]?.find(p => p.studente_id === currentUserId)

                return (
                  <button
                    key={event.id}
                    onClick={() => setSelectedEvent(event)}
                    className={`w-full p-3 text-left border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                      selectedEvent?.id === event.id ? 'bg-orange-50' : ''
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <div 
                        className="w-1 rounded-full flex-shrink-0 self-stretch min-h-[40px]"
                        style={{ backgroundColor: event.colore }}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm text-gray-900 truncate">{event.titolo}</p>
                        <p className="text-[10px] text-gray-500">
                          {formatDate(event.data_inizio)} • {formatTime(event.data_inizio)}
                        </p>
                        {myRSVP && (
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded mt-1 inline-block ${
                            myRSVP.stato === 'confermato' ? 'bg-green-100 text-green-600' :
                            myRSVP.stato === 'rifiutato' ? 'bg-red-100 text-red-600' :
                            'bg-amber-100 text-amber-600'
                          }`}>
                            {myRSVP.stato === 'confermato' ? '✓ Confermato' :
                             myRSVP.stato === 'rifiutato' ? '✗ Rifiutato' : '? Forse'}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                )
              })
            )}
          </div>
        </div>
      </div>

      {/* Selected event detail */}
      {selectedEvent && (
        <div className="p-4 border-t-2 border-gray-900 bg-gray-50">
          <div className="flex items-start justify-between mb-3">
            <div>
              <div className="flex items-center gap-2">
                <div 
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: selectedEvent.colore }}
                />
                <h3 className="font-black text-gray-900">{selectedEvent.titolo}</h3>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {formatDate(selectedEvent.data_inizio)} • {formatTime(selectedEvent.data_inizio)}
              </p>
              {selectedEvent.luogo && (
                <p className="text-xs text-gray-500">📍 {selectedEvent.luogo}</p>
              )}
            </div>

            <div className="flex items-center gap-1">
              {selectedEvent.link_meeting && (
                <a
                  href={selectedEvent.link_meeting}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 bg-blue-500 text-white text-xs font-bold rounded-lg hover:bg-blue-600"
                >
                  🔗 Join
                </a>
              )}
              {selectedEvent.creato_da === currentUserId && (
                <button
                  onClick={() => deleteEvent(selectedEvent.id)}
                  className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg"
                >
                  🗑️
                </button>
              )}
              <button
                onClick={() => setSelectedEvent(null)}
                className="p-1.5 text-gray-400 hover:bg-gray-200 rounded-lg"
              >
                ✕
              </button>
            </div>
          </div>

          {/* RSVP buttons */}
          <div className="flex gap-2">
            <button
              onClick={() => updateRSVP(selectedEvent.id, 'confermato')}
              className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all border-2 ${
                partecipanti[selectedEvent.id]?.find(p => p.studente_id === currentUserId)?.stato === 'confermato'
                  ? 'bg-green-500 text-white border-green-600'
                  : 'bg-green-50 text-green-700 border-green-300 hover:bg-green-100'
              }`}
            >
              ✓ Partecipo
            </button>
            <button
              onClick={() => updateRSVP(selectedEvent.id, 'forse')}
              className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all border-2 ${
                partecipanti[selectedEvent.id]?.find(p => p.studente_id === currentUserId)?.stato === 'forse'
                  ? 'bg-amber-500 text-white border-amber-600'
                  : 'bg-amber-50 text-amber-700 border-amber-300 hover:bg-amber-100'
              }`}
            >
              ? Forse
            </button>
            <button
              onClick={() => updateRSVP(selectedEvent.id, 'rifiutato')}
              className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all border-2 ${
                partecipanti[selectedEvent.id]?.find(p => p.studente_id === currentUserId)?.stato === 'rifiutato'
                  ? 'bg-red-500 text-white border-red-600'
                  : 'bg-red-50 text-red-700 border-red-300 hover:bg-red-100'
              }`}
            >
              ✗ No
            </button>
          </div>

          {/* Partecipanti */}
          {partecipanti[selectedEvent.id]?.length > 0 && (
            <div className="mt-3 pt-3 border-t border-gray-200">
              <p className="text-[10px] font-bold text-gray-400 mb-2">RISPOSTE</p>
              <div className="flex flex-wrap gap-1">
                {partecipanti[selectedEvent.id].map(p => {
                  const member = members.find(m => m.id === p.studente_id)
                  if (!member) return null
                  const color = getMemberColor(member.id)

                  return (
                    <span
                      key={p.studente_id}
                      className={`px-2 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 ${
                        p.stato === 'confermato' ? 'bg-green-100 text-green-700' :
                        p.stato === 'rifiutato' ? 'bg-red-100 text-red-700' :
                        'bg-amber-100 text-amber-700'
                      }`}
                    >
                      <img 
                        src={member.avatar_url || '/default-avatar.png'} 
                        className={`w-4 h-4 rounded-full border ${color.border}`}
                        alt=""
                      />
                      {member.nome}
                      {p.stato === 'confermato' ? ' ✓' : p.stato === 'rifiutato' ? ' ✗' : ' ?'}
                    </span>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}