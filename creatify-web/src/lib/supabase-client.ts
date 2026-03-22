import { createClient, SupabaseClient } from '@supabase/supabase-js'

const STORAGE_KEY = 'creatify-auth'

function createSupabaseClient(): SupabaseClient {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storageKey: STORAGE_KEY,
        flowType: 'implicit',
        storage: typeof window !== 'undefined'
          ? {
              getItem: (key: string) => {
                try {
                  return localStorage.getItem(key)
                } catch { return null }
              },
              setItem: (key: string, value: string) => {
                try {
                  localStorage.setItem(key, value)
                } catch {}
              },
              removeItem: (key: string) => {
                try {
                  localStorage.removeItem(key)
                } catch {}
              },
            }
          : undefined,
      }
    }
  )
}

// Global singleton — same instance everywhere
declare global {
  // eslint-disable-next-line no-var
  var supabaseClient: SupabaseClient | undefined
}

export function getSupabaseClient(): SupabaseClient {
  if (typeof window === 'undefined') {
    // Server side — fresh client, no persistence needed
    return createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        }
      }
    )
  }

  // Client side — use global singleton
  // globalThis persists across module re-evaluations
  if (!globalThis.supabaseClient) {
    globalThis.supabaseClient = createSupabaseClient()
  }

  return globalThis.supabaseClient
}
