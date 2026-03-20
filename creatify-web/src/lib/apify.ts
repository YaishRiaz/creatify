const APIFY_BASE = 'https://api.apify.com/v2'
const APIFY_TOKEN = process.env.APIFY_API_TOKEN!

interface ApifyResult {
  views: number
  likes: number
  comments: number
  error?: string
}

// Run an Apify actor and wait for result
async function runActor(
  actorId: string,
  input: Record<string, unknown>,
  timeoutMs = 60000
): Promise<Record<string, unknown>[]> {
  // Start the actor run
  const startRes = await fetch(
    `${APIFY_BASE}/acts/${actorId}/runs?token=${APIFY_TOKEN}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    }
  )

  if (!startRes.ok) {
    throw new Error(`Failed to start Apify actor: ${startRes.status}`)
  }

  const { data: run } = await startRes.json()
  const runId = run.id

  // Poll for completion
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 3000))

    const statusRes = await fetch(
      `${APIFY_BASE}/actor-runs/${runId}?token=${APIFY_TOKEN}`
    )
    const { data: status } = await statusRes.json()

    if (status.status === 'SUCCEEDED') {
      const itemsRes = await fetch(
        `${APIFY_BASE}/datasets/${status.defaultDatasetId}/items?token=${APIFY_TOKEN}&format=json&limit=5`
      )
      return itemsRes.json()
    }

    if (['FAILED', 'ABORTED', 'TIMED-OUT'].includes(status.status)) {
      throw new Error(`Actor run ${status.status}`)
    }
  }

  throw new Error('Actor timed out')
}

export async function getTikTokViews(videoUrl: string): Promise<ApifyResult> {
  try {
    const items = await runActor('clockworks/free-tiktok-scraper', {
      postURLs: [videoUrl],
      resultsPerPage: 1,
      shouldDownloadVideos: false,
      shouldDownloadCovers: false,
    })

    if (!items.length) throw new Error('No data returned')

    const item = items[0] as Record<string, number>
    return {
      views: item.playCount || 0,
      likes: item.diggCount || 0,
      comments: item.commentCount || 0,
    }
  } catch (error) {
    return { views: 0, likes: 0, comments: 0, error: String(error) }
  }
}

export async function getInstagramViews(postUrl: string): Promise<ApifyResult> {
  try {
    const items = await runActor('apify/instagram-scraper', {
      directUrls: [postUrl],
      resultsType: 'posts',
      resultsLimit: 1,
    })

    if (!items.length) throw new Error('No data returned')

    const item = items[0] as Record<string, number>
    const views = item.videoViewCount || item.likesCount || 0

    return {
      views: Number(views),
      likes: Number(item.likesCount || 0),
      comments: Number(item.commentsCount || 0),
    }
  } catch (error) {
    return { views: 0, likes: 0, comments: 0, error: String(error) }
  }
}

export async function getFacebookViews(postUrl: string): Promise<ApifyResult> {
  try {
    const items = await runActor('apify/facebook-scraper', {
      startUrls: [{ url: postUrl }],
      resultsLimit: 1,
    })

    if (!items.length) throw new Error('No data returned')

    const item = items[0] as Record<string, number>
    return {
      views: Number(item.videoViewCount || 0),
      likes: Number(item.likesCount || 0),
      comments: Number(item.commentsCount || 0),
    }
  } catch (error) {
    return { views: 0, likes: 0, comments: 0, error: String(error) }
  }
}
