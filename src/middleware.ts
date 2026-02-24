// File: src/middleware.ts
import { type NextRequest } from 'next/server'

// Adatta questo percorso in base a dove hai salvato effettivamente proxy.ts
import { proxy } from '@/lib/supabase/proxy' 

export async function middleware(request: NextRequest) {
  return await proxy(request)
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}