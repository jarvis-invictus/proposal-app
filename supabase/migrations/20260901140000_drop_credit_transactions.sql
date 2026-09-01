-- credit_transactions was scaffolding for a credits/billing model that was never built out:
-- real migration, real RLS policy, zero rows, zero code references (confirmed against both the
-- live table and a full repo grep before dropping). Its RLS policy and enable-RLS statement are
-- dropped implicitly with the table. transaction_type_enum has no other consumer, so it goes too
-- rather than leaving an orphaned type behind.
DROP TABLE IF EXISTS credit_transactions;
DROP TYPE IF EXISTS transaction_type_enum;
