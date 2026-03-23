'use client'

export const dynamic = 'force-dynamic'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Check, Plus, X, ChevronLeft } from 'lucide-react'
import { createSupabaseClient } from '@/lib/supabase'
import { useUser } from '@/hooks/useUser'
import { formatLKR } from '@/lib/utils'


// ─── Schemas ────────────────────────────────────────────────────────────────

const step1Schema = z
  .object({
    title: z.string().min(5, 'Min 5 characters').max(100, 'Max 100 characters'),
    description: z.string().min(20, 'Min 20 characters').max(500, 'Max 500 characters'),
    target_platforms: z.array(z.string()).min(1, 'Select at least one platform'),
    start_date: z.string().min(1, 'Start date required'),
    end_date: z.string().min(1, 'End date required'),
  })
  .refine((d) => new Date(d.end_date) > new Date(d.start_date), {
    message: 'End date must be after start date',
    path: ['end_date'],
  })

const step2Schema = z.object({
  brief: z.string().min(50, 'Min 50 characters').max(2000, 'Max 2000 characters'),
  do_list: z.array(z.string().min(1)).min(1, 'Add at least one item'),
  dont_list: z.array(z.string().min(1)).min(1, 'Add at least one item'),
  hashtags: z.array(z.string()),
})

const step3Schema = z
  .object({
    payout_rate: z.number().min(5, 'Minimum LKR 5'),
    budget_total: z.number().min(5000, 'Minimum LKR 5,000'),
    per_creator_cap_enabled: z.boolean(),
    per_creator_cap: z.number().optional(),
  })
  .refine(
    (d) => !d.per_creator_cap_enabled || (d.per_creator_cap !== undefined && d.per_creator_cap >= 500),
    { message: 'Minimum LKR 500', path: ['per_creator_cap'] }
  )
  .refine(
    (d) => !d.per_creator_cap_enabled || (d.per_creator_cap !== undefined && d.per_creator_cap < d.budget_total),
    { message: 'Must be less than total budget', path: ['per_creator_cap'] }
  )

// ─── Types ───────────────────────────────────────────────────────────────────

type Step1Data = z.infer<typeof step1Schema>
type Step2Data = z.infer<typeof step2Schema>
type Step3Data = z.infer<typeof step3Schema>
type CampaignType = 'digital' | 'experience'

interface AllData extends Step1Data, Step2Data, Step3Data {}

const PLATFORMS = ['TikTok', 'Instagram', 'YouTube', 'Facebook']
const today = new Date().toISOString().split('T')[0]

// ─── Progress indicator ──────────────────────────────────────────────────────

function StepIndicator({ current }: { current: number }) {
  const steps = ['Basics', 'Brief', 'Budget', 'Review']
  return (
    <div className="flex items-center gap-0 mb-10">
      {steps.map((label, i) => {
        const idx = i + 1
        const done = idx < current
        const active = idx === current
        return (
          <div key={label} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
                  done
                    ? 'bg-[#00E5A0] text-black'
                    : active
                    ? 'bg-[#6C47FF] text-white'
                    : 'bg-zinc-700 text-zinc-400'
                }`}
              >
                {done ? <Check size={14} /> : idx}
              </div>
              <span className={`text-xs hidden sm:block ${active ? 'text-[#6C47FF]' : done ? 'text-[#00E5A0]' : 'text-zinc-500'}`}>
                {label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div className={`flex-1 h-px mx-2 ${done ? 'bg-[#00E5A0]' : 'bg-zinc-700'}`} />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── Step 1: Basics ──────────────────────────────────────────────────────────

function Step1({
  defaults,
  onNext,
  campaignType,
  onCampaignTypeChange,
}: {
  defaults: Partial<Step1Data>
  onNext: (d: Step1Data) => void
  campaignType: CampaignType
  onCampaignTypeChange: (t: CampaignType) => void
}) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<Step1Data>({
    resolver: zodResolver(step1Schema),
    defaultValues: {
      title: defaults.title ?? '',
      description: defaults.description ?? '',
      target_platforms: defaults.target_platforms ?? [],
      start_date: defaults.start_date ?? '',
      end_date: defaults.end_date ?? '',
    },
  })

  const title = watch('title') ?? ''
  const description = watch('description') ?? ''
  const platforms = watch('target_platforms') ?? []

  const togglePlatform = (p: string) => {
    const next = platforms.includes(p) ? platforms.filter((x) => x !== p) : [...platforms, p]
    setValue('target_platforms', next, { shouldValidate: true })
  }

  return (
    <form onSubmit={handleSubmit(onNext)} className="flex flex-col gap-6">

      {/* Campaign Type */}
      <div className="mb-2">
        <label className="block text-xs text-zinc-400 uppercase tracking-wider mb-4">
          Campaign Type
        </label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Digital */}
          <button
            type="button"
            onClick={() => onCampaignTypeChange('digital')}
            className={`p-6 border text-left transition-colors ${
              campaignType === 'digital'
                ? 'border-[#6C47FF] bg-[#6C47FF]/5'
                : 'border-zinc-800 bg-[#111111] hover:border-zinc-600'
            }`}
          >
            <div className="text-2xl mb-3">📱</div>
            <h3 className="text-white font-bold mb-1">Digital Campaign</h3>
            <p className="text-zinc-400 text-sm">
              Creators post from home. Works for apps, online stores, delivery, services, and anything digital.
            </p>
            <ul className="mt-3 space-y-1">
              {[
                'Creator uses or reviews your product',
                'Posts from anywhere',
                'Pay per view delivered',
              ].map(point => (
                <li key={point} className="text-xs text-zinc-500 flex items-center gap-2">
                  <span className="text-[#00E5A0]">✓</span>
                  {point}
                </li>
              ))}
            </ul>
          </button>

          {/* Experience */}
          <button
            type="button"
            onClick={() => onCampaignTypeChange('experience')}
            className={`p-6 border text-left transition-colors ${
              campaignType === 'experience'
                ? 'border-[#00E5A0] bg-[#00E5A0]/5'
                : 'border-zinc-800 bg-[#111111] hover:border-zinc-600'
            }`}
          >
            <div className="text-2xl mb-3">🍽️</div>
            <h3 className="text-white font-bold mb-1">Experience Campaign</h3>
            <p className="text-zinc-400 text-sm">
              For restaurants, clothing stores, salons, gyms and any business requiring physical presence.
            </p>
            <ul className="mt-3 space-y-1">
              {[
                'Creator visits your location',
                'Submit receipt for reimbursement',
                'Earn cashback if views target is hit',
              ].map(point => (
                <li key={point} className="text-xs text-zinc-500 flex items-center gap-2">
                  <span className="text-[#00E5A0]">✓</span>
                  {point}
                </li>
              ))}
            </ul>
            <div className="mt-3 bg-[#00E5A0]/5 border border-[#00E5A0]/20 px-3 py-2">
              <p className="text-[#00E5A0] text-xs font-semibold">Coming soon — in beta</p>
            </div>
          </button>
        </div>
      </div>

      {/* Title */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-xs text-zinc-400 uppercase tracking-wider">Campaign Title</label>
          <span className="text-xs text-zinc-600">{title.length}/100</span>
        </div>
        <input
          {...register('title')}
          placeholder="e.g. Cinnamon Hotels Summer Campaign"
          className="w-full bg-zinc-900 border border-zinc-800 focus:border-[#6C47FF] outline-none px-4 py-3 text-sm text-white rounded-none placeholder:text-zinc-600 transition-colors"
        />
        {errors.title && <p className="text-red-400 text-xs mt-1">{errors.title.message}</p>}
      </div>

      {/* Description */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-xs text-zinc-400 uppercase tracking-wider">Description</label>
          <span className="text-xs text-zinc-600">{description.length}/500</span>
        </div>
        <textarea
          {...register('description')}
          rows={4}
          placeholder="What is this campaign about? What product or service are you promoting?"
          className="w-full bg-zinc-900 border border-zinc-800 focus:border-[#6C47FF] outline-none px-4 py-3 text-sm text-white rounded-none placeholder:text-zinc-600 transition-colors resize-none"
        />
        {errors.description && <p className="text-red-400 text-xs mt-1">{errors.description.message}</p>}
      </div>

      {/* Platforms */}
      <div>
        <label className="block text-xs text-zinc-400 uppercase tracking-wider mb-3">
          Where should creators post?
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {PLATFORMS.map((p) => {
            const sel = platforms.includes(p)
            return (
              <button
                key={p}
                type="button"
                onClick={() => togglePlatform(p)}
                className={`bg-zinc-900 border p-4 cursor-pointer text-sm font-medium text-left transition-colors ${
                  sel ? 'border-[#6C47FF] bg-[#6C47FF]/5 text-white' : 'border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-600'
                }`}
              >
                {p}
              </button>
            )
          })}
        </div>
        {errors.target_platforms && <p className="text-red-400 text-xs mt-1">{errors.target_platforms.message}</p>}
      </div>

      {/* Dates */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs text-zinc-400 uppercase tracking-wider mb-1.5">Start Date</label>
          <input
            {...register('start_date')}
            type="date"
            min={today}
            className="w-full bg-zinc-900 border border-zinc-800 focus:border-[#6C47FF] outline-none px-4 py-3 text-sm text-white rounded-none transition-colors"
          />
          {errors.start_date && <p className="text-red-400 text-xs mt-1">{errors.start_date.message}</p>}
        </div>
        <div>
          <label className="block text-xs text-zinc-400 uppercase tracking-wider mb-1.5">End Date</label>
          <input
            {...register('end_date')}
            type="date"
            min={today}
            className="w-full bg-zinc-900 border border-zinc-800 focus:border-[#6C47FF] outline-none px-4 py-3 text-sm text-white rounded-none transition-colors"
          />
          {errors.end_date && <p className="text-red-400 text-xs mt-1">{errors.end_date.message}</p>}
        </div>
      </div>

      <div className="flex justify-end pt-2">
        <button type="submit" className="bg-[#6C47FF] text-white px-8 py-3 text-sm font-semibold hover:bg-[#5538ee] transition-colors">
          Next: Brief →
        </button>
      </div>
    </form>
  )
}

// ─── Step 2: Brief ───────────────────────────────────────────────────────────

function Step2({
  defaults,
  onNext,
  onBack,
}: {
  defaults: Partial<Step2Data>
  onNext: (d: Step2Data) => void
  onBack: () => void
}) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<Step2Data>({
    resolver: zodResolver(step2Schema),
    defaultValues: {
      brief: defaults.brief ?? '',
      do_list: defaults.do_list?.length ? defaults.do_list : [''],
      dont_list: defaults.dont_list?.length ? defaults.dont_list : [''],
      hashtags: defaults.hashtags ?? [],
    },
  })

  const brief = watch('brief') ?? ''
  const doList = watch('do_list') ?? ['']
  const dontList = watch('dont_list') ?? ['']
  const hashtags = watch('hashtags') ?? []
  const [hashInput, setHashInput] = useState('')

  const addDo = () => setValue('do_list', [...doList, ''])
  const removeDo = (i: number) => setValue('do_list', doList.filter((_, idx) => idx !== i))
  const updateDo = (i: number, v: string) => {
    const next = [...doList]; next[i] = v
    setValue('do_list', next, { shouldValidate: true })
  }

  const addDont = () => setValue('dont_list', [...dontList, ''])
  const removeDont = (i: number) => setValue('dont_list', dontList.filter((_, idx) => idx !== i))
  const updateDont = (i: number, v: string) => {
    const next = [...dontList]; next[i] = v
    setValue('dont_list', next, { shouldValidate: true })
  }

  const addHashtag = (raw: string) => {
    const tag = raw.trim().replace(/^#*/, '#').replace(/\s+/g, '')
    if (!tag || tag === '#' || hashtags.includes(tag) || hashtags.length >= 5) return
    setValue('hashtags', [...hashtags, tag])
    setHashInput('')
  }

  const removeHashtag = (t: string) => setValue('hashtags', hashtags.filter((h) => h !== t))

  return (
    <form onSubmit={handleSubmit(onNext)} className="flex flex-col gap-6">
      {/* Tip */}
      <div className="bg-[#6C47FF]/5 border border-[#6C47FF]/20 p-4 text-sm text-zinc-300">
        💡 Write a clear brief. Creators will read this before posting. The better your brief, the better the content you get.
      </div>

      {/* Brief */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-xs text-zinc-400 uppercase tracking-wider">Campaign Brief</label>
          <span className="text-xs text-zinc-600">{brief.length}/2000</span>
        </div>
        <textarea
          {...register('brief')}
          rows={6}
          placeholder="Describe exactly what you want creators to post. Include the message, tone, and any specific requirements."
          className="w-full bg-zinc-900 border border-zinc-800 focus:border-[#6C47FF] outline-none px-4 py-3 text-sm text-white rounded-none placeholder:text-zinc-600 transition-colors resize-none"
        />
        {errors.brief && <p className="text-red-400 text-xs mt-1">{errors.brief.message}</p>}
      </div>

      {/* Dos */}
      <div>
        <label className="block text-xs text-zinc-400 uppercase tracking-wider mb-3">Do&apos;s ✓</label>
        <div className="flex flex-col gap-2">
          {doList.map((item, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                value={item}
                onChange={(e) => updateDo(i, e.target.value)}
                placeholder="e.g. Show the product in use"
                className="flex-1 bg-zinc-900 border border-zinc-800 focus:border-[#6C47FF] outline-none px-4 py-2.5 text-sm text-white rounded-none placeholder:text-zinc-600 transition-colors"
              />
              {doList.length > 1 && (
                <button type="button" onClick={() => removeDo(i)} className="text-zinc-500 hover:text-white transition-colors p-1">
                  <X size={14} />
                </button>
              )}
            </div>
          ))}
          {doList.length < 10 && (
            <button type="button" onClick={addDo} className="flex items-center gap-2 text-xs text-zinc-400 hover:text-white transition-colors w-fit">
              <Plus size={12} /> Add another do
            </button>
          )}
        </div>
        {errors.do_list && <p className="text-red-400 text-xs mt-1">Add at least one item</p>}
      </div>

      {/* Donts */}
      <div>
        <label className="block text-xs text-zinc-400 uppercase tracking-wider mb-3">Don&apos;ts ✗</label>
        <div className="flex flex-col gap-2">
          {dontList.map((item, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                value={item}
                onChange={(e) => updateDont(i, e.target.value)}
                placeholder="e.g. Don't mention competitor brands"
                className="flex-1 bg-zinc-900 border border-zinc-800 focus:border-[#6C47FF] outline-none px-4 py-2.5 text-sm text-white rounded-none placeholder:text-zinc-600 transition-colors"
              />
              {dontList.length > 1 && (
                <button type="button" onClick={() => removeDont(i)} className="text-zinc-500 hover:text-white transition-colors p-1">
                  <X size={14} />
                </button>
              )}
            </div>
          ))}
          {dontList.length < 10 && (
            <button type="button" onClick={addDont} className="flex items-center gap-2 text-xs text-zinc-400 hover:text-white transition-colors w-fit">
              <Plus size={12} /> Add another don&apos;t
            </button>
          )}
        </div>
        {errors.dont_list && <p className="text-red-400 text-xs mt-1">Add at least one item</p>}
      </div>

      {/* Hashtags */}
      <div>
        <label className="block text-xs text-zinc-400 uppercase tracking-wider mb-1.5">Required Hashtags</label>
        <div className="flex flex-wrap gap-2 mb-2">
          {hashtags.map((h) => (
            <span key={h} className="inline-flex items-center gap-1 text-xs bg-[#6C47FF]/10 text-[#6C47FF] border border-[#6C47FF]/20 px-2.5 py-1">
              {h}
              <button type="button" onClick={() => removeHashtag(h)} className="hover:text-white transition-colors"><X size={10} /></button>
            </span>
          ))}
        </div>
        {hashtags.length < 5 && (
          <input
            value={hashInput}
            onChange={(e) => setHashInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ',') {
                e.preventDefault()
                addHashtag(hashInput)
              }
            }}
            placeholder="Type a hashtag and press Enter"
            className="w-full bg-zinc-900 border border-zinc-800 focus:border-[#6C47FF] outline-none px-4 py-3 text-sm text-white rounded-none placeholder:text-zinc-600 transition-colors"
          />
        )}
        <p className="text-xs text-zinc-600 mt-1">{hashtags.length}/5 hashtags</p>
      </div>

      <div className="flex items-center justify-between pt-2">
        <button type="button" onClick={onBack} className="flex items-center gap-2 text-sm text-zinc-400 hover:text-white transition-colors">
          <ChevronLeft size={16} /> Back
        </button>
        <button type="submit" className="bg-[#6C47FF] text-white px-8 py-3 text-sm font-semibold hover:bg-[#5538ee] transition-colors">
          Next: Budget →
        </button>
      </div>
    </form>
  )
}

// ─── Step 3: Budget ──────────────────────────────────────────────────────────

function Step3({
  defaults,
  onNext,
  onBack,
  campaignType,
  reimbursementCap,
  setReimbursementCap,
  minViewsForReimbursement,
  setMinViewsForReimbursement,
  travelAllowance,
  setTravelAllowance,
}: {
  defaults: Partial<Step3Data>
  onNext: (d: Step3Data) => void
  onBack: () => void
  campaignType: CampaignType
  reimbursementCap: string
  setReimbursementCap: (v: string) => void
  minViewsForReimbursement: string
  setMinViewsForReimbursement: (v: string) => void
  travelAllowance: string
  setTravelAllowance: (v: string) => void
}) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<Step3Data>({
    resolver: zodResolver(step3Schema),
    defaultValues: {
      payout_rate: defaults.payout_rate ?? 10,
      budget_total: defaults.budget_total ?? undefined,
      per_creator_cap_enabled: defaults.per_creator_cap_enabled ?? false,
      per_creator_cap: defaults.per_creator_cap ?? undefined,
    },
  })

  const rate = watch('payout_rate') || 0
  const budget = watch('budget_total') || 0
  const capEnabled = watch('per_creator_cap_enabled')
  const perCreatorCap = watch('per_creator_cap') || 0

  const fee = budget * 0.15
  const pool = budget * 0.85
  const maxViews = rate > 0 ? Math.floor((pool / rate) * 1000) : 0
  const showPerCreatorCap = budget >= 50000

  return (
    <form onSubmit={handleSubmit(onNext)} className="flex flex-col gap-8">
      {/* Payout Rate */}
      <div>
        <label className="block text-sm font-medium text-white mb-1">How much will you pay per 1,000 views?</label>
        <p className="text-xs text-zinc-500 mb-3">Minimum LKR 5 per 1,000 views</p>
        <div className="flex items-center gap-3">
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-zinc-400">LKR</span>
            <input
              {...register('payout_rate', { valueAsNumber: true })}
              type="number"
              min={5}
              placeholder="10"
              className="bg-zinc-900 border border-zinc-800 focus:border-[#6C47FF] outline-none pl-14 pr-4 py-3 text-sm text-white rounded-none transition-colors w-44"
            />
          </div>
          <span className="text-sm text-zinc-400">per 1,000 views</span>
        </div>
        {errors.payout_rate && <p className="text-red-400 text-xs mt-1">{errors.payout_rate.message}</p>}

        {/* Comparison table */}
        {rate > 0 && (
          <div className="mt-4 bg-zinc-900 border border-zinc-800 overflow-hidden">
            <p className="px-4 py-2 text-xs text-zinc-500 border-b border-zinc-800">At this rate:</p>
            {[
              [1000, rate],
              [10000, rate * 10],
              [100000, rate * 100],
            ].map(([views, earn]) => (
              <div key={views} className="flex justify-between px-4 py-2 border-b border-zinc-800/50 last:border-0 text-sm">
                <span className="text-zinc-400">{views.toLocaleString()} views</span>
                <span className="text-[#00E5A0] font-medium">{formatLKR(earn)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Budget */}
      <div>
        <label className="block text-sm font-medium text-white mb-1">Campaign Budget</label>
        <p className="text-xs text-zinc-500 mb-3">This amount will be held in escrow and released to creators as views are delivered.</p>
        <div className="relative w-56">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-zinc-400">LKR</span>
          <input
            {...register('budget_total', { valueAsNumber: true })}
            type="number"
            min={5000}
            placeholder="50000"
            className="w-full bg-zinc-900 border border-zinc-800 focus:border-[#6C47FF] outline-none pl-14 pr-4 py-3 text-sm text-white rounded-none transition-colors"
          />
        </div>
        {errors.budget_total && <p className="text-red-400 text-xs mt-1">{errors.budget_total.message}</p>}

        {/* Breakdown */}
        {budget >= 5000 && (
          <div className="mt-4 bg-zinc-900 border border-zinc-800 p-6">
            <p className="text-xs text-zinc-500 uppercase tracking-wider mb-4">Budget Breakdown</p>
            <div className="flex flex-col gap-2 text-sm font-mono">
              <div className="flex justify-between">
                <span className="text-zinc-400">Total Budget</span>
                <span className="text-white">{formatLKR(budget)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Platform Fee (15%)</span>
                <span className="text-red-400">-{formatLKR(fee)}</span>
              </div>
              <div className="flex justify-between border-t border-zinc-800 pt-2 mt-1">
                <span className="text-zinc-400">Creator Pool</span>
                <span className="text-[#00E5A0] font-bold">{formatLKR(pool)}</span>
              </div>
            </div>
            {rate > 0 && (
              <div className="mt-4 pt-4 border-t border-zinc-800">
                <p className="text-xs text-zinc-500 mb-2">At LKR {rate}/1,000 views this campaign can deliver:</p>
                <p className="font-syne text-3xl font-extrabold text-[#00E5A0]">
                  {maxViews.toLocaleString()} views
                </p>
              </div>
            )}
            {/* Budget-based earning hint */}
            <div className="mt-4 pt-4 border-t border-zinc-800 text-xs text-zinc-500">
              {!showPerCreatorCap ? (
                <p>
                  One creator can earn up to{' '}
                  <span className="text-zinc-300 font-medium">{formatLKR(Math.round(pool))}</span>{' '}
                  if they hit enough views
                </p>
              ) : capEnabled && perCreatorCap > 0 ? (
                <p>
                  Max per creator:{' '}
                  <span className="text-zinc-300 font-medium">{formatLKR(perCreatorCap)}</span>
                </p>
              ) : null}
            </div>
          </div>
        )}
      </div>

      {/* Per creator cap */}
      {showPerCreatorCap ? (
        <div className="mt-2">
          <div className="flex items-center justify-between mb-3">
            <div>
              <label className="text-white font-semibold">Per-Creator Earning Limit</label>
              <p className="text-zinc-500 text-sm mt-1">
                Cap the maximum any single creator can earn. Distributes budget across more creators.
              </p>
            </div>
            <input
              type="checkbox"
              checked={capEnabled}
              onChange={e => setValue('per_creator_cap_enabled', e.target.checked)}
              className="w-5 h-5"
            />
          </div>
          {capEnabled && (
            <div>
              <label className="block text-xs text-zinc-400 uppercase tracking-wider mb-1.5">Maximum a single creator can earn</label>
              <div className="relative w-56">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-zinc-400">LKR</span>
                <input
                  {...register('per_creator_cap', { valueAsNumber: true })}
                  type="number"
                  min={500}
                  placeholder="5000"
                  className="w-full bg-zinc-900 border border-zinc-800 focus:border-[#6C47FF] outline-none pl-14 pr-4 py-3 text-sm text-white rounded-none transition-colors"
                />
              </div>
              <p className="text-xs text-zinc-500 mt-1">This distributes budget across more creators</p>
              {errors.per_creator_cap && <p className="text-red-400 text-xs mt-1">{errors.per_creator_cap.message}</p>}
            </div>
          )}
        </div>
      ) : (
        <div className="mt-2 bg-[#6C47FF]/5 border border-[#6C47FF]/20 p-4">
          <p className="text-zinc-300 text-sm">
            <span className="text-[#6C47FF] font-semibold">No per-creator limit</span>
            {' '}— For campaigns under LKR 50,000, a single high-performing creator can earn the full budget. This rewards the best content without artificial limits.
          </p>
          <p className="text-zinc-500 text-xs mt-2">
            Per-creator caps are available for campaigns with a budget of LKR 50,000 or more.
          </p>
        </div>
      )}

      {/* Experience Settings */}
      {campaignType === 'experience' && (
        <div className="mt-2 space-y-4 bg-zinc-900/50 border border-zinc-800 p-6">
          <h3 className="text-white font-semibold">Experience Settings</h3>

          {/* Receipt reimbursement cap */}
          <div>
            <label className="block text-xs uppercase tracking-wider text-zinc-400 mb-2">
              Max Receipt Reimbursement per Creator (LKR)
            </label>
            <input
              type="number"
              value={reimbursementCap}
              onChange={e => setReimbursementCap(e.target.value)}
              placeholder="e.g. 1500"
              className="w-full bg-zinc-900 border border-zinc-800 text-white px-4 py-3 rounded-none focus:border-[#6C47FF] outline-none transition-colors text-sm"
            />
            <p className="text-zinc-500 text-xs mt-2">
              Creators submit their receipt. If they hit the minimum views, they get reimbursed up to this amount.
            </p>
          </div>

          {/* Minimum views for reimbursement */}
          <div>
            <label className="block text-xs uppercase tracking-wider text-zinc-400 mb-2">
              Minimum Views to Unlock Reimbursement
            </label>
            <input
              type="number"
              value={minViewsForReimbursement}
              onChange={e => setMinViewsForReimbursement(e.target.value)}
              placeholder="e.g. 5000"
              className="w-full bg-zinc-900 border border-zinc-800 text-white px-4 py-3 rounded-none focus:border-[#6C47FF] outline-none transition-colors text-sm"
            />
            <p className="text-zinc-500 text-xs mt-2">
              Creator must hit this view count within 7 days of posting to receive reimbursement.
            </p>
          </div>

          {/* Travel allowance */}
          <div>
            <label className="block text-xs uppercase tracking-wider text-zinc-400 mb-2">
              Travel Allowance per Creator — Optional (LKR)
            </label>
            <input
              type="number"
              value={travelAllowance}
              onChange={e => setTravelAllowance(e.target.value)}
              placeholder="e.g. 300 (leave empty for none)"
              className="w-full bg-zinc-900 border border-zinc-800 text-white px-4 py-3 rounded-none focus:border-[#6C47FF] outline-none transition-colors text-sm"
            />
            <p className="text-zinc-500 text-xs mt-2">
              Optional flat amount paid to any creator who submits verified content, regardless of views. Covers travel costs.
            </p>
          </div>

          {/* How it works summary */}
          <div className="bg-[#111111] border border-zinc-700 p-4 mt-4">
            <p className="text-zinc-400 text-xs font-semibold uppercase tracking-wider mb-3">How creators get paid</p>
            <div className="space-y-2 text-xs text-zinc-400">
              {[
                ['#6C47FF', '1.', 'Creator visits your location and makes a purchase'],
                ['#6C47FF', '2.', 'They post content and submit their receipt + post URL on Creatify'],
                ['#6C47FF', '3.', 'Travel allowance (if set) credited to wallet immediately'],
                ['#6C47FF', '4.', 'Per-view earnings accumulate as views come in'],
                ['#00E5A0', '5.', 'If they hit minimum views within 7 days → receipt amount reimbursed (up to cap)'],
              ].map(([color, num, text]) => (
                <div key={num} className="flex items-start gap-2">
                  <span style={{ color }} className="mt-0.5 shrink-0">{num}</span>
                  {text}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Min cashout info */}
      {/* Minimum cashout is LKR 5,000 */}
      {/* Changed from LKR 500 on March 2026 */}
      {/* Bank transfer overhead too high for small amounts */}
      <div className="bg-zinc-900 border border-zinc-800 px-4 py-3 text-sm text-zinc-400">
        Creators can cash out from <span className="text-white font-medium">LKR 5,000</span>
      </div>

      <div className="flex items-center justify-between pt-2">
        <button type="button" onClick={onBack} className="flex items-center gap-2 text-sm text-zinc-400 hover:text-white transition-colors">
          <ChevronLeft size={16} /> Back
        </button>
        <button type="submit" className="bg-[#6C47FF] text-white px-8 py-3 text-sm font-semibold hover:bg-[#5538ee] transition-colors">
          Next: Review →
        </button>
      </div>
    </form>
  )
}

// ─── Step 4: Review ──────────────────────────────────────────────────────────

function Step4({
  data,
  onBack,
  onSubmit,
  submitting,
}: {
  data: Partial<AllData>
  onBack: () => void
  onSubmit: () => void
  submitting: boolean
}) {
  const budget = data.budget_total ?? 0
  const rate = data.payout_rate ?? 0
  const fee = budget * 0.15
  const pool = budget * 0.85
  const maxViews = rate > 0 ? Math.floor((pool / rate) * 1000) : 0
  const days =
    data.start_date && data.end_date
      ? Math.ceil((new Date(data.end_date).getTime() - new Date(data.start_date).getTime()) / 86400000)
      : null

  return (
    <div className="flex flex-col gap-6">
      {/* Summary card */}
      <div className="bg-[#111111] border border-zinc-800 p-8 flex flex-col gap-6">
        {/* Campaign Details */}
        <div>
          <p className="text-xs text-zinc-500 uppercase tracking-wider mb-3">Campaign Details</p>
          <h2 className="font-syne text-xl font-bold text-white mb-3">{data.title}</h2>
          <p className="text-sm text-zinc-400 mb-4">{data.description}</p>
          <div className="flex flex-wrap gap-1.5 mb-3">
            {(data.target_platforms ?? []).map((p) => (
              <span key={p} className="text-xs bg-zinc-800 text-zinc-400 px-2 py-0.5 capitalize">{p}</span>
            ))}
          </div>
          {data.start_date && data.end_date && (
            <p className="text-sm text-zinc-400">
              {data.start_date} → {data.end_date}
              {days !== null && <span className="text-zinc-500 ml-2">({days} days)</span>}
            </p>
          )}
        </div>

        <div className="border-t border-zinc-800" />

        {/* Brief */}
        <div>
          <p className="text-xs text-zinc-500 uppercase tracking-wider mb-3">Creator Brief</p>
          <p className="text-sm text-zinc-300 mb-4">
            {(data.brief ?? '').slice(0, 200)}{(data.brief ?? '').length > 200 ? '…' : ''}
          </p>
          {(data.do_list ?? []).length > 0 && (
            <div className="mb-3">
              <p className="text-xs text-zinc-500 mb-1">Do&apos;s</p>
              <ul className="text-sm text-zinc-400 list-disc list-inside flex flex-col gap-0.5">
                {data.do_list!.filter(Boolean).map((d, i) => <li key={i}>{d}</li>)}
              </ul>
            </div>
          )}
          {(data.dont_list ?? []).length > 0 && (
            <div className="mb-3">
              <p className="text-xs text-zinc-500 mb-1">Don&apos;ts</p>
              <ul className="text-sm text-zinc-400 list-disc list-inside flex flex-col gap-0.5">
                {data.dont_list!.filter(Boolean).map((d, i) => <li key={i}>{d}</li>)}
              </ul>
            </div>
          )}
          {(data.hashtags ?? []).length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {data.hashtags!.map((h, i) => (
                <span key={i} className="text-xs bg-[#6C47FF]/10 text-[#6C47FF] border border-[#6C47FF]/20 px-2 py-0.5">{h}</span>
              ))}
            </div>
          )}
        </div>

        <div className="border-t border-zinc-800" />

        {/* Budget */}
        <div>
          <p className="text-xs text-zinc-500 uppercase tracking-wider mb-3">Budget</p>
          <div className="flex flex-col gap-2 text-sm">
            <div className="flex justify-between">
              <span className="text-zinc-400">Payout rate</span>
              <span className="text-white">{formatLKR(rate)} per 1,000 views</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-400">Total budget</span>
              <span className="text-white">{formatLKR(budget)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-400">Platform fee (15%)</span>
              <span className="text-zinc-400">-{formatLKR(fee)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-400">Creator pool</span>
              <span className="text-[#00E5A0]">{formatLKR(pool)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-400">Estimated views</span>
              <span className="text-[#00E5A0]">{maxViews.toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Payment */}
      <div className="bg-zinc-900 border border-zinc-800 p-6">
        <p className="text-sm font-medium text-white mb-2">Complete Payment to Launch</p>
        <p className="font-syne text-3xl font-extrabold text-white mb-1">{formatLKR(budget)}</p>
        <p className="text-sm text-zinc-500 mb-4">Your campaign goes live immediately after payment is confirmed.</p>
        <div className="bg-[#6C47FF]/5 border border-[#6C47FF]/20 px-4 py-3 text-sm text-zinc-300 mb-6">
          You will be redirected to PayHere&apos;s secure payment page. After successful payment your campaign will automatically activate.
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            type="button"
            onClick={onBack}
            className="flex items-center justify-center gap-2 text-sm text-zinc-300 border border-zinc-700 px-6 py-3 hover:border-zinc-400 hover:text-white transition-all"
          >
            <ChevronLeft size={16} /> Edit Campaign
          </button>
          <button
            type="button"
            onClick={onSubmit}
            disabled={submitting}
            className="flex-1 bg-[#6C47FF] text-white px-8 py-3 text-sm font-semibold hover:bg-[#5538ee] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {submitting ? 'Launching…' : `Pay ${formatLKR(budget)} & Launch →`}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function CreateCampaignPage() {
  const { user, loading: userLoading } = useUser()
  const router = useRouter()
  const supabase = useMemo(() => createSupabaseClient(), [])

  const [step, setStep] = useState(1)
  const [formData, setFormData] = useState<Partial<AllData>>({})
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  // Campaign type state
  const [campaignType, setCampaignType] = useState<CampaignType>('digital')

  // Experience campaign state
  const [reimbursementCap, setReimbursementCap] = useState('')
  const [minViewsForReimbursement, setMinViewsForReimbursement] = useState('')
  const [travelAllowance, setTravelAllowance] = useState('')

  const handleStep1 = (d: Step1Data) => {
    setFormData((prev) => ({ ...prev, ...d }))
    setStep(2)
  }
  const handleStep2 = (d: Step2Data) => {
    setFormData((prev) => ({ ...prev, ...d }))
    setStep(3)
  }
  const handleStep3 = (d: Step3Data) => {
    setFormData((prev) => ({ ...prev, ...d }))
    setStep(4)
  }

  const handleSubmit = async () => {
    if (!user) return
    setSubmitting(true)
    setSubmitError(null)

    // TODO: Run this SQL in Supabase to add proper columns:
    // ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS campaign_type VARCHAR(20) DEFAULT 'digital';
    // ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS experience_reimbursement_cap DECIMAL(10,2);
    // ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS experience_min_views BIGINT;
    // ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS travel_allowance DECIMAL(10,2);

    const { data: profile } = await supabase
      .from('brand_profiles')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle()

    if (!profile) {
      setSubmitError('Brand profile not found.')
      setSubmitting(false)
      return
    }

    // Store experience data in description with JSON prefix
    const experienceData = campaignType === 'experience' ? {
      type: 'experience',
      reimbursement_cap: reimbursementCap ? parseFloat(reimbursementCap) : null,
      min_views_for_reimbursement: minViewsForReimbursement ? parseInt(minViewsForReimbursement) : null,
      travel_allowance: travelAllowance ? parseFloat(travelAllowance) : null,
    } : { type: 'digital' }

    const descriptionWithMeta = `[CAMPAIGN_META]${JSON.stringify(experienceData)}\n${formData.description ?? ''}`

    // Per-creator cap only available when budget >= 50,000
    const budget = formData.budget_total ?? 0
    const perCreatorCap = budget >= 50000 && formData.per_creator_cap_enabled
      ? formData.per_creator_cap ?? null
      : null

    const payload = {
      brand_id: profile.id,
      title: formData.title,
      description: descriptionWithMeta,
      brief: formData.brief,
      do_list: formData.do_list?.filter(Boolean),
      dont_list: formData.dont_list?.filter(Boolean),
      hashtags: formData.hashtags,
      target_platforms: formData.target_platforms,
      payout_rate: formData.payout_rate,
      budget_total: formData.budget_total,
      budget_remaining: formData.budget_total,
      // Minimum cashout is LKR 5,000
      // Changed from LKR 500 on March 2026
      // Bank transfer overhead too high for small amounts
      min_cashout: 5000,
      per_creator_cap: perCreatorCap,
      start_date: formData.start_date,
      end_date: formData.end_date,
      status: 'pending_payment',
    }

    const { data: campaign, error: insertErr } = await supabase
      .from('campaigns')
      .insert(payload)
      .select()
      .single()

    if (insertErr || !campaign) {
      console.error(insertErr)
      setSubmitError('Failed to create campaign. Please try again.')
      setSubmitting(false)
      return
    }

    // Stub payment: immediately activate
    await supabase
      .from('campaigns')
      .update({ status: 'active' })
      .eq('id', campaign.id)

    router.push(`/brand/campaigns/${campaign.id}?launched=1`)
  }

  if (userLoading) return null

  return (
    <div className="font-sans">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <Link href="/brand/campaigns" className="inline-flex items-center gap-1 text-sm text-zinc-400 hover:text-white transition-colors mb-4">
            <ChevronLeft size={16} /> Campaigns
          </Link>
          <h1 className="font-syne text-3xl font-extrabold text-white">New Campaign</h1>
        </div>

        <StepIndicator current={step} />

        {submitError && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 text-sm mb-6">
            {submitError}
          </div>
        )}

        {step === 1 && (
          <Step1
            defaults={formData}
            onNext={handleStep1}
            campaignType={campaignType}
            onCampaignTypeChange={setCampaignType}
          />
        )}
        {step === 2 && <Step2 defaults={formData} onNext={handleStep2} onBack={() => setStep(1)} />}
        {step === 3 && (
          <Step3
            defaults={formData}
            onNext={handleStep3}
            onBack={() => setStep(2)}
            campaignType={campaignType}
            reimbursementCap={reimbursementCap}
            setReimbursementCap={setReimbursementCap}
            minViewsForReimbursement={minViewsForReimbursement}
            setMinViewsForReimbursement={setMinViewsForReimbursement}
            travelAllowance={travelAllowance}
            setTravelAllowance={setTravelAllowance}
          />
        )}
        {step === 4 && (
          <Step4
            data={formData}
            onBack={() => setStep(3)}
            onSubmit={handleSubmit}
            submitting={submitting}
          />
        )}
      </div>
    </div>
  )
}
