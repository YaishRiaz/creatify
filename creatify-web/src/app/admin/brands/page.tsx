'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Syne } from 'next/font/google'
import { Search } from 'lucide-react'
import { format } from 'date-fns'
import { useUser } from '@/hooks/useUser'
import { createSupabaseClient } from '@/lib/supabase'
import { logAdminAction } from '@/lib/audit'
import DataTable from '@/components/admin/DataTable'
import AdminBadge from '@/components/admin/AdminBadge'
import ConfirmModal from '@/components/admin/ConfirmModal'

const syne = Syne({ subsets: ['latin'], weight: ['700', '800'] })

function formatLKR(n: number) {
  return `LKR ${n.toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

interface CampaignSummary {
  id: string
  status: string
  budget_total: number
  budget_remaining: number
}

interface BrandRow {
  id: string
  user_id: string
  company_name: string
  website?: string
  logo_url?: string
  industry?: string
  is_suspended?: boolean
  created_at: string
  user?: {
    full_name: string
    email: string
    created_at: string
  }
  campaigns?: CampaignSummary[]
}

export default function BrandsPage() {
  const { user, loading } = useUser()
  const router = useRouter()

  const [brands, setBrands] = useState<BrandRow[]>([])
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [activeBrand, setActiveBrand] = useState<BrandRow | null>(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [pageLoading, setPageLoading] = useState(true)

  useEffect(() => {
    if (!loading && (!user || user.role !== 'admin')) router.push('/')
  }, [user, loading, router])

  useEffect(() => {
    if (!user || user.role !== 'admin') return
    fetchBrands()
  }, [user])

  async function fetchBrands() {
    const supabase = createSupabaseClient()
    const { data } = await supabase
      .from('brand_profiles')
      .select('*, user:users(full_name, email, created_at), campaigns:campaigns(id, status, budget_total, budget_remaining)')
      .order('created_at', { ascending: false })
    setBrands((data as BrandRow[]) ?? [])
    setPageLoading(false)
  }

  const filtered = useMemo(() => {
    if (!search) return brands
    const q = search.toLowerCase()
    return brands.filter(
      (b) =>
        b.company_name.toLowerCase().includes(q) ||
        (b.user?.email ?? '').toLowerCase().includes(q) ||
        (b.industry ?? '').toLowerCase().includes(q)
    )
  }, [brands, search])

  async function handleSuspend(brand: BrandRow) {
    setActionLoading(true)
    const supabase = createSupabaseClient()
    await supabase.from('brand_profiles').update({ is_suspended: true }).eq('id', brand.id)
    await logAdminAction(user!.id, 'suspend_brand', 'brand', brand.id, {
      company: brand.company_name,
      email: brand.user?.email,
    })
    setBrands((prev) => prev.map((b) => (b.id === brand.id ? { ...b, is_suspended: true } : b)))
    setModalOpen(false)
    setActionLoading(false)
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
      key: 'company_name',
      header: 'Brand',
      render: (b: BrandRow) => (
        <div>
          <p className="text-sm text-white font-medium">{b.company_name}</p>
          {b.industry && <p className="text-xs text-zinc-500">{b.industry}</p>}
          {b.is_suspended && (
            <AdminBadge type="status" value="suspended" />
          )}
        </div>
      ),
    },
    {
      key: 'contact',
      header: 'Contact',
      render: (b: BrandRow) => (
        <div>
          <p className="text-sm text-zinc-300">{b.user?.full_name ?? '—'}</p>
          <p className="text-xs text-zinc-500">{b.user?.email ?? '—'}</p>
        </div>
      ),
    },
    {
      key: 'industry',
      header: 'Industry',
      render: (b: BrandRow) => (
        <span className="text-sm text-zinc-400">{b.industry ?? '—'}</span>
      ),
    },
    {
      key: 'campaigns',
      header: 'Campaigns',
      render: (b: BrandRow) => {
        const total = (b.campaigns ?? []).length
        const active = (b.campaigns ?? []).filter((c) => c.status === 'active').length
        return (
          <div>
            <p className="text-sm text-zinc-300">{total} total</p>
            {active > 0 && <p className="text-xs text-green-400">{active} active</p>}
          </div>
        )
      },
    },
    {
      key: 'spent',
      header: 'Total Spent',
      render: (b: BrandRow) => {
        const spent = (b.campaigns ?? []).reduce(
          (s, c) => s + (c.budget_total - c.budget_remaining),
          0
        )
        return <span className="text-sm text-[#00E5A0]">{formatLKR(spent)}</span>
      },
    },
    {
      key: 'created_at',
      header: 'Joined',
      sortable: true,
      render: (b: BrandRow) => (
        <span className="text-xs text-zinc-400">
          {b.user?.created_at ? format(new Date(b.user.created_at), 'MMM d, yyyy') : '—'}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (b: BrandRow) => (
        <div onClick={(e) => e.stopPropagation()}>
          {!b.is_suspended && (
            <button
              onClick={() => { setActiveBrand(b); setModalOpen(true) }}
              className="px-2 py-1 text-xs text-red-400 border border-red-800 hover:bg-red-800/20 transition-colors"
            >
              Suspend Brand
            </button>
          )}
          {b.is_suspended && (
            <span className="text-xs text-zinc-500">Suspended</span>
          )}
        </div>
      ),
    },
  ]

  return (
    <div>
      <div className="mb-6">
        <h1 className={`${syne.className} text-3xl font-bold text-white`}>Brands</h1>
        <p className="text-zinc-500 text-sm mt-1">Manage brand accounts and campaigns</p>
      </div>

      <div className="relative max-w-sm mb-4">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
        <input
          type="text"
          placeholder="Search by name, email, industry..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-[#111111] border border-zinc-800 text-white text-sm pl-9 pr-4 py-2 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600"
        />
      </div>

      <div className="bg-[#111111] border border-zinc-800">
        <DataTable data={filtered} columns={columns} emptyMessage="No brands found" pageSize={25} />
      </div>

      {activeBrand && (
        <ConfirmModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          onConfirm={() => handleSuspend(activeBrand)}
          title="Suspend Brand"
          description={
            <span>
              Suspend <strong className="text-white">{activeBrand.company_name}</strong>? Their campaigns may be impacted and they won&apos;t be able to create new ones.
            </span>
          }
          confirmText="Suspend Brand"
          confirmStyle="danger"
          isLoading={actionLoading}
        />
      )}
    </div>
  )
}
