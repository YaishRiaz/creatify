export const dynamic = 'force-dynamic'

import type { Metadata } from "next";
import "./globals.css";
import { ToastProvider } from "@/components/shared/Toast";

export const metadata: Metadata = {
  title: {
    default: 'Creatify — Post Content. Get Paid Per View.',
    template: '%s | Creatify',
  },
  description: "Sri Lanka's #1 performance UGC platform. Brands get authentic reach. Creators earn real money per view. No follower minimum. TikTok, Instagram, YouTube, Facebook.",
  keywords: [
    'UGC platform Sri Lanka',
    'earn money social media Sri Lanka',
    'influencer marketing Sri Lanka',
    'brand campaigns Sri Lanka',
    'TikTok earn money',
    'Instagram earn money Sri Lanka',
    'content creator earnings',
    'creatify',
    'creatify.lk',
  ],
  authors: [{ name: 'Creatify', url: 'https://creatify.lk' }],
  creator: 'Creatify',
  publisher: 'Creatify',
  metadataBase: new URL('https://creatify.lk'),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://creatify.lk',
    siteName: 'Creatify',
    title: 'Creatify — Post Content. Get Paid Per View.',
    description: "Sri Lanka's #1 performance UGC platform. Brands get authentic reach. Creators earn real money per view.",
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Creatify — Post Content. Get Paid Per View.',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Creatify — Post Content. Get Paid Per View.',
    description: "Sri Lanka's #1 performance UGC platform.",
    images: ['/og-image.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  icons: {
    icon: '/logo.svg',
    apple: '/logo.svg',
  },
  manifest: '/site.webmanifest',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <head>
        <link rel="icon" href="/logo.svg" type="image/svg+xml" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;1,9..40,400&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-full flex flex-col bg-[#0A0A0A] text-white">
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
