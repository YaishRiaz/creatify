export const runtime = 'edge'

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { getAuthUser } from '@/lib/auth-guard'
import { checkRateLimit } from '@/lib/rate-limit'

export async function POST(req: NextRequest) {
  // Auth required
  const user = await getAuthUser(req)
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Rate limit: 3 payout requests per user per hour (prevents wallet draining abuse)
  const { allowed, resetMs } = checkRateLimit(`payout:${user.id}`, 3, 60 * 60_000)
  if (!allowed) {
    return NextResponse.json(
      { error: 'Too many payout requests. Please wait before trying again.' },
      { status: 429, headers: { 'Retry-After': String(Math.ceil(resetMs / 1000)) } }
    )
  }

  const supabase = createServerClient()

  // Resolve creator_id from the authenticated user's session — NEVER from the request body.
  // This prevents IDOR where an attacker submits another creator's ID.
  const { data: profile } = await supabase
    .from('creator_profiles')
    .select('id, wallet_balance')
    .eq('user_id', user.id)
    .single()

  if (!profile) {
    return NextResponse.json({ error: 'Creator profile not found' }, { status: 403 })
  }

  const body = await req.json()
  const { amount, bank_name, account_number, account_name } = body

  // Input validation
  const parsedAmount = Number(amount)
  if (!parsedAmount || parsedAmount <= 0 || !isFinite(parsedAmount)) {
    return NextResponse.json({ error: 'Invalid amount' }, { status: 400 })
  }
  if (parsedAmount < 500) {
    return NextResponse.json({ error: 'Minimum cashout is LKR 500' }, { status: 400 })
  }
  if (!bank_name || String(bank_name).trim().length < 2) {
    return NextResponse.json({ error: 'Bank name is required' }, { status: 400 })
  }
  if (!account_number || String(account_number).trim().length < 4) {
    return NextResponse.json({ error: 'Account number is required' }, { status: 400 })
  }
  if (!account_name || String(account_name).trim().length < 2) {
    return NextResponse.json({ error: 'Account holder name is required' }, { status: 400 })
  }

  if (profile.wallet_balance < parsedAmount) {
    return NextResponse.json({ error: 'Insufficient wallet balance' }, { status: 400 })
  }

  // Create payout record
  const { data: payout, error: payoutError } = await supabase
    .from('payouts')
    .insert({
      creator_id: profile.id, // from session — never from body
      amount: parsedAmount,
      status: 'pending',
      bank_name: String(bank_name).trim(),
      account_number: String(account_number).trim(),
      account_name: String(account_name).trim(),
    })
    .select()
    .single()

  if (payoutError) {
    return NextResponse.json({ error: 'Failed to create payout request' }, { status: 500 })
  }

  // Deduct from wallet
  await supabase
    .from('creator_profiles')
    .update({
      wallet_balance: Math.round((profile.wallet_balance - parsedAmount) * 100) / 100,
    })
    .eq('id', profile.id)

  return NextResponse.json({ data: payout }, { status: 201 })
}
