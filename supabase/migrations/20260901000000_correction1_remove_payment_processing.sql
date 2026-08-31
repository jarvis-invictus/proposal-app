-- Correction 1: Marg's payment feature is DISPLAY ONLY (see ui_kits/app/Settings.jsx's
-- PaymentTab and ClientPage.jsx's Payment section) — it shows a UPI ID, payment link and QR
-- code on the proposal, and never processes, tracks or confirms a real payment. PR #7 built a
-- real Stripe/Razorpay/Skydo checkout flow against a different (wrong) spec. Removing all of it.

-- Provider-selection + checkout/webhook state
ALTER TABLE accounts DROP COLUMN IF EXISTS payment_provider;
ALTER TABLE accounts DROP COLUMN IF EXISTS provider_customer_id;
ALTER TABLE accounts DROP COLUMN IF EXISTS billing_country;

ALTER TABLE proposals DROP COLUMN IF EXISTS deposit_amount;
ALTER TABLE proposals DROP COLUMN IF EXISTS deposit_currency;
ALTER TABLE proposals DROP COLUMN IF EXISTS deposit_status;
ALTER TABLE proposals DROP COLUMN IF EXISTS deposit_provider_order_id;
ALTER TABLE proposals DROP COLUMN IF EXISTS deposit_provider_payment_id;

-- The old ad-hoc, unstructured payment_info/default_payment_info jsonb stubs (never had a
-- writer UI) are replaced by the three named fields the real spec actually calls for.
ALTER TABLE proposals DROP COLUMN IF EXISTS payment_info;
ALTER TABLE accounts DROP COLUMN IF EXISTS default_payment_info;

ALTER TABLE accounts
  ADD COLUMN IF NOT EXISTS payment_upi_id TEXT,
  ADD COLUMN IF NOT EXISTS payment_link TEXT,
  ADD COLUMN IF NOT EXISTS payment_qr_url TEXT;

-- Billing country no longer exists as a concept, so the signup trigger goes back to just
-- creating the account + admin user.
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
    VALUES (NEW.id, new_account_id, 'admin');

    RETURN NEW;
END;
$function$;

-- Storage for the uploaded QR code (and, later, manually-uploaded brand logos — Correction 4).
-- Path convention: <account_id>/<file>, enforced by the policies below.
INSERT INTO storage.buckets (id, name, public)
VALUES ('public-assets', 'public-assets', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Account members can upload their own assets" ON storage.objects;
CREATE POLICY "Account members can upload their own assets" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'public-assets' AND (storage.foldername(name))[1] = get_account_id()::text);

DROP POLICY IF EXISTS "Account members can update their own assets" ON storage.objects;
CREATE POLICY "Account members can update their own assets" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'public-assets' AND (storage.foldername(name))[1] = get_account_id()::text);

DROP POLICY IF EXISTS "Anyone can view public assets" ON storage.objects;
CREATE POLICY "Anyone can view public assets" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'public-assets');
