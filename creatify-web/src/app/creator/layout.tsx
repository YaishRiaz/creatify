'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, Search, ListTodo, Wallet, User, LogOut, Menu, X,
} from 'lucide-react'
import { useUser } from '@/hooks/useUser'
import { getSupabaseClient } from '@/lib/supabase-client'


const navLinks = [
  { label: 'Dashboard', href: '/creator/dashboard', icon: LayoutDashboard },
  { label: 'Browse Campaigns', href: '/creator/campaigns', icon: Search },
  { label: 'My Tasks', href: '/creator/tasks', icon: ListTodo },
  { label: 'Wallet', href: '/creator/wallet', icon: Wallet },
  { label: 'Profile', href: '/creator/profile', icon: User },
]

function getInitials(name: string): string {
  return name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2)
}

export default function CreatorLayout({ children }: { children: React.ReactNode }) {
  const { signOut } = useUser()
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [walletBalance, setWalletBalance] = useState<number | null>(null)
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
    const checkAuth = async () => {
      try {
        const supabase = getSupabaseClient()

        const timeoutPromise = new Promise<null>(resolve => setTimeout(() => resolve(null), 3000))
        const sessionPromise = supabase.auth.getSession()

        const result = await Promise.race([sessionPromise, timeoutPromise])

        if (!result || !('data' in result) || !result.data.session) {
          window.location.replace('/auth/login')
          return
        }

        const session = result.data.session
        const metaRole = session.user.user_metadata?.role

        if (metaRole) {
          if (metaRole !== 'creator' && metaRole !== 'admin') {
            window.location.replace('/brand/dashboard')
            return
          }
          setAuthedUser({ id: session.user.id, email: session.user.email, role: metaRole, full_name: session.user.user_metadata?.full_name })
          setChecking(false)
          return
        }

        const { data: userData } = await Promise.race([
          supabase.from('users').select('role, full_name, email').eq('id', session.user.id).single(),
          new Promise<{ data: null }>(resolve => setTimeout(() => resolve({ data: null }), 2000)),
        ])

        const role = userData?.role || 'creator'

        if (role !== 'creator' && role !== 'admin') {
          window.location.replace('/brand/dashboard')
          return
        }

        setAuthedUser({ id: session.user.id, email: userData?.email || session.user.email, role, full_name: userData?.full_name })
        setChecking(false)
      } catch (err) {
        console.error('Auth check error:', err)
        window.location.replace('/auth/login')
      }
    }

    checkAuth()
  }, [])

  useEffect(() => {
    if (!authedUser) return
    const fetchBalance = async () => {
      const supabase = getSupabaseClient()
      const { data } = await supabase
        .from('creator_profiles')
        .select('wallet_balance')
        .eq('user_id', authedUser.id)
        .single()
      if (data) setWalletBalance(data.wallet_balance ?? 0)
    }
    fetchBalance()
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

  if (!authedUser) return null

  const user = authedUser

  const initials = getInitials(user.full_name || user.email || 'C')

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      <div className="px-6 py-6 border-b border-zinc-800">
        <Link href="/" className="font-syne text-xl font-extrabold text-[#6C47FF]">
          Creatify
        </Link>
      </div>

      <nav className="flex-1 px-3 py-6 flex flex-col gap-1">
        {navLinks.map(({ label, href, icon: Icon }) => {
          const active = pathname === href || (href !== '/creator/dashboard' && pathname.startsWith(href))
          return (
            <Link
              key={href}
              href={href}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 text-sm transition-colors ${
                active
                  ? 'bg-[#6C47FF]/10 text-white border-l-2 border-[#6C47FF] pl-[10px]'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Icon size={16} />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* Wallet mini widget */}
      <div className="px-4 py-4 border-t border-zinc-800">
        <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Available Balance</p>
        <p className="font-syne text-xl font-extrabold text-[#00E5A0] mb-2">
          {walletBalance !== null ? `LKR ${walletBalance.toLocaleString('en-LK')}` : '—'}
        </p>
        <Link
          href="/creator/wallet"
          onClick={() => setMobileOpen(false)}
          className="inline-block text-xs border border-[#00E5A0]/40 text-[#00E5A0] px-3 py-1.5 hover:bg-[#00E5A0]/10 transition-colors"
        >
          Cash Out
        </Link>
      </div>

      <div className="px-3 py-4 border-t border-zinc-800">
        <div className="flex items-center gap-3 px-3 mb-3">
          <div className="w-8 h-8 rounded-full bg-[#00E5A0]/10 border border-[#00E5A0]/20 flex items-center justify-center text-xs font-bold text-[#00E5A0] shrink-0">
            {initials}
          </div>
          <div className="min-w-0">
            <p className="text-sm text-white font-medium truncate">{user.full_name || user.email}</p>
            <p className="text-xs text-zinc-500">Creator Account</p>
          </div>
        </div>
        <button
          onClick={signOut}
          className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-zinc-400 hover:text-white transition-colors"
        >
          <LogOut size={16} />
          Sign Out
        </button>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#0A0A0A]">
      <aside className="hidden md:flex fixed top-0 left-0 h-full w-64 bg-[#111111] border-r border-zinc-800 flex-col z-40">
        <SidebarContent />
      </aside>

      <header className="md:hidden fixed top-0 left-0 right-0 z-50 bg-[#111111] border-b border-zinc-800 px-4 h-14 flex items-center justify-between">
        <Link href="/" className="font-syne text-lg font-extrabold text-[#6C47FF]">
          Creatify
        </Link>
        <button
          onClick={() => setMobileOpen((v) => !v)}
          className="text-zinc-400 hover:text-white transition-colors"
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </header>

      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-40">
          <div className="absolute inset-0 bg-black/60" onClick={() => setMobileOpen(false)} />
          <aside className="absolute top-14 left-0 bottom-0 w-64 bg-[#111111] border-r border-zinc-800">
            <SidebarContent />
          </aside>
        </div>
      )}

      <div className="md:ml-64 pt-14 md:pt-0">
        <main className="p-6 md:p-8">{children}</main>
      </div>
    </div>
  )
}
