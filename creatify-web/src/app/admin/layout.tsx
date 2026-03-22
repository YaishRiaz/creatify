'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import {
  LayoutDashboard,
  AlertTriangle,
  Wallet,
  Megaphone,
  Users,
  Building2,
  ScrollText,
  Settings,
  LogOut,
} from 'lucide-react'
import { useUser } from '@/hooks/useUser'
import { supabase } from '@/lib/supabase-client'


const navItems = [
  { href: '/admin', icon: LayoutDashboard, label: 'Overview' },
  { href: '/admin/fraud', icon: AlertTriangle, label: 'Fraud Queue', alertKey: 'fraud' },
  { href: '/admin/payouts', icon: Wallet, label: 'Payouts', alertKey: 'payouts' },
  { href: '/admin/campaigns', icon: Megaphone, label: 'Campaigns' },
  { href: '/admin/creators', icon: Users, label: 'Creators' },
  { href: '/admin/brands', icon: Building2, label: 'Brands' },
  { href: '/admin/audit', icon: ScrollText, label: 'Audit Log' },
  { href: '/admin/settings', icon: Settings, label: 'Settings' },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { signOut } = useUser()
  const pathname = usePathname()
  const [fraudCount, setFraudCount] = useState(0)
  const [payoutCount, setPayoutCount] = useState(0)
  const [checking, setChecking] = useState(true)
  const [timedOut, setTimedOut] = useState(false)
  const [authedUser, setAuthedUser] = useState<{ id: string; full_name?: string; email?: string; role?: string } | null>(null)

  useEffect(() => {
    const timer = setTimeout(() => {
      setTimedOut(true)
      setChecking(false)
    }, 5000)
    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        window.location.href = '/auth/login'
        return
      }

      const role = session.user.user_metadata?.role

      if (role !== 'admin') {
        window.location.href = '/'
        return
      }

      setAuthedUser({ id: session.user.id, email: session.user.email, role, full_name: session.user.user_metadata?.full_name })
      setChecking(false)
    })
  }, [])

  useEffect(() => {
    if (!authedUser || authedUser.role !== 'admin') return
    async function fetchCounts() {
      const [{ count: fc }, { count: pc }] = await Promise.all([
        supabase.from('tasks').select('*', { count: 'exact', head: true }).eq('status', 'flagged'),
        supabase.from('payouts').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
      ])
      setFraudCount(fc ?? 0)
      setPayoutCount(pc ?? 0)
    }
    fetchCounts()
  }, [authedUser])

  if (checking) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-[#6C47FF] border-t-transparent rounded-full animate-spin" />
          <p className="text-zinc-500 text-sm">Loading your dashboard...</p>
          <p className="text-zinc-700 text-xs mt-2">
            Taking too long?{' '}
            <a href="/auth/login" className="text-[#6C47FF] hover:underline">
              Back to login
            </a>
          </p>
        </div>
      </div>
    )
  }

  if (!authedUser || authedUser.role !== 'admin') return null

  const user = authedUser

  async function handleSignOut() {
    await signOut()
  }

  function isActive(href: string) {
    if (href === '/admin') return pathname === '/admin'
    return pathname.startsWith(href)
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex">
      <aside className="fixed top-0 left-0 h-full w-64 bg-[#111111] border-r border-zinc-800 flex flex-col z-40">
        <div className="p-6 border-b border-zinc-800">
          <Link href="/admin">
            <span className="font-syne text-xl font-bold text-[#6C47FF]">Creatify</span>
          </Link>
          <div className="bg-red-500/10 text-red-400 text-xs tracking-[0.2em] px-2 py-1 w-fit mt-1">
            ADMIN PANEL
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const active = isActive(item.href)
            const fraudBadge = item.alertKey === 'fraud' && fraudCount > 0
            const payoutBadge = item.alertKey === 'payouts' && payoutCount > 0
            return (
              <Link
                key={item.href}
                href={item.href}
                className={[
                  'flex items-center justify-between px-3 py-2.5 text-sm transition-colors',
                  active
                    ? 'bg-[#6C47FF]/10 text-white border-l-2 border-[#6C47FF]'
                    : 'text-zinc-400 hover:text-white',
                ].join(' ')}
              >
                <div className="flex items-center gap-3">
                  <item.icon size={16} />
                  {item.label}
                </div>
                {fraudBadge && (
                  <span className="bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                    {fraudCount}
                  </span>
                )}
                {payoutBadge && (
                  <span className="bg-amber-500 text-black text-xs px-1.5 py-0.5 rounded-full">
                    {payoutCount}
                  </span>
                )}
              </Link>
            )
          })}
        </nav>

        <div className="p-4 border-t border-zinc-800">
          <div className="mb-3">
            <p className="text-sm text-white truncate">{user.full_name}</p>
            <p className="text-xs text-zinc-500">Administrator</p>
          </div>
          <button
            onClick={handleSignOut}
            className="flex items-center gap-2 text-zinc-400 hover:text-white text-sm transition-colors w-full"
          >
            <LogOut size={14} />
            Sign Out
          </button>
        </div>
      </aside>

      <div className="flex-1 md:ml-64 flex flex-col">
        {(fraudCount > 0 || payoutCount > 0) && (
          <div className="bg-amber-500/5 border-b border-amber-500/20 text-amber-400 text-sm py-2 px-8">
            {fraudCount > 0 && `⚠ ${fraudCount} fraud flags`}
            {fraudCount > 0 && payoutCount > 0 && ' · '}
            {payoutCount > 0 && `💰 ${payoutCount} pending payouts`}
          </div>
        )}
        <main className="flex-1 p-6 md:p-8 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
