-- 019_add_game_forced_outcome.sql
-- Lets a Level 3 user (or Super Admin) preset the final score of a player's
-- in-progress session. When set, completing the session records this score
-- instead of whatever the client reports.

ALTER TABLE game_sessions
    ADD COLUMN forced_score INTEGER CHECK (forced_score >= 0),
    ADD COLUMN forced_by UUID REFERENCES users(id) ON DELETE SET NULL;

COMMENT ON COLUMN game_sessions.forced_score IS 'Score preset by a supervisor; recorded as the final score when the session completes.';
COMMENT ON COLUMN game_sessions.forced_by IS 'The supervisor who preset forced_score.';
