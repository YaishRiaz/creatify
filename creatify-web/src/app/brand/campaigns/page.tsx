'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Plus, Eye, Users, Wallet } from 'lucide-react'
import { createSupabaseClient } from '@/lib/supabase'
import { useUser } from '@/hooks/useUser'
import { formatLKR, formatDate } from '@/lib/utils'
import type { Campaign } from '@/types'

const STATUS_BADGE: Record<string, string> = {
  draft: 'bg-zinc-800 text-zinc-400',
  pending_payment: 'bg-amber-500/10 text-amber-400',
  active: 'bg-green-500/10 text-[#00E5A0]',
  paused: 'bg-orange-500/10 text-orange-400',
  completed: 'bg-blue-500/10 text-blue-400',
}

type CampaignTab = 'all' | 'active' | 'paused' | 'completed' | 'draft'

interface CampaignWithStats extends Campaign {
  tasks?: { total_views: number; total_earned: number }[]
}

export default function BrandCampaignsPage() {
  const { user, loading: userLoading } = useUser()
  const router = useRouter()
  const supabase = useMemo(() => createSupabaseClient(), [])

  const [campaigns, setCampaigns] = useState<CampaignWithStats[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<CampaignTab>('all')

  useEffect(() => {
    if (userLoading || !user) return
    const fetchData = async () => {
      setLoading(true)
      const { data: profile } = await supabase
        .from('brand_profiles')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle()
      if (!profile) { setLoading(false); return }

      const { data } = await supabase
        .from('campaigns')
        .select('*, tasks:tasks(total_views, total_earned)')
        .eq('brand_id', profile.id)
        .order('created_at', { ascending: false })
        .limit(200)
      setCampaigns((data as CampaignWithStats[]) ?? [])
      setLoading(false)
    }
    fetchData()
  }, [user, userLoading, supabase])

  const filtered = campaigns.filter((c) => tab === 'all' || c.status === tab)

  const tabs: { key: CampaignTab; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'active', label: 'Active' },
    { key: 'paused', label: 'Paused' },
    { key: 'completed', label: 'Completed' },
    { key: 'draft', label: 'Draft' },
  ]

  if (userLoading || loading) {
    return (
      <div className="font-sans animate-pulse flex flex-col gap-4">
        <div className="h-10 w-48 bg-zinc-800/50 rounded" />
        {[1, 2, 3].map((i) => <div key={i} className="h-28 bg-zinc-800/50 rounded" />)}
      </div>
    )
  }

  return (
    <div className="font-sans">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-syne text-3xl font-extrabold text-white">Campaigns</h1>
          <p className="text-zinc-500 text-sm mt-1">{campaigns.length} campaign{campaigns.length !== 1 ? 's' : ''} total</p>
        </div>
        <Link
          href="/brand/campaigns/create"
          className="flex items-center gap-2 bg-[#6C47FF] text-white px-4 py-2.5 text-sm font-semibold hover:bg-[#5538ee] transition-colors"
        >
          <Plus size={16} />
          New Campaign
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-zinc-800 mb-6">
        {tabs.map(({ key, label }) => {
          const count = key === 'all' ? campaigns.length : campaigns.filter((c) => c.status === key).length
          return (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`px-4 py-2.5 text-sm transition-colors flex items-center gap-2 ${
                tab === key ? 'text-white border-b-2 border-[#6C47FF] -mb-px' : 'text-zinc-400 hover:text-white'
              }`}
            >
              {label}
              {count > 0 && (
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${tab === key ? 'bg-[#6C47FF] text-white' : 'bg-zinc-800 text-zinc-400'}`}>
                  {count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {filtered.length === 0 ? (
        <div className="bg-[#111111] border border-zinc-800 p-16 text-center">
          <p className="text-zinc-500 text-sm mb-4">
            {tab === 'all' ? "You haven't created any campaigns yet." : `No ${tab} campaigns.`}
          </p>
          {tab === 'all' && (
            <Link
              href="/brand/campaigns/create"
              className="inline-flex items-center gap-2 bg-[#6C47FF] text-white px-5 py-2.5 text-sm font-semibold hover:bg-[#5538ee] transition-colors"
            >
              <Plus size={16} />
              Create Your First Campaign
            </Link>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {filtered.map((campaign) => {
            const totalViews = (campaign.tasks ?? []).reduce((s, t) => s + (t.total_views ?? 0), 0)
            const spent = campaign.budget_total - campaign.budget_remaining
            const pct = campaign.budget_total > 0 ? (spent / campaign.budget_total) * 100 : 0
            const barColor = pct > 90 ? 'bg-red-500' : pct > 70 ? 'bg-amber-500' : 'bg-[#00E5A0]'

            return (
              <div
                key={campaign.id}
                onClick={() => router.push(`/brand/campaigns/${campaign.id}`)}
                className="bg-[#111111] border border-zinc-800 p-5 cursor-pointer hover:border-zinc-700 transition-colors"
              >
                <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className={`text-xs px-2 py-0.5 capitalize ${STATUS_BADGE[campaign.status] ?? 'bg-zinc-800 text-zinc-400'}`}>
                        {campaign.status.replace('_', ' ')}
                      </span>
                      {campaign.target_platforms?.map((p) => (
                        <span key={p} className="text-xs bg-zinc-800 text-zinc-500 px-2 py-0.5 capitalize">{p}</span>
                      ))}
                    </div>
                    <h3 className="font-syne font-bold text-white text-lg truncate">{campaign.title}</h3>
                    <p className="text-sm text-zinc-500 mt-0.5">
                      {formatLKR(campaign.payout_rate)}/1K views · Created {formatDate(campaign.created_at)}
                    </p>

                    {/* Budget bar */}
                    <div className="mt-3">
                      <div className="flex justify-between text-xs text-zinc-500 mb-1">
                        <span>{formatLKR(spent)} spent</span>
                        <span>{formatLKR(campaign.budget_total)} budget</span>
                      </div>
                      <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
                        <div className={`h-full ${barColor} transition-all`} style={{ width: `${Math.min(pct, 100)}%` }} />
                      </div>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="flex sm:flex-col gap-4 sm:gap-2 shrink-0 sm:items-end">
                    <div className="flex items-center gap-1.5 text-zinc-400">
                      <Eye size={13} />
                      <span className="text-sm text-white font-medium">{totalViews.toLocaleString('en-LK')}</span>
                      <span className="text-xs">views</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-zinc-400">
                      <Users size={13} />
                      <span className="text-sm text-white font-medium">{(campaign.tasks ?? []).length}</span>
                      <span className="text-xs">creators</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-zinc-400">
                      <Wallet size={13} />
                      <span className="text-sm text-[#00E5A0] font-medium">{formatLKR(campaign.budget_remaining)}</span>
                      <span className="text-xs">left</span>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
