-- 016_add_game_alteration_columns.sql
-- Allows Level 3 users and administrators to alter active game sessions (force loss / game intervention).
-- Adds columns to track if a game session was altered, by whom, and the reason.

ALTER TABLE game_sessions
    ADD COLUMN is_altered BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN altered_by UUID REFERENCES users(id) ON DELETE SET NULL,
    ADD COLUMN alteration_reason TEXT;

COMMENT ON COLUMN game_sessions.is_altered IS 'True if the game session was forcibly altered/intervened by a Level 3 user or administrator.';
COMMENT ON COLUMN game_sessions.altered_by IS 'The user ID of the Level 3 user or administrator who altered the session.';
COMMENT ON COLUMN game_sessions.alteration_reason IS 'Reason or description for the game alteration (e.g., Forced loss by supervisor).';
