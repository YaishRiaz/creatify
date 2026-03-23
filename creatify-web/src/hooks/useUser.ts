'use client'

import { useEffect, useState } from 'react'
import { getBrowserClient } from '@/lib/supabase-browser'
import type { User } from '@/types'

export function useUser() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = getBrowserClient()

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        const { data } = await supabase
          .from('users')
          .select('*')
          .eq('id', session.user.id)
          .maybeSingle()
        setUser(data || null)
      }
      setLoading(false)
    })

    const { data: { subscription } } =
      supabase.auth.onAuthStateChange(async (_, session) => {
        if (!session) {
          setUser(null)
          setLoading(false)
          return
        }
        const { data } = await supabase
          .from('users')
          .select('*')
          .eq('id', session.user.id)
          .maybeSingle()
        setUser(data || null)
        setLoading(false)
      })

    return () => subscription.unsubscribe()
  }, [])

  const signOut = async () => {
    await getBrowserClient().auth.signOut()
    window.location.href = '/'
  }

  return { user, loading, signOut }
}
