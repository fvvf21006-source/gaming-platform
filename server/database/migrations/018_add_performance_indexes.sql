-- 018_add_performance_indexes.sql
-- Indexes for the hot read paths (live sessions, per-player history, reports,
-- online presence). Purely additive; no data or behavior changes.

-- Per-player history and reports ordered by time
CREATE INDEX IF NOT EXISTS idx_game_sessions_user_started ON game_sessions (user_id, started_at DESC);

-- Live game monitoring polls only in-progress sessions
CREATE INDEX IF NOT EXISTS idx_game_sessions_in_progress ON game_sessions (user_id) WHERE status = 'in_progress';

-- Report date ranges
CREATE INDEX IF NOT EXISTS idx_game_sessions_started_at ON game_sessions (started_at DESC);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_created_at ON wallet_transactions (created_at DESC);

-- Audit review filters by action and recency
CREATE INDEX IF NOT EXISTS idx_audit_logs_action_created ON audit_logs (action, created_at DESC);

-- Notification list is newest-first per user
CREATE INDEX IF NOT EXISTS idx_notifications_user_created ON notifications (user_id, created_at DESC);

-- Online presence lookup
CREATE INDEX IF NOT EXISTS idx_users_last_seen_at ON users (last_seen_at) WHERE last_seen_at IS NOT NULL;
