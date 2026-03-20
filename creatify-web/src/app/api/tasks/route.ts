import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'

export async function POST(req: NextRequest) {
  const supabase = createServerClient()
  const body = await req.json()

  const { data, error } = await supabase
    .from('tasks')
    .insert(body)
    .select()
    .single()

  if (error) {
    // Handle unique constraint (already accepted)
    if (error.code === '23505') {
      return NextResponse.json(
        { error: 'You have already accepted this campaign' },
        { status: 409 }
      )
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ data }, { status: 201 })
}
