-- Defense-in-depth, applied after 20260910000000_prevent_account_scoped_system_default.sql's
-- WITH CHECK was confirmed working live — same "grant shouldn't rely solely on the enforcement
-- layer" principle already applied to proposals and users. authenticated's INSERT/UPDATE grant
-- on templates was table-wide (account_id, category, id, is_system_default, name, structure);
-- is_system_default is now redundant to grant at all given the WITH CHECK above, and `id` is
-- never legitimately client-set (DEFAULT gen_random_uuid()).
--
-- `account_id` stays grantable, unlike the equivalent users fix — confirmed by checking, not
-- assumed: grepped every real `.from('templates')` reference in the app first (zero INSERT/UPDATE
-- call sites exist anywhere today; this is RLS-ready infrastructure for a "manage own templates"
-- feature that hasn't been built yet), and confirmed directly that the RLS policy's own
-- account_id-scoped design requires the client to supply account_id explicitly at INSERT time
-- (unlike users.account_id, which the on_auth_user_created trigger populates server-side —
-- no client ever legitimately sets that one directly).
REVOKE INSERT, UPDATE ON public.templates FROM authenticated;
GRANT INSERT (account_id, category, name, structure) ON public.templates TO authenticated;
GRANT UPDATE (account_id, category, name, structure) ON public.templates TO authenticated;
