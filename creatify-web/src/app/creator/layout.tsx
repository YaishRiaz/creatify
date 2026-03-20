'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard, Search, ListTodo, Wallet, User, LogOut, Menu, X,
} from 'lucide-react'
import { Syne } from 'next/font/google'
import { useUser } from '@/hooks/useUser'
import { createSupabaseClient } from '@/lib/supabase'

const syne = Syne({ subsets: ['latin'], weight: ['700', '800'] })

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
  const { user, loading } = useUser()
  const router = useRouter()
  const pathname = usePathname()
  const supabase = useMemo(() => createSupabaseClient(), [])
  const [mobileOpen, setMobileOpen] = useState(false)
  const [walletBalance, setWalletBalance] = useState<number | null>(null)

  useEffect(() => {
    if (!loading && !user) { router.push('/auth/login'); return }
    if (!loading && user?.role === 'brand') { router.push('/brand/dashboard'); return }
  }, [loading, user, router])

  useEffect(() => {
    if (!user) return
    const fetchBalance = async () => {
      const { data } = await supabase
        .from('creator_profiles')
        .select('wallet_balance')
        .eq('user_id', user.id)
        .single()
      if (data) setWalletBalance(data.wallet_balance ?? 0)
    }
    fetchBalance()
  }, [user, supabase])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-[#6C47FF] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!user) return null

  const initials = getInitials(user.full_name || user.email || 'C')

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      <div className="px-6 py-6 border-b border-zinc-800">
        <Link href="/" className={`${syne.className} text-xl font-extrabold text-[#6C47FF]`}>
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
        <p className={`${syne.className} text-xl font-extrabold text-[#00E5A0] mb-2`}>
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
          onClick={handleSignOut}
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
        <Link href="/" className={`${syne.className} text-lg font-extrabold text-[#6C47FF]`}>
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
