import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const { searchParams, origin } = requestUrl
  const code = searchParams.get('code')
  
  // Se l'utente è nuovo, lo mandiamo a completare il profilo (o alla dashboard)
  const next = searchParams.get('next') ?? '/onboarding'

  if (code) {
    // Inizializziamo il client server-side
    const supabase = await createClient()
    
    // Scambiamo il codice temporaneo con una sessione reale
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error) {
      // ✅ Costruiamo l'URL di destinazione e aggiungiamo il segnale di successo
      const redirectUrl = new URL(next, origin)
      redirectUrl.searchParams.set('verified', 'true')
      
      return NextResponse.redirect(redirectUrl.toString())
    }
  }

  // Se qualcosa va storto (es. link scaduto), torniamo al login con un messaggio di errore
  return NextResponse.redirect(`${origin}/login?error=auth-code-error`)
}