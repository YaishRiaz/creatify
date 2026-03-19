import Link from "next/link";

export default function Footer() {
  return (
    <footer className="bg-[#0A0A0A] border-t border-zinc-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="flex flex-col md:flex-row justify-between gap-10">
          {/* Left — logo + tagline */}
          <div className="flex flex-col gap-3">
            <span className="font-heading font-bold text-lg text-[#6C47FF] tracking-tight">
              Creatify
            </span>
            <p className="text-sm text-zinc-500 max-w-[220px] leading-relaxed">
              Real content. Real views. Real money.
            </p>
          </div>

          {/* Right — links */}
          <div className="flex flex-col gap-3">
            {["About", "Privacy", "Terms", "Contact"].map((item) => (
              <Link
                key={item}
                href={`/${item.toLowerCase()}`}
                className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors w-fit"
              >
                {item}
              </Link>
            ))}
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-12 pt-6 border-t border-zinc-900">
          <p className="text-xs text-zinc-600">
            © 2025 Creatify · Built in Sri Lanka 🇱🇰
          </p>
        </div>
      </div>
    </footer>
  );
}
