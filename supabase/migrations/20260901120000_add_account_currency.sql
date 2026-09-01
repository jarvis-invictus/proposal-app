-- Milestone 4: SaaS billing & localization. Accounts pick a display currency for their
-- proposals; the actual dollar amounts stored in proposals.content stay currency-agnostic
-- numbers (as they always have been) — this column only controls which symbol/format is
-- used to display them, not a conversion rate.
ALTER TABLE accounts
  ADD COLUMN IF NOT EXISTS currency TEXT NOT NULL DEFAULT 'USD' CHECK (currency IN ('USD', 'EUR', 'INR'));
