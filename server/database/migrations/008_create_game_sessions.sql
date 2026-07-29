-- 008_create_game_sessions.sql
-- Each instance of a Player accessing a game (BR-20, BR-21, BR-22).
-- points_spent is recorded on the session itself (not as a
-- wallet_transactions row), since game-access consumption is
-- distinct from a hierarchy transfer (BR-15).

CREATE TABLE game_sessions (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    game_id       UUID NOT NULL REFERENCES games(id) ON DELETE RESTRICT,
    points_spent  INTEGER NOT NULL,
    score         INTEGER,
    status        VARCHAR(15) NOT NULL DEFAULT 'in_progress',
    started_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at  TIMESTAMPTZ,

    CONSTRAINT chk_game_sessions_points_spent_non_negative CHECK (points_spent >= 0),
    CONSTRAINT chk_game_sessions_status CHECK (status IN ('in_progress', 'completed', 'abandoned')),
    CONSTRAINT chk_game_sessions_completed_at_after_started CHECK (completed_at IS NULL OR completed_at >= started_at)
);

CREATE INDEX idx_game_sessions_user_id ON game_sessions (user_id);
CREATE INDEX idx_game_sessions_game_id ON game_sessions (game_id);

COMMENT ON TABLE game_sessions IS 'Each Player game-access instance, points spent, and resulting score (BR-20 to BR-22).';
