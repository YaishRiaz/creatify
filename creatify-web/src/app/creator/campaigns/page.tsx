'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { getBrowserClient } from '@/lib/supabase-browser'
import { Search, Filter, Clock, Zap, Users } from 'lucide-react'

interface Campaign {
  id: string
  title: string
  description: string
  payout_rate: number
  budget_total: number
  budget_remaining: number
  target_platforms: string[]
  end_date: string
  created_at: string
  tasks?: { id: string; total_views: number }[]
  brand?: { company_name: string }
}

export default function CreatorCampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [platform, setPlatform] = useState('all')

  useEffect(() => {
    const load = async () => {
      try {
        const supabase = getBrowserClient()

        const { data: { session } } =
          await supabase.auth.getSession()

        if (!session) {
          window.location.href = '/auth/login'
          return
        }

        const { data, error: fetchError } = await supabase
          .from('campaigns')
          .select(`
            id,
            title,
            description,
            payout_rate,
            budget_total,
            budget_remaining,
            target_platforms,
            end_date,
            created_at,
            tasks (id, total_views),
            brand:brand_profiles (company_name)
          `)
          .eq('status', 'active')
          .gt('budget_remaining', 0)
          .order('created_at', { ascending: false })

        if (fetchError) {
          console.error('Campaigns fetch error:', fetchError)
          setError('Failed to load campaigns: ' + fetchError.message)
        } else {
          setCampaigns(
            (data || []).map((c) => ({
              ...c,
              brand: Array.isArray(c.brand) ? (c.brand[0] ?? undefined) : c.brand,
            })) as Campaign[]
          )
        }
      } catch (err) {
        console.error('Unexpected error:', err)
        setError('Something went wrong.')
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [])

  const filtered = campaigns.filter(c => {
    const matchSearch = search === '' ||
      c.title.toLowerCase().includes(search.toLowerCase()) ||
      c.description?.toLowerCase().includes(search.toLowerCase())
    const matchPlatform = platform === 'all' ||
      c.target_platforms?.includes(platform)
    return matchSearch && matchPlatform
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="w-8 h-8 border-2 border-[#6C47FF]
        border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto">

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-black text-white mb-1">
          Browse Campaigns
        </h1>
        <p className="text-zinc-400">
          Pick a campaign, post your content, earn per view.
        </p>
      </div>

      {error && (
        <div className="bg-red-950/20 border border-red-800/30
        px-4 py-3 mb-6 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2
          -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            placeholder="Search campaigns..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-[#111111] border border-zinc-800
            text-white pl-9 pr-4 py-3 text-sm
            focus:outline-none focus:border-[#6C47FF]
            transition-colors"
          />
        </div>
        <div className="relative">
          <Filter size={16} className="absolute left-3 top-1/2
          -translate-y-1/2 text-zinc-500" />
          <select
            value={platform}
            onChange={e => setPlatform(e.target.value)}
            className="bg-[#111111] border border-zinc-800
            text-white pl-9 pr-8 py-3 text-sm
            focus:outline-none focus:border-[#6C47FF]
            appearance-none transition-colors"
          >
            <option value="all">All Platforms</option>
            <option value="tiktok">TikTok</option>
            <option value="instagram">Instagram</option>
            <option value="youtube">YouTube</option>
            <option value="facebook">Facebook</option>
          </select>
        </div>
      </div>

      {/* Results count */}
      <p className="text-zinc-500 text-sm mb-4">
        {filtered.length} campaign{filtered.length !== 1 ? 's' : ''} available
      </p>

      {/* Campaign Cards */}
      {filtered.length === 0 ? (
        <div className="bg-[#111111] border border-zinc-800
        p-16 text-center">
          <Search size={48} className="text-zinc-700 mx-auto mb-4" />
          <p className="text-zinc-400 mb-1">No campaigns found</p>
          <p className="text-zinc-600 text-sm">
            Try adjusting your filters or check back later.
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {filtered.map(campaign => {
            const creatorCount = campaign.tasks?.length || 0
            const totalViews = campaign.tasks?.reduce(
              (sum, t) => sum + (t.total_views || 0), 0
            ) || 0
            const budgetUsed = campaign.budget_total -
              campaign.budget_remaining
            const budgetPercent = Math.min(
              (budgetUsed / campaign.budget_total) * 100, 100
            )
            const daysLeft = Math.max(0, Math.ceil(
              (new Date(campaign.end_date).getTime() - Date.now()) /
              (1000 * 60 * 60 * 24)
            ))

            const urgencyBadge =
              budgetPercent > 80
                ? { text: '⚡ Almost full', cls: 'bg-red-500/10 text-red-400' }
              : daysLeft <= 3 && daysLeft > 0
                ? { text: `⏰ ${daysLeft}d left`, cls: 'bg-amber-500/10 text-amber-400' }
              : creatorCount === 0
                ? { text: '🆕 Be first', cls: 'bg-[#6C47FF]/10 text-[#6C47FF]' }
              : null

            return (
              <Link key={campaign.id}
                href={`/creator/campaigns/${campaign.id}`}
                className="block bg-[#111111] border border-zinc-800
                p-6 hover:border-zinc-600 transition-colors group relative">

                {/* Urgency badge */}
                {urgencyBadge && (
                  <span className={`absolute top-4 right-4
                  text-xs px-2 py-1 ${urgencyBadge.cls}`}>
                    {urgencyBadge.text}
                  </span>
                )}

                {/* Brand name */}
                {campaign.brand?.company_name && (
                  <p className="text-zinc-500 text-xs uppercase
                  tracking-wider mb-2">
                    {campaign.brand.company_name}
                  </p>
                )}

                {/* Title */}
                <h2 className="text-white font-bold text-lg mb-2
                group-hover:text-[#6C47FF] transition-colors pr-24">
                  {campaign.title}
                </h2>

                {/* Description */}
                <p className="text-zinc-400 text-sm mb-4
                line-clamp-2">
                  {campaign.description}
                </p>

                {/* Platform badges */}
                <div className="flex flex-wrap gap-2 mb-4">
                  {campaign.target_platforms?.map(p => (
                    <span key={p}
                      className="bg-zinc-900 border border-zinc-700
                      px-2 py-1 text-xs text-zinc-300 capitalize">
                      {p}
                    </span>
                  ))}
                </div>

                {/* Payout rate */}
                <div className="flex items-center gap-6 mb-4">
                  <div>
                    <p className="text-[#00E5A0] font-black text-xl">
                      LKR {campaign.payout_rate}
                    </p>
                    <p className="text-zinc-500 text-xs">
                      per 1,000 views
                    </p>
                  </div>
                  <div className="flex items-center gap-4
                  text-xs text-zinc-500">
                    <span className="flex items-center gap-1">
                      <Users size={12} />
                      {creatorCount} posting
                    </span>
                    {totalViews > 0 && (
                      <span className="flex items-center gap-1">
                        <Zap size={12} />
                        {totalViews >= 1000
                          ? `${(totalViews/1000).toFixed(1)}K`
                          : totalViews} views
                      </span>
                    )}
                    {daysLeft > 0 && (
                      <span className="flex items-center gap-1">
                        <Clock size={12} />
                        {daysLeft}d left
                      </span>
                    )}
                  </div>
                </div>

                {/* Budget progress bar */}
                <div>
                  <div className="flex justify-between
                  text-xs mb-1.5">
                    <span className="text-zinc-500">
                      Budget remaining
                    </span>
                    <span className={
                      budgetPercent > 80
                        ? 'text-red-400'
                        : 'text-[#00E5A0]'
                    }>
                      LKR {campaign.budget_remaining.toLocaleString()}
                    </span>
                  </div>
                  <div className="h-1.5 bg-zinc-800 w-full">
                    <div
                      className={`h-full transition-all ${
                        budgetPercent > 80
                          ? 'bg-red-500'
                          : budgetPercent > 50
                          ? 'bg-amber-500'
                          : 'bg-[#00E5A0]'
                      }`}
                      style={{ width: `${100 - budgetPercent}%` }}
                    />
                  </div>
                </div>

              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
