export const runtime = 'edge'

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { getAuthUser } from '@/lib/auth-guard'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'

// One-time bootstrap endpoint: promotes the first authenticated user to admin.
// Locked permanently once any admin exists — subsequent calls return 403.
export async function POST(req: NextRequest) {
  // Rate limit: 3 attempts per IP per 15 minutes
  const ip = getClientIp(req)
  const { allowed, resetMs } = checkRateLimit(`admin-setup:${ip}`, 3, 15 * 60_000)
  if (!allowed) {
    return NextResponse.json(
      { error: 'Too many requests' },
      { status: 429, headers: { 'Retry-After': String(Math.ceil(resetMs / 1000)) } }
    )
  }

  const user = await getAuthUser(req)
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServerClient()

  // Server-side check: refuse if any admin already exists
  const { count } = await supabase
    .from('users')
    .select('*', { count: 'exact', head: true })
    .eq('role', 'admin')

  if (count !== null && count > 0) {
    return NextResponse.json({ error: 'Admin setup is already complete' }, { status: 403 })
  }

  // Promote the calling user to admin via service role (bypasses RLS safely)
  const { error } = await supabase
    .from('users')
    .update({ role: 'admin' })
    .eq('id', user.id)

  if (error) {
    return NextResponse.json({ error: 'Failed to promote user' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}

// HEAD/GET — lets the setup page check admin count without auth
export async function GET() {
  const supabase = createServerClient()
  const { count } = await supabase
    .from('users')
    .select('*', { count: 'exact', head: true })
    .eq('role', 'admin')

  return NextResponse.json({ adminCount: count ?? 0 })
}
