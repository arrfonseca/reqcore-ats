-- Data backfill runs after this migration commits. Postgres cannot use
-- a new enum value in the same transaction that adds it.
SELECT 1;
