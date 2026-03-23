import Navbar from '@/components/shared/Navbar'
import Footer from '@/components/shared/Footer'

export const metadata = {
  title: 'Privacy Policy',
}

const sections = [
  {
    title: 'Information We Collect',
    content:
      'We collect information you provide when creating an account (name, email, phone), social media usernames, and usage data to improve our platform.',
  },
  {
    title: 'How We Use Your Information',
    content:
      'We use your information to operate the platform, process payments, detect fraud, and communicate with you about your account and campaigns.',
  },
  {
    title: 'Data Sharing',
    content:
      'We share creator view data with brands as part of campaign reporting. We never sell your personal information to third parties.',
  },
  {
    title: 'Payment Information',
    content:
      'Bank details provided for cashouts are stored securely and used only for processing your earnings. We never store full card numbers.',
  },
  {
    title: 'Contact Us',
    content: 'For privacy concerns contact us at privacy@creatify.lk',
  },
]

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#0A0A0A]">
      <Navbar />
      <div className="max-w-3xl mx-auto px-6 py-24">
        <h1 className="font-syne text-4xl font-black text-white mb-4">Privacy Policy</h1>
        <p className="text-zinc-500 mb-12">Last updated: March 2025</p>

        {sections.map((section, i) => (
          <div key={i} className="mb-8 pb-8 border-b border-zinc-800 last:border-0">
            <h2 className="font-syne text-xl font-bold text-white mb-3">{section.title}</h2>
            <p className="text-zinc-400 leading-relaxed">{section.content}</p>
          </div>
        ))}
      </div>
      <Footer />
    </div>
  )
}
