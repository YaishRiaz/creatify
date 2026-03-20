export const runtime = 'edge'
export const dynamic = 'force-dynamic'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-6xl font-black text-white font-syne mb-4">404</h1>
        <p className="text-zinc-400 text-lg mb-8">
          This page doesn&apos;t exist.
        </p>
        <a
          href="/"
          className="bg-[#6C47FF] text-white px-8 py-4 font-semibold hover:bg-[#5538ee] transition-colors"
        >
          Go Home
        </a>
      </div>
    </div>
  )
}
