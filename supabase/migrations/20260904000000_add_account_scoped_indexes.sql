-- Postgres doesn't auto-index foreign key columns (only primary keys), and every RLS policy
-- in this schema filters on account_id — so every one of these tables has been doing a
-- sequential scan on every request. Add the missing indexes.
--
-- notifications and proposals also get a composite index matching their actual query
-- pattern (account-scoped list ordered by recency / filtered by status) instead of a bare
-- account_id index, since that's what the dashboard, settings, and notifications pages
-- actually run.

CREATE INDEX IF NOT EXISTS idx_users_account_id ON public.users (account_id);
CREATE INDEX IF NOT EXISTS idx_brand_kits_account_id ON public.brand_kits (account_id);
CREATE INDEX IF NOT EXISTS idx_invitations_account_id ON public.invitations (account_id);
CREATE INDEX IF NOT EXISTS idx_domains_account_id ON public.domains (account_id);
CREATE INDEX IF NOT EXISTS idx_templates_account_id ON public.templates (account_id) WHERE account_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_notifications_account_created
  ON public.notifications (account_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_proposals_account_updated
  ON public.proposals (account_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_proposals_account_status
  ON public.proposals (account_id, status);
