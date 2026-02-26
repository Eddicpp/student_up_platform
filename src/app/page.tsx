'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

// Emoji per lo sfondo animato (stesso di login/register)
const EMOJI_LIST = [
  '📚', '🎓', '💡', '🚀', '⭐', '🎯', '💪', '🔥', '✨', '🎨',
  '💻', '📱', '🎮', '🎵', '📷', '🎬', '✏️', '📝', '📊', '🔬',
  '🧪', '🔭', '🌍', '🌟', '💫', '🏆', '🥇', '🎖️', '🤝', '👥',
  '💼', '📈', '🎤', '🎧', '🖥️', '⚡', '🌈', '🎁', '🔑', '💎',
  '🧠', '❤️', '🫶', '👋', '🙌', '👏', '🤩', '😎', '🤓', '💯',
  '📌', '🎪', '🎭', '🎸', '🎹', '🎺', '🥁', '🎻', '🪄', '🔮',
  '🧩', '♟️', '🎲', '🃏', '🀄', '🎴', '🖼️', '🎰', '🚂', '✈️',
  '🚁', '🛸', '🌙', '☀️', '⚽', '🏀', '🎾', '🏐', '🎱', '🏓'
]

interface FloatingEmoji {
  id: number
  emoji: string
  left: number
  top: number
  size: number
  duration: number
  delay: number
}

export default function Home() {
  const [emojis, setEmojis] = useState<FloatingEmoji[]>([])

  useEffect(() => {
    // Genera emoji casuali
    const generated: FloatingEmoji[] = []
    for (let i = 0; i < 80; i++) {
      generated.push({
        id: i,
        emoji: EMOJI_LIST[Math.floor(Math.random() * EMOJI_LIST.length)],
        left: Math.random() * 100,
        top: Math.random() * 100,
        size: Math.random() * 1.5 + 0.8,
        duration: Math.random() * 10 + 15,
        delay: Math.random() * -20
      })
    }
    setEmojis(generated)
  }, [])

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-gradient-to-br from-red-50 via-orange-50 to-yellow-50 p-4 sm:p-6">
      
      {/* Sfondo animato con emoji */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {emojis.map((item) => (
          <div
            key={item.id}
            className="absolute animate-float opacity-40"
            style={{
              left: `${item.left}%`,
              top: `${item.top}%`,
              fontSize: `${item.size}rem`,
              animationDuration: `${item.duration}s`,
              animationDelay: `${item.delay}s`,
            }}
          >
            {item.emoji}
          </div>
        ))}
      </div>

      {/* Pattern di sfondo */}
      <div 
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
        }}
      />

      {/* Contenuto principale */}
      <div className="relative z-10 flex flex-col items-center text-center">
        
        {/* Logo/Titolo con stile cartoon */}
        <div className="mb-6 sm:mb-8">
          <div className="inline-block bg-white px-6 sm:px-10 py-3 sm:py-4 rounded-2xl sm:rounded-3xl border-3 sm:border-4 border-gray-900 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] sm:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] transform -rotate-2 hover:rotate-0 transition-transform duration-300">
            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black text-red-600 italic tracking-tight">
              Student<span className="text-gray-900">UP</span>
            </h1>
          </div>
        </div>

        {/* Sottotitolo */}
        <div className="mb-8 sm:mb-12">
          <p className="text-base sm:text-xl lg:text-2xl font-bold text-gray-700 max-w-md sm:max-w-lg px-4">
            Connetti, collabora e crea progetti con altri studenti universitari 🚀
          </p>
        </div>

        {/* Bottoni CTA */}
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 w-full max-w-xs sm:max-w-none sm:w-auto">
          <Link 
            href="/login" 
            className="group relative bg-red-500 hover:bg-red-600 text-white px-8 sm:px-12 py-3 sm:py-4 rounded-xl sm:rounded-2xl font-black text-base sm:text-lg uppercase tracking-wider border-3 sm:border-4 border-gray-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] sm:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[4px] hover:translate-y-[4px] sm:hover:translate-x-[6px] sm:hover:translate-y-[6px] transition-all duration-150 text-center"
          >
            🔑 Accedi
          </Link>
          <Link 
            href="/register" 
            className="group relative bg-white hover:bg-yellow-100 text-gray-900 px-8 sm:px-12 py-3 sm:py-4 rounded-xl sm:rounded-2xl font-black text-base sm:text-lg uppercase tracking-wider border-3 sm:border-4 border-gray-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] sm:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[4px] hover:translate-y-[4px] sm:hover:translate-x-[6px] sm:hover:translate-y-[6px] transition-all duration-150 text-center"
          >
            ✨ Registrati
          </Link>
        </div>

        {/* Badge/Features */}
        <div className="mt-10 sm:mt-16 flex flex-wrap justify-center gap-2 sm:gap-3 max-w-lg">
          {[
            { emoji: '🎓', text: 'Studenti' },
            { emoji: '🤝', text: 'Team' },
            { emoji: '💡', text: 'Progetti' },
            { emoji: '🚀', text: 'Crescita' },
          ].map((item, i) => (
            <div 
              key={i}
              className="bg-white px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl border-2 border-gray-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] sm:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] text-xs sm:text-sm font-bold text-gray-800"
              style={{ transform: `rotate(${(i % 2 === 0 ? -1 : 1) * (Math.random() * 2 + 1)}deg)` }}
            >
              {item.emoji} {item.text}
            </div>
          ))}
        </div>
      </div>

      {/* Stile per l'animazione float */}
      <style jsx global>{`
        @keyframes float {
          0%, 100% {
            transform: translateY(0px) rotate(0deg);
          }
          25% {
            transform: translateY(-20px) rotate(5deg);
          }
          50% {
            transform: translateY(-10px) rotate(-5deg);
          }
          75% {
            transform: translateY(-25px) rotate(3deg);
          }
        }
        .animate-float {
          animation: float 20s ease-in-out infinite;
        }
      `}</style>
    </main>
  )
}