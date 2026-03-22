'use client'

export const dynamic = 'force-dynamic'

import { useState } from 'react'
import Link from 'next/link'
import { createBrowserClient } from '@supabase/ssr'
import { Eye, EyeOff } from 'lucide-react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    })

    if (authError) {
      setError(
        authError.message.includes('Invalid login credentials')
          ? 'Incorrect email or password.'
          : authError.message
      )
      setLoading(false)
      return
    }

    if (!data.session) {
      setError('Login failed. Please try again.')
      setLoading(false)
      return
    }

    const role = data.user.user_metadata?.role || 'creator'

    if (role === 'brand') {
      window.location.href = '/brand/dashboard'
    } else if (role === 'admin') {
      window.location.href = '/admin'
    } else {
      window.location.href = '/creator/dashboard'
    }
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-[#111111] border border-zinc-800 p-8 md:p-10">

        <Link href="/" className="text-[#6C47FF] font-black text-xl block mb-8">
          Creatify
        </Link>

        <h1 className="text-3xl font-black text-white mb-1">
          Welcome back.
        </h1>
        <p className="text-zinc-400 mb-8">
          Sign in to your account
        </p>

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-xs uppercase tracking-wider text-zinc-400 mb-2">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              className="w-full bg-zinc-900 border border-zinc-800 text-white px-4 py-3 rounded-none focus:outline-none focus:border-[#6C47FF] transition-colors"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs uppercase tracking-wider text-zinc-400">
                Password
              </label>
              <Link href="/auth/forgot-password"
                className="text-xs text-zinc-500 hover:text-white transition-colors">
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Your password"
                required
                className="w-full bg-zinc-900 border border-zinc-800 text-white px-4 py-3 pr-12 rounded-none focus:outline-none focus:border-[#6C47FF] transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white transition-colors"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {error && (
            <p className="text-red-400 text-sm">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#6C47FF] text-white py-4 font-semibold hover:bg-[#5538ee] transition-colors rounded-none disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <p className="text-zinc-500 text-sm text-center mt-6">
          Don&apos;t have an account?{' '}
          <Link href="/auth/signup"
            className="text-[#6C47FF] hover:text-white transition-colors">
            Sign up →
          </Link>
        </p>
      </div>
    </div>
  )
}
