'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function CreditsPage() {
  const router = useRouter()

  return (
    <main className="relative min-h-screen bg-amber-400 flex items-center justify-center p-6 overflow-hidden">
      
      {/* SFONDO DECORATIVO - Icone fluttuanti */}
      <div className="absolute inset-0 pointer-events-none opacity-20 select-none">
        <div className="absolute top-10 left-10 text-6xl animate-bounce">🏆</div>
        <div className="absolute top-1/4 right-20 text-6xl animate-pulse">✨</div>
        <div className="absolute bottom-20 left-1/4 text-6xl animate-bounce" style={{ animationDelay: '1s' }}>🎓</div>
        <div className="absolute bottom-10 right-10 text-6xl animate-spin" style={{ animationDuration: '10s' }}>⚙️</div>
      </div>

      <div className="relative z-10 w-full max-w-2xl bg-white border-[4px] sm:border-[8px] border-gray-900 rounded-[2rem] sm:rounded-[3rem] shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] p-8 sm:p-12 text-center">
        
        {/* TITOLO */}
        <div className="mb-10">
          <h1 className="text-4xl sm:text-6xl font-black text-gray-900 uppercase italic tracking-tighter leading-none">
            IL MURO DELLA <span className="text-red-600">GLORIA</span>
          </h1>
          <div className="inline-block bg-yellow-300 border-4 border-gray-900 px-4 py-1 rounded-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] -rotate-2 mt-4">
            <p className="text-gray-900 font-black text-sm sm:text-lg uppercase tracking-widest">Chi ha reso possibile tutto questo</p>
          </div>
        </div>

        {/* CONTENUTO RINGRAZIAMENTI */}
        <div className="space-y-8 text-left">
          
          <section className="bg-blue-50 border-4 border-gray-900 p-6 rounded-2xl shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all">
            <h2 className="text-xl font-black uppercase text-blue-600 mb-2">🚀 Sviluppo & Visione</h2>
            <p className="text-gray-900 font-bold leading-tight">
              Creato e progettato per rivoluzionare il modo in cui gli studenti collaborano ai progetti.
            </p>
          </section>

          <section className="bg-purple-50 border-4 border-gray-900 p-6 rounded-2xl shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all">
            <h2 className="text-xl font-black uppercase text-purple-600 mb-2">🎨 Design & Stile</h2>
            <p className="text-gray-900 font-bold leading-tight">
              Ispirato al movimento Neobrutalista: bordi spessi, colori accesi e tanta personalità.
            </p>
          </section>

          <section className="bg-green-50 border-4 border-gray-900 p-6 rounded-2xl shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all">
            <h2 className="text-xl font-black uppercase text-green-600 mb-2">🛠️ Tech Stack</h2>
            <div className="flex flex-wrap gap-2 mt-3">
              {['Next.js', 'TailwindCSS', 'Supabase', 'TypeScript', 'Framer Motion'].map((tech) => (
                <span key={tech} className="bg-white border-2 border-gray-900 px-2 py-1 rounded-lg text-xs font-black uppercase">
                  {tech}
                </span>
              ))}
            </div>
          </section>

        </div>

        {/* MESSAGGIO FINALE */}
        <div className="mt-12 p-6 bg-red-100 border-4 border-dashed border-gray-900 rounded-2xl">
          <p className="text-gray-900 font-black text-lg uppercase leading-tight">
            Un ringraziamento speciale a tutti gli studenti dell'Università di Padova che hanno testato questa piattaforma! ❤️
          </p>
        </div>

        {/* BOTTONE TORNA INDIETRO */}
        <div className="mt-10">
          <Link 
            href="/dashboard" 
            className="inline-flex items-center gap-3 bg-gray-900 text-white px-8 py-4 rounded-2xl font-black text-xl uppercase tracking-widest shadow-[6px_6px_0px_0px_rgba(107,114,128,1)] hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all group"
          >
            <span>🔙</span> Torna alla Dashboard
          </Link>
        </div>

      </div>

      {/* STILE CSS EXTRA PER LE ANIMAZIONI dc*/}
      <style jsx global>{`
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </main>
  )
}