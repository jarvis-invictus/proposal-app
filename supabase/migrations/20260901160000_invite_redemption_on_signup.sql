-- Invite redemption: until now, on_auth_user_created always created a brand-new standalone
-- account for every signup — there was no way for an invited teammate to actually join the
-- account that invited them, at any role. This closes that gap.
--
-- invite_id travels in raw_user_meta_data (set by the client at signup time from ?invite=<uuid>
-- in the URL, the same way full_name already does). email is checked against the invite's own
-- email, not just accepted_at IS NULL — without that, anyone could pass any invitation id at
-- signup and join someone else's account under a different address than the one actually
-- invited. Uses scalar SELECT INTO targets (not a RECORD) specifically to avoid PL/pgSQL's
-- "record not assigned" trap when zero rows match.
CREATE OR REPLACE FUNCTION public.on_auth_user_created()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
    new_account_id UUID;
    invite_id UUID;
    matched_invite_id UUID;
    matched_account_id UUID;
    matched_role TEXT;
BEGIN
    BEGIN
        invite_id := (NEW.raw_user_meta_data->>'invite_id')::UUID;
    EXCEPTION WHEN OTHERS THEN
        -- Malformed/tampered invite_id must never fail the whole signup — fall through to a
        -- normal standalone-account signup instead.
        invite_id := NULL;
    END;

    IF invite_id IS NOT NULL THEN
        SELECT id, account_id, role
          INTO matched_invite_id, matched_account_id, matched_role
        FROM public.invitations
        WHERE id = invite_id
          AND accepted_at IS NULL
          AND lower(email) = lower(NEW.email)
        LIMIT 1;
    END IF;

    IF matched_invite_id IS NOT NULL THEN
        INSERT INTO public.users (id, account_id, role)
        VALUES (NEW.id, matched_account_id, matched_role);

        UPDATE public.invitations SET accepted_at = NOW() WHERE id = matched_invite_id;
    ELSE
        INSERT INTO public.accounts (name)
        VALUES (COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email, 'My Account'))
        RETURNING id INTO new_account_id;

        INSERT INTO public.users (id, account_id, role)
        VALUES (NEW.id, new_account_id, 'owner');
    END IF;

    RETURN NEW;
END;
$function$;
