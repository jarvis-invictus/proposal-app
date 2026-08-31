-- Correction 3: the real onboarding wizard's Step 1 asks what kind of work the account does
-- (agency/dev studio/design/freelance/other) so templates can eventually be recommended to match.
ALTER TABLE accounts
  ADD COLUMN IF NOT EXISTS category TEXT CHECK (category IN ('agency', 'dev', 'design', 'freelance', 'other'));
