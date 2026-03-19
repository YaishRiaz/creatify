'use client'

import { useUser } from '@/hooks/useUser'

export default function BrandDashboard() {
  const { user, loading } = useUser()

  if (loading) return (
    <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
      <div className="text-zinc-400">Loading...</div>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#0A0A0A] p-8">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-3xl font-extrabold text-white mb-2">
          Welcome, {user?.full_name || 'Brand'}
        </h1>
        <p className="text-zinc-400">Brand dashboard — coming soon</p>
      </div>
    </div>
  )
}
