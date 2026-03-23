'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Search, X, Clock } from 'lucide-react'
import { createSupabaseClient } from '@/lib/supabase'
import { useUser } from '@/hooks/useUser'
import { formatLKR, formatNumber } from '@/lib/utils'
import OnboardingGate from '@/components/creator/OnboardingGate'
import { ONBOARDING_CAMPAIGN_ID } from '@/lib/onboarding'
import type { Campaign } from '@/types'


interface CampaignWithMeta extends Campaign {
  brand: { company_name: string; logo_url: string | null } | null
  alreadyAccepted: boolean
}

const PLATFORM_BADGE: Record<string, string> = {
  tiktok: 'bg-pink-500/10 text-pink-400',
  instagram: 'bg-orange-500/10 text-orange-400',
  youtube: 'bg-red-500/10 text-red-400',
  facebook: 'bg-blue-500/10 text-blue-400',
}

type SortOption = 'payout_desc' | 'newest' | 'ending_soon' | 'budget_desc'

function daysLeft(endDate: string): number {
  return Math.max(0, Math.ceil((new Date(endDate).getTime() - Date.now()) / 86400000))
}

export default function BrowseCampaignsPage() {
  const { user, loading: userLoading } = useUser()
  const supabase = useMemo(() => createSupabaseClient(), [])

  const [creatorProfileId, setCreatorProfileId] = useState<string | null>(null)
  const [campaigns, setCampaigns] = useState<CampaignWithMeta[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [platforms, setPlatforms] = useState<string[]>([])
  const [sort, setSort] = useState<SortOption>('payout_desc')
  const [search, setSearch] = useState('')

  useEffect(() => {
    if (userLoading || !user) return
    const fetchData = async () => {
      setLoading(true); setError(null)

      const { data: profile } = await supabase
        .from('creator_profiles').select('id').eq('user_id', user.id).maybeSingle()
      if (!profile) { setError('Profile not found.'); setLoading(false); return }
      setCreatorProfileId(profile.id)

      const now = new Date().toISOString()
      const { data: campData, error: campErr } = await supabase
        .from('campaigns')
        .select('*, brand:brand_profiles(company_name, logo_url)')
        .eq('status', 'active')
        .eq('is_onboarding', false)
        .gt('budget_remaining', 0)
        .lte('start_date', now)
        .gte('end_date', now)
        .order('created_at', { ascending: false })
      if (campErr) { setError('Failed to load campaigns.'); setLoading(false); return }

      const { data: myTasks } = await supabase
        .from('tasks').select('campaign_id').eq('creator_id', profile.id)
      const acceptedIds = new Set((myTasks ?? []).map((t: { campaign_id: string }) => t.campaign_id))

      setCampaigns(
        (campData ?? []).map((c) => ({
          ...c,
          alreadyAccepted: acceptedIds.has(c.id),
        })) as CampaignWithMeta[]
      )
      setLoading(false)
    }
    fetchData()
  }, [user, userLoading, supabase])

  const togglePlatform = (p: string) =>
    setPlatforms((prev) => prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p])

  const filtered = useMemo(() => {
    let list = [...campaigns]
    if (platforms.length > 0)
      list = list.filter((c) => c.target_platforms.some((p) => platforms.includes(p)))
    if (search.trim())
      list = list.filter(
        (c) =>
          c.title.toLowerCase().includes(search.toLowerCase()) ||
          (c.brand?.company_name ?? '').toLowerCase().includes(search.toLowerCase())
      )
    switch (sort) {
      case 'payout_desc': list.sort((a, b) => b.payout_rate - a.payout_rate); break
      case 'newest': list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()); break
      case 'ending_soon': list.sort((a, b) => new Date(a.end_date ?? '').getTime() - new Date(b.end_date ?? '').getTime()); break
      case 'budget_desc': list.sort((a, b) => b.budget_remaining - a.budget_remaining); break
    }
    return list
  }, [campaigns, platforms, sort, search])

  if (!creatorProfileId) return null

  return (
    <OnboardingGate creatorProfileId={creatorProfileId}>
    <div className="font-sans">
      <div className="mb-6">
        <h1 className="font-syne text-3xl font-extrabold text-white">Browse Campaigns</h1>
        <p className="text-zinc-500 text-sm mt-1">
          {loading ? '—' : `${campaigns.length} campaigns paying right now`}
        </p>
      </div>

      {/* Filter bar */}
      <div className="bg-[#111111] border border-zinc-800 p-4 mb-6 flex flex-wrap gap-3 items-center">
        {/* Platform filters */}
        <div className="flex flex-wrap gap-2">
          {['TikTok', 'Instagram', 'YouTube', 'Facebook'].map((p) => {
            const key = p.toLowerCase()
            const active = platforms.includes(key)
            return (
              <button
                key={p}
                onClick={() => togglePlatform(key)}
                className={`text-xs px-3 py-1.5 transition-colors ${active ? 'bg-[#6C47FF] text-white' : 'border border-zinc-700 text-zinc-400 hover:text-white'}`}
              >
                {p}
              </button>
            )
          })}
        </div>

        {/* Sort */}
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortOption)}
          className="bg-zinc-900 border border-zinc-800 text-zinc-300 text-xs px-3 py-1.5 outline-none focus:border-[#6C47FF]"
        >
          <option value="payout_desc">Highest payout rate</option>
          <option value="newest">Newest first</option>
          <option value="ending_soon">Ending soon</option>
          <option value="budget_desc">Most budget remaining</option>
        </select>

        {/* Search */}
        <div className="relative flex-1 min-w-[180px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search campaigns or brands…"
            className="w-full bg-zinc-900 border border-zinc-800 focus:border-[#6C47FF] outline-none pl-8 pr-8 py-1.5 text-xs text-white placeholder:text-zinc-600 transition-colors"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white">
              <X size={12} />
            </button>
          )}
        </div>
      </div>

      {error && <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 text-sm mb-6">{error}</div>}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1,2,3,4,5,6].map((i) => <div key={i} className="h-72 bg-zinc-800/50 animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Search size={64} className="text-zinc-700 mb-4" />
          <p className="font-syne text-xl font-bold text-white mb-2">No campaigns match your filters</p>
          <button
            onClick={() => { setPlatforms([]); setSearch('') }}
            className="text-sm text-[#6C47FF] hover:text-white transition-colors"
          >
            Clear filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((c) => {
            const pct = c.budget_total > 0 ? (c.budget_remaining / c.budget_total) * 100 : 0
            const barColor = pct < 30 ? 'bg-amber-500' : 'bg-[#00E5A0]'
            const days = c.end_date ? daysLeft(c.end_date) : null
            return (
              <Link
                key={c.id}
                href={`/creator/campaigns/${c.id}`}
                className="bg-[#111111] border border-zinc-800 hover:border-zinc-600 transition-colors duration-200 p-6 flex flex-col gap-3 cursor-pointer"
              >
                {/* Top row */}
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm text-zinc-400">{c.brand?.company_name}</p>
                  <div className="flex gap-1 shrink-0">
                    {c.alreadyAccepted && (
                      <span className="text-xs bg-green-500/10 text-[#00E5A0] px-2 py-0.5">✓ Accepted</span>
                    )}
                    {pct < 10 && !c.alreadyAccepted && (
                      <span className="text-xs bg-amber-500/10 text-amber-400 px-2 py-0.5">⚠ Filling up</span>
                    )}
                  </div>
                </div>

                <h3 className="font-syne text-lg font-bold text-white line-clamp-2 leading-tight">{c.title}</h3>

                {/* Platform badges */}
                <div className="flex flex-wrap gap-1">
                  {c.target_platforms.map((p) => (
                    <span key={p} className={`text-xs px-2 py-0.5 capitalize ${PLATFORM_BADGE[p] ?? 'bg-zinc-800 text-zinc-400'}`}>{p}</span>
                  ))}
                </div>

                {/* Payout highlight */}
                <div>
                  <p className="font-syne text-3xl font-extrabold text-[#00E5A0]">
                    {formatLKR(c.payout_rate)}
                  </p>
                  <p className="text-xs text-zinc-500">per 1,000 views</p>
                </div>

                {/* Earnings examples */}
                <div className="bg-zinc-900 p-3">
                  <p className="text-xs text-zinc-500 mb-2">At this rate:</p>
                  <div className="grid grid-cols-3 gap-1 text-xs">
                    {[10000, 50000, 100000].map((v) => (
                      <div key={v} className="text-center">
                        <p className="text-zinc-400">{formatNumber(v)}</p>
                        <p className="text-[#00E5A0] font-medium">{formatLKR(Math.round((c.payout_rate * v) / 1000 * 100) / 100)}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Budget bar */}
                <div>
                  <div className="flex justify-between text-xs text-zinc-500 mb-1">
                    <span>Budget remaining</span>
                    <span>{pct.toFixed(0)}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
                    <div className={`h-full ${barColor}`} style={{ width: `${Math.min(pct, 100)}%` }} />
                  </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between text-xs text-zinc-500 pt-1">
                  {days !== null && (
                    <span className="flex items-center gap-1"><Clock size={11} />{days} days left</span>
                  )}
                  <span className="text-[#6C47FF] ml-auto">View Campaign →</span>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
    </OnboardingGate>
  )
}
