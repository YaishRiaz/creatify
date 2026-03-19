export type UserRole = 'brand' | 'creator' | 'admin'

export interface User {
  id: string
  email: string
  phone?: string
  role: UserRole
  full_name: string
  is_verified: boolean
  created_at: string
}

export interface BrandProfile {
  id: string
  user_id: string
  company_name: string
  website?: string
  logo_url?: string
  industry?: string
  created_at: string
}

export interface CreatorProfile {
  id: string
  user_id: string
  nic_number?: string
  platforms: Record<string, string>
  wallet_balance: number
  total_earned: number
  is_suspended: boolean
  created_at: string
}

export interface Campaign {
  id: string
  brand_id: string
  title: string
  description?: string
  brief?: string
  do_list?: string[]
  dont_list?: string[]
  hashtags?: string[]
  budget_total: number
  budget_remaining: number
  payout_rate: number
  per_creator_cap?: number
  min_cashout: number
  target_platforms: string[]
  status: 'draft' | 'pending_payment' | 'active' | 'paused' | 'completed'
  start_date?: string
  end_date?: string
  created_at: string
}

export interface Task {
  id: string
  campaign_id: string
  creator_id: string
  status: 'accepted' | 'submitted' | 'tracking' | 'flagged' | 'completed' | 'rejected'
  platform: 'tiktok' | 'instagram' | 'youtube' | 'facebook'
  post_url?: string
  post_id?: string
  submitted_at?: string
  accepted_at: string
  total_views: number
  total_earned: number
  fraud_score: number
  created_at: string
}

export interface ViewSnapshot {
  id: string
  task_id: string
  views_at_snapshot: number
  delta_views: number
  earnings_added: number
  snapshotted_at: string
}

export interface Payout {
  id: string
  creator_id: string
  amount: number
  status: 'pending' | 'processing' | 'completed' | 'failed'
  bank_name?: string
  account_number?: string
  account_name?: string
  payment_reference?: string
  requested_at: string
  completed_at?: string
}

export interface EscrowTransaction {
  id: string
  campaign_id: string
  amount: number
  type: 'funded' | 'released' | 'refunded'
  payhere_reference?: string
  created_at: string
}

export interface Notification {
  id: string
  user_id: string
  title: string
  message: string
  is_read: boolean
  type?: string
  link?: string
  created_at: string
}

export interface AuthFormData {
  email: string
  password: string
  full_name?: string
  phone?: string
  role?: UserRole
  company_name?: string
  nic_number?: string
}
