'use client'

import { useEffect, useMemo, useState } from 'react'
import { Syne, DM_Sans } from 'next/font/google'
import { Loader2, Video, CheckCircle, Clock, Lock } from 'lucide-react'
import { createSupabaseClient } from '@/lib/supabase'
import { useToast } from '@/components/shared/Toast'
import SubmitURLModal from '@/components/creator/SubmitURLModal'
import { ONBOARDING_CAMPAIGN_ID, type OnboardingStatus } from '@/lib/onboarding'
import type { Task, Campaign } from '@/types'

const syne = Syne({ subsets: ['latin'], weight: ['700', '800'] })
const dmSans = DM_Sans({ subsets: ['latin'] })

const PLATFORMS = ['tiktok', 'instagram', 'youtube', 'facebook']
const PLATFORM_LABEL: Record<string, string> = {
  tiktok: 'TikTok', instagram: 'Instagram', youtube: 'YouTube', facebook: 'Facebook',
}

interface Props {
  creatorProfileId: string
  children: React.ReactNode
}

export default function OnboardingGate({ creatorProfileId, children }: Props) {
  const supabase = useMemo(() => createSupabaseClient(), [])
  const { toast } = useToast()

  const [status, setStatus] = useState<OnboardingStatus>('loading')
  const [campaign, setCampaign] = useState<Campaign | null>(null)
  const [task, setTask] = useState<Task | null>(null)
  const [selectedPlatform, setSelectedPlatform] = useState('tiktok')
  const [accepting, setAccepting] = useState(false)
  const [showModal, setShowModal] = useState(false)

  useEffect(() => {
    const check = async () => {
      const [{ data: camp }, { data: existingTask }] = await Promise.all([
        supabase.from('campaigns').select('*').eq('id', ONBOARDING_CAMPAIGN_ID).single(),
        supabase.from('tasks').select('*').eq('campaign_id', ONBOARDING_CAMPAIGN_ID).eq('creator_id', creatorProfileId).maybeSingle(),
      ])

      setCampaign(camp as Campaign | null)
      setTask(existingTask as Task | null)

      if (!existingTask) {
        setStatus('start')
      } else if (['tracking', 'completed'].includes(existingTask.status)) {
        setStatus('unlocked')
      } else if (existingTask.status === 'submitted') {
        setStatus('review')
      } else if (existingTask.status === 'accepted') {
        setStatus('submit')
      } else if (existingTask.status === 'flagged' || existingTask.status === 'rejected') {
        // Video removed or rejected — lock again
        setStatus('start')
      } else {
        setStatus('start')
      }
    }
    check()
  }, [creatorProfileId, supabase])

  const handleAccept = async () => {
    if (!campaign) return
    setAccepting(true)
    const { data, error } = await supabase
      .from('tasks')
      .insert({
        campaign_id: ONBOARDING_CAMPAIGN_ID,
        creator_id: creatorProfileId,
        platform: selectedPlatform,
        status: 'accepted',
      })
      .select()
      .single()
    setAccepting(false)
    if (error) { toast('Failed to start task. Please try again.', 'error'); return }
    setTask(data as Task)
    setStatus('submit')
  }

  if (status === 'loading') {
    return (
      <div className={`${dmSans.className} flex items-center justify-center py-24`}>
        <Loader2 size={24} className="animate-spin text-zinc-500" />
      </div>
    )
  }

  if (status === 'unlocked') {
    return <>{children}</>
  }

  // Gate screen
  return (
    <div className={dmSans.className}>
      {/* Lock banner */}
      <div className="bg-[#111111] border border-[#6C47FF]/30 p-6 mb-6 flex items-start gap-4">
        <div className="w-10 h-10 bg-[#6C47FF]/10 flex items-center justify-center shrink-0">
          <Lock size={18} className="text-[#6C47FF]" />
        </div>
        <div>
          <p className={`${syne.className} font-bold text-white mb-1`}>Campaigns are locked</p>
          <p className="text-sm text-zinc-400">
            Complete the onboarding task below to unlock all campaigns and start earning.
          </p>
        </div>
      </div>

      {/* Onboarding task card */}
      <div className="bg-[#111111] border border-zinc-800 p-8 max-w-2xl">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 bg-[#00E5A0]/10 flex items-center justify-center">
            <Video size={22} className="text-[#00E5A0]" />
          </div>
          <div>
            <p className="text-xs text-zinc-500 uppercase tracking-wider">Required — One Time</p>
            <h2 className={`${syne.className} text-xl font-extrabold text-white`}>
              Introduce Creatify to Your Audience
            </h2>
          </div>
        </div>

        <div className="flex flex-col gap-5">
          {/* What to do */}
          <div>
            <p className="text-sm font-semibold text-white mb-2">What you need to post:</p>
            <ul className="flex flex-col gap-2 text-sm text-zinc-400">
              {[
                'A genuine video about what Creatify is and how it works',
                'Explain that creators earn money per view — no follower minimum',
                'Tell your audience why they should sign up',
                'Must be public and stay live at all times to keep access',
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-2">
                  <CheckCircle size={14} className="text-[#00E5A0] shrink-0 mt-0.5" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* Required hashtags */}
          <div>
            <p className="text-xs text-zinc-500 uppercase tracking-wider mb-2">Required hashtags — click to copy</p>
            <div className="flex flex-wrap gap-2">
              {['#Creatify', '#CreatifyLK', '#EarnFromContent', '#ContentCreator'].map((h) => (
                <button
                  key={h}
                  onClick={() => navigator.clipboard.writeText(h).then(() => toast(`Copied ${h}`, 'success'))}
                  className="text-xs bg-[#6C47FF]/10 text-[#6C47FF] border border-[#6C47FF]/20 px-2 py-1 hover:bg-[#6C47FF]/20 transition-colors"
                >
                  {h}
                </button>
              ))}
            </div>
          </div>

          {/* Warning */}
          <div className="bg-amber-500/5 border border-amber-500/20 p-4 text-sm text-amber-300">
            <p className="font-medium mb-1">⚠ Keep your video live at all times</p>
            <p className="text-amber-300/70 text-xs">
              If your video is removed or your account goes private, your access to campaigns will be revoked
              until you resubmit a valid video.
            </p>
          </div>

          {/* Action area */}
          {status === 'start' && (
            <div className="flex flex-col gap-4 pt-2 border-t border-zinc-800">
              <div>
                <label className="block text-xs text-zinc-400 uppercase tracking-wider mb-2">Which platform will you post on?</label>
                <div className="flex flex-wrap gap-2">
                  {PLATFORMS.map((p) => (
                    <button
                      key={p}
                      onClick={() => setSelectedPlatform(p)}
                      className={`text-xs px-3 py-1.5 transition-colors ${
                        selectedPlatform === p
                          ? 'bg-[#6C47FF] text-white'
                          : 'border border-zinc-700 text-zinc-400 hover:text-white'
                      }`}
                    >
                      {PLATFORM_LABEL[p]}
                    </button>
                  ))}
                </div>
              </div>
              <button
                onClick={handleAccept}
                disabled={accepting}
                className="bg-[#00E5A0] text-black px-8 py-3 text-sm font-semibold hover:bg-[#00c98e] transition-colors disabled:opacity-60 flex items-center gap-2 w-fit"
              >
                {accepting && <Loader2 size={14} className="animate-spin" />}
                I understand — Start this task
              </button>
            </div>
          )}

          {status === 'submit' && task && campaign && (
            <div className="flex flex-col gap-3 pt-2 border-t border-zinc-800">
              <p className="text-sm text-zinc-300">
                You accepted this task on <span className="text-white">{PLATFORM_LABEL[task.platform]}</span>.
                Post your video then submit the URL below.
              </p>
              <button
                onClick={() => setShowModal(true)}
                className="bg-[#6C47FF] text-white px-8 py-3 text-sm font-semibold hover:bg-[#5538ee] transition-colors w-fit"
              >
                Submit My Video URL →
              </button>
            </div>
          )}

          {status === 'review' && (
            <div className="flex items-center gap-3 pt-2 border-t border-zinc-800">
              <Clock size={16} className="text-blue-400 shrink-0" />
              <div>
                <p className="text-sm font-medium text-white">Your video is under review</p>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Our team will verify your video within 24 hours. Campaigns will unlock once approved.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {showModal && task && campaign && (
        <SubmitURLModal
          isOpen={true}
          onClose={() => setShowModal(false)}
          task={task}
          campaign={campaign}
          onSuccess={(updated) => {
            setTask(updated)
            setStatus('review')
            setShowModal(false)
          }}
        />
      )}
    </div>
  )
}
