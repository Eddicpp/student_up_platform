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
  
  // Stato per la navigazione del calendario
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

  // --- Helpers per il Calendario ---
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startDayOfWeek = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1 // Lunedì come giorno 0
    
    return { daysInMonth, startDayOfWeek }
  }

  const { daysInMonth, startDayOfWeek } = getDaysInMonth(currentMonth)

  const getEventsForDay = (day: number) => {
    const targetDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    
    return events.filter(e => {
      // Trasforma la data dell'evento in oggetto Date locale
      const eventDate = new Date(e.data_inizio);
      return isSameDay(eventDate, targetDate);
    });
  }

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })
  }

  // --- LOGICA FILTRI PER LA SIDEBAR ---
  const todayDate = new Date()
  todayDate.setHours(0, 0, 0, 0)

  const isSameDay = (d1: Date, d2: Date) => {
    return d1.getDate() === d2.getDate() && 
           d1.getMonth() === d2.getMonth() && 
           d1.getFullYear() === d2.getFullYear();
  }

  const isSameMonthAndYear = (d1: Date, d2: Date) => 
    d1.getMonth() === d2.getMonth() && d1.getFullYear() === d2.getFullYear()

  // 1. Eventi di Oggi
  const todayEvents = events.filter(e => isSameDay(new Date(e.data_inizio), todayDate))

  // 2. Eventi del Mese visualizzato (escluso oggi)
  const monthEvents = events.filter(e => {
    const d = new Date(e.data_inizio)
    return isSameMonthAndYear(d, currentMonth) && !isSameDay(d, todayDate)
  })

  // 3. Eventi Rimanenti (nel futuro rispetto al mese visualizzato, escluso oggi)
  const remainingEvents = events.filter(e => {
    const d = new Date(e.data_inizio)
    return d > todayDate && !isSameDay(d, todayDate) && !isSameMonthAndYear(d, currentMonth)
  })

  // Helper per renderizzare i bottoni degli eventi nella lista
  const renderEventItem = (event: TeamEvent, isLast: boolean) => {
    const myRSVP = partecipanti[event.id]?.find(p => p.studente_id === currentUserId)
    const isSelected = selectedEvent?.id === event.id

    return (
      <button
        key={event.id}
        onClick={() => setSelectedEvent(event)}
        className={`w-full p-3 text-left transition-colors ${!isLast ? 'border-b-2 border-gray-900' : ''} ${
          isSelected ? 'bg-orange-100' : 'bg-white hover:bg-gray-50'
        }`}
      >
        <div className="flex items-start gap-2">
          <div 
            className="w-1.5 rounded-full flex-shrink-0 self-stretch min-h-[40px] border border-gray-900"
            style={{ backgroundColor: event.colore }}
          />
          <div className="flex-1 min-w-0">
            <p className="font-black text-xs sm:text-sm text-gray-900 truncate uppercase">{event.titolo}</p>
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mt-0.5">
              {formatDate(event.data_inizio)} • {formatTime(event.data_inizio)}
            </p>
            {myRSVP && (
              <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md mt-1.5 inline-block border-2 border-gray-900 ${
                myRSVP.stato === 'confermato' ? 'bg-green-400 text-gray-900' :
                myRSVP.stato === 'rifiutato' ? 'bg-red-400 text-gray-900' :
                'bg-yellow-300 text-gray-900'
              }`}>
                {myRSVP.stato === 'confermato' ? '✓ Presente' :
                 myRSVP.stato === 'rifiutato' ? '✗ Assente' : '? Forse'}
              </span>
            )}
          </div>
        </div>
      </button>
    )
  }

  const cardStyle = "bg-white rounded-2xl border-[3px] border-gray-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"

  return (
    <div className={cardStyle + " overflow-hidden"}>
      {/* Header */}
      <div className="p-4 border-b-[3px] border-gray-900 bg-gray-50 flex items-center justify-between">
        <h2 className="text-lg font-black text-gray-900 flex items-center gap-2 uppercase tracking-widest">
          <span>📅</span> Calendario
        </h2>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all border-2 border-gray-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] ${
            showCreateForm 
              ? 'bg-red-400 text-gray-900' 
              : 'bg-green-400 text-gray-900'
          }`}
        >
          {showCreateForm ? '✕ Chiudi' : '+ Evento'}
        </button>
      </div>

      {/* Create form */}
      {showCreateForm && (
        <div className="p-5 bg-gray-100 border-b-[3px] border-gray-900">
          <div className="space-y-4 max-w-lg mx-auto">
            <input
              type="text"
              value={newEvent.titolo}
              onChange={(e) => setNewEvent({ ...newEvent, titolo: e.target.value })}
              placeholder="Titolo dell'evento..."
              className="w-full px-4 py-3 rounded-xl border-2 border-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900 font-black text-gray-900 uppercase"
            />

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-700 mb-1.5 block">Data inizio</label>
                <input
                  type="date"
                  value={newEvent.data_inizio}
                  onChange={(e) => setNewEvent({ ...newEvent, data_inizio: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-xl border-2 border-gray-900 font-bold text-gray-900 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-700 mb-1.5 block">Ora</label>
                <input
                  type="time"
                  value={newEvent.ora_inizio}
                  onChange={(e) => setNewEvent({ ...newEvent, ora_inizio: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-xl border-2 border-gray-900 font-bold text-gray-900 focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <input
                type="text"
                value={newEvent.luogo}
                onChange={(e) => setNewEvent({ ...newEvent, luogo: e.target.value })}
                placeholder="📍 Luogo (opzionale)"
                className="px-3 py-2.5 rounded-xl border-2 border-gray-900 font-bold text-gray-900 text-sm focus:outline-none"
              />
              <input
                type="url"
                value={newEvent.link_meeting}
                onChange={(e) => setNewEvent({ ...newEvent, link_meeting: e.target.value })}
                placeholder="🔗 Link (Google Meet, etc)"
                className="px-3 py-2.5 rounded-xl border-2 border-gray-900 font-bold text-gray-900 text-sm focus:outline-none"
              />
            </div>

            {/* Color picker */}
            <div className="flex items-center gap-3 bg-white p-3 rounded-xl border-2 border-gray-900">
              <span className="text-[10px] font-black uppercase tracking-widest text-gray-700">Colore:</span>
              <div className="flex gap-2">
                {EVENT_COLORS.map(color => (
                  <button
                    key={color}
                    onClick={() => setNewEvent({ ...newEvent, colore: color })}
                    className={`w-6 h-6 rounded-full border-[3px] transition-transform ${
                      newEvent.colore === color ? 'border-gray-900 scale-125 shadow-sm' : 'border-transparent'
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>

            <button
              onClick={createEvent}
              disabled={!newEvent.titolo.trim() || !newEvent.data_inizio || !newEvent.ora_inizio}
              className="w-full py-3 bg-gray-900 text-white rounded-xl font-black uppercase tracking-widest disabled:opacity-50 border-[3px] border-gray-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.2)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
            >
              Crea Evento
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-col md:flex-row h-[500px]">
        
        {/* Mini Calendar (SX) */}
        <div className="w-full md:w-1/2 p-4 md:p-6 border-b-[3px] md:border-b-0 md:border-r-[3px] border-gray-900 bg-white">
          {/* Month navigation */}
          <div className="flex items-center justify-between mb-6 bg-gray-100 p-2 rounded-xl border-2 border-gray-900">
            <button
              onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}
              className="w-8 h-8 flex items-center justify-center bg-white border-2 border-gray-900 rounded-lg font-black hover:bg-yellow-300 transition-colors shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
            >
              ←
            </button>
            <span className="font-black text-sm uppercase tracking-widest text-gray-900">
              {currentMonth.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' })}
            </span>
            <button
              onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}
              className="w-8 h-8 flex items-center justify-center bg-white border-2 border-gray-900 rounded-lg font-black hover:bg-yellow-300 transition-colors shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
            >
              →
            </button>
          </div>

          {/* Days header */}
          <div className="grid grid-cols-7 gap-2 mb-2">
            {['L', 'M', 'M', 'G', 'V', 'S', 'D'].map((day, i) => (
              <div key={i} className="text-center text-[10px] font-black uppercase text-gray-500">
                {day}
              </div>
            ))}
          </div>

          {/* Days grid */}
          <div className="grid grid-cols-7 gap-2">
            {/* Empty cells */}
            {Array.from({ length: startDayOfWeek }).map((_, i) => (
              <div key={`empty-${i}`} className="aspect-square"></div>
            ))}
            
            {/* Day cells */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1
              const dayEvents = getEventsForDay(day)
              const isToday = new Date().toDateString() === 
                new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day).toDateString()

              return (
                <button
                  key={day}
                  onClick={() => {
                    if (dayEvents.length > 0) setSelectedEvent(dayEvents[0])
                  }}
                  className={`aspect-square rounded-xl text-xs font-black relative transition-all flex items-center justify-center border-2 border-transparent ${
                    isToday 
                      ? 'bg-gray-900 text-white border-gray-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]' 
                      : dayEvents.length > 0 
                        ? 'bg-blue-100 text-blue-900 border-gray-900 hover:bg-blue-200 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]' 
                        : 'text-gray-600 hover:bg-gray-100 hover:border-gray-300'
                  }`}
                >
                  {day}
                  
                  {/* PALLINI EVENTI */}
                  <div className="absolute bottom-1 flex gap-0.5">
                    {dayEvents.slice(0, 3).map((ev, idx) => (
                      <span 
                        key={idx}
                        className="w-1.5 h-1.5 rounded-full border border-gray-900"
                        style={{ backgroundColor: ev.colore }}
                      />
                    ))}
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* LISTA EVENTI (DX) */}
        <div className="w-full md:w-1/2 flex flex-col bg-gray-50 overflow-hidden">
          <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-6">
            
            {/* 1. OGGI */}
            <div>
              <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2 flex items-center gap-2">
                <span>📌</span> Oggi
              </h3>
              <div className="border-2 border-gray-900 rounded-xl overflow-hidden shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] bg-white">
                {todayEvents.length > 0 ? (
                  todayEvents.map((e, idx) => renderEventItem(e, idx === todayEvents.length - 1))
                ) : (
                  <p className="p-4 text-xs font-bold text-gray-400 text-center uppercase tracking-widest">Nessun evento oggi</p>
                )}
              </div>
            </div>

            {/* 2. QUESTO MESE */}
            <div>
              <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2 flex items-center gap-2">
                <span>📅</span> {currentMonth.toLocaleDateString('it-IT', { month: 'long' })}
              </h3>
              <div className="border-2 border-gray-900 rounded-xl overflow-hidden shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] bg-white">
                {monthEvents.length > 0 ? (
                  monthEvents.map((e, idx) => renderEventItem(e, idx === monthEvents.length - 1))
                ) : (
                  <p className="p-4 text-xs font-bold text-gray-400 text-center uppercase tracking-widest">Libero questo mese</p>
                )}
              </div>
            </div>

            {/* 3. PROSSIMI EVENTI */}
            <div>
              <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2 flex items-center gap-2">
                <span>🚀</span> In futuro
              </h3>
              <div className="border-2 border-gray-900 rounded-xl overflow-hidden shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] bg-white">
                {remainingEvents.length > 0 ? (
                  remainingEvents.map((e, idx) => renderEventItem(e, idx === remainingEvents.length - 1))
                ) : (
                  <p className="p-4 text-xs font-bold text-gray-400 text-center uppercase tracking-widest">Nessun evento futuro</p>
                )}
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* Dettaglio Evento Selezionato (Modale) */}
      {selectedEvent && (
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border-[3px] border-gray-900 rounded-2xl shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            
            <div className="p-5 border-b-[3px] border-gray-900 bg-gray-50 relative">
              <button
                onClick={() => setSelectedEvent(null)}
                className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center bg-white border-2 border-gray-900 rounded-lg font-black text-gray-900 hover:bg-red-400 transition-colors shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px]"
              >
                ✕
              </button>
              
              <div className="pr-10">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-4 h-4 rounded-full border-2 border-gray-900" style={{ backgroundColor: selectedEvent.colore }} />
                  <h3 className="font-black text-xl text-gray-900 uppercase leading-tight">{selectedEvent.titolo}</h3>
                </div>
                <p className="text-xs font-bold text-gray-600 uppercase tracking-widest bg-white border-2 border-gray-900 inline-block px-2 py-1 rounded-lg">
                  {formatDate(selectedEvent.data_inizio)} • {formatTime(selectedEvent.data_inizio)}
                </p>
                
                {selectedEvent.descrizione && (
                  <p className="mt-4 text-sm font-medium text-gray-700 bg-white p-3 rounded-xl border-2 border-gray-200">
                    {selectedEvent.descrizione}
                  </p>
                )}
                
                {selectedEvent.luogo && (
                  <p className="mt-3 text-xs font-bold text-gray-900 flex items-center gap-1">
                    <span>📍</span> {selectedEvent.luogo}
                  </p>
                )}
              </div>
            </div>

            <div className="p-5 bg-white space-y-4">
              {/* Bottoni Azione */}
              <div className="flex flex-wrap gap-2">
                {selectedEvent.link_meeting && (
                  <a
                    href={selectedEvent.link_meeting}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 py-2.5 bg-blue-300 text-gray-900 text-xs font-black uppercase tracking-widest text-center rounded-xl border-2 border-gray-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-blue-400 hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
                  >
                    🔗 Partecipa
                  </a>
                )}
                {selectedEvent.creato_da === currentUserId && (
                  <button
                    onClick={() => deleteEvent(selectedEvent.id)}
                    className="flex-1 py-2.5 bg-red-400 text-gray-900 text-xs font-black uppercase tracking-widest text-center rounded-xl border-2 border-gray-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-red-500 hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
                  >
                    🗑️ Elimina
                  </button>
                )}
              </div>

              {/* RSVP */}
              <div className="pt-4 border-t-2 border-dashed border-gray-200">
                <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-3 text-center">La tua presenza</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => updateRSVP(selectedEvent.id, 'confermato')}
                    className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border-2 border-gray-900 ${
                      partecipanti[selectedEvent.id]?.find(p => p.studente_id === currentUserId)?.stato === 'confermato'
                        ? 'bg-green-400 shadow-none translate-x-[2px] translate-y-[2px]'
                        : 'bg-white hover:bg-green-50 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'
                    }`}
                  >
                    ✅ Sì
                  </button>
                  <button
                    onClick={() => updateRSVP(selectedEvent.id, 'forse')}
                    className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border-2 border-gray-900 ${
                      partecipanti[selectedEvent.id]?.find(p => p.studente_id === currentUserId)?.stato === 'forse'
                        ? 'bg-yellow-300 shadow-none translate-x-[2px] translate-y-[2px]'
                        : 'bg-white hover:bg-yellow-50 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'
                    }`}
                  >
                    🤔 Forse
                  </button>
                  <button
                    onClick={() => updateRSVP(selectedEvent.id, 'rifiutato')}
                    className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border-2 border-gray-900 ${
                      partecipanti[selectedEvent.id]?.find(p => p.studente_id === currentUserId)?.stato === 'rifiutato'
                        ? 'bg-red-400 shadow-none translate-x-[2px] translate-y-[2px]'
                        : 'bg-white hover:bg-red-50 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'
                    }`}
                  >
                    ❌ No
                  </button>
                </div>
              </div>

              {/* Partecipanti Totali */}
              {partecipanti[selectedEvent.id]?.length > 0 && (
                <div className="pt-4 border-t-2 border-dashed border-gray-200">
                  <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">Risposte del Team</p>
                  <div className="flex flex-wrap gap-2">
                    {partecipanti[selectedEvent.id].map(p => {
                      const member = members.find(m => m.id === p.studente_id)
                      if (!member) return null

                      return (
                        <div
                          key={p.studente_id}
                          className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 border-2 border-gray-900 ${
                            p.stato === 'confermato' ? 'bg-green-100' :
                            p.stato === 'rifiutato' ? 'bg-red-100' :
                            'bg-yellow-100'
                          }`}
                        >
                          <img 
                            src={member.avatar_url || '/default-avatar.png'} 
                            className="w-4 h-4 rounded-full border border-gray-900 object-cover bg-white"
                            alt=""
                          />
                          {member.nome}
                          <span className="opacity-50">
                            {p.stato === 'confermato' ? '✅' : p.stato === 'rifiutato' ? '❌' : '🤔'}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>
      )}
    </div>
  )
}