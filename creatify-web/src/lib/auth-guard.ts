// Lightweight JWT verification helper for API routes.
// Uses the anon key (not service role) — purely for token validation.
// DB operations should still use createServerClient() from supabase-server.ts.

import { createClient } from '@supabase/supabase-js'
import type { NextRequest } from 'next/server'
import type { User } from '@supabase/supabase-js'

function getAnonClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

/**
 * Extract and verify the Supabase JWT from the Authorization header.
 * Returns the verified User or null if missing / invalid.
 */
export async function getAuthUser(req: NextRequest): Promise<User | null> {
  const token = req.headers.get('Authorization')?.replace('Bearer ', '')
  if (!token) return null

  const { data: { user }, error } = await getAnonClient().auth.getUser(token)
  if (error || !user) return null
  return user
}
