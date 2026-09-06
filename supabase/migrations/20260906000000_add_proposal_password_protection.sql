-- Optional per-proposal password/PIN gate for the public /p/[slug] link. Nullable — every
-- existing proposal keeps today's "anyone with the slug can view" behavior unchanged.
ALTER TABLE public.proposals ADD COLUMN IF NOT EXISTS password_hash TEXT;

-- authenticated's table-level UPDATE grant was already narrowed to an explicit column list by
-- 20260904100000_lock_proposal_signature_columns.sql — a new column needs its own additive GRANT
-- to be writable at all by a normal session (RLS's "Users can manage own proposals" already
-- scopes this to the caller's own account).
GRANT UPDATE (password_hash) ON public.proposals TO authenticated;

-- anon's SELECT grant on `proposals` has never been column-scoped — confirmed it's currently
-- table-wide across every column, with only the row-level USING(status='PUBLISHED') policy
-- restricting which ROWS are visible. That was harmless while every column was meant to be
-- publicly readable on a published proposal. password_hash is the first column that must never
-- reach an anonymous caller: a direct PostgREST call with the public anon key
-- (e.g. `.../proposals?select=password_hash&slug=eq.<slug>`) would otherwise hand out the hash
-- for unlimited offline brute-forcing, defeating the rate-limited /unlock route entirely. This
-- column list is every column that exists on `proposals` today except password_hash.
REVOKE SELECT ON public.proposals FROM anon;
GRANT SELECT (
  id, account_id, brand_kit_id, template_id, status, content, slug, created_at, updated_at,
  last_viewed_at, accepted_at, accepted_by_name, submitted_by, submitted_at, approved_by,
  approved_at, signature
) ON public.proposals TO anon;

-- Only an owner or approver may set/clear a proposal's password — same authorization tier as
-- publishing (enforce_proposal_publish_role), since gating/ungating access is as sensitive a
-- decision as making the link live in the first place.
CREATE OR REPLACE FUNCTION public.enforce_proposal_password_role()
RETURNS TRIGGER AS $$
DECLARE
  caller_role TEXT;
BEGIN
  IF NEW.password_hash IS DISTINCT FROM OLD.password_hash THEN
    SELECT role INTO caller_role FROM public.users WHERE id = auth.uid() AND account_id = OLD.account_id;
    IF caller_role IS DISTINCT FROM 'owner' AND caller_role IS DISTINCT FROM 'approver' THEN
      RAISE EXCEPTION 'Only an owner or approver can change a proposal''s password protection';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

REVOKE ALL ON FUNCTION public.enforce_proposal_password_role() FROM PUBLIC;

DROP TRIGGER IF EXISTS enforce_proposal_password_role ON public.proposals;
CREATE TRIGGER enforce_proposal_password_role
BEFORE UPDATE ON public.proposals
FOR EACH ROW EXECUTE FUNCTION public.enforce_proposal_password_role();
