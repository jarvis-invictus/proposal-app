-- Security fix: "Public can read published proposals" had no role restriction, so it
-- defaulted to PUBLIC (every role, including authenticated). Postgres combines multiple
-- permissive SELECT policies with OR, so any signed-in user's own dashboard queries against
-- `proposals` were matching *every* account's PUBLISHED rows, not just their own -- confirmed
-- live: a brand-new account's onboarding checklist showed "Create your first proposal" and
-- "Share it with a client" already done, because it picked up another account's published
-- proposal. The policy's actual intent (letting an anonymous visitor open a public /p/[slug]
-- link) only needs the `anon` role -- authenticated users already have their own-account
-- access via "Users can manage own proposals".
DROP POLICY IF EXISTS "Public can read published proposals" ON proposals;

CREATE POLICY "Public can read published proposals" ON proposals
  FOR SELECT TO anon
  USING (status = 'PUBLISHED'::proposal_status_enum);
