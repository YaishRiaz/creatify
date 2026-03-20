'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { PlusCircle, Megaphone } from 'lucide-react'
import { createSupabaseClient } from '@/lib/supabase'
import { useUser } from '@/hooks/useUser'
import { formatNumber, formatLKR, formatDate } from '@/lib/utils'
import type { Campaign } from '@/types'


type StatusFilter = 'all' | 'active' | 'paused' | 'completed' | 'draft' | 'pending_payment'

const STATUS_BADGE: Record<string, string> = {
  draft: 'bg-zinc-800 text-zinc-400',
  pending_payment: 'bg-amber-500/10 text-amber-400',
  active: 'bg-green-500/10 text-[#00E5A0]',
  paused: 'bg-orange-500/10 text-orange-400',
  completed: 'bg-blue-500/10 text-blue-400',
}

interface CampaignWithMeta extends Campaign {
  total_views: number
  creator_count: number
}

export default function CampaignsPage() {
  const { user, loading: userLoading } = useUser()
  const supabase = useMemo(() => createSupabaseClient(), [])

  const [campaigns, setCampaigns] = useState<CampaignWithMeta[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<StatusFilter>('all')

  useEffect(() => {
    if (userLoading || !user) return

    const fetchData = async () => {
      setLoading(true)
      setError(null)

      const { data: profile, error: profileErr } = await supabase
        .from('brand_profiles')
        .select('id')
        .eq('user_id', user.id)
        .single()

      if (profileErr || !profile) {
        setError('Failed to load profile.')
        setLoading(false)
        return
      }

      const { data: campaignData, error: campaignErr } = await supabase
        .from('campaigns')
        .select('*')
        .eq('brand_id', profile.id)
        .order('created_at', { ascending: false })

      if (campaignErr) {
        setError('Failed to load campaigns.')
        setLoading(false)
        return
      }

      const ids = (campaignData ?? []).map((c) => c.id)
      let viewsMap: Record<string, number> = {}
      let creatorMap: Record<string, number> = {}

      if (ids.length > 0) {
        const { data: taskData } = await supabase
          .from('tasks')
          .select('campaign_id, total_views, creator_id')
          .in('campaign_id', ids)

        for (const t of taskData ?? []) {
          viewsMap[t.campaign_id] = (viewsMap[t.campaign_id] ?? 0) + (t.total_views ?? 0)
          creatorMap[t.campaign_id] = (creatorMap[t.campaign_id] ?? 0) + 1
        }
      }

      setCampaigns(
        (campaignData ?? []).map((c) => ({
          ...c,
          total_views: viewsMap[c.id] ?? 0,
          creator_count: creatorMap[c.id] ?? 0,
        }))
      )
      setLoading(false)
    }

    fetchData()
  }, [user, userLoading, supabase])

  const filters: { label: string; value: StatusFilter }[] = [
    { label: 'All', value: 'all' },
    { label: 'Active', value: 'active' },
    { label: 'Paused', value: 'paused' },
    { label: 'Completed', value: 'completed' },
  ]

  const filtered = filter === 'all' ? campaigns : campaigns.filter((c) => c.status === filter)

  return (
    <div className="font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <h1 className="font-syne text-3xl font-extrabold text-white">Campaigns</h1>
        <Link
          href="/brand/campaigns/create"
          className="inline-flex items-center gap-2 bg-[#6C47FF] text-white px-6 py-3 text-sm font-semibold hover:bg-[#5538ee] transition-colors"
        >
          <PlusCircle size={16} />
          New Campaign
        </Link>
      </div>

      {/* Filter bar */}
      <div className="flex items-center gap-2 mb-6">
        {filters.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`px-4 py-1.5 text-sm transition-colors ${
              filter === f.value
                ? 'bg-[#6C47FF]/10 text-white border border-[#6C47FF]/30'
                : 'text-zinc-400 border border-zinc-800 hover:text-white hover:border-zinc-600'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 text-sm mb-6">
          {error}
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-[#111111] border border-zinc-800 p-6 h-48 animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Megaphone size={64} className="text-zinc-700 mb-4" />
          <p className="font-syne text-xl font-bold text-white mb-2">
            {filter === 'all' ? 'No campaigns yet' : `No ${filter} campaigns`}
          </p>
          <p className="text-zinc-500 text-sm mb-6">
            {filter === 'all'
              ? 'Create your first campaign to start getting real content.'
              : 'Try changing the filter above.'}
          </p>
          {filter === 'all' && (
            <Link
              href="/brand/campaigns/create"
              className="bg-[#6C47FF] text-white px-6 py-3 text-sm font-semibold hover:bg-[#5538ee] transition-colors"
            >
              Create Campaign
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((c) => {
            const spent = c.budget_total - c.budget_remaining
            const pct = c.budget_total > 0 ? (spent / c.budget_total) * 100 : 0
            const barColor = pct > 90 ? 'bg-red-500' : pct > 70 ? 'bg-amber-500' : 'bg-[#00E5A0]'
            const isEnded = c.end_date && new Date(c.end_date) < new Date()
            return (
              <div key={c.id} className="bg-[#111111] border border-zinc-800 p-6 flex flex-col gap-4">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="font-syne text-lg font-bold text-white leading-tight">{c.title}</h3>
                  <span className={`text-xs px-2.5 py-1 shrink-0 capitalize ${STATUS_BADGE[c.status] ?? 'bg-zinc-800 text-zinc-400'}`}>
                    {c.status.replace('_', ' ')}
                  </span>
                </div>

                {/* Platforms */}
                <div className="flex flex-wrap gap-1.5">
                  {c.target_platforms.map((p) => (
                    <span key={p} className="text-xs bg-zinc-800 text-zinc-400 px-2 py-0.5 capitalize">{p}</span>
                  ))}
                </div>

                {/* Progress bar */}
                <div>
                  <div className="flex justify-between text-xs text-zinc-500 mb-1">
                    <span>{formatLKR(spent)} spent</span>
                    <span>{formatLKR(c.budget_total)} total</span>
                  </div>
                  <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
                    <div className={`h-full ${barColor} transition-all`} style={{ width: `${Math.min(pct, 100)}%` }} />
                  </div>
                </div>

                {/* Stats row */}
                <div className="flex items-center gap-4 text-sm text-zinc-400">
                  <span><span className="text-[#00E5A0] font-medium">{formatNumber(c.total_views)}</span> views</span>
                  <span>·</span>
                  <span>{c.creator_count} creators</span>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between mt-auto pt-2 border-t border-zinc-800">
                  <p className="text-xs text-zinc-500">
                    {c.end_date
                      ? `${isEnded ? 'Ended' : 'Ends'} ${formatDate(c.end_date)}`
                      : 'No end date'}
                  </p>
                  <Link
                    href={`/brand/campaigns/${c.id}`}
                    className="text-xs text-zinc-300 border border-zinc-700 px-3 py-1.5 hover:border-zinc-400 hover:text-white transition-all"
                  >
                    View Details
                  </Link>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
