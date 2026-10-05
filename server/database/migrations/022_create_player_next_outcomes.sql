-- 022_create_player_next_outcomes.sql
-- A supervisor can preset the result of a player's NEXT game before it starts.
-- The row is claimed (and deleted) when the player starts a matching game, at
-- which point it becomes that session's forced_score (see migration 019).
-- game_id NULL means "whichever game the player starts next".

CREATE TABLE player_next_outcomes (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    game_id    UUID REFERENCES games(id) ON DELETE CASCADE,
    score      INTEGER NOT NULL,
    set_by     UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT uq_player_next_outcomes_user UNIQUE (user_id),
    CONSTRAINT chk_player_next_outcomes_score CHECK (score >= 0)
);

COMMENT ON TABLE player_next_outcomes IS 'At most one pending preset per player: the score their next (matching) game session will end on.';
