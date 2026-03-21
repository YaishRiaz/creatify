export const dynamic = 'force-dynamic'

import Link from 'next/link'

export default function ForgotPasswordPage() {
  return (
    <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-md bg-[#111111] border border-zinc-800 p-10 text-center">
        <h1 className="text-2xl font-extrabold text-white mb-3">
          Forgot password?
        </h1>
        <p className="text-sm text-zinc-400 mb-6">
          Password reset is coming soon. Please contact support for now.
        </p>
        <Link
          href="/auth/login"
          className="text-sm text-[#6C47FF] hover:text-white transition-colors"
        >
          ← Back to login
        </Link>
      </div>
    </div>
  )
}
