const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY!
const YOUTUBE_BASE = 'https://www.googleapis.com/youtube/v3'

export function extractYouTubeVideoId(url: string): string | null {
  const patterns = [
    /youtube\.com\/shorts\/([\w-]+)/,
    /youtube\.com\/watch\?v=([\w-]+)/,
    /youtu\.be\/([\w-]+)/,
  ]

  for (const pattern of patterns) {
    const match = url.match(pattern)
    if (match) return match[1]
  }

  return null
}

export async function getYouTubeViews(videoId: string): Promise<{
  views: number
  likes: number
  comments: number
  error?: string
}> {
  try {
    const res = await fetch(
      `${YOUTUBE_BASE}/videos?part=statistics&id=${videoId}&key=${YOUTUBE_API_KEY}`,
      { next: { revalidate: 0 } } // never cache
    )

    if (!res.ok) throw new Error(`YouTube API error: ${res.status}`)

    const data = await res.json()

    if (!data.items?.length) {
      throw new Error('Video not found or is private')
    }

    const stats = data.items[0].statistics
    return {
      views: parseInt(stats.viewCount || '0'),
      likes: parseInt(stats.likeCount || '0'),
      comments: parseInt(stats.commentCount || '0'),
    }
  } catch (error) {
    return { views: 0, likes: 0, comments: 0, error: String(error) }
  }
}
