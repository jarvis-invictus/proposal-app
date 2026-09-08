-- Defense-in-depth, not a fix for a live hole: anon's INSERT and UPDATE grants on `proposals`
-- were still table-wide (every column, including password_hash) even after
-- 20260906000000_add_proposal_password_protection.sql scoped down the SELECT grant. Confirmed
-- via pg_policies that no RLS policy currently grants anon any INSERT/UPDATE path at all —
-- "Users can manage own proposals" (cmd ALL) resolves account_id = get_account_id(), and
-- get_account_id() returns NULL for an unauthenticated caller, so that qual is never true for
-- anon; the only anon-targeting policy, "Public can read published proposals", is SELECT-only.
-- So this GRANT breadth is inert today. Still closing it while it's a one-line change rather
-- than leaving a latent gap that only stays safe as long as no future RLS policy change
-- accidentally opens a write path for anon — GRANT and RLS are independent layers, and each
-- should be correct on its own.
--
-- Same column list as the SELECT grant in 20260906000000_add_proposal_password_protection.sql —
-- every column that exists on `proposals` today except password_hash.
REVOKE INSERT, UPDATE ON public.proposals FROM anon;
GRANT INSERT (
  id, account_id, brand_kit_id, template_id, status, content, slug, created_at, updated_at,
  last_viewed_at, accepted_at, accepted_by_name, submitted_by, submitted_at, approved_by,
  approved_at, signature
) ON public.proposals TO anon;
GRANT UPDATE (
  id, account_id, brand_kit_id, template_id, status, content, slug, created_at, updated_at,
  last_viewed_at, accepted_at, accepted_by_name, submitted_by, submitted_at, approved_by,
  approved_at, signature
) ON public.proposals TO anon;

-- Same reasoning, one more privilege type: anon's column-level REFERENCES grant (lets a future
-- table define a foreign key against a `proposals` column — it grants no ability to read or
-- write data) still included password_hash too. Not a data-exposure path either way, but there's
-- no reason to leave any password_hash-inclusive grant sitting on anon when closing it costs
-- nothing. Same column list again.
REVOKE REFERENCES ON public.proposals FROM anon;
GRANT REFERENCES (
  id, account_id, brand_kit_id, template_id, status, content, slug, created_at, updated_at,
  last_viewed_at, accepted_at, accepted_by_name, submitted_by, submitted_at, approved_by,
  approved_at, signature
) ON public.proposals TO anon;
