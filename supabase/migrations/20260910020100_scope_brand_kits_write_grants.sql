-- Defense-in-depth, not a fix for a live hole: "Users can manage own brand kits" (FOR ALL,
-- account_id = get_account_id()) gives anon zero real access regardless of grant breadth (NULL
-- get_account_id() for an unauthenticated caller). anon's full INSERT/SELECT/UPDATE/REFERENCES
-- grant is revoked entirely — there is no real anon access to make "correct," unlike accounts.
--
-- authenticated's INSERT scoped to the exact real insert shape (app/dashboard/brand-kit/
-- actions.ts:78-87): {account_id, name, source_type, source_reference, colors, fonts, logo_url,
-- personality} — everything except id (generated), created_at/updated_at (set_brand_kits_
-- updated_at trigger + column default handle these, never client-set).
--
-- No real UPDATE call site exists anywhere today — same "unbuilt but ALL-policy-intended" shape
-- as templates before its own fix. Scoped to the same content columns as INSERT, minus
-- account_id (no real feature would ever reassign an existing kit's owning account) and the
-- timestamps: {name, source_type, source_reference, colors, fonts, logo_url, personality}.
--
-- SELECT/REFERENCES left as the full column list for authenticated — unlike accounts, no column
-- here is sensitive the way stripe_*/password_hash are, so only the write privileges (where
-- "what should be settable" is the real security question) are scoped.
REVOKE SELECT, INSERT, UPDATE, REFERENCES ON public.brand_kits FROM anon;

REVOKE INSERT, UPDATE ON public.brand_kits FROM authenticated;
GRANT INSERT (
  account_id, name, source_type, source_reference, colors, fonts, logo_url, personality
) ON public.brand_kits TO authenticated;
GRANT UPDATE (
  name, source_type, source_reference, colors, fonts, logo_url, personality
) ON public.brand_kits TO authenticated;
