'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Syne } from 'next/font/google'
import { format } from 'date-fns'
import { useUser } from '@/hooks/useUser'
import { createSupabaseClient } from '@/lib/supabase'
import AdminBadge from '@/components/admin/AdminBadge'

const syne = Syne({ subsets: ['latin'], weight: ['700', '800'] })

function buildPlatformCSV(campaigns: Record<string, unknown>[], tasks: Record<string, unknown>[]): string {
  const lines: string[] = [
    'Type,ID,Title/Status,Amount,Created At',
    ...campaigns.map((c) =>
      `campaign,"${c.id}","${String(c.title ?? '').replace(/"/g, '""')}","${c.budget_total}","${c.created_at}"`
    ),
    ...tasks.map((t) =>
      `task,"${t.id}","${t.status}","${t.total_earned}","${t.created_at}"`
    ),
  ]
  return lines.join('\n')
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

export default function AdminSettingsPage() {
  const { user, loading } = useUser()
  const router = useRouter()

  const [pollLoading, setPollLoading] = useState(false)
  const [pollStatus, setPollStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [exportLoading, setExportLoading] = useState(false)

  useEffect(() => {
    if (!loading && (!user || user.role !== 'admin')) router.push('/')
  }, [user, loading, router])

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-[#6C47FF] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }
  if (!user || user.role !== 'admin') return null

  async function handleForcePoll() {
    setPollLoading(true)
    setPollStatus('idle')
    try {
      const supabase = createSupabaseClient()
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token
      if (!token) {
        setPollStatus('error')
        return
      }
      const res = await fetch('/api/poll/trigger', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      })
      if (res.ok) {
        setPollStatus('success')
      } else {
        setPollStatus('error')
      }
    } catch {
      setPollStatus('error')
    } finally {
      setPollLoading(false)
      setTimeout(() => setPollStatus('idle'), 4000)
    }
  }

  async function handleExport() {
    setExportLoading(true)
    const supabase = createSupabaseClient()
    const [{ data: campaigns }, { data: tasks }] = await Promise.all([
      supabase.from('campaigns').select('id, title, budget_total, status, created_at'),
      supabase.from('tasks').select('id, status, total_earned, created_at'),
    ])
    const csv = buildPlatformCSV(
      (campaigns as Record<string, unknown>[]) ?? [],
      (tasks as Record<string, unknown>[]) ?? []
    )
    downloadCSV(csv, `creatify-export-${format(new Date(), 'yyyy-MM-dd')}.csv`)
    setExportLoading(false)
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-8">
        <h1 className={`${syne.className} text-3xl font-bold text-white`}>Settings</h1>
        <p className="text-zinc-500 text-sm mt-1">Platform configuration and admin tools</p>
      </div>

      <div className="space-y-6">
        {/* Platform Fee */}
        <div className="bg-[#111111] border border-zinc-800 p-6">
          <h2 className={`${syne.className} text-base font-bold text-white mb-3`}>Platform Fee</h2>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-zinc-300">Creator payout fee</p>
              <p className="text-xs text-zinc-500 mt-0.5">Applied to all campaign budgets</p>
            </div>
            <span className="text-2xl font-bold text-[#6C47FF]">15%</span>
          </div>
          <p className="text-xs text-zinc-600 mt-4">
            Platform fee is fixed at 15% and cannot be changed from this panel.
          </p>
        </div>

        {/* Cashout Settings */}
        <div className="bg-[#111111] border border-zinc-800 p-6">
          <h2 className={`${syne.className} text-base font-bold text-white mb-3`}>Cashout Settings</h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm text-zinc-400">Minimum cashout amount</p>
              <span className="text-sm text-white font-medium">LKR 500.00</span>
            </div>
            <div className="flex items-center justify-between">
              <p className="text-sm text-zinc-400">Processing time</p>
              <span className="text-sm text-white font-medium">1–3 business days</span>
            </div>
          </div>
          <p className="text-xs text-zinc-600 mt-4">
            These settings are currently fixed and managed in code.
          </p>
        </div>

        {/* Admin Account */}
        <div className="bg-[#111111] border border-zinc-800 p-6">
          <h2 className={`${syne.className} text-base font-bold text-white mb-4`}>Your Admin Account</h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs text-zinc-500 uppercase tracking-wider">Email</p>
              <p className="text-sm text-zinc-300">{user.email}</p>
            </div>
            <div className="flex items-center justify-between">
              <p className="text-xs text-zinc-500 uppercase tracking-wider">Name</p>
              <p className="text-sm text-zinc-300">{user.full_name}</p>
            </div>
            <div className="flex items-center justify-between">
              <p className="text-xs text-zinc-500 uppercase tracking-wider">Role</p>
              <AdminBadge type="role" value={user.role} />
            </div>
          </div>
          <div className="mt-5 pt-4 border-t border-zinc-800">
            <a
              href="/auth/reset-password"
              className="text-sm text-[#6C47FF] hover:underline"
            >
              Change Password →
            </a>
          </div>
        </div>

        {/* Danger Zone */}
        <div className="bg-red-950/20 border border-red-800/30 p-6">
          <h2 className={`${syne.className} text-base font-bold text-red-400 mb-4`}>Danger Zone</h2>
          <div className="space-y-6">
            <div className="flex items-start justify-between gap-6">
              <div>
                <p className="text-sm text-white font-medium">Force Poll All Tasks</p>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Trigger the Go backend to immediately poll all active task views. Use sparingly.
                </p>
                {pollStatus === 'success' && (
                  <p className="text-xs text-green-400 mt-1">Poll triggered successfully.</p>
                )}
                {pollStatus === 'error' && (
                  <p className="text-xs text-red-400 mt-1">Failed to trigger poll. Check API connectivity.</p>
                )}
              </div>
              <button
                onClick={handleForcePoll}
                disabled={pollLoading}
                className="bg-red-900/30 hover:bg-red-900/50 border border-red-700 text-red-400 px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50 flex items-center gap-2 whitespace-nowrap flex-shrink-0"
              >
                {pollLoading && (
                  <span className="w-4 h-4 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                )}
                Force Poll
              </button>
            </div>

            <div className="border-t border-red-800/20 pt-6 flex items-start justify-between gap-6">
              <div>
                <p className="text-sm text-white font-medium">Export Platform Data</p>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Download all campaigns and tasks as a CSV file.
                </p>
              </div>
              <button
                onClick={handleExport}
                disabled={exportLoading}
                className="bg-red-900/30 hover:bg-red-900/50 border border-red-700 text-red-400 px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50 flex items-center gap-2 whitespace-nowrap flex-shrink-0"
              >
                {exportLoading && (
                  <span className="w-4 h-4 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                )}
                Export CSV
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
