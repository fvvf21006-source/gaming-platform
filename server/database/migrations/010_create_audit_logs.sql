-- 010_create_audit_logs.sql
-- Immutable log of every sensitive action across the system
-- (BR-25, BR-26, BR-27). No UPDATE or DELETE should ever be issued
-- against this table; that guarantee is enforced by application-level
-- discipline (services never call update/delete repository methods
-- against this table) rather than a database trigger, to keep this
-- migration free of business logic per CLAUDE.md.

CREATE TABLE audit_logs (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id    UUID REFERENCES users(id) ON DELETE SET NULL,
    action      VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50),
    entity_id   UUID,
    metadata    JSONB,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_logs_actor_id ON audit_logs (actor_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs (created_at);

COMMENT ON TABLE audit_logs IS 'Immutable action log (BR-25 to BR-27). actor_id may be NULL if the acting account is later deleted; the log entry itself is retained.';
