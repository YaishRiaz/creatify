'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Eye, Zap, CheckCircle, Search } from 'lucide-react'
import { createSupabaseClient } from '@/lib/supabase'
import { useUser } from '@/hooks/useUser'
import { useToast } from '@/components/shared/Toast'
import SubmitURLModal from '@/components/creator/SubmitURLModal'
import { formatNumber, formatDate, getGreeting } from '@/lib/utils'
import { ONBOARDING_CAMPAIGN_ID } from '@/lib/onboarding'
import type { Task, Campaign } from '@/types'


interface CreatorProfile {
  id: string
  wallet_balance: number
  total_earned: number
}

interface TaskWithCampaign extends Task {
  campaign: Pick<Campaign, 'id' | 'title' | 'payout_rate' | 'status' | 'brief' | 'hashtags'> & {
    brand: { company_name: string } | null
  } | null
}

interface Snapshot {
  id: string
  task_id: string
  delta_views: number
  earnings_added: number
  snapshotted_at: string
  task: {
    platform: string
    post_url: string | null
    campaign: { title: string } | null
  } | null
}

const TASK_STATUS_BADGE: Record<string, string> = {
  accepted: 'bg-zinc-800 text-zinc-300',
  submitted: 'bg-blue-500/10 text-blue-400',
  tracking: 'bg-purple-500/10 text-purple-400',
  flagged: 'bg-red-500/10 text-red-400',
  completed: 'bg-green-500/10 text-[#00E5A0]',
  rejected: 'bg-red-900/20 text-red-500',
}

const PLATFORM_BADGE: Record<string, string> = {
  tiktok: 'bg-pink-500/10 text-pink-400',
  instagram: 'bg-orange-500/10 text-orange-400',
  youtube: 'bg-red-500/10 text-red-400',
  facebook: 'bg-blue-500/10 text-blue-400',
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const h = Math.floor(diff / 3600000)
  if (h < 1) return 'just now'
  if (h < 24) return `${h} hour${h > 1 ? 's' : ''} ago`
  const d = Math.floor(h / 24)
  return `${d} day${d > 1 ? 's' : ''} ago`
}

export default function CreatorDashboard() {
  const { user, loading: userLoading } = useUser()
  const supabase = useMemo(() => createSupabaseClient(), [])
  const { toast } = useToast()

  const [profile, setProfile] = useState<CreatorProfile | null>(null)
  const [tasks, setTasks] = useState<TaskWithCampaign[]>([])
  const [snapshots, setSnapshots] = useState<Snapshot[]>([])
  const [activeCampaignCount, setActiveCampaignCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [submitTask, setSubmitTask] = useState<TaskWithCampaign | null>(null)
  const [onboardingTask, setOnboardingTask] = useState<Task | null | undefined>(undefined)

  useEffect(() => {
    if (userLoading || !user) return
    const fetchAll = async () => {
      setLoading(true); setError(null)

      let { data: prof } = await supabase
        .from('creator_profiles').select('id, wallet_balance, total_earned')
        .eq('user_id', user.id).maybeSingle()
      if (!prof) {
        const { data: newProf } = await supabase
          .from('creator_profiles')
          .insert({ user_id: user.id, platforms: {}, wallet_balance: 0, total_earned: 0, is_suspended: false })
          .select('id, wallet_balance, total_earned')
          .single()
        prof = newProf
      }
      if (!prof) { setError('Failed to load profile.'); setLoading(false); return }
      setProfile({ ...prof, wallet_balance: prof.wallet_balance ?? 0, total_earned: prof.total_earned ?? 0 })

      // Fetch tasks, active campaign count, and onboarding task in parallel
      const [
        { data: taskData, error: taskErr },
        { count },
        { data: obTask },
      ] = await Promise.all([
        supabase
          .from('tasks')
          .select('*, campaign:campaigns(id, title, payout_rate, status, brief, hashtags, brand:brand_profiles(company_name))')
          .eq('creator_id', prof.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('campaigns')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'active')
          .eq('is_onboarding', false),
        supabase
          .from('tasks')
          .select('id, status, campaign_id, creator_id, platform, post_url, accepted_at, created_at, total_views, total_earned, fraud_score')
          .eq('campaign_id', ONBOARDING_CAMPAIGN_ID)
          .eq('creator_id', prof.id)
          .maybeSingle(),
      ])

      if (taskErr) { setError('Failed to load tasks.'); setLoading(false); return }
      const typedTasks = (taskData ?? []) as TaskWithCampaign[]
      setTasks(typedTasks)
      setActiveCampaignCount(count ?? 0)
      setOnboardingTask(obTask as Task | null)

      const taskIds = typedTasks.map((t) => t.id)
      if (taskIds.length > 0) {
        const { data: snapData } = await supabase
          .from('view_snapshots')
          .select('*, task:tasks(platform, post_url, campaign:campaigns(title))')
          .in('task_id', taskIds)
          .order('snapshotted_at', { ascending: false })
          .limit(10)
        setSnapshots((snapData ?? []) as Snapshot[])
      }

      setLoading(false)
    }
    fetchAll()
  }, [user, userLoading, supabase])

  if (userLoading || loading) {
    return (
      <div className="font-sans animate-pulse flex flex-col gap-6">
        <div className="h-10 w-64 bg-zinc-800/50 rounded" />
        <div className="h-40 bg-zinc-800/50 rounded" />
        <div className="grid grid-cols-3 gap-4">{[1,2,3].map(i => <div key={i} className="h-28 bg-zinc-800/50 rounded" />)}</div>
      </div>
    )
  }

  const walletBalance = profile?.wallet_balance ?? 0
  const totalEarned = profile?.total_earned ?? 0
  const totalViews = tasks.reduce((s, t) => s + (t.total_views ?? 0), 0)
  const activeTasks = tasks.filter((t) => ['accepted', 'submitted', 'tracking'].includes(t.status))
  const completedTasks = tasks.filter((t) => t.status === 'completed')
  const trackingTasks = tasks.filter((t) => ['submitted', 'tracking'].includes(t.status))

  return (
    <div className="font-sans">
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 text-sm mb-6">{error}</div>
      )}

      {/* Onboarding banner */}
      {onboardingTask === null && (
        <div className="bg-[#6C47FF]/5 border border-[#6C47FF]/40 p-5 mb-6 flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex-1">
            <p className="font-syne font-bold text-white mb-1">🎬 One task before you start</p>
            <p className="text-sm text-zinc-400">Post a video about Creatify to unlock all campaigns. Takes 5 minutes.</p>
          </div>
          <Link href="/creator/campaigns" className="text-sm bg-[#6C47FF] text-white px-5 py-2.5 hover:bg-[#5538ee] transition-colors shrink-0">
            Complete Onboarding →
          </Link>
        </div>
      )}
      {onboardingTask?.status === 'accepted' && (
        <div className="bg-amber-500/5 border border-amber-500/30 p-5 mb-6 flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex-1">
            <p className="font-syne font-bold text-amber-300 mb-1">⚠ Submit your Creatify video URL</p>
            <p className="text-sm text-zinc-400">You accepted the onboarding task. Post your video then submit the URL to unlock campaigns.</p>
          </div>
          <Link href="/creator/campaigns" className="text-sm bg-amber-500 text-black px-5 py-2.5 hover:bg-amber-400 transition-colors shrink-0 font-semibold">
            Submit URL →
          </Link>
        </div>
      )}
      {onboardingTask?.status === 'submitted' && (
        <div className="bg-blue-500/5 border border-blue-500/20 p-5 mb-6 flex items-center gap-4">
          <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse shrink-0" />
          <div>
            <p className="text-sm font-medium text-white">Your Creatify video is under review</p>
            <p className="text-xs text-zinc-500 mt-0.5">Campaigns will unlock once our team verifies your video (within 24 hours).</p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="mb-6">
        <h1 className="font-syne text-3xl font-extrabold text-white">
          {getGreeting()}, {user?.full_name}
        </h1>
        <p className="text-zinc-500 text-sm mt-1">Here&apos;s how your content is performing.</p>
      </div>

      {/* Wallet hero */}
      <div className="bg-[#111111] border border-zinc-800 p-6 md:p-8 mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
        <div>
          <p className="text-xs text-zinc-400 uppercase tracking-wider mb-2">Available to Cash Out</p>
          <p className="font-syne text-4xl md:text-5xl font-extrabold text-[#00E5A0] break-all">
            LKR {walletBalance.toLocaleString('en-LK')}
          </p>
          {walletBalance >= 500 ? (
            <Link
              href="/creator/wallet"
              className="inline-block mt-4 bg-[#00E5A0] text-black px-6 py-3 text-sm font-semibold hover:bg-[#00c98e] transition-colors"
            >
              Request Cashout
            </Link>
          ) : (
            <p className="text-zinc-500 text-sm mt-3">
              LKR {Math.round((500 - walletBalance) * 100) / 100} more until cashout
            </p>
          )}
        </div>
        <div className="text-right md:border-l md:border-zinc-800 md:pl-8">
          <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Lifetime Earned</p>
          <p className="font-syne text-2xl font-extrabold text-zinc-300">
            LKR {totalEarned.toLocaleString('en-LK')}
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {[
          { icon: Eye, label: 'Total Views Generated', value: formatNumber(totalViews), sub: 'across all posts', color: 'text-[#6C47FF]', bg: 'bg-[#6C47FF]/10' },
          { icon: Zap, label: 'Active Tasks', value: activeTasks.length, sub: 'currently running', color: 'text-[#6C47FF]', bg: 'bg-[#6C47FF]/10' },
          { icon: CheckCircle, label: 'Completed', value: completedTasks.length, sub: `${tasks.length} total tasks`, color: 'text-[#00E5A0]', bg: 'bg-green-500/10' },
        ].map(({ icon: Icon, label, value, sub, color, bg }) => (
          <div key={label} className="bg-[#111111] border border-zinc-800 p-6 flex flex-col gap-2">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-syne text-3xl font-extrabold text-white">{value}</p>
                <p className="text-sm text-zinc-400 mt-1">{label}</p>
              </div>
              <div className={`w-10 h-10 ${bg} flex items-center justify-center shrink-0`}>
                <Icon size={18} className={color} />
              </div>
            </div>
            <p className="text-xs text-zinc-500">{sub}</p>
          </div>
        ))}
      </div>

      {/* Active tasks — tracking/submitted only */}
      {trackingTasks.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <h2 className="font-syne font-bold text-white text-lg">Currently Tracking</h2>
            <span className="text-xs bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded-full">{trackingTasks.length}</span>
          </div>
          <div className="flex flex-col gap-3">
            {trackingTasks.map((t) => (
              <div key={t.id} className="bg-[#111111] border border-zinc-800 p-5 flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-white truncate">{t.campaign?.title ?? 'Campaign'}</p>
                  <p className="text-sm text-zinc-400">{t.campaign?.brand?.company_name ?? ''}</p>
                  <span className={`inline-block text-xs px-2 py-0.5 mt-1 capitalize ${PLATFORM_BADGE[t.platform] ?? 'bg-zinc-800 text-zinc-400'}`}>{t.platform}</span>
                </div>
                <div className="text-center">
                  <p className="font-syne text-2xl font-extrabold text-[#00E5A0]">{formatNumber(t.total_views ?? 0)}</p>
                  <p className="text-xs text-zinc-500">views</p>
                </div>
                <div className="text-right">
                  <p className="font-syne text-xl font-extrabold text-[#00E5A0]">LKR {(t.total_earned ?? 0).toLocaleString('en-LK')}</p>
                  <p className="text-xs text-zinc-500 mb-1">earned</p>
                  <span className={`text-xs px-2 py-0.5 capitalize ${TASK_STATUS_BADGE[t.status] ?? 'bg-zinc-800 text-zinc-400'}`}>{t.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Accepted but no URL submitted */}
      {tasks.filter((t) => t.status === 'accepted').map((t) => (
        <div key={t.id} className="bg-amber-500/5 border border-amber-500/20 p-4 mb-3 flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex-1">
            <p className="text-sm font-medium text-amber-300">⚠ You accepted this task but haven&apos;t submitted your post URL yet.</p>
            <p className="text-xs text-zinc-400 mt-0.5">{t.campaign?.title}</p>
          </div>
          <button
            onClick={() => setSubmitTask(t)}
            className="text-sm bg-[#6C47FF] text-white px-4 py-2 hover:bg-[#5538ee] transition-colors shrink-0"
          >
            Submit URL →
          </button>
        </div>
      ))}

      {/* Discovery prompt */}
      {activeTasks.length < 3 && (
        <div className="bg-[#6C47FF]/5 border border-[#6C47FF]/20 p-6 flex flex-col sm:flex-row sm:items-center gap-4 mb-8">
          <Search size={24} className="text-[#6C47FF] shrink-0" />
          <div className="flex-1">
            <p className="font-semibold text-white">{activeCampaignCount} campaigns are live right now</p>
            <p className="text-sm text-zinc-400 mt-0.5">Start earning by picking up a new task</p>
          </div>
          <Link
            href="/creator/campaigns"
            className="text-sm bg-[#6C47FF] text-white px-5 py-2.5 hover:bg-[#5538ee] transition-colors shrink-0"
          >
            Browse Campaigns →
          </Link>
        </div>
      )}

      {/* Recent earnings feed */}
      <div>
        <h2 className="font-syne font-bold text-white text-lg mb-4">Recent Earnings</h2>
        {snapshots.length === 0 ? (
          <div className="bg-[#111111] border border-zinc-800 p-8 text-center">
            <p className="text-zinc-500 text-sm">Your earnings will appear here as views come in.</p>
          </div>
        ) : (
          <div className="bg-[#111111] border border-zinc-800 divide-y divide-zinc-800/50">
            {snapshots.map((s) => (
              <div key={s.id} className="px-5 py-4 flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className={`text-xs px-2 py-0.5 capitalize ${PLATFORM_BADGE[s.task?.platform ?? ''] ?? 'bg-zinc-800 text-zinc-400'}`}>
                      {s.task?.platform}
                    </span>
                    <span className="text-sm text-zinc-300 truncate">{s.task?.campaign?.title}</span>
                  </div>
                  <p className="text-xs text-zinc-500">{timeAgo(s.snapshotted_at)}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm text-zinc-300">+{formatNumber(s.delta_views)} views</p>
                  <p className="text-sm font-semibold text-[#00E5A0]">+LKR {(s.earnings_added ?? 0).toLocaleString('en-LK')}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Submit URL Modal */}
      {submitTask && submitTask.campaign && (
        <SubmitURLModal
          isOpen={true}
          onClose={() => setSubmitTask(null)}
          task={submitTask}
          campaign={submitTask.campaign}
          onSuccess={(updated) => {
            setTasks((prev) => prev.map((t) => t.id === updated.id ? { ...t, ...updated } : t))
            setSubmitTask(null)
          }}
        />
      )}
    </div>
  )
}
