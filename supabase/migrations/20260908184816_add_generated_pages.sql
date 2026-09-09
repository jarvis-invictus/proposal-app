-- Versioned storage for the new agentic generation engine's final self-contained artifacts
-- (docs/CORE_ENGINE_V2_SPEC.md §2 stage 11, §9 — this schema was flagged as genuinely
-- undesigned before this migration). One row per generated version; publishing sets
-- published_at rather than creating a new concept, since a row can exist generated-but-not-yet-
-- published.
CREATE TABLE public.generated_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id uuid NOT NULL REFERENCES public.proposals(id) ON DELETE CASCADE,
  version integer NOT NULL,
  html text NOT NULL,
  provider text NOT NULL,
  model text NOT NULL,
  used_fallback boolean NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  published_at timestamptz
);

CREATE INDEX idx_generated_pages_proposal_id ON public.generated_pages(proposal_id);

-- Written and read only by service-role code (lib/ai/publishGeneratedPage.ts, and proxy.ts's
-- host-based serving path) — never by a normal user session. Default-deny stated explicitly
-- rather than assumed, same rigor as the anon-grant tightening earlier this project
-- (20260908131232_scope_anon_proposals_write_grants.sql): enable RLS with no policies, and
-- explicitly revoke the broad grants Supabase's default schema privileges would otherwise hand
-- anon/authenticated on a newly created public-schema table.
ALTER TABLE public.generated_pages ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.generated_pages FROM anon, authenticated;
