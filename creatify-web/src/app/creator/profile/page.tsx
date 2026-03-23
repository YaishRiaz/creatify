'use client'
export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { getBrowserClient } from '@/lib/supabase-browser'
import { ExternalLink } from 'lucide-react'

const PLATFORMS = [
  { key: 'tiktok', label: 'TikTok', placeholder: 'https://tiktok.com/@username' },
  { key: 'instagram', label: 'Instagram', placeholder: 'https://instagram.com/username' },
  { key: 'youtube', label: 'YouTube', placeholder: 'https://youtube.com/@channel' },
  { key: 'facebook', label: 'Facebook', placeholder: 'https://facebook.com/pagename' },
]

export default function CreatorProfilePage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [email, setEmail] = useState('')
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [bankName, setBankName] = useState('')
  const [bankAccount, setBankAccount] = useState('')
  const [bankAccountName, setBankAccountName] = useState('')
  const [platforms, setPlatforms] = useState<Record<string, string>>({
    tiktok: '', instagram: '', youtube: '', facebook: ''
  })

  useEffect(() => {
    const load = async () => {
      const supabase = getBrowserClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { window.location.href = '/auth/login'; return }

      setEmail(session.user.email || '')
      setFullName(session.user.user_metadata?.full_name || '')

      const { data: profile } = await supabase
        .from('creator_profiles')
        .select('platforms, phone, bank_name, bank_account, bank_account_name')
        .eq('user_id', session.user.id)
        .maybeSingle()

      if (profile) {
        setPlatforms({
          tiktok: profile.platforms?.tiktok || '',
          instagram: profile.platforms?.instagram || '',
          youtube: profile.platforms?.youtube || '',
          facebook: profile.platforms?.facebook || '',
        })
        setPhone(profile.phone || '')
        setBankName(profile.bank_name || '')
        setBankAccount(profile.bank_account || '')
        setBankAccountName(profile.bank_account_name || '')
      }
      setLoading(false)
    }
    load()
  }, [])

  const handleSave = async () => {
    setSaving(true)
    setError('')
    const supabase = getBrowserClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return

    // Update auth metadata
    await supabase.auth.updateUser({
      data: { full_name: fullName }
    })

    // TODO: Run in Supabase if columns missing:
    // ALTER TABLE creator_profiles
    //   ADD COLUMN IF NOT EXISTS phone VARCHAR(20);
    // ALTER TABLE creator_profiles
    //   ADD COLUMN IF NOT EXISTS bank_name VARCHAR(100);
    // ALTER TABLE creator_profiles
    //   ADD COLUMN IF NOT EXISTS bank_account VARCHAR(50);
    // ALTER TABLE creator_profiles
    //   ADD COLUMN IF NOT EXISTS bank_account_name VARCHAR(100);
    // TODO: Run in Supabase to remove NIC column:
    // ALTER TABLE creator_profiles
    //   DROP COLUMN IF EXISTS nic_number;

    // Update creator profile
    const { error: err } = await supabase
      .from('creator_profiles')
      .update({
        platforms,
        phone,
        bank_name: bankName,
        bank_account: bankAccount,
        bank_account_name: bankAccountName,
      })
      .eq('user_id', session.user.id)

    if (err) setError(err.message)
    else { setSaved(true); setTimeout(() => setSaved(false), 3000) }
    setSaving(false)
  }

  if (loading) return (
    <div className="flex items-center justify-center min-h-64">
      <div className="w-8 h-8 border-2 border-[#6C47FF]
      border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-white mb-1">Profile</h1>
        <p className="text-zinc-400">
          Keep your profile updated to receive payouts.
        </p>
      </div>

      {error && (
        <div className="bg-red-950/20 border border-red-800/30
        px-4 py-3 mb-6 text-sm text-red-400">{error}</div>
      )}
      {saved && (
        <div className="bg-green-950/20 border border-green-800/30
        px-4 py-3 mb-6 text-sm text-[#00E5A0]">
          Profile saved successfully.
        </div>
      )}

      {/* Personal Info */}
      <div className="bg-[#111111] border border-zinc-800 p-6 mb-4">
        <h2 className="text-white font-semibold mb-4">
          Personal Information
        </h2>
        <div className="space-y-4">
          <div>
            <label className="block text-xs uppercase tracking-wider
            text-zinc-400 mb-2">Full Name</label>
            <input type="text" value={fullName}
              onChange={e => setFullName(e.target.value)}
              placeholder="Your full name"
              className="w-full bg-zinc-900 border border-zinc-800
              text-white px-4 py-3 text-sm focus:outline-none
              focus:border-[#6C47FF] transition-colors" />
          </div>
          <div>
            <label className="block text-xs uppercase tracking-wider
            text-zinc-400 mb-2">Email</label>
            <input type="text" value={email} disabled
              className="w-full bg-zinc-800/50 border border-zinc-800
              text-zinc-500 px-4 py-3 text-sm cursor-not-allowed" />
          </div>
          <div>
            <label className="block text-xs uppercase tracking-wider
            text-zinc-400 mb-2">Phone Number</label>
            <input type="text" value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="+94 7X XXX XXXX"
              className="w-full bg-zinc-900 border border-zinc-800
              text-white px-4 py-3 text-sm focus:outline-none
              focus:border-[#6C47FF] transition-colors" />
          </div>
        </div>
      </div>

      {/* Social Links */}
      <div className="bg-[#111111] border border-zinc-800 p-6 mb-4">
        <h2 className="text-white font-semibold mb-2">
          Social Media Profiles
        </h2>
        <p className="text-zinc-500 text-sm mb-4">
          Add your public profile links. These help brands
          discover you and verify your content.
        </p>
        <div className="space-y-4">
          {PLATFORMS.map(p => (
            <div key={p.key}>
              <label className="block text-xs uppercase tracking-wider
              text-zinc-400 mb-2">{p.label}</label>
              <div className="relative">
                <input
                  type="url"
                  value={platforms[p.key] || ''}
                  onChange={e => setPlatforms({ ...platforms, [p.key]: e.target.value })}
                  placeholder={p.placeholder}
                  className="w-full bg-zinc-900 border border-zinc-800
                  text-white px-4 py-3 pr-10 text-sm focus:outline-none
                  focus:border-[#6C47FF] transition-colors" />
                {platforms[p.key] && (
                  <a href={platforms[p.key]} target="_blank"
                    rel="noopener noreferrer"
                    className="absolute right-3 top-1/2 -translate-y-1/2
                    text-zinc-500 hover:text-white transition-colors">
                    <ExternalLink size={16} />
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Bank Details */}
      <div className="bg-[#111111] border border-zinc-800 p-6 mb-4">
        <h2 className="text-white font-semibold mb-2">
          Bank Details for Payouts
        </h2>
        <p className="text-zinc-500 text-sm mb-4">
          Required to receive cashouts. Your bank details
          are encrypted and only used for payout transfers.
        </p>
        <div className="space-y-4">
          <div>
            <label className="block text-xs uppercase tracking-wider
            text-zinc-400 mb-2">Bank Name</label>
            <select value={bankName}
              onChange={e => setBankName(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800
              text-white px-4 py-3 text-sm focus:outline-none
              focus:border-[#6C47FF] appearance-none">
              <option value="">Select your bank</option>
              {['Bank of Ceylon', 'Commercial Bank', 'HNB', 'NDB',
                'Sampath Bank', 'Seylan Bank', 'Nations Trust Bank',
                'DFCC Bank', 'Pan Asia Bank', 'Hatton National Bank',
                'Union Bank', 'Cargills Bank', 'Amana Bank',
                'Standard Chartered', 'HSBC'].map(b => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs uppercase tracking-wider
            text-zinc-400 mb-2">Account Number</label>
            <input type="text" value={bankAccount}
              onChange={e => setBankAccount(e.target.value)}
              placeholder="Your bank account number"
              className="w-full bg-zinc-900 border border-zinc-800
              text-white px-4 py-3 text-sm focus:outline-none
              focus:border-[#6C47FF] transition-colors" />
          </div>
          <div>
            <label className="block text-xs uppercase tracking-wider
            text-zinc-400 mb-2">Account Holder Name</label>
            <input type="text" value={bankAccountName}
              onChange={e => setBankAccountName(e.target.value)}
              placeholder="Name on bank account"
              className="w-full bg-zinc-900 border border-zinc-800
              text-white px-4 py-3 text-sm focus:outline-none
              focus:border-[#6C47FF] transition-colors" />
          </div>
        </div>
      </div>

      <button onClick={handleSave} disabled={saving}
        className="w-full bg-[#6C47FF] text-white py-4
        font-semibold hover:bg-[#5538ee] transition-colors
        disabled:opacity-50">
        {saving ? 'Saving...' : 'Save Profile'}
      </button>
    </div>
  )
}
