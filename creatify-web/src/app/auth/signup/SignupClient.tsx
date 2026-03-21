'use client'

export const dynamic = 'force-dynamic'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Building2,
  Sparkles,
  CheckCircle,
  ArrowLeft,
  Loader2,
  Eye,
  EyeOff,
} from 'lucide-react'
import { createSupabaseClient } from '@/lib/supabase'
import type { UserRole } from '@/types'


const schema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  full_name: z.string().min(2, 'Full name must be at least 2 characters'),
  phone: z.string().optional(),
  company_name: z.string().optional(),
  industry: z.string().optional(),
  nic_number: z.string().optional(),
})

type FormData = z.infer<typeof schema>

const NIC_REGEX = /^\d{9}[VvXx]$|^\d{12}$/

const brandBullets = [
  'Set your own payout rate',
  'Only pay for views delivered',
  'Real-time campaign analytics',
]

const creatorBullets = [
  'No follower minimum required',
  'Earn from LKR 500+',
  'Works on TikTok, Instagram, YouTube, Facebook',
]

/* ─── STEP 1 — Role Selection ────────────────────────────── */
function RoleSelection({ onSelect }: { onSelect: (role: UserRole) => void }) {
  return (
    <div className="min-h-screen bg-[#0A0A0A] flex flex-col items-center justify-center px-4 py-16">
      <div className="w-full max-w-3xl">
        {/* Wordmark */}
        <div className="text-center mb-12">
          <Link
            href="/"
            className="font-syne text-2xl font-extrabold text-[#6C47FF]"
          >
            Creatify
          </Link>
          <h1 className="font-syne font-bold text-3xl md:text-4xl text-white mt-6 mb-3">
            Create your account
          </h1>
          <p className="font-sans text-zinc-400">
            Choose your role to get started
          </p>
        </div>

        {/* Role cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Brand card */}
          <div className="bg-[#111111] border border-zinc-800 p-8 flex flex-col gap-5">
            <div className="w-14 h-14 flex items-center justify-center bg-[#6C47FF]/10">
              <Building2 size={28} className="text-[#6C47FF]" />
            </div>
            <div>
              <h2 className="font-syne font-bold text-xl text-white mb-2">
                I&apos;m a Brand
              </h2>
              <p className="font-sans text-sm text-zinc-400 leading-relaxed">
                Fund campaigns and get authentic content from real creators
              </p>
            </div>
            <ul className="flex flex-col gap-2">
              {brandBullets.map((b) => (
                <li key={b} className="flex items-center gap-2 text-sm text-zinc-300">
                  <CheckCircle size={14} className="text-[#00E5A0] shrink-0" />
                  {b}
                </li>
              ))}
            </ul>
            <button
              onClick={() => onSelect('brand')}
              className="mt-auto border border-[#6C47FF] text-[#6C47FF] px-6 py-3 text-sm font-semibold rounded-none hover:bg-[#6C47FF] hover:text-white transition-all duration-200 min-h-[44px]"
            >
              Select — Brand
            </button>
          </div>

          {/* Creator card */}
          <div className="bg-[#111111] border border-zinc-800 p-8 flex flex-col gap-5">
            <div className="w-14 h-14 flex items-center justify-center bg-[#00E5A0]/10">
              <Sparkles size={28} className="text-[#00E5A0]" />
            </div>
            <div>
              <h2 className="font-syne font-bold text-xl text-white mb-2">
                I&apos;m a Creator
              </h2>
              <p className="font-sans text-sm text-zinc-400 leading-relaxed">
                Post content, submit your URL, earn money per view — no follower minimum
              </p>
            </div>
            <ul className="flex flex-col gap-2">
              {creatorBullets.map((b) => (
                <li key={b} className="flex items-center gap-2 text-sm text-zinc-300">
                  <CheckCircle size={14} className="text-[#00E5A0] shrink-0" />
                  {b}
                </li>
              ))}
            </ul>
            <button
              onClick={() => onSelect('creator')}
              className="mt-auto border border-[#00E5A0] text-[#00E5A0] px-6 py-3 text-sm font-semibold rounded-none hover:bg-[#00E5A0] hover:text-black transition-all duration-200 min-h-[44px]"
            >
              Select — Creator
            </button>
          </div>
        </div>

        <p className="font-sans text-center text-sm text-zinc-500 mt-8">
          Already have an account?{' '}
          <Link href="/auth/login" className="text-[#6C47FF] hover:text-white transition-colors">
            Log in
          </Link>
        </p>
      </div>
    </div>
  )
}

/* ─── STEP 2 — Details Form ──────────────────────────────── */
function DetailsForm({
  role,
  onBack,
}: {
  role: UserRole
  onBack: () => void
}) {
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

    // Conditional field validation
    if (role === 'brand' && !data.company_name?.trim()) {
      setServerError('Company name is required')
      return
    }
    if (role === 'creator') {
      if (!data.nic_number?.trim()) {
        setServerError('NIC number is required')
        return
      }
      if (!NIC_REGEX.test(data.nic_number)) {
        setServerError(
          'NIC must be 9 digits + V/X (e.g. 123456789V) or 12 digits (e.g. 200012345678)'
        )
        return
      }
    }

    try {
      // 1. Create user via server API route (uses service role — no email sent)
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: data.email,
          password: data.password,
          full_name: data.full_name,
          phone: data.phone || null,
          role,
          company_name: data.company_name || null,
          industry: data.industry || null,
          nic_number: data.nic_number || null,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to create account')

      // 2. Sign in immediately (user is pre-confirmed, no email needed)
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      })
      if (signInError) throw signInError

      // 3. Redirect
      router.push(role === 'brand' ? '/brand/dashboard' : '/creator/dashboard')
    } catch (err) {
      const msg = err instanceof Error ? err.message : ''
      if (msg.toLowerCase().includes('already registered') || msg.toLowerCase().includes('already been registered') || msg.toLowerCase().includes('already exists')) {
        setServerError('An account with this email already exists. Login instead.')
      } else if (msg.toLowerCase().includes('password should be at least')) {
        setServerError('Password must be at least 8 characters.')
      } else if (msg.toLowerCase().includes('failed to fetch') || msg.toLowerCase().includes('networkerror')) {
        setServerError('Something went wrong. Please try again.')
      } else {
        setServerError(msg || 'Something went wrong. Please try again.')
      }
    }
  }

  const isBrand = role === 'brand'
  const accentColor = isBrand ? '#6C47FF' : '#00E5A0'

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex flex-col items-center justify-center px-4 py-16">
      <div className="w-full max-w-md">
        {/* Back + wordmark */}
        <div className="flex items-center justify-between mb-10">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-sm text-zinc-400 hover:text-white transition-colors"
          >
            <ArrowLeft size={16} /> Back
          </button>
          <Link
            href="/"
            className="font-syne text-lg font-extrabold text-[#6C47FF]"
          >
            Creatify
          </Link>
        </div>

        {/* Role badge */}
        <div
          className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-semibold uppercase tracking-widest mb-6 border"
          style={{ borderColor: accentColor, color: accentColor }}
        >
          {isBrand ? <Building2 size={12} /> : <Sparkles size={12} />}
          {isBrand ? 'Brand Account' : 'Creator Account'}
        </div>

        <h1 className="font-syne font-bold text-2xl md:text-3xl text-white mb-1">
          Complete your profile
        </h1>
        <p className="font-sans text-sm text-zinc-400 mb-8">
          Just a few more details to get you started.
        </p>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
          {/* Full name */}
          <div>
            <label className="block text-xs text-zinc-400 uppercase tracking-wider mb-1.5">
              Full Name
            </label>
            <input
              {...register('full_name')}
              placeholder="Your full name"
              className="w-full bg-zinc-900 border border-zinc-800 focus:border-[#6C47FF] outline-none px-4 py-3 text-sm text-white rounded-none placeholder:text-zinc-600 transition-colors"
            />
            {errors.full_name && (
              <p className="text-red-400 text-sm mt-1">{errors.full_name.message}</p>
            )}
          </div>

          {/* Email */}
          <div>
            <label className="block text-xs text-zinc-400 uppercase tracking-wider mb-1.5">
              Email
            </label>
            <input
              {...register('email')}
              type="email"
              placeholder="you@example.com"
              className="w-full bg-zinc-900 border border-zinc-800 focus:border-[#6C47FF] outline-none px-4 py-3 text-sm text-white rounded-none placeholder:text-zinc-600 transition-colors"
            />
            {errors.email && (
              <p className="text-red-400 text-sm mt-1">{errors.email.message}</p>
            )}
          </div>

          {/* Password */}
          <div>
            <label className="block text-xs text-zinc-400 uppercase tracking-wider mb-1.5">
              Password
            </label>
            <div className="relative">
              <input
                {...register('password')}
                type={showPassword ? 'text' : 'password'}
                placeholder="Minimum 8 characters"
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

          {/* Phone (optional) */}
          <div>
            <label className="block text-xs text-zinc-400 uppercase tracking-wider mb-1.5">
              Phone{' '}
              <span className="normal-case text-zinc-600">(optional)</span>
            </label>
            <input
              {...register('phone')}
              type="tel"
              placeholder="+94 77 123 4567"
              className="w-full bg-zinc-900 border border-zinc-800 focus:border-[#6C47FF] outline-none px-4 py-3 text-sm text-white rounded-none placeholder:text-zinc-600 transition-colors"
            />
          </div>

          {/* Brand-only: company name + industry */}
          {isBrand && (
            <>
              <div>
                <label className="block text-xs text-zinc-400 uppercase tracking-wider mb-1.5">
                  Company Name
                </label>
                <input
                  {...register('company_name')}
                  placeholder="Your company or brand name"
                  className="w-full bg-zinc-900 border border-zinc-800 focus:border-[#6C47FF] outline-none px-4 py-3 text-sm text-white rounded-none placeholder:text-zinc-600 transition-colors"
                />
                {errors.company_name && (
                  <p className="text-red-400 text-sm mt-1">{errors.company_name.message}</p>
                )}
              </div>
              <div>
                <label className="block text-xs text-zinc-400 uppercase tracking-wider mb-1.5">
                  Industry{' '}
                  <span className="normal-case text-zinc-600">(optional)</span>
                </label>
                <input
                  {...register('industry')}
                  placeholder="e.g. Fashion, Food & Beverage, Tech"
                  className="w-full bg-zinc-900 border border-zinc-800 focus:border-[#6C47FF] outline-none px-4 py-3 text-sm text-white rounded-none placeholder:text-zinc-600 transition-colors"
                />
              </div>
            </>
          )}

          {/* Creator-only: NIC */}
          {!isBrand && (
            <div>
              <label className="block text-xs text-zinc-400 uppercase tracking-wider mb-1.5">
                NIC Number
              </label>
              <input
                {...register('nic_number')}
                placeholder="123456789V or 200012345678"
                className="w-full bg-zinc-900 border border-zinc-800 focus:border-[#6C47FF] outline-none px-4 py-3 text-sm text-white rounded-none placeholder:text-zinc-600 transition-colors"
              />
              <p className="text-xs text-zinc-600 mt-1">
                Old format: 9 digits + V/X &nbsp;·&nbsp; New format: 12 digits
              </p>
              {errors.nic_number && (
                <p className="text-red-400 text-sm mt-1">{errors.nic_number.message}</p>
              )}
            </div>
          )}

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
                Creating account...
              </>
            ) : (
              'Create Account'
            )}
          </button>
        </form>

        <p className="font-sans text-center text-sm text-zinc-500 mt-6">
          Already have an account?{' '}
          <Link href="/auth/login" className="text-[#6C47FF] hover:text-white transition-colors">
            Log in
          </Link>
        </p>
      </div>
    </div>
  )
}

/* ─── Page ───────────────────────────────────────────────── */
export default function SignupClient() {
  const [step, setStep] = useState<1 | 2>(1)
  const [role, setRole] = useState<UserRole | null>(null)

  const handleRoleSelect = (selectedRole: UserRole) => {
    setRole(selectedRole)
    setStep(2)
  }

  if (step === 1) {
    return <RoleSelection onSelect={handleRoleSelect} />
  }

  return (
    <DetailsForm
      role={role as UserRole}
      onBack={() => setStep(1)}
    />
  )
}
