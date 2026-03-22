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
  const { pathname } = req.nextUrl

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  const projectRef = supabaseUrl
    .replace('https://', '')
    .replace('.supabase.co', '')
    .split('.')[0]

  // Check for Supabase auth token in cookies — try multiple possible cookie names
  const possibleCookieNames = [
    `sb-${projectRef}-auth-token`,
    `sb-${projectRef}-auth-token.0`,
    `sb-access-token`,
    `supabase-auth-token`,
  ]

  let hasSession = false

  for (const cookieName of possibleCookieNames) {
    const cookie = req.cookies.get(cookieName)
    if (cookie?.value) {
      hasSession = true
      break
    }
  }

  // Also check for any cookie that starts with sb- and contains auth-token
  if (!hasSession) {
    hasSession = req.cookies.getAll().some(
      c => c.name.includes('auth-token') && c.value.length > 0
    )
  }

  const isProtectedRoute =
    pathname.startsWith('/brand') ||
    pathname.startsWith('/creator') ||
    pathname.startsWith('/admin')

  const isAuthRoute =
    pathname.startsWith('/auth/login') ||
    pathname.startsWith('/auth/signup')

  // Not logged in trying to access protected route
  if (!hasSession && isProtectedRoute) {
    const loginUrl = new URL('/auth/login', req.url)
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Already logged in trying to access auth pages — let the page handle it
  // Don't redirect here to avoid loops
  if (hasSession && isAuthRoute) {
    const res = NextResponse.next()
    applySecurityHeaders(res, supabaseUrl)
    return res
  }

  const res = NextResponse.next()
  applySecurityHeaders(res, supabaseUrl)
  return res
}

export const config = {
  matcher: [
    '/brand/:path*',
    '/creator/:path*',
    '/admin/:path*',
    '/auth/login',
    '/auth/signup',
  ],
}
