import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const adminClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { email, password, full_name, phone, role, company_name, industry, nic_number } = body

    // Create auth user with email pre-confirmed — no email sent
    const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })

    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 400 })
    }

    const uid = authData.user.id

    // Insert into public.users
    const { error: userError } = await adminClient.from('users').insert({
      id: uid,
      email,
      phone: phone || null,
      role,
      full_name,
      is_verified: false,
    })
    if (userError) {
      await adminClient.auth.admin.deleteUser(uid)
      return NextResponse.json({ error: userError.message }, { status: 400 })
    }

    // Insert profile row
    if (role === 'brand') {
      const { error } = await adminClient.from('brand_profiles').insert({
        user_id: uid,
        company_name,
        industry: industry || null,
      })
      if (error) {
        await adminClient.auth.admin.deleteUser(uid)
        return NextResponse.json({ error: error.message }, { status: 400 })
      }
    } else if (role === 'creator') {
      const { error } = await adminClient.from('creator_profiles').insert({
        user_id: uid,
        nic_number,
        platforms: {},
        wallet_balance: 0,
        total_earned: 0,
      })
      if (error) {
        await adminClient.auth.admin.deleteUser(uid)
        return NextResponse.json({ error: error.message }, { status: 400 })
      }
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
