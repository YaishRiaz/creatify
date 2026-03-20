'use client'

import { Syne } from 'next/font/google'

const syne = Syne({ subsets: ['latin'], weight: ['700', '800'] })

interface StatCardProps {
  label: string
  value: string | number
  sub?: string
  icon: React.ReactNode
  alert?: boolean
  onClick?: () => void
}

export default function StatCard({ label, value, sub, icon, alert = false, onClick }: StatCardProps) {
  const isAlert = alert && typeof value === 'number' && value > 0

  return (
    <div
      className={[
        'bg-[#111111] border border-zinc-800 p-5 flex items-start gap-4',
        'hover:border-zinc-700 transition-colors',
        onClick ? 'cursor-pointer' : '',
      ].join(' ')}
      onClick={onClick}
    >
      <div
        className={[
          'w-10 h-10 flex items-center justify-center flex-shrink-0',
          isAlert ? 'text-red-400 bg-red-500/10' : 'text-[#6C47FF] bg-[#6C47FF]/10',
        ].join(' ')}
      >
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs text-zinc-500 uppercase tracking-wider">{label}</p>
        <p className={`${syne.className} text-2xl font-extrabold mt-1 ${isAlert ? 'text-red-400' : 'text-white'}`}>
          {value}
        </p>
        {sub && <p className="text-xs text-zinc-500 mt-1">{sub}</p>}
      </div>
    </div>
  )
}
