import Link from "next/link";
import {
  Zap,
  Wallet,
  Globe,
  ArrowRight,
  TrendingUp,
  ShieldCheck,
  Sliders,
  Users,
  Smartphone,
  DollarSign,
} from "lucide-react";
import Navbar from "@/components/shared/Navbar";
import Footer from "@/components/shared/Footer";

/* ─────────────────────────────────────────────
   SECTION 1 — HERO
───────────────────────────────────────────── */
function Hero() {
  return (
    <section className="relative min-h-screen flex items-center justify-center px-4 overflow-hidden">
      {/* Radial glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 60% 40% at 50% 0%, rgba(108,71,255,0.12) 0%, transparent 70%)",
        }}
      />

      <div className="relative z-10 max-w-4xl mx-auto w-full flex flex-col items-start gap-8 pt-24 pb-20">
        {/* Badge */}
        <div className="flex items-center gap-2 border border-[#6C47FF]/50 text-[#6C47FF] text-sm px-4 py-2 rounded-full">
          <span className="animate-pulse-dot">🇱🇰</span>
          <span>Sri Lanka&apos;s Performance UGC Platform</span>
        </div>

        {/* Headline */}
        <div className="font-heading font-black text-5xl md:text-7xl leading-none tracking-tight text-white">
          <div>Post Content.</div>
          <div className="pl-4 md:pl-8 mt-1">Get Paid Per View.</div>
        </div>

        {/* Subheadline */}
        <p className="text-lg text-zinc-400 max-w-xl leading-relaxed">
          Brands get authentic reach. Creators earn real money.
          No follower minimum. No agency. No waiting.
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Link
            href="/auth/signup?role=brand"
            className="bg-[#6C47FF] text-white px-8 py-4 text-base font-semibold rounded-none hover:bg-[#5538ee] transition-colors duration-200"
          >
            Launch a Campaign
          </Link>
          <Link
            href="/auth/signup?role=creator"
            className="border border-zinc-600 text-white px-8 py-4 text-base font-semibold rounded-none hover:border-white transition-colors duration-200"
          >
            Start Earning
          </Link>
        </div>

        {/* Stat pills */}
        <div className="flex flex-col sm:flex-row gap-3 mt-2">
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
              className="flex items-center gap-2 bg-[#111111] border border-zinc-800 px-4 py-2.5 text-xs text-zinc-400 rounded-lg"
            >
              <span className="text-zinc-500">{icon}</span>
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
   SECTION 3 — HOW IT WORKS
───────────────────────────────────────────── */
function HowItWorks() {
  const brandSteps = [
    {
      n: "01",
      title: "Fund a campaign",
      desc: "Set a total budget, payout rate per 1K views, and an optional per-creator cap.",
    },
    {
      n: "02",
      title: "Set your brief",
      desc: "Define what to post, what to avoid, hashtags, and target platforms.",
    },
    {
      n: "03",
      title: "Watch it run",
      desc: "Creators post, views roll in, and earnings auto-distribute from escrow.",
    },
  ];

  const creatorSteps = [
    {
      n: "01",
      title: "Browse open campaigns",
      desc: "No follower minimum. If you have a public account, you can apply.",
    },
    {
      n: "02",
      title: "Post on your platform",
      desc: "Create content following the brief on TikTok, Instagram, YouTube, or Facebook.",
    },
    {
      n: "03",
      title: "Submit and get paid",
      desc: "Drop your post URL. We track views automatically. Earnings hit your wallet in real time.",
    },
  ];

  return (
    <section id="how-it-works" className="py-24 md:py-32 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="mb-16">
          <p className="text-xs text-[#6C47FF] uppercase tracking-widest font-semibold mb-3">
            How it works
          </p>
          <h2 className="font-heading font-bold text-3xl md:text-5xl text-white leading-tight">
            Two sides. One platform.
          </h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
          {/* Brands column */}
          <div className="bg-[#111111] border border-zinc-800 p-8 md:p-10">
            <p className="text-xs text-zinc-500 uppercase tracking-widest mb-8">
              For Brands
            </p>
            <div className="flex flex-col gap-8">
              {brandSteps.map((step) => (
                <div key={step.n} className="flex gap-5">
                  <span className="font-mono text-xs text-[#6C47FF] font-bold mt-1 shrink-0">
                    {step.n}
                  </span>
                  <div>
                    <p className="font-heading font-semibold text-white mb-1">
                      {step.title}
                    </p>
                    <p className="text-sm text-zinc-500 leading-relaxed">
                      {step.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-10">
              <Link
                href="/auth/signup?role=brand"
                className="inline-flex items-center gap-2 text-sm text-[#6C47FF] hover:text-white transition-colors"
              >
                Launch a campaign <ArrowRight size={14} />
              </Link>
            </div>
          </div>

          {/* Creators column */}
          <div className="bg-[#111111] border border-zinc-800 p-8 md:p-10">
            <p className="text-xs text-zinc-500 uppercase tracking-widest mb-8">
              For Creators
            </p>
            <div className="flex flex-col gap-8">
              {creatorSteps.map((step) => (
                <div key={step.n} className="flex gap-5">
                  <span className="font-mono text-xs text-[#00E5A0] font-bold mt-1 shrink-0">
                    {step.n}
                  </span>
                  <div>
                    <p className="font-heading font-semibold text-white mb-1">
                      {step.title}
                    </p>
                    <p className="text-sm text-zinc-500 leading-relaxed">
                      {step.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-10">
              <Link
                href="/auth/signup?role=creator"
                className="inline-flex items-center gap-2 text-sm text-[#00E5A0] hover:text-white transition-colors"
              >
                Start earning <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────
   SECTION 4 — FOR BRANDS
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
          <h2 className="font-heading font-bold text-3xl md:text-5xl text-white leading-tight max-w-xl">
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
                <p className="font-heading font-semibold text-white mb-2">
                  {f.title}
                </p>
                <p className="text-sm text-zinc-500 leading-relaxed">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-10">
          <Link
            href="/auth/signup?role=brand"
            className="inline-flex items-center gap-2 bg-[#6C47FF] text-white px-7 py-4 text-sm font-semibold rounded-none hover:bg-[#5538ee] transition-colors"
          >
            Launch your first campaign <ArrowRight size={15} />
          </Link>
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────
   SECTION 5 — FOR CREATORS
───────────────────────────────────────────── */
function ForCreators() {
  const features = [
    {
      icon: <Users size={20} />,
      title: "Zero follower minimum",
      desc: "If you have a public social account and a phone, you qualify. Full stop.",
    },
    {
      icon: <DollarSign size={20} />,
      title: "Cash out from LKR 500",
      desc: "No waiting until you hit big numbers. Withdraw once your wallet hits the minimum.",
    },
    {
      icon: <Zap size={20} />,
      title: "Earnings update in real time",
      desc: "Watch your views and balance tick up as your content performs. No monthly surprises.",
    },
    {
      icon: <Smartphone size={20} />,
      title: "Post on your existing accounts",
      desc: "TikTok, Instagram, YouTube, Facebook — no new accounts, no new platforms.",
    },
  ];

  return (
    <section id="for-creators" className="py-24 md:py-32 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="mb-14">
          <p className="text-xs text-[#00E5A0] uppercase tracking-widest font-semibold mb-3">
            For Creators
          </p>
          <h2 className="font-heading font-bold text-3xl md:text-5xl text-white leading-tight max-w-xl">
            Your content is already
            <br />
            worth money.
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {features.map((f) => (
            <div
              key={f.title}
              className="bg-[#111111] border border-zinc-800 rounded-none p-7 flex flex-col gap-4"
            >
              <span className="text-[#00E5A0]">{f.icon}</span>
              <div>
                <p className="font-heading font-semibold text-white mb-2">
                  {f.title}
                </p>
                <p className="text-sm text-zinc-500 leading-relaxed">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-10">
          <Link
            href="/auth/signup?role=creator"
            className="inline-flex items-center gap-2 border border-zinc-600 text-white px-7 py-4 text-sm font-semibold rounded-none hover:border-white transition-colors"
          >
            Create a free account <ArrowRight size={15} />
          </Link>
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────
   SECTION 6 — EARNINGS ILLUSTRATION
───────────────────────────────────────────── */
function EarningsIllustration() {
  return (
    <section className="py-24 md:py-32 px-4 bg-[#0D0D0D]">
      <div className="max-w-4xl mx-auto">
        <div className="mb-12">
          <p className="text-xs text-zinc-500 uppercase tracking-widest font-semibold mb-3">
            The math
          </p>
          <h2 className="font-heading font-bold text-3xl md:text-5xl text-white leading-tight">
            Simple. Transparent.
            <br />
            Yours.
          </h2>
        </div>

        <div className="bg-[#111111] border border-zinc-800 p-8 md:p-12">
          <p className="text-xs text-zinc-600 uppercase tracking-widest mb-8">
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
              <p className="text-xs text-zinc-600">per 1,000 views</p>
            </div>

            <div className="md:px-10 flex flex-col gap-2">
              <p className="text-xs text-zinc-500 uppercase tracking-wider">
                Your video gets
              </p>
              <p className="font-mono text-3xl font-bold text-white">
                150,000
              </p>
              <p className="text-xs text-zinc-600">verified views</p>
            </div>

            <div className="md:pl-10 flex flex-col gap-2">
              <p className="text-xs text-zinc-500 uppercase tracking-wider">
                You earn
              </p>
              <p className="font-mono text-3xl font-bold text-[#00E5A0]">
                LKR 450
              </p>
              <p className="text-xs text-zinc-600">from one post</p>
            </div>
          </div>

          <div className="mt-10 pt-8 border-t border-zinc-800">
            <p className="text-sm text-zinc-500">
              Post on multiple active campaigns simultaneously to multiply
              your earnings. No cap on how many campaigns you can join.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────
   SECTION 7 — FINAL CTA
───────────────────────────────────────────── */
function FinalCTA() {
  return (
    <section className="py-24 md:py-36 px-4 relative overflow-hidden">
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 50% 60% at 50% 100%, rgba(108,71,255,0.10) 0%, transparent 70%)",
        }}
      />
      <div className="relative z-10 max-w-3xl mx-auto text-center flex flex-col items-center gap-8">
        <h2 className="font-heading font-black text-4xl md:text-6xl text-white leading-none tracking-tight">
          Ready to make
          <br />
          content pay?
        </h2>
        <p className="text-zinc-400 text-lg max-w-md leading-relaxed">
          Join hundreds of creators already earning and brands already scaling
          on Creatify.
        </p>
        <div className="flex flex-col sm:flex-row gap-3">
          <Link
            href="/auth/signup?role=brand"
            className="bg-[#6C47FF] text-white px-8 py-4 text-base font-semibold rounded-none hover:bg-[#5538ee] transition-colors"
          >
            I&apos;m a Brand
          </Link>
          <Link
            href="/auth/signup?role=creator"
            className="border border-zinc-600 text-white px-8 py-4 text-base font-semibold rounded-none hover:border-white transition-colors"
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
        <ForBrands />
        <ForCreators />
        <EarningsIllustration />
        <FinalCTA />
      </main>
      <Footer />
    </>
  );
}
