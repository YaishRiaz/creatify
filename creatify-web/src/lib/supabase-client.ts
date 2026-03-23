import { getBrowserClient } from './supabase-browser'

export { getBrowserClient as getSupabaseClient }
export const supabase = {
  get auth() {
    return getBrowserClient().auth
  },
  from(table: string) {
    return getBrowserClient().from(table)
  },
}
