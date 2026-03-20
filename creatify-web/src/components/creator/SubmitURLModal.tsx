'use client'

import { useState, useEffect, useMemo } from 'react'
import { X, CheckCircle, XCircle, Loader2, ChevronDown, ChevronUp } from 'lucide-react'
import { createSupabaseClient } from '@/lib/supabase'
import { useToast } from '@/components/shared/Toast'
import type { Task, Campaign } from '@/types'

interface SubmitURLModalProps {
  isOpen: boolean
  onClose: () => void
  task: Task
  campaign: Campaign
  onSuccess: (updatedTask: Task) => void
}

const PLATFORM_COLORS: Record<string, string> = {
  tiktok: 'bg-pink-500/5 border-pink-500/20 text-pink-400',
  instagram: 'bg-orange-500/5 border-orange-500/20 text-orange-400',
  youtube: 'bg-red-500/5 border-red-500/20 text-red-400',
  facebook: 'bg-blue-500/5 border-blue-500/20 text-blue-400',
}

const PLACEHOLDERS: Record<string, string> = {
  tiktok: 'https://www.tiktok.com/@username/video/...',
  instagram: 'https://www.instagram.com/p/... or /reel/...',
  youtube: 'https://www.youtube.com/shorts/...',
  facebook: 'https://www.facebook.com/.../videos/...',
}

interface URLValidation {
  valid: boolean
  error?: string
  postId?: string
}

function validatePostURL(url: string, platform: string): URLValidation {
  const patterns: Record<string, RegExp> = {
    tiktok: /tiktok\.com\/@[\w.]+\/video\/(\d+)/,
    instagram: /instagram\.com\/(p|reel)\/([\w-]+)/,
    youtube: /youtube\.com\/shorts\/([\w-]+)|youtu\.be\/([\w-]+)/,
    facebook: /facebook\.com\/.+\/videos\/(\d+)|fb\.watch\/([\w-]+)/,
  }
  const pattern = patterns[platform]
  if (!pattern) return { valid: false, error: 'Unknown platform' }
  const match = url.match(pattern)
  if (!match) {
    return {
      valid: false,
      error: `This doesn't look like a valid ${platform} URL. Make sure your post is public.`,
    }
  }
  return { valid: true, postId: match[1] || match[2] }
}

export default function SubmitURLModal({ isOpen, onClose, task, campaign, onSuccess }: SubmitURLModalProps) {
  const supabase = useMemo(() => createSupabaseClient(), [])
  const { toast } = useToast()
  const [url, setUrl] = useState('')
  const [validation, setValidation] = useState<URLValidation | null>(null)
  const [checking, setChecking] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [briefOpen, setBriefOpen] = useState(false)

  // Debounce URL validation
  useEffect(() => {
    if (!url.trim()) { setValidation(null); return }
    setChecking(true)
    const t = setTimeout(() => {
      setValidation(validatePostURL(url.trim(), task.platform))
      setChecking(false)
    }, 500)
    return () => clearTimeout(t)
  }, [url, task.platform])

  const handleSubmit = async () => {
    if (!validation?.valid) return
    setSubmitting(true)
    setError(null)

    const { error: dbError } = await supabase
      .from('tasks')
      .update({
        post_url: url.trim(),
        post_id: validation.postId ?? null,
        status: 'submitted',
        submitted_at: new Date().toISOString(),
      })
      .eq('id', task.id)

    if (dbError) {
      setError('Failed to submit. Please try again.')
      setSubmitting(false)
      return
    }

    const updated: Task = { ...task, status: 'submitted', post_url: url.trim() }
    onSuccess(updated)
    onClose()
    toast("Post submitted! We'll start tracking your views within 6 hours.", 'success')
  }

  if (!isOpen) return null

  const platformColor = PLATFORM_COLORS[task.platform] ?? 'bg-zinc-800 border-zinc-700 text-zinc-400'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="relative bg-[#111111] border border-zinc-800 w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-zinc-800">
          <div>
            <h2 className="text-lg font-bold text-white">Submit Your Post</h2>
            <p className="text-sm text-zinc-400 mt-0.5">Paste the URL of your published post below</p>
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="p-6 flex flex-col gap-5">
          {/* Platform reminder */}
          <div className={`border p-3 flex items-center gap-2 text-sm ${platformColor}`}>
            <span className="font-medium capitalize">{task.platform}</span>
            <span className="text-zinc-500">—</span>
            <span>This post must be on {task.platform.charAt(0).toUpperCase() + task.platform.slice(1)}</span>
          </div>

          {/* URL input */}
          <div>
            <label className="block text-xs text-zinc-400 uppercase tracking-wider mb-1.5">Post URL</label>
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder={PLACEHOLDERS[task.platform] ?? 'https://...'}
              className="w-full bg-zinc-900 border border-zinc-800 focus:border-[#6C47FF] outline-none px-4 py-3 text-sm text-white rounded-none placeholder:text-zinc-600 transition-colors"
            />
            {/* Validation feedback */}
            {url.trim() && (
              <div className="flex items-center gap-2 mt-2 text-xs">
                {checking ? (
                  <><Loader2 size={12} className="animate-spin text-zinc-500" /><span className="text-zinc-500">Checking URL format…</span></>
                ) : validation?.valid ? (
                  <><CheckCircle size={12} className="text-[#00E5A0]" /><span className="text-[#00E5A0]">Valid {task.platform} URL detected</span></>
                ) : (
                  <><XCircle size={12} className="text-red-400" /><span className="text-red-400">{validation?.error}</span></>
                )}
              </div>
            )}
          </div>

          {/* Public account warning */}
          <div className="bg-amber-500/5 border border-amber-500/20 p-4 text-sm text-amber-300">
            <p className="font-medium mb-1">⚠ Your account must be public</p>
            <p className="text-amber-300/70 text-xs">
              Private accounts cannot be tracked. Make sure your {task.platform} account is set to public before
              submitting. Keep it public for the entire campaign duration.
            </p>
          </div>

          {/* Campaign brief reminder */}
          <div className="border border-zinc-800">
            <button
              type="button"
              onClick={() => setBriefOpen((v) => !v)}
              className="w-full flex items-center justify-between px-4 py-3 text-sm text-zinc-400 hover:text-white transition-colors"
            >
              <span>📋 Campaign brief reminder</span>
              {briefOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
            {briefOpen && (
              <div className="px-4 pb-4 border-t border-zinc-800 pt-3">
                {(campaign.hashtags ?? []).length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {campaign.hashtags!.map((h, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => navigator.clipboard.writeText(h).then(() => toast(`Copied ${h}`, 'success'))}
                        className="text-xs bg-[#6C47FF]/10 text-[#6C47FF] border border-[#6C47FF]/20 px-2 py-0.5 hover:bg-[#6C47FF]/20 transition-colors"
                        title="Click to copy"
                      >
                        {h}
                      </button>
                    ))}
                  </div>
                )}
                {campaign.brief && (
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    {campaign.brief.slice(0, 200)}{campaign.brief.length > 200 ? '…' : ''}
                  </p>
                )}
              </div>
            )}
          </div>

          {error && (
            <p className="text-red-400 text-sm border border-red-500/20 bg-red-500/5 px-4 py-3">{error}</p>
          )}

          <button
            onClick={handleSubmit}
            disabled={!validation?.valid || submitting}
            className="w-full bg-[#6C47FF] text-white py-4 text-sm font-semibold hover:bg-[#5538ee] transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {submitting ? <><Loader2 size={16} className="animate-spin" /> Submitting…</> : 'Submit Post'}
          </button>
        </div>
      </div>
    </div>
  )
}
