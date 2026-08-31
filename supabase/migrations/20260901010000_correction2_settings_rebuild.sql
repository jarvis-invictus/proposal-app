-- Correction 2: Settings' real 5-tab spec (Profile & business, Payment details, Team,
-- Custom domain, Plan & billing) — from ui_kits/app/Settings.jsx. "Notifications" and "API
-- keys" are removed as Settings tabs: Notifications is its own full screen in the real spec
-- (Notifications.jsx, queued for Correction 6) and API keys doesn't exist anywhere in the
-- 16-screen spec at all — it was invented in an earlier PR, not part of this product.

-- API keys never belonged here — remove entirely, per the correction's own rule against
-- keeping features that aren't in the real spec.
DROP TABLE IF EXISTS api_keys;

-- Profile & business (ProfileTab)
ALTER TABLE accounts
  ADD COLUMN IF NOT EXISTS business_address TEXT,
  ADD COLUMN IF NOT EXISTS gstin TEXT,
  ADD COLUMN IF NOT EXISTS default_validity_days INT NOT NULL DEFAULT 30;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Team & roles: the existing `role` column was free text defaulting to 'admin' and unused by
-- any RLS policy or app logic. Real spec has three roles with real meaning (Drafters cannot
-- publish; Approvers release; Owners manage billing).
UPDATE users SET role = 'owner' WHERE role = 'admin';
ALTER TABLE users ALTER COLUMN role SET DEFAULT 'owner';
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('owner', 'approver', 'drafter'));

CREATE OR REPLACE FUNCTION public.on_auth_user_created()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
    new_account_id UUID;
BEGIN
    INSERT INTO public.accounts (name)
    VALUES (COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email, 'My Account'))
    RETURNING id INTO new_account_id;

    INSERT INTO public.users (id, account_id, role)
    VALUES (NEW.id, new_account_id, 'owner');

    RETURN NEW;
END;
$function$;

-- Pending invitations (no `users` row exists for them yet — that only happens on signup).
CREATE TABLE IF NOT EXISTS invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('owner', 'approver', 'drafter')),
  invited_by UUID REFERENCES users(id),
  invited_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  accepted_at TIMESTAMPTZ
);
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Account members can manage own invitations" ON invitations
  FOR ALL USING (account_id = get_account_id());

-- Approval chain: Drafters submit, Owners/Approvers release. Enforced in the proposals PATCH
-- route (a Drafter's PUBLISHED request is only honored as PENDING_APPROVAL).
ALTER TYPE proposal_status_enum ADD VALUE IF NOT EXISTS 'PENDING_APPROVAL';

ALTER TABLE proposals
  ADD COLUMN IF NOT EXISTS submitted_by UUID REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;

-- Plan tier + custom domains. Slot count = plan default + extra_domain_slots add-ons.
ALTER TABLE accounts
  ADD COLUMN IF NOT EXISTS plan_tier TEXT NOT NULL DEFAULT 'free' CHECK (plan_tier IN ('free', 'pay_per_proposal', 'agency')),
  ADD COLUMN IF NOT EXISTS extra_domain_slots INT NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS domains (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  domain_name TEXT NOT NULL UNIQUE,
  cname_verified BOOLEAN NOT NULL DEFAULT false,
  ssl_issued BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE domains ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Account members can manage own domains" ON domains
  FOR ALL USING (account_id = get_account_id());
