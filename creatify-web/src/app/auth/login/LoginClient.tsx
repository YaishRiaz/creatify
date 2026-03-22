'use client'

export const dynamic = 'force-dynamic'

import { useState } from 'react'
import Link from 'next/link'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import { getSupabaseClient } from '@/lib/supabase'

export default function LoginClient() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const supabase = getSupabaseClient()

      // Step 1: Sign in with Supabase Auth
      const { data: authData, error: authError } =
        await supabase.auth.signInWithPassword({
          email,
          password,
        })

      if (authError) {
        if (authError.message.includes('Invalid login credentials')) {
          setError('Incorrect email or password.')
        } else if (authError.message.includes('Email not confirmed')) {
          setError('Please verify your email before logging in.')
        } else {
          setError(authError.message)
        }
        setLoading(false)
        return
      }

      if (!authData.user) {
        setError('Login failed. Please try again.')
        setLoading(false)
        return
      }

      // Step 2: Get user role from public.users table
      const { data: userData, error: userError } =
        await supabase
          .from('users')
          .select('role')
          .eq('id', authData.user.id)
          .single()

      if (userError || !userData) {
        // Fallback: check user metadata
        const role = authData.user.user_metadata?.role
        if (role === 'brand') {
          window.location.href = '/brand/dashboard'
        } else if (role === 'admin') {
          window.location.href = '/admin'
        } else {
          window.location.href = '/creator/dashboard'
        }
        return
      }

      // Step 3: Redirect based on role
      // Use window.location.href for hard redirect
      // This ensures the session cookie is set before navigating
      if (userData.role === 'brand') {
        window.location.href = '/brand/dashboard'
      } else if (userData.role === 'admin') {
        window.location.href = '/admin'
      } else {
        window.location.href = '/creator/dashboard'
      }

    } catch (err) {
      console.error('Login error:', err)
      setError('Something went wrong. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-md bg-[#111111] border border-zinc-800 p-10">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/"
            className="font-syne text-xl font-extrabold text-[#6C47FF] block mb-6"
          >
            Creatify
          </Link>
          <h1 className="font-syne font-bold text-3xl text-white mb-1">
            Welcome back.
          </h1>
          <p className="font-sans text-sm text-zinc-400">
            Sign in to your account
          </p>
        </div>

        <form onSubmit={handleLogin} className="flex flex-col gap-5">
          {/* Email */}
          <div>
            <label className="block text-xs text-zinc-400 uppercase tracking-wider mb-1.5">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              required
              className="w-full bg-zinc-900 border border-zinc-800 focus:border-[#6C47FF] outline-none px-4 py-3 text-sm text-white rounded-none placeholder:text-zinc-600 transition-colors"
            />
          </div>

          {/* Password */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs text-zinc-400 uppercase tracking-wider">
                Password
              </label>
              <Link
                href="/auth/forgot-password"
                className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Your password"
                autoComplete="current-password"
                required
                className="w-full bg-zinc-900 border border-zinc-800 focus:border-[#6C47FF] outline-none px-4 py-3 pr-11 text-sm text-white rounded-none placeholder:text-zinc-600 transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Error */}
          {error && (
            <p className="text-red-400 text-sm border border-red-400/20 bg-red-400/5 px-4 py-3">
              {error}
            </p>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#6C47FF] text-white py-4 text-base font-semibold rounded-none hover:bg-[#5538ee] transition-colors disabled:opacity-60 disabled:cursor-not-allowed min-h-[52px] flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Signing in...
              </>
            ) : (
              'Sign In'
            )}
          </button>
        </form>

        {/* Footer */}
        <p className="font-sans text-center text-sm text-zinc-500 mt-6">
          Don&apos;t have an account?{' '}
          <Link href="/auth/signup" className="text-[#6C47FF] hover:text-white transition-colors">
            Sign up →
          </Link>
        </p>
      </div>
    </div>
  )
}
