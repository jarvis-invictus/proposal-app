-- RLS on proposals ("Users can manage own proposals", USING account_id = get_account_id()) is
-- row-scoped only — it never restricted which *columns* an authenticated caller can write, and
-- Supabase's default table-level GRANT UPDATE ON proposals TO authenticated (never revoked)
-- covers every column regardless. The app's own "locked once signed" check
-- (app/api/proposals/[id]/route.ts) is Next.js-layer only: any authenticated member of an
-- account — including a drafter, who is explicitly denied publish/approve rights — could PATCH
-- Supabase's REST API directly with their own session and set accepted_at/accepted_by_name/
-- signature on any proposal in their account, forging or overwriting a client's e-signature.
--
-- Same fix as the 20260904080000 lockdown migration's accounts REVOKE+GRANT: accepted_at,
-- accepted_by_name and signature are deliberately left OFF the re-grant below. That leaves them
-- writable only by the service-role client (app/api/proposals/[id]/accept/route.ts, which
-- bypasses grants entirely) — never by an authenticated session. approved_by/approved_at stay
-- grantable since approveProposal() legitimately writes them from the caller's own session, and
-- the existing enforce_proposal_publish_role trigger already blocks a non-owner/approver from
-- making the accompanying status transition those columns are always set alongside.
REVOKE UPDATE ON public.proposals FROM authenticated;
GRANT UPDATE (
  content, status, updated_at, submitted_by, submitted_at, approved_by, approved_at
) ON public.proposals TO authenticated;
