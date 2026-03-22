export const runtime = 'edge'
export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'

export async function POST(req: NextRequest) {
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
    const {
      email,
      password,
      full_name,
      role,
      phone,
      company_name,
      industry,
      nic_number,
    } = body

    // Validate required fields
    if (!email || !password || !full_name || !role) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Block role elevation — admin accounts must be created via Supabase dashboard
    if (!['creator', 'brand'].includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
    }

    // Use ANON key for auth signup
    const supabaseAuth = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    // Service role client for DB operations
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    )

    // Step 1: Sign up with Supabase Auth (creates user in auth.users)
    const { data: authData, error: authError } = await supabaseAuth.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name,
          role,
          phone: phone || '',
        },
      },
    })

    if (authError) {
      console.error('Auth signup error:', authError)

      if (authError.message.toLowerCase().includes('already registered')) {
        return NextResponse.json(
          { error: 'An account with this email already exists. Please log in.' },
          { status: 400 }
        )
      }

      return NextResponse.json(
        { error: authError.message },
        { status: 400 }
      )
    }

    if (!authData.user) {
      return NextResponse.json(
        { error: 'Failed to create account. Please try again.' },
        { status: 500 }
      )
    }

    const userId = authData.user.id

    // Step 2: Create user record in public.users (upsert handles trigger race)
    const { error: userError } = await supabaseAdmin
      .from('users')
      .upsert({
        id: userId,
        email,
        full_name,
        role,
        phone: phone || null,
        is_verified: false,
        created_at: new Date().toISOString(),
      }, {
        onConflict: 'id',
      })

    if (userError) {
      console.error('User table error:', userError)
      // Don't block — auth user was created
    }

    // Step 3: Create role-specific profile
    if (role === 'brand') {
      const { error: brandError } = await supabaseAdmin
        .from('brand_profiles')
        .insert({
          user_id: userId,
          company_name: company_name || '',
          industry: industry || '',
        })

      if (brandError) {
        console.error('Brand profile error:', brandError)
      }
    }

    if (role === 'creator') {
      const { error: creatorError } = await supabaseAdmin
        .from('creator_profiles')
        .insert({
          user_id: userId,
          nic_number: nic_number || null,
          platforms: {},
          wallet_balance: 0,
          total_earned: 0,
          is_suspended: false,
        })

      if (creatorError) {
        console.error('Creator profile error:', creatorError)
      }
    }

    return NextResponse.json({
      success: true,
      userId,
      // If email confirmation is on, user needs to confirm before logging in
      requiresConfirmation: !authData.session,
    })
  } catch (error) {
    console.error('Signup unexpected error:', error)
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    )
  }
}
