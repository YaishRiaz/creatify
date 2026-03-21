export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { getAuthUser } from '@/lib/auth-guard'
import { checkRateLimit } from '@/lib/rate-limit'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Auth required
  const user = await getAuthUser(req)
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Rate limit: 10 submissions per user per hour
  const { allowed, resetMs } = checkRateLimit(`submit:${user.id}`, 10, 60 * 60_000)
  if (!allowed) {
    return NextResponse.json(
      { error: 'Too many requests' },
      { status: 429, headers: { 'Retry-After': String(Math.ceil(resetMs / 1000)) } }
    )
  }

  const supabase = createServerClient()
  const { id } = await params

  // Verify this task belongs to the authenticated creator
  const { data: creatorProfile } = await supabase
    .from('creator_profiles')
    .select('id')
    .eq('user_id', user.id)
    .single()

  if (!creatorProfile) {
    return NextResponse.json({ error: 'Creator profile not found' }, { status: 403 })
  }

  const { data: existingTask } = await supabase
    .from('tasks')
    .select('id, creator_id, status')
    .eq('id', id)
    .single()

  if (!existingTask) {
    return NextResponse.json({ error: 'Task not found' }, { status: 404 })
  }

  if (existingTask.creator_id !== creatorProfile.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Only allow submission from accepted state
  if (!['accepted', 'submitted'].includes(existingTask.status)) {
    return NextResponse.json({ error: 'Task cannot be submitted in its current state' }, { status: 400 })
  }

  const body = await req.json()
  const { post_url, post_id, platform } = body

  // Validate post_url is a real URL
  if (!post_url) {
    return NextResponse.json({ error: 'post_url is required' }, { status: 400 })
  }
  try {
    new URL(post_url)
  } catch {
    return NextResponse.json({ error: 'Invalid post URL' }, { status: 400 })
  }

  const allowedPlatforms = ['youtube', 'tiktok', 'instagram', 'facebook']
  if (platform && !allowedPlatforms.includes(platform)) {
    return NextResponse.json({ error: 'Invalid platform' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('tasks')
    .update({
      post_url,
      post_id: post_id ?? null,
      platform,
      status: 'submitted',
      submitted_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: 'Failed to submit task' }, { status: 500 })
  }

  return NextResponse.json({ data })
}
