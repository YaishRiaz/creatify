import { createServerClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function proxy(req: NextRequest) {
  const res = NextResponse.next()

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

  const { data: { session } } = await supabase.auth.getSession()

  const { pathname } = req.nextUrl

  // Not logged in — block protected routes
  if (!session) {
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
    session &&
    (pathname.startsWith('/auth/login') || pathname.startsWith('/auth/signup'))
  ) {
    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', session.user.id)
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
