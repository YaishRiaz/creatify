'use client'

export const dynamic = 'force-dynamic'
export const runtime = 'edge'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Copy, Download } from 'lucide-react'
import { format } from 'date-fns'
import { useUser } from '@/hooks/useUser'
import { createSupabaseClient } from '@/lib/supabase'
import { logAdminAction } from '@/lib/audit'
import DataTable from '@/components/admin/DataTable'
import AdminBadge from '@/components/admin/AdminBadge'
import ConfirmModal from '@/components/admin/ConfirmModal'
import StatCard from '@/components/admin/StatCard'
import { Wallet, CheckCircle, XCircle, Clock } from 'lucide-react'


function formatLKR(n: number) {
  return `LKR ${n.toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function maskAccount(acc?: string): string {
  if (!acc || acc.length < 4) return acc ?? '—'
  return '****' + acc.slice(-4)
}

type PayoutStatus = 'all' | 'pending' | 'processing' | 'completed' | 'failed'
type ModalType = 'processing' | 'paid' | 'failed' | 'details' | null

interface PayoutRow {
  id: string
  creator_id: string
  amount: number
  status: string
  bank_name?: string
  account_number?: string
  account_name?: string
  payment_reference?: string
  requested_at: string
  completed_at?: string
  creator?: {
    wallet_balance: number
    total_earned: number
    user?: { full_name: string; email: string; phone?: string }
  }
}

function buildCSV(payouts: PayoutRow[]): string {
  const headers = ['Creator Name', 'Email', 'Phone', 'Bank', 'Account Number', 'Account Name', 'Amount (LKR)']
  const rows = payouts.map((p) => [
    p.creator?.user?.full_name ?? '',
    p.creator?.user?.email ?? '',
    p.creator?.user?.phone ?? '',
    p.bank_name ?? '',
    p.account_number ?? '',
    p.account_name ?? '',
    p.amount.toFixed(2),
  ])
  return [headers, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
}

function downloadCSV(content: string, filename: string) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export default function PayoutsPage() {
  const { user, loading } = useUser()
  const router = useRouter()

  const [payouts, setPayouts] = useState<PayoutRow[]>([])
  const [tab, setTab] = useState<PayoutStatus>('all')
  const [modalType, setModalType] = useState<ModalType>(null)
  const [activePayout, setActivePayout] = useState<PayoutRow | null>(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [pageLoading, setPageLoading] = useState(true)
  const [copied, setCopied] = useState<string | null>(null)

  useEffect(() => {
    if (!loading && (!user || user.role !== 'admin')) router.push('/')
  }, [user, loading, router])

  useEffect(() => {
    if (!user || user.role !== 'admin') return
    fetchPayouts()
  }, [user])

  async function fetchPayouts() {
    const supabase = createSupabaseClient()
    const { data } = await supabase
      .from('payouts')
      .select('*, creator:creator_profiles(wallet_balance, total_earned, user:users(full_name, email, phone))')
      .order('requested_at', { ascending: false })
    setPayouts((data as PayoutRow[]) ?? [])
    setPageLoading(false)
  }

  const filtered = useMemo(() => {
    if (tab === 'all') return payouts
    return payouts.filter((p) => p.status === tab)
  }, [payouts, tab])

  const stats = useMemo(() => {
    const pending = payouts.filter((p) => p.status === 'pending').length
    const processing = payouts.filter((p) => p.status === 'processing').length
    const thisMonth = payouts.filter((p) => {
      if (p.status !== 'completed') return false
      const d = new Date(p.completed_at ?? p.requested_at)
      const now = new Date()
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
    }).length
    const failed = payouts.filter((p) => p.status === 'failed').length
    return { pending, processing, thisMonth, failed }
  }, [payouts])

  async function copyToClipboard(text: string, id: string) {
    await navigator.clipboard.writeText(text)
    setCopied(id)
    setTimeout(() => setCopied(null), 2000)
  }

  async function markProcessing(payout: PayoutRow) {
    setActionLoading(true)
    const supabase = createSupabaseClient()
    await supabase.from('payouts').update({ status: 'processing' }).eq('id', payout.id)
    await logAdminAction(user!.id, 'mark_payout_processing', 'payout', payout.id, {
      amount: payout.amount,
      creator: payout.creator?.user?.email,
    })
    updatePayoutStatus(payout.id, 'processing')
    setModalType(null)
    setActionLoading(false)
  }

  async function markPaid(payout: PayoutRow) {
    setActionLoading(true)
    const supabase = createSupabaseClient()
    await supabase
      .from('payouts')
      .update({ status: 'completed', completed_at: new Date().toISOString() })
      .eq('id', payout.id)
    await logAdminAction(user!.id, 'mark_payout_paid', 'payout', payout.id, {
      amount: payout.amount,
      creator: payout.creator?.user?.email,
    })
    updatePayoutStatus(payout.id, 'completed')
    setModalType(null)
    setActionLoading(false)
  }

  async function markFailed(payout: PayoutRow) {
    setActionLoading(true)
    const supabase = createSupabaseClient()
    await supabase.from('payouts').update({ status: 'failed' }).eq('id', payout.id)
    // Refund wallet
    await supabase
      .from('creator_profiles')
      .update({ wallet_balance: (payout.creator?.wallet_balance ?? 0) + payout.amount })
      .eq('id', payout.creator_id)
    await logAdminAction(user!.id, 'mark_payout_failed', 'payout', payout.id, {
      amount: payout.amount,
      creator: payout.creator?.user?.email,
      refunded: true,
    })
    updatePayoutStatus(payout.id, 'failed')
    setModalType(null)
    setActionLoading(false)
  }

  function updatePayoutStatus(id: string, status: string) {
    setPayouts((prev) => prev.map((p) => (p.id === id ? { ...p, status } : p)))
  }

  async function markAllProcessing() {
    const pending = payouts.filter((p) => p.status === 'pending')
    for (const p of pending) await markProcessing(p)
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
      key: 'select',
      header: '',
      render: (_p: PayoutRow) => null,
    },
    {
      key: 'creator',
      header: 'Creator',
      render: (p: PayoutRow) => (
        <div>
          <p className="text-sm text-white font-medium">{p.creator?.user?.full_name ?? '—'}</p>
          <p className="text-xs text-zinc-500">{p.creator?.user?.email ?? '—'}</p>
          {p.creator?.user?.phone && (
            <p className="text-xs text-zinc-600">{p.creator.user.phone}</p>
          )}
        </div>
      ),
    },
    {
      key: 'amount',
      header: 'Amount',
      sortable: true,
      render: (p: PayoutRow) => (
        <span className="text-[#00E5A0] font-medium">{formatLKR(p.amount)}</span>
      ),
    },
    {
      key: 'bank',
      header: 'Bank Details',
      render: (p: PayoutRow) => (
        <div>
          <p className="text-xs text-zinc-300">{p.bank_name ?? '—'}</p>
          <p className="text-xs text-zinc-500">{maskAccount(p.account_number)}</p>
          <p className="text-xs text-zinc-500">{p.account_name ?? '—'}</p>
          {p.account_number && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                copyToClipboard(
                  `${p.bank_name}\n${p.account_number}\n${p.account_name}`,
                  p.id
                )
              }}
              className="flex items-center gap-1 text-xs text-zinc-500 hover:text-white mt-1 transition-colors"
            >
              <Copy size={10} />
              {copied === p.id ? 'Copied!' : 'Copy'}
            </button>
          )}
        </div>
      ),
    },
    {
      key: 'requested_at',
      header: 'Requested',
      sortable: true,
      render: (p: PayoutRow) => (
        <span className="text-xs text-zinc-400">
          {format(new Date(p.requested_at), 'MMM d, yyyy')}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (p: PayoutRow) => <AdminBadge type="status" value={p.status} />,
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (p: PayoutRow) => (
        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          {p.status === 'pending' && (
            <>
              <button
                onClick={() => { setActivePayout(p); setModalType('processing') }}
                className="px-2 py-1 text-xs text-blue-400 border border-blue-800 hover:bg-blue-800/20 transition-colors"
              >
                Processing
              </button>
              <button
                onClick={() => { setActivePayout(p); setModalType('paid') }}
                className="px-2 py-1 text-xs text-[#00E5A0] border border-[#00E5A0]/30 hover:bg-[#00E5A0]/10 transition-colors"
              >
                Mark Paid
              </button>
              <button
                onClick={() => { setActivePayout(p); setModalType('failed') }}
                className="px-2 py-1 text-xs text-red-400 border border-red-800 hover:bg-red-800/20 transition-colors"
              >
                Failed
              </button>
            </>
          )}
          {p.status === 'processing' && (
            <>
              <button
                onClick={() => { setActivePayout(p); setModalType('paid') }}
                className="px-2 py-1 text-xs text-[#00E5A0] border border-[#00E5A0]/30 hover:bg-[#00E5A0]/10 transition-colors"
              >
                Mark Paid
              </button>
              <button
                onClick={() => { setActivePayout(p); setModalType('failed') }}
                className="px-2 py-1 text-xs text-red-400 border border-red-800 hover:bg-red-800/20 transition-colors"
              >
                Failed
              </button>
            </>
          )}
          {(p.status === 'completed' || p.status === 'failed') && (
            <button
              onClick={() => { setActivePayout(p); setModalType('details') }}
              className="px-2 py-1 text-xs text-zinc-400 border border-zinc-700 hover:text-white hover:border-zinc-500 transition-colors"
            >
              View Details
            </button>
          )}
        </div>
      ),
    },
  ]

  const tabs: { key: PayoutStatus; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'pending', label: 'Pending' },
    { key: 'processing', label: 'Processing' },
    { key: 'completed', label: 'Completed' },
    { key: 'failed', label: 'Failed' },
  ]

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-syne text-3xl font-bold text-white">Payouts</h1>
          <p className="text-zinc-500 text-sm mt-1">Manage creator payout requests</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={markAllProcessing}
            className="px-4 py-2 text-sm text-blue-400 border border-blue-800 hover:bg-blue-800/20 transition-colors"
          >
            Mark All Processing
          </button>
          <button
            onClick={() => {
              const csv = buildCSV(filtered)
              downloadCSV(csv, `payouts-${format(new Date(), 'yyyy-MM-dd')}.csv`)
            }}
            className="flex items-center gap-2 px-4 py-2 text-sm text-zinc-400 border border-zinc-700 hover:text-white hover:border-zinc-500 transition-colors"
          >
            <Download size={14} />
            Export CSV
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Pending" value={stats.pending} icon={<Clock size={20} />} alert={stats.pending > 0} />
        <StatCard label="Processing" value={stats.processing} icon={<Wallet size={20} />} />
        <StatCard label="Completed This Month" value={stats.thisMonth} icon={<CheckCircle size={20} />} />
        <StatCard label="Failed" value={stats.failed} icon={<XCircle size={20} />} alert={stats.failed > 0} />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 border-b border-zinc-800">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={[
              'px-4 py-2.5 text-sm font-medium transition-colors',
              tab === t.key
                ? 'text-white border-b-2 border-[#6C47FF]'
                : 'text-zinc-400 hover:text-white',
            ].join(' ')}
          >
            {t.label}
            {t.key !== 'all' && (
              <span className="ml-1.5 text-xs text-zinc-600">
                ({payouts.filter((p) => p.status === t.key).length})
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="bg-[#111111] border border-zinc-800">
        <DataTable
          data={filtered}
          columns={columns}
          emptyMessage="No payouts found"
          pageSize={25}
        />
      </div>

      {/* Modals */}
      {activePayout && (
        <>
          <ConfirmModal
            isOpen={modalType === 'processing'}
            onClose={() => setModalType(null)}
            onConfirm={() => markProcessing(activePayout)}
            title="Mark as Processing"
            description={`Mark payout of ${formatLKR(activePayout.amount)} for ${activePayout.creator?.user?.full_name ?? 'this creator'} as processing?`}
            confirmText="Mark Processing"
            confirmStyle="warning"
            isLoading={actionLoading}
          />
          <ConfirmModal
            isOpen={modalType === 'paid'}
            onClose={() => setModalType(null)}
            onConfirm={() => markPaid(activePayout)}
            title="Mark as Paid"
            description={`Confirm payment of ${formatLKR(activePayout.amount)} to ${activePayout.creator?.user?.full_name ?? 'this creator'} has been completed?`}
            confirmText="Mark Paid"
            confirmStyle="success"
            isLoading={actionLoading}
          />
          <ConfirmModal
            isOpen={modalType === 'failed'}
            onClose={() => setModalType(null)}
            onConfirm={() => markFailed(activePayout)}
            title="Mark as Failed"
            description={
              <span>
                Mark this payout as failed? The amount of{' '}
                <strong className="text-white">{formatLKR(activePayout.amount)}</strong> will be{' '}
                <strong className="text-amber-400">refunded to the creator&apos;s wallet</strong>.
              </span>
            }
            confirmText="Mark Failed & Refund"
            confirmStyle="danger"
            isLoading={actionLoading}
          />
        </>
      )}

      {/* Detail modal */}
      {activePayout && modalType === 'details' && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-start justify-center pt-20 px-4">
          <div className="bg-[#111111] border border-zinc-800 p-8 max-w-lg w-full max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-syne text-xl font-bold text-white">Payout Details</h2>
              <button onClick={() => setModalType(null)} className="text-zinc-500 hover:text-white">✕</button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-zinc-500 mb-1">Creator</p>
                  <p className="text-sm text-white">{activePayout.creator?.user?.full_name}</p>
                  <p className="text-xs text-zinc-400">{activePayout.creator?.user?.email}</p>
                </div>
                <div>
                  <p className="text-xs text-zinc-500 mb-1">Amount</p>
                  <p className="text-lg font-bold text-[#00E5A0]">{formatLKR(activePayout.amount)}</p>
                </div>
                <div>
                  <p className="text-xs text-zinc-500 mb-1">Bank</p>
                  <p className="text-sm text-white">{activePayout.bank_name ?? '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-zinc-500 mb-1">Account Number</p>
                  <p className="text-sm text-white font-mono">{activePayout.account_number ?? '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-zinc-500 mb-1">Account Name</p>
                  <p className="text-sm text-white">{activePayout.account_name ?? '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-zinc-500 mb-1">Status</p>
                  <AdminBadge type="status" value={activePayout.status} />
                </div>
                <div>
                  <p className="text-xs text-zinc-500 mb-1">Requested</p>
                  <p className="text-sm text-zinc-300">
                    {format(new Date(activePayout.requested_at), 'MMM d, yyyy HH:mm')}
                  </p>
                </div>
                {activePayout.completed_at && (
                  <div>
                    <p className="text-xs text-zinc-500 mb-1">Completed</p>
                    <p className="text-sm text-zinc-300">
                      {format(new Date(activePayout.completed_at), 'MMM d, yyyy HH:mm')}
                    </p>
                  </div>
                )}
                {activePayout.payment_reference && (
                  <div className="col-span-2">
                    <p className="text-xs text-zinc-500 mb-1">Payment Reference</p>
                    <p className="text-sm text-zinc-300 font-mono">{activePayout.payment_reference}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
