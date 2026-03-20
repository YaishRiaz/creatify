'use client'

import { useState, useMemo, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard,
  Megaphone,
  BarChart2,
  Settings,
  LogOut,
  Menu,
  X,
} from 'lucide-react'
import { useUser } from '@/hooks/useUser'
import { createSupabaseClient } from '@/lib/supabase'


const navLinks = [
  { label: 'Dashboard', href: '/brand/dashboard', icon: LayoutDashboard },
  { label: 'Campaigns', href: '/brand/campaigns', icon: Megaphone },
  { label: 'Analytics', href: '/brand/analytics', icon: BarChart2 },
  { label: 'Settings', href: '/brand/settings', icon: Settings },
]

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export default function BrandLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useUser()
  const router = useRouter()
  const pathname = usePathname()
  const supabase = useMemo(() => createSupabaseClient(), [])
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/login')
    }
  }, [loading, user, router])

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

  const initials = getInitials(user.full_name || user.email || 'B')

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Wordmark */}
      <div className="px-6 py-6 border-b border-zinc-800">
        <Link href="/" className="font-syne text-xl font-extrabold text-[#6C47FF]">
          Creatify
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-6 flex flex-col gap-1">
        {navLinks.map(({ label, href, icon: Icon }) => {
          const active = pathname === href || (href !== '/brand/dashboard' && pathname.startsWith(href))
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

      {/* User + Sign Out */}
      <div className="px-3 py-4 border-t border-zinc-800">
        <div className="flex items-center gap-3 px-3 mb-3">
          <div className="w-8 h-8 rounded-full bg-[#6C47FF]/20 border border-[#6C47FF]/30 flex items-center justify-center text-xs font-bold text-[#6C47FF] shrink-0">
            {initials}
          </div>
          <div className="min-w-0">
            <p className="text-sm text-white font-medium truncate">{user.full_name || user.email}</p>
            <p className="text-xs text-zinc-500">Brand Account</p>
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
      {/* Desktop sidebar */}
      <aside className="hidden md:flex fixed top-0 left-0 h-full w-64 bg-[#111111] border-r border-zinc-800 flex-col z-40">
        <SidebarContent />
      </aside>

      {/* Mobile header */}
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

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-40">
          <div className="absolute inset-0 bg-black/60" onClick={() => setMobileOpen(false)} />
          <aside className="absolute top-14 left-0 bottom-0 w-64 bg-[#111111] border-r border-zinc-800">
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Main content */}
      <div className="md:ml-64 pt-14 md:pt-0">
        <main className="p-6 md:p-8">{children}</main>
      </div>
    </div>
  )
}
