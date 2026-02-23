import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  
  // Se l'utente è nuovo, lo mandiamo a completare il profilo
  // Se ha già un profilo, lo manderemo alla dashboard
  const next = searchParams.get('next') ?? '/onboarding'

  if (code) {
    // Inizializziamo il client server-side (ricordati l'await!)
    const supabase = await createClient()
    
    // Scambiamo il codice temporaneo con una sessione reale
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error) {
      // Tutto ok! Reindirizziamo l'utente
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // Se qualcosa va storto (es. link scaduto), torniamo al login con un messaggio di errore
  return NextResponse.redirect(`${origin}/login?error=auth-code-error`)
}