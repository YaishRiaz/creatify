'use client'

interface AdminBadgeProps {
  type: 'status' | 'platform' | 'entity' | 'action' | 'role'
  value: string
}

function getStatusClass(value: string): string {
  switch (value.toLowerCase()) {
    case 'active':
      return 'bg-green-500/10 text-green-400'
    case 'pending':
    case 'submitted':
    case 'pending_payment':
      return 'bg-amber-500/10 text-amber-400'
    case 'completed':
      return 'bg-zinc-700 text-zinc-300'
    case 'flagged':
    case 'rejected':
      return 'bg-red-500/10 text-red-400'
    case 'paused':
      return 'bg-blue-500/10 text-blue-400'
    case 'processing':
      return 'bg-blue-500/10 text-blue-400'
    case 'failed':
      return 'bg-red-500/10 text-red-400'
    case 'suspended':
      return 'bg-red-500/10 text-red-400'
    case 'tracking':
      return 'bg-[#6C47FF]/10 text-[#6C47FF]'
    default:
      return 'bg-zinc-700 text-zinc-300'
  }
}

function getPlatformClass(value: string): string {
  switch (value.toLowerCase()) {
    case 'tiktok':
      return 'bg-black text-white'
    case 'youtube':
      return 'bg-red-600 text-white'
    case 'instagram':
      return 'bg-pink-600 text-white'
    case 'facebook':
      return 'bg-blue-600 text-white'
    default:
      return 'bg-zinc-700 text-white'
  }
}

function getEntityClass(_value: string): string {
  return 'bg-zinc-800 text-zinc-300'
}

function getActionClass(value: string): string {
  if (
    value.startsWith('approve_') ||
    value.startsWith('reinstate_') ||
    value === 'mark_payout_paid'
  ) {
    return 'bg-green-500/10 text-green-400'
  }
  if (
    value.startsWith('reject_') ||
    value.startsWith('suspend_') ||
    value === 'mark_payout_failed'
  ) {
    return 'bg-red-500/10 text-red-400'
  }
  if (value === 'adjust_wallet' || value.startsWith('force_')) {
    return 'bg-amber-500/10 text-amber-400'
  }
  if (value.startsWith('pause_')) {
    return 'bg-blue-500/10 text-blue-400'
  }
  if (value.startsWith('resume_') || value === 'mark_payout_processing') {
    return 'bg-green-500/10 text-green-400'
  }
  return 'bg-zinc-700 text-zinc-300'
}

export default function AdminBadge({ type, value }: AdminBadgeProps) {
  let cls = ''
  switch (type) {
    case 'status':
      cls = getStatusClass(value)
      break
    case 'platform':
      cls = getPlatformClass(value)
      break
    case 'entity':
      cls = getEntityClass(value)
      break
    case 'action':
      cls = getActionClass(value)
      break
    case 'role':
      cls = value === 'admin' ? 'bg-[#6C47FF]/10 text-[#6C47FF]' : 'bg-zinc-700 text-zinc-300'
      break
    default:
      cls = 'bg-zinc-700 text-zinc-300'
  }

  return (
    <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium uppercase tracking-wider ${cls}`}>
      {value.replace(/_/g, ' ')}
    </span>
  )
}
