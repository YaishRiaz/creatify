import { createBrowserClient } from '@supabase/auth-helpers-nextjs'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Singleton — all client components share one GoTrueClient instance
const browserClient = createBrowserClient(supabaseUrl, supabaseAnonKey)

export const createSupabaseClient = () => browserClient
