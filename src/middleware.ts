// File: src/middleware.ts
import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { proxy } from '@/lib/supabase/proxy' 

export async function middleware(request: NextRequest) {
  // 1. Lasciamo che il tuo proxy faccia il suo lavoro di base (aggiornare i cookie)
  const response = await proxy(request)

  // 2. Definisci le tue "Zone Private". 
  // Aggiungi qui tutte le cartelle che vuoi proteggere!
  const isProtectedRoute = request.nextUrl.pathname.startsWith('/dashboard') || 
                           request.nextUrl.pathname.startsWith('/settings')

  // Se l'utente sta visitando una pagina pubblica (es. la home o il /login), lo facciamo passare
  if (!isProtectedRoute) {
    return response
  }

  // 3. Se sta entrando in una zona privata, controlliamo i documenti
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  // 4. IL BUTTAFUORI: È una zona privata ma non hai fatto il login? Via! 🛑
  if (!user) {
    // Reindirizza l'utente alla pagina di login
    const loginUrl = new URL('/login', request.url)
    return NextResponse.redirect(loginUrl)
  }

  // Se è tutto ok, l'utente entra nella pagina protetta
  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}