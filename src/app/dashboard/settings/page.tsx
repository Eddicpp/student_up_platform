'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/app/context/UserContext'
import { useRouter } from 'next/navigation'
import { useTheme } from '@/components/theme-provider'

interface UserSettings {
  notifica_candidature: boolean
  notifica_esito_applicazioni: boolean
  notifica_messaggi_team: boolean
  disponibile_progetti: boolean
  visibilita_profilo: 'pubblico' | 'solo_team'
  tema: 'light' | 'dark' | 'system'
  lingua: 'it' | 'en'
}

export default function SettingsPage() {
  const { user, loading: userLoading } = useUser()
  const router = useRouter()
  const supabase = createClient()
  const { theme, setTheme } = useTheme()

  const [settings, setSettings] = useState<UserSettings>({
    notifica_candidature: true,
    notifica_esito_applicazioni: true,
    notifica_messaggi_team: false,
    disponibile_progetti: true,
    visibilita_profilo: 'pubblico',
    tema: 'system',
    lingua: 'it'
  })
  
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  
  // Password change
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [passwordData, setPasswordData] = useState({ current: '', new: '', confirm: '' })
  const [changingPassword, setChangingPassword] = useState(false)
  
  // Delete account
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [deleting, setDeleting] = useState(false)

  // Stili condivisi
  const cardStyle = "bg-white rounded-xl sm:rounded-2xl border-2 sm:border-3 border-gray-900 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] sm:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]"
  const buttonStyle = "border-2 border-gray-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] sm:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
  const inputStyle = "w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-white border-2 border-gray-900 rounded-xl text-gray-900 font-bold text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"

  // Toast notification
  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  // Fetch settings
  useEffect(() => {
    const fetchSettings = async () => {
      if (!user?.id) return
      
      const { data, error } = await (supabase
        .from('impostazioni_utente' as any)
        .select('*')
        .eq('studente_id', user.id)
        .single()) as { data: any; error: any }

      if (data) {
        setSettings({
          notifica_candidature: data.notifica_candidature ?? true,
          notifica_esito_applicazioni: data.notifica_esito_applicazioni ?? true,
          notifica_messaggi_team: data.notifica_messaggi_team ?? false,
          disponibile_progetti: data.disponibile_progetti ?? true,
          visibilita_profilo: data.visibilita_profilo ?? 'pubblico',
          tema: data.tema ?? 'system',
          lingua: data.lingua ?? 'it'
        })
        // Sync theme with next-themes
        if (data.tema) setTheme(data.tema)
      } else if (error?.code === 'PGRST116') {
        // No settings found, create default
        await (supabase as any).from('impostazioni_utente').insert({ studente_id: user.id })
      }
      
      setLoading(false)
    }

    if (user) fetchSettings()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  // Save setting
  const saveSetting = async (key: keyof UserSettings, value: any) => {
    if (!user?.id) return
    
    setSaving(true)
    
    const { error } = await (supabase as any)
      .from('impostazioni_utente')
      .update({ [key]: value })
      .eq('studente_id', user.id)

    if (error) {
      showToast('Errore nel salvataggio', 'error')
    } else {
      setSettings(prev => ({ ...prev, [key]: value }))
      showToast('Impostazione salvata!', 'success')
      
      // Sync theme
      if (key === 'tema') setTheme(value)
    }
    
    setSaving(false)
  }

  // Change password
  const handleChangePassword = async () => {
    if (passwordData.new !== passwordData.confirm) {
      showToast('Le password non coincidono', 'error')
      return
    }
    if (passwordData.new.length < 8) {
      showToast('La password deve avere almeno 8 caratteri', 'error')
      return
    }

    setChangingPassword(true)

    const { error } = await supabase.auth.updateUser({
      password: passwordData.new
    })

    if (error) {
      showToast('Errore: ' + error.message, 'error')
    } else {
      showToast('Password aggiornata con successo!', 'success')
      setShowPasswordModal(false)
      setPasswordData({ current: '', new: '', confirm: '' })
    }

    setChangingPassword(false)
  }

  // Logout all devices
  const handleLogoutAllDevices = async () => {
    if (!confirm('Verrai disconnesso da tutti i dispositivi. Continuare?')) return

    const { error } = await supabase.auth.signOut({ scope: 'global' })
    
    if (error) {
      showToast('Errore: ' + error.message, 'error')
    } else {
      router.push('/login')
    }
  }

  // Delete account
  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== 'ELIMINA') {
      showToast('Scrivi ELIMINA per confermare', 'error')
      return
    }

    if (!user?.id) {
      showToast('Errore: utente non trovato', 'error')
      return
    }

    setDeleting(true)

    try {
      // 1. Delete user data from database (cascade will handle related data)
      const { error: dbError } = await supabase
        .from('studente')
        .delete()
        .eq('id', user.id)

      if (dbError) throw dbError

      // 2. Sign out
      await supabase.auth.signOut()
      
      showToast('Account eliminato', 'success')
      router.push('/')
    } catch (error: any) {
      showToast('Errore: ' + error.message, 'error')
      setDeleting(false)
    }
  }

  // Toggle component
  const Toggle = ({ enabled, onChange, disabled = false }: { enabled: boolean; onChange: (val: boolean) => void; disabled?: boolean }) => (
    <button
      onClick={() => !disabled && onChange(!enabled)}
      disabled={disabled}
      className={`relative w-12 sm:w-14 h-7 sm:h-8 rounded-full border-2 border-gray-900 transition-all ${
        enabled ? 'bg-green-400' : 'bg-gray-300'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'} ${buttonStyle}`}
    >
      <div className={`absolute top-0.5 sm:top-1 w-5 h-5 sm:w-5 sm:h-5 bg-white border-2 border-gray-900 rounded-full transition-all ${
        enabled ? 'left-5 sm:left-7' : 'left-0.5 sm:left-1'
      }`} />
    </button>
  )

  // Setting row component
  const SettingRow = ({ 
    icon, 
    title, 
    description, 
    children 
  }: { 
    icon: string
    title: string
    description?: string
    children: React.ReactNode 
  }) => (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-4 border-b-2 border-gray-200 last:border-0">
      <div className="flex items-start gap-3">
        <span className="text-xl sm:text-2xl">{icon}</span>
        <div>
          <p className="font-black text-gray-900 text-sm sm:text-base uppercase tracking-wide">{title}</p>
          {description && <p className="text-[10px] sm:text-xs text-gray-600 font-bold mt-0.5">{description}</p>}
        </div>
      </div>
      <div className="ml-9 sm:ml-0">{children}</div>
    </div>
  )

  if (userLoading || loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className={`${cardStyle} p-6 sm:p-10 text-center`}>
          <div className="text-5xl sm:text-6xl animate-bounce mb-4">⚙️</div>
          <p className="text-gray-900 font-black uppercase tracking-widest text-sm sm:text-lg">Caricamento...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto px-3 sm:px-4 pb-20">
      
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 sm:px-6 py-3 sm:py-4 rounded-xl border-2 border-gray-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] font-black text-sm uppercase tracking-wide animate-in slide-in-from-top ${
          toast.type === 'success' ? 'bg-green-400 text-gray-900' : 'bg-red-500 text-white'
        }`}>
          {toast.type === 'success' ? '✅' : '❌'} {toast.message}
        </div>
      )}

      {/* Header */}
      <div className={`${cardStyle} p-4 sm:p-6 bg-gradient-to-r from-blue-400 to-purple-400 mb-6 sm:mb-8 relative overflow-hidden`}>
        <div className="absolute top-[-10px] right-[-10px] text-6xl sm:text-8xl opacity-20 rotate-12">⚙️</div>
        <div className="relative z-10">
          <h1 className="text-2xl sm:text-4xl font-black uppercase italic tracking-tighter text-gray-900 leading-none">
            Impostazioni
          </h1>
          <p className="text-gray-900 font-bold uppercase text-[10px] sm:text-sm tracking-widest mt-2 bg-white inline-block px-2 sm:px-3 py-1 rounded-lg border-2 border-gray-900">
            Personalizza la tua esperienza
          </p>
        </div>
      </div>

      <div className="space-y-4 sm:space-y-6">

        {/* 🔒 ACCOUNT & SICUREZZA */}
        <div className={cardStyle}>
          <div className="bg-red-400 px-4 sm:px-6 py-3 sm:py-4 border-b-2 sm:border-b-3 border-gray-900 rounded-t-xl sm:rounded-t-2xl">
            <h2 className="font-black text-gray-900 uppercase tracking-widest text-xs sm:text-sm flex items-center gap-2">
              <span className="text-lg sm:text-xl">🔒</span> Account & Sicurezza
            </h2>
          </div>
          <div className="p-4 sm:p-6 space-y-1">
            
            {/* Email (readonly) */}
            <SettingRow icon="📧" title="Email" description="La tua email di accesso">
              <span className="text-xs sm:text-sm font-bold text-gray-600 bg-gray-100 px-3 py-1.5 rounded-lg border-2 border-gray-300">
                {user?.email}
              </span>
            </SettingRow>

            {/* Change Password */}
            <SettingRow icon="🔑" title="Password" description="Modifica la password del tuo account">
              <button 
                onClick={() => setShowPasswordModal(true)}
                className={`px-4 py-2 bg-white rounded-xl font-black text-[10px] sm:text-xs uppercase tracking-wider text-gray-900 ${buttonStyle}`}
              >
                Modifica
              </button>
            </SettingRow>

            {/* Logout all devices */}
            <SettingRow icon="📱" title="Sessioni Attive" description="Disconnetti da tutti i dispositivi">
              <button 
                onClick={handleLogoutAllDevices}
                className={`px-4 py-2 bg-orange-400 rounded-xl font-black text-[10px] sm:text-xs uppercase tracking-wider text-gray-900 ${buttonStyle}`}
              >
                Logout Ovunque
              </button>
            </SettingRow>

            {/* Delete Account */}
            <SettingRow icon="🗑️" title="Elimina Account" description="Cancella definitivamente il tuo account (GDPR)">
              <button 
                onClick={() => setShowDeleteModal(true)}
                className={`px-4 py-2 bg-red-500 rounded-xl font-black text-[10px] sm:text-xs uppercase tracking-wider text-white ${buttonStyle}`}
              >
                Elimina
              </button>
            </SettingRow>
          </div>
        </div>

        {/* 🔔 NOTIFICHE */}
        <div className={cardStyle}>
          <div className="bg-yellow-400 px-4 sm:px-6 py-3 sm:py-4 border-b-2 sm:border-b-3 border-gray-900 rounded-t-xl sm:rounded-t-2xl">
            <h2 className="font-black text-gray-900 uppercase tracking-widest text-xs sm:text-sm flex items-center gap-2">
              <span className="text-lg sm:text-xl">🔔</span> Centro Notifiche
            </h2>
          </div>
          <div className="p-4 sm:p-6 space-y-1">
            
            <SettingRow 
              icon="📬" 
              title="Candidature Ricevute" 
              description="Email quando qualcuno si candida ai tuoi progetti"
            >
              <Toggle 
                enabled={settings.notifica_candidature} 
                onChange={(val) => saveSetting('notifica_candidature', val)}
                disabled={saving}
              />
            </SettingRow>

            <SettingRow 
              icon="📋" 
              title="Esito Applicazioni" 
              description="Email quando le tue candidature vengono valutate"
            >
              <Toggle 
                enabled={settings.notifica_esito_applicazioni} 
                onChange={(val) => saveSetting('notifica_esito_applicazioni', val)}
                disabled={saving}
              />
            </SettingRow>

            <SettingRow 
              icon="💬" 
              title="Messaggi Team" 
              description="Email per messaggi importanti nelle chat di gruppo"
            >
              <Toggle 
                enabled={settings.notifica_messaggi_team} 
                onChange={(val) => saveSetting('notifica_messaggi_team', val)}
                disabled={saving}
              />
            </SettingRow>
          </div>
        </div>

        {/* 👁️ PRIVACY */}
        <div className={cardStyle}>
          <div className="bg-green-400 px-4 sm:px-6 py-3 sm:py-4 border-b-2 sm:border-b-3 border-gray-900 rounded-t-xl sm:rounded-t-2xl">
            <h2 className="font-black text-gray-900 uppercase tracking-widest text-xs sm:text-sm flex items-center gap-2">
              <span className="text-lg sm:text-xl">👁️</span> Privacy e Visibilità
            </h2>
          </div>
          <div className="p-4 sm:p-6 space-y-1">
            
            <SettingRow 
              icon="🟢" 
              title="Disponibilità" 
              description="Mostra se sei disponibile per nuovi progetti"
            >
              <div className="flex items-center gap-2">
                <span className={`text-[10px] font-black uppercase ${settings.disponibile_progetti ? 'text-green-600' : 'text-gray-500'}`}>
                  {settings.disponibile_progetti ? 'Disponibile' : 'Occupato'}
                </span>
                <Toggle 
                  enabled={settings.disponibile_progetti} 
                  onChange={(val) => saveSetting('disponibile_progetti', val)}
                  disabled={saving}
                />
              </div>
            </SettingRow>

            <SettingRow 
              icon="🔐" 
              title="Visibilità Profilo" 
              description="Chi può vedere il tuo profilo completo"
            >
              <select
                value={settings.visibilita_profilo}
                onChange={(e) => saveSetting('visibilita_profilo', e.target.value)}
                disabled={saving}
                className={`px-3 py-2 bg-white rounded-xl font-black text-[10px] sm:text-xs uppercase tracking-wider text-gray-900 cursor-pointer ${buttonStyle}`}
              >
                <option value="pubblico">🌍 Pubblico</option>
                <option value="solo_team">🔒 Solo Team</option>
              </select>
            </SettingRow>
          </div>
        </div>

        {/* 🎨 INTERFACCIA */}
        <div className={cardStyle}>
          <div className="bg-purple-400 px-4 sm:px-6 py-3 sm:py-4 border-b-2 sm:border-b-3 border-gray-900 rounded-t-xl sm:rounded-t-2xl">
            <h2 className="font-black text-gray-900 uppercase tracking-widest text-xs sm:text-sm flex items-center gap-2">
              <span className="text-lg sm:text-xl">🎨</span> Preferenze Interfaccia
            </h2>
          </div>
          <div className="p-4 sm:p-6 space-y-1">
            
            <SettingRow 
              icon="🌓" 
              title="Tema" 
              description="Scegli l'aspetto della piattaforma"
            >
              <div className="flex gap-1 sm:gap-2">
                {[
                  { value: 'light', icon: '☀️', label: 'Chiaro' },
                  { value: 'dark', icon: '🌙', label: 'Scuro' },
                  { value: 'system', icon: '💻', label: 'Auto' }
                ].map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => saveSetting('tema', opt.value)}
                    disabled={saving}
                    className={`px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg font-black text-[10px] sm:text-xs uppercase border-2 border-gray-900 transition-all ${
                      settings.tema === opt.value 
                        ? 'bg-gray-900 text-white shadow-none translate-x-[2px] translate-y-[2px]' 
                        : `bg-white text-gray-900 ${buttonStyle}`
                    }`}
                  >
                    <span className="text-sm sm:text-base">{opt.icon}</span>
                    <span className="hidden sm:inline ml-1">{opt.label}</span>
                  </button>
                ))}
              </div>
            </SettingRow>

            <SettingRow 
              icon="🌐" 
              title="Lingua" 
              description="Lingua dell'interfaccia"
            >
              <select
                value={settings.lingua}
                onChange={(e) => saveSetting('lingua', e.target.value)}
                disabled={saving}
                className={`px-3 py-2 bg-white rounded-xl font-black text-[10px] sm:text-xs uppercase tracking-wider text-gray-900 cursor-pointer ${buttonStyle}`}
              >
                <option value="it">🇮🇹 Italiano</option>
                <option value="en">🇬🇧 English</option>
              </select>
            </SettingRow>
          </div>
        </div>

        {/* ℹ️ INFO */}
        <div className={`${cardStyle} p-4 sm:p-6 bg-gray-100`}>
          <div className="flex items-center gap-3">
            <span className="text-2xl sm:text-3xl">ℹ️</span>
            <div>
              <p className="font-black text-gray-900 text-sm sm:text-base uppercase">StudentUP</p>
              <p className="text-[10px] sm:text-xs text-gray-600 font-bold">Versione 1.0.0 • Made with ❤️ by Eduardo</p>
            </div>
          </div>
        </div>

      </div>

      {/* MODAL: Cambio Password */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className={`${cardStyle} w-full max-w-md p-4 sm:p-6 animate-in zoom-in-95`}>
            <div className="flex items-center justify-between mb-4 sm:mb-6">
              <h3 className="font-black text-gray-900 uppercase tracking-wider text-sm sm:text-lg flex items-center gap-2">
                <span className="text-xl sm:text-2xl">🔑</span> Cambia Password
              </h3>
              <button 
                onClick={() => setShowPasswordModal(false)}
                className="w-8 h-8 sm:w-10 sm:h-10 bg-gray-200 rounded-full flex items-center justify-center font-black text-gray-900 hover:bg-gray-300 transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 sm:space-y-4">
              <div>
                <label className="text-[10px] sm:text-xs font-black text-gray-700 uppercase tracking-wider mb-1 block">Nuova Password</label>
                <input
                  type="password"
                  value={passwordData.new}
                  onChange={(e) => setPasswordData({ ...passwordData, new: e.target.value })}
                  placeholder="Minimo 8 caratteri"
                  className={inputStyle}
                />
              </div>
              <div>
                <label className="text-[10px] sm:text-xs font-black text-gray-700 uppercase tracking-wider mb-1 block">Conferma Password</label>
                <input
                  type="password"
                  value={passwordData.confirm}
                  onChange={(e) => setPasswordData({ ...passwordData, confirm: e.target.value })}
                  placeholder="Ripeti la password"
                  className={inputStyle}
                />
              </div>

              <div className="flex gap-2 sm:gap-3 pt-2">
                <button
                  onClick={() => setShowPasswordModal(false)}
                  className={`flex-1 px-4 py-2.5 sm:py-3 bg-gray-200 rounded-xl font-black text-xs sm:text-sm uppercase tracking-wider text-gray-900 ${buttonStyle}`}
                >
                  Annulla
                </button>
                <button
                  onClick={handleChangePassword}
                  disabled={changingPassword || !passwordData.new || !passwordData.confirm}
                  className={`flex-1 px-4 py-2.5 sm:py-3 bg-green-400 rounded-xl font-black text-xs sm:text-sm uppercase tracking-wider text-gray-900 disabled:opacity-50 ${buttonStyle}`}
                >
                  {changingPassword ? '⏳' : '✅'} Salva
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Elimina Account */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className={`${cardStyle} w-full max-w-md p-4 sm:p-6 animate-in zoom-in-95`}>
            <div className="text-center mb-4 sm:mb-6">
              <span className="text-5xl sm:text-6xl block mb-3">⚠️</span>
              <h3 className="font-black text-gray-900 uppercase tracking-wider text-lg sm:text-xl">
                Eliminare l'account?
              </h3>
              <p className="text-xs sm:text-sm text-gray-600 font-bold mt-2">
                Questa azione è <span className="text-red-500 font-black">IRREVERSIBILE</span>. 
                Tutti i tuoi dati, progetti e candidature verranno eliminati definitivamente.
              </p>
            </div>

            <div className="space-y-3 sm:space-y-4">
              <div>
                <label className="text-[10px] sm:text-xs font-black text-gray-700 uppercase tracking-wider mb-1 block">
                  Scrivi "ELIMINA" per confermare
                </label>
                <input
                  type="text"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value.toUpperCase())}
                  placeholder="ELIMINA"
                  className={`${inputStyle} ${deleteConfirmText === 'ELIMINA' ? 'border-red-500 bg-red-50' : ''}`}
                />
              </div>

              <div className="flex gap-2 sm:gap-3 pt-2">
                <button
                  onClick={() => {
                    setShowDeleteModal(false)
                    setDeleteConfirmText('')
                  }}
                  className={`flex-1 px-4 py-2.5 sm:py-3 bg-gray-200 rounded-xl font-black text-xs sm:text-sm uppercase tracking-wider text-gray-900 ${buttonStyle}`}
                >
                  Annulla
                </button>
                <button
                  onClick={handleDeleteAccount}
                  disabled={deleting || deleteConfirmText !== 'ELIMINA'}
                  className={`flex-1 px-4 py-2.5 sm:py-3 bg-red-500 rounded-xl font-black text-xs sm:text-sm uppercase tracking-wider text-white disabled:opacity-50 ${buttonStyle}`}
                >
                  {deleting ? '⏳ Eliminazione...' : '🗑️ Elimina'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}