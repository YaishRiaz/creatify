export const runtime = 'edge'

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { getAuthUser } from '@/lib/auth-guard'
import { checkRateLimit } from '@/lib/rate-limit'

// Admin-only endpoint. Verifies session + admin role — no poll secret needed from browser.
export async function POST(req: NextRequest) {
  const user = await getAuthUser(req)
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Rate limit: 5 manual poll triggers per admin per hour
  const { allowed, resetMs } = checkRateLimit(`poll-trigger:${user.id}`, 5, 60 * 60_000)
  if (!allowed) {
    return NextResponse.json(
      { error: 'Too many requests' },
      { status: 429, headers: { 'Retry-After': String(Math.ceil(resetMs / 1000)) } }
    )
  }

  // Verify admin role from DB
  const supabase = createServerClient()
  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const res = await fetch(`${appUrl}/api/poll`, {
    method: 'POST',
    headers: {
      'x-poll-secret': process.env.POLL_SECRET!,
      'Content-Type': 'application/json',
    },
  })

  const data = await res.json()
  return NextResponse.json(data)
}
