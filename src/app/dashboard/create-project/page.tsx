'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface Categoria {
  id: string
  nome: string
}

interface Tag {
  id: string
  nome: string
  categoria_id: string
}

interface FiguraRicercata {
  id: string
  tipo: 'strutturata' | 'libera'
  corso_id: string | null
  corso_nome?: string
  anno_preferito: number | null
  competenze: string[]
  titolo_libero: string
  descrizione_libera: string
  quantita: number
}

export default function CreateProjectPage() {
  const router = useRouter()
  const supabase = createClient()

  // Stati base
  const [titolo, setTitolo] = useState('')
  const [descrizione, setDescrizione] = useState('')
  const [coverFile, setCoverFile] = useState<File | null>(null)
  const [coverPreview, setCoverPreview] = useState<string | null>(null)
  const [dominantColor, setDominantColor] = useState<string>('239, 68, 68')
  
  // Tag e categorie
  const [categorie, setCategorie] = useState<Categoria[]>([])
  const [tags, setTags] = useState<Tag[]>([])
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [expandedCategories, setExpandedCategories] = useState<string[]>([])

  // Corsi di studi
  const [corsiDisponibili, setCorsiDisponibili] = useState<{id: string, nome: string, tipo: string}[]>([])

  // Figure ricercate
  const [figureRicercate, setFigureRicercate] = useState<FiguraRicercata[]>([])

  // Stato in corso
  const [isInProgress, setIsInProgress] = useState(false)
  const [dataInizio, setDataInizio] = useState('')
  const [progressFiles, setProgressFiles] = useState<File[]>([])

  // UI
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeSection, setActiveSection] = useState<'info' | 'tags' | 'figure'>('info')

  // Fetch iniziale
  useEffect(() => {
    const fetchData = async () => {
      const { data: categorieData } = await supabase
        .from('categoria')
        .select('id, nome')
        .order('nome', { ascending: true })
      
      if (categorieData) {
        setCategorie(categorieData)
        setExpandedCategories(categorieData.map(c => c.id))
      }

      const { data: tagsData } = await supabase
        .from('interesse')
        .select('id, nome, categoria_id')
        .order('nome', { ascending: true })
      
      if (tagsData) setTags(tagsData)

      const { data: corsiData } = await supabase
        .from('corso_di_studi')
        .select('id, nome, tipo')
        .order('nome', { ascending: true })
      
      if (corsiData) setCorsiDisponibili(corsiData)
    }

    fetchData()
  }, [supabase])

  // Estrai colore dominante
  useEffect(() => {
    if (!coverFile) {
      setDominantColor('239, 68, 68')
      setCoverPreview(null)
      return
    }

    const url = URL.createObjectURL(coverFile)
    setCoverPreview(url)

    const img = new Image()
    img.crossOrigin = 'Anonymous'
    img.src = url

    img.onload = () => {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      const size = 50
      canvas.width = size
      canvas.height = size
      ctx.drawImage(img, 0, 0, size, size)

      const imageData = ctx.getImageData(0, 0, size, size).data
      let r = 0, g = 0, b = 0, count = 0

      for (let i = 0; i < imageData.length; i += 4) {
        const red = imageData[i]
        const green = imageData[i + 1]
        const blue = imageData[i + 2]
        const brightness = (red + green + blue) / 3

        if (brightness > 30 && brightness < 220) {
          r += red
          g += green
          b += blue
          count++
        }
      }

      if (count > 0) {
        r = Math.round(r / count)
        g = Math.round(g / count)
        b = Math.round(b / count)
        setDominantColor(`${r}, ${g}, ${b}`)
      }
    }

    return () => URL.revokeObjectURL(url)
  }, [coverFile])

  // Upload file
  const uploadImage = async (file: File, folder: string) => {
    const fileExt = file.name.split('.').pop()
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`

    const { error: uploadError } = await supabase.storage
      .from(folder)
      .upload(fileName, file)

    if (uploadError) throw uploadError
    const { data } = supabase.storage.from(folder).getPublicUrl(fileName)
    return data.publicUrl
  }

  // Gestione tag
  const handleTagToggle = (tagId: string) => {
    setSelectedTags(prev => 
      prev.includes(tagId) ? prev.filter(id => id !== tagId) : [...prev, tagId]
    )
  }

  const toggleCategory = (catId: string) => {
    setExpandedCategories(prev =>
      prev.includes(catId) ? prev.filter(id => id !== catId) : [...prev, catId]
    )
  }

  // Gestione figure ricercate
  const addFiguraStrutturata = () => {
    const newFigura: FiguraRicercata = {
      id: Date.now().toString(),
      tipo: 'strutturata',
      corso_id: null,
      anno_preferito: null,
      competenze: [],
      titolo_libero: '',
      descrizione_libera: '',
      quantita: 1
    }
    setFigureRicercate(prev => [...prev, newFigura])
  }

  const addFiguraLibera = () => {
    const newFigura: FiguraRicercata = {
      id: Date.now().toString(),
      tipo: 'libera',
      corso_id: null,
      anno_preferito: null,
      competenze: [],
      titolo_libero: '',
      descrizione_libera: '',
      quantita: 1
    }
    setFigureRicercate(prev => [...prev, newFigura])
  }

  const updateFigura = (id: string, updates: Partial<FiguraRicercata>) => {
    setFigureRicercate(prev => prev.map(f => 
      f.id === id ? { ...f, ...updates } : f
    ))
  }

  const removeFigura = (id: string) => {
    setFigureRicercate(prev => prev.filter(f => f.id !== id))
  }

  const toggleFiguraCompetenza = (figuraId: string, tagId: string) => {
    setFigureRicercate(prev => prev.map(f => {
      if (f.id !== figuraId) return f
      const competenze = f.competenze.includes(tagId)
        ? f.competenze.filter(c => c !== tagId)
        : [...f.competenze, tagId]
      return { ...f, competenze }
    }))
  }

  // Submit
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setError("Utente non autenticato")
        setLoading(false)
        return
      }

      let coverUrl = null
      if (coverFile) {
        coverUrl = await uploadImage(coverFile, 'project-media')
      }

      let galleryUrls: string[] = []
      if (isInProgress && progressFiles.length > 0) {
        const uploadPromises = progressFiles.map(file => uploadImage(file, 'project-media'))
        galleryUrls = await Promise.all(uploadPromises)
      }

      const figureJson = figureRicercate.map(f => ({
        tipo: f.tipo,
        corso_id: f.corso_id,
        corso_nome: corsiDisponibili.find(c => c.id === f.corso_id)?.nome || null,
        anno_preferito: f.anno_preferito,
        competenze: f.competenze,
        competenze_nomi: f.competenze.map(cId => tags.find(t => t.id === cId)?.nome || ''),
        titolo_libero: f.titolo_libero,
        descrizione_libera: f.descrizione_libera,
        quantita: f.quantita
      }))

      const { data: newBando, error: bandoError } = await supabase
        .from('bando')
        .insert({
          titolo,
          descrizione,
          foto_url: coverUrl,
          gallery_urls: galleryUrls,
          stato: isInProgress ? 'in_corso' : 'aperto',
          creatore_tipo: 'studente',
          creatore_studente_id: user.id,
          data_inizio: isInProgress && dataInizio ? dataInizio : null,
          figure_ricercate: figureJson
        } as any)
        .select()
        .single()

      if (bandoError) {
        setError(`Errore: ${bandoError.message}`)
        setLoading(false)
        return
      }

      if (selectedTags.length > 0 && newBando) {
        const tagInserts = selectedTags.map(tagId => ({
          bando_id: newBando.id,
          interesse_id: tagId
        }))
        
        const { error: tagError } = await supabase
          .from('bando_interesse')
          .insert(tagInserts as any)
          
        if (tagError) {
          setError(`Errore tag: ${tagError.message}`)
          setLoading(false)
          return
        }
      }

      router.push('/dashboard')
      router.refresh()
      
    } catch (err: any) {
      setError(`Errore: ${err.message}`)
      setLoading(false)
    }
  }

  const tagsByCategory = categorie.map(cat => ({
    ...cat,
    tags: tags.filter(t => t.categoria_id === cat.id)
  })).filter(cat => cat.tags.length > 0)

  const sections = [
    { id: 'info' as const, label: 'Info', icon: '📝' },
    { id: 'tags' as const, label: 'Tag', icon: '🏷️' },
    { id: 'figure' as const, label: 'Figure', icon: '👥' },
  ]

  // Componente Anteprima
  const PreviewCard = () => (
    <div className="space-y-3 sm:space-y-4">
      <p className="text-xs sm:text-sm font-black text-gray-900 uppercase tracking-wide">📱 Anteprima Card</p>
      
      <div className="bg-white rounded-2xl sm:rounded-3xl border-3 sm:border-4 border-gray-900 overflow-hidden shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] sm:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
        {/* Immagine */}
        <div className="h-32 sm:h-44 bg-gradient-to-br from-yellow-200 to-orange-200 relative overflow-hidden border-b-3 sm:border-b-4 border-gray-900">
          {coverPreview ? (
            <img src={coverPreview} alt="Preview" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <div className="w-10 h-10 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl bg-white border-2 sm:border-3 border-gray-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center">
                <span className="text-xl sm:text-2xl">🖼️</span>
              </div>
            </div>
          )}
          
          <div className="absolute top-2 right-2 sm:top-3 sm:right-3">
            <span className={`px-2 py-0.5 sm:px-3 sm:py-1 rounded-lg sm:rounded-xl text-[10px] sm:text-xs font-black border-2 border-gray-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] ${
              isInProgress ? 'bg-blue-400 text-gray-900' : 'bg-green-400 text-gray-900'
            }`}>
              {isInProgress ? '🔄 In Corso' : '🟢 Aperto'}
            </span>
          </div>
        </div>

        {/* Contenuto */}
        <div className="p-3 sm:p-5">
          <h3 className="font-black text-gray-900 text-sm sm:text-lg leading-tight line-clamp-2 mb-1.5 sm:mb-2">
            {titolo || 'Titolo Progetto'}
          </h3>
          
          <p className="text-gray-700 text-xs sm:text-sm line-clamp-2 mb-3 sm:mb-4 leading-relaxed font-medium">
            {descrizione || 'La descrizione del progetto apparirà qui...'}
          </p>

          {/* Tags */}
          {selectedTags.length > 0 && (
            <div className="flex flex-wrap gap-1 sm:gap-1.5 mb-3 sm:mb-4">
              {selectedTags.slice(0, 3).map(tagId => {
                const tag = tags.find(t => t.id === tagId)
                return tag ? (
                  <span key={tagId} className="text-[9px] sm:text-[11px] px-1.5 sm:px-2.5 py-0.5 sm:py-1 rounded-md sm:rounded-lg font-bold bg-yellow-300 text-gray-900 border sm:border-2 border-gray-900">
                    {tag.nome}
                  </span>
                ) : null
              })}
              {selectedTags.length > 3 && (
                <span className="text-[9px] sm:text-[11px] px-1.5 sm:px-2.5 py-0.5 sm:py-1 rounded-md sm:rounded-lg font-bold bg-gray-200 text-gray-700 border sm:border-2 border-gray-900">
                  +{selectedTags.length - 3}
                </span>
              )}
            </div>
          )}

          {/* Figure ricercate preview */}
          {figureRicercate.length > 0 && (
            <div className="mb-3 sm:mb-4 p-2 sm:p-3 bg-blue-100 rounded-lg sm:rounded-xl border-2 border-gray-900">
              <p className="text-[10px] sm:text-xs font-black text-gray-900 mb-1 sm:mb-2">👥 Cerchiamo:</p>
              <div className="space-y-0.5 sm:space-y-1">
                {figureRicercate.slice(0, 2).map(f => (
                  <p key={f.id} className="text-[9px] sm:text-xs text-gray-800 font-bold truncate">
                    • {f.quantita}x {f.tipo === 'strutturata' 
                      ? (corsiDisponibili.find(c => c.id === f.corso_id)?.nome || 'Studente')
                      : f.titolo_libero || 'Figura personalizzata'
                    }
                  </p>
                ))}
                {figureRicercate.length > 2 && (
                  <p className="text-[9px] sm:text-xs text-gray-600 font-bold">+{figureRicercate.length - 2} altre...</p>
                )}
              </div>
            </div>
          )}

          <div className="pt-2 sm:pt-3 border-t-2 border-dashed border-gray-300 text-center">
            <span className="text-xs sm:text-sm text-gray-900 font-black">Scopri di più →</span>
          </div>
        </div>
      </div>

      {/* Riepilogo */}
      <div className="bg-yellow-100 rounded-xl sm:rounded-2xl p-3 sm:p-4 border-2 sm:border-3 border-gray-900 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
        <p className="text-[10px] sm:text-xs font-black text-gray-900 mb-2 sm:mb-3 uppercase tracking-wide">📊 Riepilogo</p>
        <div className="space-y-1.5 sm:space-y-2">
          <div className="flex justify-between text-xs sm:text-sm">
            <span className="text-gray-700 font-bold">Competenze</span>
            <span className="font-black text-gray-900 bg-white px-2 py-0.5 rounded-lg border border-gray-900">{selectedTags.length}</span>
          </div>
          <div className="flex justify-between text-xs sm:text-sm">
            <span className="text-gray-700 font-bold">Figure ricercate</span>
            <span className="font-black text-gray-900 bg-white px-2 py-0.5 rounded-lg border border-gray-900">{figureRicercate.length}</span>
          </div>
          <div className="flex justify-between text-xs sm:text-sm">
            <span className="text-gray-700 font-bold">Posizioni totali</span>
            <span className="font-black text-gray-900 bg-white px-2 py-0.5 rounded-lg border border-gray-900">
              {figureRicercate.reduce((sum, f) => sum + f.quantita, 0)}
            </span>
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen pb-24 sm:pb-20 bg-gradient-to-br from-orange-50 via-yellow-50 to-red-50">
      {/* Header con sfondo dinamico */}
      <div 
        className="relative -mx-4 lg:-mx-8 -mt-4 lg:-mt-8 px-4 lg:px-8 pt-4 sm:pt-6 pb-4 sm:pb-8 mb-4 sm:mb-8 border-b-4 border-gray-900"
        style={{ 
          background: `linear-gradient(135deg, rgba(${dominantColor}, 0.3) 0%, rgba(${dominantColor}, 0.1) 100%)` 
        }}
      >
        <div className="max-w-6xl mx-auto">
          <button 
            onClick={() => router.push('/dashboard')}
            className="flex items-center gap-1.5 sm:gap-2 text-gray-900 font-black text-xs sm:text-sm transition-colors mb-3 sm:mb-6 group bg-white px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl border-2 sm:border-3 border-gray-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px]"
          >
            <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" />
            </svg>
            Dashboard
          </button>

          <h1 className="text-xl sm:text-3xl font-black text-gray-900 mb-1 sm:mb-2 uppercase tracking-tight">
            🚀 Crea Nuovo Progetto
          </h1>
          <p className="text-gray-700 text-xs sm:text-base font-bold">Descrivi la tua idea e trova i collaboratori perfetti</p>

          {/* Tabs sezioni */}
          <div className="flex gap-1.5 sm:gap-2 mt-4 sm:mt-6 overflow-x-auto pb-2">
            {sections.map(section => (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={`flex items-center gap-1 sm:gap-2 px-2.5 sm:px-4 py-1.5 sm:py-2.5 rounded-lg sm:rounded-xl font-black text-xs sm:text-sm whitespace-nowrap transition-all border-2 sm:border-3 border-gray-900 ${
                  activeSection === section.id
                    ? 'bg-white shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] text-gray-900'
                    : 'bg-gray-100 text-gray-600 hover:bg-white'
                }`}
              >
                <span className="text-sm sm:text-base">{section.icon}</span>
                <span className="hidden sm:inline">{section.label}</span>
                {section.id === 'tags' && selectedTags.length > 0 && (
                  <span className="bg-red-500 text-white px-1.5 sm:px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-black">
                    {selectedTags.length}
                  </span>
                )}
                {section.id === 'figure' && figureRicercate.length > 0 && (
                  <span className="bg-blue-500 text-white px-1.5 sm:px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-black">
                    {figureRicercate.length}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Errore */}
      {error && (
        <div className="max-w-6xl mx-auto mb-4 sm:mb-6 p-3 sm:p-4 bg-red-200 border-3 sm:border-4 border-gray-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] text-gray-900 rounded-xl sm:rounded-2xl font-black text-xs sm:text-sm flex items-center gap-2 sm:gap-3">
          <span className="text-lg sm:text-xl">⚠️</span>
          <span className="flex-1">{error}</span>
          <button onClick={() => setError(null)} className="text-gray-900 hover:text-red-700 font-black text-lg">×</button>
        </div>
      )}

      <div className="max-w-6xl mx-auto px-2 sm:px-0">
        <div className="grid lg:grid-cols-[1fr_380px] gap-4 sm:gap-8">
          
          {/* Form principale */}
          <form onSubmit={handleCreate} className="space-y-4 sm:space-y-6">
            
            {/* SEZIONE: Info Base */}
            {activeSection === 'info' && (
              <div className="space-y-4 sm:space-y-6 animate-in fade-in duration-300">
                <div className="bg-white rounded-2xl sm:rounded-3xl border-3 sm:border-4 border-gray-900 p-4 sm:p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] sm:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
                  <h2 className="text-base sm:text-xl font-black text-gray-900 mb-4 sm:mb-6 flex items-center gap-2 uppercase">
                    <span>📝</span> Informazioni Progetto
                  </h2>
                  
                  {/* Cover Image */}
                  <div className="mb-4 sm:mb-6">
                    <label className="block text-xs sm:text-sm font-black text-gray-900 mb-2 uppercase">🖼️ Immagine di Copertina</label>
                    <div 
                      className="relative border-3 sm:border-4 border-dashed border-gray-400 rounded-xl sm:rounded-2xl overflow-hidden hover:border-gray-900 transition-colors group cursor-pointer bg-gray-50"
                      style={{ aspectRatio: '16/9' }}
                    >
                      <input 
                        type="file" 
                        accept="image/*" 
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" 
                        onChange={(e) => setCoverFile(e.target.files?.[0] || null)} 
                      />
                      {coverPreview ? (
                        <>
                          <img src={coverPreview} alt="Preview" className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <span className="text-white font-black text-xs sm:text-sm bg-gray-900 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl border-2 border-white">📷 Cambia</span>
                          </div>
                        </>
                      ) : (
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                          <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl bg-yellow-300 border-2 sm:border-3 border-gray-900 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center mb-2 sm:mb-3">
                            <span className="text-2xl sm:text-3xl">📸</span>
                          </div>
                          <p className="text-xs sm:text-sm font-black text-gray-900">Clicca o trascina</p>
                          <p className="text-[10px] sm:text-xs text-gray-600 font-bold mt-0.5 sm:mt-1">Formato 16:9 consigliato</p>
                        </div>
                      )}
                    </div>
                    {coverPreview && (
                      <p className="text-[10px] sm:text-xs text-gray-700 mt-2 flex items-center gap-2 font-bold">
                        <span className="w-3 h-3 sm:w-4 sm:h-4 rounded-full border-2 border-gray-900" style={{ backgroundColor: `rgb(${dominantColor})` }} />
                        Colore tema estratto ✨
                      </p>
                    )}
                  </div>

                  {/* Titolo */}
                  <div className="mb-4 sm:mb-6">
                    <label className="block text-xs sm:text-sm font-black text-gray-900 mb-2 uppercase">✏️ Titolo Progetto *</label>
                    <input 
                      type="text" 
                      placeholder="Es: App per la gestione sostenibile dei rifiuti"
                      className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-gray-50 rounded-lg sm:rounded-xl border-2 sm:border-3 border-gray-900 focus:border-red-500 focus:ring-0 outline-none font-bold text-gray-900 text-sm sm:text-base placeholder:text-gray-500 placeholder:font-medium shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] focus:shadow-none focus:translate-x-[3px] focus:translate-y-[3px] transition-all"
                      value={titolo} 
                      onChange={(e) => setTitolo(e.target.value)} 
                      required 
                    />
                  </div>

                  {/* Descrizione */}
                  <div className="mb-4 sm:mb-6">
                    <label className="block text-xs sm:text-sm font-black text-gray-900 mb-2 uppercase">📄 Descrizione *</label>
                    <textarea 
                      placeholder="Descrivi il progetto, gli obiettivi e cosa cerchi nei collaboratori..."
                      rows={4}
                      className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-gray-50 rounded-lg sm:rounded-xl border-2 sm:border-3 border-gray-900 focus:border-red-500 focus:ring-0 outline-none text-gray-900 font-bold text-sm sm:text-base placeholder:text-gray-500 placeholder:font-medium resize-none shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] focus:shadow-none focus:translate-x-[3px] focus:translate-y-[3px] transition-all"
                      value={descrizione} 
                      onChange={(e) => setDescrizione(e.target.value)} 
                      required 
                    />
                  </div>

                  {/* Stato In Corso */}
                  <div className={`p-3 sm:p-4 rounded-xl sm:rounded-2xl border-2 sm:border-3 border-gray-900 transition-all ${isInProgress ? 'bg-blue-100' : 'bg-gray-100'}`}>
                    <label className="flex items-start gap-2 sm:gap-3 cursor-pointer">
                      <input 
                        type="checkbox" 
                        className="w-5 h-5 sm:w-6 sm:h-6 accent-blue-600 rounded cursor-pointer mt-0.5 border-2 border-gray-900" 
                        checked={isInProgress} 
                        onChange={(e) => setIsInProgress(e.target.checked)} 
                      />
                      <div>
                        <span className="font-black text-gray-900 text-sm sm:text-base">🔄 Progetto già in sviluppo</span>
                        <p className="text-[10px] sm:text-xs text-gray-700 mt-0.5 font-bold">Attiva se hai già iniziato a lavorare</p>
                      </div>
                    </label>
                    
                    {isInProgress && (
                      <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t-2 border-dashed border-gray-400 space-y-3 sm:space-y-4">
                        <div>
                          <label className="block text-xs sm:text-sm font-black text-gray-900 mb-1.5 sm:mb-2">📅 Data Inizio</label>
                          <input 
                            type="date" 
                            className="w-full px-3 sm:px-4 py-2 sm:py-3 bg-white rounded-lg sm:rounded-xl border-2 sm:border-3 border-gray-900 outline-none font-bold text-gray-900 text-sm sm:text-base" 
                            value={dataInizio} 
                            onChange={(e) => setDataInizio(e.target.value)} 
                          />
                        </div>
                        <div>
                          <label className="block text-xs sm:text-sm font-black text-gray-900 mb-1.5 sm:mb-2">📸 Galleria (max 5)</label>
                          <input 
                            type="file" 
                            multiple 
                            accept="image/*"
                            className="w-full text-xs sm:text-sm text-gray-700 font-bold file:mr-2 sm:file:mr-4 file:py-1.5 sm:file:py-2 file:px-3 sm:file:px-4 file:rounded-lg sm:file:rounded-xl file:border-2 file:border-gray-900 file:text-xs sm:file:text-sm file:font-black file:bg-blue-300 file:text-gray-900 hover:file:bg-blue-400 cursor-pointer"
                            onChange={(e) => {
                              const files = Array.from(e.target.files || [])
                              setProgressFiles(files.slice(0, 5))
                            }}
                          />
                          {progressFiles.length > 0 && (
                            <p className="mt-1.5 sm:mt-2 text-[10px] sm:text-xs text-blue-700 font-black">✅ {progressFiles.length} file selezionati</p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Next button */}
                <button
                  type="button"
                  onClick={() => setActiveSection('tags')}
                  className="w-full py-2.5 sm:py-3 bg-gray-200 hover:bg-gray-300 text-gray-900 rounded-xl sm:rounded-2xl font-black text-sm sm:text-base transition-all flex items-center justify-center gap-2 border-2 sm:border-3 border-gray-900 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[3px] hover:translate-y-[3px]"
                >
                  Continua: Competenze
                  <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            )}

            {/* SEZIONE: Tags/Competenze */}
            {activeSection === 'tags' && (
              <div className="space-y-4 sm:space-y-6 animate-in fade-in duration-300">
                <div className="bg-white rounded-2xl sm:rounded-3xl border-3 sm:border-4 border-gray-900 p-4 sm:p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] sm:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
                  <h2 className="text-base sm:text-xl font-black text-gray-900 mb-1 sm:mb-2 flex items-center gap-2 uppercase">
                    <span>🏷️</span> Competenze Richieste
                  </h2>
                  <p className="text-[10px] sm:text-sm text-gray-700 mb-4 sm:mb-6 font-bold">Seleziona le competenze necessarie per il progetto</p>
                  
                  {selectedTags.length > 0 && (
                    <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-red-100 rounded-xl sm:rounded-2xl border-2 sm:border-3 border-gray-900">
                      <p className="text-xs sm:text-sm font-black text-gray-900 mb-2">✅ {selectedTags.length} selezionate:</p>
                      <div className="flex flex-wrap gap-1.5 sm:gap-2">
                        {selectedTags.map(tagId => {
                          const tag = tags.find(t => t.id === tagId)
                          return tag ? (
                            <span 
                              key={tagId}
                              className="inline-flex items-center gap-1 px-2 sm:px-3 py-0.5 sm:py-1 bg-white rounded-md sm:rounded-lg text-[10px] sm:text-sm font-black text-gray-900 border-2 border-gray-900"
                            >
                              {tag.nome}
                              <button 
                                type="button"
                                onClick={() => handleTagToggle(tagId)}
                                className="hover:text-red-600 font-black"
                              >
                                ×
                              </button>
                            </span>
                          ) : null
                        })}
                      </div>
                    </div>
                  )}

                  {/* Tags per categoria */}
                  <div className="space-y-3 sm:space-y-4">
                    {tagsByCategory.map(cat => (
                      <div key={cat.id} className="border-2 sm:border-3 border-gray-900 rounded-xl sm:rounded-2xl overflow-hidden">
                        <button
                          type="button"
                          onClick={() => toggleCategory(cat.id)}
                          className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-yellow-200 hover:bg-yellow-300 transition-colors flex items-center justify-between border-b-2 sm:border-b-3 border-gray-900"
                        >
                          <span className="font-black text-gray-900 text-xs sm:text-base">{cat.nome}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] sm:text-xs font-black text-gray-700 bg-white px-1.5 sm:px-2 py-0.5 rounded-md border border-gray-900">
                              {cat.tags.filter(t => selectedTags.includes(t.id)).length}/{cat.tags.length}
                            </span>
                            <svg 
                              className={`w-4 h-4 sm:w-5 sm:h-5 text-gray-900 transition-transform ${expandedCategories.includes(cat.id) ? 'rotate-180' : ''}`} 
                              fill="none" stroke="currentColor" viewBox="0 0 24 24"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" />
                            </svg>
                          </div>
                        </button>
                        
                        {expandedCategories.includes(cat.id) && (
                          <div className="p-3 sm:p-4 grid grid-cols-2 sm:grid-cols-3 gap-1.5 sm:gap-2 bg-gray-50">
                            {cat.tags.map(tag => (
                              <button
                                key={tag.id}
                                type="button"
                                onClick={() => handleTagToggle(tag.id)}
                                className={`px-2 sm:px-3 py-1.5 sm:py-2 rounded-md sm:rounded-lg text-[10px] sm:text-sm font-bold text-left transition-all border-2 border-gray-900 ${
                                  selectedTags.includes(tag.id)
                                    ? 'bg-red-400 text-gray-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'
                                    : 'bg-white text-gray-700 hover:bg-gray-100'
                                }`}
                              >
                                {tag.nome}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {tagsByCategory.length === 0 && (
                    <p className="text-center text-gray-600 py-8 font-bold">Nessuna categoria disponibile</p>
                  )}
                </div>

                {/* Navigation */}
                <div className="flex gap-2 sm:gap-3">
                  <button
                    type="button"
                    onClick={() => setActiveSection('info')}
                    className="flex-1 py-2.5 sm:py-3 bg-gray-200 hover:bg-gray-300 text-gray-900 rounded-xl sm:rounded-2xl font-black text-xs sm:text-base transition-all border-2 sm:border-3 border-gray-900 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[3px] hover:translate-y-[3px]"
                  >
                    ← Info
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveSection('figure')}
                    className="flex-1 py-2.5 sm:py-3 bg-gray-200 hover:bg-gray-300 text-gray-900 rounded-xl sm:rounded-2xl font-black text-xs sm:text-base transition-all border-2 sm:border-3 border-gray-900 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[3px] hover:translate-y-[3px]"
                  >
                    Figure →
                  </button>
                </div>
              </div>
            )}

            {/* SEZIONE: Figure Ricercate */}
            {activeSection === 'figure' && (
              <div className="space-y-4 sm:space-y-6 animate-in fade-in duration-300">
                <div className="bg-white rounded-2xl sm:rounded-3xl border-3 sm:border-4 border-gray-900 p-4 sm:p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] sm:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
                  <h2 className="text-base sm:text-xl font-black text-gray-900 mb-1 sm:mb-2 flex items-center gap-2 uppercase">
                    <span>👥</span> Figure Ricercate
                  </h2>
                  <p className="text-[10px] sm:text-sm text-gray-700 mb-4 sm:mb-6 font-bold">Definisci i profili che stai cercando</p>

                  {/* Lista figure */}
                  <div className="space-y-3 sm:space-y-4 mb-4 sm:mb-6">
                    {figureRicercate.map((figura, idx) => (
                      <div key={figura.id} className="border-2 sm:border-3 border-gray-900 rounded-xl sm:rounded-2xl p-3 sm:p-4 relative bg-gray-50">
                        <button
                          type="button"
                          onClick={() => removeFigura(figura.id)}
                          className="absolute top-2 right-2 sm:top-3 sm:right-3 w-6 h-6 sm:w-8 sm:h-8 bg-red-400 hover:bg-red-500 rounded-lg border-2 border-gray-900 flex items-center justify-center font-black text-gray-900 text-sm sm:text-base transition-colors"
                        >
                          ×
                        </button>

                        <div className="flex items-center gap-2 mb-3 sm:mb-4">
                          <span className="w-6 h-6 sm:w-8 sm:h-8 bg-blue-300 text-gray-900 rounded-lg sm:rounded-xl border-2 border-gray-900 flex items-center justify-center text-xs sm:text-sm font-black">
                            {idx + 1}
                          </span>
                          <span className={`px-2 sm:px-3 py-0.5 sm:py-1 rounded-lg text-[10px] sm:text-xs font-black border-2 border-gray-900 ${
                            figura.tipo === 'strutturata' 
                              ? 'bg-green-300 text-gray-900' 
                              : 'bg-purple-300 text-gray-900'
                          }`}>
                            {figura.tipo === 'strutturata' ? '📋 Strutturata' : '✍️ Personalizzata'}
                          </span>
                        </div>

                        {figura.tipo === 'strutturata' ? (
                          <div className="space-y-3 sm:space-y-4">
                            <div className="grid sm:grid-cols-3 gap-2 sm:gap-4">
                              <div>
                                <label className="block text-[10px] sm:text-xs font-black text-gray-900 mb-1 sm:mb-1.5">🎓 Corso</label>
                                <select
                                  value={figura.corso_id || ''}
                                  onChange={(e) => updateFigura(figura.id, { corso_id: e.target.value || null })}
                                  className="w-full px-2 sm:px-3 py-1.5 sm:py-2 bg-white rounded-lg border-2 border-gray-900 text-xs sm:text-sm font-bold focus:border-blue-500 outline-none"
                                >
                                  <option value="">Qualsiasi</option>
                                  {corsiDisponibili.map(corso => (
                                    <option key={corso.id} value={corso.id}>
                                      {corso.nome}
                                    </option>
                                  ))}
                                </select>
                              </div>

                              <div>
                                <label className="block text-[10px] sm:text-xs font-black text-gray-900 mb-1 sm:mb-1.5">📅 Anno</label>
                                <select
                                  value={figura.anno_preferito || ''}
                                  onChange={(e) => updateFigura(figura.id, { anno_preferito: e.target.value ? parseInt(e.target.value) : null })}
                                  className="w-full px-2 sm:px-3 py-1.5 sm:py-2 bg-white rounded-lg border-2 border-gray-900 text-xs sm:text-sm font-bold focus:border-blue-500 outline-none"
                                >
                                  <option value="">Qualsiasi</option>
                                  <option value="1">1° Anno</option>
                                  <option value="2">2° Anno</option>
                                  <option value="3">3° Anno</option>
                                  <option value="4">4° Anno</option>
                                  <option value="5">5° Anno</option>
                                </select>
                              </div>

                              <div>
                                <label className="block text-[10px] sm:text-xs font-black text-gray-900 mb-1 sm:mb-1.5">🔢 Quanti</label>
                                <select
                                  value={figura.quantita}
                                  onChange={(e) => updateFigura(figura.id, { quantita: parseInt(e.target.value) })}
                                  className="w-full px-2 sm:px-3 py-1.5 sm:py-2 bg-white rounded-lg border-2 border-gray-900 text-xs sm:text-sm font-bold focus:border-blue-500 outline-none"
                                >
                                  {[1,2,3,4,5].map(n => (
                                    <option key={n} value={n}>{n}</option>
                                  ))}
                                </select>
                              </div>
                            </div>

                            <div>
                              <label className="block text-[10px] sm:text-xs font-black text-gray-900 mb-1.5 sm:mb-2">💪 Competenze</label>
                              <div className="flex flex-wrap gap-1 sm:gap-1.5 max-h-24 sm:max-h-32 overflow-y-auto p-2 sm:p-3 bg-white rounded-lg border-2 border-gray-900">
                                {tags.slice(0, 20).map(tag => (
                                  <button
                                    key={tag.id}
                                    type="button"
                                    onClick={() => toggleFiguraCompetenza(figura.id, tag.id)}
                                    className={`px-1.5 sm:px-2 py-0.5 sm:py-1 rounded text-[9px] sm:text-xs font-bold transition-all border sm:border-2 border-gray-900 ${
                                      figura.competenze.includes(tag.id)
                                        ? 'bg-blue-400 text-gray-900'
                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                    }`}
                                  >
                                    {tag.nome}
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-3 sm:space-y-4">
                            <div className="grid sm:grid-cols-2 gap-2 sm:gap-4">
                              <div>
                                <label className="block text-[10px] sm:text-xs font-black text-gray-900 mb-1 sm:mb-1.5">📌 Titolo *</label>
                                <input
                                  type="text"
                                  placeholder="Es: Video Editor..."
                                  value={figura.titolo_libero}
                                  onChange={(e) => updateFigura(figura.id, { titolo_libero: e.target.value })}
                                  className="w-full px-2 sm:px-3 py-1.5 sm:py-2 bg-white rounded-lg border-2 border-gray-900 text-xs sm:text-sm font-bold placeholder:text-gray-400 focus:border-purple-500 outline-none"
                                />
                              </div>
                              <div>
                                <label className="block text-[10px] sm:text-xs font-black text-gray-900 mb-1 sm:mb-1.5">🔢 Quanti</label>
                                <select
                                  value={figura.quantita}
                                  onChange={(e) => updateFigura(figura.id, { quantita: parseInt(e.target.value) })}
                                  className="w-full px-2 sm:px-3 py-1.5 sm:py-2 bg-white rounded-lg border-2 border-gray-900 text-xs sm:text-sm font-bold focus:border-purple-500 outline-none"
                                >
                                  {[1,2,3,4,5].map(n => (
                                    <option key={n} value={n}>{n}</option>
                                  ))}
                                </select>
                              </div>
                            </div>
                            <div>
                              <label className="block text-[10px] sm:text-xs font-black text-gray-900 mb-1 sm:mb-1.5">📝 Descrizione</label>
                              <textarea
                                placeholder="Cosa dovrebbe fare questa figura..."
                                rows={2}
                                value={figura.descrizione_libera}
                                onChange={(e) => updateFigura(figura.id, { descrizione_libera: e.target.value })}
                                className="w-full px-2 sm:px-3 py-1.5 sm:py-2 bg-white rounded-lg border-2 border-gray-900 text-xs sm:text-sm font-bold placeholder:text-gray-400 focus:border-purple-500 outline-none resize-none"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Aggiungi figura */}
                  <div className="flex gap-2 sm:gap-3">
                    <button
                      type="button"
                      onClick={addFiguraStrutturata}
                      className="flex-1 py-2.5 sm:py-3 border-2 sm:border-3 border-dashed border-green-500 hover:border-green-600 hover:bg-green-100 text-green-700 rounded-xl sm:rounded-2xl font-black text-xs sm:text-sm transition-all flex items-center justify-center gap-1 sm:gap-2"
                    >
                      <span className="text-base sm:text-lg">+</span>
                      <span className="hidden sm:inline">Strutturata</span>
                      <span className="sm:hidden">📋</span>
                    </button>
                    <button
                      type="button"
                      onClick={addFiguraLibera}
                      className="flex-1 py-2.5 sm:py-3 border-2 sm:border-3 border-dashed border-purple-500 hover:border-purple-600 hover:bg-purple-100 text-purple-700 rounded-xl sm:rounded-2xl font-black text-xs sm:text-sm transition-all flex items-center justify-center gap-1 sm:gap-2"
                    >
                      <span className="text-base sm:text-lg">+</span>
                      <span className="hidden sm:inline">Personalizzata</span>
                      <span className="sm:hidden">✍️</span>
                    </button>
                  </div>

                  <p className="text-[9px] sm:text-xs text-gray-600 mt-3 sm:mt-4 text-center font-bold bg-gray-100 p-2 rounded-lg">
                    💡 "Strutturata" per studenti specifici, "Personalizzata" per figure non standard
                  </p>
                </div>

                {/* Mobile Preview - Solo su telefono, prima dei pulsanti finali */}
                <div className="lg:hidden">
                  <PreviewCard />
                </div>

                {/* Navigation */}
                <div className="flex gap-2 sm:gap-3">
                  <button
                    type="button"
                    onClick={() => setActiveSection('tags')}
                    className="flex-1 py-2.5 sm:py-3 bg-gray-200 hover:bg-gray-300 text-gray-900 rounded-xl sm:rounded-2xl font-black text-xs sm:text-base transition-all border-2 sm:border-3 border-gray-900 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[3px] hover:translate-y-[3px]"
                  >
                    ← Tag
                  </button>
                  <button
                    type="submit"
                    disabled={loading || !titolo || !descrizione}
                    className="flex-1 py-2.5 sm:py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl sm:rounded-2xl font-black text-xs sm:text-base transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 sm:gap-2 border-2 sm:border-3 border-gray-900 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[3px] hover:translate-y-[3px]"
                  >
                    {loading ? (
                      <>
                        <div className="w-3 h-3 sm:w-4 sm:h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span className="hidden sm:inline">Pubblicazione...</span>
                        <span className="sm:hidden">...</span>
                      </>
                    ) : (
                      <>
                        🚀 <span className="hidden sm:inline">Pubblica Progetto</span>
                        <span className="sm:hidden">Pubblica</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </form>

          {/* Desktop Preview - Solo su desktop */}
          <div className="hidden lg:block">
            <div className="sticky top-24">
              <PreviewCard />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}