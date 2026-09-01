-- §3.1a of docs/MVP_LAUNCH_PLAN.md — Marg's own billing via Stripe.
-- billing_status defaults to 'free', not 'trialing' — there's no trial period in this product's
-- model today, and 'free' mirrors the existing plan_tier default rather than implying a trial
-- that doesn't exist. The full vocabulary (free/trialing/active/past_due/canceled) leaves room
-- for a real trial to be added later without another migration.
ALTER TABLE accounts
  ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_price_id TEXT,
  ADD COLUMN IF NOT EXISTS billing_status TEXT NOT NULL DEFAULT 'free'
    CHECK (billing_status IN ('free', 'trialing', 'active', 'past_due', 'canceled'));
