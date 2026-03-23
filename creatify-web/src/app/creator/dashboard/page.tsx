'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { getBrowserClient } from '@/lib/supabase-browser'
import {
  Eye, Zap, CheckCircle,
  Search, Clock
} from 'lucide-react'

export default function CreatorDashboard() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [userName, setUserName] = useState('')
  const [walletBalance, setWalletBalance] = useState(0)
  const [totalEarned, setTotalEarned] = useState(0)
  const [totalViews, setTotalViews] = useState(0)
  const [activeTasks, setActiveTasks] = useState(0)
  const [completedTasks, setCompletedTasks] = useState(0)
  const [activeCampaignCount, setActiveCampaignCount] = useState(0)

  useEffect(() => {
    const load = async () => {
      // Use the singleton client
      const supabase = getBrowserClient()

      // DEBUG - remove after fixing
      const { data: { session: debugSession } } =
        await supabase.auth.getSession()
      console.log('=== DEBUG ===')
      console.log('Session exists:', !!debugSession)
      console.log('User ID:', debugSession?.user?.id)
      console.log('Access token (first 20 chars):',
        debugSession?.access_token?.substring(0, 20))

      const userId = debugSession?.user?.id
      if (!userId) {
        console.error('NO SESSION - redirecting to login')
        window.location.href = '/auth/login'
        return
      }

      setUserName(
        debugSession.user.user_metadata?.full_name ||
        debugSession.user.email || 'Creator'
      )

      // Step 2: Get creator profile
      // Use maybeSingle to avoid 406 errors
      const { data: profile, error: profileError } =
        await supabase
          .from('creator_profiles')
          .select('id, wallet_balance, total_earned')
          .eq('user_id', userId)
          .maybeSingle()

      console.log('Profile result:', profile)
      console.log('Profile error:', profileError)

      if (profileError) {
        console.error('Profile error:', profileError)
        // Show error but don't crash
        setError('Failed to load profile. Error: ' +
          profileError.message +
          ' Code: ' + profileError.code)
        // Continue loading other data
      } else if (profile) {
        setWalletBalance(profile.wallet_balance || 0)
        setTotalEarned(profile.total_earned || 0)
      } else {
        // No profile — create one
        const { error: insertError } = await supabase
          .from('creator_profiles')
          .insert({
            user_id: userId,
            platforms: {},
            wallet_balance: 0,
            total_earned: 0,
            is_suspended: false,
          })

        if (insertError) {
          console.error('Insert profile error:', insertError)
          setError('Profile setup failed: ' + insertError.message)
        }
      }

      // Step 3: Get tasks
      if (profile?.id) {
        const { data: tasks } = await supabase
          .from('tasks')
          .select('id, status, total_views')
          .eq('creator_id', profile.id)

        if (tasks) {
          setTotalViews(
            tasks.reduce((sum, t) => sum + (t.total_views || 0), 0)
          )
          setActiveTasks(
            tasks.filter(t =>
              ['accepted', 'submitted', 'tracking']
              .includes(t.status)
            ).length
          )
          setCompletedTasks(
            tasks.filter(t => t.status === 'completed').length
          )
        }
      }

      // Step 4: Get active campaign count
      const { count } = await supabase
        .from('campaigns')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active')
        .gt('budget_remaining', 0)

      setActiveCampaignCount(count || 0)
      setLoading(false)
    }

    load()
  }, [])

  const greeting = () => {
    const h = new Date().getHours()
    if (h < 12) return 'Good morning'
    if (h < 17) return 'Good afternoon'
    return 'Good evening'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="w-8 h-8 border-2 border-[#6C47FF] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto">

      {/* Error banner - only show if profile failed */}
      {error && (
        <div className="bg-red-950/20 border border-red-800/30 px-4 py-3 mb-6 text-sm text-red-400 flex justify-between items-center">
          <span>{error}</span>
          <button
            onClick={() => setError('')}
            className="text-red-600 hover:text-red-400 ml-4 text-xs">
            ✕
          </button>
        </div>
      )}

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-black text-white mb-1">
          {greeting()}, {userName}
        </h1>
        <p className="text-zinc-400">
          Here&apos;s how your content is performing.
        </p>
      </div>

      {/* Wallet Hero */}
      <div className="bg-[#111111] border border-zinc-800 p-8 mb-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <p className="text-zinc-500 text-xs uppercase tracking-wider mb-2">Available to Cash Out</p>
          <p className="text-[#00E5A0] font-black text-5xl mb-2">
            LKR {walletBalance.toLocaleString()}
          </p>
          {walletBalance >= 5000 ? (
            <Link href="/creator/wallet"
              className="inline-block bg-[#00E5A0] text-black px-6 py-2 font-semibold text-sm hover:bg-[#00c98e] transition-colors">
              Request Cashout
            </Link>
          ) : (
            <p className="text-zinc-500 text-sm">
              LKR {(5000 - walletBalance).toLocaleString()}
              {' '}more until cashout
            </p>
          )}
        </div>
        <div className="text-right">
          <p className="text-zinc-500 text-xs uppercase tracking-wider mb-1">Lifetime Earned</p>
          <p className="text-white font-black text-3xl">
            LKR {totalEarned.toLocaleString()}
          </p>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {[
          {
            label: 'Total Views Generated',
            value: totalViews >= 1000
              ? `${(totalViews / 1000).toFixed(1)}K`
              : totalViews.toString(),
            sub: 'across all posts',
            icon: <Eye size={20} />,
            color: 'text-[#6C47FF]',
            bg: 'bg-[#6C47FF]/10'
          },
          {
            label: 'Active Tasks',
            value: activeTasks.toString(),
            sub: 'currently running',
            icon: <Zap size={20} />,
            color: 'text-[#6C47FF]',
            bg: 'bg-[#6C47FF]/10'
          },
          {
            label: 'Completed',
            value: completedTasks.toString(),
            sub: `${activeTasks + completedTasks} total tasks`,
            icon: <CheckCircle size={20} />,
            color: 'text-[#00E5A0]',
            bg: 'bg-[#00E5A0]/10'
          },
        ].map((stat, i) => (
          <div key={i} className="bg-[#111111] border border-zinc-800 p-6">
            <div className={`w-10 h-10 ${stat.bg} flex items-center justify-center ${stat.color} mb-4`}>
              {stat.icon}
            </div>
            <p className="text-3xl font-black text-white mb-1">
              {stat.value}
            </p>
            <p className="text-zinc-400 text-sm">
              {stat.label}
            </p>
            <p className="text-zinc-600 text-xs mt-1">
              {stat.sub}
            </p>
          </div>
        ))}
      </div>

      {/* Discovery prompt */}
      <div className="bg-[#6C47FF]/5 border border-[#6C47FF]/20 p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-start gap-4">
          <Search size={24} className="text-[#6C47FF] flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-white font-semibold">
              {activeCampaignCount} campaign
              {activeCampaignCount !== 1 ? 's' : ''}
              {' '}live right now
            </p>
            <p className="text-zinc-400 text-sm">
              Start earning by picking up a new task
            </p>
          </div>
        </div>
        <Link href="/creator/campaigns"
          className="bg-[#6C47FF] text-white px-6 py-3 font-semibold text-sm hover:bg-[#5538ee] transition-colors whitespace-nowrap flex-shrink-0">
          Browse Campaigns →
        </Link>
      </div>

    </div>
  )
}
