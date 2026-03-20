'use client'

export const dynamic = 'force-dynamic'
export const runtime = 'edge'

import { useEffect, useMemo, useState } from 'react'
import { Loader2, X } from 'lucide-react'
import { createSupabaseClient } from '@/lib/supabase'
import { useUser } from '@/hooks/useUser'
import { useToast } from '@/components/shared/Toast'


interface CreatorProfile {
  id: string
  nic_number: string | null
  platforms: Record<string, string>
  is_suspended: boolean
}

const PLATFORMS = ['tiktok', 'instagram', 'youtube', 'facebook']

export default function CreatorProfilePage() {
  const { user, loading: userLoading } = useUser()
  const supabase = useMemo(() => createSupabaseClient(), [])
  const { toast } = useToast()

  const [profile, setProfile] = useState<CreatorProfile | null>(null)
  const [loading, setLoading] = useState(true)

  // Account info form
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [savingInfo, setSavingInfo] = useState(false)

  // Platforms form
  const [platformHandles, setPlatformHandles] = useState<Record<string, string>>({})
  const [savingPlatforms, setSavingPlatforms] = useState(false)

  // Delete modal
  const [showDeleteModal, setShowDeleteModal] = useState(false)

  useEffect(() => {
    if (userLoading || !user) return
    const fetchData = async () => {
      setLoading(true)
      const { data: prof } = await supabase
        .from('creator_profiles').select('id, nic_number, platforms, is_suspended')
        .eq('user_id', user.id).single()
      setProfile(prof as CreatorProfile | null)
      setPlatformHandles(prof?.platforms ?? {})
      setFullName(user.full_name ?? '')
      setPhone(user.phone ?? '')
      setLoading(false)
    }
    fetchData()
  }, [user, userLoading, supabase])

  const handleSaveInfo = async () => {
    if (!user) return
    setSavingInfo(true)
    const { error } = await supabase
      .from('users').update({ full_name: fullName.trim(), phone: phone.trim() || null }).eq('id', user.id)
    setSavingInfo(false)
    if (error) toast('Failed to save changes.', 'error')
    else toast('Profile updated.', 'success')
  }

  const handleSavePlatforms = async () => {
    if (!profile) return
    setSavingPlatforms(true)
    const cleaned: Record<string, string> = {}
    for (const [k, v] of Object.entries(platformHandles)) {
      if (v.trim()) cleaned[k] = v.trim()
    }
    const { error } = await supabase
      .from('creator_profiles').update({ platforms: cleaned }).eq('id', profile.id)
    setSavingPlatforms(false)
    if (error) toast('Failed to save platforms.', 'error')
    else { setProfile((prev) => prev ? { ...prev, platforms: cleaned } : null); toast('Platforms saved.', 'success') }
  }

  const maskNIC = (nic: string | null): string => {
    if (!nic) return '—'
    if (nic.length === 10) return nic[0] + 'X'.repeat(8) + nic[9]
    return nic[0] + 'X'.repeat(nic.length - 1)
  }

  if (loading || userLoading) {
    return <div className="font-sans animate-pulse flex flex-col gap-6">
      <div className="h-48 bg-zinc-800/50 rounded" />
    </div>
  }

  return (
    <div className="font-sans">
      <h1 className="font-syne text-3xl font-extrabold text-white mb-8">Profile</h1>

      {/* Account info */}
      <div className="bg-[#111111] border border-zinc-800 p-6 mb-6">
        <h2 className="font-syne font-bold text-white mb-5">Account Info</h2>
        <div className="flex flex-col gap-4 max-w-md">
          <div>
            <label className="block text-xs text-zinc-400 uppercase tracking-wider mb-1.5">Full Name</label>
            <input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 focus:border-[#6C47FF] outline-none px-4 py-3 text-sm text-white rounded-none placeholder:text-zinc-600 transition-colors"
            />
          </div>
          <div>
            <label className="block text-xs text-zinc-400 uppercase tracking-wider mb-1.5">Email</label>
            <input
              value={user?.email ?? ''}
              disabled
              className="w-full bg-zinc-800/50 border border-zinc-800 outline-none px-4 py-3 text-sm text-zinc-500 rounded-none cursor-not-allowed"
            />
          </div>
          <div>
            <label className="block text-xs text-zinc-400 uppercase tracking-wider mb-1.5">Phone <span className="normal-case text-zinc-600">(optional)</span></label>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+94 77 123 4567"
              className="w-full bg-zinc-900 border border-zinc-800 focus:border-[#6C47FF] outline-none px-4 py-3 text-sm text-white rounded-none placeholder:text-zinc-600 transition-colors"
            />
          </div>
          <button
            onClick={handleSaveInfo}
            disabled={savingInfo}
            className="bg-[#6C47FF] text-white px-6 py-3 text-sm font-semibold hover:bg-[#5538ee] transition-colors disabled:opacity-60 flex items-center gap-2 w-fit"
          >
            {savingInfo && <Loader2 size={14} className="animate-spin" />}
            Save Changes
          </button>
        </div>
      </div>

      {/* Social platforms */}
      <div className="bg-[#111111] border border-zinc-800 p-6 mb-6">
        <h2 className="font-syne font-bold text-white mb-1">Your Connected Platforms</h2>
        <p className="text-sm text-zinc-500 mb-5">Add your usernames so brands can verify your posts.</p>
        <div className="flex flex-col gap-3 max-w-md">
          {PLATFORMS.map((p) => (
            <div key={p} className="flex items-center gap-3">
              <span className="text-xs text-zinc-400 capitalize w-20 shrink-0">{p}</span>
              <input
                value={platformHandles[p] ?? ''}
                onChange={(e) => setPlatformHandles((prev) => ({ ...prev, [p]: e.target.value }))}
                placeholder="@yourusername"
                className="flex-1 bg-zinc-900 border border-zinc-800 focus:border-[#6C47FF] outline-none px-4 py-2.5 text-sm text-white rounded-none placeholder:text-zinc-600 transition-colors"
              />
            </div>
          ))}
          <button
            onClick={handleSavePlatforms}
            disabled={savingPlatforms}
            className="bg-[#6C47FF] text-white px-6 py-3 text-sm font-semibold hover:bg-[#5538ee] transition-colors disabled:opacity-60 flex items-center gap-2 w-fit mt-2"
          >
            {savingPlatforms && <Loader2 size={14} className="animate-spin" />}
            Save Platforms
          </button>
        </div>
      </div>

      {/* NIC */}
      <div className="bg-[#111111] border border-zinc-800 p-6 mb-6">
        <h2 className="font-syne font-bold text-white mb-3">NIC Number</h2>
        <div className="flex items-center gap-3">
          <p className="text-zinc-300 font-mono text-lg">{maskNIC(profile?.nic_number ?? null)}</p>
          <span className="text-xs bg-green-500/10 text-[#00E5A0] px-2 py-0.5">Verified</span>
        </div>
        <p className="text-xs text-zinc-500 mt-2">Contact support to update your NIC.</p>
      </div>

      {/* Danger zone */}
      <div className="bg-[#111111] border border-red-500/20 p-6">
        <h2 className="font-syne font-bold text-red-400 mb-3">Danger Zone</h2>
        <button
          onClick={() => setShowDeleteModal(true)}
          className="text-sm border border-red-500/40 text-red-400 px-5 py-2.5 hover:bg-red-500/10 transition-colors"
        >
          Delete Account
        </button>
      </div>

      {/* Delete confirmation modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70" onClick={() => setShowDeleteModal(false)} />
          <div className="relative bg-[#111111] border border-zinc-800 w-full max-w-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-syne text-lg font-bold text-white">Delete Account</h3>
              <button onClick={() => setShowDeleteModal(false)} className="text-zinc-500 hover:text-white">
                <X size={18} />
              </button>
            </div>
            <p className="text-sm text-zinc-400 mb-6">
              This action cannot be undone. All your tasks, earnings history, and profile data will be permanently deleted.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setShowDeleteModal(false)} className="flex-1 border border-zinc-700 text-zinc-300 py-3 text-sm hover:border-zinc-500 transition-colors">
                Cancel
              </button>
              <button
                onClick={() => { toast('Please contact support to delete your account.', 'info'); setShowDeleteModal(false) }}
                className="flex-1 bg-red-500/10 border border-red-500/30 text-red-400 py-3 text-sm hover:bg-red-500/20 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
