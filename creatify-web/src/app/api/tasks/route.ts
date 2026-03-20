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

  // Rate limit: 20 task accepts per user per hour
  const { allowed, resetMs } = checkRateLimit(`tasks:${user.id}`, 20, 60 * 60_000)
  if (!allowed) {
    return NextResponse.json(
      { error: 'Too many requests' },
      { status: 429, headers: { 'Retry-After': String(Math.ceil(resetMs / 1000)) } }
    )
  }

  const supabase = createServerClient()

  // Look up the creator_profile for this user — never trust creator_id from the body
  const { data: creatorProfile } = await supabase
    .from('creator_profiles')
    .select('id')
    .eq('user_id', user.id)
    .single()

  if (!creatorProfile) {
    return NextResponse.json({ error: 'Creator profile not found' }, { status: 403 })
  }

  const body = await req.json()

  // Whitelist only the fields a creator is allowed to supply
  const { campaign_id } = body
  if (!campaign_id) {
    return NextResponse.json({ error: 'campaign_id is required' }, { status: 400 })
  }

  // Verify the campaign is still active before accepting
  const { data: campaign } = await supabase
    .from('campaigns')
    .select('id, status')
    .eq('id', campaign_id)
    .single()

  if (!campaign || campaign.status !== 'active') {
    return NextResponse.json({ error: 'Campaign is not available' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('tasks')
    .insert({
      campaign_id,
      creator_id: creatorProfile.id, // from session — not user-supplied
      status: 'accepted',
    })
    .select()
    .single()

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json(
        { error: 'You have already accepted this campaign' },
        { status: 409 }
      )
    }
    return NextResponse.json({ error: 'Failed to accept campaign' }, { status: 500 })
  }

  return NextResponse.json({ data }, { status: 201 })
}
