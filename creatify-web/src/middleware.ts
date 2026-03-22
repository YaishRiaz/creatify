import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  // Middleware cannot read localStorage.
  // Auth protection is handled by each layout client-side
  // using the useUser hook and getSupabaseClient().
  return NextResponse.next()
}

export const config = {
  matcher: [],
}
