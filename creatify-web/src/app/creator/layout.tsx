'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { getBrowserClient } from '@/lib/supabase-browser'
import {
  LayoutDashboard, Search, ListTodo,
  Wallet, User, LogOut, Menu, X
} from 'lucide-react'

const navItems = [
  { href: '/creator/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/creator/campaigns', icon: Search, label: 'Browse Campaigns' },
  { href: '/creator/tasks', icon: ListTodo, label: 'My Tasks' },
  { href: '/creator/wallet', icon: Wallet, label: 'Wallet' },
  { href: '/creator/profile', icon: User, label: 'Profile' },
]

export default function CreatorLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const [ready, setReady] = useState(false)
  const [initialized, setInitialized] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [userName, setUserName] = useState('')
  const [walletBalance, setWalletBalance] = useState(0)

  useEffect(() => {
    if (initialized) return
    setInitialized(true)

    const supabase = getBrowserClient()

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        window.location.href = '/auth/login'
        return
      }

      const role = session.user.user_metadata?.role
      if (role === 'brand') {
        window.location.href = '/brand/dashboard'
        return
      }

      const name =
        session.user.user_metadata?.full_name ||
        session.user.email || ''
      setUserName(name)

      supabase
        .from('creator_profiles')
        .select('wallet_balance')
        .eq('user_id', session.user.id)
        .maybeSingle()
        .then(({ data }) => {
          if (data?.wallet_balance) {
            setWalletBalance(data.wallet_balance)
          }
        })

      setReady(true)
    })
  }, [])

  const handleSignOut = async () => {
    await getBrowserClient().auth.signOut()
    window.location.href = '/'
  }

  if (!ready) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-[#6C47FF] border-t-transparent rounded-full animate-spin" />
          <p className="text-zinc-500 text-sm">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex">
      {/* Sidebar Desktop */}
      <aside className="hidden md:flex fixed left-0 top-0 h-full w-64 bg-[#111111] border-r border-zinc-800 flex-col z-40">
        <div className="p-6 border-b border-zinc-800">
          <Link href="/" className="text-[#6C47FF] font-black text-xl">Creatify</Link>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {navItems.map(({ href, icon: Icon, label }) => (
            <Link key={href} href={href}
              className={`flex items-center gap-3 px-4 py-3 text-sm transition-colors ${
                pathname === href || (href !== '/creator/dashboard' && pathname.startsWith(href))
                  ? 'bg-[#6C47FF]/10 text-white border-l-2 border-[#6C47FF]'
                  : 'text-zinc-400 hover:text-white'
              }`}>
              <Icon size={18} />
              {label}
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-zinc-800">
          <div className="bg-zinc-900 p-3 mb-3">
            <p className="text-zinc-500 text-xs uppercase tracking-wider mb-1">
              Available Balance
            </p>
            <p className="text-[#00E5A0] font-black text-xl">
              LKR {walletBalance.toLocaleString()}
            </p>
            <Link href="/creator/wallet"
              className="text-xs text-zinc-500 hover:text-white mt-1 block">
              Cash Out →
            </Link>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-[#6C47FF]/20 flex items-center justify-center">
              <span className="text-[#6C47FF] text-sm font-bold">
                {userName.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm truncate">{userName}</p>
              <p className="text-zinc-500 text-xs">Creator</p>
            </div>
            <button onClick={handleSignOut} className="text-zinc-500 hover:text-white">
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Header */}
      <header className="md:hidden fixed top-0 left-0 right-0 bg-[#111111] border-b border-zinc-800 z-40 flex items-center justify-between px-4 h-14">
        <Link href="/" className="text-[#6C47FF] font-black text-lg">Creatify</Link>
        <button onClick={() => setMobileOpen(!mobileOpen)}
          className="text-zinc-400 hover:text-white">
          {mobileOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </header>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 bg-black/80"
          onClick={() => setMobileOpen(false)}>
          <div className="absolute left-0 top-0 h-full w-64 bg-[#111111] border-r border-zinc-800 p-4"
            onClick={e => e.stopPropagation()}>
            <nav className="space-y-1 mt-14">
              {navItems.map(({ href, icon: Icon, label }) => (
                <Link key={href} href={href}
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 text-sm text-zinc-400 hover:text-white">
                  <Icon size={18} />{label}
                </Link>
              ))}
            </nav>
            <button onClick={handleSignOut}
              className="flex items-center gap-2 text-zinc-400 hover:text-white mt-8 px-4">
              <LogOut size={16} />Sign Out
            </button>
          </div>
        </div>
      )}

      {/* Content */}
      <main className="flex-1 md:ml-64 pt-14 md:pt-0 min-h-screen">
        <div className="p-6 md:p-8">
          {children}
        </div>
      </main>
    </div>
  )
}
