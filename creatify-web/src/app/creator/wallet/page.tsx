'use client'
export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { getBrowserClient } from '@/lib/supabase-browser'
import { Wallet, Clock, CheckCircle, AlertCircle, Info } from 'lucide-react'

export default function CreatorWalletPage() {
  const [loading, setLoading] = useState(true)
  const [requesting, setRequesting] = useState(false)
  const [requested, setRequested] = useState(false)
  const [error, setError] = useState('')
  const [walletBalance, setWalletBalance] = useState(0)
  const [totalEarned, setTotalEarned] = useState(0)
  const [payouts, setPayouts] = useState<any[]>([])
  const [bankName, setBankName] = useState('')
  const [bankAccount, setBankAccount] = useState('')
  const [hasBankDetails, setHasBankDetails] = useState(false)
  const MIN_CASHOUT = 5000

  useEffect(() => {
    const load = async () => {
      const supabase = getBrowserClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { window.location.href = '/auth/login'; return }

      const { data: profile } = await supabase
        .from('creator_profiles')
        .select('id, wallet_balance, total_earned, bank_name, bank_account')
        .eq('user_id', session.user.id)
        .maybeSingle()

      if (profile) {
        setWalletBalance(profile.wallet_balance || 0)
        setTotalEarned(profile.total_earned || 0)
        setBankName(profile.bank_name || '')
        setBankAccount(profile.bank_account || '')
        setHasBankDetails(!!(profile.bank_name && profile.bank_account))

        const { data: payoutData } = await supabase
          .from('payouts')
          .select('*')
          .eq('creator_id', profile.id)
          .order('created_at', { ascending: false })
          .limit(20)

        setPayouts(payoutData || [])
      }
      setLoading(false)
    }
    load()
  }, [])

  const handleCashout = async () => {
    if (!hasBankDetails) {
      setError('Please add your bank details in Profile before requesting a cashout.')
      return
    }
    setRequesting(true)
    const supabase = getBrowserClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return

    const { data: profile } = await supabase
      .from('creator_profiles')
      .select('id')
      .eq('user_id', session.user.id)
      .maybeSingle()

    if (!profile) return

    const { error: err } = await supabase
      .from('payouts')
      .insert({
        creator_id: profile.id,
        amount: walletBalance,
        status: 'pending',
        bank_name: bankName,
        bank_account: bankAccount,
      })

    if (err) { setError(err.message); setRequesting(false); return }
    setRequested(true)
    setRequesting(false)
  }

  const progressPct = Math.min((walletBalance / MIN_CASHOUT) * 100, 100)

  if (loading) return (
    <div className="flex items-center justify-center min-h-64">
      <div className="w-8 h-8 border-2 border-[#6C47FF]
      border-t-transparent rounded-full animate-spin" />
    </div>
  )

  const statusConfig: Record<string, { icon: any, color: string, label: string }> = {
    pending: { icon: Clock, color: 'text-amber-400', label: 'Pending' },
    processing: { icon: Clock, color: 'text-blue-400', label: 'Processing' },
    completed: { icon: CheckCircle, color: 'text-[#00E5A0]', label: 'Completed' },
    failed: { icon: AlertCircle, color: 'text-red-400', label: 'Failed' },
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-white mb-1">Wallet</h1>
        <p className="text-zinc-400">Your earnings and cashout history.</p>
      </div>

      {error && (
        <div className="bg-red-950/20 border border-red-800/30
        px-4 py-3 mb-6 text-sm text-red-400 flex
        justify-between items-center">
          <span>{error}</span>
          <button onClick={() => setError('')}
            className="text-red-600 ml-4">✕</button>
        </div>
      )}

      {requested && (
        <div className="bg-green-950/20 border border-green-800/30
        px-4 py-3 mb-6 text-sm text-[#00E5A0]">
          Cashout requested! We&apos;ll process it within 3–5 business days.
        </div>
      )}

      {/* Balance card */}
      <div className="bg-[#111111] border border-zinc-800 p-8 mb-4">
        <div className="flex justify-between items-start mb-6">
          <div>
            <p className="text-zinc-500 text-xs uppercase
            tracking-wider mb-2">Available Balance</p>
            <p className="text-[#00E5A0] font-black text-5xl">
              LKR {walletBalance.toLocaleString()}
            </p>
          </div>
          <div className="text-right">
            <p className="text-zinc-500 text-xs uppercase
            tracking-wider mb-2">Lifetime Earned</p>
            <p className="text-white font-black text-2xl">
              LKR {totalEarned.toLocaleString()}
            </p>
          </div>
        </div>

        {walletBalance >= MIN_CASHOUT ? (
          <button onClick={handleCashout} disabled={requesting || requested}
            className="w-full bg-[#00E5A0] text-black py-4
            font-bold hover:bg-[#00c98e] transition-colors
            disabled:opacity-50">
            {requesting ? 'Requesting...' : requested ? 'Request Submitted ✓' : `Cash Out LKR ${walletBalance.toLocaleString()}`}
          </button>
        ) : (
          <div>
            <div className="flex justify-between text-xs mb-2">
              <span className="text-zinc-500">Progress to cashout</span>
              <span className="text-white">
                LKR {walletBalance.toLocaleString()} / {MIN_CASHOUT.toLocaleString()}
              </span>
            </div>
            <div className="h-2 bg-zinc-800 w-full mb-2">
              <div className="h-full bg-[#6C47FF] transition-all"
                style={{ width: `${progressPct}%` }} />
            </div>
            <p className="text-zinc-500 text-sm">
              LKR {(MIN_CASHOUT - walletBalance).toLocaleString()} more to unlock cashout
            </p>
          </div>
        )}
      </div>

      {/* How payouts work */}
      <div className="bg-[#111111] border border-zinc-800 p-6 mb-4">
        <div className="flex items-center gap-2 mb-4">
          <Info size={16} className="text-[#6C47FF]" />
          <h2 className="text-white font-semibold">How Payouts Work</h2>
        </div>
        <div className="space-y-3">
          {[
            'Views are tracked every 6 hours by our system.',
            'Earnings are credited to your wallet automatically.',
            'Minimum cashout threshold is LKR 5,000.',
            'Payouts are processed within 3–5 business days.',
            'We transfer directly to your Sri Lankan bank account.',
            'Keep your post public for the full campaign duration to avoid clawbacks.',
          ].map((point, i) => (
            <div key={i} className="flex items-start gap-3">
              <span className="text-[#6C47FF] font-bold text-sm
              flex-shrink-0 mt-0.5">→</span>
              <p className="text-zinc-400 text-sm">{point}</p>
            </div>
          ))}
        </div>
        {!hasBankDetails && (
          <div className="mt-4 bg-amber-950/20 border
          border-amber-800/30 px-4 py-3">
            <p className="text-amber-400 text-sm">
              ⚠️ Add your bank details in{' '}
              <a href="/creator/profile"
                className="underline hover:text-white">
                Profile
              </a>
              {' '}before requesting a cashout.
            </p>
          </div>
        )}
      </div>

      {/* Payout history */}
      <div className="bg-[#111111] border border-zinc-800 p-6">
        <h2 className="text-white font-semibold mb-4">
          Payout History
          <span className="text-zinc-500 font-normal text-sm ml-2">
            ({payouts.length})
          </span>
        </h2>
        {payouts.length === 0 ? (
          <div className="text-center py-8">
            <Wallet size={40} className="text-zinc-700 mx-auto mb-3" />
            <p className="text-zinc-500 text-sm">
              No payouts yet. Keep earning!
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {payouts.map(p => {
              const cfg = statusConfig[p.status] || statusConfig.pending
              const Icon = cfg.icon
              return (
                <div key={p.id} className="flex items-center
                justify-between py-3 border-b border-zinc-800/50">
                  <div className="flex items-center gap-3">
                    <Icon size={16} className={cfg.color} />
                    <div>
                      <p className="text-white text-sm font-semibold">
                        LKR {p.amount?.toLocaleString()}
                      </p>
                      <p className="text-zinc-500 text-xs">
                        {new Date(p.created_at).toLocaleDateString('en-LK')}
                        {p.bank_name ? ` · ${p.bank_name}` : ''}
                      </p>
                    </div>
                  </div>
                  <span className={`text-xs ${cfg.color}`}>
                    {cfg.label}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
