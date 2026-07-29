-- 006_create_game_categories.sql
-- Simple grouping for the arcade game catalog (e.g. "Puzzle", "Arcade",
-- "Card"). Created before games so games can reference it.

CREATE TABLE game_categories (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        VARCHAR(50) NOT NULL,
    description TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT uq_game_categories_name UNIQUE (name)
);

COMMENT ON TABLE game_categories IS 'Catalog grouping for arcade games.';
