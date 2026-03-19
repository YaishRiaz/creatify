-- ============================================================
-- Creatify — Supabase PostgreSQL Schema
-- ============================================================

-- EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- TABLE 1: users
-- ============================================================
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  phone VARCHAR(20),
  role VARCHAR(20) NOT NULL CHECK (role IN ('brand','creator','admin')),
  full_name VARCHAR(255) NOT NULL,
  is_verified BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABLE 2: brand_profiles
-- ============================================================
CREATE TABLE brand_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  company_name VARCHAR(255) NOT NULL,
  website VARCHAR(255),
  logo_url VARCHAR(500),
  industry VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABLE 3: creator_profiles
-- ============================================================
CREATE TABLE creator_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  nic_number VARCHAR(20) UNIQUE,
  platforms JSONB DEFAULT '{}',
  wallet_balance DECIMAL(12,2) DEFAULT 0,
  total_earned DECIMAL(12,2) DEFAULT 0,
  is_suspended BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABLE 4: campaigns
-- ============================================================
CREATE TABLE campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID NOT NULL REFERENCES brand_profiles(id),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  brief TEXT,
  do_list TEXT[],
  dont_list TEXT[],
  hashtags TEXT[],
  budget_total DECIMAL(12,2) NOT NULL,
  budget_remaining DECIMAL(12,2) NOT NULL,
  payout_rate DECIMAL(10,4) NOT NULL,
  per_creator_cap DECIMAL(12,2),
  min_cashout DECIMAL(10,2) DEFAULT 500,
  target_platforms TEXT[] NOT NULL,
  status VARCHAR(30) DEFAULT 'draft' CHECK (
    status IN ('draft','pending_payment','active','paused','completed')
  ),
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABLE 5: campaign_assets
-- ============================================================
CREATE TABLE campaign_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  asset_url VARCHAR(500) NOT NULL,
  asset_type VARCHAR(20) CHECK (asset_type IN ('image','video','document')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABLE 6: tasks
-- ============================================================
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id),
  creator_id UUID NOT NULL REFERENCES creator_profiles(id),
  status VARCHAR(20) DEFAULT 'accepted' CHECK (
    status IN ('accepted','submitted','tracking',
               'flagged','completed','rejected')
  ),
  platform VARCHAR(20) NOT NULL CHECK (
    platform IN ('tiktok','instagram','youtube','facebook')
  ),
  post_url VARCHAR(500),
  post_id VARCHAR(255),
  submitted_at TIMESTAMPTZ,
  accepted_at TIMESTAMPTZ DEFAULT NOW(),
  total_views BIGINT DEFAULT 0,
  total_earned DECIMAL(12,2) DEFAULT 0,
  fraud_score INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(campaign_id, creator_id)
);

-- ============================================================
-- TABLE 7: view_snapshots
-- ============================================================
CREATE TABLE view_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  views_at_snapshot BIGINT NOT NULL,
  delta_views BIGINT NOT NULL,
  earnings_added DECIMAL(12,2) NOT NULL,
  snapshot_taken_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABLE 8: payouts
-- ============================================================
CREATE TABLE payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL REFERENCES creator_profiles(id),
  amount DECIMAL(12,2) NOT NULL,
  status VARCHAR(20) DEFAULT 'pending' CHECK (
    status IN ('pending','processing','completed','failed')
  ),
  bank_name VARCHAR(100),
  account_number VARCHAR(50),
  account_name VARCHAR(255),
  payment_reference VARCHAR(255),
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);
-- ============================================================
-- TABLE 9: escrow_transactions 
-- ============================================================
CREATE TABLE escrow_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id),
  amount DECIMAL(12,2) NOT NULL,
  type VARCHAR(20) CHECK (type IN ('funded','released','refunded')),
  payhere_reference VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
-- ============================================================
-- TABLE 10: notifications
-- ============================================================
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  body TEXT,
  type VARCHAR(50),
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX idx_brand_profiles_user_id ON brand_profiles(user_id);
CREATE INDEX idx_creator_profiles_user_id ON creator_profiles(user_id);
CREATE INDEX idx_campaigns_brand_id ON campaigns(brand_id);
CREATE INDEX idx_campaigns_status ON campaigns(status);
CREATE INDEX idx_tasks_campaign_id ON tasks(campaign_id);
CREATE INDEX idx_tasks_creator_id ON tasks(creator_id);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_view_snapshots_task_id ON view_snapshots(task_id);
CREATE INDEX idx_payouts_creator_id ON payouts(creator_id);
CREATE INDEX idx_escrow_campaign_id 
  ON escrow_transactions(campaign_id);
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_unread
  ON notifications(user_id) WHERE is_read = false;

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE brand_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE creator_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE view_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- RLS POLICIES
-- ============================================================

-- users: can only see and update their own row
CREATE POLICY "users_own_row" ON users
  FOR ALL USING (auth.uid()::text = id::text);

-- brand_profiles: brands see their own only
CREATE POLICY "brand_own_profile" ON brand_profiles
  FOR ALL USING (user_id::text = auth.uid()::text);

-- creator_profiles: creators see their own only
CREATE POLICY "creator_own_profile" ON creator_profiles
  FOR ALL USING (user_id::text = auth.uid()::text);

-- campaigns: brands see their own, everyone sees active ones
CREATE POLICY "brands_own_campaigns" ON campaigns
  FOR ALL USING (
    brand_id IN (
      SELECT id FROM brand_profiles
      WHERE user_id::text = auth.uid()::text
    )
  );
CREATE POLICY "creators_see_active_campaigns" ON campaigns
  FOR SELECT USING (status = 'active');

-- tasks: creators see their own, brands see tasks on their campaigns
CREATE POLICY "creator_own_tasks" ON tasks
  FOR ALL USING (
    creator_id IN (
      SELECT id FROM creator_profiles
      WHERE user_id::text = auth.uid()::text
    )
  );
CREATE POLICY "brand_see_campaign_tasks" ON tasks
  FOR SELECT USING (
    campaign_id IN (
      SELECT id FROM campaigns WHERE brand_id IN (
        SELECT id FROM brand_profiles
        WHERE user_id::text = auth.uid()::text
      )
    )
  );

-- payouts: creators see their own
CREATE POLICY "creator_own_payouts" ON payouts
  FOR ALL USING (
    creator_id IN (
      SELECT id FROM creator_profiles
      WHERE user_id::text = auth.uid()::text
    )
  );

-- notifications: users see their own
CREATE POLICY "own_notifications" ON notifications
  FOR ALL USING (user_id::text = auth.uid()::text);
