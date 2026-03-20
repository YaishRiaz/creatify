'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Syne } from 'next/font/google'
import { Search, ChevronDown, ChevronRight } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { useUser } from '@/hooks/useUser'
import { createSupabaseClient } from '@/lib/supabase'
import AdminBadge from '@/components/admin/AdminBadge'
import type { AuditLog } from '@/types'

const syne = Syne({ subsets: ['latin'], weight: ['700', '800'] })

const ENTITY_TYPES = ['all', 'task', 'creator', 'campaign', 'payout', 'brand']

export default function AuditLogPage() {
  const { user, loading } = useUser()
  const router = useRouter()

  const [logs, setLogs] = useState<AuditLog[]>([])
  const [page, setPage] = useState(0)
  const [totalCount, setTotalCount] = useState(0)
  const [search, setSearch] = useState('')
  const [entityFilter, setEntityFilter] = useState('all')
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [pageLoading, setPageLoading] = useState(true)

  const PAGE_SIZE = 50

  useEffect(() => {
    if (!loading && (!user || user.role !== 'admin')) router.push('/')
  }, [user, loading, router])

  useEffect(() => {
    if (!user || user.role !== 'admin') return
    fetchLogs()
  }, [user, page])

  async function fetchLogs() {
    setPageLoading(true)
    const supabase = createSupabaseClient()
    const { data, count } = await supabase
      .from('audit_logs')
      .select('*, admin:users(full_name, email)', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)
    setLogs((data as AuditLog[]) ?? [])
    setTotalCount(count ?? 0)
    setPageLoading(false)
  }

  const filtered = useMemo(() => {
    return logs.filter((log) => {
      const q = search.toLowerCase()
      const matchSearch =
        !q ||
        log.action.toLowerCase().includes(q) ||
        log.entity_type.toLowerCase().includes(q) ||
        log.entity_id.toLowerCase().includes(q) ||
        (log.admin?.full_name ?? '').toLowerCase().includes(q)
      const matchEntity = entityFilter === 'all' || log.entity_type === entityFilter
      return matchSearch && matchEntity
    })
  }, [logs, search, entityFilter])

  function toggleExpand(id: string) {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-[#6C47FF] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }
  if (!user || user.role !== 'admin') return null

  const startIdx = page * PAGE_SIZE + 1
  const endIdx = Math.min((page + 1) * PAGE_SIZE, totalCount)

  return (
    <div>
      <div className="mb-6">
        <h1 className={`${syne.className} text-3xl font-bold text-white`}>Audit Log</h1>
        <p className="text-zinc-500 text-sm mt-1">All admin actions are recorded here</p>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-6 flex-wrap">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            placeholder="Search action, entity, admin..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-[#111111] border border-zinc-800 text-white text-sm pl-9 pr-4 py-2 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600 w-72"
          />
        </div>
        <select
          value={entityFilter}
          onChange={(e) => setEntityFilter(e.target.value)}
          className="bg-[#111111] border border-zinc-800 text-zinc-400 text-sm px-3 py-2 focus:outline-none focus:border-zinc-600"
        >
          {ENTITY_TYPES.map((t) => (
            <option key={t} value={t}>{t === 'all' ? 'All Entities' : t.charAt(0).toUpperCase() + t.slice(1)}</option>
          ))}
        </select>
      </div>

      <div className="bg-[#111111] border border-zinc-800">
        {/* Table header */}
        <div className="grid grid-cols-[160px_160px_180px_120px_1fr] gap-4 px-5 py-3 bg-zinc-900/50 text-xs text-zinc-400 uppercase tracking-wider border-b border-zinc-800">
          <span>Time</span>
          <span>Admin</span>
          <span>Action</span>
          <span>Entity</span>
          <span>Details</span>
        </div>

        {pageLoading ? (
          <div className="divide-y divide-zinc-800/50">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="grid grid-cols-[160px_160px_180px_120px_1fr] gap-4 px-5 py-4">
                {Array.from({ length: 5 }).map((_, j) => (
                  <div key={j} className="bg-zinc-800/50 animate-pulse h-4 rounded" />
                ))}
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-center text-zinc-500 py-16">No audit logs found</p>
        ) : (
          <div className="divide-y divide-zinc-800/50">
            {filtered.map((log) => (
              <div key={log.id} className="px-5 py-4 hover:bg-zinc-900/30 transition-colors">
                <div className="grid grid-cols-[160px_160px_180px_120px_1fr] gap-4 items-start">
                  <div>
                    <p className="text-xs text-zinc-300">
                      {new Date(log.created_at).toLocaleString('en-LK', { timeZone: 'Asia/Colombo' })}
                    </p>
                    <p className="text-xs text-zinc-600 mt-0.5">
                      {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                    </p>
                  </div>
                  <div>
                    {log.admin ? (
                      <>
                        <p className="text-xs text-zinc-300">{log.admin.full_name}</p>
                        <p className="text-xs text-zinc-600">{log.admin.email}</p>
                      </>
                    ) : (
                      <span className="text-xs text-zinc-600 font-mono">{log.admin_user_id.slice(0, 8)}…</span>
                    )}
                  </div>
                  <div>
                    <AdminBadge type="action" value={log.action} />
                  </div>
                  <div>
                    <AdminBadge type="entity" value={log.entity_type.toUpperCase()} />
                    <p className="text-xs text-zinc-600 mt-1 font-mono">{log.entity_id.slice(0, 8)}…</p>
                  </div>
                  <div>
                    {Object.keys(log.details ?? {}).length > 0 ? (
                      <>
                        <button
                          onClick={() => toggleExpand(log.id)}
                          className="flex items-center gap-1 text-xs text-zinc-500 hover:text-white transition-colors"
                        >
                          {expanded[log.id] ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                          {expanded[log.id] ? 'Hide' : 'Show'} details
                        </button>
                        {expanded[log.id] && (
                          <pre className="text-xs font-mono text-zinc-400 mt-1 max-h-20 overflow-auto bg-zinc-900/50 p-2">
                            {JSON.stringify(log.details, null, 2)}
                          </pre>
                        )}
                      </>
                    ) : (
                      <span className="text-xs text-zinc-700">—</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-zinc-800">
          <span className="text-xs text-zinc-500">
            {totalCount > 0 ? `Showing ${startIdx}–${endIdx} of ${totalCount}` : 'No records'}
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="px-3 py-1 text-xs text-zinc-400 border border-zinc-700 hover:border-zinc-500 hover:text-white disabled:opacity-40 transition-colors"
            >
              Previous
            </button>
            <button
              onClick={() => setPage((p) => (endIdx < totalCount ? p + 1 : p))}
              disabled={endIdx >= totalCount}
              className="px-3 py-1 text-xs text-zinc-400 border border-zinc-700 hover:border-zinc-500 hover:text-white disabled:opacity-40 transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
