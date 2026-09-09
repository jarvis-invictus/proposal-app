-- Atomic version-assignment + insert for generated_pages (docs/CORE_ENGINE_V2_SPEC.md §2 stage
-- 10-11). Replaces a select-then-insert pattern in application code that hit a real,
-- 100%-reproducible bug in Phase 2 sub-piece 1: Next.js's fetch request memoization returned a
-- stale "0 existing rows" result for the second of two structurally-identical version-lookups
-- within one Server Component render (a v1-then-v2 sequence both landed as version 1, confirmed
-- via direct DB query — not just plausible). That same two-step pattern was also the previously
-- documented race condition under genuine concurrent publishes
-- (20260908184816_add_generated_pages.sql's introduction of publishGeneratedPage()). One atomic
-- RPC call fixes both: there's no longer a separate "read current state" request for anything to
-- memoize against or race with, and the advisory lock below serializes real concurrent calls too.
CREATE OR REPLACE FUNCTION public.publish_generated_page(
  p_proposal_id uuid,
  p_html text,
  p_provider text,
  p_model text,
  p_used_fallback boolean,
  p_max_versions integer
)
RETURNS TABLE(id uuid, version integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_next_version integer;
BEGIN
  -- Serializes concurrent calls for the same proposal_id specifically (not a table-wide lock) —
  -- released automatically at transaction end.
  PERFORM pg_advisory_xact_lock(hashtextextended(p_proposal_id::text, 0));

  SELECT COALESCE(MAX(gp.version), 0) + 1 INTO v_next_version
  FROM public.generated_pages gp
  WHERE gp.proposal_id = p_proposal_id;

  IF v_next_version > p_max_versions THEN
    RAISE EXCEPTION 'Proposal % has reached the %-version cap', p_proposal_id, p_max_versions;
  END IF;

  RETURN QUERY
  INSERT INTO public.generated_pages (proposal_id, version, html, provider, model, used_fallback, published_at)
  VALUES (p_proposal_id, v_next_version, p_html, p_provider, p_model, p_used_fallback, now())
  RETURNING generated_pages.id, generated_pages.version;
END;
$$;

-- Same hardening idiom already established in this project (20260903071814_revoke_execute_from
-- _public_on_definer_functions.sql) — a SECURITY DEFINER function must not be callable by
-- anon/authenticated via PostgREST's automatic RPC exposure; only the service-role client calls
-- this, from publishGeneratedPage.ts.
REVOKE ALL ON FUNCTION public.publish_generated_page FROM PUBLIC;
