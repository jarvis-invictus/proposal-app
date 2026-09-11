-- Recycle bin / soft-delete for proposals. deleteProposal today is a real, permanent, unguarded
-- hard DELETE — no status/role/accepted_at check anywhere. This adds a nullable deleted_at
-- timestamp (matching the accepted_at/invitations.accepted_at nullable-timestamp convention
-- already used twice in this schema) rather than extending proposal_status_enum — ARCHIVED
-- already carries a distinct, real meaning (unpublished-but-restorable) with its own trigger
-- logic keyed on status transitions, and the dashboard's own list query has no status filter at
-- all today, so a new enum value would require finding and updating every unfiltered read site to
-- exclude it. A column is additive: existing status stays untouched and meaningful, and every
-- read site just needs `WHERE deleted_at IS NULL` added.
ALTER TABLE public.proposals ADD COLUMN deleted_at TIMESTAMPTZ;

-- authenticated needs to be able to set/clear this via the existing scoped UPDATE grant. Real
-- current column list confirmed via information_schema.column_privileges, both local dev and
-- production (identical): approved_at, approved_by, content, password_hash, status,
-- submitted_at, submitted_by, updated_at — queried fresh rather than reusing an earlier-session
-- assumption, which turned out to be stale (missing password_hash, added later by
-- 20260906110000_add_proposal_password_protection.sql).
REVOKE UPDATE ON public.proposals FROM authenticated;
GRANT UPDATE (
  approved_at, approved_by, content, password_hash, status, submitted_at, submitted_by, updated_at, deleted_at
) ON public.proposals TO authenticated;

-- Mirrors enforce_proposal_publish_role's exact shape and reasoning (20260906010000_
-- allow_unpublish_to_archived.sql) — a signed proposal is a legal record (ESIGN Act) and must not
-- be destroyable — but applied to the one genuinely destructive action (a real DELETE) instead of
-- a status transition. Soft-delete (setting deleted_at) is deliberately NOT blocked here — it's
-- reversible and only hides the row from the active view, same as unpublish already does for
-- PUBLISHED status; only the irreversible action is locked.
CREATE OR REPLACE FUNCTION public.enforce_proposal_delete_signed_lock()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF OLD.accepted_at IS NOT NULL THEN
    RAISE EXCEPTION 'This proposal has been signed and cannot be permanently deleted.';
  END IF;
  RETURN OLD;
END;
$$;

CREATE TRIGGER trg_enforce_proposal_delete_signed_lock
  BEFORE DELETE ON public.proposals
  FOR EACH ROW EXECUTE FUNCTION public.enforce_proposal_delete_signed_lock();
