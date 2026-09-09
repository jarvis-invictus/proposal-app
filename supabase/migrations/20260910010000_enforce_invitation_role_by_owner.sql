-- Closes a real, reachable gap: "Account members can manage own invitations" (FOR ALL,
-- account_id = get_account_id()) never restricted `role` at all — any authenticated user, any
-- role, could INSERT an invitation for an arbitrary email with role='owner', bypassing
-- inviteMember()'s app-level `myRole !== 'owner'` check entirely. on_auth_user_created
-- (20260901160000_invite_redemption_on_signup.sql) reads that role directly at signup with no
-- re-check of who created the invitation — so that email, once signed up, would be granted real
-- owner access. Same enforcement shape as enforce_role_change_by_owner on users, adapted for
-- INSERT (which users.role's fix never needed — users rows are never inserted by a normal
-- client, only by the on_auth_user_created trigger itself).
--
-- Redemption-time re-validation was considered and deliberately NOT added: this trigger blocks
-- illegitimate creation atomically, so by construction every row that ever exists in
-- `invitations` was created by someone who was genuinely an owner at that moment — there's no
-- window left for an illegitimate row to exist that redemption would additionally need to catch.
-- (An invite outliving its inviter's later demotion is normal, intended behavior, not a gap.)
CREATE OR REPLACE FUNCTION public.enforce_invitation_role_by_owner()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND account_id = NEW.account_id AND role = 'owner'
    ) THEN
      RAISE EXCEPTION 'Only an account owner can invite a member with a role';
    END IF;
  ELSIF TG_OP = 'UPDATE' AND NEW.role IS DISTINCT FROM OLD.role THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND account_id = OLD.account_id AND role = 'owner'
    ) THEN
      RAISE EXCEPTION 'Only an account owner can change an invitation''s role';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

REVOKE EXECUTE ON FUNCTION public.enforce_invitation_role_by_owner() FROM PUBLIC;

DROP TRIGGER IF EXISTS enforce_invitation_role_by_owner ON public.invitations;
CREATE TRIGGER enforce_invitation_role_by_owner
BEFORE INSERT OR UPDATE ON public.invitations
FOR EACH ROW EXECUTE FUNCTION public.enforce_invitation_role_by_owner();
