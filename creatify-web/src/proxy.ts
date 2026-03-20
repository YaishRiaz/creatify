import { createServerClient } from '@supabase/auth-helpers-nextjs'
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

export async function proxy(req: NextRequest) {
  const res = NextResponse.next()

  // Apply security headers to every response
  applySecurityHeaders(res, process.env.NEXT_PUBLIC_SUPABASE_URL ?? '')

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return req.cookies.get(name)?.value
        },
        set(name: string, value: string) {
          req.cookies.set(name, value)
          res.cookies.set(name, value)
        },
        remove(name: string) {
          req.cookies.delete(name)
          res.cookies.delete(name)
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  const { pathname } = req.nextUrl

  // Not logged in — block protected routes
  if (!user) {
    if (
      pathname.startsWith('/brand') ||
      pathname.startsWith('/creator') ||
      pathname.startsWith('/admin')
    ) {
      return NextResponse.redirect(new URL('/auth/login', req.url))
    }
  }

  // Logged in — redirect away from auth pages based on role
  if (
    user &&
    (pathname.startsWith('/auth/login') || pathname.startsWith('/auth/signup'))
  ) {
    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (userData?.role === 'brand') {
      return NextResponse.redirect(new URL('/brand/dashboard', req.url))
    }
    if (userData?.role === 'creator') {
      return NextResponse.redirect(new URL('/creator/dashboard', req.url))
    }
    if (userData?.role === 'admin') {
      return NextResponse.redirect(new URL('/admin/dashboard', req.url))
    }
  }

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
