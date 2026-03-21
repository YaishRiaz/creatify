export const runtime = 'edge'
export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { calculateFraudScore } from '@/lib/fraud'
import { getTikTokViews, getInstagramViews, getFacebookViews } from '@/lib/apify'
import { getYouTubeViews, extractYouTubeVideoId } from '@/lib/youtube'

// Constant-time string comparison to prevent timing attacks.
// Works in edge runtime (no Node.js crypto required).
function timingSafeEqual(a: string, b: string): boolean {
  const enc = new TextEncoder()
  const aBytes = enc.encode(a)
  const bBytes = enc.encode(b)
  // Always iterate the longer length so duration doesn't leak length difference
  const len = Math.max(aBytes.length, bBytes.length)
  let diff = aBytes.length ^ bBytes.length
  for (let i = 0; i < len; i++) {
    diff |= (aBytes[i] ?? 0) ^ (bBytes[i] ?? 0)
  }
  return diff === 0
}

function isAuthorized(req: NextRequest): boolean {
  const secret = req.headers.get('x-poll-secret') ?? ''
  const expected = process.env.POLL_SECRET ?? ''
  return expected.length > 0 && timingSafeEqual(secret, expected)
}

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServerClient()
  const results = {
    processed: 0,
    earned: 0,
    flagged: 0,
    errors: 0,
    details: [] as string[],
  }

  try {
    // 1. Expire campaigns past end_date
    await supabase
      .from('campaigns')
      .update({ status: 'completed' })
      .eq('status', 'active')
      .lt('end_date', new Date().toISOString())

    // 2. Fetch all tasks that need polling
    const { data: tasks, error: tasksError } = await supabase
      .from('tasks')
      .select(`
        id,
        campaign_id,
        creator_id,
        platform,
        post_url,
        post_id,
        status,
        total_views,
        total_earned,
        fraud_score,
        campaign:campaigns(
          payout_rate,
          budget_remaining,
          per_creator_cap,
          status
        ),
        creator:creator_profiles(
          user_id
        )
      `)
      .in('status', ['submitted', 'tracking'])
      .not('post_url', 'is', null)
      .not('post_url', 'eq', '')

    if (tasksError) {
      throw new Error(`Failed to fetch tasks: ${tasksError.message}`)
    }

    if (!tasks || tasks.length === 0) {
      return NextResponse.json({ message: 'No tasks to poll', ...results })
    }

    results.details.push(`Found ${tasks.length} tasks to poll`)

    // 3. Filter to only actionable tasks
    const activeTasks = tasks.filter((t) => {
      const campaign = Array.isArray(t.campaign) ? t.campaign[0] : t.campaign
      const creator = Array.isArray(t.creator) ? t.creator[0] : t.creator
      return campaign && campaign.status === 'active' && campaign.budget_remaining > 0 && creator
    })

    // 4. Batch all external view fetches + previous-snapshot fetches in parallel
    const [viewResults, prevSnapshotResults] = await Promise.all([
      Promise.allSettled(
        activeTasks.map((t) => getViewCount(t.platform, t.post_url, t.post_id ?? undefined))
      ),
      Promise.all(
        activeTasks.map((t) =>
          supabase
            .from('view_snapshots')
            .select('delta_views')
            .eq('task_id', t.id)
            .order('snapshotted_at', { ascending: false })
            .limit(5)
        )
      ),
    ])

    // Accumulators — collect all changes before writing
    const snapshotsToInsert: object[] = []
    const taskUpdates: Array<{ id: string; data: object }> = []
    const creatorEarningsAccum = new Map<string, number>()   // user_id → total earned this cycle
    const campaignSpendAccum = new Map<string, number>()     // campaign_id → total spent this cycle
    const exhaustedCampaigns = new Set<string>()

    // Snapshot initial budget per campaign so we can accumulate deductions accurately
    const campaignBudgetSnapshot = new Map<string, number>()
    for (const t of activeTasks) {
      const campaign = Array.isArray(t.campaign) ? t.campaign[0] : t.campaign
      if (campaign && !campaignBudgetSnapshot.has(t.campaign_id)) {
        campaignBudgetSnapshot.set(t.campaign_id, campaign.budget_remaining)
      }
    }

    // 5. Process each task result
    for (let i = 0; i < activeTasks.length; i++) {
      const task = activeTasks[i]
      const campaign = Array.isArray(task.campaign) ? task.campaign[0] : task.campaign
      const creator = Array.isArray(task.creator) ? task.creator[0] : task.creator
      const viewResult = viewResults[i]
      const prevSnapshots = prevSnapshotResults[i]?.data ?? []

      try {
        if (viewResult.status === 'rejected') {
          results.errors++
          results.details.push(`Task ${task.id}: view fetch error - ${String(viewResult.reason)}`)
          continue
        }

        const viewData = viewResult.value
        if (viewData.error) {
          results.errors++
          results.details.push(`Task ${task.id}: view fetch error - ${viewData.error}`)
          continue
        }

        const currentViews = viewData.views
        const deltaViews = Math.max(0, currentViews - task.total_views)

        if (deltaViews === 0) {
          snapshotsToInsert.push({ task_id: task.id, views_at_snapshot: currentViews, delta_views: 0, earnings_added: 0 })
          continue
        }

        const previousDeltas = prevSnapshots.map((s: { delta_views: number }) => s.delta_views)

        const fraud = calculateFraudScore({
          deltaViews,
          deltaLikes: viewData.likes,
          deltaComments: viewData.comments,
          previousDeltas,
          platform: task.platform,
        })

        if (fraud.flagged) {
          taskUpdates.push({ id: task.id, data: { status: 'flagged', fraud_score: fraud.score, total_views: currentViews } })
          results.flagged++
          results.details.push(`Task ${task.id}: FLAGGED (score: ${fraud.score})`)
          continue
        }

        // Use accumulated spend to track effective remaining budget this cycle
        const alreadySpent = campaignSpendAccum.get(task.campaign_id) ?? 0
        const effectiveBudgetRemaining = (campaignBudgetSnapshot.get(task.campaign_id) ?? 0) - alreadySpent
        if (effectiveBudgetRemaining <= 0) continue

        let earnings = Math.round((deltaViews / 1000) * campaign!.payout_rate * 100) / 100

        if (campaign!.per_creator_cap) {
          const remainingCap = campaign!.per_creator_cap - task.total_earned
          if (earnings > remainingCap) earnings = remainingCap
        }
        if (earnings > effectiveBudgetRemaining) earnings = effectiveBudgetRemaining
        if (earnings <= 0) continue

        taskUpdates.push({
          id: task.id,
          data: {
            total_views: currentViews,
            total_earned: Math.round((task.total_earned + earnings) * 100) / 100,
            status: 'tracking',
            fraud_score: fraud.score,
          },
        })
        creatorEarningsAccum.set(creator!.user_id, (creatorEarningsAccum.get(creator!.user_id) ?? 0) + earnings)
        campaignSpendAccum.set(task.campaign_id, alreadySpent + earnings)
        snapshotsToInsert.push({ task_id: task.id, views_at_snapshot: currentViews, delta_views: deltaViews, earnings_added: earnings })

        if (effectiveBudgetRemaining - earnings <= 0) exhaustedCampaigns.add(task.campaign_id)

        results.processed++
        results.earned += earnings
        results.details.push(`Task ${task.id}: +${deltaViews} views, +LKR ${earnings}`)
      } catch (taskError) {
        results.errors++
        results.details.push(`Task ${task.id}: unexpected error - ${String(taskError)}`)
      }
    }

    // 6. Apply all DB writes in batches
    // Task updates + snapshot inserts fire in parallel
    await Promise.all([
      ...taskUpdates.map(({ id, data }) => supabase.from('tasks').update(data).eq('id', id)),
      snapshotsToInsert.length > 0 ? supabase.from('view_snapshots').insert(snapshotsToInsert) : Promise.resolve(),
    ])

    // Creator wallet updates — one read+write per unique creator (was N reads + N writes)
    await Promise.all(
      [...creatorEarningsAccum.entries()].map(async ([userId, earned]) => {
        const { data: profile } = await supabase
          .from('creator_profiles')
          .select('wallet_balance, total_earned')
          .eq('user_id', userId)
          .single()
        if (profile) {
          await supabase
            .from('creator_profiles')
            .update({
              wallet_balance: Math.round((profile.wallet_balance + earned) * 100) / 100,
              total_earned: Math.round((profile.total_earned + earned) * 100) / 100,
            })
            .eq('user_id', userId)
        }
      })
    )

    // Campaign budget updates — one write per unique campaign
    await Promise.all(
      [...campaignSpendAccum.entries()].map(([campaignId, spent]) => {
        const newRemaining = Math.round(((campaignBudgetSnapshot.get(campaignId) ?? 0) - spent) * 100) / 100
        return supabase.from('campaigns').update({ budget_remaining: newRemaining }).eq('id', campaignId)
      })
    )

    // Mark exhausted campaigns and their tasks as completed
    if (exhaustedCampaigns.size > 0) {
      await Promise.all(
        [...exhaustedCampaigns].flatMap((campaignId) => [
          supabase.from('campaigns').update({ status: 'completed' }).eq('id', campaignId),
          supabase.from('tasks').update({ status: 'completed' })
            .in('status', ['submitted', 'tracking', 'accepted'])
            .eq('campaign_id', campaignId),
        ])
      )
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      ...results,
    })
  } catch (error) {
    console.error('Poll cycle failed:', error)
    return NextResponse.json(
      { success: false, error: String(error), ...results },
      { status: 500 }
    )
  }
}

// GET — health check for GitHub Actions
export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  return NextResponse.json({
    status: 'ok',
    service: 'creatify-poll',
    time: new Date().toISOString(),
  })
}

async function getViewCount(
  platform: string,
  postUrl: string,
  postId?: string
): Promise<{ views: number; likes: number; comments: number; error?: string }> {
  switch (platform) {
    case 'youtube': {
      const videoId = postId || extractYouTubeVideoId(postUrl)
      if (!videoId) {
        return {
          views: 0,
          likes: 0,
          comments: 0,
          error: 'Could not extract YouTube video ID',
        }
      }
      return getYouTubeViews(videoId)
    }
    case 'tiktok':
      return getTikTokViews(postUrl)
    case 'instagram':
      return getInstagramViews(postUrl)
    case 'facebook':
      return getFacebookViews(postUrl)
    default:
      return {
        views: 0,
        likes: 0,
        comments: 0,
        error: `Unsupported platform: ${platform}`,
      }
  }
}
