-- Extends the existing publish-role trigger function in place (CREATE OR REPLACE — the trigger
-- object bound to it doesn't need to change) to also allow PUBLISHED -> ARCHIVED under the same
-- owner/approver check already enforced for DRAFT -> PUBLISHED. ARCHIVED already exists as an enum
-- value but nothing in the app has ever set it — this is what "Unpublish" in the dashboard now uses.
--
-- Decision made here, flagged in the implementation plan: a SIGNED proposal (accepted_at set)
-- cannot be unpublished. The app already treats a signed proposal as an immutable legal record
-- everywhere else (content is locked once accepted; accepted_at/signature are writable only by
-- the service-role client) — unpublishing wouldn't erase that audit trail, it would just take
-- down the client's only copy of the document they legally agreed to. If that's ever the wrong
-- call, the one `IF` block below raising the "signed and cannot be unpublished" exception is the
-- single thing to remove.
CREATE OR REPLACE FUNCTION public.enforce_proposal_publish_role()
RETURNS TRIGGER AS $$
DECLARE
  caller_role TEXT;
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status
     AND (NEW.status = 'PUBLISHED' OR (OLD.status = 'PUBLISHED' AND NEW.status = 'ARCHIVED')) THEN
    SELECT role INTO caller_role FROM public.users WHERE id = auth.uid() AND account_id = OLD.account_id;
    IF caller_role IS DISTINCT FROM 'owner' AND caller_role IS DISTINCT FROM 'approver' THEN
      RAISE EXCEPTION 'Only an owner or approver can change this proposal''s publish status';
    END IF;
  END IF;

  IF OLD.status = 'PUBLISHED' AND NEW.status = 'ARCHIVED' AND OLD.accepted_at IS NOT NULL THEN
    RAISE EXCEPTION 'This proposal has been signed and cannot be unpublished.';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';
