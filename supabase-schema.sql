-- ============================================================
-- SORA SERVER - SUPABASE DATABASE SCHEMA
-- Run this in Supabase SQL Editor: Dashboard → SQL Editor → New Query
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- PROFILES TABLE
-- Stores public player data linked to Supabase Auth users
-- ============================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username        VARCHAR(32) NOT NULL UNIQUE,
  minecraft_username VARCHAR(16) NOT NULL UNIQUE,
  email           TEXT NOT NULL UNIQUE,
  avatar_url      TEXT,
  balance         BIGINT NOT NULL DEFAULT 0,        -- In-game currency balance (coins)
  survival_rank   TEXT DEFAULT 'Member',            -- Current rank on Survival Economy
  soracitu_rank   TEXT DEFAULT 'Warga',             -- Current rank on Sora City
  total_playtime  INTEGER DEFAULT 0,                -- In minutes
  is_banned       BOOLEAN DEFAULT FALSE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- RANKS TABLE
-- Available ranks for purchase per server
-- ============================================================
CREATE TABLE IF NOT EXISTS public.ranks (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  server      TEXT NOT NULL CHECK (server IN ('survival', 'soracitu')),
  name        TEXT NOT NULL,
  display_name TEXT NOT NULL,
  price       BIGINT NOT NULL,                      -- Price in IDR (Rupiah)
  color       TEXT NOT NULL DEFAULT '#ffffff',      -- Hex color for display
  perks       JSONB DEFAULT '[]',                   -- Array of perk strings
  badge_icon  TEXT,                                 -- Icon emoji or URL
  is_active   BOOLEAN DEFAULT TRUE,
  sort_order  INTEGER DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TRANSACTIONS TABLE
-- All rank purchases and topup transactions
-- ============================================================
CREATE TABLE IF NOT EXISTS public.transactions (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type            TEXT NOT NULL CHECK (type IN ('rank_purchase', 'topup')),
  rank_id         UUID REFERENCES public.ranks(id),
  server          TEXT NOT NULL CHECK (server IN ('survival', 'soracitu')),
  amount          BIGINT NOT NULL,                  -- Amount in IDR
  status          TEXT NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'refunded')),
  payment_method  TEXT,                             -- e.g. 'bca', 'dana', 'ovo', 'gopay', 'qris'
  payment_proof   TEXT,                             -- URL to uploaded payment proof image
  admin_notes     TEXT,
  processed_by    UUID REFERENCES public.profiles(id),
  processed_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- REPORTS TABLE
-- Player reports for rule violations
-- ============================================================
CREATE TABLE IF NOT EXISTS public.reports (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reporter_id         UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reported_username   TEXT NOT NULL,
  server              TEXT NOT NULL CHECK (server IN ('survival', 'soracitu', 'both')),
  reason              TEXT NOT NULL,
  evidence            TEXT,                         -- Description or URL of evidence
  evidence_url        TEXT,                         -- Screenshot/video URL
  status              TEXT NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending', 'investigating', 'resolved', 'rejected')),
  admin_response      TEXT,
  resolved_by         UUID REFERENCES public.profiles(id),
  resolved_at         TIMESTAMPTZ,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- SERVER STATS TABLE
-- Live-ish server statistics (updated by plugin or manually)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.server_stats (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  server          TEXT NOT NULL UNIQUE CHECK (server IN ('survival', 'soracitu')),
  online_players  INTEGER DEFAULT 0,
  max_players     INTEGER DEFAULT 100,
  is_online       BOOLEAN DEFAULT TRUE,
  last_updated    TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- SEED DATA - Default Ranks (Survival Economy)
-- ============================================================
INSERT INTO public.ranks (server, name, display_name, price, color, perks, badge_icon, sort_order) VALUES
('survival', 'vip', 'VIP', 25000, '#55FF55',
  '["Kit VIP tiap login", "Akses /sethome x3", "Warna nama hijau", "Priority join saat full", "Akses /fly di spawn"]',
  '⭐', 1),
('survival', 'vip_plus', 'VIP+', 50000, '#55FFFF',
  '["Semua benefit VIP", "Kit VIP+ tiap login", "Akses /sethome x5", "Akses /hat", "Particle effects", "/nick command"]',
  '💎', 2),
('survival', 'mvp', 'MVP', 100000, '#FF5555',
  '["Semua benefit VIP+", "Kit MVP tiap login", "Akses /sethome x10", "Akses /fly everywhere", "Custom join message", "Prefix MVP merah"]',
  '🔥', 3),
('survival', 'mvp_plus', 'MVP+', 175000, '#FF55FF',
  '["Semua benefit MVP", "Kit MVP+ tiap login", "Unlimited /sethome", "Akses semua fitur", "Custom prefix", "Discord role khusus", "Early access update"]',
  '👑', 4);

-- ============================================================
-- SEED DATA - Default Ranks (Sora City)
-- ============================================================
INSERT INTO public.ranks (server, name, display_name, price, color, perks, badge_icon, sort_order) VALUES
('soracitu', 'pendatang', 'Pendatang', 20000, '#AAAAAA',
  '["Akses area residensial", "Bisa sewa apartemen", "Akses transportasi umum", "Chat warna putih"]',
  '🏠', 1),
('soracitu', 'warga', 'Warga', 45000, '#55FF55',
  '["Semua benefit Pendatang", "Bisa buka usaha kecil", "Akses zona komersial", "Nama berwarna hijau", "Voting rights"]',
  '🏪', 2),
('soracitu', 'pengusaha', 'Pengusaha', 100000, '#FFAA00',
  '["Semua benefit Warga", "Bisa buka usaha besar", "Akses zona industri", "Nama berwarna emas", "Priority plots", "Tax reduction 20%"]',
  '💰', 3),
('soracitu', 'konglomerat', 'Konglomerat', 200000, '#FF55FF',
  '["Semua benefit Pengusaha", "Akses zona elit", "Custom building permit", "Nama berwarna ungu", "Pengaruh ekonomi kota", "Discord role khusus", "Akses rapat wali kota"]',
  '🏦', 4);

-- ============================================================
-- SEED DATA - Server Stats
-- ============================================================
INSERT INTO public.server_stats (server, online_players, max_players, is_online) VALUES
('survival', 0, 100, TRUE),
('soracitu', 0, 50, TRUE);

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ranks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.server_stats ENABLE ROW LEVEL SECURITY;

-- Profiles: users can read all, only update their own
CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles
  FOR SELECT USING (TRUE);

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- Ranks: anyone can read
CREATE POLICY "Ranks are viewable by everyone" ON public.ranks
  FOR SELECT USING (TRUE);

-- Transactions: users see only their own
CREATE POLICY "Users can view their own transactions" ON public.transactions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own transactions" ON public.transactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Reports: users see only their own
CREATE POLICY "Users can view their own reports" ON public.reports
  FOR SELECT USING (auth.uid() = reporter_id);

CREATE POLICY "Authenticated users can submit reports" ON public.reports
  FOR INSERT WITH CHECK (auth.uid() = reporter_id);

-- Server stats: anyone can read
CREATE POLICY "Server stats are viewable by everyone" ON public.server_stats
  FOR SELECT USING (TRUE);

-- ============================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reports_updated_at BEFORE UPDATE ON public.reports
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
