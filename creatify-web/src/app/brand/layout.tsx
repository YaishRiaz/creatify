'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
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
import { getSupabaseClient } from '@/lib/supabase-client'


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
  const { signOut } = useUser()
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)
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
        // Small delay to ensure localStorage is ready
        await new Promise(r => setTimeout(r, 100))

        const supabase = getSupabaseClient()

        const { data: { session }, error } = await supabase.auth.getSession()

        if (error) {
          console.error('Session error:', error)
        }

        if (session?.user) {
          const role = session.user.user_metadata?.role || 'brand'

          if (role !== 'brand' && role !== 'admin') {
            window.location.replace('/creator/dashboard')
            return
          }

          setAuthedUser({ id: session.user.id, email: session.user.email, role, full_name: session.user.user_metadata?.full_name })
          setChecking(false)
          return
        }

        // No session — try to recover from localStorage
        try {
          const stored = localStorage.getItem('creatify-auth')
          if (stored) {
            const parsed = JSON.parse(stored)
            if (parsed?.access_token) {
              const { data: refreshed } = await supabase.auth.setSession({
                access_token: parsed.access_token,
                refresh_token: parsed.refresh_token,
              })

              if (refreshed.session) {
                const role = refreshed.session.user.user_metadata?.role || 'brand'

                if (role !== 'brand' && role !== 'admin') {
                  window.location.replace('/creator/dashboard')
                  return
                }

                setAuthedUser({ id: refreshed.session.user.id, email: refreshed.session.user.email, role, full_name: refreshed.session.user.user_metadata?.full_name })
                setChecking(false)
                return
              }
            }
          }
        } catch (storageErr) {
          console.error('Storage recovery failed:', storageErr)
        }

        // Truly no session
        window.location.replace('/auth/login')

      } catch (err) {
        console.error('Auth check failed:', err)
        window.location.replace('/auth/login')
      }
    }

    checkAuth()
  }, [])

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
