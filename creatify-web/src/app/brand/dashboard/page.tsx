'use client'
export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { getBrowserClient } from '@/lib/supabase-browser'
import { Eye, Megaphone, Wallet, TrendingDown, Plus } from 'lucide-react'

export default function BrandDashboard() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [brandName, setBrandName] = useState('')
  const [campaigns, setCampaigns] = useState<any[]>([])
  const [stats, setStats] = useState({
    activeCampaigns: 0,
    totalViews: 0,
    budgetSpent: 0,
    costPerView: 0,
  })

  useEffect(() => {
    const load = async () => {
      try {
        const supabase = getBrowserClient()
        const { data: { session } } = await supabase.auth.getSession()

        if (!session) {
          window.location.href = '/auth/login'
          return
        }

        const userId = session.user.id
        setBrandName(
          session.user.user_metadata?.company_name ||
          session.user.user_metadata?.full_name ||
          session.user.email || 'Brand'
        )

        // Get brand profile
        const { data: profile, error: profileError } = await supabase
          .from('brand_profiles')
          .select('id, company_name')
          .eq('user_id', userId)
          .maybeSingle()

        if (profileError) {
          setError('Failed to load profile. ' + profileError.message)
          setLoading(false)
          return
        }

        if (!profile) {
          // Create brand profile if missing
          const { data: newProfile, error: insertError } = await supabase
            .from('brand_profiles')
            .insert({
              user_id: userId,
              company_name: session.user.user_metadata?.company_name || '',
              industry: '',
            })
            .select()
            .single()

          if (insertError) {
            setError('Profile setup failed: ' + insertError.message)
            setLoading(false)
            return
          }

          if (newProfile?.company_name) {
            setBrandName(newProfile.company_name)
          }

          setLoading(false)
          return
        }

        if (profile.company_name) setBrandName(profile.company_name)

        // Get campaigns for this brand
        const { data: campaignData, error: campaignError } =
          await supabase
            .from('campaigns')
            .select(`
              id, title, status, budget_total,
              budget_remaining, payout_rate,
              created_at, end_date,
              tasks (id, total_views, total_earned)
            `)
            .eq('brand_id', profile.id)
            .order('created_at', { ascending: false })

        if (campaignError) {
          console.error('Campaigns error:', campaignError)
        }

        const data = campaignData || []
        setCampaigns(data)

        // Calculate stats
        const active = data.filter(c => c.status === 'active').length
        const views = data.reduce((sum: number, c: any) =>
          sum + (c.tasks?.reduce((s: number, t: any) =>
            s + (t.total_views || 0), 0) || 0), 0)
        const spent = data.reduce((sum: number, c: any) =>
          sum + (c.budget_total - (c.budget_remaining || 0)), 0)

        setStats({
          activeCampaigns: active,
          totalViews: views,
          budgetSpent: spent,
          costPerView: views > 0 ? spent / views * 1000 : 0,
        })

      } catch (err: any) {
        setError('Unexpected error: ' + err.message)
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [])

  const greeting = () => {
    const h = new Date().getHours()
    if (h < 12) return 'Good morning'
    if (h < 17) return 'Good afternoon'
    return 'Good evening'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="w-8 h-8 border-2 border-[#6C47FF]
        border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const statusColors: Record<string, string> = {
    active: 'text-[#00E5A0]',
    paused: 'text-amber-400',
    completed: 'text-blue-400',
    draft: 'text-zinc-500',
    pending_payment: 'text-yellow-400',
  }

  return (
    <div className="max-w-5xl mx-auto">

      {error && (
        <div className="bg-red-950/20 border border-red-800/30
        px-4 py-3 mb-6 text-sm text-red-400 flex
        justify-between items-center">
          <span>{error}</span>
          <button onClick={() => setError('')}
            className="text-red-600 hover:text-red-400 ml-4">✕</button>
        </div>
      )}

      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-3xl font-black text-white mb-1">
            {greeting()}, {brandName}
          </h1>
          <p className="text-zinc-400">
            Here&apos;s how your campaigns are performing.
          </p>
        </div>
        <Link href="/brand/campaigns/create"
          className="flex items-center gap-2 bg-[#6C47FF]
          text-white px-5 py-3 font-semibold text-sm
          hover:bg-[#5538ee] transition-colors">
          <Plus size={16} /> New Campaign
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Active Campaigns', value: stats.activeCampaigns.toString(), sub: `${campaigns.length} total`, icon: <Megaphone size={18} /> },
          { label: 'Views Delivered', value: stats.totalViews >= 1000 ? `${(stats.totalViews/1000).toFixed(1)}K` : stats.totalViews.toString(), sub: 'across all campaigns', icon: <Eye size={18} /> },
          { label: 'Budget Spent', value: `LKR ${stats.budgetSpent.toLocaleString()}`, sub: 'total across campaigns', icon: <Wallet size={18} /> },
          { label: 'Cost Per 1K Views', value: stats.costPerView > 0 ? `LKR ${stats.costPerView.toFixed(0)}` : '—', sub: 'lower is better', icon: <TrendingDown size={18} /> },
        ].map((stat, i) => (
          <div key={i} className="bg-[#111111] border border-zinc-800 p-5">
            <div className="text-[#6C47FF] mb-3">{stat.icon}</div>
            <p className="text-2xl font-black text-white mb-1">{stat.value}</p>
            <p className="text-zinc-400 text-sm">{stat.label}</p>
            <p className="text-zinc-600 text-xs mt-1">{stat.sub}</p>
          </div>
        ))}
      </div>

      {/* Campaigns table */}
      <div className="bg-[#111111] border border-zinc-800 p-6">
        <h2 className="text-lg font-bold text-white mb-4">
          Your Campaigns
          <span className="text-zinc-500 font-normal text-sm ml-2">
            ({campaigns.length})
          </span>
        </h2>

        {campaigns.length === 0 ? (
          <div className="text-center py-16">
            <Megaphone size={48} className="text-zinc-700 mx-auto mb-4" />
            <p className="text-zinc-400 mb-2">No campaigns yet</p>
            <p className="text-zinc-600 text-sm mb-6">
              Create your first campaign to start getting UGC content.
            </p>
            <Link href="/brand/campaigns/create"
              className="inline-flex items-center gap-2
              bg-[#6C47FF] text-white px-6 py-3
              font-semibold text-sm hover:bg-[#5538ee]">
              <Plus size={16} /> Create Campaign
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800">
                  {['Campaign', 'Status', 'Views', 'Budget Used', 'Remaining', ''].map(h => (
                    <th key={h} className="text-left py-3 px-4
                    text-zinc-400 font-medium text-xs
                    uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {campaigns.map(c => {
                  const views = c.tasks?.reduce((s: number, t: any) =>
                    s + (t.total_views || 0), 0) || 0
                  const spent = c.budget_total - (c.budget_remaining || 0)
                  return (
                    <tr key={c.id}
                      className="border-b border-zinc-800/50
                      hover:bg-zinc-900/50 transition-colors">
                      <td className="py-3 px-4">
                        <p className="text-white font-medium
                        line-clamp-1 max-w-48">{c.title}</p>
                        <p className="text-zinc-600 text-xs mt-0.5">
                          {new Date(c.created_at).toLocaleDateString('en-LK')}
                        </p>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`text-xs font-semibold capitalize
                          ${statusColors[c.status] || 'text-zinc-400'}`}>
                          {c.status?.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-[#00E5A0] font-semibold">
                        {views >= 1000 ? `${(views/1000).toFixed(1)}K` : views}
                      </td>
                      <td className="py-3 px-4 text-white">
                        LKR {spent.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-zinc-400">
                        LKR {(c.budget_remaining || 0).toLocaleString()}
                      </td>
                      <td className="py-3 px-4">
                        <Link href={`/brand/campaigns/${c.id}`}
                          className="text-[#6C47FF] hover:text-white
                          text-xs transition-colors">
                          View →
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
