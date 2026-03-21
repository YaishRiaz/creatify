"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Menu, X } from "lucide-react";
import { useUser } from "@/hooks/useUser";
import { createClient } from "@supabase/supabase-js";

const navLinks = [
  { label: "How it works", href: "#how-it-works" },
  { label: "For Brands", href: "#for-brands" },
  { label: "For Creators", href: "#for-creators" },
];

function getDashboardRoute(role?: string) {
  if (role === "brand") return "/brand/dashboard";
  if (role === "creator") return "/creator/dashboard";
  if (role === "admin") return "/admin/dashboard";
  return "/";
}

export default function Navbar() {
  const router = useRouter();
  const { user, loading } = useUser();
  const [mounted, setMounted] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const handleSignOut = async () => {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    await supabase.auth.signOut();
    router.push("/");
  };

  const displayName = user?.full_name || user?.email || "";
  const truncatedName =
    displayName.length > 20 ? displayName.slice(0, 20) + "…" : displayName;

  // Auth buttons — only rendered after client mounts to avoid SSR Supabase calls
  const authButtons = !mounted ? (
    <div className="flex items-center gap-3">
      <Link
        href="/auth/login"
        className="text-sm text-zinc-300 border border-zinc-700 px-4 py-2 hover:border-zinc-400 hover:text-white transition-all duration-200"
      >
        Login
      </Link>
      <Link
        href="/auth/signup"
        className="text-sm bg-[#6C47FF] text-white px-4 py-2 hover:bg-[#5538ee] transition-colors duration-200"
      >
        Sign Up
      </Link>
    </div>
  ) : loading ? (
    <div className="w-24 h-9 bg-zinc-800 animate-pulse rounded" />
  ) : user ? (
    <div className="flex items-center gap-3">
      <span className="text-sm text-zinc-400 max-w-[160px] truncate">
        {truncatedName}
      </span>
      <Link
        href={getDashboardRoute(user.role)}
        className="text-sm text-zinc-300 border border-zinc-700 px-4 py-2 hover:border-zinc-400 hover:text-white transition-all duration-200"
      >
        Dashboard
      </Link>
      <button
        onClick={handleSignOut}
        className="text-sm bg-zinc-800 text-zinc-300 px-4 py-2 hover:bg-zinc-700 hover:text-white transition-colors duration-200"
      >
        Sign Out
      </button>
    </div>
  ) : (
    <div className="flex items-center gap-3">
      <Link
        href="/auth/login"
        className="text-sm text-zinc-300 border border-zinc-700 px-4 py-2 hover:border-zinc-400 hover:text-white transition-all duration-200"
      >
        Login
      </Link>
      <Link
        href="/auth/signup"
        className="text-sm bg-[#6C47FF] text-white px-4 py-2 hover:bg-[#5538ee] transition-colors duration-200"
      >
        Sign Up
      </Link>
    </div>
  );

  // Mobile auth buttons
  const mobileAuthButtons = !mounted ? (
    <>
      <Link
        href="/auth/login"
        className="text-sm text-center text-zinc-300 border border-zinc-700 px-4 py-3 hover:border-zinc-400 transition-all"
      >
        Login
      </Link>
      <Link
        href="/auth/signup"
        className="text-sm text-center bg-[#6C47FF] text-white px-4 py-3 hover:bg-[#5538ee] transition-colors"
      >
        Sign Up
      </Link>
    </>
  ) : loading ? (
    <div className="w-full h-10 bg-zinc-800 animate-pulse rounded" />
  ) : user ? (
    <>
      <span className="text-sm text-zinc-400 truncate">{truncatedName}</span>
      <Link
        href={getDashboardRoute(user.role)}
        onClick={() => setMobileOpen(false)}
        className="text-sm text-center text-zinc-300 border border-zinc-700 px-4 py-3 hover:border-zinc-400 transition-all"
      >
        Dashboard
      </Link>
      <button
        onClick={() => { setMobileOpen(false); handleSignOut(); }}
        className="text-sm text-center bg-zinc-800 text-zinc-300 px-4 py-3 hover:bg-zinc-700 transition-colors"
      >
        Sign Out
      </button>
    </>
  ) : (
    <>
      <Link
        href="/auth/login"
        onClick={() => setMobileOpen(false)}
        className="text-sm text-center text-zinc-300 border border-zinc-700 px-4 py-3 hover:border-zinc-400 transition-all"
      >
        Login
      </Link>
      <Link
        href="/auth/signup"
        onClick={() => setMobileOpen(false)}
        className="text-sm text-center bg-[#6C47FF] text-white px-4 py-3 hover:bg-[#5538ee] transition-colors"
      >
        Sign Up
      </Link>
    </>
  );

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "backdrop-blur-md bg-[#0A0A0A]/85 border-b border-zinc-800"
          : "bg-transparent"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Wordmark */}
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 relative flex-shrink-0">
              <Image
                src="/logo.svg"
                alt="Creatify"
                width={32}
                height={32}
                className="object-contain"
                priority
              />
            </div>
            <span className="font-syne font-black text-[#6C47FF] text-xl tracking-tight">
              Creatify
            </span>
          </Link>

          {/* Center nav — desktop */}
          <nav className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className="text-sm text-zinc-400 hover:text-white transition-colors duration-200"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Right actions — desktop */}
          <div className="hidden md:flex items-center gap-3">
            {authButtons}
          </div>

          {/* Hamburger — mobile */}
          <button
            onClick={() => setMobileOpen((v) => !v)}
            className="md:hidden text-zinc-400 hover:text-white transition-colors"
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      <div
        className={`md:hidden overflow-hidden transition-all duration-300 ease-in-out ${
          mobileOpen ? "max-h-[420px] opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <div className="bg-[#0D0D0D] border-t border-zinc-800 px-6 py-7 flex flex-col gap-6">
          {navLinks.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              onClick={() => setMobileOpen(false)}
              className="text-base text-zinc-300 hover:text-white transition-colors"
            >
              {link.label}
            </Link>
          ))}
          <div className="flex flex-col gap-3 pt-4 border-t border-zinc-800">
            {mobileAuthButtons}
          </div>
        </div>
      </div>
    </header>
  );
}
