export const dynamic = 'force-dynamic'

import Link from 'next/link'
import Navbar from '@/components/shared/Navbar'
import Footer from '@/components/shared/Footer'

export const metadata = {
  title: 'About',
  description: "Learn about Creatify — Sri Lanka's performance UGC advertising platform.",
}

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-[#0A0A0A]">
      <Navbar />
      <div className="max-w-4xl mx-auto px-6 py-24">

        {/* Header */}
        <div className="mb-16">
          <p className="text-xs uppercase tracking-[0.2em] text-zinc-500 mb-4">About Creatify</p>
          <h1 className="font-syne text-5xl font-black text-white leading-none mb-6">
            Built in Sri Lanka.<br />
            Built for everyone.
          </h1>
          <p className="text-zinc-400 text-lg max-w-2xl">
            Creatify is a performance-based UGC advertising platform that connects brands with
            everyday creators across Sri Lanka.
          </p>
        </div>

        {/* Mission */}
        <div className="bg-[#111111] border border-zinc-800 p-10 mb-8">
          <h2 className="font-syne text-2xl font-black text-white mb-4">Our Mission</h2>
          <p className="text-zinc-300 text-lg leading-relaxed">
            We believe anyone with a smartphone and a social media account should be able to earn
            from their content — regardless of how many followers they have. At the same time,
            brands should only pay for results that actually happened.
          </p>
          <p className="text-zinc-300 text-lg leading-relaxed mt-4">
            Creatify is the platform that makes both possible simultaneously.
          </p>
        </div>

        {/* How it's different */}
        <div className="bg-[#111111] border border-zinc-800 p-10 mb-8">
          <h2 className="font-syne text-2xl font-black text-white mb-4">What Makes Us Different</h2>
          <div className="space-y-4">
            {[
              'No follower minimum — 200 followers earns the same rate as 200,000',
              'Performance only — brands pay per view, not per post',
              'Real-time wallet — watch earnings update every 6 hours',
              'Built for Sri Lanka — LKR payments, local banks, local brands',
            ].map((point, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-[#6C47FF] mt-2 flex-shrink-0" />
                <p className="text-zinc-300">{point}</p>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="flex gap-4">
          <Link
            href="/auth/signup?role=creator"
            className="bg-[#6C47FF] text-white px-8 py-4 font-semibold hover:bg-[#5538ee] transition-colors rounded-none text-sm uppercase tracking-wide"
          >
            Start Earning
          </Link>
          <Link
            href="/auth/signup?role=brand"
            className="border border-zinc-600 text-white px-8 py-4 font-semibold hover:border-white hover:bg-white/5 transition-colors rounded-none text-sm uppercase tracking-wide"
          >
            Launch a Campaign
          </Link>
        </div>
      </div>
      <Footer />
    </div>
  )
}
