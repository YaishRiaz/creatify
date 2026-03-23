'use client'
export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { getBrowserClient } from '@/lib/supabase-browser'
import { Eye, TrendingUp, Wallet, Users } from 'lucide-react'

export default function BrandAnalyticsPage() {
  const [loading, setLoading] = useState(true)
  const [campaigns, setCampaigns] = useState<any[]>([])

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

      const { data } = await supabase
        .from('campaigns')
        .select(`
          id, title, status, budget_total,
          budget_remaining, payout_rate, created_at,
          tasks (id, total_views, total_earned, status)
        `)
        .eq('brand_id', profile.id)
        .order('created_at', { ascending: false })

      setCampaigns(data || [])
      setLoading(false)
    }
    load()
  }, [])

  if (loading) return (
    <div className="flex items-center justify-center min-h-64">
      <div className="w-8 h-8 border-2 border-[#6C47FF]
      border-t-transparent rounded-full animate-spin" />
    </div>
  )

  const totalViews = campaigns.reduce((sum, c) =>
    sum + (c.tasks?.reduce((s: number, t: any) =>
      s + (t.total_views || 0), 0) || 0), 0)
  const totalSpent = campaigns.reduce((sum, c) =>
    sum + (c.budget_total - (c.budget_remaining || 0)), 0)
  const totalCreators = campaigns.reduce((sum, c) =>
    sum + (c.tasks?.length || 0), 0)
  const cpv = totalViews > 0 ? (totalSpent / totalViews * 1000) : 0

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-white mb-1">Analytics</h1>
        <p className="text-zinc-400">Performance across all your campaigns.</p>
      </div>

      {campaigns.length === 0 ? (
        <div className="bg-[#111111] border border-zinc-800
        p-16 text-center">
          <p className="text-zinc-400">
            No campaign data yet. Create a campaign to see analytics.
          </p>
        </div>
      ) : (
        <>
          {/* Summary stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {[
              { label: 'Total Views', value: totalViews >= 1000 ? `${(totalViews/1000).toFixed(1)}K` : totalViews.toString(), icon: <Eye size={18} />, color: 'text-[#6C47FF]' },
              { label: 'Total Creators', value: totalCreators.toString(), icon: <Users size={18} />, color: 'text-[#6C47FF]' },
              { label: 'Total Spent', value: `LKR ${totalSpent.toLocaleString()}`, icon: <Wallet size={18} />, color: 'text-[#6C47FF]' },
              { label: 'Cost / 1K Views', value: cpv > 0 ? `LKR ${cpv.toFixed(0)}` : '—', icon: <TrendingUp size={18} />, color: 'text-[#00E5A0]' },
            ].map((s, i) => (
              <div key={i} className="bg-[#111111] border border-zinc-800 p-5">
                <div className={`${s.color} mb-3`}>{s.icon}</div>
                <p className="text-2xl font-black text-white mb-1">{s.value}</p>
                <p className="text-zinc-400 text-sm">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Per-campaign breakdown */}
          <div className="bg-[#111111] border border-zinc-800 p-6">
            <h2 className="text-lg font-bold text-white mb-4">
              Campaign Breakdown
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-800">
                    {['Campaign', 'Status', 'Creators', 'Views', 'Spent', 'CPM'].map(h => (
                      <th key={h} className="text-left py-3 px-4 text-zinc-400
                      font-medium text-xs uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {campaigns.map(c => {
                    const v = c.tasks?.reduce((s: number, t: any) => s + (t.total_views || 0), 0) || 0
                    const s = c.budget_total - (c.budget_remaining || 0)
                    const cpm = v > 0 ? (s / v * 1000).toFixed(0) : '—'
                    return (
                      <tr key={c.id} className="border-b border-zinc-800/50">
                        <td className="py-3 px-4 text-white font-medium
                        max-w-48 line-clamp-1">{c.title}</td>
                        <td className="py-3 px-4">
                          <span className="text-xs text-zinc-400 capitalize">
                            {c.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-zinc-300">
                          {c.tasks?.length || 0}
                        </td>
                        <td className="py-3 px-4 text-[#00E5A0] font-semibold">
                          {v >= 1000 ? `${(v/1000).toFixed(1)}K` : v}
                        </td>
                        <td className="py-3 px-4 text-white">
                          LKR {s.toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-zinc-400">
                          {cpm !== '—' ? `LKR ${cpm}` : '—'}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
