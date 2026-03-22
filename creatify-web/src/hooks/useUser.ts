'use client'

import { useEffect, useState } from 'react'
import { getSupabaseClient } from '@/lib/supabase-client'
import type { User } from '@/types'

export function useUser() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (typeof window === 'undefined') return

    let mounted = true
    const supabase = getSupabaseClient()

    const loadUser = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()

        if (!session?.user) {
          if (mounted) {
            setUser(null)
            setLoading(false)
          }
          return
        }

        const { data } = await supabase
          .from('users')
          .select('*')
          .eq('id', session.user.id)
          .single()

        if (mounted) {
          setUser(data || null)
          setLoading(false)
        }
      } catch (err) {
        console.error('useUser error:', err)
        if (mounted) setLoading(false)
      }
    }

    loadUser()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return

        if (event === 'SIGNED_OUT' || !session) {
          setUser(null)
          setLoading(false)
          return
        }

        if (session?.user) {
          const { data } = await supabase
            .from('users')
            .select('*')
            .eq('id', session.user.id)
            .single()
          if (mounted) {
            setUser(data || null)
            setLoading(false)
          }
        }
      }
    )

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  const signOut = async () => {
    const supabase = getSupabaseClient()
    await supabase.auth.signOut()
    localStorage.removeItem('creatify-auth-token')
    window.location.replace('/')
  }

  return { user, loading, signOut }
}
