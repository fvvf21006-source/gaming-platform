-- 009_create_notifications.sql
-- Per-user notification records for significant events (BR-28):
-- account creation, point transfers, password changes, status
-- updates, and game completion.

CREATE TABLE notifications (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type       VARCHAR(50) NOT NULL,
    message    TEXT NOT NULL,
    is_read    BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_notifications_user_id ON notifications (user_id);
CREATE INDEX idx_notifications_user_id_is_read ON notifications (user_id, is_read);

COMMENT ON TABLE notifications IS 'Per-user notifications for account, wallet, and game events (BR-28).';
