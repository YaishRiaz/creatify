import { createBrowserClient } from '@supabase/ssr'

export function getSupabaseClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

// Keep named export for backwards compatibility
export const supabase = {
  auth: {
    getSession: () => getSupabaseClient().auth.getSession(),
    signInWithPassword: (creds: { email: string; password: string }) =>
      getSupabaseClient().auth.signInWithPassword(creds),
    signUp: (creds: Parameters<ReturnType<typeof getSupabaseClient>['auth']['signUp']>[0]) =>
      getSupabaseClient().auth.signUp(creds),
    signOut: () => getSupabaseClient().auth.signOut(),
    onAuthStateChange: (callback: Parameters<ReturnType<typeof getSupabaseClient>['auth']['onAuthStateChange']>[0]) =>
      getSupabaseClient().auth.onAuthStateChange(callback),
  },
  from: (table: string) => getSupabaseClient().from(table),
}
