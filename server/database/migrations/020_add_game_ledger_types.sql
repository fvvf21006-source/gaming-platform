-- 020_add_game_ledger_types.sql
-- Game buy-ins move points from the player to the Super Admin house wallet and
-- payouts move them back, so both need to be recorded in the immutable ledger.

ALTER TABLE wallet_transactions
    DROP CONSTRAINT chk_wallet_transactions_type;

ALTER TABLE wallet_transactions
    ADD CONSTRAINT chk_wallet_transactions_type
    CHECK (transaction_type IN ('transfer', 'admin_add', 'admin_remove', 'admin_set', 'game_buy_in', 'game_payout'));

COMMENT ON COLUMN wallet_transactions.transaction_type IS '''transfer'' for hierarchy transfers; ''admin_add''/''admin_remove''/''admin_set'' for administrative adjustments; ''game_buy_in'' (player to house) and ''game_payout'' (house to player) for game sessions.';

-- Ledger and history can never be removed. wallet_transactions already rejects
-- row UPDATE/DELETE (014); also reject TRUNCATE, and give audit_logs and
-- game_sessions the same protection against deletion.
CREATE TRIGGER trg_wallet_transactions_no_truncate
    BEFORE TRUNCATE ON wallet_transactions
    FOR EACH STATEMENT EXECUTE FUNCTION prevent_wallet_transaction_change();

CREATE FUNCTION prevent_history_removal() RETURNS trigger AS $$
BEGIN
    RAISE EXCEPTION '% is permanent history; rows cannot be deleted or truncated', TG_TABLE_NAME;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_audit_logs_no_delete
    BEFORE DELETE ON audit_logs
    FOR EACH ROW EXECUTE FUNCTION prevent_history_removal();

CREATE TRIGGER trg_audit_logs_no_truncate
    BEFORE TRUNCATE ON audit_logs
    FOR EACH STATEMENT EXECUTE FUNCTION prevent_history_removal();

CREATE TRIGGER trg_game_sessions_no_delete
    BEFORE DELETE ON game_sessions
    FOR EACH ROW EXECUTE FUNCTION prevent_history_removal();

CREATE TRIGGER trg_game_sessions_no_truncate
    BEFORE TRUNCATE ON game_sessions
    FOR EACH STATEMENT EXECUTE FUNCTION prevent_history_removal();
