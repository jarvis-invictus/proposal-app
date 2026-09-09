-- Defense-in-depth, not a fix for a live hole: "Account members can manage own domains" (FOR ALL,
-- account_id = get_account_id()) gives anon zero real access regardless of grant breadth. anon's
-- full INSERT/SELECT/UPDATE/REFERENCES grant is revoked entirely.
--
-- authenticated's INSERT scoped to the exact real insert shape (app/dashboard/settings/
-- actions.ts:138, connectDomain): {account_id, domain_name}.
--
-- No real UPDATE call site exists anywhere. Unlike brand_kits/templates, NOT extended to a
-- content-column "plausible future edit" grant here — cname_verified and ssl_issued are
-- explicitly verification-status flags meant to be set by a future server-side verification
-- process, never the account owner (confirmed: zero DNS/CNAME verification code exists yet
-- anywhere in the app), so granting them to authenticated now would plant a real problem for
-- whenever that feature is actually built. Scoped to {domain_name} only — the one column a
-- domain-owning user might plausibly self-correct (e.g. a typo).
REVOKE SELECT, INSERT, UPDATE, REFERENCES ON public.domains FROM anon;

REVOKE INSERT, UPDATE ON public.domains FROM authenticated;
GRANT INSERT (account_id, domain_name) ON public.domains TO authenticated;
GRANT UPDATE (domain_name) ON public.domains TO authenticated;
