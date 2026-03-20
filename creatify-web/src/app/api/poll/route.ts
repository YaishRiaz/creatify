import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { calculateFraudScore } from '@/lib/fraud'
import { getTikTokViews, getInstagramViews, getFacebookViews } from '@/lib/apify'
import { getYouTubeViews, extractYouTubeVideoId } from '@/lib/youtube'

function isAuthorized(req: NextRequest): boolean {
  const secret = req.headers.get('x-poll-secret')
  return secret === process.env.POLL_SECRET
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

    // 3. Process each task
    for (const task of tasks) {
      const campaign = Array.isArray(task.campaign)
        ? task.campaign[0]
        : task.campaign
      const creator = Array.isArray(task.creator)
        ? task.creator[0]
        : task.creator

      if (!campaign || campaign.status !== 'active') continue
      if (campaign.budget_remaining <= 0) continue

      try {
        const viewData = await getViewCount(
          task.platform,
          task.post_url,
          task.post_id ?? undefined
        )

        if (viewData.error) {
          results.errors++
          results.details.push(`Task ${task.id}: view fetch error - ${viewData.error}`)
          continue
        }

        const currentViews = viewData.views
        const deltaViews = Math.max(0, currentViews - task.total_views)

        // Always save a snapshot even if no new views
        if (deltaViews === 0) {
          await supabase.from('view_snapshots').insert({
            task_id: task.id,
            views_at_snapshot: currentViews,
            delta_views: 0,
            earnings_added: 0,
          })
          continue
        }

        // Fetch previous deltas for fraud scoring
        const { data: prevSnapshots } = await supabase
          .from('view_snapshots')
          .select('delta_views')
          .eq('task_id', task.id)
          .order('snapshotted_at', { ascending: false })
          .limit(5)

        const previousDeltas = prevSnapshots?.map((s) => s.delta_views) ?? []

        // Run fraud check
        const fraud = calculateFraudScore({
          deltaViews,
          deltaLikes: viewData.likes,
          deltaComments: viewData.comments,
          previousDeltas,
          platform: task.platform,
        })

        if (fraud.flagged) {
          await supabase
            .from('tasks')
            .update({
              status: 'flagged',
              fraud_score: fraud.score,
              total_views: currentViews,
            })
            .eq('id', task.id)

          results.flagged++
          results.details.push(`Task ${task.id}: FLAGGED (score: ${fraud.score})`)
          continue
        }

        // Calculate earnings in LKR (2 decimal places)
        let earnings =
          Math.round((deltaViews / 1000) * campaign.payout_rate * 100) / 100

        // Apply per-creator cap
        if (campaign.per_creator_cap) {
          const remainingCap = campaign.per_creator_cap - task.total_earned
          if (earnings > remainingCap) earnings = remainingCap
        }

        // Cap at remaining budget
        if (earnings > campaign.budget_remaining) {
          earnings = campaign.budget_remaining
        }

        if (earnings <= 0) continue

        // A: Update task
        const { error: taskError } = await supabase
          .from('tasks')
          .update({
            total_views: currentViews,
            total_earned: Math.round((task.total_earned + earnings) * 100) / 100,
            status: 'tracking',
            fraud_score: fraud.score,
          })
          .eq('id', task.id)

        if (taskError) {
          results.errors++
          continue
        }

        // B: Update creator wallet
        const { data: currentProfile } = await supabase
          .from('creator_profiles')
          .select('wallet_balance, total_earned')
          .eq('user_id', creator.user_id)
          .single()

        if (currentProfile) {
          await supabase
            .from('creator_profiles')
            .update({
              wallet_balance:
                Math.round((currentProfile.wallet_balance + earnings) * 100) / 100,
              total_earned:
                Math.round((currentProfile.total_earned + earnings) * 100) / 100,
            })
            .eq('user_id', creator.user_id)
        }

        // C: Update campaign budget
        await supabase
          .from('campaigns')
          .update({
            budget_remaining:
              Math.round((campaign.budget_remaining - earnings) * 100) / 100,
          })
          .eq('id', task.campaign_id)

        // D: Save snapshot
        await supabase.from('view_snapshots').insert({
          task_id: task.id,
          views_at_snapshot: currentViews,
          delta_views: deltaViews,
          earnings_added: earnings,
        })

        // E: Complete campaign + tasks if budget exhausted
        const newBudgetRemaining = campaign.budget_remaining - earnings
        if (newBudgetRemaining <= 0) {
          await supabase
            .from('campaigns')
            .update({ status: 'completed' })
            .eq('id', task.campaign_id)

          await supabase
            .from('tasks')
            .update({ status: 'completed' })
            .in('status', ['submitted', 'tracking', 'accepted'])
            .eq('campaign_id', task.campaign_id)
        }

        results.processed++
        results.earned += earnings
        results.details.push(
          `Task ${task.id}: +${deltaViews} views, +LKR ${earnings}`
        )
      } catch (taskError) {
        results.errors++
        results.details.push(`Task ${task.id}: unexpected error - ${String(taskError)}`)
      }
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
