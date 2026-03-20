'use client'

import { useEffect, useMemo, useState } from 'react'
import { Syne, DM_Sans } from 'next/font/google'
import { createSupabaseClient } from '@/lib/supabase'
import { useUser } from '@/hooks/useUser'
import { useToast } from '@/components/shared/Toast'
import SubmitURLModal from '@/components/creator/SubmitURLModal'
import { formatNumber, formatDate } from '@/lib/utils'
import type { Task, Campaign } from '@/types'

const syne = Syne({ subsets: ['latin'], weight: ['700', '800'] })
const dmSans = DM_Sans({ subsets: ['latin'] })

interface TaskWithCampaign extends Task {
  campaign: Pick<Campaign, 'id' | 'title' | 'payout_rate' | 'status' | 'brief' | 'hashtags'> & {
    brand: { company_name: string } | null
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

type TabKey = 'all' | 'action' | 'tracking' | 'completed'

const TABS: { key: TabKey; label: string }[] = [
  { key: 'all', label: 'All Tasks' },
  { key: 'action', label: 'Needs Action' },
  { key: 'tracking', label: 'Tracking' },
  { key: 'completed', label: 'Completed' },
]

function filterByTab(tasks: TaskWithCampaign[], tab: TabKey): TaskWithCampaign[] {
  switch (tab) {
    case 'action': return tasks.filter((t) => t.status === 'accepted')
    case 'tracking': return tasks.filter((t) => ['submitted', 'tracking'].includes(t.status))
    case 'completed': return tasks.filter((t) => ['completed', 'rejected'].includes(t.status))
    default: return tasks
  }
}

export default function CreatorTasksPage() {
  const { user, loading: userLoading } = useUser()
  const supabase = useMemo(() => createSupabaseClient(), [])
  const { toast } = useToast()

  const [tasks, setTasks] = useState<TaskWithCampaign[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<TabKey>('all')
  const [submitTask, setSubmitTask] = useState<TaskWithCampaign | null>(null)

  useEffect(() => {
    if (userLoading || !user) return
    const fetchData = async () => {
      setLoading(true)
      const { data: prof } = await supabase
        .from('creator_profiles').select('id').eq('user_id', user.id).single()
      if (!prof) { setLoading(false); return }

      const { data } = await supabase
        .from('tasks')
        .select('*, campaign:campaigns(id, title, payout_rate, status, brief, hashtags, brand:brand_profiles(company_name))')
        .eq('creator_id', prof.id)
        .order('created_at', { ascending: false })
      setTasks((data ?? []) as TaskWithCampaign[])
      setLoading(false)
    }
    fetchData()
  }, [user, userLoading, supabase])

  const visible = filterByTab(tasks, tab)

  const tabCounts: Record<TabKey, number> = {
    all: tasks.length,
    action: tasks.filter((t) => t.status === 'accepted').length,
    tracking: tasks.filter((t) => ['submitted', 'tracking'].includes(t.status)).length,
    completed: tasks.filter((t) => ['completed', 'rejected'].includes(t.status)).length,
  }

  if (loading || userLoading) {
    return (
      <div className={`${dmSans.className} animate-pulse flex flex-col gap-4`}>
        <div className="h-10 w-48 bg-zinc-800/50 rounded" />
        {[1,2,3].map(i => <div key={i} className="h-28 bg-zinc-800/50 rounded" />)}
      </div>
    )
  }

  return (
    <div className={dmSans.className}>
      <div className="mb-6">
        <h1 className={`${syne.className} text-3xl font-extrabold text-white`}>My Tasks</h1>
        <p className="text-zinc-500 text-sm mt-1 flex flex-wrap gap-x-3">
          <span>
            <span className="text-white font-medium">
              {tasks.filter((t) => ['accepted', 'submitted', 'tracking'].includes(t.status)).length}
            </span> active
          </span>
          <span className="text-zinc-700">·</span>
          <span>
            <span className="text-white font-medium">
              {tasks.filter((t) => t.status === 'completed').length}
            </span> completed
          </span>
          <span className="text-zinc-700">·</span>
          <span className="text-[#00E5A0] font-medium">
            LKR {tasks.reduce((s, t) => s + (t.total_earned ?? 0), 0).toLocaleString('en-LK')} earned
          </span>
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-zinc-800 mb-6">
        {TABS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-4 py-2.5 text-sm transition-colors flex items-center gap-2 ${
              tab === key
                ? 'text-white border-b-2 border-[#6C47FF] -mb-px'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            {label}
            {tabCounts[key] > 0 && (
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${tab === key ? 'bg-[#6C47FF] text-white' : 'bg-zinc-800 text-zinc-400'}`}>
                {tabCounts[key]}
              </span>
            )}
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <div className="bg-[#111111] border border-zinc-800 p-12 text-center">
          <p className="text-zinc-500 text-sm">
            {tab === 'all' ? 'You haven\'t accepted any campaigns yet.' : 'No tasks in this category.'}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {visible.map((task) => (
            <div key={task.id} className="bg-[#111111] border border-zinc-800 p-5">
              <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                {/* Left */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className={`text-xs px-2 py-0.5 capitalize ${PLATFORM_BADGE[task.platform] ?? 'bg-zinc-800 text-zinc-400'}`}>
                      {task.platform}
                    </span>
                    <span className={`text-xs px-2 py-0.5 capitalize ${TASK_STATUS_BADGE[task.status] ?? 'bg-zinc-800 text-zinc-400'}`}>
                      {task.status}
                    </span>
                  </div>
                  <p className="font-semibold text-white truncate">{task.campaign?.title ?? 'Campaign'}</p>
                  <p className="text-sm text-zinc-400">{task.campaign?.brand?.company_name ?? ''}</p>
                  {task.post_url && (
                    <a
                      href={task.post_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-[#6C47FF] hover:text-white transition-colors mt-1 block truncate"
                    >
                      {task.post_url}
                    </a>
                  )}
                  <p className="text-xs text-zinc-600 mt-1">Accepted {formatDate(task.created_at)}</p>
                </div>

                {/* Right */}
                <div className="flex flex-col items-end gap-2 shrink-0">
                  <div className="text-right">
                    <p className={`${syne.className} text-xl font-extrabold text-[#00E5A0]`}>
                      {formatNumber(task.total_views ?? 0)}
                    </p>
                    <p className="text-xs text-zinc-500">views</p>
                  </div>
                  <div className="text-right">
                    <p className={`${syne.className} text-lg font-extrabold text-[#00E5A0]`}>
                      LKR {(task.total_earned ?? 0).toLocaleString('en-LK')}
                    </p>
                    <p className="text-xs text-zinc-500">earned</p>
                  </div>
                  {task.status === 'accepted' && (
                    <button
                      onClick={() => setSubmitTask(task)}
                      className="text-xs bg-[#6C47FF] text-white px-3 py-1.5 hover:bg-[#5538ee] transition-colors"
                    >
                      Submit Post URL →
                    </button>
                  )}
                  {task.status === 'flagged' && (
                    <p className="text-xs text-red-400 text-right max-w-[160px]">
                      Your post has been flagged. Contact support.
                    </p>
                  )}
                </div>
              </div>

              {/* Tracking progress bar */}
              {['submitted', 'tracking'].includes(task.status) && task.campaign?.payout_rate && (
                <div className="mt-4 pt-4 border-t border-zinc-800">
                  <div className="flex justify-between text-xs text-zinc-500 mb-1">
                    <span>Payout rate: {(task.campaign.payout_rate).toLocaleString('en-LK')} LKR / 1K views</span>
                    {task.status === 'submitted' && <span className="text-blue-400">Awaiting verification</span>}
                    {task.status === 'tracking' && <span className="text-purple-400">Live tracking</span>}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {submitTask && submitTask.campaign && (
        <SubmitURLModal
          isOpen={true}
          onClose={() => setSubmitTask(null)}
          task={submitTask}
          campaign={submitTask.campaign as unknown as Campaign}
          onSuccess={(updated) => {
            setTasks((prev) => prev.map((t) => t.id === updated.id ? { ...t, ...updated } : t))
            setSubmitTask(null)
            toast('Post submitted! We\'ll start tracking within 6 hours.', 'success')
          }}
        />
      )}
    </div>
  )
}
