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
  // Strutturata
  corso_id: string | null
  corso_nome?: string
  anno_preferito: number | null
  competenze: string[]
  // Libera
  titolo_libero: string
  descrizione_libera: string
  // Comune
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
  const [dominantColor, setDominantColor] = useState<string>('239, 68, 68') // RGB red default
  
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
      // Fetch categorie
      const { data: categorieData } = await supabase
        .from('categoria')
        .select('id, nome')
        .order('nome', { ascending: true })
      
      if (categorieData) {
        setCategorie(categorieData)
        // Espandi tutte le categorie di default
        setExpandedCategories(categorieData.map(c => c.id))
      }

      // Fetch tag/interessi
      const { data: tagsData } = await supabase
        .from('interesse')
        .select('id, nome, categoria_id')
        .order('nome', { ascending: true })
      
      if (tagsData) setTags(tagsData)

      // Fetch corsi di studi
      const { data: corsiData } = await supabase
        .from('corso_di_studi')
        .select('id, nome, tipo')
        .order('nome', { ascending: true })
      
      if (corsiData) setCorsiDisponibili(corsiData)
    }

    fetchData()
  }, [supabase])

  // Estrai colore dominante dall'immagine
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

      // Prepara le figure ricercate come JSON
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

      // Inserimento bando
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

      // Inserimento tag
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

  // Raggruppa tag per categoria
  const tagsByCategory = categorie.map(cat => ({
    ...cat,
    tags: tags.filter(t => t.categoria_id === cat.id)
  })).filter(cat => cat.tags.length > 0)

  // Sezioni
  const sections = [
    { id: 'info' as const, label: 'Info Base', icon: '📝' },
    { id: 'tags' as const, label: 'Competenze', icon: '🏷️' },
    { id: 'figure' as const, label: 'Figure Ricercate', icon: '👥' },
  ]

  return (
    <div className="min-h-screen pb-20">
      {/* Header con sfondo dinamico */}
      <div 
        className="relative -mx-4 lg:-mx-8 -mt-4 lg:-mt-8 px-4 lg:px-8 pt-6 pb-8 mb-8 transition-all duration-700"
        style={{ 
          background: `linear-gradient(135deg, rgba(${dominantColor}, 0.15) 0%, rgba(${dominantColor}, 0.05) 100%)` 
        }}
      >
        <div className="max-w-6xl mx-auto">
          <button 
            onClick={() => router.push('/dashboard')}
            className="flex items-center gap-2 text-gray-500 hover:text-gray-900 font-medium text-sm transition-colors mb-6 group"
          >
            <svg className="w-4 h-4 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Dashboard
          </button>

          <h1 className="text-3xl font-bold text-gray-900 mb-2">Crea Nuovo Progetto</h1>
          <p className="text-gray-500">Descrivi la tua idea e trova i collaboratori perfetti</p>

          {/* Tabs sezioni */}
          <div className="flex gap-2 mt-6 overflow-x-auto pb-2">
            {sections.map(section => (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm whitespace-nowrap transition-all ${
                  activeSection === section.id
                    ? 'bg-white shadow-sm text-gray-900'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-white/50'
                }`}
              >
                <span>{section.icon}</span>
                {section.label}
                {section.id === 'tags' && selectedTags.length > 0 && (
                  <span className="bg-red-100 text-red-600 px-2 py-0.5 rounded-full text-xs font-bold">
                    {selectedTags.length}
                  </span>
                )}
                {section.id === 'figure' && figureRicercate.length > 0 && (
                  <span className="bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full text-xs font-bold">
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
        <div className="max-w-6xl mx-auto mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-2xl font-medium text-sm flex items-center gap-3">
          <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {error}
          <button onClick={() => setError(null)} className="ml-auto text-red-500 hover:text-red-700">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      <div className="max-w-6xl mx-auto">
        <div className="grid lg:grid-cols-[1fr_400px] gap-8">
          
          {/* Form principale */}
          <form onSubmit={handleCreate} className="space-y-6">
            
            {/* SEZIONE: Info Base */}
            {activeSection === 'info' && (
              <div className="space-y-6 animate-in fade-in duration-300">
                <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
                  <h2 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
                    <span>📝</span> Informazioni Progetto
                  </h2>
                  
                  {/* Cover Image */}
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Immagine di Copertina</label>
                    <div 
                      className="relative border-2 border-dashed border-gray-200 rounded-2xl overflow-hidden hover:border-gray-300 transition-colors group cursor-pointer"
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
                            <span className="text-white font-medium text-sm bg-white/20 backdrop-blur-sm px-4 py-2 rounded-xl">Cambia immagine</span>
                          </div>
                        </>
                      ) : (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-50 group-hover:bg-gray-100 transition-colors">
                          <div className="w-12 h-12 rounded-2xl bg-white shadow-sm flex items-center justify-center mb-3">
                            <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                          </div>
                          <p className="text-sm font-medium text-gray-600">Clicca o trascina un'immagine</p>
                          <p className="text-xs text-gray-400 mt-1">Formato 16:9 consigliato</p>
                        </div>
                      )}
                    </div>
                    {coverPreview && (
                      <p className="text-xs text-gray-500 mt-2 flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full" style={{ backgroundColor: `rgb(${dominantColor})` }} />
                        Colore tema estratto automaticamente
                      </p>
                    )}
                  </div>

                  {/* Titolo */}
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Titolo Progetto *</label>
                    <input 
                      type="text" 
                      placeholder="Es: App per la gestione sostenibile dei rifiuti"
                      className="w-full px-4 py-3 bg-gray-50 rounded-xl border border-gray-200 focus:border-red-500 focus:ring-2 focus:ring-red-500/20 outline-none font-medium text-gray-900 transition-all"
                      value={titolo} 
                      onChange={(e) => setTitolo(e.target.value)} 
                      required 
                    />
                  </div>

                  {/* Descrizione */}
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Descrizione *</label>
                    <textarea 
                      placeholder="Descrivi il progetto, gli obiettivi e cosa cerchi nei collaboratori..."
                      rows={5}
                      className="w-full px-4 py-3 bg-gray-50 rounded-xl border border-gray-200 focus:border-red-500 focus:ring-2 focus:ring-red-500/20 outline-none text-gray-900 transition-all resize-none"
                      value={descrizione} 
                      onChange={(e) => setDescrizione(e.target.value)} 
                      required 
                    />
                  </div>

                  {/* Stato In Corso */}
                  <div className={`p-4 rounded-xl border-2 transition-all ${isInProgress ? 'border-blue-200 bg-blue-50' : 'border-gray-100 bg-gray-50'}`}>
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input 
                        type="checkbox" 
                        className="w-5 h-5 accent-blue-600 rounded cursor-pointer" 
                        checked={isInProgress} 
                        onChange={(e) => setIsInProgress(e.target.checked)} 
                      />
                      <div>
                        <span className="font-medium text-gray-900">Progetto già in sviluppo</span>
                        <p className="text-xs text-gray-500 mt-0.5">Attiva se hai già iniziato a lavorare sul progetto</p>
                      </div>
                    </label>
                    
                    {isInProgress && (
                      <div className="mt-4 pt-4 border-t border-blue-200 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Data Inizio</label>
                          <input 
                            type="date" 
                            className="w-full px-4 py-3 bg-white rounded-xl border border-gray-200 focus:border-blue-500 outline-none font-medium text-gray-900" 
                            value={dataInizio} 
                            onChange={(e) => setDataInizio(e.target.value)} 
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Galleria Avanzamento (max 5)</label>
                          <input 
                            type="file" 
                            multiple 
                            accept="image/*"
                            className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-medium file:bg-blue-100 file:text-blue-700 hover:file:bg-blue-200 cursor-pointer"
                            onChange={(e) => {
                              const files = Array.from(e.target.files || [])
                              setProgressFiles(files.slice(0, 5))
                            }}
                          />
                          {progressFiles.length > 0 && (
                            <p className="mt-2 text-xs text-blue-600 font-medium">{progressFiles.length} file selezionati</p>
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
                  className="w-full py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
                >
                  Continua: Competenze
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            )}

            {/* SEZIONE: Tags/Competenze */}
            {activeSection === 'tags' && (
              <div className="space-y-6 animate-in fade-in duration-300">
                <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
                  <h2 className="text-lg font-semibold text-gray-900 mb-2 flex items-center gap-2">
                    <span>🏷️</span> Competenze Richieste
                  </h2>
                  <p className="text-sm text-gray-500 mb-6">Seleziona le competenze necessarie per il progetto</p>
                  
                  {selectedTags.length > 0 && (
                    <div className="mb-6 p-4 bg-red-50 rounded-xl border border-red-100">
                      <p className="text-sm font-medium text-red-700 mb-2">{selectedTags.length} competenze selezionate:</p>
                      <div className="flex flex-wrap gap-2">
                        {selectedTags.map(tagId => {
                          const tag = tags.find(t => t.id === tagId)
                          return tag ? (
                            <span 
                              key={tagId}
                              className="inline-flex items-center gap-1 px-3 py-1 bg-white rounded-lg text-sm font-medium text-red-700 border border-red-200"
                            >
                              {tag.nome}
                              <button 
                                type="button"
                                onClick={() => handleTagToggle(tagId)}
                                className="hover:text-red-900"
                              >
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            </span>
                          ) : null
                        })}
                      </div>
                    </div>
                  )}

                  {/* Tags per categoria */}
                  <div className="space-y-4">
                    {tagsByCategory.map(cat => (
                      <div key={cat.id} className="border border-gray-100 rounded-xl overflow-hidden">
                        <button
                          type="button"
                          onClick={() => toggleCategory(cat.id)}
                          className="w-full px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors flex items-center justify-between"
                        >
                          <span className="font-medium text-gray-900">{cat.nome}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-500">
                              {cat.tags.filter(t => selectedTags.includes(t.id)).length}/{cat.tags.length}
                            </span>
                            <svg 
                              className={`w-4 h-4 text-gray-500 transition-transform ${expandedCategories.includes(cat.id) ? 'rotate-180' : ''}`} 
                              fill="none" stroke="currentColor" viewBox="0 0 24 24"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </div>
                        </button>
                        
                        {expandedCategories.includes(cat.id) && (
                          <div className="p-4 grid grid-cols-2 sm:grid-cols-3 gap-2">
                            {cat.tags.map(tag => (
                              <button
                                key={tag.id}
                                type="button"
                                onClick={() => handleTagToggle(tag.id)}
                                className={`px-3 py-2 rounded-lg text-sm font-medium text-left transition-all ${
                                  selectedTags.includes(tag.id)
                                    ? 'bg-red-100 text-red-700 border-2 border-red-300'
                                    : 'bg-gray-50 text-gray-700 border-2 border-transparent hover:bg-gray-100'
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
                    <p className="text-center text-gray-500 py-8">Nessuna categoria disponibile</p>
                  )}
                </div>

                {/* Navigation */}
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setActiveSection('info')}
                    className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium transition-colors"
                  >
                    ← Info Base
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveSection('figure')}
                    className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
                  >
                    Figure Ricercate →
                  </button>
                </div>
              </div>
            )}

            {/* SEZIONE: Figure Ricercate */}
            {activeSection === 'figure' && (
              <div className="space-y-6 animate-in fade-in duration-300">
                <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
                  <h2 className="text-lg font-semibold text-gray-900 mb-2 flex items-center gap-2">
                    <span>👥</span> Figure Ricercate
                  </h2>
                  <p className="text-sm text-gray-500 mb-6">Definisci i profili che stai cercando per il tuo team</p>

                  {/* Lista figure */}
                  <div className="space-y-4 mb-6">
                    {figureRicercate.map((figura, idx) => (
                      <div key={figura.id} className="border border-gray-200 rounded-xl p-4 relative">
                        <button
                          type="button"
                          onClick={() => removeFigura(figura.id)}
                          className="absolute top-3 right-3 p-1 text-gray-400 hover:text-red-500 transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>

                        <div className="flex items-center gap-2 mb-4">
                          <span className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-bold">
                            {idx + 1}
                          </span>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                            figura.tipo === 'strutturata' 
                              ? 'bg-green-100 text-green-700' 
                              : 'bg-purple-100 text-purple-700'
                          }`}>
                            {figura.tipo === 'strutturata' ? '📋 Strutturata' : '✍️ Personalizzata'}
                          </span>
                        </div>

                        {figura.tipo === 'strutturata' ? (
                          /* FIGURA STRUTTURATA */
                          <div className="space-y-4">
                            <div className="grid sm:grid-cols-3 gap-4">
                              {/* Corso */}
                              <div>
                                <label className="block text-xs font-medium text-gray-500 mb-1">Corso di Studi</label>
                                <select
                                  value={figura.corso_id || ''}
                                  onChange={(e) => updateFigura(figura.id, { corso_id: e.target.value || null })}
                                  className="w-full px-3 py-2 bg-gray-50 rounded-lg border border-gray-200 text-sm focus:border-blue-500 outline-none"
                                >
                                  <option value="">Qualsiasi</option>
                                  {corsiDisponibili.map(corso => (
                                    <option key={corso.id} value={corso.id}>
                                      {corso.nome}
                                    </option>
                                  ))}
                                </select>
                              </div>

                              {/* Anno */}
                              <div>
                                <label className="block text-xs font-medium text-gray-500 mb-1">Anno Preferito</label>
                                <select
                                  value={figura.anno_preferito || ''}
                                  onChange={(e) => updateFigura(figura.id, { anno_preferito: e.target.value ? parseInt(e.target.value) : null })}
                                  className="w-full px-3 py-2 bg-gray-50 rounded-lg border border-gray-200 text-sm focus:border-blue-500 outline-none"
                                >
                                  <option value="">Qualsiasi</option>
                                  <option value="1">1° Anno</option>
                                  <option value="2">2° Anno</option>
                                  <option value="3">3° Anno</option>
                                  <option value="4">4° Anno</option>
                                  <option value="5">5° Anno</option>
                                </select>
                              </div>

                              {/* Quantità */}
                              <div>
                                <label className="block text-xs font-medium text-gray-500 mb-1">Quanti ne cerchi</label>
                                <select
                                  value={figura.quantita}
                                  onChange={(e) => updateFigura(figura.id, { quantita: parseInt(e.target.value) })}
                                  className="w-full px-3 py-2 bg-gray-50 rounded-lg border border-gray-200 text-sm focus:border-blue-500 outline-none"
                                >
                                  {[1,2,3,4,5].map(n => (
                                    <option key={n} value={n}>{n}</option>
                                  ))}
                                </select>
                              </div>
                            </div>

                            {/* Competenze per questa figura */}
                            <div>
                              <label className="block text-xs font-medium text-gray-500 mb-2">Competenze richieste</label>
                              <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto p-2 bg-gray-50 rounded-lg">
                                {tags.slice(0, 20).map(tag => (
                                  <button
                                    key={tag.id}
                                    type="button"
                                    onClick={() => toggleFiguraCompetenza(figura.id, tag.id)}
                                    className={`px-2 py-1 rounded text-xs font-medium transition-all ${
                                      figura.competenze.includes(tag.id)
                                        ? 'bg-blue-500 text-white'
                                        : 'bg-white text-gray-600 border border-gray-200 hover:border-blue-300'
                                    }`}
                                  >
                                    {tag.nome}
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>
                        ) : (
                          /* FIGURA LIBERA */
                          <div className="space-y-4">
                            <div className="grid sm:grid-cols-2 gap-4">
                              <div>
                                <label className="block text-xs font-medium text-gray-500 mb-1">Titolo Figura *</label>
                                <input
                                  type="text"
                                  placeholder="Es: Video Editor, Social Media Manager..."
                                  value={figura.titolo_libero}
                                  onChange={(e) => updateFigura(figura.id, { titolo_libero: e.target.value })}
                                  className="w-full px-3 py-2 bg-gray-50 rounded-lg border border-gray-200 text-sm focus:border-purple-500 outline-none"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-gray-500 mb-1">Quanti ne cerchi</label>
                                <select
                                  value={figura.quantita}
                                  onChange={(e) => updateFigura(figura.id, { quantita: parseInt(e.target.value) })}
                                  className="w-full px-3 py-2 bg-gray-50 rounded-lg border border-gray-200 text-sm focus:border-purple-500 outline-none"
                                >
                                  {[1,2,3,4,5].map(n => (
                                    <option key={n} value={n}>{n}</option>
                                  ))}
                                </select>
                              </div>
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-500 mb-1">Descrizione</label>
                              <textarea
                                placeholder="Descrivi cosa dovrebbe fare questa figura e quali competenze dovrebbe avere..."
                                rows={3}
                                value={figura.descrizione_libera}
                                onChange={(e) => updateFigura(figura.id, { descrizione_libera: e.target.value })}
                                className="w-full px-3 py-2 bg-gray-50 rounded-lg border border-gray-200 text-sm focus:border-purple-500 outline-none resize-none"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Aggiungi figura */}
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={addFiguraStrutturata}
                      className="flex-1 py-3 border-2 border-dashed border-green-200 hover:border-green-300 hover:bg-green-50 text-green-700 rounded-xl font-medium transition-all flex items-center justify-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      Aggiungi Strutturata
                    </button>
                    <button
                      type="button"
                      onClick={addFiguraLibera}
                      className="flex-1 py-3 border-2 border-dashed border-purple-200 hover:border-purple-300 hover:bg-purple-50 text-purple-700 rounded-xl font-medium transition-all flex items-center justify-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      Aggiungi Personalizzata
                    </button>
                  </div>

                  <p className="text-xs text-gray-400 mt-4 text-center">
                    💡 Usa "Strutturata" per cercare studenti specifici, "Personalizzata" per figure non standard
                  </p>
                </div>

                {/* Navigation */}
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setActiveSection('tags')}
                    className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium transition-colors"
                  >
                    ← Competenze
                  </button>
                  <button
                    type="submit"
                    disabled={loading || !titolo || !descrizione}
                    className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Pubblicazione...
                      </>
                    ) : (
                      <>
                        🚀 Pubblica Progetto
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </form>

          {/* Anteprima */}
          <div className="hidden lg:block">
            <div className="sticky top-24 space-y-4">
              <p className="text-sm font-medium text-gray-500">Anteprima Card</p>
              
              <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
                {/* Immagine */}
                <div className="h-44 bg-gradient-to-br from-gray-100 to-gray-200 relative overflow-hidden">
                  {coverPreview ? (
                    <img src={coverPreview} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <div className="w-12 h-12 rounded-2xl bg-white shadow-sm flex items-center justify-center">
                        <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                    </div>
                  )}
                  
                  <div className="absolute top-3 right-3">
                    <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                      isInProgress ? 'bg-blue-500 text-white' : 'bg-white/90 text-gray-700'
                    }`}>
                      {isInProgress ? '🔄 In Corso' : '🟢 Aperto'}
                    </span>
                  </div>
                </div>

                {/* Contenuto */}
                <div className="p-5">
                  <h3 className="font-bold text-gray-900 text-lg leading-snug line-clamp-2 mb-2">
                    {titolo || 'Titolo Progetto'}
                  </h3>
                  
                  <p className="text-gray-500 text-sm line-clamp-2 mb-4 leading-relaxed">
                    {descrizione || 'La descrizione del progetto apparirà qui...'}
                  </p>

                  {/* Tags */}
                  {selectedTags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-4">
                      {selectedTags.slice(0, 3).map(tagId => {
                        const tag = tags.find(t => t.id === tagId)
                        return tag ? (
                          <span key={tagId} className="text-[11px] px-2.5 py-1 rounded-md font-medium bg-gray-100 text-gray-600">
                            {tag.nome}
                          </span>
                        ) : null
                      })}
                      {selectedTags.length > 3 && (
                        <span className="text-[11px] px-2.5 py-1 rounded-md font-medium bg-gray-100 text-gray-500">
                          +{selectedTags.length - 3}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Figure ricercate preview */}
                  {figureRicercate.length > 0 && (
                    <div className="mb-4 p-3 bg-blue-50 rounded-xl border border-blue-100">
                      <p className="text-xs font-medium text-blue-700 mb-2">👥 Cerchiamo:</p>
                      <div className="space-y-1">
                        {figureRicercate.slice(0, 3).map(f => (
                          <p key={f.id} className="text-xs text-blue-600">
                            • {f.quantita}x {f.tipo === 'strutturata' 
                              ? (corsiDisponibili.find(c => c.id === f.corso_id)?.nome || 'Studente') + (f.anno_preferito ? ` (${f.anno_preferito}° anno)` : '')
                              : f.titolo_libero || 'Figura personalizzata'
                            }
                          </p>
                        ))}
                        {figureRicercate.length > 3 && (
                          <p className="text-xs text-blue-500">+{figureRicercate.length - 3} altre figure...</p>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="pt-4 border-t border-gray-100 text-center">
                    <span className="text-sm text-gray-400 font-medium">Scopri →</span>
                  </div>
                </div>
              </div>

              {/* Riepilogo */}
              <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                <p className="text-xs font-medium text-gray-500 mb-3">Riepilogo</p>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Competenze</span>
                  <span className="font-medium text-gray-900">{selectedTags.length}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Figure ricercate</span>
                  <span className="font-medium text-gray-900">{figureRicercate.length}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Posizioni totali</span>
                  <span className="font-medium text-gray-900">
                    {figureRicercate.reduce((sum, f) => sum + f.quantita, 0)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}