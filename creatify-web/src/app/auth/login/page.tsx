'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Syne, DM_Sans } from 'next/font/google'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import { createSupabaseClient } from '@/lib/supabase'

const syne = Syne({ subsets: ['latin'], weight: ['700', '800'] })
const dmSans = DM_Sans({ subsets: ['latin'] })

const schema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
})

type FormData = z.infer<typeof schema>

function mapAuthError(msg: string): string {
  const lower = msg.toLowerCase()
  if (lower.includes('invalid login credentials') || lower.includes('invalid credentials')) {
    return 'Incorrect email or password.'
  }
  if (lower.includes('email not confirmed')) {
    return 'Please verify your email before logging in.'
  }
  if (lower.includes('too many requests')) {
    return 'Too many attempts. Please wait a moment and try again.'
  }
  if (lower.includes('failed to fetch') || lower.includes('networkerror')) {
    return 'Something went wrong. Please try again.'
  }
  return msg || 'Something went wrong. Please try again.'
}

export default function LoginPage() {
  const router = useRouter()
  const supabase = useMemo(() => createSupabaseClient(), [])
  const [serverError, setServerError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) })

  const onSubmit = async (data: FormData) => {
    setServerError(null)

    const { data: authData, error: signInError } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    })

    if (signInError) {
      setServerError(mapAuthError(signInError.message))
      return
    }

    if (!authData.user) {
      setServerError('Something went wrong. Please try again.')
      return
    }

    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', authData.user.id)
      .single()

    if (userData?.role === 'brand') router.push('/brand/dashboard')
    else if (userData?.role === 'creator') router.push('/creator/dashboard')
    else if (userData?.role === 'admin') router.push('/admin/dashboard')
    else {
      // Account exists in auth but has no users row (e.g. created via Supabase dashboard)
      setServerError('Account setup is incomplete. Please sign up to create your profile.')
    }
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-md bg-[#111111] border border-zinc-800 p-10">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/"
            className={`${syne.className} text-xl font-extrabold text-[#6C47FF] block mb-6`}
          >
            Creatify
          </Link>
          <h1 className={`${syne.className} font-bold text-3xl text-white mb-1`}>
            Welcome back.
          </h1>
          <p className={`${dmSans.className} text-sm text-zinc-400`}>
            Sign in to your account
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
          {/* Email */}
          <div>
            <label className="block text-xs text-zinc-400 uppercase tracking-wider mb-1.5">
              Email
            </label>
            <input
              {...register('email')}
              type="email"
              placeholder="you@example.com"
              autoComplete="email"
              className="w-full bg-zinc-900 border border-zinc-800 focus:border-[#6C47FF] outline-none px-4 py-3 text-sm text-white rounded-none placeholder:text-zinc-600 transition-colors"
            />
            {errors.email && (
              <p className="text-red-400 text-sm mt-1">{errors.email.message}</p>
            )}
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
                {...register('password')}
                type={showPassword ? 'text' : 'password'}
                placeholder="Your password"
                autoComplete="current-password"
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
            {errors.password && (
              <p className="text-red-400 text-sm mt-1">{errors.password.message}</p>
            )}
          </div>

          {/* Server error */}
          {serverError && (
            <p className="text-red-400 text-sm border border-red-400/20 bg-red-400/5 px-4 py-3">
              {serverError}
            </p>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-[#6C47FF] text-white py-4 text-base font-semibold rounded-none hover:bg-[#5538ee] transition-colors disabled:opacity-60 disabled:cursor-not-allowed min-h-[52px] flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
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
        <p className={`${dmSans.className} text-center text-sm text-zinc-500 mt-6`}>
          Don&apos;t have an account?{' '}
          <Link href="/auth/signup" className="text-[#6C47FF] hover:text-white transition-colors">
            Sign up →
          </Link>
        </p>
      </div>
    </div>
  )
}
