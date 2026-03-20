import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = createServerClient()
  const { post_url, post_id, platform } = await req.json()
  const { id } = await params

  const { data, error } = await supabase
    .from('tasks')
    .update({
      post_url,
      post_id,
      platform,
      status: 'submitted',
      submitted_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ data })
}
