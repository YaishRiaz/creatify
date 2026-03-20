'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Users, Megaphone, AlertTriangle, Wallet, Eye, DollarSign, UserCheck, Building2 } from 'lucide-react'
import { formatDistanceToNow, format, subDays } from 'date-fns'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { useUser } from '@/hooks/useUser'
import { createSupabaseClient } from '@/lib/supabase'
import StatCard from '@/components/admin/StatCard'
import AdminBadge from '@/components/admin/AdminBadge'
import type { AuditLog } from '@/types'


function formatLKR(n: number) {
  return `LKR ${n.toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}
function formatNum(n: number) {
  return n.toLocaleString('en-LK')
}

interface SignupDataPoint {
  date: string
  creators: number
  brands: number
}

interface ViewDataPoint {
  date: string
  views: number
}

export default function AdminOverviewPage() {
  const { user, loading } = useUser()
  const router = useRouter()

  const [totalUsers, setTotalUsers] = useState(0)
  const [totalCreators, setTotalCreators] = useState(0)
  const [totalBrands, setTotalBrands] = useState(0)
  const [activeCampaigns, setActiveCampaigns] = useState(0)
  const [totalViews, setTotalViews] = useState(0)
  const [platformRevenue, setPlatformRevenue] = useState(0)
  const [fraudFlags, setFraudFlags] = useState(0)
  const [pendingPayouts, setPendingPayouts] = useState(0)
  const [recentActivity, setRecentActivity] = useState<AuditLog[]>([])
  const [signupData, setSignupData] = useState<SignupDataPoint[]>([])
  const [viewData, setViewData] = useState<ViewDataPoint[]>([])
  const [dataLoading, setDataLoading] = useState(true)

  useEffect(() => {
    if (!loading && (!user || user.role !== 'admin')) router.push('/')
  }, [user, loading, router])

  useEffect(() => {
    if (!user || user.role !== 'admin') return

    const supabase = createSupabaseClient()

    async function fetchData() {
      const [
        { count: usersCount },
        { count: creatorsCount },
        { count: brandsCount },
        { count: activeCampaignsCount },
        { count: fraudCount },
        { count: payoutsCount },
        { data: tasks },
        { data: campaigns },
        { data: auditLogs },
        { data: users30 },
        { data: snapshots30 },
      ] = await Promise.all([
        supabase.from('users').select('*', { count: 'exact', head: true }),
        supabase.from('creator_profiles').select('*', { count: 'exact', head: true }),
        supabase.from('brand_profiles').select('*', { count: 'exact', head: true }),
        supabase.from('campaigns').select('*', { count: 'exact', head: true }).eq('status', 'active'),
        supabase.from('tasks').select('*', { count: 'exact', head: true }).eq('status', 'flagged'),
        supabase.from('payouts').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('tasks').select('total_views'),
        supabase.from('campaigns').select('budget_total, budget_remaining'),
        supabase
          .from('audit_logs')
          .select('*, admin:users(full_name, email)')
          .order('created_at', { ascending: false })
          .limit(20),
        supabase
          .from('users')
          .select('role, created_at')
          .gte('created_at', subDays(new Date(), 30).toISOString()),
        supabase
          .from('view_snapshots')
          .select('delta_views, snapshotted_at')
          .gte('snapshotted_at', subDays(new Date(), 30).toISOString()),
      ])

      setTotalUsers(usersCount ?? 0)
      setTotalCreators(creatorsCount ?? 0)
      setTotalBrands(brandsCount ?? 0)
      setActiveCampaigns(activeCampaignsCount ?? 0)
      setFraudFlags(fraudCount ?? 0)
      setPendingPayouts(payoutsCount ?? 0)

      const views = (tasks ?? []).reduce((s: number, t: { total_views: number }) => s + (t.total_views ?? 0), 0)
      setTotalViews(views)

      const revenue = (campaigns ?? []).reduce(
        (s: number, c: { budget_total: number; budget_remaining: number }) =>
          s + (c.budget_total - c.budget_remaining) * 0.15,
        0
      )
      setPlatformRevenue(revenue)

      setRecentActivity((auditLogs as AuditLog[]) ?? [])

      // Build signup chart data
      const days30 = Array.from({ length: 30 }, (_, i) => {
        const d = subDays(new Date(), 29 - i)
        return format(d, 'MM/dd')
      })
      const signupMap: Record<string, { creators: number; brands: number }> = {}
      days30.forEach((d) => { signupMap[d] = { creators: 0, brands: 0 } })
      ;(users30 ?? []).forEach((u: { role: string; created_at: string }) => {
        const day = format(new Date(u.created_at), 'MM/dd')
        if (signupMap[day]) {
          if (u.role === 'creator') signupMap[day].creators++
          else if (u.role === 'brand') signupMap[day].brands++
        }
      })
      setSignupData(days30.map((d) => ({ date: d, ...signupMap[d] })))

      // Build view chart data
      const viewMap: Record<string, number> = {}
      days30.forEach((d) => { viewMap[d] = 0 })
      ;(snapshots30 ?? []).forEach((s: { delta_views: number; snapshotted_at: string }) => {
        const day = format(new Date(s.snapshotted_at), 'MM/dd')
        if (viewMap[day] !== undefined) viewMap[day] += s.delta_views ?? 0
      })
      setViewData(days30.map((d) => ({ date: d, views: viewMap[d] })))

      setDataLoading(false)
    }

    fetchData()
  }, [user])

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-[#6C47FF] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }
  if (!user || user.role !== 'admin') return null

  const tooltipStyle = {
    contentStyle: {
      backgroundColor: '#111111',
      border: '1px solid #3f3f46',
      borderRadius: 0,
    },
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-syne text-3xl font-bold text-white">Overview</h1>
        <p className="text-zinc-500 text-sm mt-1">Platform health at a glance</p>
      </div>

      {/* Row 1 stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        <StatCard label="Total Users" value={formatNum(totalUsers)} icon={<Users size={20} />} />
        <StatCard label="Total Creators" value={formatNum(totalCreators)} icon={<UserCheck size={20} />} />
        <StatCard label="Total Brands" value={formatNum(totalBrands)} icon={<Building2 size={20} />} />
        <StatCard label="Active Campaigns" value={formatNum(activeCampaigns)} icon={<Megaphone size={20} />} />
      </div>

      {/* Row 2 stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Total Views Tracked" value={formatNum(totalViews)} icon={<Eye size={20} />} />
        <StatCard
          label="Platform Revenue"
          value={formatLKR(platformRevenue)}
          sub="15% of all spend"
          icon={<DollarSign size={20} />}
        />
        <StatCard
          label="Pending Fraud Flags"
          value={fraudFlags}
          icon={<AlertTriangle size={20} />}
          alert
          onClick={() => router.push('/admin/fraud')}
        />
        <StatCard
          label="Pending Payouts"
          value={pendingPayouts}
          icon={<Wallet size={20} />}
          alert
          onClick={() => router.push('/admin/payouts')}
        />
      </div>

      {/* Needs Attention */}
      {(fraudFlags > 0 || pendingPayouts > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          {fraudFlags > 0 && (
            <div
              className="bg-[#111111] border border-red-800/30 p-5 cursor-pointer hover:border-red-700/50 transition-colors"
              onClick={() => router.push('/admin/fraud')}
            >
              <div className="flex items-center gap-2 mb-1">
                <AlertTriangle size={16} className="text-red-400" />
                <span className="text-red-400 text-sm font-medium">Fraud Queue</span>
              </div>
              <p className="text-2xl font-bold text-white">
                {fraudFlags} task{fraudFlags !== 1 ? 's' : ''} flagged
              </p>
              <p className="text-zinc-500 text-xs mt-1">Requires review before payout</p>
            </div>
          )}
          {pendingPayouts > 0 && (
            <div
              className="bg-[#111111] border border-amber-800/30 p-5 cursor-pointer hover:border-amber-700/50 transition-colors"
              onClick={() => router.push('/admin/payouts')}
            >
              <div className="flex items-center gap-2 mb-1">
                <Wallet size={16} className="text-amber-400" />
                <span className="text-amber-400 text-sm font-medium">Pending Payouts</span>
              </div>
              <p className="text-2xl font-bold text-white">
                {pendingPayouts} payout{pendingPayouts !== 1 ? 's' : ''} waiting
              </p>
              <p className="text-zinc-500 text-xs mt-1">Creators waiting to be paid</p>
            </div>
          )}
        </div>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-[#111111] border border-zinc-800 p-6">
          <h3 className="font-syne text-base font-bold text-white mb-4">Signups Over Time</h3>
          {!dataLoading && (
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={signupData}>
                <CartesianGrid stroke="#27272a" strokeDasharray="3 3" />
                <XAxis dataKey="date" stroke="#52525b" tick={{ fill: '#71717a', fontSize: 11 }} />
                <YAxis stroke="#52525b" tick={{ fill: '#71717a', fontSize: 11 }} />
                <Tooltip {...tooltipStyle} />
                <Line type="monotone" dataKey="creators" stroke="#00E5A0" dot={false} strokeWidth={2} />
                <Line type="monotone" dataKey="brands" stroke="#6C47FF" dot={false} strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          )}
          <div className="flex gap-4 mt-2">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-0.5 bg-[#00E5A0]" />
              <span className="text-xs text-zinc-500">Creators</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-0.5 bg-[#6C47FF]" />
              <span className="text-xs text-zinc-500">Brands</span>
            </div>
          </div>
        </div>

        <div className="bg-[#111111] border border-zinc-800 p-6">
          <h3 className="font-syne text-base font-bold text-white mb-4">Views Tracked Per Day</h3>
          {!dataLoading && (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={viewData}>
                <CartesianGrid stroke="#27272a" strokeDasharray="3 3" />
                <XAxis dataKey="date" stroke="#52525b" tick={{ fill: '#71717a', fontSize: 11 }} />
                <YAxis stroke="#52525b" tick={{ fill: '#71717a', fontSize: 11 }} />
                <Tooltip {...tooltipStyle} />
                <Bar dataKey="views" fill="#6C47FF" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-[#111111] border border-zinc-800">
        <div className="p-5 border-b border-zinc-800">
          <h3 className="font-syne text-base font-bold text-white">Recent Activity</h3>
        </div>
        {recentActivity.length === 0 ? (
          <p className="text-zinc-500 text-sm p-8 text-center">No recent activity</p>
        ) : (
          <div className="divide-y divide-zinc-800/50">
            {recentActivity.map((log) => (
              <div key={log.id} className="flex items-start gap-4 px-5 py-3 hover:bg-zinc-900/30 transition-colors">
                <span className="text-xs text-zinc-500 whitespace-nowrap pt-0.5 w-24 flex-shrink-0">
                  {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                </span>
                <div className="flex items-center gap-2 flex-wrap">
                  <AdminBadge type="action" value={log.action} />
                  <AdminBadge type="entity" value={log.entity_type.toUpperCase()} />
                  {log.admin && (
                    <span className="text-xs text-zinc-500">by {log.admin.full_name}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
