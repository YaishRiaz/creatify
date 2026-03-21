'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Search, ChevronDown, ChevronRight, ExternalLink, CheckSquare, Square } from 'lucide-react'
import { format, formatDistanceToNow, differenceInDays } from 'date-fns'
import { useUser } from '@/hooks/useUser'
import { createSupabaseClient } from '@/lib/supabase'
import { logAdminAction } from '@/lib/audit'
import ConfirmModal from '@/components/admin/ConfirmModal'
import AdminBadge from '@/components/admin/AdminBadge'


function maskNIC(nic: string | undefined): string {
  if (!nic || nic.length < 5) return nic ?? '—'
  return nic.slice(0, 3) + '***' + nic.slice(-2)
}

function fraudBadgeClass(score: number): string {
  if (score >= 90) return 'bg-red-500/20 text-red-400 border border-red-500/30'
  if (score >= 80) return 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
  return 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
}

interface Snapshot {
  delta_views: number
  earnings_added: number
  snapshotted_at: string
}

interface FlaggedTask {
  id: string
  creator_id: string
  platform: string
  post_url?: string
  total_views: number
  fraud_score: number
  created_at: string
  campaign?: {
    title: string
    payout_rate: number
    brand?: { company_name: string }
  }
  creator?: {
    nic_number?: string
    wallet_balance: number
    is_suspended: boolean
    user?: { full_name: string; email: string; created_at: string }
  }
  snapshots?: Snapshot[]
}

type ModalType = 'approve' | 'reject' | 'suspend' | null

export default function FraudQueuePage() {
  const { user, loading } = useUser()
  const router = useRouter()

  const [tasks, setTasks] = useState<FlaggedTask[]>([])
  const [filteredTasks, setFilteredTasks] = useState<FlaggedTask[]>([])
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState<'score_desc' | 'score_asc' | 'date_desc'>('score_desc')
  const [expandedSnapshots, setExpandedSnapshots] = useState<Record<string, boolean>>({})
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [modalType, setModalType] = useState<ModalType>(null)
  const [activeTask, setActiveTask] = useState<FlaggedTask | null>(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [pageLoading, setPageLoading] = useState(true)

  useEffect(() => {
    if (!loading && (!user || user.role !== 'admin')) router.push('/')
  }, [user, loading, router])

  useEffect(() => {
    if (!user || user.role !== 'admin') return
    fetchFlaggedTasks()
  }, [user])

  async function fetchFlaggedTasks() {
    const supabase = createSupabaseClient()
    const { data } = await supabase
      .from('tasks')
      .select(
        `*, campaign:campaigns(title, payout_rate, brand:brand_profiles(company_name)), creator:creator_profiles(nic_number, wallet_balance, is_suspended, user:users(full_name, email, created_at)), snapshots:view_snapshots(delta_views, earnings_added, snapshotted_at)`
      )
      .eq('status', 'flagged')
      .order('created_at', { ascending: false })
    setTasks((data as FlaggedTask[]) ?? [])
    setFilteredTasks((data as FlaggedTask[]) ?? [])
    setPageLoading(false)
  }

  useEffect(() => {
    let result = tasks.filter((t) => {
      const q = search.toLowerCase()
      return (
        t.creator?.user?.email?.toLowerCase().includes(q) ||
        t.campaign?.title?.toLowerCase().includes(q) ||
        t.id.toLowerCase().includes(q)
      )
    })
    if (sort === 'score_desc') result = [...result].sort((a, b) => b.fraud_score - a.fraud_score)
    else if (sort === 'score_asc') result = [...result].sort((a, b) => a.fraud_score - b.fraud_score)
    else result = [...result].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    setFilteredTasks(result)
  }, [search, sort, tasks])

  function toggleSnapshot(id: string) {
    setExpandedSnapshots((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function removeTask(id: string) {
    setTasks((prev) => prev.filter((t) => t.id !== id))
    setSelected((prev) => { const next = new Set(prev); next.delete(id); return next })
  }

  async function handleApprove(task: FlaggedTask) {
    setActionLoading(true)
    const supabase = createSupabaseClient()
    await supabase.from('tasks').update({ status: 'tracking', fraud_score: 0 }).eq('id', task.id)
    await logAdminAction(user!.id, 'approve_task', 'task', task.id, {
      creator: task.creator?.user?.email,
      campaign: task.campaign?.title,
      original_score: task.fraud_score,
    })
    removeTask(task.id)
    setModalType(null)
    setActionLoading(false)
  }

  async function handleReject(task: FlaggedTask) {
    setActionLoading(true)
    const supabase = createSupabaseClient()
    await supabase.from('tasks').update({ status: 'rejected' }).eq('id', task.id)
    await logAdminAction(user!.id, 'reject_task', 'task', task.id, {
      creator: task.creator?.user?.email,
      campaign: task.campaign?.title,
    })
    removeTask(task.id)
    setModalType(null)
    setActionLoading(false)
  }

  async function handleRejectSuspend(task: FlaggedTask) {
    setActionLoading(true)
    const supabase = createSupabaseClient()
    await supabase.from('tasks').update({ status: 'rejected' }).eq('id', task.id)
    await supabase.from('creator_profiles').update({ is_suspended: true }).eq('id', task.creator_id ?? '')
    await logAdminAction(user!.id, 'suspend_creator', 'creator', task.creator_id ?? task.id, {
      reason: 'fraud_reject',
      task_id: task.id,
      creator: task.creator?.user?.email,
    })
    removeTask(task.id)
    setModalType(null)
    setActionLoading(false)
  }

  async function handleBulkApprove() {
    setActionLoading(true)
    const ids = Array.from(selected)
    for (const id of ids) {
      const task = tasks.find((t) => t.id === id)
      if (task) await handleApproveById(task)
    }
    setActionLoading(false)
  }

  async function handleBulkReject() {
    setActionLoading(true)
    const ids = Array.from(selected)
    for (const id of ids) {
      const task = tasks.find((t) => t.id === id)
      if (task) await handleRejectById(task)
    }
    setActionLoading(false)
  }

  async function handleApproveById(task: FlaggedTask) {
    const supabase = createSupabaseClient()
    await supabase.from('tasks').update({ status: 'tracking', fraud_score: 0 }).eq('id', task.id)
    await logAdminAction(user!.id, 'approve_task', 'task', task.id, { bulk: true })
    removeTask(task.id)
  }

  async function handleRejectById(task: FlaggedTask) {
    const supabase = createSupabaseClient()
    await supabase.from('tasks').update({ status: 'rejected' }).eq('id', task.id)
    await logAdminAction(user!.id, 'reject_task', 'task', task.id, { bulk: true })
    removeTask(task.id)
  }

  if (loading || pageLoading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-[#6C47FF] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }
  if (!user || user.role !== 'admin') return null

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-syne text-3xl font-bold text-white">Fraud Review Queue</h1>
          <p className="text-zinc-500 text-sm mt-1">Tasks with automated fraud scores requiring review</p>
        </div>
        <span className="bg-red-500/10 text-red-400 border border-red-500/20 px-3 py-1 text-sm font-medium">
          {filteredTasks.length} flagged
        </span>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            placeholder="Search by email or campaign..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[#111111] border border-zinc-800 text-white text-sm pl-9 pr-4 py-2 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600"
          />
        </div>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as typeof sort)}
          className="bg-[#111111] border border-zinc-800 text-zinc-400 text-sm px-3 py-2 focus:outline-none focus:border-zinc-600"
        >
          <option value="score_desc">Highest Score</option>
          <option value="score_asc">Lowest Score</option>
          <option value="date_desc">Newest First</option>
        </select>
      </div>

      {/* All clear state */}
      {filteredTasks.length === 0 && (
        <div className="bg-[#111111] border border-zinc-800 p-16 text-center">
          <div className="w-12 h-12 bg-green-500/10 flex items-center justify-center mx-auto mb-4">
            <span className="text-green-400 text-2xl">✓</span>
          </div>
          <p className="text-green-400 font-medium">All clear — no flags</p>
          <p className="text-zinc-500 text-sm mt-1">No tasks are currently flagged for review</p>
        </div>
      )}

      {/* Task cards */}
      <div className="space-y-4">
        {filteredTasks.map((task) => {
          const isNew =
            task.creator?.user?.created_at &&
            differenceInDays(new Date(), new Date(task.creator.user.created_at)) < 30
          const snapshots = task.snapshots ?? []

          return (
            <div key={task.id} className="bg-[#111111] border border-red-800/20 p-6">
              {/* Card header */}
              <div className="flex items-start justify-between gap-4 mb-4">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => toggleSelect(task.id)}
                    className="text-zinc-500 hover:text-white transition-colors"
                  >
                    {selected.has(task.id) ? (
                      <CheckSquare size={16} className="text-[#6C47FF]" />
                    ) : (
                      <Square size={16} />
                    )}
                  </button>
                  <div>
                    <span className="font-mono text-xs text-zinc-500">{task.id}</span>
                    <div className="flex items-center gap-2 mt-1">
                      <AdminBadge type="platform" value={task.platform} />
                      <span className="text-sm text-zinc-300">{task.campaign?.title ?? '—'}</span>
                      {task.campaign?.brand?.company_name && (
                        <span className="text-xs text-zinc-500">· {task.campaign.brand.company_name}</span>
                      )}
                    </div>
                  </div>
                </div>
                <span className={`px-2 py-1 text-xs font-bold ${fraudBadgeClass(task.fraud_score)}`}>
                  Score: {task.fraud_score}
                </span>
              </div>

              {/* Creator info */}
              <div className="bg-zinc-900/50 p-4 my-3 grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-zinc-500 mb-1">Creator</p>
                  <p className="text-sm text-white font-medium">{task.creator?.user?.full_name ?? '—'}</p>
                  <p className="text-xs text-zinc-400">{task.creator?.user?.email ?? '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-zinc-500 mb-1">Account Info</p>
                  {task.creator?.user?.created_at && (
                    <div className="flex items-center gap-2">
                      <p className="text-xs text-zinc-400">
                        Joined {format(new Date(task.creator.user.created_at), 'MMM d, yyyy')}
                      </p>
                      {isNew && (
                        <span className="text-xs text-amber-400">⚠ New account</span>
                      )}
                    </div>
                  )}
                  <p className="text-xs text-zinc-400 mt-1">NIC: {maskNIC(task.creator?.nic_number)}</p>
                  <p className="text-xs text-zinc-400 mt-1">
                    Wallet: LKR {(task.creator?.wallet_balance ?? 0).toLocaleString('en-LK', { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </div>

              {/* Post info */}
              <div className="flex items-center justify-between my-3">
                <div>
                  <p className="text-xs text-zinc-500 mb-1">Post URL</p>
                  {task.post_url ? (
                    <a
                      href={task.post_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-[#6C47FF] hover:text-[#6C47FF]/80 flex items-center gap-1 transition-colors"
                    >
                      Open post <ExternalLink size={12} />
                    </a>
                  ) : (
                    <span className="text-sm text-zinc-500">No URL</span>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-xs text-zinc-500 mb-1">Total Views</p>
                  <p className="text-sm text-white font-medium">{task.total_views.toLocaleString('en-LK')}</p>
                </div>
              </div>

              {/* Snapshots */}
              {snapshots.length > 0 && (
                <div className="my-3">
                  <button
                    onClick={() => toggleSnapshot(task.id)}
                    className="flex items-center gap-2 text-xs text-zinc-400 hover:text-white transition-colors"
                  >
                    {expandedSnapshots[task.id] ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    View History ({snapshots.length} snapshot{snapshots.length !== 1 ? 's' : ''})
                  </button>
                  {expandedSnapshots[task.id] && (
                    <div className="mt-2 overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="bg-zinc-900/50">
                            <th className="px-3 py-2 text-left text-zinc-500">Date</th>
                            <th className="px-3 py-2 text-right text-zinc-500">Delta Views</th>
                            <th className="px-3 py-2 text-right text-zinc-500">Earnings Added</th>
                          </tr>
                        </thead>
                        <tbody>
                          {snapshots.map((snap, i) => (
                            <tr key={i} className="border-t border-zinc-800/50">
                              <td className="px-3 py-2 text-zinc-400">
                                {format(new Date(snap.snapshotted_at), 'MMM d, HH:mm')}
                              </td>
                              <td className="px-3 py-2 text-right text-zinc-300">
                                +{snap.delta_views.toLocaleString()}
                              </td>
                              <td className="px-3 py-2 text-right text-[#00E5A0]">
                                +LKR {snap.earnings_added.toFixed(2)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* Action buttons */}
              <div className="flex items-center gap-3 mt-5 pt-4 border-t border-zinc-800/50">
                <button
                  onClick={() => { setActiveTask(task); setModalType('approve') }}
                  className="bg-[#00E5A0] text-black font-bold px-6 py-2.5 text-sm hover:bg-[#00E5A0]/90 transition-colors"
                >
                  ✓ Approve &amp; Release
                </button>
                <button
                  onClick={() => { setActiveTask(task); setModalType('reject') }}
                  className="border border-red-600 text-red-400 px-6 py-2.5 text-sm hover:bg-red-600/10 transition-colors"
                >
                  ✗ Reject
                </button>
                <button
                  onClick={() => { setActiveTask(task); setModalType('suspend') }}
                  className="bg-red-600 text-white px-6 py-2.5 text-sm hover:bg-red-700 transition-colors"
                >
                  🚫 Reject + Suspend
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {/* Bulk actions bar */}
      {selected.size >= 2 && (
        <div className="fixed bottom-0 left-64 right-0 bg-[#111111] border-t border-zinc-800 px-8 py-4 flex items-center justify-between z-30">
          <span className="text-sm text-zinc-300">{selected.size} tasks selected</span>
          <div className="flex gap-3">
            <button
              onClick={handleBulkApprove}
              disabled={actionLoading}
              className="bg-[#00E5A0] text-black font-bold px-5 py-2 text-sm hover:bg-[#00E5A0]/90 transition-colors disabled:opacity-50"
            >
              Approve All
            </button>
            <button
              onClick={handleBulkReject}
              disabled={actionLoading}
              className="border border-red-600 text-red-400 px-5 py-2 text-sm hover:bg-red-600/10 transition-colors disabled:opacity-50"
            >
              Reject All
            </button>
          </div>
        </div>
      )}

      {/* Confirm modals */}
      {activeTask && (
        <>
          <ConfirmModal
            isOpen={modalType === 'approve'}
            onClose={() => setModalType(null)}
            onConfirm={() => handleApprove(activeTask)}
            title="Approve & Release Task"
            description={
              <span>
                Approve task for <strong className="text-white">{activeTask.creator?.user?.full_name}</strong>?
                Status will change to <strong className="text-white">tracking</strong> and fraud score will be reset to 0.
              </span>
            }
            confirmText="Approve & Release"
            confirmStyle="success"
            isLoading={actionLoading}
          />
          <ConfirmModal
            isOpen={modalType === 'reject'}
            onClose={() => setModalType(null)}
            onConfirm={() => handleReject(activeTask)}
            title="Reject Task"
            description={`Reject this task from ${activeTask.creator?.user?.full_name ?? 'unknown creator'}? The task will be marked rejected and the creator will not be paid.`}
            confirmText="Reject Task"
            confirmStyle="danger"
            isLoading={actionLoading}
          />
          <ConfirmModal
            isOpen={modalType === 'suspend'}
            onClose={() => setModalType(null)}
            onConfirm={() => handleRejectSuspend(activeTask)}
            title="Reject & Suspend Creator"
            description={
              <span>
                This will reject the task <strong className="text-white">AND suspend {activeTask.creator?.user?.full_name ?? 'this creator'}</strong>.
                They will not be able to join new campaigns. This action is serious and will be logged.
              </span>
            }
            confirmText="Reject & Suspend"
            confirmStyle="danger"
            isLoading={actionLoading}
          />
        </>
      )}
    </div>
  )
}
