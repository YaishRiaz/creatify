import Link from "next/link";
import { Syne, DM_Sans } from "next/font/google";
import {
  Zap,
  Wallet,
  Globe,
  ArrowRight,
  TrendingUp,
  ShieldCheck,
  Sliders,
  Users,
  FileText,
  Search,
  Video,
} from "lucide-react";
import Navbar from "@/components/shared/Navbar";
import Footer from "@/components/shared/Footer";

const syne = Syne({ subsets: ["latin"], weight: ["700", "800"] });
const dmSans = DM_Sans({ subsets: ["latin"] });

/* ─────────────────────────────────────────────
   SECTION 1 — HERO
───────────────────────────────────────────── */
function Hero() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Radial glow — exception: complex gradient */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 60% 40% at 50% 0%, rgba(108,71,255,0.12) 0%, transparent 70%)",
        }}
      />

      <div className="relative z-10 max-w-4xl mx-auto w-full flex flex-col items-start gap-8 pt-24 pb-20 px-6">
        {/* Badge */}
        <div className="flex items-center gap-2 border border-[#6C47FF]/50 text-[#6C47FF] text-sm px-4 py-2 rounded-full">
          <span className="animate-pulse-dot">🇱🇰</span>
          <span>Sri Lanka&apos;s Performance UGC Platform</span>
        </div>

        {/* Headline */}
        <div
          className={`${syne.className} font-extrabold text-5xl md:text-7xl leading-none tracking-tight text-white`}
        >
          <div>Post Content.</div>
          <div className="pl-4 md:pl-8 mt-1">Get Paid Per View.</div>
        </div>

        {/* Subheadline */}
        <p className={`${dmSans.className} text-lg text-zinc-300 max-w-xl leading-relaxed`}>
          Brands get authentic reach. Creators earn real money. No follower
          minimum. No agency. No waiting.
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
          <Link
            href="/auth/signup?role=brand"
            className="bg-[#6C47FF] text-white px-8 py-4 text-base font-semibold rounded-none hover:bg-[#5538ee] transition-colors duration-200 min-h-[52px] w-full sm:w-auto flex items-center justify-center"
          >
            Launch a Campaign
          </Link>
          <Link
            href="/auth/signup?role=creator"
            className="border border-zinc-600 text-white bg-transparent px-8 py-4 text-base font-semibold rounded-none hover:border-white transition-colors duration-200 min-h-[52px] w-full sm:w-auto flex items-center justify-center"
          >
            Start Earning
          </Link>
        </div>

        {/* Stat pills */}
        <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
          {[
            { icon: <Zap size={14} />, text: "Real-time earnings" },
            { icon: <Wallet size={14} />, text: "LKR 500 min cashout" },
            {
              icon: <Globe size={14} />,
              text: "TikTok · Instagram · YouTube · Facebook",
            },
          ].map(({ icon, text }) => (
            <div
              key={text}
              className="flex items-center gap-2 px-4 py-2 border border-zinc-800 bg-[#111111] text-sm text-zinc-400 whitespace-nowrap"
            >
              <span className="text-zinc-500 shrink-0">{icon}</span>
              {text}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────
   SECTION 2 — LIVE NUMBERS BAR
───────────────────────────────────────────── */
function NumbersBar() {
  const stats = [
    { value: "124", label: "Active Campaigns" },
    { value: "3,800+", label: "Creators Earning" },
    { value: "48M+", label: "Views Tracked" },
  ];

  return (
    <section className="bg-[#111111] border-y border-zinc-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 sm:gap-0 sm:divide-x sm:divide-zinc-800">
          {stats.map(({ value, label }) => (
            <div
              key={label}
              className="flex flex-col items-center gap-1 sm:px-8"
            >
              <span className="font-mono text-4xl font-bold text-[#00E5A0] tabular-nums">
                {value}
              </span>
              <span className="text-sm text-zinc-500 uppercase tracking-widest">
                {label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────
   SECTION 3 — HOW IT WORKS: BRANDS
───────────────────────────────────────────── */
function HowItWorks() {
  const brandSteps = [
    {
      n: "01",
      icon: <FileText size={18} />,
      title: "Set Up Your Campaign",
      desc: "Write your brief, set your budget, define your payout rate per 1,000 views. Takes 5 minutes.",
    },
    {
      n: "02",
      icon: <Users size={18} />,
      title: "Creators Do the Work",
      desc: "Hundreds of real people post authentic content about your brand on TikTok, Instagram, YouTube and Facebook.",
    },
    {
      n: "03",
      icon: <TrendingUp size={18} />,
      title: "Pay Per View Delivered",
      desc: "Your budget releases automatically as views come in. Campaign ends when budget is spent or deadline hits.",
    },
  ];

  return (
    <section id="how-it-works" className="py-24 md:py-32 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="mb-12">
          <p className="text-xs text-[#6C47FF] uppercase tracking-widest font-semibold mb-3">
            For Brands
          </p>
          <h2
            className={`${syne.className} font-bold text-3xl md:text-5xl text-white leading-tight`}
          >
            Launch a campaign in minutes.
          </h2>
        </div>

        <div className="bg-[#111111] border border-zinc-800 p-8 md:p-12">
          <div className="flex flex-col gap-8">
            {brandSteps.map((step) => (
              <div key={step.n} className="flex gap-5">
                <div className="shrink-0 flex flex-col items-center gap-1.5 pt-0.5">
                  <span className="text-[#6C47FF]">{step.icon}</span>
                  <span className="font-mono text-[10px] text-zinc-700 font-bold">
                    {step.n}
                  </span>
                </div>
                <div>
                  <p
                    className={`${syne.className} font-bold text-white mb-1`}
                  >
                    {step.title}
                  </p>
                  <p className="text-sm text-zinc-400 leading-relaxed">
                    {step.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-10 pt-8 border-t border-zinc-800">
            <Link
              href="/auth/signup?role=brand"
              className="inline-flex items-center gap-2 text-sm text-[#6C47FF] hover:text-white transition-colors min-h-[44px]"
            >
              Launch a campaign <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────
   SECTION 4 — HOW IT WORKS: CREATORS
───────────────────────────────────────────── */
function HowItWorksCreators() {
  const creatorSteps = [
    {
      n: "01",
      icon: <Search size={18} />,
      title: "Browse Live Campaigns",
      desc: "See what brands are paying right now. Filter by platform and payout rate.",
    },
    {
      n: "02",
      icon: <Video size={18} />,
      title: "Post Your Content",
      desc: "Follow the brief, post on your own account. Your style, your voice — that's the point.",
    },
    {
      n: "03",
      icon: <Wallet size={18} />,
      title: "Watch Your Wallet Fill Up",
      desc: "Submit your post URL. We track views every 6 hours and your wallet updates in real time.",
    },
  ];

  return (
    <section id="for-creators" className="py-24 md:py-32 px-4 bg-[#0D0D0D]">
      <div className="max-w-6xl mx-auto">
        <div className="mb-12">
          <p className="text-xs text-[#00E5A0] uppercase tracking-widest font-semibold mb-3">
            For Creators
          </p>
          <h2
            className={`${syne.className} font-bold text-3xl md:text-4xl text-white leading-tight`}
          >
            Post once. Earn while you sleep.
          </h2>
          <p className={`${dmSans.className} mt-4 text-zinc-400 max-w-xl leading-relaxed`}>
            No pitch emails. No negotiations. Browse tasks, post, submit your
            URL, get paid.
          </p>
        </div>

        <div className="bg-[#111111] border border-[#00E5A0]/20 p-8 md:p-12">
          <div className="flex flex-col gap-8">
            {creatorSteps.map((step) => (
              <div key={step.n} className="flex gap-5">
                <div className="shrink-0 flex flex-col items-center gap-1.5 pt-0.5">
                  <span className="text-[#00E5A0]">{step.icon}</span>
                  <span className="font-mono text-[10px] text-zinc-700 font-bold">
                    {step.n}
                  </span>
                </div>
                <div>
                  <p
                    className={`${syne.className} font-bold text-white mb-1`}
                  >
                    {step.title}
                  </p>
                  <p className="text-sm text-zinc-400 leading-relaxed">
                    {step.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-10 pt-8 border-t border-zinc-800">
            <Link
              href="/auth/signup?role=creator"
              className="inline-flex items-center gap-2 text-sm text-[#00E5A0] hover:text-white transition-colors min-h-[44px]"
            >
              Start earning <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────
   SECTION 5 — THE DIFFERENCE
───────────────────────────────────────────── */
function TheDifference() {
  return (
    <section className="relative py-28 md:py-40 px-4 overflow-hidden">
      {/* Radial glow — exception: complex gradient */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 60% 50% at 50% 50%, rgba(108,71,255,0.11) 0%, transparent 70%)",
        }}
      />
      <div className="relative z-10 max-w-3xl mx-auto flex flex-col items-center gap-8 text-center">
        <p
          className={`${syne.className} font-extrabold text-3xl md:text-5xl text-white leading-tight`}
        >
          &ldquo;A student with 300 followers earns the exact same rate as
          someone with 300,000.&rdquo;
        </p>
        <p className={`${dmSans.className} text-zinc-400 text-lg max-w-lg leading-relaxed`}>
          Views are views. We measure what actually happened, not who you are.
        </p>
        <Link
          href="/auth/signup"
          className="bg-[#6C47FF] text-white px-8 py-4 text-base font-semibold rounded-none hover:bg-[#5538ee] transition-colors duration-200 min-h-[44px] flex items-center"
        >
          Create Free Account
        </Link>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────
   SECTION 6 — FOR BRANDS
───────────────────────────────────────────── */
function ForBrands() {
  const features = [
    {
      icon: <TrendingUp size={20} />,
      title: "Pay only for real views",
      desc: "Your budget moves only when views are verified. No impression fraud, no guesswork.",
    },
    {
      icon: <Sliders size={20} />,
      title: "Full control over spend",
      desc: "Set payout rate per 1K views, per-creator caps, and platform targets. You define the ceiling.",
    },
    {
      icon: <ShieldCheck size={20} />,
      title: "Fraud detection built in",
      desc: "Every submission is scored. Suspicious view spikes get flagged before your budget touches them.",
    },
    {
      icon: <Users size={20} />,
      title: "Scale with real creators",
      desc: "Dozens of micro-creators driving authentic reach beats one influencer deal every time.",
    },
  ];

  return (
    <section id="for-brands" className="py-24 md:py-32 px-4 bg-[#0D0D0D]">
      <div className="max-w-6xl mx-auto">
        <div className="mb-14">
          <p className="text-xs text-[#6C47FF] uppercase tracking-widest font-semibold mb-3">
            For Brands
          </p>
          <h2
            className={`${syne.className} font-bold text-3xl md:text-5xl text-white leading-tight max-w-xl`}
          >
            Performance advertising,
            <br />
            finally honest.
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {features.map((f) => (
            <div
              key={f.title}
              className="bg-[#111111] border border-zinc-800 rounded-lg p-7 flex flex-col gap-4"
            >
              <span className="text-[#6C47FF]">{f.icon}</span>
              <div>
                <p className={`${syne.className} font-bold text-white mb-2`}>
                  {f.title}
                </p>
                <p className="text-sm text-zinc-400 leading-relaxed">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-10">
          <Link
            href="/auth/signup?role=brand"
            className="inline-flex items-center gap-2 bg-[#6C47FF] text-white px-7 py-4 text-sm font-semibold rounded-none hover:bg-[#5538ee] transition-colors min-h-[44px]"
          >
            Launch your first campaign <ArrowRight size={15} />
          </Link>
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────
   SECTION 7 — FEATURE GRID
───────────────────────────────────────────── */
function FeatureGrid() {
  const cards = [
    {
      icon: <Users size={22} />,
      title: "Zero Follower Minimum",
      body: "We removed the gate. 200 followers or 200,000 — the rate per view is identical. Quality content wins.",
    },
    {
      icon: <Zap size={22} />,
      title: "Real-Time Wallet",
      body: "Every 6 hours your view count is checked and your earnings update. Watch your balance grow live.",
    },
    {
      icon: <Globe size={22} />,
      title: "All Major Platforms",
      body: "TikTok, Instagram Reels, YouTube Shorts, Facebook — one platform, all your channels.",
    },
    {
      icon: <ShieldCheck size={22} />,
      title: "Protected Earnings",
      body: "Campaign budgets are held in escrow from day one. Your earnings are locked in before you even post.",
    },
  ];

  return (
    <section className="py-24 md:py-32 px-4 bg-[#0A0A0A]">
      <div className="max-w-6xl mx-auto">
        <div className="mb-14">
          <p className="text-xs text-[#6C47FF] uppercase tracking-widest font-semibold mb-3">
            Why Creatify
          </p>
          <h2
            className={`${syne.className} font-bold text-3xl md:text-4xl text-white leading-tight`}
          >
            Built different.
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {cards.map((card) => (
            <div
              key={card.title}
              className="bg-[#111111] border border-zinc-800 p-8 flex flex-col gap-5 hover:border-zinc-600 transition-colors duration-200"
            >
              <span className="text-[#6C47FF]">{card.icon}</span>
              <div>
                <p className={`${syne.className} font-bold text-white mb-2`}>
                  {card.title}
                </p>
                <p className="text-sm text-zinc-400 leading-relaxed">
                  {card.body}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────
   SECTION 8 — DUAL CTA STRIP
───────────────────────────────────────────── */
function DualCTAStrip() {
  return (
    <section className="border-y border-zinc-800">
      <div className="flex flex-col md:flex-row">
        {/* Left — Brands */}
        <div className="flex-1 bg-[#111111] md:border-r border-zinc-800 px-10 py-16 md:py-20 flex flex-col gap-6">
          <p className="text-xs text-[#6C47FF] uppercase tracking-widest font-semibold">
            For Brands
          </p>
          <h3
            className={`${syne.className} font-bold text-2xl md:text-3xl text-white leading-tight`}
          >
            Real reach. Zero waste.
          </h3>
          <p className="text-sm text-zinc-400 leading-relaxed max-w-sm">
            Your budget only moves when views are delivered. Not when someone
            promises they will be.
          </p>
          <div>
            <Link
              href="/auth/signup?role=brand"
              className="inline-flex items-center bg-[#6C47FF] text-white px-7 py-3.5 text-sm font-semibold rounded-none hover:bg-[#5538ee] transition-colors duration-200 min-h-[44px]"
            >
              Launch a Campaign
            </Link>
          </div>
        </div>

        {/* Right — Creators */}
        <div className="flex-1 bg-[#0A0A0A] px-10 py-16 md:py-20 flex flex-col gap-6">
          <p className="text-xs text-[#00E5A0] uppercase tracking-widest font-semibold">
            For Creators
          </p>
          <h3
            className={`${syne.className} font-bold text-2xl md:text-3xl text-white leading-tight`}
          >
            Your phone is a paycheck.
          </h3>
          <p className="text-sm text-zinc-400 leading-relaxed max-w-sm">
            Post what you already post. Just make sure a brand is behind it.
            Cash out from LKR 500.
          </p>
          <div>
            <Link
              href="/auth/signup?role=creator"
              className="inline-flex items-center border border-[#00E5A0] text-[#00E5A0] px-7 py-3.5 text-sm font-semibold rounded-none hover:bg-[#00E5A0] hover:text-black transition-all duration-200 min-h-[44px]"
            >
              Start Earning Free
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────
   SECTION 9 — EARNINGS ILLUSTRATION
───────────────────────────────────────────── */
function EarningsIllustration() {
  return (
    <section className="py-24 md:py-32 px-4 bg-[#0D0D0D]">
      <div className="max-w-4xl mx-auto">
        <div className="mb-12">
          <p className="text-xs text-zinc-500 uppercase tracking-widest font-semibold mb-3">
            The math
          </p>
          <h2
            className={`${syne.className} font-bold text-3xl md:text-5xl text-white leading-tight`}
          >
            Simple. Transparent.
            <br />
            Yours.
          </h2>
        </div>

        <div className="bg-[#111111] border border-zinc-800 p-8 md:p-12">
          <p className="text-xs text-zinc-500 uppercase tracking-widest mb-8">
            Example campaign
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-0 md:divide-x md:divide-zinc-800">
            <div className="md:pr-10 flex flex-col gap-2">
              <p className="text-xs text-zinc-500 uppercase tracking-wider">
                Payout rate
              </p>
              <p className="font-mono text-3xl font-bold text-white">
                LKR 3.00
              </p>
              <p className="text-xs text-zinc-500">per 1,000 views</p>
            </div>

            <div className="md:px-10 flex flex-col gap-2">
              <p className="text-xs text-zinc-500 uppercase tracking-wider">
                Your video gets
              </p>
              <p className="font-mono text-3xl font-bold text-white">
                150,000
              </p>
              <p className="text-xs text-zinc-500">verified views</p>
            </div>

            <div className="md:pl-10 flex flex-col gap-2">
              <p className="text-xs text-zinc-500 uppercase tracking-wider">
                You earn
              </p>
              <p className="font-mono text-3xl font-bold text-[#00E5A0]">
                LKR 450
              </p>
              <p className="text-xs text-zinc-500">from one post</p>
            </div>
          </div>

          <div className="mt-10 pt-8 border-t border-zinc-800">
            <p className="text-sm text-zinc-400">
              Post on multiple active campaigns simultaneously to multiply your
              earnings. No cap on how many campaigns you can join.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────
   SECTION 10 — FINAL CTA
───────────────────────────────────────────── */
function FinalCTA() {
  return (
    <section className="py-24 md:py-36 px-4 relative overflow-hidden">
      {/* Radial glow — exception: complex gradient */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 50% 60% at 50% 100%, rgba(108,71,255,0.10) 0%, transparent 70%)",
        }}
      />
      <div className="relative z-10 max-w-3xl mx-auto text-center flex flex-col items-center gap-8">
        <h2
          className={`${syne.className} font-extrabold text-4xl md:text-6xl text-white leading-none tracking-tight`}
        >
          Ready to make
          <br />
          content pay?
        </h2>
        <p className={`${dmSans.className} text-zinc-400 text-lg max-w-md leading-relaxed`}>
          Join hundreds of creators already earning and brands already scaling
          on Creatify.
        </p>
        <div className="flex flex-col sm:flex-row gap-3">
          <Link
            href="/auth/signup?role=brand"
            className="bg-[#6C47FF] text-white px-8 py-4 text-base font-semibold rounded-none hover:bg-[#5538ee] transition-colors min-h-[44px] flex items-center justify-center"
          >
            I&apos;m a Brand
          </Link>
          <Link
            href="/auth/signup?role=creator"
            className="border border-zinc-600 text-white px-8 py-4 text-base font-semibold rounded-none hover:border-white transition-colors min-h-[44px] flex items-center justify-center"
          >
            I&apos;m a Creator
          </Link>
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────
   PAGE
───────────────────────────────────────────── */
export default function HomePage() {
  return (
    <>
      <Navbar />
      <main className="flex-1">
        <Hero />
        <NumbersBar />
        <HowItWorks />
        <HowItWorksCreators />
        <TheDifference />
        <ForBrands />
        <FeatureGrid />
        <DualCTAStrip />
        <EarningsIllustration />
        <FinalCTA />
      </main>
      <Footer />
    </>
  );
}
