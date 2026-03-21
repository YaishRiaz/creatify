export const dynamic = 'force-dynamic'

import type { Metadata } from 'next'
import SignupClient from './SignupClient'

export const metadata: Metadata = {
  title: 'Sign Up',
  description: 'Create your free Creatify account. Start earning from your content or launch your first brand campaign today.',
}

export default function SignupPage() {
  return <SignupClient />
}
