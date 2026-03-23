'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { getBrowserClient } from '@/lib/supabase-browser'
import {
  ArrowLeft, Eye, Users,
  Wallet, TrendingUp, ExternalLink
} from 'lucide-react'

interface Campaign {
  id: string
  title: string
  description: string
  brief: string
  do_list: string[]
  dont_list: string[]
  hashtags: string[]
  budget_total: number
  budget_remaining: number
  payout_rate: number
  per_creator_cap: number
  target_platforms: string[]
  status: string
  start_date: string
  end_date: string
  created_at: string
}

interface Task {
  id: string
  status: string
  platform: string
  post_url: string
  total_views: number
  total_earned: number
  fraud_score: number
  creator_id: string
}

export default function CampaignDetailPage() {
  const params = useParams()
  const router = useRouter()
  const campaignId = params.id as string

  const [campaign, setCampaign] = useState<Campaign | null>(null)
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchData = async () => {
      try {
        const supabase = getBrowserClient()

        const { data: { session } } =
          await supabase.auth.getSession()

        if (!session) {
          router.push('/auth/login')
          return
        }

        // Fetch campaign
        const { data: campaignData, error: campaignError } =
          await supabase
            .from('campaigns')
            .select('*')
            .eq('id', campaignId)
            .maybeSingle()

        if (campaignError) {
          console.error('Campaign fetch error:', campaignError)
          setError('Failed to load campaign: ' + campaignError.message)
          setLoading(false)
          return
        }

        if (!campaignData) {
          setError('Campaign not found.')
          setLoading(false)
          return
        }

        setCampaign(campaignData)

        // Fetch tasks for this campaign
        const { data: tasksData, error: tasksError } =
          await supabase
            .from('tasks')
            .select('*')
            .eq('campaign_id', campaignId)
            .order('created_at', { ascending: false })

        if (tasksError) {
          console.error('Tasks fetch error:', tasksError)
        }

        setTasks(tasksData || [])
        setLoading(false)

      } catch (err) {
        console.error('Unexpected error:', err)
        setError('Something went wrong loading this campaign.')
        setLoading(false)
      }
    }

    if (campaignId) {
      fetchData()
    }
  }, [campaignId])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="w-8 h-8 border-2 border-[#6C47FF] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-5xl mx-auto">
        <Link href="/brand/campaigns"
          className="flex items-center gap-2 text-zinc-400 hover:text-white mb-6 text-sm transition-colors">
          <ArrowLeft size={16} /> Back to Campaigns
        </Link>
        <div className="bg-red-950/20 border border-red-800/30 p-8 text-center">
          <p className="text-red-400 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="text-zinc-400 hover:text-white text-sm"
          >
            Try again
          </button>
        </div>
      </div>
    )
  }

  if (!campaign) return null

  const budgetSpent = campaign.budget_total - campaign.budget_remaining
  const budgetPercent = (budgetSpent / campaign.budget_total) * 100
  const totalViews = tasks.reduce((sum, t) => sum + (t.total_views || 0), 0)

  const statusColors: Record<string, string> = {
    active: 'bg-green-500/10 text-[#00E5A0]',
    paused: 'bg-orange-500/10 text-orange-400',
    completed: 'bg-blue-500/10 text-blue-400',
    draft: 'bg-zinc-800 text-zinc-400',
    pending_payment: 'bg-amber-500/10 text-amber-400',
  }

  return (
    <div className="max-w-5xl mx-auto">

      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <Link href="/brand/campaigns"
            className="flex items-center gap-2 text-zinc-400 hover:text-white mb-4 text-sm transition-colors">
            <ArrowLeft size={16} /> Back to Campaigns
          </Link>
          <h1 className="text-3xl font-black text-white mb-2">
            {campaign.title}
          </h1>
          <div className="flex items-center gap-3">
            <span className={`text-xs px-2 py-1 ${
              statusColors[campaign.status] ||
              'bg-zinc-800 text-zinc-400'
            }`}>
              {campaign.status.replace('_', ' ').toUpperCase()}
            </span>
            <span className="text-zinc-500 text-sm">
              Created {new Date(campaign.created_at)
                .toLocaleDateString('en-LK')}
            </span>
          </div>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          {
            label: 'Total Views',
            value: totalViews.toLocaleString(),
            icon: <Eye size={18} />,
            color: 'text-[#6C47FF]'
          },
          {
            label: 'Creators',
            value: tasks.length.toString(),
            icon: <Users size={18} />,
            color: 'text-[#6C47FF]'
          },
          {
            label: 'Budget Used',
            value: `LKR ${budgetSpent.toLocaleString()}`,
            icon: <Wallet size={18} />,
            color: 'text-[#6C47FF]'
          },
          {
            label: 'Remaining',
            value: `LKR ${campaign.budget_remaining.toLocaleString()}`,
            icon: <TrendingUp size={18} />,
            color: 'text-[#00E5A0]'
          },
        ].map((stat, i) => (
          <div key={i} className="bg-[#111111] border border-zinc-800 p-5">
            <div className={`mb-3 ${stat.color}`}>
              {stat.icon}
            </div>
            <p className="text-2xl font-black text-white mb-1">
              {stat.value}
            </p>
            <p className="text-zinc-500 text-xs">
              {stat.label}
            </p>
          </div>
        ))}
      </div>

      {/* Budget Progress */}
      <div className="bg-[#111111] border border-zinc-800 p-6 mb-6">
        <div className="flex justify-between text-sm mb-3">
          <span className="text-zinc-400">Budget Progress</span>
          <span className="text-white font-semibold">
            {budgetPercent.toFixed(1)}% used
          </span>
        </div>
        <div className="h-2 bg-zinc-800 w-full">
          <div
            className={`h-full transition-all ${
              budgetPercent > 90 ? 'bg-red-500' :
              budgetPercent > 70 ? 'bg-amber-500' :
              'bg-[#00E5A0]'
            }`}
            style={{ width: `${Math.min(budgetPercent, 100)}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-zinc-500 mt-2">
          <span>LKR {budgetSpent.toLocaleString()} spent</span>
          <span>LKR {campaign.budget_total.toLocaleString()} total</span>
        </div>
      </div>

      {/* Campaign Details */}
      <div className="grid md:grid-cols-2 gap-6 mb-6">

        <div className="bg-[#111111] border border-zinc-800 p-6">
          <h2 className="text-sm uppercase tracking-wider text-zinc-500 mb-4">Campaign Brief</h2>
          <p className="text-zinc-300 text-sm leading-relaxed whitespace-pre-wrap">
            {campaign.brief || campaign.description ||
             'No brief provided.'}
          </p>
        </div>

        <div className="bg-[#111111] border border-zinc-800 p-6">
          <h2 className="text-sm uppercase tracking-wider text-zinc-500 mb-4">Details</h2>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-zinc-500">Payout rate</span>
              <span className="text-white">
                LKR {campaign.payout_rate} / 1K views
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">Platforms</span>
              <span className="text-white">
                {campaign.target_platforms?.join(', ') || '—'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">End date</span>
              <span className="text-white">
                {campaign.end_date
                  ? new Date(campaign.end_date)
                    .toLocaleDateString('en-LK')
                  : '—'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">Per creator cap</span>
              <span className="text-white">
                {campaign.per_creator_cap
                  ? `LKR ${campaign.per_creator_cap.toLocaleString()}`
                  : 'No cap'}
              </span>
            </div>
          </div>

          {/* Hashtags */}
          {campaign.hashtags?.length > 0 && (
            <div className="mt-4">
              <p className="text-zinc-500 text-xs mb-2">
                Required Hashtags
              </p>
              <div className="flex flex-wrap gap-2">
                {campaign.hashtags.map((tag: string) => (
                  <span key={tag}
                    className="bg-zinc-900 border border-zinc-700 px-2 py-1 text-xs text-zinc-300">
                    #{tag.replace('#', '')}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Submissions Table */}
      <div className="bg-[#111111] border border-zinc-800 p-6">
        <h2 className="text-lg font-bold text-white mb-4">
          Creator Submissions
          <span className="text-zinc-500 font-normal text-sm ml-2">({tasks.length})</span>
        </h2>

        {tasks.length === 0 ? (
          <div className="text-center py-12">
            <Users size={48} className="text-zinc-700 mx-auto mb-4" />
            <p className="text-zinc-400 mb-1">
              No submissions yet
            </p>
            <p className="text-zinc-600 text-sm">
              Creators will start posting once they
              discover your campaign.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800">
                  <th className="text-left py-3 px-4 text-zinc-400 font-medium text-xs uppercase tracking-wider">Platform</th>
                  <th className="text-left py-3 px-4 text-zinc-400 font-medium text-xs uppercase tracking-wider">Views</th>
                  <th className="text-left py-3 px-4 text-zinc-400 font-medium text-xs uppercase tracking-wider">Earned</th>
                  <th className="text-left py-3 px-4 text-zinc-400 font-medium text-xs uppercase tracking-wider">Status</th>
                  <th className="text-left py-3 px-4 text-zinc-400 font-medium text-xs uppercase tracking-wider">Post</th>
                </tr>
              </thead>
              <tbody>
                {tasks.map((task) => (
                  <tr key={task.id}
                    className="border-b border-zinc-800/50 hover:bg-zinc-900/50">
                    <td className="py-3 px-4">
                      <span className="capitalize text-zinc-300">
                        {task.platform}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-[#00E5A0] font-semibold">
                      {(task.total_views || 0).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-[#00E5A0]">
                      LKR {(task.total_earned || 0).toLocaleString()}
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-xs px-2 py-1 bg-zinc-800 text-zinc-300 capitalize">
                        {task.status}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {task.post_url ? (
                        <a href={task.post_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[#6C47FF] hover:text-white flex items-center gap-1 transition-colors">
                          View <ExternalLink size={12} />
                        </a>
                      ) : (
                        <span className="text-zinc-600">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
