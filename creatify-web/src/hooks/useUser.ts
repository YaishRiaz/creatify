'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import type { User } from '@/types'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

export function useUser() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // useEffect only runs in browser, never on server
    // This makes it safe for static generation
    let isMounted = true
    const supabase = getSupabase()

    const getUser = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()

        if (session?.user && isMounted) {
          const { data } = await supabase
            .from('users')
            .select('id, email, full_name, role, phone, is_verified, created_at')
            .eq('id', session.user.id)
            .single()
          if (isMounted) setUser(data)
        }
      } catch (e) {
        console.error('useUser error:', e)
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    getUser()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (!isMounted) return
        if (session?.user) {
          const { data } = await supabase
            .from('users')
            .select('id, email, full_name, role, phone, is_verified, created_at')
            .eq('id', session.user.id)
            .single()
          if (isMounted) setUser(data)
        } else {
          if (isMounted) setUser(null)
        }
        if (isMounted) setLoading(false)
      }
    )

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [])

  return { user, loading }
}
