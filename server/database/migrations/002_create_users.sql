-- 002_create_users.sql
-- Core account table for every role. created_by is a self-referencing
-- foreign key modeling the hierarchy (BR-1 to BR-9): every user except
-- the initial Super Admin has exactly one creator, one level above them.
-- Enforcing "creator must be exactly one tier above" is a business rule
-- (service layer), not a database constraint.
--
-- password_hash stores the hashed credential; no hashing logic is
-- implemented in this migration or its seed data (see docs/06_PROJECT_STATUS.md
-- — authentication is a later milestone).

CREATE TABLE users (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role_id       UUID NOT NULL REFERENCES roles(id) ON DELETE RESTRICT,
    created_by    UUID REFERENCES users(id) ON DELETE RESTRICT,
    username      VARCHAR(50) NOT NULL,
    email         VARCHAR(255),
    password_hash TEXT NOT NULL,
    status        VARCHAR(10) NOT NULL DEFAULT 'active',
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT uq_users_username UNIQUE (username),
    CONSTRAINT uq_users_email UNIQUE (email),
    CONSTRAINT chk_users_status CHECK (status IN ('active', 'frozen')),
    CONSTRAINT chk_users_not_own_creator CHECK (created_by IS NULL OR created_by <> id)
);

CREATE INDEX idx_users_created_by ON users (created_by);
CREATE INDEX idx_users_role_id ON users (role_id);

COMMENT ON TABLE users IS 'All accounts across all roles. created_by models the hierarchy; NULL only for the initial Super Admin.';
COMMENT ON COLUMN users.password_hash IS 'Placeholder column only in this milestone — hashing is implemented in the authentication milestone.';
