-- ESIGN Act hardening: capture consent, identity linkage (IP/user agent), and the exact
-- consent statement shown to the signer, alongside the existing accepted_at/accepted_by_name.
ALTER TABLE proposals
  ADD COLUMN IF NOT EXISTS signature JSONB;
