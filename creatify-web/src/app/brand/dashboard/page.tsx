'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Megaphone, Eye, Wallet, TrendingDown, PlusCircle } from 'lucide-react'
import { createSupabaseClient } from '@/lib/supabase'
import { useUser } from '@/hooks/useUser'
import { formatNumber, formatLKR, getGreeting, formatDate } from '@/lib/utils'
import type { Campaign } from '@/types'


interface BrandProfile {
  id: string
  company_name: string
  industry?: string
}

interface CampaignWithViews extends Campaign {
  total_views: number
}

const STATUS_BADGE: Record<string, string> = {
  draft: 'bg-zinc-800 text-zinc-400',
  pending_payment: 'bg-amber-500/10 text-amber-400',
  active: 'bg-green-500/10 text-[#00E5A0]',
  paused: 'bg-orange-500/10 text-orange-400',
  completed: 'bg-blue-500/10 text-blue-400',
}

function SkeletonRow() {
  return (
    <tr>
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <td key={i} className="px-6 py-4">
          <div className="h-4 bg-zinc-800/50 animate-pulse rounded" />
        </td>
      ))}
    </tr>
  )
}

export default function BrandDashboard() {
  const { user, loading: userLoading } = useUser()
  const router = useRouter()
  const supabase = useMemo(() => createSupabaseClient(), [])

  const [brandProfile, setBrandProfile] = useState<BrandProfile | null>(null)
  const [campaigns, setCampaigns] = useState<CampaignWithViews[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (userLoading || !user) return

    const fetchData = async () => {
      setLoading(true)
      setError(null)

      const { data: profile, error: profileErr } = await supabase
        .from('brand_profiles')
        .select('id, company_name, industry')
        .eq('user_id', user.id)
        .maybeSingle()

      if (profileErr || !profile) {
        console.error(profileErr)
        setError('Failed to load profile.')
        setLoading(false)
        return
      }
      setBrandProfile(profile)

      const { data: campaignData, error: campaignErr } = await supabase
        .from('campaigns')
        .select('*')
        .eq('brand_id', profile.id)
        .order('created_at', { ascending: false })

      if (campaignErr) {
        console.error(campaignErr)
        setError('Failed to load campaigns.')
        setLoading(false)
        return
      }

      // Fetch views per campaign
      const campaignIds = (campaignData ?? []).map((c) => c.id)
      let viewsMap: Record<string, number> = {}

      if (campaignIds.length > 0) {
        const { data: taskData } = await supabase
          .from('tasks')
          .select('campaign_id, total_views')
          .in('campaign_id', campaignIds)

        for (const t of taskData ?? []) {
          viewsMap[t.campaign_id] = (viewsMap[t.campaign_id] ?? 0) + (t.total_views ?? 0)
        }
      }

      setCampaigns(
        (campaignData ?? []).map((c) => ({
          ...c,
          total_views: viewsMap[c.id] ?? 0,
        }))
      )
      setLoading(false)
    }

    fetchData()
  }, [user, userLoading, supabase])

  if (userLoading) return null

  // Stats
  const totalCampaigns = campaigns.length
  const activeCampaigns = campaigns.filter((c) => c.status === 'active').length
  const totalBudgetSpent = campaigns.reduce((s, c) => s + (c.budget_total - c.budget_remaining), 0)
  const totalViews = campaigns.reduce((s, c) => s + c.total_views, 0)
  const avgCpv = totalViews > 0 ? totalBudgetSpent / totalViews : null

  const greeting = getGreeting()

  return (
    <div className="font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="font-syne text-3xl font-extrabold text-white">
            {greeting}, {brandProfile?.company_name ?? user?.full_name ?? 'Brand'}
          </h1>
          <p className="text-zinc-500 text-sm mt-1">Here&apos;s how your campaigns are performing.</p>
        </div>
        <Link
          href="/brand/campaigns/create"
          className="inline-flex items-center gap-2 bg-[#6C47FF] text-white px-6 py-3 text-sm font-semibold hover:bg-[#5538ee] transition-colors"
        >
          <PlusCircle size={16} />
          New Campaign
        </Link>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 text-sm mb-6">
          {error}
          <button onClick={() => router.refresh()} className="ml-2 underline">Retry</button>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {/* Active Campaigns */}
        <div className="bg-[#111111] border border-zinc-800 p-6 flex flex-col gap-2">
          <div className="flex items-start justify-between">
            <div>
              <p className="font-syne text-3xl font-extrabold text-white">
                {loading ? <span className="block w-12 h-8 bg-zinc-800/50 animate-pulse rounded" /> : activeCampaigns}
              </p>
              <p className="text-sm text-zinc-400 mt-1">Active Campaigns</p>
            </div>
            <div className="w-10 h-10 bg-[#6C47FF]/10 flex items-center justify-center shrink-0">
              <Megaphone size={18} className="text-[#6C47FF]" />
            </div>
          </div>
          <p className="text-xs text-zinc-500">{totalCampaigns} total</p>
        </div>

        {/* Views Delivered */}
        <div className="bg-[#111111] border border-zinc-800 p-6 flex flex-col gap-2">
          <div className="flex items-start justify-between">
            <div>
              <p className="font-syne text-3xl font-extrabold text-white">
                {loading ? <span className="block w-16 h-8 bg-zinc-800/50 animate-pulse rounded" /> : formatNumber(totalViews)}
              </p>
              <p className="text-sm text-zinc-400 mt-1">Views Delivered</p>
            </div>
            <div className="w-10 h-10 bg-[#6C47FF]/10 flex items-center justify-center shrink-0">
              <Eye size={18} className="text-[#6C47FF]" />
            </div>
          </div>
          <p className="text-xs text-zinc-500">across all campaigns</p>
        </div>

        {/* Budget Spent */}
        <div className="bg-[#111111] border border-zinc-800 p-6 flex flex-col gap-2">
          <div className="flex items-start justify-between">
            <div>
              <p className="font-syne text-3xl font-extrabold text-white">
                {loading ? <span className="block w-20 h-8 bg-zinc-800/50 animate-pulse rounded" /> : formatLKR(totalBudgetSpent)}
              </p>
              <p className="text-sm text-zinc-400 mt-1">Budget Spent</p>
            </div>
            <div className="w-10 h-10 bg-[#6C47FF]/10 flex items-center justify-center shrink-0">
              <Wallet size={18} className="text-[#6C47FF]" />
            </div>
          </div>
          <p className="text-xs text-zinc-500">total across campaigns</p>
        </div>

        {/* Cost Per View */}
        <div className="bg-[#111111] border border-zinc-800 p-6 flex flex-col gap-2">
          <div className="flex items-start justify-between">
            <div>
              <p className="font-syne text-3xl font-extrabold text-white">
                {loading ? (
                  <span className="block w-16 h-8 bg-zinc-800/50 animate-pulse rounded" />
                ) : avgCpv !== null ? (
                  `LKR ${avgCpv.toFixed(3)}`
                ) : (
                  '—'
                )}
              </p>
              <p className="text-sm text-zinc-400 mt-1">Cost Per View</p>
            </div>
            <div className={`w-10 h-10 flex items-center justify-center shrink-0 ${avgCpv !== null && avgCpv < 0.02 ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
              <TrendingDown size={18} className={avgCpv !== null && avgCpv < 0.02 ? 'text-[#00E5A0]' : 'text-red-400'} />
            </div>
          </div>
          <p className="text-xs text-zinc-500">lower is better</p>
        </div>
      </div>

      {/* Campaigns Table */}
      <div className="bg-[#111111] border border-zinc-800">
        <div className="px-6 py-4 border-b border-zinc-800 flex items-center gap-3">
          <h2 className="font-syne font-bold text-white text-lg">Your Campaigns</h2>
          <span className="text-xs bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded-full">{totalCampaigns}</span>
        </div>

        {loading ? (
          <table className="w-full">
            <tbody>
              <SkeletonRow />
              <SkeletonRow />
              <SkeletonRow />
            </tbody>
          </table>
        ) : campaigns.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
            <Megaphone size={64} className="text-zinc-700 mb-4" />
            <p className="font-syne text-xl font-bold text-white mb-2">No campaigns yet</p>
            <p className="text-zinc-500 text-sm mb-6 max-w-sm">
              Create your first campaign to start getting real content from real creators.
            </p>
            <Link
              href="/brand/campaigns/create"
              className="bg-[#6C47FF] text-white px-6 py-3 text-sm font-semibold hover:bg-[#5538ee] transition-colors"
            >
              Create Campaign
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800">
                  {['Campaign', 'Platforms', 'Budget', 'Views', 'Status', 'Action'].map((h) => (
                    <th key={h} className="px-6 py-3 text-left text-xs text-zinc-500 uppercase tracking-wider font-medium">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/50">
                {campaigns.map((c) => {
                  const spent = c.budget_total - c.budget_remaining
                  const pct = c.budget_total > 0 ? (spent / c.budget_total) * 100 : 0
                  const barColor = pct > 90 ? 'bg-red-500' : pct > 70 ? 'bg-amber-500' : 'bg-[#00E5A0]'
                  return (
                    <tr key={c.id} className="hover:bg-zinc-800/20 transition-colors">
                      <td className="px-6 py-4">
                        <p className="font-medium text-white">{c.title}</p>
                        <p className="text-xs text-zinc-500 mt-0.5">{formatDate(c.created_at)}</p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-zinc-400 text-xs">{c.target_platforms.join(', ')}</p>
                      </td>
                      <td className="px-6 py-4 min-w-[140px]">
                        <p className="text-white">{formatLKR(spent)} <span className="text-zinc-500">/ {formatLKR(c.budget_total)}</span></p>
                        <div className="mt-1.5 h-1 w-full bg-zinc-800 rounded-full overflow-hidden">
                          <div className={`h-full ${barColor} transition-all`} style={{ width: `${Math.min(pct, 100)}%` }} />
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-[#00E5A0] font-medium">{formatNumber(c.total_views)}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`text-xs px-2.5 py-1 capitalize ${STATUS_BADGE[c.status] ?? 'bg-zinc-800 text-zinc-400'}`}>
                          {c.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <Link
                          href={`/brand/campaigns/${c.id}`}
                          className="text-xs text-zinc-300 border border-zinc-700 px-3 py-1.5 hover:border-zinc-400 hover:text-white transition-all"
                        >
                          View
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
