import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Single export — used everywhere client-side
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Keep this for backwards compatibility
export function getSupabaseClient() {
  return supabase
}
