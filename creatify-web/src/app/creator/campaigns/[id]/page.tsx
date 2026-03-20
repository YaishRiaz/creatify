'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Syne, DM_Sans } from 'next/font/google'
import { ArrowLeft, Clock, Loader2, CheckCircle } from 'lucide-react'
import { createSupabaseClient } from '@/lib/supabase'
import { useUser } from '@/hooks/useUser'
import { useToast } from '@/components/shared/Toast'
import SubmitURLModal from '@/components/creator/SubmitURLModal'
import { formatLKR, formatNumber } from '@/lib/utils'
import type { Campaign, Task } from '@/types'

const syne = Syne({ subsets: ['latin'], weight: ['700', '800'] })
const dmSans = DM_Sans({ subsets: ['latin'] })

interface CampaignDetail extends Campaign {
  brand: { company_name: string; logo_url: string | null } | null
}

const PLATFORM_BADGE: Record<string, string> = {
  tiktok: 'bg-pink-500/10 text-pink-400',
  instagram: 'bg-orange-500/10 text-orange-400',
  youtube: 'bg-red-500/10 text-red-400',
  facebook: 'bg-blue-500/10 text-blue-400',
}

function daysLeft(endDate: string): number {
  return Math.max(0, Math.ceil((new Date(endDate).getTime() - Date.now()) / 86400000))
}

export default function CreatorCampaignDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { user, loading: userLoading } = useUser()
  const supabase = useMemo(() => createSupabaseClient(), [])
  const { toast } = useToast()

  const [campaign, setCampaign] = useState<CampaignDetail | null>(null)
  const [creatorProfileId, setCreatorProfileId] = useState<string | null>(null)
  const [existingTask, setExistingTask] = useState<Task | null>(null)
  const [loading, setLoading] = useState(true)
  const [accepting, setAccepting] = useState(false)
  const [selectedPlatform, setSelectedPlatform] = useState<string>('')
  const [showSubmitModal, setShowSubmitModal] = useState(false)
  const [views, setViews] = useState(50000)

  useEffect(() => {
    if (userLoading || !user) return
    const fetchData = async () => {
      setLoading(true)

      const { data: prof } = await supabase
        .from('creator_profiles').select('id').eq('user_id', user.id).single()
      if (!prof) { setLoading(false); return }
      setCreatorProfileId(prof.id)

      const { data: camp } = await supabase
        .from('campaigns')
        .select('*, brand:brand_profiles(company_name, logo_url)')
        .eq('id', id).single()
      setCampaign(camp as CampaignDetail | null)
      if (camp?.target_platforms?.length > 0) setSelectedPlatform(camp.target_platforms[0])

      const { data: task } = await supabase
        .from('tasks').select('*').eq('campaign_id', id).eq('creator_id', prof.id).maybeSingle()
      setExistingTask(task as Task | null)

      setLoading(false)
    }
    fetchData()
  }, [user, userLoading, supabase, id])

  const handleAccept = async () => {
    if (!campaign || !creatorProfileId || !selectedPlatform) return
    setAccepting(true)
    const { data, error } = await supabase
      .from('tasks')
      .insert({
        campaign_id: campaign.id,
        creator_id: creatorProfileId,
        platform: selectedPlatform,
        status: 'accepted',
      })
      .select()
      .single()
    setAccepting(false)
    if (error) { toast('Failed to accept campaign. Please try again.', 'error'); return }
    setExistingTask(data as Task)
    toast('Campaign accepted! Submit your post URL when ready.', 'success')
  }

  if (loading || userLoading) {
    return (
      <div className={`${dmSans.className} animate-pulse flex flex-col gap-6`}>
        <div className="h-8 w-48 bg-zinc-800/50 rounded" />
        <div className="h-64 bg-zinc-800/50 rounded" />
        <div className="h-40 bg-zinc-800/50 rounded" />
      </div>
    )
  }

  if (!campaign) {
    return (
      <div className={dmSans.className}>
        <p className="text-zinc-400">Campaign not found.</p>
        <Link href="/creator/campaigns" className="text-[#6C47FF] text-sm mt-2 inline-block">← Back to Campaigns</Link>
      </div>
    )
  }

  const pct = campaign.budget_total > 0 ? (campaign.budget_remaining / campaign.budget_total) * 100 : 0
  const days = campaign.end_date ? daysLeft(campaign.end_date) : null
  const estimatedEarnings = Math.round((campaign.payout_rate * views) / 1000 * 100) / 100

  return (
    <div className={dmSans.className}>
      {/* Back */}
      <Link href="/creator/campaigns" className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-white mb-6 transition-colors">
        <ArrowLeft size={14} /> Back to Campaigns
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          {/* Header card */}
          <div className="bg-[#111111] border border-zinc-800 p-6">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <p className="text-sm text-zinc-400 mb-1">{campaign.brand?.company_name}</p>
                <h1 className={`${syne.className} text-2xl font-extrabold text-white`}>{campaign.title}</h1>
              </div>
              <div className="flex flex-wrap gap-1 shrink-0">
                {campaign.target_platforms.map((p) => (
                  <span key={p} className={`text-xs px-2 py-0.5 capitalize ${PLATFORM_BADGE[p] ?? 'bg-zinc-800 text-zinc-400'}`}>{p}</span>
                ))}
              </div>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-3 gap-4 py-4 border-t border-b border-zinc-800 mb-4">
              <div>
                <p className={`${syne.className} text-2xl font-extrabold text-[#00E5A0]`}>{formatLKR(campaign.payout_rate)}</p>
                <p className="text-xs text-zinc-500">per 1,000 views</p>
              </div>
              <div>
                <p className={`${syne.className} text-2xl font-extrabold text-white`}>{pct.toFixed(0)}%</p>
                <p className="text-xs text-zinc-500">budget remaining</p>
              </div>
              {days !== null && (
                <div>
                  <p className={`${syne.className} text-2xl font-extrabold text-white flex items-center gap-1`}>
                    <Clock size={18} className="text-zinc-400" />{days}
                  </p>
                  <p className="text-xs text-zinc-500">days left</p>
                </div>
              )}
            </div>

            {/* Budget bar */}
            <div>
              <div className="flex justify-between text-xs text-zinc-500 mb-1">
                <span>Budget remaining</span>
                <span>{formatLKR(campaign.budget_remaining)} / {formatLKR(campaign.budget_total)}</span>
              </div>
              <div className="h-2 w-full bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className={`h-full ${pct < 30 ? 'bg-amber-500' : 'bg-[#00E5A0]'}`}
                  style={{ width: `${Math.min(pct, 100)}%` }}
                />
              </div>
            </div>
          </div>

          {/* Brief */}
          {campaign.brief && (
            <div className="bg-[#111111] border border-zinc-800 p-6">
              <h2 className={`${syne.className} font-bold text-white mb-3`}>Campaign Brief</h2>
              <p className="text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap">{campaign.brief}</p>
            </div>
          )}

          {/* Dos & Don'ts */}
          {((campaign.do_list ?? []).length > 0 || (campaign.dont_list ?? []).length > 0) && (
            <div className="bg-[#111111] border border-zinc-800 p-6">
              <h2 className={`${syne.className} font-bold text-white mb-4`}>Do&apos;s &amp; Don&apos;ts</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {(campaign.do_list ?? []).length > 0 && (
                  <div>
                    <p className="text-xs text-[#00E5A0] uppercase tracking-wider mb-2">Do</p>
                    <ul className="flex flex-col gap-2">
                      {campaign.do_list!.map((d, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-zinc-300">
                          <CheckCircle size={14} className="text-[#00E5A0] mt-0.5 shrink-0" />{d}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {(campaign.dont_list ?? []).length > 0 && (
                  <div>
                    <p className="text-xs text-red-400 uppercase tracking-wider mb-2">Don&apos;t</p>
                    <ul className="flex flex-col gap-2">
                      {campaign.dont_list!.map((d, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-zinc-300">
                          <span className="text-red-400 mt-0.5 shrink-0 text-base leading-none">×</span>{d}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Hashtags */}
          {(campaign.hashtags ?? []).length > 0 && (
            <div className="bg-[#111111] border border-zinc-800 p-6">
              <h2 className={`${syne.className} font-bold text-white mb-3`}>Required Hashtags</h2>
              <div className="flex flex-wrap gap-2">
                {campaign.hashtags!.map((h, i) => (
                  <button
                    key={i}
                    onClick={() => navigator.clipboard.writeText(h).then(() => toast(`Copied ${h}`, 'success'))}
                    className="text-xs bg-[#6C47FF]/10 text-[#6C47FF] border border-[#6C47FF]/20 px-2 py-1 hover:bg-[#6C47FF]/20 transition-colors"
                    title="Click to copy"
                  >
                    {h}
                  </button>
                ))}
              </div>
              <p className="text-xs text-zinc-500 mt-2">Click a hashtag to copy it</p>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="flex flex-col gap-4">
          {/* Earnings calculator */}
          <div className="bg-[#111111] border border-zinc-800 p-6">
            <h2 className={`${syne.className} font-bold text-white mb-4`}>Earnings Calculator</h2>
            <div className="mb-4">
              <label className="text-xs text-zinc-500 block mb-2">Estimated views: {formatNumber(views)}</label>
              <input
                type="range"
                min={1000}
                max={1000000}
                step={1000}
                value={views}
                onChange={(e) => setViews(Number(e.target.value))}
                className="w-full accent-[#6C47FF]"
              />
              <div className="flex justify-between text-xs text-zinc-600 mt-1">
                <span>1K</span><span>1M</span>
              </div>
            </div>
            <div className="bg-zinc-900 p-4 text-center">
              <p className="text-xs text-zinc-500 mb-1">You&apos;d earn</p>
              <p className={`${syne.className} text-3xl font-extrabold text-[#00E5A0]`}>{formatLKR(estimatedEarnings)}</p>
              <p className="text-xs text-zinc-500 mt-1">at {formatNumber(views)} views</p>
            </div>
            <div className="grid grid-cols-3 gap-2 mt-3">
              {[10000, 50000, 100000].map((v) => (
                <button
                  key={v}
                  onClick={() => setViews(v)}
                  className="text-xs text-center border border-zinc-800 hover:border-zinc-600 py-2 text-zinc-400 hover:text-white transition-colors"
                >
                  {formatNumber(v)}
                </button>
              ))}
            </div>
          </div>

          {/* CTA */}
          <div className="bg-[#111111] border border-zinc-800 p-6">
            {existingTask ? (
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <CheckCircle size={16} className="text-[#00E5A0]" />
                  <span className="text-sm text-white font-medium">Campaign Accepted</span>
                </div>
                <p className="text-xs text-zinc-500 capitalize">Status: <span className="text-zinc-300">{existingTask.status}</span></p>
                {existingTask.status === 'accepted' && (
                  <button
                    onClick={() => setShowSubmitModal(true)}
                    className="w-full bg-[#6C47FF] text-white py-3 text-sm font-semibold hover:bg-[#5538ee] transition-colors"
                  >
                    Submit Post URL →
                  </button>
                )}
                <Link
                  href="/creator/tasks"
                  className="w-full border border-zinc-700 text-zinc-300 py-3 text-sm text-center hover:border-zinc-500 transition-colors block"
                >
                  View My Tasks
                </Link>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                <div>
                  <label className="block text-xs text-zinc-400 uppercase tracking-wider mb-2">Select Platform</label>
                  <div className="flex flex-wrap gap-2">
                    {campaign.target_platforms.map((p) => (
                      <button
                        key={p}
                        onClick={() => setSelectedPlatform(p)}
                        className={`text-xs px-3 py-1.5 capitalize transition-colors ${selectedPlatform === p ? 'bg-[#6C47FF] text-white' : 'border border-zinc-700 text-zinc-400 hover:text-white'}`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>
                {campaign.per_creator_cap && (
                  <p className="text-xs text-zinc-500">
                    Max payout per creator: <span className="text-zinc-300">{formatLKR(campaign.per_creator_cap)}</span>
                  </p>
                )}
                <button
                  onClick={handleAccept}
                  disabled={accepting || !selectedPlatform || campaign.budget_remaining <= 0}
                  className="w-full bg-[#00E5A0] text-black py-3 text-sm font-semibold hover:bg-[#00c98e] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {accepting && <Loader2 size={14} className="animate-spin" />}
                  Accept Campaign
                </button>
                {campaign.budget_remaining <= 0 && (
                  <p className="text-xs text-amber-400 text-center">This campaign has no remaining budget.</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {showSubmitModal && existingTask && (
        <SubmitURLModal
          isOpen={true}
          onClose={() => setShowSubmitModal(false)}
          task={existingTask}
          campaign={campaign as Campaign}
          onSuccess={(updated) => {
            setExistingTask(updated)
            setShowSubmitModal(false)
          }}
        />
      )}
    </div>
  )
}
