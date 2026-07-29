-- 001_create_roles.sql
-- Reference table of the four hierarchy tiers plus Super Admin.
-- hierarchy_level encodes ordering: 0 = Super Admin ... 4 = Player.
-- This table only stores role identity; enforcement of "who may
-- create/act on whom" (BR-1 to BR-9) belongs to the service layer.

CREATE TABLE roles (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            VARCHAR(30) NOT NULL,
    hierarchy_level SMALLINT NOT NULL,
    description     TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT uq_roles_name UNIQUE (name),
    CONSTRAINT uq_roles_hierarchy_level UNIQUE (hierarchy_level),
    CONSTRAINT chk_roles_hierarchy_level_range CHECK (hierarchy_level BETWEEN 0 AND 4)
);

COMMENT ON TABLE roles IS 'Fixed set of hierarchy tiers: Super Admin (0), Level 1 (1), Level 2 (2), Level 3 (3), Player (4).';
