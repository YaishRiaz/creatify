'use client'

export const dynamic = 'force-dynamic'
export const runtime = 'edge'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { ChevronLeft, Eye, Users, Wallet, TrendingDown } from 'lucide-react'
import { createSupabaseClient } from '@/lib/supabase'
import { useUser } from '@/hooks/useUser'
import { formatNumber, formatLKR, formatDate, daysBetween } from '@/lib/utils'
import type { Campaign, Task } from '@/types'


const STATUS_BADGE: Record<string, string> = {
  draft: 'bg-zinc-800 text-zinc-400',
  pending_payment: 'bg-amber-500/10 text-amber-400',
  active: 'bg-green-500/10 text-[#00E5A0]',
  paused: 'bg-orange-500/10 text-orange-400',
  completed: 'bg-blue-500/10 text-blue-400',
}

const TASK_STATUS_BADGE: Record<string, string> = {
  accepted: 'bg-zinc-800 text-zinc-400',
  submitted: 'bg-amber-500/10 text-amber-400',
  tracking: 'bg-green-500/10 text-[#00E5A0]',
  flagged: 'bg-red-500/10 text-red-400',
  completed: 'bg-blue-500/10 text-blue-400',
  rejected: 'bg-zinc-800 text-zinc-500',
}

export default function CampaignDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { user, loading: userLoading } = useUser()
  const router = useRouter()
  const supabase = useMemo(() => createSupabaseClient(), [])

  const [campaign, setCampaign] = useState<Campaign | null>(null)
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [toggling, setToggling] = useState(false)

  const fetchData = async () => {
    if (!user) return
    setLoading(true)
    setError(null)

    const { data: profile } = await supabase
      .from('brand_profiles')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (!profile) {
      setError('Profile not found.')
      setLoading(false)
      return
    }

    const { data: camp, error: campErr } = await supabase
      .from('campaigns')
      .select('*')
      .eq('id', id)
      .eq('brand_id', profile.id)
      .single()

    if (campErr || !camp) {
      setError('Campaign not found.')
      setLoading(false)
      return
    }
    setCampaign(camp)

    const { data: taskData } = await supabase
      .from('tasks')
      .select('*')
      .eq('campaign_id', id)

    setTasks(taskData ?? [])
    setLoading(false)
  }

  useEffect(() => {
    if (!userLoading && user) fetchData()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, userLoading, id])

  const handleTogglePause = async () => {
    if (!campaign) return
    setToggling(true)
    const newStatus = campaign.status === 'active' ? 'paused' : 'active'
    const { error } = await supabase
      .from('campaigns')
      .update({ status: newStatus })
      .eq('id', campaign.id)

    if (!error) setCampaign({ ...campaign, status: newStatus })
    setToggling(false)
  }

  if (userLoading || loading) {
    return (
      <div className="font-sans animate-pulse">
        <div className="h-6 w-32 bg-zinc-800/50 rounded mb-6" />
        <div className="h-10 w-64 bg-zinc-800/50 rounded mb-4" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[1, 2, 3, 4].map((i) => <div key={i} className="h-28 bg-zinc-800/50 rounded" />)}
        </div>
      </div>
    )
  }

  if (error || !campaign) {
    return (
      <div className="font-sans">
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 text-sm mb-4">{error ?? 'Not found'}</div>
        <Link href="/brand/campaigns" className="text-zinc-400 hover:text-white text-sm transition-colors">← Back to Campaigns</Link>
      </div>
    )
  }

  const totalViews = tasks.reduce((s, t) => s + (t.total_views ?? 0), 0)
  const totalEarned = tasks.reduce((s, t) => s + (t.total_earned ?? 0), 0)
  const spent = campaign.budget_total - campaign.budget_remaining
  const pct = campaign.budget_total > 0 ? (spent / campaign.budget_total) * 100 : 0
  const barColor = pct > 90 ? 'bg-red-500' : pct > 70 ? 'bg-amber-500' : 'bg-[#00E5A0]'
  const days = campaign.start_date && campaign.end_date
    ? daysBetween(campaign.start_date, campaign.end_date)
    : null

  return (
    <div className="font-sans">
      {/* Back + Header */}
      <Link href="/brand/campaigns" className="inline-flex items-center gap-1 text-sm text-zinc-400 hover:text-white transition-colors mb-4">
        <ChevronLeft size={16} />
        Campaigns
      </Link>

      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="font-syne text-3xl font-extrabold text-white">{campaign.title}</h1>
          <span className={`text-xs px-2.5 py-1 capitalize ${STATUS_BADGE[campaign.status] ?? 'bg-zinc-800 text-zinc-400'}`}>
            {campaign.status.replace('_', ' ')}
          </span>
        </div>
        {(campaign.status === 'active' || campaign.status === 'paused') && (
          <button
            onClick={handleTogglePause}
            disabled={toggling}
            className="text-sm border border-zinc-700 text-zinc-300 px-4 py-2 hover:border-zinc-400 hover:text-white transition-all disabled:opacity-60"
          >
            {toggling ? 'Updating…' : campaign.status === 'active' ? 'Pause Campaign' : 'Resume Campaign'}
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Views', value: formatNumber(totalViews), icon: Eye, color: 'text-[#6C47FF]', bg: 'bg-[#6C47FF]/10' },
          { label: 'Creators', value: tasks.length, icon: Users, color: 'text-[#6C47FF]', bg: 'bg-[#6C47FF]/10' },
          { label: 'Budget Used', value: formatLKR(spent), icon: Wallet, color: 'text-[#6C47FF]', bg: 'bg-[#6C47FF]/10' },
          { label: 'Budget Remaining', value: formatLKR(campaign.budget_remaining), icon: TrendingDown, color: 'text-[#00E5A0]', bg: 'bg-green-500/10' },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="bg-[#111111] border border-zinc-800 p-5 flex flex-col gap-2">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-syne text-2xl font-extrabold text-white">{value}</p>
                <p className="text-xs text-zinc-400 mt-1">{label}</p>
              </div>
              <div className={`w-9 h-9 ${bg} flex items-center justify-center shrink-0`}>
                <Icon size={16} className={color} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Budget progress */}
      <div className="bg-[#111111] border border-zinc-800 p-6 mb-6">
        <div className="flex justify-between text-sm mb-2">
          <span className="text-zinc-400">Budget Progress</span>
          <span className="text-white font-medium">{pct.toFixed(1)}% used</span>
        </div>
        <div className="h-2 w-full bg-zinc-800 rounded-full overflow-hidden">
          <div className={`h-full ${barColor} transition-all`} style={{ width: `${Math.min(pct, 100)}%` }} />
        </div>
        <div className="flex justify-between text-xs text-zinc-500 mt-2">
          <span>{formatLKR(spent)} spent</span>
          <span>{formatLKR(campaign.budget_total)} total</span>
        </div>
      </div>

      {/* Campaign details */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Left: Brief */}
        <div className="bg-[#111111] border border-zinc-800 p-6 flex flex-col gap-5">
          <h2 className="font-syne font-bold text-white">Campaign Brief</h2>
          {campaign.brief && (
            <div>
              <p className="text-xs text-zinc-500 uppercase tracking-wider mb-2">Brief</p>
              <p className="text-sm text-zinc-300 leading-relaxed">{campaign.brief}</p>
            </div>
          )}
          {campaign.do_list && campaign.do_list.length > 0 && (
            <div>
              <p className="text-xs text-zinc-500 uppercase tracking-wider mb-2">Do&apos;s ✓</p>
              <ul className="flex flex-col gap-1">
                {campaign.do_list.map((item, i) => (
                  <li key={i} className="text-sm text-zinc-300 flex items-start gap-2">
                    <span className="text-[#00E5A0] mt-0.5">·</span>{item}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {campaign.dont_list && campaign.dont_list.length > 0 && (
            <div>
              <p className="text-xs text-zinc-500 uppercase tracking-wider mb-2">Don&apos;ts ✗</p>
              <ul className="flex flex-col gap-1">
                {campaign.dont_list.map((item, i) => (
                  <li key={i} className="text-sm text-zinc-300 flex items-start gap-2">
                    <span className="text-red-400 mt-0.5">·</span>{item}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {campaign.hashtags && campaign.hashtags.length > 0 && (
            <div>
              <p className="text-xs text-zinc-500 uppercase tracking-wider mb-2">Hashtags</p>
              <div className="flex flex-wrap gap-1.5">
                {campaign.hashtags.map((h, i) => (
                  <span key={i} className="text-xs bg-[#6C47FF]/10 text-[#6C47FF] border border-[#6C47FF]/20 px-2 py-0.5">{h}</span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right: Info */}
        <div className="bg-[#111111] border border-zinc-800 p-6 flex flex-col gap-5">
          <h2 className="font-syne font-bold text-white">Campaign Info</h2>
          <div className="flex flex-col gap-4">
            <div>
              <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Payout Rate</p>
              <p className="text-sm text-white">{formatLKR(campaign.payout_rate)} per 1,000 views</p>
            </div>
            {campaign.start_date && campaign.end_date && (
              <div>
                <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Duration</p>
                <p className="text-sm text-white">{formatDate(campaign.start_date)} → {formatDate(campaign.end_date)}</p>
                {days !== null && <p className="text-xs text-zinc-500 mt-0.5">{days} days</p>}
              </div>
            )}
            <div>
              <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Platforms</p>
              <div className="flex flex-wrap gap-1.5">
                {campaign.target_platforms.map((p) => (
                  <span key={p} className="text-xs bg-zinc-800 text-zinc-400 px-2 py-0.5 capitalize">{p}</span>
                ))}
              </div>
            </div>
            {campaign.per_creator_cap && (
              <div>
                <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Per Creator Cap</p>
                <p className="text-sm text-white">{formatLKR(campaign.per_creator_cap)}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Submissions table */}
      <div className="bg-[#111111] border border-zinc-800">
        <div className="px-6 py-4 border-b border-zinc-800 flex items-center gap-3">
          <h2 className="font-syne font-bold text-white text-lg">Creator Submissions</h2>
          <span className="text-xs bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded-full">{tasks.length}</span>
        </div>

        {tasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center px-6">
            <p className="text-white font-medium mb-2">No submissions yet</p>
            <p className="text-sm text-zinc-500 max-w-sm">Creators will start posting once they discover your campaign.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800">
                  {['Creator', 'Platform', 'Views', 'Earned', 'Status', 'Actions'].map((h) => (
                    <th key={h} className="px-6 py-3 text-left text-xs text-zinc-500 uppercase tracking-wider font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/50">
                {tasks.map((t) => (
                  <tr key={t.id} className="hover:bg-zinc-800/20 transition-colors">
                    <td className="px-6 py-4 text-zinc-400 text-xs font-mono">{t.creator_id.slice(0, 8)}…</td>
                    <td className="px-6 py-4">
                      <span className="text-xs bg-zinc-800 text-zinc-400 px-2 py-0.5 capitalize">{t.platform}</span>
                    </td>
                    <td className="px-6 py-4 text-[#00E5A0] font-medium">{formatNumber(t.total_views ?? 0)}</td>
                    <td className="px-6 py-4 text-[#00E5A0]">{formatLKR(t.total_earned ?? 0)}</td>
                    <td className="px-6 py-4">
                      <span className={`text-xs px-2.5 py-1 capitalize ${TASK_STATUS_BADGE[t.status] ?? 'bg-zinc-800 text-zinc-400'}`}>
                        {t.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {t.post_url && (
                          <a
                            href={t.post_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-zinc-300 border border-zinc-700 px-3 py-1.5 hover:border-zinc-400 hover:text-white transition-all"
                          >
                            View Post
                          </a>
                        )}
                        {t.status === 'tracking' && (
                          <button className="text-xs text-red-400 border border-red-500/30 px-3 py-1.5 hover:bg-red-500/10 transition-all">
                            Flag
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Total earned */}
      {tasks.length > 0 && (
        <div className="mt-4 text-right text-sm text-zinc-500">
          Total earned by creators: <span className="text-[#00E5A0] font-medium">{formatLKR(totalEarned)}</span>
        </div>
      )}
    </div>
  )
}
