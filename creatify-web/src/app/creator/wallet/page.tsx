'use client'

import { useEffect, useMemo, useState } from 'react'
import { Syne, DM_Sans } from 'next/font/google'
import { Loader2 } from 'lucide-react'
import { createSupabaseClient } from '@/lib/supabase'
import { useUser } from '@/hooks/useUser'
import { useToast } from '@/components/shared/Toast'
import { formatDate } from '@/lib/utils'

const syne = Syne({ subsets: ['latin'], weight: ['700', '800'] })
const dmSans = DM_Sans({ subsets: ['latin'] })

interface CreatorProfile {
  id: string
  wallet_balance: number
  total_earned: number
}

interface Payout {
  id: string
  amount: number
  status: string
  bank_name: string | null
  account_number: string | null
  requested_at: string
  completed_at: string | null
}

const PAYOUT_STATUS_BADGE: Record<string, string> = {
  pending: 'bg-amber-500/10 text-amber-400',
  processing: 'bg-blue-500/10 text-blue-400',
  paid: 'bg-green-500/10 text-[#00E5A0]',
  failed: 'bg-red-500/10 text-red-400',
}

const MIN_CASHOUT = 500

export default function CreatorWalletPage() {
  const { user, loading: userLoading } = useUser()
  const supabase = useMemo(() => createSupabaseClient(), [])
  const { toast } = useToast()

  const [profile, setProfile] = useState<CreatorProfile | null>(null)
  const [payouts, setPayouts] = useState<Payout[]>([])
  const [loading, setLoading] = useState(true)

  // Cashout form
  const [bankName, setBankName] = useState('')
  const [accountNumber, setAccountNumber] = useState('')
  const [accountName, setAccountName] = useState('')
  const [amount, setAmount] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (userLoading || !user) return
    const fetchData = async () => {
      setLoading(true)
      const { data: prof } = await supabase
        .from('creator_profiles').select('id, wallet_balance, total_earned').eq('user_id', user.id).single()
      if (prof) {
        setProfile({ ...prof, wallet_balance: prof.wallet_balance ?? 0, total_earned: prof.total_earned ?? 0 })

        const { data: payoutData } = await supabase
          .from('payouts').select('*').eq('creator_id', prof.id).order('created_at', { ascending: false })
        setPayouts((payoutData ?? []) as Payout[])
      }
      setLoading(false)
    }
    fetchData()
  }, [user, userLoading, supabase])

  const handleCashout = async () => {
    if (!profile) return
    const amt = parseFloat(amount)
    if (!bankName.trim() || !accountNumber.trim() || !accountName.trim()) {
      toast('Please fill in all bank details.', 'error'); return
    }
    if (isNaN(amt) || amt < MIN_CASHOUT) {
      toast(`Minimum cashout is LKR ${MIN_CASHOUT}.`, 'error'); return
    }
    if (amt > profile.wallet_balance) {
      toast('Amount exceeds your available balance.', 'error'); return
    }

    setSubmitting(true)
    const { error } = await supabase.from('payouts').insert({
      creator_id: profile.id,
      amount: Math.round(amt * 100) / 100,
      bank_name: bankName.trim(),
      account_number: accountNumber.trim(),
      account_name: accountName.trim(),
      status: 'pending',
    })
    setSubmitting(false)

    if (error) { toast('Failed to submit cashout request. Please try again.', 'error'); return }

    // Deduct from wallet locally while DB trigger handles it
    setProfile((prev) => prev ? { ...prev, wallet_balance: Math.round((prev.wallet_balance - amt) * 100) / 100 } : null)
    setPayouts((prev) => [{
      id: Date.now().toString(),
      amount: amt,
      status: 'pending',
      bank_name: bankName.trim(),
      account_number: accountNumber.trim(),
      requested_at: new Date().toISOString(),
      completed_at: null,
    }, ...prev])
    setBankName(''); setAccountNumber(''); setAccountName(''); setAmount('')
    toast('Cashout request submitted! We\'ll process it within 3-5 business days.', 'success')
  }

  if (loading || userLoading) {
    return (
      <div className={`${dmSans.className} animate-pulse flex flex-col gap-6`}>
        <div className="h-40 bg-zinc-800/50 rounded" />
        <div className="h-64 bg-zinc-800/50 rounded" />
      </div>
    )
  }

  const walletBalance = profile?.wallet_balance ?? 0
  const totalEarned = profile?.total_earned ?? 0
  const canCashout = walletBalance >= MIN_CASHOUT

  return (
    <div className={dmSans.className}>
      <h1 className={`${syne.className} text-3xl font-extrabold text-white mb-8`}>Wallet</h1>

      {/* Balance hero */}
      <div className="bg-[#111111] border border-zinc-800 p-6 md:p-8 mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
        <div>
          <p className="text-xs text-zinc-400 uppercase tracking-wider mb-2">Available to Cash Out</p>
          <p className={`${syne.className} text-4xl md:text-5xl font-extrabold text-[#00E5A0] break-all`}>
            LKR {walletBalance.toLocaleString('en-LK')}
          </p>
          {!canCashout && (
            <p className="text-zinc-500 text-sm mt-3">
              LKR {Math.round((MIN_CASHOUT - walletBalance) * 100) / 100} more until minimum cashout
            </p>
          )}
        </div>
        <div className="text-right md:border-l md:border-zinc-800 md:pl-8">
          <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Lifetime Earned</p>
          <p className={`${syne.className} text-2xl font-extrabold text-zinc-300`}>
            LKR {totalEarned.toLocaleString('en-LK')}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Cashout form */}
        <div className="bg-[#111111] border border-zinc-800 p-6">
          <h2 className={`${syne.className} font-bold text-white mb-1`}>Request Cashout</h2>
          <p className="text-sm text-zinc-500 mb-5">Minimum LKR {MIN_CASHOUT}. Processed within 3–5 business days.</p>

          {!canCashout ? (
            <div className="bg-amber-500/5 border border-amber-500/20 p-4 text-sm text-amber-300">
              You need at least LKR {MIN_CASHOUT} to request a cashout.
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <div>
                <label className="block text-xs text-zinc-400 uppercase tracking-wider mb-1.5">Bank Name</label>
                <input
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  placeholder="e.g. Commercial Bank"
                  className="w-full bg-zinc-900 border border-zinc-800 focus:border-[#6C47FF] outline-none px-4 py-3 text-sm text-white rounded-none placeholder:text-zinc-600 transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs text-zinc-400 uppercase tracking-wider mb-1.5">Account Number</label>
                <input
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                  placeholder="1234567890"
                  className="w-full bg-zinc-900 border border-zinc-800 focus:border-[#6C47FF] outline-none px-4 py-3 text-sm text-white rounded-none placeholder:text-zinc-600 transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs text-zinc-400 uppercase tracking-wider mb-1.5">Account Holder Name</label>
                <input
                  value={accountName}
                  onChange={(e) => setAccountName(e.target.value)}
                  placeholder="Full name as on bank account"
                  className="w-full bg-zinc-900 border border-zinc-800 focus:border-[#6C47FF] outline-none px-4 py-3 text-sm text-white rounded-none placeholder:text-zinc-600 transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs text-zinc-400 uppercase tracking-wider mb-1.5">
                  Amount (LKR) <span className="normal-case text-zinc-600">max {walletBalance.toLocaleString('en-LK')}</span>
                </label>
                <input
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  type="number"
                  min={MIN_CASHOUT}
                  max={walletBalance}
                  placeholder={MIN_CASHOUT.toString()}
                  className="w-full bg-zinc-900 border border-zinc-800 focus:border-[#6C47FF] outline-none px-4 py-3 text-sm text-white rounded-none placeholder:text-zinc-600 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setAmount(walletBalance.toString())}
                  className="text-xs text-[#6C47FF] mt-1 hover:text-white transition-colors"
                >
                  Withdraw all
                </button>
              </div>
              <button
                onClick={handleCashout}
                disabled={submitting}
                className="bg-[#00E5A0] text-black px-6 py-3 text-sm font-semibold hover:bg-[#00c98e] transition-colors disabled:opacity-60 flex items-center gap-2 w-fit"
              >
                {submitting && <Loader2 size={14} className="animate-spin" />}
                Request Cashout
              </button>
            </div>
          )}
        </div>

        {/* Info */}
        <div className="bg-[#111111] border border-zinc-800 p-6">
          <h2 className={`${syne.className} font-bold text-white mb-4`}>How Payouts Work</h2>
          <ul className="flex flex-col gap-3 text-sm text-zinc-400">
            {[
              'Views are tracked every few hours by our system.',
              'Earnings are credited to your wallet automatically.',
              'Minimum cashout threshold is LKR 500.',
              'Payouts are processed within 3–5 business days.',
              'We transfer directly to your Sri Lankan bank account.',
              'Keep your post public for the full campaign duration to avoid clawbacks.',
            ].map((item, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="text-[#00E5A0] shrink-0">→</span>
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Payout history */}
      <div>
        <h2 className={`${syne.className} font-bold text-white text-lg mb-4`}>Payout History</h2>
        {payouts.length === 0 ? (
          <div className="bg-[#111111] border border-zinc-800 p-8 text-center">
            <p className="text-zinc-500 text-sm">No cashout requests yet.</p>
          </div>
        ) : (
          <div className="bg-[#111111] border border-zinc-800 divide-y divide-zinc-800/50">
            {payouts.map((p) => (
              <div key={p.id} className="px-5 py-4 flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white font-medium">LKR {p.amount.toLocaleString('en-LK')}</p>
                  <p className="text-xs text-zinc-500">{p.bank_name ?? 'Bank transfer'} · {formatDate(p.requested_at)}</p>
                </div>
                <span className={`text-xs px-2 py-0.5 capitalize ${PAYOUT_STATUS_BADGE[p.status] ?? 'bg-zinc-800 text-zinc-400'}`}>
                  {p.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
