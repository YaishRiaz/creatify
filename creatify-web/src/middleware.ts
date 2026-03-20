import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

function applySecurityHeaders(res: NextResponse, supabaseUrl: string) {
  res.headers.set('X-Frame-Options', 'DENY')
  res.headers.set('X-Content-Type-Options', 'nosniff')
  res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  res.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
  res.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload')
  res.headers.set(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https:",
      `connect-src 'self' ${supabaseUrl} https://api.apify.com https://www.googleapis.com`,
      "font-src 'self' https://fonts.gstatic.com",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join('; ')
  )
}

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
  applySecurityHeaders(res, supabaseUrl)

  const { pathname } = req.nextUrl

  // Get token from cookie
  const token = req.cookies.get('sb-access-token')?.value
    || req.cookies.get(
      `sb-${supabaseUrl.split('//')[1]?.split('.')[0]}-auth-token`
    )?.value

  // Protected routes — redirect to login if no session token
  const protectedPaths = ['/brand', '/creator', '/admin']
  const isProtected = protectedPaths.some(p => pathname.startsWith(p))

  if (isProtected && !token) {
    return NextResponse.redirect(new URL('/auth/login', req.url))
  }

  return res
}

export const config = {
  matcher: [
    '/brand/:path*',
    '/creator/:path*',
    '/admin/:path*',
  ],
}
