'use client'
export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { getBrowserClient } from '@/lib/supabase-browser'
import { Plus } from 'lucide-react'

export default function BrandCampaignsPage() {
  const [campaigns, setCampaigns] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const load = async () => {
      const supabase = getBrowserClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { window.location.href = '/auth/login'; return }

      const { data: profile } = await supabase
        .from('brand_profiles')
        .select('id')
        .eq('user_id', session.user.id)
        .maybeSingle()

      if (!profile) { setLoading(false); return }

      const { data, error: err } = await supabase
        .from('campaigns')
        .select(`
          id, title, status, budget_total,
          budget_remaining, payout_rate,
          created_at, end_date, target_platforms,
          tasks (id, total_views, total_earned)
        `)
        .eq('brand_id', profile.id)
        .order('created_at', { ascending: false })

      if (err) setError(err.message)
      else setCampaigns(data || [])
      setLoading(false)
    }
    load()
  }, [])

  const statusColors: Record<string, string> = {
    active: 'bg-green-500/10 text-[#00E5A0]',
    paused: 'bg-amber-500/10 text-amber-400',
    completed: 'bg-blue-500/10 text-blue-400',
    draft: 'bg-zinc-800 text-zinc-400',
    pending_payment: 'bg-yellow-500/10 text-yellow-400',
  }

  if (loading) return (
    <div className="flex items-center justify-center min-h-64">
      <div className="w-8 h-8 border-2 border-[#6C47FF]
      border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-black text-white mb-1">Campaigns</h1>
          <p className="text-zinc-400">Manage all your UGC campaigns.</p>
        </div>
        <Link href="/brand/campaigns/create"
          className="flex items-center gap-2 bg-[#6C47FF]
          text-white px-5 py-3 font-semibold text-sm
          hover:bg-[#5538ee] transition-colors">
          <Plus size={16} /> New Campaign
        </Link>
      </div>

      {error && (
        <div className="bg-red-950/20 border border-red-800/30
        px-4 py-3 mb-6 text-sm text-red-400">{error}</div>
      )}

      {campaigns.length === 0 ? (
        <div className="bg-[#111111] border border-zinc-800
        p-16 text-center">
          <p className="text-zinc-400 mb-4">No campaigns yet.</p>
          <Link href="/brand/campaigns/create"
            className="inline-flex items-center gap-2
            bg-[#6C47FF] text-white px-6 py-3 font-semibold
            text-sm hover:bg-[#5538ee]">
            <Plus size={16} /> Create your first campaign
          </Link>
        </div>
      ) : (
        <div className="grid gap-4">
          {campaigns.map(c => {
            const views = c.tasks?.reduce((s: number, t: any) =>
              s + (t.total_views || 0), 0) || 0
            const spent = c.budget_total - (c.budget_remaining || 0)
            const pct = Math.min((spent / c.budget_total) * 100, 100)
            return (
              <Link key={c.id} href={`/brand/campaigns/${c.id}`}
                className="block bg-[#111111] border border-zinc-800
                p-6 hover:border-zinc-600 transition-colors group">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h2 className="text-white font-bold text-lg
                    group-hover:text-[#6C47FF] transition-colors mb-1">
                      {c.title}
                    </h2>
                    <div className="flex gap-2">
                      {c.target_platforms?.map((p: string) => (
                        <span key={p} className="bg-zinc-900 border
                        border-zinc-700 px-2 py-0.5 text-xs
                        text-zinc-400 capitalize">{p}</span>
                      ))}
                    </div>
                  </div>
                  <span className={`text-xs px-2 py-1 ${statusColors[c.status] || 'bg-zinc-800 text-zinc-400'}`}>
                    {c.status?.replace('_', ' ').toUpperCase()}
                  </span>
                </div>
                <div className="flex gap-6 text-sm mb-4">
                  <div>
                    <p className="text-[#00E5A0] font-black text-xl">
                      {views >= 1000 ? `${(views/1000).toFixed(1)}K` : views}
                    </p>
                    <p className="text-zinc-500 text-xs">Views</p>
                  </div>
                  <div>
                    <p className="text-white font-bold text-xl">
                      LKR {spent.toLocaleString()}
                    </p>
                    <p className="text-zinc-500 text-xs">Spent</p>
                  </div>
                  <div>
                    <p className="text-zinc-300 font-bold text-xl">
                      LKR {(c.budget_remaining||0).toLocaleString()}
                    </p>
                    <p className="text-zinc-500 text-xs">Remaining</p>
                  </div>
                  <div>
                    <p className="text-white font-bold text-xl">
                      {c.tasks?.length || 0}
                    </p>
                    <p className="text-zinc-500 text-xs">Creators</p>
                  </div>
                </div>
                <div className="h-1.5 bg-zinc-800 w-full">
                  <div className={`h-full transition-all ${
                    pct > 80 ? 'bg-red-500' : pct > 50 ? 'bg-amber-500' : 'bg-[#00E5A0]'
                  }`} style={{ width: `${pct}%` }} />
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
