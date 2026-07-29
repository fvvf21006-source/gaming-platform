-- 000_enable_extensions.sql
-- Enables PostgreSQL extensions required by later migrations.
-- pgcrypto provides gen_random_uuid(), used as the default for all
-- surrogate primary keys in this schema.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";
