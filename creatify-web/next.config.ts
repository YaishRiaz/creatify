import type { NextConfig } from 'next'
import { setupDevPlatform } from '@cloudflare/next-on-pages/next-dev'

if (process.env.NODE_ENV === 'development') {
  setupDevPlatform().catch(() => {
    // Miniflare (workerd) may not be available in all dev environments; safe to ignore
  })
}

const nextConfig: NextConfig = {
  experimental: {
    optimizePackageImports: ['lucide-react'],
  },
}

export default nextConfig
