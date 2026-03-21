export const dynamic = 'force-dynamic'

import Navbar from '@/components/shared/Navbar'
import Footer from '@/components/shared/Footer'

export const metadata = {
  title: 'Contact',
}

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-[#0A0A0A]">
      <Navbar />
      <div className="max-w-3xl mx-auto px-6 py-24">

        <div className="mb-16">
          <p className="text-xs uppercase tracking-[0.2em] text-zinc-500 mb-4">Contact</p>
          <h1 className="font-syne text-5xl font-black text-white leading-none mb-6">
            Get in Touch
          </h1>
          <p className="text-zinc-400 text-lg">
            We typically respond within 24 hours.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-12">
          {/* General */}
          <div className="bg-[#111111] border border-zinc-800 p-8">
            <p className="text-xs uppercase tracking-[0.2em] text-zinc-500 mb-3">General Support</p>
            <p className="font-syne text-lg font-bold text-white mb-2">support@creatify.lk</p>
            <p className="text-sm text-zinc-400">
              Questions about your account, earnings, or how the platform works.
            </p>
          </div>

          {/* Brands */}
          <div className="bg-[#111111] border border-zinc-800 p-8">
            <p className="text-xs uppercase tracking-[0.2em] text-zinc-500 mb-3">For Brands</p>
            <p className="font-syne text-lg font-bold text-white mb-2">brands@creatify.lk</p>
            <p className="text-sm text-zinc-400">
              Campaign setup, billing, and partnership enquiries.
            </p>
          </div>
        </div>

        {/* Social links */}
        <div className="flex items-center gap-6">
          <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">Find us on</p>
          <div className="flex gap-4">
            {['TikTok', 'Instagram', 'Facebook'].map((platform) => (
              <span key={platform} className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer">
                {platform}
              </span>
            ))}
          </div>
        </div>
      </div>
      <Footer />
    </div>
  )
}
