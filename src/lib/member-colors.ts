// Palette di colori per i membri del team
export const MEMBER_COLORS = [
  { 
    name: 'rose',
    bg: 'bg-rose-500', 
    bgHex: '#f43f5e',
    border: 'border-rose-600', 
    light: 'bg-rose-100', 
    lightHex: '#ffe4e6',
    text: 'text-rose-700',
    ring: 'ring-rose-500'
  },
  { 
    name: 'blue',
    bg: 'bg-blue-500', 
    bgHex: '#3b82f6',
    border: 'border-blue-600', 
    light: 'bg-blue-100', 
    lightHex: '#dbeafe',
    text: 'text-blue-700',
    ring: 'ring-blue-500'
  },
  { 
    name: 'emerald',
    bg: 'bg-emerald-500', 
    bgHex: '#10b981',
    border: 'border-emerald-600', 
    light: 'bg-emerald-100', 
    lightHex: '#d1fae5',
    text: 'text-emerald-700',
    ring: 'ring-emerald-500'
  },
  { 
    name: 'violet',
    bg: 'bg-violet-500', 
    bgHex: '#8b5cf6',
    border: 'border-violet-600', 
    light: 'bg-violet-100', 
    lightHex: '#ede9fe',
    text: 'text-violet-700',
    ring: 'ring-violet-500'
  },
  { 
    name: 'amber',
    bg: 'bg-amber-500', 
    bgHex: '#f59e0b',
    border: 'border-amber-600', 
    light: 'bg-amber-100', 
    lightHex: '#fef3c7',
    text: 'text-amber-700',
    ring: 'ring-amber-500'
  },
  { 
    name: 'cyan',
    bg: 'bg-cyan-500', 
    bgHex: '#06b6d4',
    border: 'border-cyan-600', 
    light: 'bg-cyan-100', 
    lightHex: '#cffafe',
    text: 'text-cyan-700',
    ring: 'ring-cyan-500'
  },
  { 
    name: 'pink',
    bg: 'bg-pink-500', 
    bgHex: '#ec4899',
    border: 'border-pink-600', 
    light: 'bg-pink-100', 
    lightHex: '#fce7f3',
    text: 'text-pink-700',
    ring: 'ring-pink-500'
  },
  { 
    name: 'indigo',
    bg: 'bg-indigo-500', 
    bgHex: '#6366f1',
    border: 'border-indigo-600', 
    light: 'bg-indigo-100', 
    lightHex: '#e0e7ff',
    text: 'text-indigo-700',
    ring: 'ring-indigo-500'
  },
  { 
    name: 'teal',
    bg: 'bg-teal-500', 
    bgHex: '#14b8a6',
    border: 'border-teal-600', 
    light: 'bg-teal-100', 
    lightHex: '#ccfbf1',
    text: 'text-teal-700',
    ring: 'ring-teal-500'
  },
  { 
    name: 'orange',
    bg: 'bg-orange-500', 
    bgHex: '#f97316',
    border: 'border-orange-600', 
    light: 'bg-orange-100', 
    lightHex: '#ffedd5',
    text: 'text-orange-700',
    ring: 'ring-orange-500'
  },
]

// Funzione per ottenere colore consistente basato sull'ID
export const getMemberColor = (memberId: string) => {
  let hash = 0
  for (let i = 0; i < memberId.length; i++) {
    hash = memberId.charCodeAt(i) + ((hash << 5) - hash)
  }
  return MEMBER_COLORS[Math.abs(hash) % MEMBER_COLORS.length]
}

// Emoji per reazioni
export const REACTION_EMOJIS = ['👍', '❤️', '😂', '🎉', '🔥', '👀', '🚀', '💯']

// Badge types e icone
export const BADGE_TYPES = {
  first_message: { icon: '💬', label: 'Primo Messaggio', description: 'Hai inviato il tuo primo messaggio!' },
  messages_10: { icon: '📝', label: 'Chiacchierone', description: '10 messaggi inviati' },
  messages_50: { icon: '🗣️', label: 'Comunicatore', description: '50 messaggi inviati' },
  messages_100: { icon: '📢', label: 'Influencer', description: '100 messaggi inviati' },
  streak_3: { icon: '🔥', label: 'On Fire', description: '3 giorni consecutivi di attività' },
  streak_7: { icon: '⚡', label: 'Settimana Perfetta', description: '7 giorni consecutivi' },
  streak_30: { icon: '🏆', label: 'Leggenda', description: '30 giorni consecutivi' },
  early_bird: { icon: '🐦', label: 'Early Bird', description: 'Messaggio prima delle 7:00' },
  night_owl: { icon: '🦉', label: 'Nottambulo', description: 'Messaggio dopo mezzanotte' },
  helper: { icon: '🤝', label: 'Helper', description: 'Hai completato 10 task' },
  poll_creator: { icon: '📊', label: 'Democratico', description: 'Hai creato un sondaggio' },
  reactor: { icon: '😍', label: 'Reactor', description: '50 reazioni date' },
  popular: { icon: '⭐', label: 'Popolare', description: '50 reazioni ricevute' },
}

// Priorità todo
export const TODO_PRIORITIES = {
  bassa: { color: 'bg-gray-100 text-gray-600 border-gray-300', icon: '⬇️' },
  normale: { color: 'bg-blue-100 text-blue-600 border-blue-300', icon: '➡️' },
  alta: { color: 'bg-orange-100 text-orange-600 border-orange-300', icon: '⬆️' },
  urgente: { color: 'bg-red-100 text-red-600 border-red-300', icon: '🔴' },
}

// Colori eventi calendario
export const EVENT_COLORS = [
  '#3B82F6', // blue
  '#10B981', // emerald
  '#F59E0B', // amber
  '#EF4444', // red
  '#8B5CF6', // violet
  '#EC4899', // pink
  '#06B6D4', // cyan
  '#F97316', // orange
]