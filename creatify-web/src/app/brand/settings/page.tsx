'use client'
export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { getBrowserClient } from '@/lib/supabase-browser'

export default function BrandSettingsPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    company_name: '',
    industry: '',
    website: '',
    phone: '',
  })
  const [email, setEmail] = useState('')

  useEffect(() => {
    const load = async () => {
      const supabase = getBrowserClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { window.location.href = '/auth/login'; return }

      setEmail(session.user.email || '')

      const { data: profile } = await supabase
        .from('brand_profiles')
        .select('company_name, industry, website, phone')
        .eq('user_id', session.user.id)
        .maybeSingle()

      if (profile) {
        setForm({
          company_name: profile.company_name || '',
          industry: profile.industry || '',
          website: profile.website || '',
          phone: profile.phone || '',
        })
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

    const { error: err } = await supabase
      .from('brand_profiles')
      .update(form)
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
        <h1 className="text-3xl font-black text-white mb-1">Settings</h1>
        <p className="text-zinc-400">Manage your brand account.</p>
      </div>

      {error && (
        <div className="bg-red-950/20 border border-red-800/30
        px-4 py-3 mb-6 text-sm text-red-400">{error}</div>
      )}

      {saved && (
        <div className="bg-green-950/20 border border-green-800/30
        px-4 py-3 mb-6 text-sm text-[#00E5A0]">
          Settings saved successfully.
        </div>
      )}

      <div className="bg-[#111111] border border-zinc-800 p-6 space-y-5">
        <h2 className="text-white font-semibold mb-4">
          Brand Information
        </h2>

        {[
          { key: 'company_name', label: 'Company Name', placeholder: 'Your company name' },
          { key: 'industry', label: 'Industry', placeholder: 'e.g. Food & Beverage, Fashion' },
          { key: 'website', label: 'Website', placeholder: 'https://yourwebsite.com' },
          { key: 'phone', label: 'Phone Number', placeholder: '+94 7X XXX XXXX' },
        ].map(field => (
          <div key={field.key}>
            <label className="block text-xs uppercase tracking-wider
            text-zinc-400 mb-2">{field.label}</label>
            <input
              type="text"
              value={form[field.key as keyof typeof form]}
              onChange={e => setForm({ ...form, [field.key]: e.target.value })}
              placeholder={field.placeholder}
              className="w-full bg-zinc-900 border border-zinc-800
              text-white px-4 py-3 text-sm focus:outline-none
              focus:border-[#6C47FF] transition-colors"
            />
          </div>
        ))}

        <div>
          <label className="block text-xs uppercase tracking-wider
          text-zinc-400 mb-2">Email</label>
          <input
            type="text"
            value={email}
            disabled
            className="w-full bg-zinc-800/50 border border-zinc-800
            text-zinc-500 px-4 py-3 text-sm cursor-not-allowed"
          />
          <p className="text-zinc-600 text-xs mt-1">
            Email cannot be changed here.
          </p>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full bg-[#6C47FF] text-white py-3
          font-semibold text-sm hover:bg-[#5538ee]
          transition-colors disabled:opacity-50">
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      {/* Danger zone */}
      <div className="bg-[#111111] border border-red-900/30 p-6 mt-6">
        <h2 className="text-red-400 font-semibold mb-4">Account</h2>
        <button
          onClick={async () => {
            const supabase = getBrowserClient()
            await supabase.auth.signOut()
            window.location.href = '/'
          }}
          className="text-red-400 hover:text-red-300 text-sm
          border border-red-900/50 px-4 py-2
          hover:border-red-700 transition-colors">
          Sign Out
        </button>
      </div>
    </div>
  )
}
