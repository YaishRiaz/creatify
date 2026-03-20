'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Syne } from 'next/font/google'
import { createSupabaseClient } from '@/lib/supabase'

const syne = Syne({ subsets: ['latin'], weight: ['700', '800'] })

export default function AdminSetupPage() {
  const [adminCount, setAdminCount] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function checkAdmins() {
      const supabase = createSupabaseClient()
      const { count } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'admin')
      setAdminCount(count ?? 0)
      setLoading(false)
    }
    checkAdmins()
  }, [])

  async function handlePromote() {
    setSubmitting(true)
    setError(null)
    const supabase = createSupabaseClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user) {
      setError('You must be logged in to perform this action.')
      setSubmitting(false)
      return
    }
    const { error: updateError } = await supabase
      .from('users')
      .update({ role: 'admin' })
      .eq('id', session.user.id)
    if (updateError) {
      setError(updateError.message)
    } else {
      setSuccess(true)
      setAdminCount(1)
    }
    setSubmitting(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-[#6C47FF] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center px-4">
      <div className="bg-[#111111] border border-zinc-800 p-10 max-w-md w-full text-center">
        <h1 className={`${syne.className} text-2xl font-bold text-white mb-2`}>Admin Setup</h1>

        {adminCount !== null && adminCount > 0 && !success ? (
          <>
            <div className="w-12 h-12 bg-green-500/10 flex items-center justify-center mx-auto mb-4">
              <span className="text-green-400 text-2xl">✓</span>
            </div>
            <p className="text-green-400 font-medium text-lg mb-2">Setup Complete</p>
            <p className="text-zinc-500 text-sm mb-6">
              {adminCount} admin account{adminCount !== 1 ? 's' : ''} already exist{adminCount === 1 ? 's' : ''} on this platform.
            </p>
            <Link
              href="/admin"
              className="inline-block bg-[#6C47FF] hover:bg-[#6C47FF]/90 text-white px-6 py-2.5 text-sm font-medium transition-colors"
            >
              Go to Admin Panel →
            </Link>
          </>
        ) : success ? (
          <>
            <div className="w-12 h-12 bg-green-500/10 flex items-center justify-center mx-auto mb-4">
              <span className="text-green-400 text-2xl">✓</span>
            </div>
            <p className="text-green-400 font-medium text-lg mb-2">You are now an Admin</p>
            <p className="text-zinc-500 text-sm mb-6">Your account has been promoted to administrator.</p>
            <Link
              href="/admin"
              className="inline-block bg-[#6C47FF] hover:bg-[#6C47FF]/90 text-white px-6 py-2.5 text-sm font-medium transition-colors"
            >
              Go to Admin Panel →
            </Link>
          </>
        ) : (
          <>
            <p className="text-zinc-400 text-sm mb-6">
              No admin accounts exist yet. Promote your currently logged-in account to administrator to access the admin panel.
            </p>
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm px-4 py-3 mb-4">
                {error}
              </div>
            )}
            <button
              onClick={handlePromote}
              disabled={submitting}
              className="w-full bg-[#6C47FF] hover:bg-[#6C47FF]/90 text-white px-6 py-2.5 text-sm font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {submitting && (
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              )}
              Promote My Account to Admin
            </button>
            <p className="text-zinc-600 text-xs mt-4">
              This page will be inaccessible once an admin exists.
            </p>
          </>
        )}
      </div>
    </div>
  )
}
