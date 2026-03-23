import Navbar from '@/components/shared/Navbar'
import Footer from '@/components/shared/Footer'

export const metadata = {
  title: 'Terms of Service',
}

const sections = [
  {
    title: '1. Acceptance of Terms',
    content:
      'By creating an account or using Creatify, you agree to these Terms of Service. If you do not agree, please do not use the platform.',
  },
  {
    title: '2. Creator Responsibilities',
    content: null,
    list: [
      'Must maintain a public account for the duration of any active campaign',
      'Must post authentic, original content — no reposts or recycled material',
      'Must follow the campaign brief provided by the brand',
      'No purchased views, likes, or engagement of any kind',
    ],
  },
  {
    title: '3. Brand Responsibilities',
    content: null,
    list: [
      'Must fund campaigns upfront before creators can participate',
      'Must provide accurate, lawful campaign briefs',
      'Must respect the intellectual property rights of creator content',
    ],
  },
  {
    title: '4. Payments',
    content:
      'Creator earnings are calculated per 1,000 verified views at the rate set by the brand. Minimum cashout is LKR 500. Payouts are processed within 1–3 business days. Creatify charges a 15% platform fee on all creator earnings.',
  },
  {
    title: '5. Fraud Policy',
    content:
      'Any creator found to have purchased views or engaged in fraudulent activity will be immediately suspended and forfeit all pending earnings. Brands found to be operating fraudulent campaigns will be removed without refund.',
  },
  {
    title: '6. Contact',
    content: 'For legal inquiries contact us at legal@creatify.lk',
  },
]

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[#0A0A0A]">
      <Navbar />
      <div className="max-w-3xl mx-auto px-6 py-24">
        <h1 className="font-syne text-4xl font-black text-white mb-4">Terms of Service</h1>
        <p className="text-zinc-500 mb-12">Last updated: March 2025</p>

        {sections.map((section, i) => (
          <div key={i} className="mb-8 pb-8 border-b border-zinc-800 last:border-0">
            <h2 className="font-syne text-xl font-bold text-white mb-3">{section.title}</h2>
            {section.content && (
              <p className="text-zinc-400 leading-relaxed">{section.content}</p>
            )}
            {section.list && (
              <ul className="space-y-2">
                {section.list.map((item, j) => (
                  <li key={j} className="flex items-start gap-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#6C47FF] mt-2 flex-shrink-0" />
                    <p className="text-zinc-400">{item}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
      <Footer />
    </div>
  )
}
