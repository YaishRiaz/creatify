'use client'

export const dynamic = 'force-dynamic'
export const runtime = 'edge'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Search } from 'lucide-react'
import { format } from 'date-fns'
import { useUser } from '@/hooks/useUser'
import { createSupabaseClient } from '@/lib/supabase'
import { logAdminAction } from '@/lib/audit'
import DataTable from '@/components/admin/DataTable'
import AdminBadge from '@/components/admin/AdminBadge'
import ConfirmModal from '@/components/admin/ConfirmModal'


function formatLKR(n: number) {
  return `LKR ${n.toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function maskNIC(nic: string | undefined): string {
  if (!nic || nic.length < 5) return nic ?? '—'
  return nic.slice(0, 3) + '***' + nic.slice(-2)
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

interface TaskSummary {
  id: string
  status: string
  total_views: number
  total_earned: number
}

interface PayoutSummary {
  id: string
  amount: number
  status: string
}

interface CreatorRow {
  id: string
  user_id: string
  nic_number?: string
  platforms: Record<string, string>
  wallet_balance: number
  total_earned: number
  is_suspended: boolean
  created_at: string
  user?: {
    full_name: string
    email: string
    phone?: string
    is_verified: boolean
    created_at: string
  }
  tasks?: TaskSummary[]
  payouts?: PayoutSummary[]
}

type StatusFilter = 'all' | 'active' | 'suspended'
type ModalType = 'suspend' | 'reinstate' | 'adjust' | null

export default function CreatorsPage() {
  const { user, loading } = useUser()
  const router = useRouter()

  const [creators, setCreators] = useState<CreatorRow[]>([])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [sort, setSort] = useState<string>('created_at_desc')
  const [modalType, setModalType] = useState<ModalType>(null)
  const [activeCreator, setActiveCreator] = useState<CreatorRow | null>(null)
  const [detailCreator, setDetailCreator] = useState<CreatorRow | null>(null)
  const [adjustAmount, setAdjustAmount] = useState('')
  const [adjustReason, setAdjustReason] = useState('')
  const [actionLoading, setActionLoading] = useState(false)
  const [pageLoading, setPageLoading] = useState(true)

  useEffect(() => {
    if (!loading && (!user || user.role !== 'admin')) router.push('/')
  }, [user, loading, router])

  useEffect(() => {
    if (!user || user.role !== 'admin') return
    fetchCreators()
  }, [user])

  async function fetchCreators() {
    const supabase = createSupabaseClient()
    const { data } = await supabase
      .from('creator_profiles')
      .select(
        '*, user:users(full_name, email, phone, is_verified, created_at), tasks:tasks(id, status, total_views, total_earned), payouts:payouts(id, amount, status)'
      )
      .order('created_at', { ascending: false })
    setCreators((data as CreatorRow[]) ?? [])
    setPageLoading(false)
  }

  const filtered = useMemo(() => {
    let result = creators.filter((c) => {
      const q = search.toLowerCase()
      const matchSearch =
        !q ||
        (c.user?.full_name ?? '').toLowerCase().includes(q) ||
        (c.user?.email ?? '').toLowerCase().includes(q) ||
        (c.nic_number ?? '').toLowerCase().includes(q)
      const matchStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active' && !c.is_suspended) ||
        (statusFilter === 'suspended' && c.is_suspended)
      return matchSearch && matchStatus
    })
    if (sort === 'earned_desc') result = [...result].sort((a, b) => b.total_earned - a.total_earned)
    else if (sort === 'wallet_desc') result = [...result].sort((a, b) => b.wallet_balance - a.wallet_balance)
    else result = [...result].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    return result
  }, [creators, search, statusFilter, sort])

  const stats = useMemo(() => ({
    total: creators.length,
    active: creators.filter((c) => !c.is_suspended).length,
    suspended: creators.filter((c) => c.is_suspended).length,
  }), [creators])

  async function handleSuspend(creator: CreatorRow) {
    setActionLoading(true)
    const supabase = createSupabaseClient()
    await supabase.from('creator_profiles').update({ is_suspended: true }).eq('id', creator.id)
    await logAdminAction(user!.id, 'suspend_creator', 'creator', creator.id, {
      name: creator.user?.full_name,
      email: creator.user?.email,
    })
    updateCreator(creator.id, { is_suspended: true })
    setModalType(null)
    setActionLoading(false)
  }

  async function handleReinstate(creator: CreatorRow) {
    setActionLoading(true)
    const supabase = createSupabaseClient()
    await supabase.from('creator_profiles').update({ is_suspended: false }).eq('id', creator.id)
    await logAdminAction(user!.id, 'reinstate_creator', 'creator', creator.id, {
      name: creator.user?.full_name,
    })
    updateCreator(creator.id, { is_suspended: false })
    setModalType(null)
    setActionLoading(false)
  }

  async function handleAdjustWallet() {
    if (!activeCreator) return
    const amount = parseFloat(adjustAmount)
    if (isNaN(amount)) return
    setActionLoading(true)
    const supabase = createSupabaseClient()
    const newBalance = (activeCreator.wallet_balance ?? 0) + amount
    await supabase
      .from('creator_profiles')
      .update({ wallet_balance: newBalance })
      .eq('id', activeCreator.id)
    await logAdminAction(user!.id, 'adjust_wallet', 'creator', activeCreator.id, {
      amount,
      reason: adjustReason,
      new_balance: newBalance,
    })
    updateCreator(activeCreator.id, { wallet_balance: newBalance })
    setModalType(null)
    setAdjustAmount('')
    setAdjustReason('')
    setActionLoading(false)
  }

  function updateCreator(id: string, updates: Partial<CreatorRow>) {
    setCreators((prev) => prev.map((c) => (c.id === id ? { ...c, ...updates } : c)))
    if (detailCreator?.id === id) setDetailCreator((prev) => prev ? { ...prev, ...updates } : prev)
  }

  if (loading || pageLoading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-[#6C47FF] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }
  if (!user || user.role !== 'admin') return null

  const columns = [
    {
      key: 'user',
      header: 'Creator',
      render: (c: CreatorRow) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-[#6C47FF]/20 flex items-center justify-center text-xs font-bold text-[#6C47FF] flex-shrink-0">
            {getInitials(c.user?.full_name ?? '?')}
          </div>
          <div>
            <p className="text-sm text-white font-medium">{c.user?.full_name ?? '—'}</p>
            <p className="text-xs text-zinc-500">{c.user?.email ?? '—'}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'nic',
      header: 'NIC',
      render: (c: CreatorRow) => (
        <span className="text-xs font-mono text-zinc-400">{maskNIC(c.nic_number)}</span>
      ),
    },
    {
      key: 'tasks',
      header: 'Tasks',
      render: (c: CreatorRow) => (
        <span className="text-sm text-zinc-300">{(c.tasks ?? []).length}</span>
      ),
    },
    {
      key: 'views',
      header: 'Views',
      sortable: true,
      render: (c: CreatorRow) => {
        const views = (c.tasks ?? []).reduce((s, t) => s + (t.total_views ?? 0), 0)
        return <span className="text-sm text-zinc-300">{views.toLocaleString('en-LK')}</span>
      },
    },
    {
      key: 'total_earned',
      header: 'Earned',
      sortable: true,
      render: (c: CreatorRow) => (
        <span className="text-sm text-[#00E5A0]">{formatLKR(c.total_earned)}</span>
      ),
    },
    {
      key: 'wallet_balance',
      header: 'Wallet',
      sortable: true,
      render: (c: CreatorRow) => (
        <span className={`text-sm font-medium ${c.wallet_balance > 10000 ? 'text-amber-400' : 'text-zinc-300'}`}>
          {formatLKR(c.wallet_balance)}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (c: CreatorRow) => (
        <AdminBadge type="status" value={c.is_suspended ? 'suspended' : 'active'} />
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (c: CreatorRow) => (
        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => setDetailCreator(c)}
            className="px-2 py-1 text-xs text-zinc-400 border border-zinc-700 hover:text-white hover:border-zinc-500 transition-colors"
          >
            View
          </button>
          {!c.is_suspended ? (
            <button
              onClick={() => { setActiveCreator(c); setModalType('suspend') }}
              className="px-2 py-1 text-xs text-red-400 border border-red-800 hover:bg-red-800/20 transition-colors"
            >
              Suspend
            </button>
          ) : (
            <button
              onClick={() => { setActiveCreator(c); setModalType('reinstate') }}
              className="px-2 py-1 text-xs text-green-400 border border-green-800 hover:bg-green-800/20 transition-colors"
            >
              Reinstate
            </button>
          )}
          <button
            onClick={() => { setActiveCreator(c); setModalType('adjust') }}
            className="px-2 py-1 text-xs text-amber-400 border border-amber-800 hover:bg-amber-800/20 transition-colors"
          >
            Adjust Wallet
          </button>
        </div>
      ),
    },
  ]

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-syne text-3xl font-bold text-white">Creators</h1>
        <p className="text-zinc-500 text-sm mt-1">Manage creator accounts</p>
      </div>

      {/* Stats subheader */}
      <div className="flex gap-6 mb-6">
        <div>
          <p className="text-2xl font-bold text-white">{stats.total}</p>
          <p className="text-xs text-zinc-500">Total</p>
        </div>
        <div>
          <p className="text-2xl font-bold text-green-400">{stats.active}</p>
          <p className="text-xs text-zinc-500">Active</p>
        </div>
        <div>
          <p className="text-2xl font-bold text-red-400">{stats.suspended}</p>
          <p className="text-xs text-zinc-500">Suspended</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-4 flex-wrap">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            placeholder="Search name, email, NIC..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-[#111111] border border-zinc-800 text-white text-sm pl-9 pr-4 py-2 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600 w-64"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
          className="bg-[#111111] border border-zinc-800 text-zinc-400 text-sm px-3 py-2 focus:outline-none focus:border-zinc-600"
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
        </select>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value)}
          className="bg-[#111111] border border-zinc-800 text-zinc-400 text-sm px-3 py-2 focus:outline-none focus:border-zinc-600"
        >
          <option value="created_at_desc">Newest First</option>
          <option value="earned_desc">Most Earned</option>
          <option value="wallet_desc">Highest Wallet</option>
        </select>
      </div>

      <div className="bg-[#111111] border border-zinc-800">
        <DataTable data={filtered} columns={columns} emptyMessage="No creators found" pageSize={25} />
      </div>

      {/* Action modals */}
      {activeCreator && (
        <>
          <ConfirmModal
            isOpen={modalType === 'suspend'}
            onClose={() => setModalType(null)}
            onConfirm={() => handleSuspend(activeCreator)}
            title="Suspend Creator"
            description={`Suspend ${activeCreator.user?.full_name ?? 'this creator'}? They will not be able to join new campaigns.`}
            confirmText="Suspend Creator"
            confirmStyle="danger"
            isLoading={actionLoading}
          />
          <ConfirmModal
            isOpen={modalType === 'reinstate'}
            onClose={() => setModalType(null)}
            onConfirm={() => handleReinstate(activeCreator)}
            title="Reinstate Creator"
            description={`Reinstate ${activeCreator.user?.full_name ?? 'this creator'}? They will regain access to join campaigns.`}
            confirmText="Reinstate Creator"
            confirmStyle="success"
            isLoading={actionLoading}
          />
        </>
      )}

      {/* Adjust wallet modal */}
      {activeCreator && modalType === 'adjust' && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-start justify-center pt-32">
          <div className="bg-[#111111] border border-zinc-800 p-8 max-w-md w-full mx-4">
            <h2 className="font-syne text-xl font-bold text-white mb-1">Adjust Wallet</h2>
            <p className="text-zinc-500 text-sm mb-6">
              Current balance: <span className="text-amber-400">{formatLKR(activeCreator.wallet_balance)}</span>
            </p>
            <div className="space-y-4">
              <div>
                <label className="text-xs text-zinc-500 uppercase tracking-wider block mb-1.5">
                  Amount (positive to add, negative to deduct)
                </label>
                <input
                  type="number"
                  value={adjustAmount}
                  onChange={(e) => setAdjustAmount(e.target.value)}
                  placeholder="e.g. 500 or -200"
                  className="w-full bg-zinc-900 border border-zinc-700 text-white text-sm px-4 py-2.5 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-500"
                />
              </div>
              <div>
                <label className="text-xs text-zinc-500 uppercase tracking-wider block mb-1.5">Reason</label>
                <textarea
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  placeholder="Reason for adjustment..."
                  rows={3}
                  className="w-full bg-zinc-900 border border-zinc-700 text-white text-sm px-4 py-2.5 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-500 resize-none"
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 mt-6">
              <button
                onClick={() => { setModalType(null); setAdjustAmount(''); setAdjustReason('') }}
                className="text-zinc-400 hover:text-white px-4 py-2 text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleAdjustWallet}
                disabled={actionLoading || !adjustAmount}
                className="bg-amber-500 hover:bg-amber-600 text-black px-6 py-2.5 text-sm font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {actionLoading && (
                  <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                )}
                Adjust Wallet
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Creator detail modal */}
      {detailCreator && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-start justify-center pt-8 px-4">
          <div className="bg-[#111111] border border-zinc-800 p-8 max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-[#6C47FF]/20 flex items-center justify-center text-lg font-bold text-[#6C47FF]">
                  {getInitials(detailCreator.user?.full_name ?? '?')}
                </div>
                <div>
                  <h2 className="font-syne text-xl font-bold text-white">
                    {detailCreator.user?.full_name}
                  </h2>
                  <p className="text-sm text-zinc-500">{detailCreator.user?.email}</p>
                </div>
              </div>
              <button onClick={() => setDetailCreator(null)} className="text-zinc-500 hover:text-white">✕</button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-zinc-900/50 p-4">
                <p className="text-xs text-zinc-500 mb-1">Wallet</p>
                <p className="text-lg font-bold text-amber-400">{formatLKR(detailCreator.wallet_balance)}</p>
              </div>
              <div className="bg-zinc-900/50 p-4">
                <p className="text-xs text-zinc-500 mb-1">Total Earned</p>
                <p className="text-lg font-bold text-[#00E5A0]">{formatLKR(detailCreator.total_earned)}</p>
              </div>
              <div className="bg-zinc-900/50 p-4">
                <p className="text-xs text-zinc-500 mb-1">Tasks</p>
                <p className="text-lg font-bold text-white">{(detailCreator.tasks ?? []).length}</p>
              </div>
              <div className="bg-zinc-900/50 p-4">
                <p className="text-xs text-zinc-500 mb-1">Status</p>
                <AdminBadge type="status" value={detailCreator.is_suspended ? 'suspended' : 'active'} />
              </div>
            </div>

            <div className="mb-4 space-y-2 text-sm">
              <div className="flex gap-3">
                <span className="text-zinc-500 w-24">NIC</span>
                <span className="text-zinc-300 font-mono">{maskNIC(detailCreator.nic_number)}</span>
              </div>
              <div className="flex gap-3">
                <span className="text-zinc-500 w-24">Phone</span>
                <span className="text-zinc-300">{detailCreator.user?.phone ?? '—'}</span>
              </div>
              <div className="flex gap-3">
                <span className="text-zinc-500 w-24">Joined</span>
                <span className="text-zinc-300">
                  {detailCreator.user?.created_at
                    ? format(new Date(detailCreator.user.created_at), 'MMM d, yyyy')
                    : '—'}
                </span>
              </div>
              <div className="flex gap-3">
                <span className="text-zinc-500 w-24">Verified</span>
                <span className={detailCreator.user?.is_verified ? 'text-green-400' : 'text-zinc-500'}>
                  {detailCreator.user?.is_verified ? 'Yes' : 'No'}
                </span>
              </div>
            </div>

            {/* Task history */}
            {(detailCreator.tasks ?? []).length > 0 && (
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-white mb-3">Task History</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-zinc-900/50">
                        <th className="px-3 py-2 text-left text-zinc-500">Task ID</th>
                        <th className="px-3 py-2 text-left text-zinc-500">Status</th>
                        <th className="px-3 py-2 text-right text-zinc-500">Views</th>
                        <th className="px-3 py-2 text-right text-zinc-500">Earned</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(detailCreator.tasks ?? []).slice(0, 10).map((t) => (
                        <tr key={t.id} className="border-t border-zinc-800/50">
                          <td className="px-3 py-2 text-zinc-500 font-mono">{t.id.slice(0, 8)}…</td>
                          <td className="px-3 py-2"><AdminBadge type="status" value={t.status} /></td>
                          <td className="px-3 py-2 text-right text-zinc-300">{t.total_views.toLocaleString()}</td>
                          <td className="px-3 py-2 text-right text-[#00E5A0]">
                            LKR {t.total_earned.toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Payout history */}
            {(detailCreator.payouts ?? []).length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-white mb-3">Payout History</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-zinc-900/50">
                        <th className="px-3 py-2 text-left text-zinc-500">Payout ID</th>
                        <th className="px-3 py-2 text-left text-zinc-500">Status</th>
                        <th className="px-3 py-2 text-right text-zinc-500">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(detailCreator.payouts ?? []).map((p) => (
                        <tr key={p.id} className="border-t border-zinc-800/50">
                          <td className="px-3 py-2 text-zinc-500 font-mono">{p.id.slice(0, 8)}…</td>
                          <td className="px-3 py-2"><AdminBadge type="status" value={p.status} /></td>
                          <td className="px-3 py-2 text-right text-[#00E5A0]">
                            LKR {p.amount.toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
