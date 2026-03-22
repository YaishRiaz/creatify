export const runtime = 'edge'
export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'

// Allowed roles users can self-register as. Admin must be set via Supabase dashboard.
const ALLOWED_ROLES = ['creator', 'brand'] as const
type AllowedRole = (typeof ALLOWED_ROLES)[number]

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

function isValidPassword(password: string): boolean {
  // Min 8 chars, at least one letter and one number
  return password.length >= 8 && /[a-zA-Z]/.test(password) && /[0-9]/.test(password)
}

export async function POST(req: NextRequest) {
  const adminClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  // Rate limit: 5 signups per IP per 10 minutes
  const ip = getClientIp(req)
  const { allowed, resetMs } = checkRateLimit(`signup:${ip}`, 5, 10 * 60 * 1000)
  if (!allowed) {
    return NextResponse.json(
      { error: 'Too many signup attempts. Please try again later.' },
      {
        status: 429,
        headers: { 'Retry-After': String(Math.ceil(resetMs / 1000)) },
      }
    )
  }

  try {
    const body = await req.json()
    const { email, password, full_name, phone, role, company_name, industry, nic_number } = body

    // --- Input validation ---
    if (!email || !isValidEmail(email)) {
      return NextResponse.json({ error: 'Invalid email address' }, { status: 400 })
    }
    if (!password || !isValidPassword(password)) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters and contain a letter and a number' },
        { status: 400 }
      )
    }
    if (!full_name || String(full_name).trim().length < 2) {
      return NextResponse.json({ error: 'Full name is required' }, { status: 400 })
    }
    // Block role elevation — admin accounts must be created via Supabase dashboard
    if (!role || !ALLOWED_ROLES.includes(role as AllowedRole)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
    }
    if (role === 'brand' && !company_name) {
      return NextResponse.json({ error: 'Company name is required for brand accounts' }, { status: 400 })
    }
    if (role === 'creator' && !nic_number) {
      return NextResponse.json({ error: 'NIC number is required for creator accounts' }, { status: 400 })
    }

    // Create auth user with metadata so the DB trigger can create the users row
    const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
      email: email.toLowerCase().trim(),
      password,
      email_confirm: true, // pre-confirm so client can sign in immediately
      user_metadata: {
        full_name: String(full_name).trim(),
        role: role as AllowedRole,
        phone: phone?.trim() || '',
      },
    })

    if (authError) {
      const msg = authError.message.includes('already registered')
        ? 'An account with this email already exists'
        : 'Failed to create account'
      return NextResponse.json({ error: msg }, { status: 400 })
    }

    const uid = authData.user.id

    // Update phone separately in case trigger doesn't pick it up
    if (phone?.trim()) {
      await adminClient.from('users').update({ phone: phone.trim() }).eq('id', uid)
    }

    // Insert role-specific profile
    if (role === 'brand') {
      const { error } = await adminClient.from('brand_profiles').insert({
        user_id: uid,
        company_name: String(company_name).trim(),
        industry: industry?.trim() || null,
      })
      if (error) {
        console.error('Brand profile error:', error)
        await adminClient.auth.admin.deleteUser(uid)
        return NextResponse.json({ error: 'Failed to create brand profile' }, { status: 400 })
      }
    } else if (role === 'creator') {
      const { error } = await adminClient.from('creator_profiles').insert({
        user_id: uid,
        nic_number: String(nic_number).trim(),
        platforms: {},
        wallet_balance: 0,
        total_earned: 0,
      })
      if (error) {
        console.error('Creator profile error:', error)
        await adminClient.auth.admin.deleteUser(uid)
        return NextResponse.json({ error: 'Failed to create creator profile' }, { status: 400 })
      }
    }

    return NextResponse.json({ success: true, userId: uid })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
