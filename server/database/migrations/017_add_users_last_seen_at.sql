-- 017_add_users_last_seen_at.sql
-- Presence tracking: the client sends a periodic heartbeat while a user is
-- signed in, and anyone seen within the last couple of minutes counts as online.
-- Additive and nullable — existing rows are simply "never seen".

ALTER TABLE users
    ADD COLUMN last_seen_at TIMESTAMPTZ;

COMMENT ON COLUMN users.last_seen_at IS 'Last heartbeat from the signed-in client; a user is considered online if this is recent.';
