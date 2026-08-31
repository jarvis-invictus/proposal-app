-- Payment provider selection, per account, chosen once by billing country at signup
-- (India -> razorpay, else -> skydo). Skydo's own customer/reference id shape isn't known
-- yet, so provider_customer_id is deliberately generic rather than provider-specific.
ALTER TABLE accounts
  ADD COLUMN IF NOT EXISTS billing_country TEXT,
  ADD COLUMN IF NOT EXISTS payment_provider TEXT CHECK (payment_provider IN ('razorpay', 'skydo')),
  ADD COLUMN IF NOT EXISTS provider_customer_id TEXT;

-- Deposit collection + accept/sign state on a proposal.
ALTER TABLE proposals
  ADD COLUMN IF NOT EXISTS deposit_amount NUMERIC,
  ADD COLUMN IF NOT EXISTS deposit_currency TEXT,
  ADD COLUMN IF NOT EXISTS deposit_status TEXT NOT NULL DEFAULT 'unpaid' CHECK (deposit_status IN ('unpaid', 'paid')),
  ADD COLUMN IF NOT EXISTS deposit_provider_order_id TEXT,
  ADD COLUMN IF NOT EXISTS deposit_provider_payment_id TEXT,
  ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS accepted_by_name TEXT;

-- Settings -> API keys tab. No such table existed before this batch.
CREATE TABLE IF NOT EXISTS api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  key_prefix TEXT NOT NULL,
  key_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  revoked_at TIMESTAMPTZ
);

ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own api keys" ON api_keys
  FOR ALL USING (account_id = get_account_id());

-- Capture billing_country at signup and derive payment_provider from it.
CREATE OR REPLACE FUNCTION public.on_auth_user_created()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
    new_account_id UUID;
    country TEXT;
BEGIN
    country := NEW.raw_user_meta_data->>'billing_country';

    INSERT INTO public.accounts (name, billing_country, payment_provider)
    VALUES (
      COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email, 'My Account'),
      country,
      CASE WHEN country = 'IN' THEN 'razorpay' ELSE 'skydo' END
    )
    RETURNING id INTO new_account_id;

    INSERT INTO public.users (id, account_id, role)
    VALUES (NEW.id, new_account_id, 'admin');

    RETURN NEW;
END;
$function$;
