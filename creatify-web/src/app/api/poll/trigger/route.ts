export const runtime = 'edge'

import { NextRequest, NextResponse } from 'next/server'

// Allows the admin settings page to trigger a poll cycle from the browser.
export async function POST(req: NextRequest) {
  const { secret } = await req.json()

  if (secret !== process.env.POLL_SECRET) {
    return NextResponse.json({ error: 'Invalid secret' }, { status: 401 })
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const pollUrl = `${appUrl}/api/poll`

  const res = await fetch(pollUrl, {
    method: 'POST',
    headers: {
      'x-poll-secret': process.env.POLL_SECRET!,
      'Content-Type': 'application/json',
    },
  })

  const data = await res.json()
  return NextResponse.json(data)
}
