-- Free branded link per account (yourstudio.<root-domain>/p/<slug>) via a Vercel wildcard
-- domain — deliberately separate from the paid custom-domain slots in the `domains` table,
-- which is for a client-owned domain with real CNAME/SSL verification. This one requires no
-- DNS work from the account owner at all.
-- Reserved words are enforced at the application layer (a clearer error message than a DB
-- constraint can give); this CHECK only guards the charset/shape so a malformed value can never
-- land in the column even via a path that skips the app-level validation.
ALTER TABLE accounts
  ADD COLUMN IF NOT EXISTS subdomain TEXT UNIQUE
    CHECK (subdomain IS NULL OR subdomain ~ '^[a-z0-9][a-z0-9-]{1,30}[a-z0-9]$');
