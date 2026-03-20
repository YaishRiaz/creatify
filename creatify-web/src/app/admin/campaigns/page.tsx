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

interface TaskSummary {
  id: string
  status: string
  total_views: number
  total_earned: number
}

interface CampaignRow {
  id: string
  title: string
  description?: string
  brief?: string
  do_list?: string[]
  dont_list?: string[]
  hashtags?: string[]
  budget_total: number
  budget_remaining: number
  payout_rate: number
  per_creator_cap?: number
  min_cashout: number
  target_platforms: string[]
  status: string
  start_date?: string
  end_date?: string
  created_at: string
  brand?: { company_name: string }
  tasks?: TaskSummary[]
}

type CampaignStatus = 'all' | 'active' | 'paused' | 'pending_payment' | 'completed' | 'draft'
type ModalType = 'pause' | 'resume' | 'force_complete' | 'force_activate' | 'delete' | null

export default function CampaignsPage() {
  const { user, loading } = useUser()
  const router = useRouter()

  const [campaigns, setCampaigns] = useState<CampaignRow[]>([])
  const [statusTab, setStatusTab] = useState<CampaignStatus>('all')
  const [search, setSearch] = useState('')
  const [modalType, setModalType] = useState<ModalType>(null)
  const [activeCampaign, setActiveCampaign] = useState<CampaignRow | null>(null)
  const [detailCampaign, setDetailCampaign] = useState<CampaignRow | null>(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [pageLoading, setPageLoading] = useState(true)

  useEffect(() => {
    if (!loading && (!user || user.role !== 'admin')) router.push('/')
  }, [user, loading, router])

  useEffect(() => {
    if (!user || user.role !== 'admin') return
    fetchCampaigns()
  }, [user])

  async function fetchCampaigns() {
    const supabase = createSupabaseClient()
    const { data } = await supabase
      .from('campaigns')
      .select('*, brand:brand_profiles(company_name), tasks:tasks(id, status, total_views, total_earned)')
      .order('created_at', { ascending: false })
    setCampaigns((data as CampaignRow[]) ?? [])
    setPageLoading(false)
  }

  const filtered = useMemo(() => {
    return campaigns.filter((c) => {
      const matchStatus = statusTab === 'all' || c.status === statusTab
      const q = search.toLowerCase()
      const matchSearch =
        !q ||
        c.title.toLowerCase().includes(q) ||
        (c.brand?.company_name ?? '').toLowerCase().includes(q)
      return matchStatus && matchSearch
    })
  }, [campaigns, search, statusTab])

  async function handlePause(campaign: CampaignRow) {
    setActionLoading(true)
    const supabase = createSupabaseClient()
    await supabase.from('campaigns').update({ status: 'paused' }).eq('id', campaign.id)
    await logAdminAction(user!.id, 'pause_campaign', 'campaign', campaign.id, { title: campaign.title })
    updateStatus(campaign.id, 'paused')
    setModalType(null)
    setActionLoading(false)
  }

  async function handleResume(campaign: CampaignRow) {
    setActionLoading(true)
    const supabase = createSupabaseClient()
    await supabase.from('campaigns').update({ status: 'active' }).eq('id', campaign.id)
    await logAdminAction(user!.id, 'resume_campaign', 'campaign', campaign.id, { title: campaign.title })
    updateStatus(campaign.id, 'active')
    setModalType(null)
    setActionLoading(false)
  }

  async function handleForceComplete(campaign: CampaignRow) {
    setActionLoading(true)
    const supabase = createSupabaseClient()
    await supabase.from('campaigns').update({ status: 'completed' }).eq('id', campaign.id)
    await logAdminAction(user!.id, 'force_complete_campaign', 'campaign', campaign.id, { title: campaign.title })
    updateStatus(campaign.id, 'completed')
    setModalType(null)
    setActionLoading(false)
  }

  async function handleForceActivate(campaign: CampaignRow) {
    setActionLoading(true)
    const supabase = createSupabaseClient()
    await supabase.from('campaigns').update({ status: 'active' }).eq('id', campaign.id)
    await supabase.from('escrow_transactions').insert({
      campaign_id: campaign.id,
      amount: campaign.budget_total,
      type: 'funded',
    })
    await logAdminAction(user!.id, 'force_activate_campaign', 'campaign', campaign.id, {
      title: campaign.title,
      budget: campaign.budget_total,
    })
    updateStatus(campaign.id, 'active')
    setModalType(null)
    setActionLoading(false)
  }

  async function handleDelete(campaign: CampaignRow) {
    setActionLoading(true)
    const supabase = createSupabaseClient()
    await supabase.from('campaigns').delete().eq('id', campaign.id)
    setCampaigns((prev) => prev.filter((c) => c.id !== campaign.id))
    setModalType(null)
    setActionLoading(false)
  }

  function updateStatus(id: string, status: string) {
    setCampaigns((prev) => prev.map((c) => (c.id === id ? { ...c, status } : c)))
  }

  if (loading || pageLoading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-[#6C47FF] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }
  if (!user || user.role !== 'admin') return null

  const statusTabs: { key: CampaignStatus; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'active', label: 'Active' },
    { key: 'paused', label: 'Paused' },
    { key: 'pending_payment', label: 'Pending Payment' },
    { key: 'completed', label: 'Completed' },
    { key: 'draft', label: 'Draft' },
  ]

  const columns = [
    {
      key: 'title',
      header: 'Campaign',
      render: (c: CampaignRow) => (
        <button
          onClick={(e) => { e.stopPropagation(); setDetailCampaign(c) }}
          className="text-left"
        >
          <p className="text-sm text-[#6C47FF] hover:underline font-medium">{c.title}</p>
          <p className="text-xs text-zinc-500 mt-0.5">
            {format(new Date(c.created_at), 'MMM d, yyyy')}
          </p>
        </button>
      ),
    },
    {
      key: 'brand',
      header: 'Brand',
      render: (c: CampaignRow) => (
        <span className="text-sm text-zinc-300">{c.brand?.company_name ?? '—'}</span>
      ),
    },
    {
      key: 'budget',
      header: 'Budget',
      render: (c: CampaignRow) => {
        const spent = c.budget_total - c.budget_remaining
        const pct = c.budget_total > 0 ? Math.min(100, (spent / c.budget_total) * 100) : 0
        return (
          <div>
            <p className="text-sm text-zinc-300">{formatLKR(c.budget_total)}</p>
            <div className="w-24 h-1 bg-zinc-800 mt-1">
              <div className="h-1 bg-[#6C47FF]" style={{ width: `${pct}%` }} />
            </div>
            <p className="text-xs text-zinc-500 mt-0.5">{formatLKR(spent)} spent</p>
          </div>
        )
      },
    },
    {
      key: 'views',
      header: 'Views',
      render: (c: CampaignRow) => {
        const views = (c.tasks ?? []).reduce((s, t) => s + (t.total_views ?? 0), 0)
        return <span className="text-sm text-zinc-300">{views.toLocaleString('en-LK')}</span>
      },
    },
    {
      key: 'creators',
      header: 'Creators',
      render: (c: CampaignRow) => (
        <span className="text-sm text-zinc-300">{(c.tasks ?? []).length}</span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (c: CampaignRow) => <AdminBadge type="status" value={c.status} />,
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (c: CampaignRow) => (
        <div className="flex items-center gap-2 flex-wrap" onClick={(e) => e.stopPropagation()}>
          {c.status === 'active' && (
            <>
              <button
                onClick={() => { setActiveCampaign(c); setModalType('pause') }}
                className="px-2 py-1 text-xs text-blue-400 border border-blue-800 hover:bg-blue-800/20 transition-colors"
              >
                Pause
              </button>
              <button
                onClick={() => { setActiveCampaign(c); setModalType('force_complete') }}
                className="px-2 py-1 text-xs text-amber-400 border border-amber-800 hover:bg-amber-800/20 transition-colors"
              >
                Force Complete
              </button>
            </>
          )}
          {c.status === 'paused' && (
            <button
              onClick={() => { setActiveCampaign(c); setModalType('resume') }}
              className="px-2 py-1 text-xs text-green-400 border border-green-800 hover:bg-green-800/20 transition-colors"
            >
              Resume
            </button>
          )}
          {c.status === 'pending_payment' && (
            <button
              onClick={() => { setActiveCampaign(c); setModalType('force_activate') }}
              className="px-2 py-1 text-xs text-amber-400 border border-amber-800 hover:bg-amber-800/20 transition-colors"
            >
              Force Activate
            </button>
          )}
          {(c.status === 'draft' || c.status === 'pending_payment') && (
            <button
              onClick={() => { setActiveCampaign(c); setModalType('delete') }}
              className="px-2 py-1 text-xs text-red-400 border border-red-800 hover:bg-red-800/20 transition-colors"
            >
              Delete
            </button>
          )}
        </div>
      ),
    },
  ]

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-syne text-3xl font-bold text-white">Campaigns</h1>
        <p className="text-zinc-500 text-sm mt-1">Manage all platform campaigns</p>
      </div>

      {/* Status tabs */}
      <div className="flex gap-1 mb-4 border-b border-zinc-800 overflow-x-auto">
        {statusTabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setStatusTab(t.key)}
            className={[
              'px-4 py-2.5 text-sm font-medium transition-colors whitespace-nowrap',
              statusTab === t.key
                ? 'text-white border-b-2 border-[#6C47FF]'
                : 'text-zinc-400 hover:text-white',
            ].join(' ')}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative max-w-sm mb-4">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
        <input
          type="text"
          placeholder="Search by title or brand..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-[#111111] border border-zinc-800 text-white text-sm pl-9 pr-4 py-2 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600"
        />
      </div>

      <div className="bg-[#111111] border border-zinc-800">
        <DataTable data={filtered} columns={columns} emptyMessage="No campaigns found" pageSize={25} />
      </div>

      {/* Modals */}
      {activeCampaign && (
        <>
          <ConfirmModal
            isOpen={modalType === 'pause'}
            onClose={() => setModalType(null)}
            onConfirm={() => handlePause(activeCampaign)}
            title="Pause Campaign"
            description={`Pause "${activeCampaign.title}"? Creators won't be able to join and tracking will stop.`}
            confirmText="Pause Campaign"
            confirmStyle="warning"
            isLoading={actionLoading}
          />
          <ConfirmModal
            isOpen={modalType === 'resume'}
            onClose={() => setModalType(null)}
            onConfirm={() => handleResume(activeCampaign)}
            title="Resume Campaign"
            description={`Resume "${activeCampaign.title}"? It will become active again.`}
            confirmText="Resume Campaign"
            confirmStyle="success"
            isLoading={actionLoading}
          />
          <ConfirmModal
            isOpen={modalType === 'force_complete'}
            onClose={() => setModalType(null)}
            onConfirm={() => handleForceComplete(activeCampaign)}
            title="Force Complete Campaign"
            description={`Force complete "${activeCampaign.title}"? This will end the campaign immediately and remaining budget will be released.`}
            confirmText="Force Complete"
            confirmStyle="warning"
            isLoading={actionLoading}
          />
          <ConfirmModal
            isOpen={modalType === 'force_activate'}
            onClose={() => setModalType(null)}
            onConfirm={() => handleForceActivate(activeCampaign)}
            title="Force Activate Campaign"
            description={
              <span>
                Force activate <strong className="text-white">{activeCampaign.title}</strong>?
                This will bypass payment and create an escrow record for{' '}
                <strong className="text-white">{formatLKR(activeCampaign.budget_total)}</strong>.
              </span>
            }
            confirmText="Force Activate"
            confirmStyle="warning"
            isLoading={actionLoading}
          />
          <ConfirmModal
            isOpen={modalType === 'delete'}
            onClose={() => setModalType(null)}
            onConfirm={() => handleDelete(activeCampaign)}
            title="Delete Campaign"
            description={`Permanently delete "${activeCampaign.title}"? This cannot be undone.`}
            confirmText="Delete Campaign"
            confirmStyle="danger"
            isLoading={actionLoading}
          />
        </>
      )}

      {/* Detail modal */}
      {detailCampaign && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-start justify-center pt-12 px-4">
          <div className="bg-[#111111] border border-zinc-800 p-8 max-w-2xl w-full max-h-[85vh] overflow-y-auto">
            <div className="flex items-start justify-between mb-6">
              <div>
                <h2 className="font-syne text-xl font-bold text-white">{detailCampaign.title}</h2>
                <p className="text-sm text-zinc-500 mt-1">{detailCampaign.brand?.company_name}</p>
              </div>
              <button onClick={() => setDetailCampaign(null)} className="text-zinc-500 hover:text-white">✕</button>
            </div>
            <div className="space-y-5">
              {detailCampaign.description && (
                <div>
                  <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Description</p>
                  <p className="text-sm text-zinc-300">{detailCampaign.description}</p>
                </div>
              )}
              {detailCampaign.brief && (
                <div>
                  <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Brief</p>
                  <p className="text-sm text-zinc-300 whitespace-pre-wrap">{detailCampaign.brief}</p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Budget</p>
                  <p className="text-sm text-white">{formatLKR(detailCampaign.budget_total)}</p>
                  <p className="text-xs text-zinc-500">{formatLKR(detailCampaign.budget_remaining)} remaining</p>
                </div>
                <div>
                  <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Payout Rate</p>
                  <p className="text-sm text-white">LKR {detailCampaign.payout_rate} / 1000 views</p>
                </div>
                <div>
                  <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Status</p>
                  <AdminBadge type="status" value={detailCampaign.status} />
                </div>
                <div>
                  <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Platforms</p>
                  <div className="flex gap-1 flex-wrap">
                    {(detailCampaign.target_platforms ?? []).map((p) => (
                      <AdminBadge key={p} type="platform" value={p} />
                    ))}
                  </div>
                </div>
              </div>
              {detailCampaign.do_list && detailCampaign.do_list.length > 0 && (
                <div>
                  <p className="text-xs text-zinc-500 uppercase tracking-wider mb-2">Do&apos;s</p>
                  <ul className="space-y-1">
                    {detailCampaign.do_list.map((item, i) => (
                      <li key={i} className="text-sm text-zinc-300 flex items-start gap-2">
                        <span className="text-green-400">✓</span> {item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {detailCampaign.dont_list && detailCampaign.dont_list.length > 0 && (
                <div>
                  <p className="text-xs text-zinc-500 uppercase tracking-wider mb-2">Don&apos;ts</p>
                  <ul className="space-y-1">
                    {detailCampaign.dont_list.map((item, i) => (
                      <li key={i} className="text-sm text-zinc-300 flex items-start gap-2">
                        <span className="text-red-400">✗</span> {item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {(detailCampaign.tasks ?? []).length > 0 && (
                <div>
                  <p className="text-xs text-zinc-500 uppercase tracking-wider mb-2">Task Breakdown</p>
                  <div className="grid grid-cols-4 gap-3">
                    {['tracking', 'submitted', 'completed', 'rejected'].map((s) => {
                      const count = (detailCampaign.tasks ?? []).filter((t) => t.status === s).length
                      return (
                        <div key={s} className="bg-zinc-900/50 p-3">
                          <p className="text-lg font-bold text-white">{count}</p>
                          <p className="text-xs text-zinc-500 capitalize">{s}</p>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
