'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function CreateProjectPage() {
  const router = useRouter()
  const supabase = createClient()

  // 1. STATI BASE
  const [titolo, setTitolo] = useState('')
  const [descrizione, setDescrizione] = useState('')
  const [coverFile, setCoverFile] = useState<File | null>(null)
  
  // 2. STATI TAG E INTERESSI
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [availableInterests, setAvailableInterests] = useState<{id: string, nome: string}[]>([])

  // 3. STATI AVANZAMENTO
  const [isInProgress, setIsInProgress] = useState(false)
  const [dataInizio, setDataInizio] = useState('')
  const [progressFiles, setProgressFiles] = useState<File[]>([])

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Caricamento Tag iniziali
  useEffect(() => {
    const fetchInterests = async () => {
      const { data, error } = await supabase
        .from('interesse')
        .select('id, nome')
        .order('nome', { ascending: true })
      
      if (data) setAvailableInterests(data)
      // Sostituisci la vecchia riga 37 con questa:
    if (error) {
        console.error("❌ Errore caricamento tag:", {
        messaggio: error.message,
        dettagli: error.details,
        codice: error.code
        });
  }
    }
    fetchInterests()
  }, [supabase])

  const uploadImage = async (file: File, folder: string) => {
    const fileExt = file.name.split('.').pop()
    const fileName = `${Date.now()}-${Math.random()}.${fileExt}`
    const filePath = `${fileName}`

    const { error: uploadError } = await supabase.storage
      .from(folder)
      .upload(filePath, file)

    if (uploadError) throw uploadError
    const { data } = supabase.storage.from(folder).getPublicUrl(filePath)
    return data.publicUrl
  }

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

      // 1. INSERIMENTO BANDO
      const { data: newBando, error: bandoError } = await supabase
        .from('bando')
        .insert({
          titolo: titolo,
          descrizione: descrizione,
          foto_url: coverUrl,
          gallery_urls: galleryUrls,
          stato: isInProgress ? 'in_corso' : 'aperto',
          creatore_tipo: 'studente',
          creatore_studente_id: user.id,
          data_inizio: isInProgress && dataInizio ? dataInizio : null
        } as any)
        .select()
        .single()

      // SE C'È UN ERRORE, STAMPIAMO NEL BOX ROSSO E USCIAMO SENZA BLOCCARE NEXT.JS
      if (bandoError) {
        setError(`Errore Supabase (Bando): ${bandoError.message || JSON.stringify(bandoError)}`)
        setLoading(false)
        return // Ferma tutto qui
      }

      // 2. INSERIMENTO TAG
      if (selectedTags.length > 0 && newBando) {
        const tagInserts = selectedTags.map(tagId => ({
          bando_id: newBando.id,
          interesse_id: tagId
        }))
        
        const { error: tagError } = await supabase
          .from('bando_interesse')
          .insert(tagInserts as any)
          
        if (tagError) {
          setError(`Errore Supabase (Tag): ${tagError.message || JSON.stringify(tagError)}`)
          setLoading(false)
          return // Ferma tutto qui
        }
      }

      // Se arriva qui, è andato tutto perfetto!
      router.push('/dashboard')
      router.refresh()
      
    } catch (err: any) {
      // Cattura errori imprevisti senza far crashare Next.js
      setError(`Errore Codice: ${err.message}`)
      setLoading(false)
    }
  }

  const handleTagToggle = (tagId: string) => {
    setSelectedTags(prev => 
      prev.includes(tagId) ? prev.filter(id => id !== tagId) : [...prev, tagId]
    )
  }

  return (
    <div className="max-w-7xl mx-auto pb-20">
      <h2 className="text-3xl font-black text-red-800 mb-8 uppercase italic">Lancia Progetto</h2>

      {error && (
        <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-2xl border border-red-200 font-bold">
          ⚠️ {error}
        </div>
      )}

      <div className="grid lg:grid-cols-[1.5fr_1fr] gap-10 items-start">
        
        {/* --- COLONNA SINISTRA: IL FORM --- */}
        <form onSubmit={handleCreate} className="space-y-8 bg-white p-8 rounded-3xl shadow-xl border border-gray-100">
          
          {/* CAMPI IMMAGINE E TESTO */}
          <div className="space-y-6">
            <div className="border-2 border-dashed border-gray-200 rounded-2xl p-6 text-center hover:border-red-300 hover:bg-red-50 transition cursor-pointer relative group">
              <input 
                type="file" 
                accept="image/*" 
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" 
                onChange={(e) => setCoverFile(e.target.files?.[0] || null)} 
              />
              <div className="pointer-events-none flex flex-col items-center">
                <span className="text-4xl mb-2 block group-hover:scale-110 transition-transform">📸</span>
                <span className="text-gray-900 font-bold block mb-1">Immagine di Copertina</span>
                <span className="text-xs text-gray-500">Clicca o trascina (16:9 consigliato)</span>
                {coverFile && <p className="mt-3 text-sm text-green-600 font-black bg-green-50 px-3 py-1 rounded-full">{coverFile.name}</p>}
              </div>
            </div>

            <div>
              <label className="text-xs font-black text-gray-400 uppercase mb-1 block">Titolo *</label>
              <input type="text" placeholder="Es. Sviluppo App Sostenibile" 
                className="w-full p-4 border-b-2 border-gray-100 focus:border-red-800 outline-none text-xl font-bold uppercase text-gray-900 transition-colors bg-transparent"
                value={titolo} onChange={(e) => setTitolo(e.target.value)} required />
            </div>
            
            <div>
              <label className="text-xs font-black text-gray-400 uppercase mb-1 block">Descrizione *</label>
              <textarea placeholder="Spiega di cosa si tratta e chi stai cercando..." rows={5}
                className="w-full p-4 bg-gray-50 rounded-2xl border border-gray-100 outline-none focus:ring-2 focus:ring-red-500 text-gray-900"
                value={descrizione} onChange={(e) => setDescrizione(e.target.value)} required />
            </div>
          </div>

          {/* TAGS */}
          <div>
            <h3 className="text-xs font-black text-gray-400 mb-3 uppercase">Tag Caratterizzanti (Competenze richieste)</h3>
            <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 max-h-48 overflow-y-auto">
              {availableInterests.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {availableInterests.map(tag => (
                    <label key={tag.id} className={`flex items-center gap-3 cursor-pointer p-2 rounded-xl transition-all border ${selectedTags.includes(tag.id) ? 'bg-white border-red-200 shadow-sm' : 'border-transparent hover:bg-white hover:border-gray-200'}`}>
                      <input 
                        type="checkbox" 
                        className="w-4 h-4 accent-red-800 rounded cursor-pointer"
                        checked={selectedTags.includes(tag.id)}
                        onChange={() => handleTagToggle(tag.id)}
                      />
                      <span className={`text-sm font-medium select-none ${selectedTags.includes(tag.id) ? 'text-red-900' : 'text-gray-600'}`}>
                        {tag.nome}
                      </span>
                    </label>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500 italic text-center py-4">Nessun tag disponibile nel database.</p>
              )}
            </div>
          </div>

          {/* STATO IN CORSO */}
          <div className={`p-6 rounded-2xl border transition-all ${isInProgress ? 'bg-red-50 border-red-200 shadow-inner' : 'bg-gray-50 border-gray-100'}`}>
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" className="w-5 h-5 accent-red-800 rounded cursor-pointer" 
                checked={isInProgress} onChange={(e) => setIsInProgress(e.target.checked)} />
              <span className="font-bold text-gray-900 uppercase text-sm select-none">Il progetto è già in fase di sviluppo?</span>
            </label>
            
            {isInProgress && (
              <div className="mt-6 space-y-4 border-t border-red-200 pt-6 animate-in fade-in slide-in-from-top-2">
                <div>
                  <label className="text-xs font-black text-red-800 uppercase block mb-2">Data Inizio Sviluppo *</label>
                  <input type="date" className="w-full p-3 border-2 border-red-100 focus:border-red-500 outline-none rounded-xl text-gray-900 bg-white font-medium" 
                    value={dataInizio} onChange={(e) => setDataInizio(e.target.value)} required={isInProgress} />
                </div>

                <div>
                  <label className="text-xs font-black text-red-800 uppercase block mb-2">Galleria Avanzamento (Max 5 Foto)</label>
                  <input 
                    type="file" 
                    multiple 
                    accept="image/*"
                    className="w-full text-sm text-gray-500 file:mr-4 file:py-3 file:px-6 file:rounded-xl file:border-0 file:text-sm file:font-black file:bg-red-800 file:text-white hover:file:bg-red-900 cursor-pointer file:transition-colors bg-white border-2 border-red-100 rounded-xl p-2"
                    onChange={(e) => {
                      const files = Array.from(e.target.files || [])
                      setProgressFiles(files.slice(0, 5))
                    }}
                  />
                  {progressFiles.length > 0 && (
                    <p className="mt-2 text-xs font-bold text-green-600">{progressFiles.length} file selezionati</p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* PULSANTE (Visibile su Desktop) */}
          <button type="submit" disabled={loading || !titolo || !descrizione}
            className="hidden lg:block w-full bg-red-800 text-white p-5 rounded-2xl font-black text-lg hover:bg-red-900 transition-all shadow-xl disabled:opacity-50 mt-4 hover:scale-[1.02] active:scale-95">
            {loading ? 'PUBBLICAZIONE IN CORSO...' : 'LANCIA IL PROGETTO 🚀'}
          </button>
        </form>

        {/* --- COLONNA DESTRA (O PIÈ DI PAGINA): L'ANTEPRIMA --- */}
        <div className="lg:sticky lg:top-24 mt-4 lg:mt-0 flex flex-col gap-6">
          <div className="text-center lg:text-left">
            <h3 className="text-xs font-black text-gray-400 uppercase mb-2">Anteprima Live in Bacheca</h3>
          </div>
          
          {/* Card Anteprima */}
          <div className="bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden flex flex-col transition-all duration-300">
            <div className="h-56 bg-gray-100 w-full relative">
              {coverFile ? (
                <img src={URL.createObjectURL(coverFile)} alt="Anteprima" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
                  <span className="text-gray-400 font-medium italic">Copertina Progetto</span>
                </div>
              )}
              {isInProgress && progressFiles.length > 0 && (
                <div className="absolute bottom-3 right-3 bg-black/70 backdrop-blur-md text-white px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1">
                  📸 +{progressFiles.length} foto
                </div>
              )}
            </div>
            
            <div className="p-6 flex flex-col">
              <div className="flex justify-between items-start mb-3 gap-2">
                <h3 className="text-xl font-black text-gray-900 uppercase break-words leading-tight">
                  {titolo || 'TITOLO PROGETTO'}
                </h3>
                <span className={`text-[10px] px-3 py-1 rounded-full font-black uppercase tracking-wider whitespace-nowrap ${isInProgress ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-700'}`}>
                  {isInProgress ? 'IN CORSO' : 'APERTO'}
                </span>
              </div>
              
              <p className="text-gray-600 line-clamp-3 mb-4 text-sm whitespace-pre-wrap">
                {descrizione || "La descrizione apparirà qui. Aggiungi dettagli accattivanti per attirare l'attenzione di altri studenti..."}
              </p>

              {selectedTags.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-6">
                  {selectedTags.slice(0, 3).map(tagId => {
                    const tagObj = availableInterests.find(t => t.id === tagId)
                    return tagObj ? (
                      <span key={tagId} className="bg-gray-100 text-gray-600 text-[10px] px-2 py-1 rounded-md font-bold uppercase">
                        {tagObj.nome}
                      </span>
                    ) : null
                  })}
                  {selectedTags.length > 3 && (
                    <span className="bg-gray-100 text-gray-400 text-[10px] px-2 py-1 rounded-md font-bold">
                      +{selectedTags.length - 3}
                    </span>
                  )}
                </div>
              )}
              
              <div className="w-full text-center bg-gray-50 text-gray-400 text-sm font-bold py-3 rounded-xl border border-gray-100 mt-auto">
                Visualizza dettagli →
              </div>
            </div>
          </div>

          {/* PULSANTE (Visibile su Mobile/Tablet sotto l'anteprima) */}
          <button type="submit" onClick={handleCreate} disabled={loading || !titolo || !descrizione}
            className="lg:hidden w-full bg-red-800 text-white p-5 rounded-2xl font-black text-lg hover:bg-red-900 transition-all shadow-xl disabled:opacity-50 hover:scale-[1.02] active:scale-95">
            {loading ? 'PUBBLICAZIONE IN CORSO...' : 'LANCIA IL PROGETTO 🚀'}
          </button>
        </div>

      </div>
    </div>
  )
}