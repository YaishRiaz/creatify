'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useMemo, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { createSupabaseClient } from '@/lib/supabase'
import { useUser } from '@/hooks/useUser'
import { useToast } from '@/components/shared/Toast'
import { formatDate } from '@/lib/utils'


interface CreatorProfile {
  id: string
  wallet_balance: number
  total_earned: number
}

interface EarningTask {
  id: string
  platform: string
  total_views: number
  total_earned: number
  campaign: { title: string; payout_rate: number } | null
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

// Minimum cashout is LKR 5,000
// Changed from LKR 500 on March 2026
// Bank transfer overhead too high for small amounts
const MIN_CASHOUT = 5000

export default function CreatorWalletPage() {
  const { user, loading: userLoading } = useUser()
  const supabase = useMemo(() => createSupabaseClient(), [])
  const { toast } = useToast()

  const [profile, setProfile] = useState<CreatorProfile | null>(null)
  const [payouts, setPayouts] = useState<Payout[]>([])
  const [earningTasks, setEarningTasks] = useState<EarningTask[]>([])
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
        .from('creator_profiles').select('id, wallet_balance, total_earned').eq('user_id', user.id).maybeSingle()
      if (prof) {
        setProfile({ ...prof, wallet_balance: prof.wallet_balance ?? 0, total_earned: prof.total_earned ?? 0 })

        const { data: payoutData } = await supabase
          .from('payouts').select('*').eq('creator_id', prof.id).order('requested_at', { ascending: false })
        setPayouts((payoutData ?? []) as Payout[])

        const { data: taskData } = await supabase
          .from('tasks')
          .select('id, platform, total_views, total_earned, campaign:campaigns(title, payout_rate)')
          .eq('creator_id', prof.id)
          .gt('total_earned', 0)
          .order('total_earned', { ascending: false })
        setEarningTasks(
          (taskData ?? []).map((t) => ({
            ...t,
            campaign: Array.isArray(t.campaign) ? (t.campaign[0] ?? null) : t.campaign,
          })) as EarningTask[]
        )
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

    // Deduct from wallet balance in DB
    const newBalance = Math.round((profile.wallet_balance - amt) * 100) / 100
    await supabase.from('creator_profiles').update({ wallet_balance: newBalance }).eq('id', profile.id)

    setProfile((prev) => prev ? { ...prev, wallet_balance: newBalance } : null)
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
      <div className="font-sans animate-pulse flex flex-col gap-6">
        <div className="h-40 bg-zinc-800/50 rounded" />
        <div className="h-64 bg-zinc-800/50 rounded" />
      </div>
    )
  }

  const walletBalance = profile?.wallet_balance ?? 0
  const totalEarned = profile?.total_earned ?? 0
  const canCashout = walletBalance >= MIN_CASHOUT

  return (
    <div className="font-sans">
      <h1 className="font-syne text-3xl font-extrabold text-white mb-8">Wallet</h1>

      {/* Balance hero */}
      <div className="bg-[#111111] border border-zinc-800 p-6 md:p-8 mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
        <div>
          <p className="text-xs text-zinc-400 uppercase tracking-wider mb-2">Available to Cash Out</p>
          <p className="font-syne text-4xl md:text-5xl font-extrabold text-[#00E5A0] break-all">
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
          <p className="font-syne text-2xl font-extrabold text-zinc-300">
            LKR {totalEarned.toLocaleString('en-LK')}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Cashout form */}
        <div className="bg-[#111111] border border-zinc-800 p-6">
          <h2 className="font-syne font-bold text-white mb-1">Request Cashout</h2>
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
          <h2 className="font-syne font-bold text-white mb-4">How Payouts Work</h2>
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

      {/* Earnings breakdown */}
      {earningTasks.length > 0 && (
        <div className="mb-8">
          <h2 className="font-syne font-bold text-white text-lg mb-4">Earnings Breakdown</h2>
          <div className="bg-[#111111] border border-zinc-800 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800">
                  <th className="text-left px-5 py-3 text-xs text-zinc-500 uppercase tracking-wider font-medium">Campaign</th>
                  <th className="text-left px-5 py-3 text-xs text-zinc-500 uppercase tracking-wider font-medium">Platform</th>
                  <th className="text-right px-5 py-3 text-xs text-zinc-500 uppercase tracking-wider font-medium">Views</th>
                  <th className="text-right px-5 py-3 text-xs text-zinc-500 uppercase tracking-wider font-medium">Earned</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/50">
                {earningTasks.map((t) => (
                  <tr key={t.id}>
                    <td className="px-5 py-3 text-zinc-300 max-w-[200px] truncate">
                      {t.campaign?.title ?? '—'}
                    </td>
                    <td className="px-5 py-3">
                      <span className={`text-xs px-2 py-0.5 capitalize ${
                        t.platform === 'tiktok' ? 'bg-pink-500/10 text-pink-400' :
                        t.platform === 'instagram' ? 'bg-orange-500/10 text-orange-400' :
                        t.platform === 'youtube' ? 'bg-red-500/10 text-red-400' :
                        'bg-blue-500/10 text-blue-400'
                      }`}>{t.platform}</span>
                    </td>
                    <td className="px-5 py-3 text-right text-zinc-300">{(t.total_views ?? 0).toLocaleString('en-LK')}</td>
                    <td className="px-5 py-3 text-right font-semibold text-[#00E5A0]">LKR {(t.total_earned ?? 0).toLocaleString('en-LK')}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-zinc-700">
                  <td className="px-5 py-3 text-zinc-400 text-xs uppercase tracking-wider" colSpan={2}>Total</td>
                  <td className="px-5 py-3 text-right text-zinc-300">
                    {earningTasks.reduce((s, t) => s + (t.total_views ?? 0), 0).toLocaleString('en-LK')}
                  </td>
                  <td className="font-syne px-5 py-3 text-right font-bold text-[#00E5A0]">
                    LKR {earningTasks.reduce((s, t) => s + (t.total_earned ?? 0), 0).toLocaleString('en-LK')}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* Payout history */}
      <div>
        <h2 className="font-syne font-bold text-white text-lg mb-4">Payout History</h2>
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
