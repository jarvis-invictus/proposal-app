-- Closes a real, reachable gap (not defense-in-depth): "Users can manage own templates" (FOR ALL,
-- USING account_id = get_account_id()) never restricted `is_system_default` at all — any
-- authenticated user could flip their own template's is_system_default to true via a direct
-- client UPDATE. That row would then satisfy the *separate*, unrestricted "Public can read system
-- templates" policy (is_system_default = true, no account_id check), making it visible in every
-- other account's Templates gallery (app/dashboard/templates/page.tsx relies entirely on RLS,
-- unfiltered) and a candidate for the system-wide default template new proposals fall back to
-- (app/api/proposals/route.ts: .eq('is_system_default', true).order('name').limit(1)).
--
-- Fix is a WITH CHECK, not a trigger (unlike users.role) — this is a pure per-row static
-- constraint on the new row's own values, no comparison against the caller's own separate row
-- needed, so the simpler RLS-native mechanism fits. USING (row visibility) is unchanged; WITH
-- CHECK (write validation) now also requires is_system_default = false for any account-scoped
-- write. is_system_default defaults to FALSE NOT NULL at the column level
-- (20260810000000_init_schema.sql), so a normal INSERT/UPDATE that never touches the flag at all
-- still passes cleanly.
ALTER POLICY "Users can manage own templates" ON public.templates
  USING (account_id = public.get_account_id())
  WITH CHECK (account_id = public.get_account_id() AND is_system_default = false);
