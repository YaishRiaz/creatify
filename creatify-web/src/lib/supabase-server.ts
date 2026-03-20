import { createClient } from '@supabase/supabase-js'

// Server-side client with service role key.
// NEVER import this in client components.
// Only use in /app/api/* route handlers.
export function createServerClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!

  if (!url || !key) {
    throw new Error('Missing Supabase environment variables')
  }

  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}
