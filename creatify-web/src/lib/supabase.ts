import { createClient } from '@supabase/supabase-js'
import { createBrowserClient } from '@supabase/auth-helpers-nextjs'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// For use outside of components
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// For use inside client components (handles cookies/session)
export const createSupabaseClient = () =>
  createBrowserClient(supabaseUrl, supabaseAnonKey)
