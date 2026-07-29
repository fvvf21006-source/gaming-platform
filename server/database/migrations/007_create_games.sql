-- 007_create_games.sql
-- Catalog of available simple arcade games and their point cost
-- (FR-4.1). These are self-contained games — this schema does not
-- model odds, wagers, or bet outcomes of any kind.

CREATE TABLE games (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id UUID REFERENCES game_categories(id) ON DELETE SET NULL,
    name        VARCHAR(100) NOT NULL,
    description TEXT,
    point_cost  INTEGER NOT NULL DEFAULT 0,
    is_active   BOOLEAN NOT NULL DEFAULT true,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT uq_games_name UNIQUE (name),
    CONSTRAINT chk_games_point_cost_non_negative CHECK (point_cost >= 0)
);

CREATE INDEX idx_games_category_id ON games (category_id);

COMMENT ON TABLE games IS 'Catalog of simple arcade games and their point cost to play (FR-4.1).';
