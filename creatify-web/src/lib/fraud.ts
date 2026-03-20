interface FraudInput {
  deltaViews: number
  deltaLikes: number
  deltaComments: number
  previousDeltas: number[]
  platform: string
}

interface FraudResult {
  score: number
  reasons: string[]
  flagged: boolean
}

export function calculateFraudScore(input: FraudInput): FraudResult {
  let score = 0
  const reasons: string[] = []

  // Check 1: Near-zero engagement on high views
  if (input.deltaViews > 1000) {
    const engagementRate =
      (input.deltaLikes + input.deltaComments) / input.deltaViews

    if (engagementRate < 0.001) {
      score += 40
      reasons.push('Near-zero engagement on high view count')
    } else if (engagementRate < 0.005) {
      score += 20
      reasons.push('Below-average engagement ratio')
    }
  }

  // Check 2: Velocity spike vs historical average
  if (input.previousDeltas.length >= 2) {
    const avg =
      input.previousDeltas.reduce((a, b) => a + b, 0) /
      input.previousDeltas.length

    if (avg > 0) {
      const spikeFactor = input.deltaViews / avg
      if (spikeFactor > 20) {
        score += 35
        reasons.push('Extreme velocity spike (20x normal)')
      } else if (spikeFactor > 10) {
        score += 20
        reasons.push('High velocity spike (10x normal)')
      } else if (spikeFactor > 5) {
        score += 10
        reasons.push('Moderate velocity spike (5x normal)')
      }
    }
  }

  // Check 3: Suspiciously round numbers
  if (input.deltaViews > 5000) {
    if (input.deltaViews % 10000 === 0) {
      score += 10
      reasons.push('Suspiciously round view count (10k multiple)')
    } else if (input.deltaViews % 1000 === 0) {
      score += 5
    }
  }

  score = Math.min(score, 100)

  return {
    score,
    reasons,
    flagged: score >= 70,
  }
}
