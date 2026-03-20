export const runtime = 'edge'

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'

export async function POST(req: NextRequest) {
  const supabase = createServerClient()
  const body = await req.json()
  const { creator_id, amount, bank_name, account_number, account_name } = body

  // Verify creator has sufficient balance
  const { data: profile } = await supabase
    .from('creator_profiles')
    .select('wallet_balance')
    .eq('id', creator_id)
    .single()

  if (!profile || profile.wallet_balance < amount) {
    return NextResponse.json(
      { error: 'Insufficient wallet balance' },
      { status: 400 }
    )
  }

  if (amount < 500) {
    return NextResponse.json(
      { error: 'Minimum cashout is LKR 500' },
      { status: 400 }
    )
  }

  // Create payout record
  const { data: payout, error: payoutError } = await supabase
    .from('payouts')
    .insert({
      creator_id,
      amount,
      status: 'pending',
      bank_name,
      account_number,
      account_name,
    })
    .select()
    .single()

  if (payoutError) {
    return NextResponse.json({ error: payoutError.message }, { status: 500 })
  }

  // Deduct from wallet
  await supabase
    .from('creator_profiles')
    .update({
      wallet_balance:
        Math.round((profile.wallet_balance - amount) * 100) / 100,
    })
    .eq('id', creator_id)

  return NextResponse.json({ data: payout }, { status: 201 })
}
