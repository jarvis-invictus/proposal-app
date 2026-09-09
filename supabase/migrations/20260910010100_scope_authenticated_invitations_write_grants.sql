-- Applied after 20260910010000_enforce_invitation_role_by_owner.sql's trigger was confirmed
-- working live — same sequencing already used for users/templates. authenticated's INSERT/UPDATE
-- grant on invitations was table-wide (accepted_at, account_id, email, id, invited_at,
-- invited_by, role).
--
-- `role` stays grantable, resolved the same way as users.role and for the same reason:
-- inviteMember() (app/dashboard/settings/actions.ts) legitimately writes real, varying role
-- values through this exact authenticated client — unlike templates.is_system_default, which no
-- real code ever sets to anything but its own default, the trigger above (not the grant) is the
-- real enforcement here.
--
-- Scoped to grepped real usage: INSERT matches inviteMember's exact insert shape
-- (account_id, email, role, invited_by). UPDATE excludes accepted_at — that's the invite's
-- redemption-state field, only ever legitimately set by on_auth_user_created / the admin-client
-- redeemInviteForOAuthUser path, never a normal authenticated client; excludes invited_at/
-- invited_by (set once at creation, never edited); keeps email/role, matching the "ALL policy
-- implies a plausible edit-a-pending-invite feature" reasoning already applied to brand_kits.
REVOKE INSERT, UPDATE ON public.invitations FROM authenticated;
GRANT INSERT (account_id, email, role, invited_by) ON public.invitations TO authenticated;
GRANT UPDATE (email, role) ON public.invitations TO authenticated;
