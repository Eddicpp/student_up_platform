import { type NextRequest } from 'next/server'
// Modifica il percorso qui sotto in base a dove si trova il tuo file proxy
import { proxy } from './lib/supabase/proxy' 

export async function middleware(request: NextRequest) {
  // Richiama la tua funzione proxy che fa tutto il lavoro sporco (Supabase + CSP)
  return await proxy(request)
}

// ⚠️ IMPORTANTE: Il matcher DEVE stare in questo file middleware.ts, 
// altrimenti Next.js non sa su quali pagine attivare il ponte.
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}