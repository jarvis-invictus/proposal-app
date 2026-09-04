-- Phase 1 of the 2026-09-04 audit's master fix plan: close three privilege-escalation paths
-- that RLS's row-level ("does this row belong to my account") scoping never restricted at the
-- column/transition level. All three are exploitable today via a direct PostgREST call with the
-- caller's own session — no app code involved — because app-layer checks (changeMemberRole's
-- owner check, the publish route's role branch) only guard the Next.js path, not the database
-- itself.
--
-- RLS's USING/WITH CHECK clauses can't compare a row's OLD and NEW state in one expression, so
-- the two conditional (caller-role-dependent) rules below use BEFORE UPDATE triggers instead —
-- the standard Postgres pattern for "some callers may change this column, others may not." The
-- accounts billing-column rule is a static, caller-role-independent restriction, so a column-level
-- REVOKE is enough and needs no trigger.

-- 1. accounts.plan_tier / stripe_* — no authenticated caller may write these directly; only the
--    Stripe webhook (using the service-role client, which this REVOKE does not touch) may.
--    switchPlan() already checks role === 'owner' in app code, but that's a Next.js-layer check
--    only — this closes the same door at the database.
--
--    Supabase's default project setup grants UPDATE on accounts to `authenticated` at the
--    TABLE level (GRANT UPDATE ON accounts TO authenticated, no column list) — a column-level
--    REVOKE has no effect against a table-level grant in Postgres (they're tracked separately;
--    the table-level grant still covers every column regardless of a later column-level
--    revoke). So the table-level grant must be revoked first, then re-granted for exactly the
--    columns every existing app-code write path actually touches (verified against every
--    `.from('accounts').update(...)` call in the codebase) — everything except the five
--    billing columns above.
REVOKE UPDATE ON public.accounts FROM authenticated;
GRANT UPDATE (
  name, business_address, gstin, default_validity_days,
  payment_upi_id, payment_link, payment_qr_url,
  subdomain, extra_domain_slots, currency, category, onboarding_completed_at
) ON public.accounts TO authenticated;

-- 2. users.role — only an existing owner (checked against the row's CURRENT, pre-update state,
--    so a caller can't grant themselves the check by promoting themselves in the same statement)
--    may change a member's role. changeMemberRole() already checks this in app code; this closes
--    the same door for a direct REST call that bypasses it entirely.
CREATE OR REPLACE FUNCTION public.enforce_role_change_by_owner()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND account_id = OLD.account_id AND role = 'owner'
    ) THEN
      RAISE EXCEPTION 'Only an account owner can change a member''s role';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

REVOKE EXECUTE ON FUNCTION public.enforce_role_change_by_owner() FROM PUBLIC;

DROP TRIGGER IF EXISTS enforce_role_change_by_owner ON public.users;
CREATE TRIGGER enforce_role_change_by_owner
BEFORE UPDATE ON public.users
FOR EACH ROW EXECUTE FUNCTION public.enforce_role_change_by_owner();

-- 3. proposals.status → 'PUBLISHED' — only an owner or approver may make this transition. A
--    drafter can still submit (status → 'PENDING_APPROVAL', unaffected by this trigger) via the
--    publish route, same as today; only a direct jump to PUBLISHED by a non-owner/approver is
--    now blocked, matching the role split the publish route and approveProposal() already
--    enforce in app code.
CREATE OR REPLACE FUNCTION public.enforce_proposal_publish_role()
RETURNS TRIGGER AS $$
DECLARE
  caller_role TEXT;
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status AND NEW.status = 'PUBLISHED' THEN
    SELECT role INTO caller_role FROM public.users WHERE id = auth.uid() AND account_id = OLD.account_id;
    IF caller_role IS DISTINCT FROM 'owner' AND caller_role IS DISTINCT FROM 'approver' THEN
      RAISE EXCEPTION 'Only an owner or approver can publish a proposal';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

REVOKE EXECUTE ON FUNCTION public.enforce_proposal_publish_role() FROM PUBLIC;

DROP TRIGGER IF EXISTS enforce_proposal_publish_role ON public.proposals;
CREATE TRIGGER enforce_proposal_publish_role
BEFORE UPDATE ON public.proposals
FOR EACH ROW EXECUTE FUNCTION public.enforce_proposal_publish_role();
