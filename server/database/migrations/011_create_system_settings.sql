-- 011_create_system_settings.sql
-- Simple key-value store for platform-wide configuration
-- (e.g. maintenance mode, default point costs) that admins may
-- adjust without a code deployment.

CREATE TABLE system_settings (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key         VARCHAR(100) NOT NULL,
    value       TEXT,
    description TEXT,
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT uq_system_settings_key UNIQUE (key)
);

COMMENT ON TABLE system_settings IS 'Key-value platform configuration, editable by administrators without a code deployment.';
