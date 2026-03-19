import { Syne } from 'next/font/google'

const syne = Syne({ subsets: ['latin'], weight: ['700', '800'] })

export default function BrandAnalyticsPage() {
  return (
    <div>
      <h1 className={`${syne.className} text-3xl font-extrabold text-white mb-2`}>Analytics</h1>
      <p className="text-zinc-400 text-sm">Detailed analytics — coming soon</p>
    </div>
  )
}
