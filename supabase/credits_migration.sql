-- PubMoi — crédits & abonnements (exécuter dans Supabase SQL Editor)

ALTER TABLE users ADD COLUMN IF NOT EXISTS credits INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS plan TEXT DEFAULT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS credits_reset_at TIMESTAMPTZ;

-- Étendre les plans autorisés (si contrainte existante)
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_plan_check;
ALTER TABLE users
  ADD CONSTRAINT users_plan_check
  CHECK (plan IS NULL OR plan IN ('starter', 'pro', 'business'));

-- Retirer l'ancien plan gratuit
UPDATE users SET plan = NULL WHERE plan = 'free';

CREATE TABLE IF NOT EXISTS credit_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  reason TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS credit_transactions_user_id_idx
  ON credit_transactions(user_id);

CREATE INDEX IF NOT EXISTS credit_transactions_created_at_idx
  ON credit_transactions(created_at DESC);

ALTER TABLE credit_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own credit_transactions" ON credit_transactions;
CREATE POLICY "Users read own credit_transactions" ON credit_transactions
  FOR SELECT USING (auth.uid() = user_id);
