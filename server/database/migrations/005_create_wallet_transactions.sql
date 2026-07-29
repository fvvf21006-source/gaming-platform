-- 005_create_wallet_transactions.sql
-- Immutable record of every downward point transfer between a user
-- and a direct child (BR-10, BR-11, BR-14). This table records
-- hierarchy transfers only; points consumed for game access are
-- recorded on game_sessions instead, since Players cannot transfer
-- points onward (BR-15).

CREATE TABLE wallet_transactions (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id               UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    recipient_id            UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    amount                  BIGINT NOT NULL,
    sender_balance_after    BIGINT NOT NULL,
    recipient_balance_after BIGINT NOT NULL,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT chk_wallet_transactions_amount_positive CHECK (amount > 0),
    CONSTRAINT chk_wallet_transactions_sender_balance_non_negative CHECK (sender_balance_after >= 0),
    CONSTRAINT chk_wallet_transactions_recipient_balance_non_negative CHECK (recipient_balance_after >= 0),
    CONSTRAINT chk_wallet_transactions_no_self_transfer CHECK (sender_id <> recipient_id)
);

CREATE INDEX idx_wallet_transactions_sender_id ON wallet_transactions (sender_id);
CREATE INDEX idx_wallet_transactions_recipient_id ON wallet_transactions (recipient_id);

COMMENT ON TABLE wallet_transactions IS 'Immutable ledger of downward point transfers through the hierarchy (BR-10, BR-11, BR-14). Never updated or deleted.';
