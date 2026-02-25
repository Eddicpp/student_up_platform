'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/app/context/UserContext'
import Link from 'next/link'

interface Contact {
  id: string
  nome: string
  cognome: string
  avatar_url: string | null
  non_letti: number
}

// ✅ Aggiunte le props per il controllo dall'esterno
interface ChatWidgetProps {
  isOpen: boolean
  onToggle: (isOpen: boolean) => void
}

export default function ChatWidget({ isOpen, onToggle }: ChatWidgetProps) {
  const { user } = useUser()
  const supabase = createClient()
  
  const [contacts, setContacts] = useState<Contact[]>([])
  const [totalUnread, setTotalUnread] = useState(0)

  // Chiudi chat cliccando fuori (se non sei nella pagina messaggi)
  const widgetRef = useRef<HTMLDivElement>(null)
  
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (widgetRef.current && !widgetRef.current.contains(event.target as Node)) {
        onToggle(false)
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen, onToggle])

  useEffect(() => {
    if (!user) return

    const fetchChats = async () => {
      // 1. Prendi tutti i messaggi dove sono destinatario e non letti
      const { data: unreadMsgs } = await (supabase as any)
        .from('messaggio_privato')
        .select('mittente_id')
        .eq('destinatario_id', user.id)
        .eq('letto', false)

      if (unreadMsgs) {
        setTotalUnread(unreadMsgs.length)
        
        // Conta i non letti per ogni mittente
        const counts: Record<string, number> = {}
        unreadMsgs.forEach((msg: any) => {
          counts[msg.mittente_id] = (counts[msg.mittente_id] || 0) + 1
        })

        if (Object.keys(counts).length > 0) {
          // Recupera i dati di questi utenti
          const { data: usersData } = await supabase
            .from('studente')
            .select('id, nome, cognome, avatar_url')
            .in('id', Object.keys(counts))

          if (usersData) {
            setContacts(usersData.map(u => ({
              ...u,
              non_letti: counts[u.id]
            })))
          }
        } else {
          setContacts([])
        }
      }
    }

    fetchChats()

    // Realtime per aggiornare il pallino in diretta
    const channel = supabase
      .channel('widget-messages')
      .on('postgres_changes' as any, {
        event: 'INSERT',
        schema: 'public',
        table: 'messaggio_privato',
        filter: `destinatario_id=eq.${user.id}`
      }, () => {
        fetchChats()
      })
      .on('postgres_changes' as any, {
        event: 'UPDATE',
        schema: 'public',
        table: 'messaggio_privato',
        filter: `destinatario_id=eq.${user.id}`
      }, () => {
        fetchChats()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user, supabase])

  if (!user) return null

  // Se l'utente clicca un contatto, lo chiudiamo perché la navigazione aprirà la pagina intera
  const handleContactClick = () => {
    onToggle(false)
  }

  return (
    <div ref={widgetRef} className="fixed bottom-6 right-6 z-50">
      
      {/* Tasto Fluttuante */}
      <button
        onClick={() => onToggle(!isOpen)}
        className="w-16 h-16 bg-blue-600 hover:bg-blue-700 text-white rounded-full border-4 border-gray-900 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[6px] hover:translate-y-[6px] transition-all flex items-center justify-center relative"
      >
        <span className="text-3xl">{isOpen ? '✕' : '💬'}</span>
        {totalUnread > 0 && !isOpen && (
          <span className="absolute -top-2 -right-2 w-7 h-7 bg-red-600 border-2 border-gray-900 rounded-full flex items-center justify-center text-xs font-black animate-bounce">
            {totalUnread > 9 ? '9+' : totalUnread}
          </span>
        )}
      </button>

      {/* Finestra Popup */}
      {isOpen && (
        <div className="absolute bottom-20 right-0 w-80 bg-white rounded-3xl border-4 border-gray-900 shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] overflow-hidden animate-in slide-in-from-bottom-4 duration-200 flex flex-col">
          <div className="bg-gray-900 p-4 flex items-center justify-between">
            <h3 className="text-white font-black uppercase tracking-widest flex items-center gap-2">
              <span className="text-xl">💬</span> Chat
            </h3>
            <Link 
              href="/dashboard/messages" 
              onClick={handleContactClick}
              className="text-xs bg-white text-gray-900 px-3 py-1.5 rounded-lg font-black hover:bg-gray-200 transition-colors"
            >
              Apri a tutto schermo ↗
            </Link>
          </div>
          
          <div className="p-4 max-h-80 overflow-y-auto bg-gray-50">
            {contacts.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-3xl mb-2">📭</p>
                <p className="text-gray-900 font-black">Nessun nuovo messaggio</p>
                <p className="text-xs text-gray-500 font-bold mt-1">
                  Vai alla pagina messaggi per scriverne uno!
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-xs font-black text-gray-500 uppercase tracking-widest mb-2">Nuovi Messaggi</p>
                {contacts.map(c => (
                  <Link
                    key={c.id}
                    href={`/dashboard/messages?userId=${c.id}`}
                    onClick={handleContactClick}
                    className="flex items-center gap-3 p-3 bg-white rounded-xl border-2 border-gray-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all"
                  >
                    <img src={c.avatar_url || '/default-avatar.png'} className="w-10 h-10 rounded-xl object-cover border-2 border-gray-900" alt="" />
                    <div className="flex-1 min-w-0">
                      <p className="font-black text-sm text-gray-900 truncate">{c.nome} {c.cognome}</p>
                    </div>
                    <span className="bg-red-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black border-2 border-gray-900">
                      {c.non_letti}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}