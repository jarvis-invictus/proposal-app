-- Security hardening from the Sep-3 security review (Supabase advisor findings).
--
-- 1. Pin search_path on every SECURITY DEFINER function so an attacker-controlled
--    search_path can't redirect an unqualified identifier to a different schema.
--    All three already fully-qualify every table/function reference, so an empty
--    search_path changes nothing functionally.
ALTER FUNCTION public.get_account_id() SET search_path = '';
ALTER FUNCTION public.on_auth_user_created() SET search_path = '';
ALTER FUNCTION public.set_updated_at() SET search_path = '';

-- 2. on_auth_user_created is a trigger-only function — it reads NEW, which is only bound
--    inside a real trigger context, so it errors if invoked directly and has no reason to
--    be reachable via the public REST API at all. Postgres grants EXECUTE to PUBLIC by
--    default, so both `anon` and `authenticated` REVOKEs must target PUBLIC, not the
--    individual roles (a role-specific revoke is a no-op while PUBLIC still holds the grant).
REVOKE EXECUTE ON FUNCTION public.on_auth_user_created() FROM PUBLIC;

-- 3. get_account_id() is only ever meant to be called from inside RLS policies (evaluated
--    as `authenticated`), never directly by a client — but `authenticated` must keep EXECUTE
--    or every RLS policy referencing it breaks. Only PUBLIC (which is what let `anon` call it
--    while logged out) is revoked; `authenticated`'s own grant is left untouched on purpose.
REVOKE EXECUTE ON FUNCTION public.get_account_id() FROM PUBLIC;
