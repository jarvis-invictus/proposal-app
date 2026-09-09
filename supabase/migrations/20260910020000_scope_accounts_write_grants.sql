-- Defense-in-depth, not a fix for a live hole: both "Users can read own account" and "Users can
-- update own account" gate on id = get_account_id(), which is always NULL for anon (no session ->
-- no matching users row), so anon has zero real access to accounts regardless of grant breadth.
-- authenticated's SELECT/INSERT/REFERENCES were still table-wide (19 columns) even though its
-- UPDATE was already scoped to 12 columns by the Sep 4 lockdown migration.
--
-- Column list determined by grepping every real `.from('accounts').select(...)` call in the app
-- (settings/page.tsx's full settings load, billing/checkout/route.ts, accountShellInfo.ts,
-- proposalLimits.ts, etc.) — every column is genuinely read via the authenticated client
-- EXCEPT `created_at`, including stripe_customer_id/stripe_subscription_id/stripe_price_id/
-- billing_status (shown in the Plan & billing settings tab and read directly by the checkout
-- route) — these are NOT excluded, unlike the initial assumption before checking.
--
-- No real INSERT usage exists anywhere (new accounts come from on_auth_user_created, SECURITY
-- DEFINER, bypassing grants entirely) and no INSERT policy exists for either role — kept as a
-- non-empty, scoped grant rather than fully revoked, matching the same all-but-created_at column
-- list, since this table (unlike brand_kits/domains/invitations) is being *tightened*, not
-- eliminated, per instruction.
REVOKE SELECT, INSERT, REFERENCES ON public.accounts FROM anon, authenticated;
GRANT SELECT (
  billing_status, business_address, category, currency, default_validity_days, extra_domain_slots,
  gstin, id, name, onboarding_completed_at, payment_link, payment_qr_url, payment_upi_id, plan_tier,
  stripe_customer_id, stripe_price_id, stripe_subscription_id, subdomain
) ON public.accounts TO anon, authenticated;
GRANT INSERT (
  billing_status, business_address, category, currency, default_validity_days, extra_domain_slots,
  gstin, id, name, onboarding_completed_at, payment_link, payment_qr_url, payment_upi_id, plan_tier,
  stripe_customer_id, stripe_price_id, stripe_subscription_id, subdomain
) ON public.accounts TO anon, authenticated;
GRANT REFERENCES (
  billing_status, business_address, category, currency, default_validity_days, extra_domain_slots,
  gstin, id, name, onboarding_completed_at, payment_link, payment_qr_url, payment_upi_id, plan_tier,
  stripe_customer_id, stripe_price_id, stripe_subscription_id, subdomain
) ON public.accounts TO anon, authenticated;

-- authenticated's existing 12-column UPDATE scope (Sep 4 fix) is left untouched. anon's UPDATE
-- had no scoping at all — tightened to match authenticated's real, already-correct scope, not
-- revoked, since anon here is being tightened rather than eliminated.
REVOKE UPDATE ON public.accounts FROM anon;
GRANT UPDATE (
  name, business_address, gstin, default_validity_days,
  payment_upi_id, payment_link, payment_qr_url,
  subdomain, extra_domain_slots, currency, category, onboarding_completed_at
) ON public.accounts TO anon;
