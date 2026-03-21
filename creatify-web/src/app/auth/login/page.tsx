export const dynamic = 'force-dynamic'

import type { Metadata } from 'next'
import LoginClient from './LoginClient'

export const metadata: Metadata = {
  title: 'Login',
  description: 'Sign in to your Creatify account.',
}

export default function LoginPage() {
  return <LoginClient />
}
