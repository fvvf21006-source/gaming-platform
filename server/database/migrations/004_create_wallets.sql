-- 004_create_wallets.sql
-- One virtual point balance per user (FR-3.1). Points have no
-- real-world monetary value (BR-16) — balance is a plain integer
-- count, never a currency amount.
-- BR-12: no account may ever hold a negative balance, enforced here
-- with a CHECK constraint at the database level as a hard backstop
-- in addition to service-layer enforcement.

CREATE TABLE wallets (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    balance    BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT uq_wallets_user_id UNIQUE (user_id),
    CONSTRAINT chk_wallets_balance_non_negative CHECK (balance >= 0)
);

COMMENT ON TABLE wallets IS 'Virtual point balance per user. Points are non-monetary (BR-16); balance must never go negative (BR-12).';
